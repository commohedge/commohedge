-- Shared Rate Explorer cache (one row per key — UPSERT overwrites, no history growth)
-- Project: iflnsckduohrcafafcpj (main Auth / Rate Explorer functions)

CREATE TABLE IF NOT EXISTS public.rate_explorer_cache (
  cache_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('rates', 'irs', 'bonds')),
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  item_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.rate_explorer_cache IS
  'Latest Rate Explorer scrape snapshot per key (rates:/irs:/bonds:). Always overwritten on refresh.';

CREATE INDEX IF NOT EXISTS rate_explorer_cache_kind_idx
  ON public.rate_explorer_cache (kind);

CREATE INDEX IF NOT EXISTS rate_explorer_cache_expires_at_idx
  ON public.rate_explorer_cache (expires_at);

ALTER TABLE public.rate_explorer_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_explorer_cache_select_all" ON public.rate_explorer_cache;
CREATE POLICY "rate_explorer_cache_select_all"
  ON public.rate_explorer_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "rate_explorer_cache_insert_all" ON public.rate_explorer_cache;
CREATE POLICY "rate_explorer_cache_insert_all"
  ON public.rate_explorer_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "rate_explorer_cache_update_all" ON public.rate_explorer_cache;
CREATE POLICY "rate_explorer_cache_update_all"
  ON public.rate_explorer_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "rate_explorer_cache_delete_all" ON public.rate_explorer_cache;
CREATE POLICY "rate_explorer_cache_delete_all"
  ON public.rate_explorer_cache
  FOR DELETE
  TO anon, authenticated
  USING (true);
