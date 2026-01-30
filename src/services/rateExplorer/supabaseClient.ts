// Client Supabase séparé pour Rate Explorer
// Ce client utilise le projet Supabase où les edge functions de scraping sont déployées
import { createClient } from '@supabase/supabase-js';

// Rate Explorer Supabase project configuration
// Project ID: iflnsckduohrcafafcpj (where scrape-rates, scrape-irs, scrape-bonds are deployed)
const RATE_EXPLORER_SUPABASE_URL = 'https://iflnsckduohrcafafcpj.supabase.co';
const RATE_EXPLORER_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbG5zY2tkdW9ocmNhZmFmY3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDk1MjQsImV4cCI6MjA4MzI4NTUyNH0.y2mWIp_p0zmj0rhI6kQJBOzAuwpZND1QLwEZ8PeIMTg';

export const rateExplorerSupabase = createClient(
  RATE_EXPLORER_SUPABASE_URL,
  RATE_EXPLORER_SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

