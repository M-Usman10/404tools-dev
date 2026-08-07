-- 404tools.dev OCR API - complete schema, generated from scripts/001-005.
-- Paste this whole file into the Supabase SQL editor for project
-- bpqvpdxbkoyydczoucek and run it once. Every statement is idempotent,
-- so re-running it is safe.

-- ============================================================
-- scripts/001_profiles.sql
-- ============================================================
-- Profiles: one row per auth user, holding the prepaid page balance that the
-- OCR API debits. Safe to re-run; every statement is guarded.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  pages_balance INTEGER NOT NULL DEFAULT 0,
  pages_used_total INTEGER NOT NULL DEFAULT 0,
  paddle_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- A policy picks the rows a session may write, never the columns, and Supabase
-- hands the authenticated role UPDATE on every column of a public table by
-- default. Left alone, that lets a logged-in browser PATCH its own
-- pages_balance through PostgREST and mint unlimited OCR credit. The display
-- name is the only column a session writes; balances and the Paddle customer id
-- go through the SECURITY DEFINER functions and the service-role webhook.
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- The profile row has to exist the instant the auth user does. The signup
-- server action writes the display name with an UPDATE, and a session that has
-- not confirmed its email cannot INSERT its own row, so without this trigger
-- that update would silently affect zero rows and the dashboard would render
-- against a missing profile. SECURITY DEFINER because the inserting role here
-- is supabase_auth_admin, which has no rights on public.profiles and would
-- otherwise be blocked by RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at honest without every caller having to remember it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill profiles for any auth users that predate this script, so an
-- existing project picks them up on the first run.
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, u.raw_user_meta_data ->> 'full_name'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- scripts/002_ocr_billing.sql
-- ============================================================
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

-- ============================================================
-- scripts/003_api_keys.sql
-- ============================================================
-- API keys are the only way to reach the OCR endpoint, so the plaintext key is
-- shown to the user exactly once at creation and never stored. What lives here
-- is the sha256 hex digest, which means a dumped or leaked database row cannot
-- be replayed as a credential. key_prefix is the harmless first 16 characters,
-- kept only so the dashboard can tell two keys apart in a list.
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  request_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- The UNIQUE constraint on key_hash already provides the index the OCR
-- authentication lookup needs. This one serves the dashboard listing, which
-- always filters to a user's live keys.
CREATE INDEX IF NOT EXISTS api_keys_user_revoked_idx
  ON public.api_keys (user_id, revoked_at);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- No delete policy: revoking sets revoked_at rather than dropping the row, so
-- ocr_usage keeps pointing at something and the usage history stays readable.
DROP POLICY IF EXISTS "api_keys_select_own" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_insert_own" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_update_own" ON public.api_keys;

CREATE POLICY "api_keys_select_own" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert_own" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update_own" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- scripts/004_ocr_usage.sql
-- ============================================================
-- One row per OCR request, successful or not. Failed rows carry pages = 0
-- because nothing was debited for them, but they are still recorded so a user
-- debugging a 502 can see the attempt and the error text.
CREATE TABLE IF NOT EXISTS public.ocr_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'prebuilt-read',
  file_name TEXT,
  file_bytes BIGINT,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Every read of this table is "the newest rows for one user", both for the
-- recent-requests list and for the daily rollup below.
CREATE INDEX IF NOT EXISTS ocr_usage_user_created_idx
  ON public.ocr_usage (user_id, created_at DESC);

ALTER TABLE public.ocr_usage ENABLE ROW LEVEL SECURITY;

-- Read-only to the owner. Writes come from the OCR route under the service
-- role, which has no session, so no insert policy would ever match anyway.
DROP POLICY IF EXISTS "ocr_usage_select_own" ON public.ocr_usage;
CREATE POLICY "ocr_usage_select_own" ON public.ocr_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Daily rollup for the usage chart. Doing this in the browser would mean
-- shipping every ocr_usage row the user has ever generated just to draw thirty
-- bars, so the aggregation happens here and the client gets a few hundred
-- bytes. Days with no traffic are returned as zeroes rather than omitted, so
-- the chart does not have to reconstruct the missing buckets. Buckets are UTC,
-- which is what the API itself bills in.
DROP FUNCTION IF EXISTS public.ocr_usage_daily(INTEGER);
CREATE FUNCTION public.ocr_usage_daily(p_days INTEGER DEFAULT 30)
RETURNS TABLE (day DATE, requests BIGINT, pages BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    -- Clamp so a hostile or careless caller cannot ask for a million buckets.
    SELECT GREATEST(1, LEAST(COALESCE(p_days, 30), 365)) AS n
  ),
  days AS (
    -- Cast to timestamp explicitly: with bare date arguments the timestamptz
    -- overload of generate_series wins and the buckets start drifting with the
    -- session timezone.
    SELECT generate_series(
      ((now() AT TIME ZONE 'UTC')::date - ((SELECT n FROM bounds) - 1))::timestamp,
      (now() AT TIME ZONE 'UTC')::date::timestamp,
      INTERVAL '1 day'
    )::date AS day
  ),
  rows_in_window AS (
    SELECT (u.created_at AT TIME ZONE 'UTC')::date AS day, u.pages
    FROM ocr_usage u
    WHERE u.user_id = auth.uid()
      -- Spelled out rather than comparing timestamptz to a bare date, so the
      -- window does not shift if the session timezone is ever not UTC.
      AND u.created_at >= (((now() AT TIME ZONE 'UTC')::date
                            - ((SELECT n FROM bounds) - 1))::timestamp
                           AT TIME ZONE 'UTC')
  )
  SELECT d.day,
         count(r.day) AS requests,
         COALESCE(sum(r.pages), 0)::BIGINT AS pages
  FROM days d
  LEFT JOIN rows_in_window r ON r.day = d.day
  GROUP BY d.day
  ORDER BY d.day
$$;

REVOKE ALL ON FUNCTION public.ocr_usage_daily(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ocr_usage_daily(INTEGER) TO authenticated;


-- ============================================================
-- scripts/005_billing_integrity.sql
-- ============================================================
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
