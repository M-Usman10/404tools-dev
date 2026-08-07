-- Prepaid page-pack billing. There are no subscriptions: a user buys a pack of
-- pages with a one-time Paddle transaction and the OCR endpoint debits the
-- balance a page at a time. A brand-new account starts at zero and is
-- paywalled until its first purchase.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pages_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pages_used_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;

-- The webhook resolves a transaction back to a user by Paddle customer id.
CREATE INDEX IF NOT EXISTS profiles_paddle_customer_id_idx
  ON public.profiles (paddle_customer_id);

-- One row per completed Paddle transaction; the unique transaction id makes
-- webhook retries idempotent, which is the only thing standing between a
-- redelivered event and a double credit.
CREATE TABLE IF NOT EXISTS public.page_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paddle_transaction_id TEXT NOT NULL UNIQUE,
  pack_id TEXT NOT NULL,
  pages INTEGER NOT NULL,
  amount_cents INTEGER,
  currency TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_purchases_user_created_idx
  ON public.page_purchases (user_id, created_at DESC);

ALTER TABLE public.page_purchases ENABLE ROW LEVEL SECURITY;

-- Read-only to the owner. Inserts happen in the Paddle webhook under the
-- service role, which bypasses RLS, so there is deliberately no insert policy:
-- nothing a browser session sends should be able to mint a purchase record.
DROP POLICY IF EXISTS "page_purchases_select_own" ON public.page_purchases;
CREATE POLICY "page_purchases_select_own" ON public.page_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Atomically debit p_pages from the user's balance. Returns the balance
-- remaining after the debit, or -1 when the request cannot be paid for.
--
-- Unlike the equivalent function in the reference project this takes the user
-- id as an argument instead of reading auth.uid(): an OCR request authenticates
-- with a Bearer API key over a stateless HTTP call and carries no Supabase
-- cookie session at all, so auth.uid() is always NULL on this path. The user is
-- resolved from the key hash by the route handler. That makes the argument the
-- only trust boundary, which is why EXECUTE is revoked from anon and
-- authenticated below: only the service role may call it.
CREATE OR REPLACE FUNCTION public.ocr_consume_pages(p_user_id UUID, p_pages INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- A zero or negative page count would be a free call or, worse, a credit.
  IF p_user_id IS NULL OR p_pages IS NULL OR p_pages <= 0 THEN
    RETURN -1;
  END IF;

  SELECT pages_balance INTO v_balance
    FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND OR v_balance < p_pages THEN
    RETURN -1;
  END IF;

  UPDATE profiles
    SET pages_balance = v_balance - p_pages,
        pages_used_total = pages_used_total + p_pages
    WHERE id = p_user_id;

  RETURN v_balance - p_pages;
END $$;

REVOKE ALL ON FUNCTION public.ocr_consume_pages(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ocr_consume_pages(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.ocr_consume_pages(UUID, INTEGER) FROM authenticated;

-- Credit a completed purchase. Same service-role-only reasoning: the caller is
-- the Paddle webhook, which is authenticated by signature rather than by a
-- Supabase session, and letting a logged-in browser top itself up would be the
-- whole product given away.
CREATE OR REPLACE FUNCTION public.ocr_add_pages(p_user_id UUID, p_pages INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_pages IS NULL OR p_pages <= 0 THEN
    RETURN -1;
  END IF;

  SELECT pages_balance INTO v_balance
    FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  UPDATE profiles
    SET pages_balance = v_balance + p_pages
    WHERE id = p_user_id;

  RETURN v_balance + p_pages;
END $$;

REVOKE ALL ON FUNCTION public.ocr_add_pages(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ocr_add_pages(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.ocr_add_pages(UUID, INTEGER) FROM authenticated;
