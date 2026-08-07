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
