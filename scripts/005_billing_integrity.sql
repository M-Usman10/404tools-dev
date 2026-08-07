-- Billing integrity: the pieces of the money path that have to be exactly-once
-- or atomic, and the column privileges that stop a browser session writing its
-- own balance. Safe to re-run.

-- ------------------------------------------------------------
-- profiles: row-scoped RLS is not enough
-- ------------------------------------------------------------
-- A policy decides which rows a session may touch, never which columns, and
-- Supabase grants the authenticated role UPDATE on every column of a public
-- table by default. That combination let any logged-in user PATCH their own
-- pages_balance through PostgREST with the publishable key that already ships
-- to the browser, which is the whole product given away in one request. The
-- display name is the only column a session has any business writing; balances
-- and the Paddle customer id belong to the SECURITY DEFINER functions and to
-- the service-role webhook.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- ------------------------------------------------------------
-- page_purchases: refund bookkeeping
-- ------------------------------------------------------------
-- The unique transaction id makes a credit exactly-once, but a refund had no
-- equivalent, so a redelivered adjustment clawed the same pages back twice.
-- This column is the claim flag: the webhook sets it with a conditional update
-- and only the delivery that wins the claim performs the debit.
ALTER TABLE public.page_purchases
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- Record a purchase and credit it in one transaction
-- ------------------------------------------------------------
-- Doing the insert and the credit as two round trips from the webhook meant a
-- failure between them left the customer charged, the receipt row visible, and
-- the balance still zero — and unrecoverable by replay, because the retry hit
-- the unique violation and stopped before crediting. Inside one function the
-- two either both happen or neither does, so the webhook can safely answer 5xx
-- and let Paddle redeliver.
--
-- Returns the balance after crediting, -1 for invalid arguments, and -2 when
-- this transaction has already been recorded (nothing to do, answer 200).
CREATE OR REPLACE FUNCTION public.ocr_record_purchase(
  p_user_id UUID,
  p_transaction_id TEXT,
  p_pack_id TEXT,
  p_pages INTEGER,
  p_amount_cents INTEGER,
  p_currency TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
  v_balance INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_transaction_id IS NULL OR p_pages IS NULL OR p_pages <= 0 THEN
    RETURN -1;
  END IF;

  INSERT INTO page_purchases (
    user_id, paddle_transaction_id, pack_id, pages, amount_cents, currency
  )
  VALUES (p_user_id, p_transaction_id, p_pack_id, p_pages, p_amount_cents, p_currency)
  ON CONFLICT (paddle_transaction_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN -2;
  END IF;

  UPDATE profiles
    SET pages_balance = pages_balance + p_pages
    WHERE id = p_user_id
    RETURNING pages_balance INTO v_balance;

  -- Raising rather than returning: the exception rolls the insert back with it,
  -- so a purchase never survives without the pages it paid for.
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'ocr_record_purchase: no profile %', p_user_id;
  END IF;

  RETURN v_balance;
END $$;

REVOKE ALL ON FUNCTION public.ocr_record_purchase(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ocr_record_purchase(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.ocr_record_purchase(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM authenticated;

-- ------------------------------------------------------------
-- Reverse a credit without pretending the pages were used
-- ------------------------------------------------------------
-- The refund path used to call ocr_consume_pages, which cannot debit without
-- also bumping pages_used_total, so a refunded pack showed up on the dashboard
-- as thousands of pages used against an empty usage table. This debits the
-- balance only, and clamps at zero so a customer who spent part of a pack and
-- then refunded it lands on empty rather than in a hole.
CREATE OR REPLACE FUNCTION public.ocr_revoke_pages(p_user_id UUID, p_pages INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_removed INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_pages IS NULL OR p_pages <= 0 THEN
    RETURN -1;
  END IF;

  SELECT pages_balance INTO v_balance
    FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  v_removed := LEAST(p_pages, v_balance);

  UPDATE profiles
    SET pages_balance = v_balance - v_removed
    WHERE id = p_user_id;

  RETURN v_balance - v_removed;
END $$;

REVOKE ALL ON FUNCTION public.ocr_revoke_pages(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ocr_revoke_pages(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.ocr_revoke_pages(UUID, INTEGER) FROM authenticated;
