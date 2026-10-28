import { rateExplorerSupabase } from './supabaseClient';
import { IRSResponse } from './irsIndices';
import { getCachedIRSData, setCachedIRSData } from './dataCache';
import {
  irsCacheKey,
  readRateExplorerFromDb,
  writeRateExplorerToDb,
} from './rateExplorerDbCache';

function responseFromDb(
  currency: string,
  payload: unknown,
  meta: Record<string, unknown>,
  scrapedAt: string,
): IRSResponse | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  return {
    success: true,
    currency: (meta.currency as string) || currency,
    name: (meta.name as string) || undefined,
    data: payload as IRSResponse['data'],
    lastUpdated: (meta.lastUpdated as string) || scrapedAt,
  };
}

async function scrapeIRSRates(currency: string): Promise<IRSResponse> {
  const { data, error } = await rateExplorerSupabase.functions.invoke('scrape-irs', {
    body: { currency },
  });

  if (error) {
    console.error('Error fetching IRS rates:', error);
    return { success: false, error: error.message };
  }

  return data as IRSResponse;
}

/**
 * Order: Supabase shared cache → localStorage → scrape → UPSERT Supabase (overwrite).
 */
export async function fetchIRSRates(currency: string, forceRefresh = false): Promise<IRSResponse> {
  const key = irsCacheKey(currency);

  if (!forceRefresh) {
    const dbHit = await readRateExplorerFromDb(key);
    if (dbHit) {
      const fromDb = responseFromDb(currency, dbHit.payload, dbHit.meta, dbHit.scrapedAt);
      if (fromDb?.success) {
        setCachedIRSData(currency, fromDb);
        return fromDb;
      }
    }

    const cached = getCachedIRSData(currency);
    if (cached?.success && cached.data?.length) {
      console.log(`Using local IRS cache for ${currency}`);
      void writeRateExplorerToDb(key, 'irs', cached.data, {
        currency: cached.currency || currency,
        name: cached.name,
        lastUpdated: cached.lastUpdated,
      });
      return cached;
    }
  } else {
    console.log(`Force refresh IRS data for ${currency}`);
  }

  try {
    console.log(`Fetching fresh IRS data for ${currency}`);
    const response = await scrapeIRSRates(currency);

    if (response.success && response.data?.length) {
      setCachedIRSData(currency, response);
      await writeRateExplorerToDb(key, 'irs', response.data, {
        currency: response.currency || currency,
        name: response.name,
        lastUpdated: response.lastUpdated,
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching IRS rates:', error);

    const stale = await readRateExplorerFromDb(key, { allowStale: true });
    if (stale) {
      const fromDb = responseFromDb(currency, stale.payload, stale.meta, stale.scrapedAt);
      if (fromDb?.success) return fromDb;
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
