/**
 * Supabase client for Ticker Peek Pro (scrape-currencies, scrape-futures, scrape-options, scrape-volatility, scrape-vol-surface).
 * Config = ticker-peek-pro/.env (projet merzfmfodlmskuygkwnw).
 *
 * Frontend (cette app) :
 * - URL et clé anon en fallback ci-dessous (identique ticker-peek-pro/.env).
 * - Optionnel : VITE_TICKER_PEEK_PRO_SUPABASE_URL, VITE_TICKER_PEEK_PRO_SUPABASE_PUBLISHABLE_KEY dans .env.
 *
 * Volatility Surface 3D (scrape-vol-surface) :
 * - Appels via ce client → même projet Supabase.
 * - Côté Supabase (Dashboard → Edge Functions → Secrets), le projet merzfmfodlmskuygkwnw doit avoir
 *   FIRECRAWL_API_KEY défini pour que scrape-vol-surface (et les autres scrape-*) fonctionnent.
 */
import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://merzfmfodlmskuygkwnw.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcnpmbWZvZGxtc2t1eWdrd253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjEwOTYsImV4cCI6MjA4NjczNzA5Nn0.A4FsFhSYR1Wjo7kWYkFF7PiYt3VQT584B30Xp_g_cGE";

const SUPABASE_URL = import.meta.env.VITE_TICKER_PEEK_PRO_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_KEY = import.meta.env.VITE_TICKER_PEEK_PRO_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY;

export const tickerPeekProSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
