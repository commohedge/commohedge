/**
 * One-shot / hourly: scrape TradingView + Ship&Bunker → UPSERT commodity_market_cache.
 * Run: node scripts/seed-commodity-cache.mjs [energy|metals|agricultural|freight|bunker]
 *
 * Freight: TradingView scanner (quotes-freight page is 404).
 * Bunker: prices wide table + EMEA Gibraltar.
 */
import {
  fetchFreightFromScanner,
  mergeBunkerCommodities,
  parseBunkerHtml,
  parseGibraltarBunkerHtml,
  parseTradingViewHtml,
  upsertCommodityCache,
} from "../api/utils/commodity-cache-upsert.js";

const BASE = (process.env.COMMODITY_SCRAPE_BASE_URL || "https://www.commohedge.com").replace(/\/$/, "");
const TV_CATEGORIES = ["energy", "metals", "agricultural"];

async function fetchJson(path, timeoutMs = 120000) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function seedTvCategory(category) {
  console.log(`Fetching ${category}...`);
  const json = await fetchJson(`/api/tradingview/${category}`);
  const rows = parseTradingViewHtml(json.data, category);
  console.log(`  parsed ${rows.length}`);
  const r = await upsertCommodityCache(category, rows);
  if (!r.ok) console.error(`UPSERT ${category} FAILED:`, r.error);
  else console.log(`UPSERT ${category}: ${r.count} items`);
  return r;
}

async function seedFreight() {
  console.log("Fetching freight (TradingView scanner)...");
  const rows = await fetchFreightFromScanner();
  console.log(`  parsed ${rows.length}`);
  const r = await upsertCommodityCache("freight", rows);
  if (!r.ok) console.error("UPSERT freight FAILED:", r.error);
  else console.log(`UPSERT freight: ${r.count} items`);
  return r;
}

async function seedBunker() {
  console.log("Fetching bunker (prices + EMEA)...");
  const [pricesSettled, emeaSettled] = await Promise.allSettled([
    fetchJson("/api/shipandbunker"),
    fetchJson("/api/shipandbunker/emea"),
  ]);

  const fromPrices =
    pricesSettled.status === "fulfilled" ? parseBunkerHtml(pricesSettled.value?.data) : [];
  const fromEmea =
    emeaSettled.status === "fulfilled"
      ? parseGibraltarBunkerHtml(emeaSettled.value?.data)
      : [];

  if (pricesSettled.status === "rejected") {
    console.warn("  prices:", pricesSettled.reason?.message || pricesSettled.reason);
  } else {
    console.log(`  prices parsed ${fromPrices.length}`);
  }
  if (emeaSettled.status === "rejected") {
    console.warn("  emea:", emeaSettled.reason?.message || emeaSettled.reason);
  } else {
    console.log(`  emea/gibraltar parsed ${fromEmea.length}`);
  }

  const rows = mergeBunkerCommodities(fromEmea, fromPrices);
  console.log(`  merged ${rows.length}`);
  const r = await upsertCommodityCache("bunker", rows);
  if (!r.ok) console.error("UPSERT bunker FAILED:", r.error);
  else console.log(`UPSERT bunker: ${r.count} items`);
  return r;
}

async function main() {
  const only = process.argv[2];
  const runAll = !only;
  const results = {};

  if (runAll || TV_CATEGORIES.includes(only)) {
    for (const category of TV_CATEGORIES) {
      if (only && category !== only) continue;
      try {
        results[category] = await seedTvCategory(category);
      } catch (e) {
        console.error(`${category}:`, e.message || e);
        results[category] = { ok: false, error: String(e.message || e) };
      }
    }
  }

  if (runAll || only === "freight") {
    try {
      results.freight = await seedFreight();
    } catch (e) {
      console.error("freight:", e.message || e);
      results.freight = { ok: false, error: String(e.message || e) };
    }
  }

  if (runAll || only === "bunker") {
    try {
      results.bunker = await seedBunker();
    } catch (e) {
      console.error("bunker:", e.message || e);
      results.bunker = { ok: false, error: String(e.message || e) };
    }
  }

  const failed = Object.entries(results).filter(([, r]) => !r?.ok);
  if (failed.length) {
    console.error(
      "Failed categories:",
      failed.map(([k, r]) => `${k} (${r.error || "unknown"})`).join(", "),
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
