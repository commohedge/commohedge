-- Shared Commodity Market cache (one row per category — upsert overwrites, no history growth)
-- Run in Supabase SQL editor on the MAIN app project (iflnsckduohrcafafcpj).

CREATE TABLE IF NOT EXISTS public.commodity_market_cache (
  category TEXT PRIMARY KEY
    CHECK (category IN ('metals', 'agricultural', 'energy', 'freight', 'bunker')),
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.commodity_market_cache IS
  'Latest scraped Commodity Market snapshot per category. Always overwritten on refresh.';

CREATE INDEX IF NOT EXISTS commodity_market_cache_expires_at_idx
  ON public.commodity_market_cache (expires_at);

ALTER TABLE public.commodity_market_cache ENABLE ROW LEVEL SECURITY;

-- Shared market data: any client with the anon/publishable key can read
DROP POLICY IF EXISTS "commodity_market_cache_select_all" ON public.commodity_market_cache;
CREATE POLICY "commodity_market_cache_select_all"
  ON public.commodity_market_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Any client can upsert (overwrite) the shared snapshot — no per-user history
DROP POLICY IF EXISTS "commodity_market_cache_upsert_all" ON public.commodity_market_cache;
CREATE POLICY "commodity_market_cache_upsert_all"
  ON public.commodity_market_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "commodity_market_cache_update_all" ON public.commodity_market_cache;
CREATE POLICY "commodity_market_cache_update_all"
  ON public.commodity_market_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "commodity_market_cache_delete_all" ON public.commodity_market_cache;
CREATE POLICY "commodity_market_cache_delete_all"
  ON public.commodity_market_cache
  FOR DELETE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "commodity_market_cache_insert_all" ON public.commodity_market_cache;
CREATE POLICY "commodity_market_cache_insert_all"
  ON public.commodity_market_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
