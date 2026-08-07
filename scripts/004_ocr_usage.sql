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
