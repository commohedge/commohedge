import { rateExplorerSupabase } from "./supabaseClient";
import {
  bondsCountriesCacheKey,
  bondsCountryCacheKey,
  readRateExplorerFromDb,
  writeRateExplorerToDb,
} from "./rateExplorerDbCache";

export interface CountryBondData {
  country: string;
  countrySlug: string;
  currency: string;
  rating: string;
  yield10Y: number | null;
  bankRate: number | null;
  spreadVsBund: number | null;
  spreadVsTNote: number | null;
  spreadVsBankRate: number | null;
}

export interface BondYieldData {
  maturity: string;
  maturityYears: number;
  yield: number | null;
  chg1M: number | null;
  chg6M: number | null;
  chg12M: number | null;
  price: number | null;
  priceChg1M: number | null;
  priceChg6M: number | null;
  priceChg12M: number | null;
  capitalGrowth: number | null;
  lastUpdate: string;
}

export interface CountriesResponse {
  success: boolean;
  data?: CountryBondData[];
  error?: string;
  scrapedAt?: string;
}

export interface CountryYieldsResponse {
  success: boolean;
  country?: string;
  currency?: string;
  data?: BondYieldData[];
  error?: string;
  scrapedAt?: string;
}

async function scrapeCountries(): Promise<CountriesResponse> {
  const { data, error } = await rateExplorerSupabase.functions.invoke("scrape-bonds", {
    body: { type: "countries" },
  });

  if (error) {
    console.error("Error fetching countries:", error);
    return { success: false, error: error.message };
  }

  return data as CountriesResponse;
}

async function scrapeCountryYields(countrySlug: string): Promise<CountryYieldsResponse> {
  const { data, error } = await rateExplorerSupabase.functions.invoke("scrape-bonds", {
    body: { type: "country", country: countrySlug },
  });

  if (error) {
    console.error("Error fetching country yields:", error);
    return { success: false, error: error.message };
  }

  return data as CountryYieldsResponse;
}

/**
 * Order: Supabase shared cache → scrape → UPSERT (overwrite).
 */
export async function fetchAllCountries(forceRefresh = false): Promise<CountriesResponse> {
  const key = bondsCountriesCacheKey();

  if (!forceRefresh) {
    const dbHit = await readRateExplorerFromDb(key);
    if (dbHit && Array.isArray(dbHit.payload) && dbHit.payload.length > 0) {
      return {
        success: true,
        data: dbHit.payload as CountryBondData[],
        scrapedAt: dbHit.scrapedAt,
      };
    }
  }

  try {
    const response = await scrapeCountries();
    if (response.success && response.data?.length) {
      await writeRateExplorerToDb(key, "bonds", response.data, {
        scrapedAt: response.scrapedAt,
      });
    }
    return response;
  } catch (e) {
    const stale = await readRateExplorerFromDb(key, { allowStale: true });
    if (stale && Array.isArray(stale.payload) && stale.payload.length > 0) {
      return {
        success: true,
        data: stale.payload as CountryBondData[],
        scrapedAt: stale.scrapedAt,
      };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Order: Supabase shared cache → scrape → UPSERT (overwrite).
 */
export async function fetchCountryYields(
  countrySlug: string,
  forceRefresh = false,
): Promise<CountryYieldsResponse> {
  const key = bondsCountryCacheKey(countrySlug);

  if (!forceRefresh) {
    const dbHit = await readRateExplorerFromDb(key);
    if (dbHit && Array.isArray(dbHit.payload) && dbHit.payload.length > 0) {
      return {
        success: true,
        country: (dbHit.meta.country as string) || countrySlug,
        currency: (dbHit.meta.currency as string) || undefined,
        data: dbHit.payload as BondYieldData[],
        scrapedAt: dbHit.scrapedAt,
      };
    }
  }

  try {
    const response = await scrapeCountryYields(countrySlug);
    if (response.success && response.data?.length) {
      await writeRateExplorerToDb(key, "bonds", response.data, {
        country: response.country || countrySlug,
        currency: response.currency,
        scrapedAt: response.scrapedAt,
      });
    }
    return response;
  } catch (e) {
    const stale = await readRateExplorerFromDb(key, { allowStale: true });
    if (stale && Array.isArray(stale.payload) && stale.payload.length > 0) {
      return {
        success: true,
        country: (stale.meta.country as string) || countrySlug,
        currency: (stale.meta.currency as string) || undefined,
        data: stale.payload as BondYieldData[],
        scrapedAt: stale.scrapedAt,
      };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
