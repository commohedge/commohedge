/**
 * Scrape Rate Explorer Edge Functions + UPSERT rate_explorer_cache (overwrite).
 *
 * Run locally / CI:
 *   node scripts/seed-rate-explorer-cache.mjs
 *   node scripts/seed-rate-explorer-cache.mjs rates
 *   node scripts/seed-rate-explorer-cache.mjs irs
 *   node scripts/seed-rate-explorer-cache.mjs bonds
 *
 * Schedule: GitHub Actions daily ~07:00 CET (06:00 UTC winter).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://iflnsckduohrcafafcpj.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_1wxQlJYrs4cqXinMMohHtw_KIsybCpJ";

const FUNCTIONS_KEY =
  process.env.RATE_EXPLORER_SUPABASE_ANON_KEY ||
  process.env.VITE_RATE_EXPLORER_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbG5zY2tkdW9ocmNhZmFmY3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDk1MjQsImV4cCI6MjA4MzI4NTUyNH0.y2mWIp_p0zmj0rhI6kQJBOzAuwpZND1QLwEZ8PeIMTg";

const TTL_MS = 26 * 60 * 60 * 1000;

const RATE_INDICES = [
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

const IRS_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"];

const MAJOR_BOND_COUNTRIES = [
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function invokeFunction(fnName, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FUNCTIONS_KEY}`,
      apikey: FUNCTIONS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${fnName} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json?.error || `${fnName} HTTP ${res.status}`);
  return json;
}

async function upsert(cacheKey, kind, payload, meta = {}) {
  if (!Array.isArray(payload) || !payload.length) {
    console.warn(`skip empty ${cacheKey}`);
    return false;
  }
  const now = new Date();
  const { error } = await supabase.from("rate_explorer_cache").upsert(
    {
      cache_key: cacheKey,
      kind,
      payload,
      meta,
      item_count: payload.length,
      scraped_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "cache_key" },
  );
  if (error) {
    console.error(`UPSERT ${cacheKey} FAILED:`, error.message);
    return false;
  }
  console.log(`UPSERT ${cacheKey}: ${payload.length} items`);
  return true;
}

async function refreshRates() {
  for (const indexId of RATE_INDICES) {
    try {
      console.log(`rates ${indexId}...`);
      const json = await invokeFunction("scrape-rates", { index: indexId });
      await upsert(`rates:${indexId}`, "rates", json.data, {
        index: json.index || indexId,
        name: json.name,
        currency: json.currency,
        lastUpdated: json.lastUpdated,
      });
    } catch (e) {
      console.error(`rates:${indexId}:`, e.message || e);
    }
    await sleep(400);
  }
}

async function refreshIrs() {
  for (const currency of IRS_CURRENCIES) {
    try {
      console.log(`irs ${currency}...`);
      const json = await invokeFunction("scrape-irs", { currency });
      await upsert(`irs:${currency}`, "irs", json.data, {
        currency: json.currency || currency,
        name: json.name,
        lastUpdated: json.lastUpdated,
      });
    } catch (e) {
      console.error(`irs:${currency}:`, e.message || e);
    }
    await sleep(400);
  }
}

async function refreshBonds() {
  try {
    console.log("bonds countries...");
    const json = await invokeFunction("scrape-bonds", { type: "countries" });
    await upsert("bonds:countries", "bonds", json.data, { scrapedAt: json.scrapedAt });
  } catch (e) {
    console.error("bonds:countries:", e.message || e);
  }

  for (const slug of MAJOR_BOND_COUNTRIES) {
    try {
      console.log(`bonds country ${slug}...`);
      const json = await invokeFunction("scrape-bonds", { type: "country", country: slug });
      await upsert(`bonds:country:${slug}`, "bonds", json.data, {
        country: json.country || slug,
        currency: json.currency,
        scrapedAt: json.scrapedAt,
      });
    } catch (e) {
      console.error(`bonds:country:${slug}:`, e.message || e);
    }
    await sleep(400);
  }
}

async function main() {
  const only = (process.argv[2] || "all").toLowerCase();
  console.log(`Rate Explorer cache seed mode=${only} db=${SUPABASE_URL}`);

  if (only === "all" || only === "rates") await refreshRates();
  if (only === "all" || only === "irs") await refreshIrs();
  if (only === "all" || only === "bonds") await refreshBonds();

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
