/**
 * Morning cron (~07:00 CET): scrape Rate Explorer → UPSERT rate_explorer_cache (overwrite).
 *
 * Auth: Authorization Bearer CRON_SECRET (Vercel Cron / GitHub) or x-vercel-cron: 1
 * Optional query flags:
 *   ?skipBonds=1          skip major country curves (still refreshes countries list unless skipCountries=1)
 *   ?skipCountries=1
 *   ?ratesOnly=1
 *   ?irsOnly=1
 */
import { refreshAllRateExplorerCache } from "../utils/rate-explorer-cache-upsert.js";

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

  const q = req.query || {};
  const ratesOnly = q.ratesOnly === "1" || q.ratesOnly === "true";
  const irsOnly = q.irsOnly === "1" || q.irsOnly === "true";
  const skipBonds = q.skipBonds === "1" || q.skipBonds === "true";
  const skipCountries = q.skipCountries === "1" || q.skipCountries === "true";

  const started = Date.now();
  try {
    const summary = await refreshAllRateExplorerCache({
      includeRates: !irsOnly,
      includeIrs: !ratesOnly,
      includeBondsCountries: !ratesOnly && !irsOnly && !skipCountries,
      includeMajorBondCountries: !ratesOnly && !irsOnly && !skipBonds,
      delayMs: 350,
    });

    return res.status(200).json({
      ...summary,
      elapsedMs: Date.now() - started,
    });
  } catch (e) {
    console.error("[cron] refresh-rate-explorer-cache failed:", e);
    return res.status(500).json({
      ok: false,
      error: String(e.message || e),
      elapsedMs: Date.now() - started,
    });
  }
}
