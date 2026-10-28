/**
 * Shared helpers to scrape Rate Explorer Edge Functions + UPSERT rate_explorer_cache.
 * Used by morning cron / seed script.
 */
import { createClient } from "@supabase/supabase-js";

/** ~26h so a daily 07:00 CET refresh stays fresh until the next morning. */
export const RATE_EXPLORER_CACHE_TTL_MS = 26 * 60 * 60 * 1000;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://iflnsckduohrcafafcpj.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_1wxQlJYrs4cqXinMMohHtw_KIsybCpJ";

/** JWT anon used by Rate Explorer Edge Function client (verify_jwt compatible). */
const RATE_FUNCTIONS_URL =
  process.env.RATE_EXPLORER_SUPABASE_URL ||
  process.env.VITE_RATE_EXPLORER_SUPABASE_URL ||
  SUPABASE_URL;

const RATE_FUNCTIONS_KEY =
  process.env.RATE_EXPLORER_SUPABASE_ANON_KEY ||
  process.env.VITE_RATE_EXPLORER_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbG5zY2tkdW9ocmNhZmFmY3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDk1MjQsImV4cCI6MjA4MzI4NTUyNH0.y2mWIp_p0zmj0rhI6kQJBOzAuwpZND1QLwEZ8PeIMTg";

export const RATE_INDICES = [
  "euribor3m",
  "sofr",
  "sonia",
  "estr3m",
  "estr1m",
  "estr3m_long",
  "tona3m",
  "saron3m",
  "corra3m",
  "sora3m",
];

export const IRS_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"];

/** Major sovereign curves refreshed every morning (others cached on first user open). */
export const MAJOR_BOND_COUNTRIES = [
  "united-states",
  "germany",
  "france",
  "united-kingdom",
  "japan",
  "switzerland",
  "china",
  "canada",
  "australia",
  "italy",
  "spain",
  "netherlands",
  "sweden",
  "norway",
  "brazil",
  "india",
  "mexico",
  "south-korea",
  "turkey",
  "poland",
];

export function getDbClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function payloadLength(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") return 1;
  return 0;
}

export async function upsertRateExplorerCache(cacheKey, kind, payload, meta = {}, ttlMs = RATE_EXPLORER_CACHE_TTL_MS) {
  if (!payload || payloadLength(payload) === 0) {
    return { ok: false, error: "empty payload", cacheKey };
  }
  const now = new Date();
  const supabase = getDbClient();
  const { error } = await supabase.from("rate_explorer_cache").upsert(
    {
      cache_key: cacheKey,
      kind,
      payload,
      meta,
      item_count: payloadLength(payload),
      scraped_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlMs).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "cache_key" },
  );
  if (error) return { ok: false, error: error.message, cacheKey, count: payloadLength(payload) };
  return { ok: true, cacheKey, count: payloadLength(payload) };
}

async function invokeFunction(fnName, body, timeoutMs = 120000) {
  const res = await fetch(`${RATE_FUNCTIONS_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RATE_FUNCTIONS_KEY}`,
      apikey: RATE_FUNCTIONS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${fnName} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(json?.error || `${fnName} HTTP ${res.status}`);
  }
  return json;
}

export async function refreshRateIndex(indexId) {
  const json = await invokeFunction("scrape-rates", { index: indexId });
  if (!json?.success || !Array.isArray(json.data) || !json.data.length) {
    return { ok: false, error: json?.error || "empty rates", cacheKey: `rates:${indexId}` };
  }
  return upsertRateExplorerCache(`rates:${indexId}`, "rates", json.data, {
    index: json.index || indexId,
    name: json.name,
    currency: json.currency,
    lastUpdated: json.lastUpdated,
  });
}

export async function refreshIrsCurrency(currency) {
  const json = await invokeFunction("scrape-irs", { currency });
  if (!json?.success || !Array.isArray(json.data) || !json.data.length) {
    return { ok: false, error: json?.error || "empty irs", cacheKey: `irs:${currency}` };
  }
  return upsertRateExplorerCache(`irs:${currency.toUpperCase()}`, "irs", json.data, {
    currency: json.currency || currency,
    name: json.name,
    lastUpdated: json.lastUpdated,
  });
}

export async function refreshBondsCountries() {
  const json = await invokeFunction("scrape-bonds", { type: "countries" });
  if (!json?.success || !Array.isArray(json.data) || !json.data.length) {
    return { ok: false, error: json?.error || "empty countries", cacheKey: "bonds:countries" };
  }
  return upsertRateExplorerCache("bonds:countries", "bonds", json.data, {
    scrapedAt: json.scrapedAt,
  });
}

export async function refreshBondCountry(countrySlug) {
  const json = await invokeFunction("scrape-bonds", {
    type: "country",
    country: countrySlug,
  });
  if (!json?.success || !Array.isArray(json.data) || !json.data.length) {
    return {
      ok: false,
      error: json?.error || "empty country yields",
      cacheKey: `bonds:country:${countrySlug}`,
    };
  }
  return upsertRateExplorerCache(`bonds:country:${countrySlug}`, "bonds", json.data, {
    country: json.country || countrySlug,
    currency: json.currency,
    scrapedAt: json.scrapedAt,
  });
}

/**
 * Full morning refresh: all rate futures + IRS + countries list + major bond curves.
 * Sequential with small delays to avoid hammering the scrape source.
 */
export async function refreshAllRateExplorerCache(options = {}) {
  const {
    includeRates = true,
    includeIrs = true,
    includeBondsCountries = true,
    includeMajorBondCountries = true,
    delayMs = 400,
  } = options;

  const results = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (includeRates) {
    for (const indexId of RATE_INDICES) {
      try {
        results[`rates:${indexId}`] = await refreshRateIndex(indexId);
      } catch (e) {
        results[`rates:${indexId}`] = { ok: false, error: String(e.message || e) };
      }
      await sleep(delayMs);
    }
  }

  if (includeIrs) {
    for (const currency of IRS_CURRENCIES) {
      try {
        results[`irs:${currency}`] = await refreshIrsCurrency(currency);
      } catch (e) {
        results[`irs:${currency}`] = { ok: false, error: String(e.message || e) };
      }
      await sleep(delayMs);
    }
  }

  if (includeBondsCountries) {
    try {
      results["bonds:countries"] = await refreshBondsCountries();
    } catch (e) {
      results["bonds:countries"] = { ok: false, error: String(e.message || e) };
    }
  }

  if (includeMajorBondCountries) {
    for (const slug of MAJOR_BOND_COUNTRIES) {
      try {
        results[`bonds:country:${slug}`] = await refreshBondCountry(slug);
      } catch (e) {
        results[`bonds:country:${slug}`] = { ok: false, error: String(e.message || e) };
      }
      await sleep(delayMs);
    }
  }

  const okCount = Object.values(results).filter((r) => r?.ok).length;
  return { ok: okCount > 0, okCount, total: Object.keys(results).length, results };
}
