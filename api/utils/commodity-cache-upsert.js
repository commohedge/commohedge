/**
 * Shared parse + Supabase UPSERT helpers for commodity_market_cache.
 * Used by the hourly cron and seed scripts.
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

/** Same list as src/services/commodityApi.ts — used to filter quotes-freight. */
export const FREIGHT_SYMBOLS = [
  { symbol: "CS61!", name: "Container Freight (China/East Asia to Mediterranean) (FBX13) (Baltic) Futures", type: "container" },
  { symbol: "CS31!", name: "Container Freight (China/East Asia to US East Coast) (FBX03) (Baltic) Futures", type: "container" },
  { symbol: "CS51!", name: "Container Freight (North Europe to China/East Asia) (FBX12) (Baltic) Futures", type: "container" },
  { symbol: "CS11!", name: "Container Freight (China/East Asia to US West Coast) (FBX01) (Baltic) Futures", type: "container" },
  { symbol: "CS21!", name: "Container Freight (US West Coast to China/East Asia) (FBX02) (Baltic) Futures", type: "container" },
  { symbol: "CS41!", name: "Container Freight (China/East Asia to North Europe) (FBX11) (Baltic) Futures", type: "container" },
  { symbol: "TM1!", name: "Freight Route TC2 (Baltic) Futures", type: "freight_route" },
  { symbol: "TD81!", name: "Freight Route TD8 (Baltic) Futures", type: "freight_route" },
  { symbol: "TC71!", name: "Freight Route TC7 (Baltic) Futures", type: "freight_route" },
  { symbol: "TC61!", name: "Freight Route TC6 (Baltic) Futures", type: "freight_route" },
  { symbol: "TH1!", name: "Freight Route TC5 (Platts) Futures", type: "freight_route" },
  { symbol: "TK1!", name: "Freight Route TD7 (Baltic) Futures", type: "freight_route" },
  { symbol: "TL1!", name: "Freight Route TD3C (Baltic) Futures", type: "freight_route" },
  { symbol: "AEB1!", name: "Freight Route TD25 (Baltic) Futures", type: "freight_route" },
  { symbol: "T2D1!", name: "Freight Route TD20 (Baltic) Futures", type: "freight_route" },
  { symbol: "T7C1!", name: "Freight Route TC17 (Baltic) Futures", type: "freight_route" },
  { symbol: "TD31!", name: "Freight Route TD3C (Platts) Futures", type: "freight_route" },
  { symbol: "TDM1!", name: "Freight Route TD19 (Baltic) Futures", type: "freight_route" },
  { symbol: "FRS1!", name: "Freight Route TC12 (Baltic) Futures", type: "freight_route" },
  { symbol: "T5C1!", name: "Freight Route TC15 (Baltic) Futures", type: "freight_route" },
  { symbol: "ACB1!", name: "Freight Route TD22 (Baltic) Futures", type: "freight_route" },
  { symbol: "FRC1!", name: "Freight Route TC14 (Baltic) Futures", type: "freight_route" },
  { symbol: "T8C1!", name: "Freight Route TC18 (Baltic) Futures", type: "freight_route" },
  { symbol: "TC11!", name: "Freight Route South Korea to Singapore (TC11) (Baltic) Futures", type: "freight_route" },
  { symbol: "TF21!", name: "Freight Route Middle East to UK Continent (TC20) (Baltic) Futures", type: "freight_route" },
  { symbol: "BG11!", name: "LNG Freight Australia to Japan (BLNG1-174)", type: "lng_freight" },
  { symbol: "BG31!", name: "LNG Freight US Gulf to Japan (BLNG3-174)", type: "lng_freight" },
  { symbol: "BG21!", name: "LNG Freight US Gulf to Continent (BLNG2-174)", type: "lng_freight" },
  { symbol: "BL11!", name: "LNG Freight Route BLNG1g (LNG Fuel) (Baltic) Futures", type: "lng_freight" },
  { symbol: "BL21!", name: "LNG Freight Route BLNG2g (LNG Fuel) (Baltic) Futures", type: "lng_freight" },
  { symbol: "BL31!", name: "LNG Freight Route BLNG3g (LNG Fuel) (Baltic) Futures", type: "lng_freight" },
  { symbol: "USC1!", name: "USGC to China (Platts) Dirty Freight Futures", type: "dirty_freight" },
  { symbol: "USE1!", name: "USGC to UK Continent (Platts) Dirty Freight Futures", type: "dirty_freight" },
  { symbol: "XUK1!", name: "Cross North Sea Dirty Freight 80kt (Platts) Futures", type: "dirty_freight" },
  { symbol: "FLJ1!", name: "Freight Route Liquid Petroleum Gas (BLPG3) (Baltic) Futures", type: "lng_freight" },
  { symbol: "FLP1!", name: "Freight Route Liquid Petroleum Gas (BLPG1) (Baltic) Futures", type: "lng_freight" },
];

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

/**
 * Keep freight rows that match the known Baltic/container list (same filter as UI).
 */
export function filterFreightCommodities(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const known = new Map(FREIGHT_SYMBOLS.map((s) => [s.symbol.replace("!", ""), s]));
  const out = [];
  const seen = new Set();

  for (const c of rows) {
    const symbolBase = String(c.symbol || "")
      .replace("!", "")
      .replace(/^NYMEX:/i, "");
    const nameLower = String(c.name || "").toLowerCase();
    const meta = known.get(symbolBase);
    const matches =
      !!meta ||
      /^(CS|TM|TD|TC|TH|TK|TL|BG|BL|USC|USE|XUK|FLJ|FLP|AEB|T2D|T7C|TDM|FRS|T5C|ACB|FRC|T8C|TF2)/i.test(
        symbolBase,
      ) ||
      nameLower.includes("freight") ||
      nameLower.includes("container") ||
      nameLower.includes("baltic");

    if (!matches) continue;
    const symbol = meta?.symbol || (String(c.symbol).endsWith("!") ? c.symbol : `${symbolBase}!`);
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      ...c,
      symbol,
      name: meta?.name || c.name,
      type: meta?.type || c.type || "other",
      category: "freight",
      currency: "USD",
    });
  }
  return out;
}

/**
 * Fetch all freight quotes in one TradingView scanner call (quotes-freight page is 404).
 */
export async function fetchFreightFromScanner(symbols = FREIGHT_SYMBOLS) {
  const metaBySymbol = new Map(symbols.map((s) => [s.symbol, s]));
  const tickers = symbols.map((s) => `NYMEX:${s.symbol}`);
  const body = {
    symbols: { tickers, query: { types: [] } },
    columns: ["name", "close", "change", "change_abs", "high", "low", "description"],
  };
  const res = await fetch("https://scanner.tradingview.com/futures/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; CommoHedgeCache/1.0)",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`TradingView scanner HTTP ${res.status}`);
  const json = await res.json();
  const out = [];
  for (const row of json.data || []) {
    const symbol = String(row.s || "").replace(/^NYMEX:/i, "");
    const d = row.d || [];
    const price = Number(d[1]);
    if (!(price >= 0) || Number.isNaN(price)) continue;
    const meta = metaBySymbol.get(symbol);
    const pct = Number(d[2]) || 0;
    const abs = Number(d[3]) || 0;
    out.push({
      symbol,
      name: meta?.name || d[6] || d[0] || symbol,
      price,
      currency: "USD",
      percentChange: pct,
      absoluteChange: abs,
      high: Number(d[4]) || price,
      low: Number(d[5]) || price,
      technicalEvaluation: abs >= 0 ? "Positive" : "Negative",
      type: meta?.type || "other",
      category: "freight",
    });
  }
  return out;
}

function createBunkerCommodity(symbol, name, type, price, absoluteChange = 0, percentChange = 0, high = 0, low = 0) {
  const isGibraltar = symbol.includes("Gibraltar");
  return {
    symbol,
    name,
    price,
    currency: "USD",
    percentChange,
    absoluteChange,
    high: high > 0 ? high : isGibraltar ? 0 : price * 1.05,
    low: low > 0 ? low : isGibraltar ? 0 : price * 0.95,
    technicalEvaluation: absoluteChange >= 0 ? "Positive" : "Negative",
    type,
    category: "bunker",
  };
}

/** Parse cells like "$1,019.50 +17.50" or "819.50 ▼ 1.50". */
function parseBunkerPriceCell(text) {
  if (!text) return null;
  const t = String(text).replace(/[▼▲]/g, " ").replace(/—/g, " ").trim();
  if (!t || t === "-" || t.toLowerCase().includes("login")) return null;
  const m = t.match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const price = parseNumber(m[1]);
  if (!(price > 0)) return null;
  const rest = t.slice((m.index || 0) + m[0].length);
  const cm = rest.match(/([+-]\s*[\d,.]+)/);
  const change = cm ? parseNumber(cm[1]) : 0;
  return { price, change };
}

function safePortKey(portName) {
  return portName.replace(/\s+/g, "_").replace(/[^\w./-]/g, "").slice(0, 40);
}

/**
 * Parse Ship&Bunker prices page.
 * Current layout: Port | VLSFO | IFO380 (HSFO) | MGO  (one row → 3 commodities).
 */
export function parseBunkerHtml(html) {
  const root = parse(html || "");
  const commodities = [];
  const seen = new Set();

  const push = (c) => {
    if (!c || !(c.price > 0) || seen.has(c.symbol)) return;
    seen.add(c.symbol);
    commodities.push(c);
  };

  const table =
    root.querySelector("table.prices-table") ||
    root.querySelector("table[class*='price']") ||
    root.querySelector("table");

  if (table) {
    const rows = table.querySelectorAll("tr");
    let colMap = { vlsfo: 1, ifo380: 2, mgo: 3 };

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td, th");
      if (!cells || cells.length < 4) return;
      const headers = cells.map((c) => (c.text || "").trim().toUpperCase());
      if (headers[0].includes("PORT")) {
        headers.forEach((h, i) => {
          if (h.includes("VLSFO")) colMap.vlsfo = i;
          else if (h.includes("IFO380") || h.includes("HSFO")) colMap.ifo380 = i;
          else if (h.includes("MGO")) colMap.mgo = i;
        });
        return;
      }

      const portName = (cells[0]?.text || "").trim().replace(/\s+/g, " ");
      if (!portName || portName.toLowerCase().includes("login")) return;

      const specs = [
        { key: "vlsfo", type: "vlsfo", name: "VLSFO" },
        { key: "ifo380", type: "ifo380", name: "IFO380" },
        { key: "mgo", type: "mgo", name: "MGO" },
      ];
      for (const s of specs) {
        const idx = colMap[s.key];
        const parsed = parseBunkerPriceCell(cells[idx]?.text);
        if (!parsed) continue;
        const portKey = safePortKey(portName);
        push(
          createBunkerCommodity(
            `${s.name}_${portKey}`,
            `${s.name} - ${portName}`,
            s.type,
            parsed.price,
            parsed.change,
          ),
        );
      }
    });
  }

  // Legacy widget cards (older Ship&Bunker markup)
  const typeCycle = ["vlsfo", "mgo", "ifo380"];
  const units = root.querySelectorAll("a.unit");
  units.forEach((u, i) => {
    const name = (u.querySelector(".name")?.text || "").trim();
    const priceEl = u.querySelector(".price");
    const raw = priceEl?.innerHTML || "";
    const m = raw.match(/([\d,]+(?:\.\d+)?)/);
    const price = m ? parseNumber(m[1]) : parseNumber(priceEl?.text);
    const chg = parseNumber(u.querySelector(".change")?.text);
    const type = typeCycle[Math.floor(i / 8)] || "vlsfo";
    if (!(price > 0) || !name) return;
    push(
      createBunkerCommodity(
        `${type.toUpperCase()}_${safePortKey(name)}`,
        `${type.toUpperCase()} - ${name}`,
        type,
        price,
        chg,
      ),
    );
  });

  return commodities;
}

/**
 * Gibraltar VLSFO / MGO / IFO380 from EMEA page (cols: Port, VLSFO, MGO, IFO380).
 */
export function parseGibraltarBunkerHtml(html) {
  const root = parse(html || "");
  const commodities = [];
  const rows = root.querySelectorAll("tr").filter((row) => (row.text || "").toLowerCase().includes("gibraltar"));

  for (const row of rows) {
    const cells = row.querySelectorAll("td, th");
    if (!cells || cells.length < 4) continue;
    const portName = (cells[0]?.text || "").trim();
    if (!portName.toLowerCase().includes("gibraltar")) continue;

    const specs = [
      { idx: 1, type: "vlsfo", name: "VLSFO", symbol: "VLSFO_Gibraltar" },
      { idx: 2, type: "mgo", name: "MGO", symbol: "MGO_Gibraltar" },
      { idx: 3, type: "ifo380", name: "IFO380", symbol: "IFO380_Gibraltar" },
    ];
    for (const s of specs) {
      const parsed = parseBunkerPriceCell(cells[s.idx]?.text);
      if (!parsed) continue;
      commodities.push(
        createBunkerCommodity(s.symbol, `${s.name} - Gibraltar`, s.type, parsed.price, parsed.change),
      );
    }
  }
  return commodities;
}

/** Merge bunker arrays, prefer first occurrence of each symbol. */
export function mergeBunkerCommodities(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const c of list) {
      if (!c?.symbol || !(c.price > 0) || seen.has(c.symbol)) continue;
      seen.add(c.symbol);
      out.push(c);
    }
  }
  return out;
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
