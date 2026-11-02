/**
 * Hourly cron: scrape Commodity Market categories → UPSERT commodity_market_cache.
 *
 * Auth: Authorization Bearer CRON_SECRET (Vercel Cron) or x-vercel-cron: 1
 * Optional query: ?category=energy|metals|agricultural|freight|bunker
 *
 * Freight: TradingView scanner API (quotes-freight page is 404).
 * Bunker: Ship&Bunker prices wide table + EMEA Gibraltar.
 */
import {
  appBaseUrl,
  fetchFreightFromScanner,
  mergeBunkerCommodities,
  parseBunkerHtml,
  parseGibraltarBunkerHtml,
  parseTradingViewHtml,
  upsertCommodityCache,
} from "../utils/commodity-cache-upsert.js";

const TV_CATEGORIES = ["energy", "metals", "agricultural"];

function isAuthorized(req) {
  const cronHeader = req.headers["x-vercel-cron"];
  if (cronHeader === "1") return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1";
  }

  const auth = req.headers.authorization || "";
  return auth === `Bearer ${secret}`;
}

async function fetchJson(url, timeoutMs = 90000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function refreshTradingViewCategory(base, category) {
  const json = await fetchJson(`${base}/api/tradingview/${category}`);
  const rows = parseTradingViewHtml(json.data, category);
  return upsertCommodityCache(category, rows);
}

async function refreshFreight() {
  const rows = await fetchFreightFromScanner();
  return upsertCommodityCache("freight", rows);
}

async function refreshBunker(base) {
  const [pricesSettled, emeaSettled] = await Promise.allSettled([
    fetchJson(`${base}/api/shipandbunker`, 120000),
    fetchJson(`${base}/api/shipandbunker/emea`, 120000),
  ]);

  const fromPrices =
    pricesSettled.status === "fulfilled"
      ? parseBunkerHtml(pricesSettled.value?.data)
      : [];
  const fromEmea =
    emeaSettled.status === "fulfilled"
      ? parseGibraltarBunkerHtml(emeaSettled.value?.data)
      : [];

  if (pricesSettled.status === "rejected") {
    console.warn("[cron] bunker prices:", pricesSettled.reason?.message || pricesSettled.reason);
  }
  if (emeaSettled.status === "rejected") {
    console.warn("[cron] bunker emea:", emeaSettled.reason?.message || emeaSettled.reason);
  }

  const rows = mergeBunkerCommodities(fromEmea, fromPrices);
  return upsertCommodityCache("bunker", rows);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const base = appBaseUrl(req);
  const only = typeof req.query?.category === "string" ? req.query.category : null;
  const started = Date.now();
  const results = {};

  try {
    const runTv = !only || TV_CATEGORIES.includes(only);
    const runBunker = !only || only === "bunker";
    const runFreight = !only || only === "freight";

    if (runTv) {
      const cats = only ? [only].filter((c) => TV_CATEGORIES.includes(c)) : TV_CATEGORIES;
      const settled = await Promise.allSettled(
        cats.map(async (category) => {
          const r = await refreshTradingViewCategory(base, category);
          results[category] = r;
          return r;
        }),
      );
      settled.forEach((s, i) => {
        if (s.status === "rejected") {
          results[cats[i]] = { ok: false, error: String(s.reason?.message || s.reason) };
        }
      });
    }

    if (runFreight) {
      try {
        results.freight = await refreshFreight();
      } catch (e) {
        results.freight = { ok: false, error: String(e.message || e) };
      }
    }

    if (runBunker) {
      try {
        results.bunker = await refreshBunker(base);
      } catch (e) {
        results.bunker = { ok: false, error: String(e.message || e) };
      }
    }

    const okCount = Object.values(results).filter((r) => r?.ok).length;
    return res.status(200).json({
      ok: okCount > 0,
      elapsedMs: Date.now() - started,
      base,
      results,
    });
  } catch (e) {
    console.error("[cron] refresh-commodity-cache failed:", e);
    return res.status(500).json({
      ok: false,
      error: String(e.message || e),
      elapsedMs: Date.now() - started,
      results,
    });
  }
}
