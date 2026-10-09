/**
 * Hourly cron: scrape Commodity Market categories → UPSERT commodity_market_cache.
 *
 * Auth: Authorization Bearer CRON_SECRET (Vercel Cron) or x-vercel-cron: 1
 * Optional query: ?category=energy|metals|agricultural|freight|bunker
 */
import {
  appBaseUrl,
  parseBunkerHtml,
  parseNumber,
  parseTradingViewHtml,
  upsertCommodityCache,
} from "../utils/commodity-cache-upsert.js";

const TV_CATEGORIES = ["energy", "metals", "agricultural"];
const FREIGHT_SYMBOLS = [
  { symbol: "CS41!", name: "Container Freight China to N Europe (Baltic)", type: "container" },
  { symbol: "CS11!", name: "Container Freight China to USWC (Baltic)", type: "container" },
  { symbol: "TM1!", name: "Freight Route TC2 (Baltic)", type: "freight_route" },
  { symbol: "TL1!", name: "Freight Route TD3C (Baltic)", type: "freight_route" },
];

function isAuthorized(req) {
  const cronHeader = req.headers["x-vercel-cron"];
  if (cronHeader === "1") return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in production cron without secret only if Vercel sets the cron header above.
    // Manual/dev: require secret when set; if unset, allow for local smoke tests.
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

async function refreshBunker(base) {
  const json = await fetchJson(`${base}/api/shipandbunker`);
  const rows = parseBunkerHtml(json.data);
  return upsertCommodityCache("bunker", rows);
}

async function refreshFreight(base) {
  const out = [];
  for (const s of FREIGHT_SYMBOLS) {
    try {
      const json = await fetchJson(
        `${base}/api/tradingview/symbol/${encodeURIComponent(s.symbol)}`,
        60000,
      );
      const html = json.data || "";
      const priceMatch =
        html.match(/data-field=["']last["'][^>]*>?\s*([\d.,]+)/i) ||
        html.match(/"last"\s*:\s*([\d.]+)/) ||
        html.match(/js-symbol-last[^>]*>\s*([\d.,]+)/i);
      const price = priceMatch ? parseNumber(priceMatch[1]) : 0;
      if (!(price >= 0) || !priceMatch) continue;
      out.push({
        symbol: s.symbol,
        name: s.name,
        price,
        currency: "USD",
        percentChange: 0,
        absoluteChange: 0,
        high: price,
        low: price,
        technicalEvaluation: "Neutral",
        type: s.type,
        category: "freight",
      });
    } catch (e) {
      console.warn(`[cron] freight ${s.symbol}:`, e.message || e);
    }
  }
  return upsertCommodityCache("freight", out);
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

    if (runBunker) {
      try {
        results.bunker = await refreshBunker(base);
      } catch (e) {
        results.bunker = { ok: false, error: String(e.message || e) };
      }
    }

    if (runFreight) {
      try {
        results.freight = await refreshFreight(base);
      } catch (e) {
        results.freight = { ok: false, error: String(e.message || e) };
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
