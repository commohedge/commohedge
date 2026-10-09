/**
 * One-shot: scrape TradingView (prod API) + Ship&Bunker, UPSERT into commodity_market_cache.
 * Run: node scripts/seed-commodity-cache.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { parse } from "node-html-parser";

const BASE = "https://www.commohedge.com";
const SUPABASE_URL = "https://iflnsckduohrcafafcpj.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_1wxQlJYrs4cqXinMMohHtw_KIsybCpJ";

const TTL_MS = 60 * 60 * 1000; // 1 hour — matches hourly Vercel cron
const CATEGORIES = ["energy", "metals", "agricultural", "freight"];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function parseNumber(text) {
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

function parseTradingViewHtml(html, category) {
  const root = parse(html);
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

async function fetchCategory(category) {
  const res = await fetch(`${BASE}/api/tradingview/${category}`, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`tradingview/${category} HTTP ${res.status}`);
  const json = await res.json();
  return parseTradingViewHtml(json.data, category);
}

async function fetchBunker() {
  const res = await fetch(`${BASE}/api/shipandbunker`, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`shipandbunker HTTP ${res.status}`);
  const json = await res.json();
  const html = json.data || "";
  const root = parse(html);
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

async function fetchFreightSymbols() {
  const symbols = [
    { symbol: "CS41!", name: "Container Freight China to N Europe (Baltic)", type: "container" },
    { symbol: "CS11!", name: "Container Freight China to USWC (Baltic)", type: "container" },
    { symbol: "TM1!", name: "Freight Route TC2 (Baltic)", type: "freight_route" },
    { symbol: "TL1!", name: "Freight Route TD3C (Baltic)", type: "freight_route" },
  ];
  const out = [];
  for (const s of symbols) {
    try {
      const res = await fetch(`${BASE}/api/tradingview/symbol/${encodeURIComponent(s.symbol)}`, {
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        console.warn(`symbol ${s.symbol} HTTP ${res.status}`);
        continue;
      }
      const j = await res.json();
      const html = j.data || "";
      const priceMatch =
        html.match(/data-field=["']last["'][^>]*>?\s*([\d.,]+)/i) ||
        html.match(/"last"\s*:\s*([\d.]+)/) ||
        html.match(/js-symbol-last[^>]*>\s*([\d.,]+)/i);
      const price = priceMatch ? parseNumber(priceMatch[1]) : 0;
      if (!(price >= 0) || !priceMatch) {
        console.warn(`no price for ${s.symbol}`);
        continue;
      }
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
      console.log(`  freight ${s.symbol} = ${price}`);
    } catch (e) {
      console.warn(s.symbol, e.message || e);
    }
  }
  return out;
}

async function upsert(category, payload) {
  if (!payload.length) {
    console.warn(`skip empty ${category}`);
    return false;
  }
  const now = new Date();
  const { error } = await supabase.from("commodity_market_cache").upsert(
    {
      category,
      payload,
      item_count: payload.length,
      scraped_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "category" },
  );
  if (error) {
    console.error(`UPSERT ${category} FAILED:`, error.message);
    return false;
  }
  console.log(`UPSERT ${category}: ${payload.length} items`);
  return true;
}

async function main() {
  const only = process.argv[2]; // optional: energy|metals|agricultural|freight|bunker
  const runAll = !only;

  if (runAll || CATEGORIES.includes(only)) {
    for (const category of CATEGORIES) {
      if (only && category !== only) continue;
      try {
        console.log(`Fetching ${category}...`);
        const rows = await fetchCategory(category);
        console.log(`  parsed ${rows.length}`);
        await upsert(category, rows);
      } catch (e) {
        console.error(`${category}:`, e.message || e);
      }
    }
  }

  if (runAll || only === "freight") {
    try {
      console.log("Fetching freight symbols...");
      const freight = await fetchFreightSymbols();
      console.log(`  parsed ${freight.length}`);
      await upsert("freight", freight);
    } catch (e) {
      console.error("freight:", e.message || e);
    }
  }

  if (runAll || only === "bunker") {
    try {
      console.log("Fetching bunker...");
      const bunker = await fetchBunker();
      console.log(`  parsed ${bunker.length}`);
      await upsert("bunker", bunker);
    } catch (e) {
      console.error("bunker:", e.message || e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
