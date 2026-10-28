import { rateExplorerSupabase } from "./supabaseClient";
import { RateResponse } from "./rateIndices";
import { getCachedRateData, setCachedRateData } from "./dataCache";
import {
  ratesCacheKey,
  readRateExplorerFromDb,
  writeRateExplorerToDb,
} from "./rateExplorerDbCache";

function responseFromDb(
  index: string,
  payload: unknown,
  meta: Record<string, unknown>,
  scrapedAt: string,
): RateResponse | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  return {
    success: true,
    index: (meta.index as string) || index,
    name: (meta.name as string) || undefined,
    currency: (meta.currency as string) || undefined,
    data: payload as RateResponse["data"],
    lastUpdated: (meta.lastUpdated as string) || scrapedAt,
  };
}

async function scrapeRateData(index: string): Promise<RateResponse> {
  const { data, error } = await rateExplorerSupabase.functions.invoke("scrape-rates", {
    body: { index },
  });

  if (error) {
    console.error("Error fetching rate data:", error);
    return { success: false, error: error.message };
  }

  return data as RateResponse;
}

/**
 * Order: Supabase shared cache → localStorage → scrape → UPSERT Supabase (overwrite).
 * forceRefresh: skip caches, scrape, overwrite DB.
 */
export async function fetchRateData(index: string, forceRefresh = false): Promise<RateResponse> {
  const key = ratesCacheKey(index);

  if (!forceRefresh) {
    const dbHit = await readRateExplorerFromDb(key);
    if (dbHit) {
      const fromDb = responseFromDb(index, dbHit.payload, dbHit.meta, dbHit.scrapedAt);
      if (fromDb?.success) {
        setCachedRateData(index, fromDb);
        return fromDb;
      }
    }

    const cached = getCachedRateData(index);
    if (cached?.success && cached.data?.length) {
      console.log(`Using local rate cache for ${index}`);
      void writeRateExplorerToDb(key, "rates", cached.data, {
        index: cached.index || index,
        name: cached.name,
        currency: cached.currency,
        lastUpdated: cached.lastUpdated,
      });
      return cached;
    }
  } else {
    console.log(`Force refresh rate data for ${index}`);
  }

  try {
    console.log(`Fetching fresh rate data for ${index}`);
    const response = await scrapeRateData(index);

    if (response.success && response.data?.length) {
      setCachedRateData(index, response);
      await writeRateExplorerToDb(key, "rates", response.data, {
        index: response.index || index,
        name: response.name,
        currency: response.currency,
        lastUpdated: response.lastUpdated,
      });
    }

    return response;
  } catch (err) {
    console.error("Error calling edge function:", err);

    // Soft fallback: stale DB if force refresh scrape failed
    const stale = await readRateExplorerFromDb(key, { allowStale: true });
    if (stale) {
      const fromDb = responseFromDb(index, stale.payload, stale.meta, stale.scrapedAt);
      if (fromDb?.success) return fromDb;
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
