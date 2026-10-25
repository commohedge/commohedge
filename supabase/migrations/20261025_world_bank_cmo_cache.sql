-- World Bank CMO (Pink Sheet) monthly cache
-- One row + one Storage object — always overwritten (no history growth).
-- Public SELECT; writes only via service_role (edge function / cron).

CREATE TABLE IF NOT EXISTS public.world_bank_cmo_cache (
  id TEXT PRIMARY KEY DEFAULT 'monthly'
    CHECK (id = 'monthly'),
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  commodity_count INTEGER NOT NULL DEFAULT 0,
  source_url TEXT,
  file_path TEXT NOT NULL DEFAULT 'CMO-Historical-Data-Monthly.xlsx',
  file_etag TEXT,
  file_bytes INTEGER,
  period_label TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.world_bank_cmo_cache IS
  'Latest World Bank CMO Historical Data Monthly snapshot. Single row, overwritten on each sync.';

INSERT INTO public.world_bank_cmo_cache (id)
VALUES ('monthly')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.world_bank_cmo_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_bank_cmo_cache_select_all" ON public.world_bank_cmo_cache;
CREATE POLICY "world_bank_cmo_cache_select_all"
  ON public.world_bank_cmo_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated —
-- edge function uses service_role (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Storage: single public object path world-bank/CMO-Historical-Data-Monthly.xlsx
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'world-bank',
  'world-bank',
  true,
  20971520, -- 20 MB
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "world_bank_storage_public_read" ON storage.objects;
CREATE POLICY "world_bank_storage_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'world-bank');

-- ---------------------------------------------------------------------------
-- Optional cron (enable pg_cron + pg_net in Dashboard → Database → Extensions)
-- Runs daily 06:00 UTC on calendar days 1–12; the edge function enforces
-- "on/after 3rd business day" and skips if already synced for YYYY-MM.
--
-- Replace PROJECT_REF and CRON_SECRET before enabling:
--
-- SELECT cron.schedule(
--   'sync-world-bank-cmo-monthly',
--   '0 6 1-12 * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-world-bank-cmo',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ---------------------------------------------------------------------------
