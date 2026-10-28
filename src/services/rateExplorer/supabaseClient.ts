// Client Supabase pour Rate Explorer (scrape-rates / scrape-irs / scrape-bonds).
// Ces Edge Functions sont déployées sur le projet Auth principal iflnsckduohrcafafcpj.
import { createClient } from '@supabase/supabase-js';

// Project ref: iflnsckduohrcafafcpj
// (Ancien projet wrlwmvggedkqhmdzgmbo n'existe plus — DNS introuvable.)
const DEFAULT_RATE_EXPLORER_SUPABASE_URL = 'https://iflnsckduohrcafafcpj.supabase.co';
const DEFAULT_RATE_EXPLORER_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbG5zY2tkdW9ocmNhZmFmY3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDk1MjQsImV4cCI6MjA4MzI4NTUyNH0.y2mWIp_p0zmj0rhI6kQJBOzAuwpZND1QLwEZ8PeIMTg';

const RATE_EXPLORER_SUPABASE_URL =
  import.meta.env.VITE_RATE_EXPLORER_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  DEFAULT_RATE_EXPLORER_SUPABASE_URL;

const RATE_EXPLORER_SUPABASE_KEY =
  import.meta.env.VITE_RATE_EXPLORER_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_RATE_EXPLORER_SUPABASE_KEY;

export const rateExplorerSupabase = createClient(
  RATE_EXPLORER_SUPABASE_URL,
  RATE_EXPLORER_SUPABASE_KEY,
  {
    auth: {
      storageKey: 'rate-explorer-supabase-auth',
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
