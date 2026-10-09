/**
 * Shared parse + Supabase UPSERT helpers for commodity_market_cache.
 * Used by the hourly cron (and can be reused by seed scripts).
 */
import { createClient } from "@supabase/supabase-js";
import { parse } from "node-html-parser";

export const COMMODITY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://iflnsckduohrcafafcpj.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_1wxQlJYrs4cqXinMMohHtw_KIsybCpJ";

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export function parseNumber(text) {
  if (!text) return 0;
  let cleanText = String(text).replace(/[^\d.,-]/g, "");
  if (cleanText.includes(",") && cleanText.includes(".")) {
    const lastDotIndex = cleanText.lastIndexOf(".");
    const lastCommaIndex = cleanText.lastIndexOf(",");
    if (lastDotIndex > lastCommaIndex) cleanText = cleanText.replace(/,/g, "");
    else cleanText = cleanText.replace(/\./g, "").replace(",", ".");
  } else if (cleanText.includes(",")) {
    const parts = cleanText.split(",");
    if (parts.length === 2 && parts[1].length === 3) cleanText = cleanText.replace(/,/g, "");
    else cleanText = cleanText.replace(",", ".");
  }
  return parseFloat(cleanText) || 0;
}

export function parseTradingViewHtml(html, category) {
  const root = parse(html || "");
  let rows = root.querySelectorAll(".tv-data-table__row");
  if (!rows.length) rows = root.querySelectorAll("tr[data-rowid]");
  if (!rows.length) rows = root.querySelectorAll("table tr");

  const commodities = [];
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (!cells || cells.length < 6) continue;

    const firstCell = cells[0];
    let symbol = "";
    let name = "";
    const symbolElement = firstCell.querySelector(".symbol-name");
    if (symbolElement) {
      symbol = symbolElement.text.trim();
      name = symbolElement.getAttribute("title") || "";
    } else {
      const parts = firstCell.text.trim().split(/\s+/);
      symbol = parts[0] || "";
      name = parts.slice(1).join(" ");
    }
    if (symbol.includes("!")) {
      const m = symbol.match(/^(.*?!)(.+)$/);
      if (m) {
        symbol = m[1].trim();
        const trailing = m[2].trim();
        if (trailing) name = name ? `${trailing} ${name}`.trim() : trailing;
      }
    }
    if (!symbol) continue;

    const price = parseNumber(cells[1]?.text.trim());
    let percentChange = parseNumber(cells[2]?.text.trim());
    if (String(cells[2]).includes("negative") && percentChange > 0) percentChange = -percentChange;
    let absoluteChange = parseNumber(cells[3]?.text.trim());
    if (String(cells[3]).includes("negative") && absoluteChange > 0) absoluteChange = -absoluteChange;

    const usable = category === "freight" ? price >= 0 : price > 0;
    if (!usable) continue;

    commodities.push({
      symbol,
      name,
      price,
      currency: "USD",
      percentChange,
      absoluteChange,
      high: parseNumber(cells[4]?.text.trim()),
      low: parseNumber(cells[5]?.text.trim()),
      technicalEvaluation: cells[6]?.text.trim() || "Neutral",
      type: "other",
      category,
    });
  }
  return commodities;
}

export function parseBunkerHtml(html) {
  const root = parse(html || "");
  const commodities = [];
  const typeCycle = ["vlsfo", "mgo", "ifo380"];
  const units = root.querySelectorAll("a.unit");

  units.forEach((u, i) => {
    const name = (u.querySelector(".name")?.text || "").trim();
    const priceEl = u.querySelector(".price");
    const raw = priceEl?.innerHTML || "";
    const m = raw.match(/^([\d.,]+)/);
    const price = m ? parseFloat(m[1]) : parseNumber(priceEl?.text);
    const chg = parseNumber(u.querySelector(".change")?.text);
    const type = typeCycle[Math.floor(i / 8)] || "vlsfo";
    if (!(price > 0) || !name) return;
    commodities.push({
      symbol: `${type.toUpperCase()}-${name.replace(/\s+/g, "-").toUpperCase().slice(0, 24)}`,
      name: `${type.toUpperCase()} ${name}`,
      price,
      currency: "USD",
      percentChange: 0,
      absoluteChange: chg,
      high: price,
      low: price,
      technicalEvaluation: "Neutral",
      type,
      category: "bunker",
    });
  });
  return commodities;
}

export async function upsertCommodityCache(category, payload, ttlMs = COMMODITY_CACHE_TTL_MS) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { ok: false, error: "empty payload" };
  }
  const now = new Date();
  const supabase = getSupabase();
  const { error } = await supabase.from("commodity_market_cache").upsert(
    {
      category,
      payload,
      item_count: payload.length,
      scraped_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlMs).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "category" },
  );
  if (error) return { ok: false, error: error.message, count: payload.length };
  return { ok: true, count: payload.length };
}

export function appBaseUrl(req) {
  const proto = req?.headers?.["x-forwarded-proto"] || "https";
  const host =
    req?.headers?.["x-forwarded-host"] ||
    req?.headers?.host ||
    process.env.VERCEL_URL ||
    "www.commohedge.com";
  if (process.env.COMMODITY_SCRAPE_BASE_URL) return process.env.COMMODITY_SCRAPE_BASE_URL.replace(/\/$/, "");
  if (String(host).includes("localhost")) return "https://www.commohedge.com";
  return `${proto}://${host}`.replace(/\/$/, "");
}
