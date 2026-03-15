// Client Supabase séparé pour Rate Explorer
// Ce client utilise le projet Supabase où les edge functions de scraping sont déployées
import { createClient } from '@supabase/supabase-js';

// Rate Explorer Supabase project configuration
// Project ID: iflnsckduohrcafafcpj (where scrape-rates, scrape-irs, scrape-bonds are deployed)
const RATE_EXPLORER_SUPABASE_URL = 'https://wrlwmvggedkqhmdzgmbo.supabase.co';
const RATE_EXPLORER_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybHdtdmdnZWRrcWhtZHpnbWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjYwMjgsImV4cCI6MjA4NzQ0MjAyOH0.t-gsmPSGI4N2fvgZCqbrl7Stoow61DwlcVbU3X_WCyc';

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

