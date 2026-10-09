/**
 * Shared Commodity Market cache in Supabase (main app project).
 * One row per category — UPSERT overwrites payload (no history growth).
 */
import { supabase } from "@/lib/supabase";

export type CommodityMarketCategory =
  | "metals"
  | "agricultural"
  | "energy"
  | "freight"
  | "bunker";

/** Server-side freshness window — hourly cron refreshes Supabase snapshots. */
export const COMMODITY_DB_TTL_MS = 60 * 60 * 1000;

type DbRow = {
  category: CommodityMarketCategory;
  payload: unknown[];
  item_count: number;
  scraped_at: string;
  expires_at: string;
  updated_at?: string;
};

function isUsablePayload(category: CommodityMarketCategory, data: unknown): data is unknown[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.some((item: any) => {
    const price = typeof item?.price === "number" ? item.price : Number(item?.price);
    if (!Number.isFinite(price)) return false;
    if (category === "freight") return price >= 0;
    return price > 0;
  });
}

/**
 * Read shared cache. Returns null if missing, expired, empty, or table unavailable.
 */
export async function readCommodityMarketFromDb(
  category: CommodityMarketCategory,
): Promise<{ data: unknown[]; scrapedAt: string } | null> {
  try {
    const { data, error } = await supabase
      .from("commodity_market_cache")
      .select("category, payload, item_count, scraped_at, expires_at")
      .eq("category", category)
      .maybeSingle();

    if (error) {
      // Table missing / RLS / network — fail soft to scrape path
      console.warn(`[commodity-db-cache] read ${category}:`, error.message);
      return null;
    }
    if (!data) return null;

    const row = data as DbRow;
    const expiresAt = new Date(row.expires_at).getTime();
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      console.log(`[commodity-db-cache] expired for ${category}`);
      return null;
    }
    if (!isUsablePayload(category, row.payload)) {
      console.warn(`[commodity-db-cache] unusable payload for ${category}`);
      return null;
    }

    console.log(
      `[commodity-db-cache] HIT ${category}: ${row.payload.length} items (scraped ${row.scraped_at})`,
    );
    return { data: row.payload, scrapedAt: row.scraped_at };
  } catch (e) {
    console.warn(`[commodity-db-cache] read failed ${category}:`, e);
    return null;
  }
}

const ALL_CATEGORIES: CommodityMarketCategory[] = [
  "metals",
  "agricultural",
  "energy",
  "freight",
  "bunker",
];

/**
 * Batch-read all categories (one round-trip). Used by landing / multi-panel UIs.
 * - allowStale: if true, return expired rows too (better than empty placeholders).
 */
export async function readAllCommodityMarketFromDb(options?: {
  allowStale?: boolean;
  /** Limit categories (e.g. landing ticker only needs 4). */
  categories?: CommodityMarketCategory[];
}): Promise<Partial<Record<CommodityMarketCategory, { data: unknown[]; scrapedAt: string; stale: boolean }>>> {
  const allowStale = options?.allowStale ?? false;
  const categories = options?.categories?.length ? options.categories : ALL_CATEGORIES;
  const out: Partial<
    Record<CommodityMarketCategory, { data: unknown[]; scrapedAt: string; stale: boolean }>
  > = {};

  try {
    const { data, error } = await supabase
      .from("commodity_market_cache")
      .select("category, payload, scraped_at, expires_at")
      .in("category", categories);

    if (error) {
      console.warn("[commodity-db-cache] batch read:", error.message);
      return out;
    }

    const now = Date.now();
    for (const raw of data || []) {
      const row = raw as DbRow;
      const category = row.category;
      if (!ALL_CATEGORIES.includes(category)) continue;
      if (!isUsablePayload(category, row.payload)) continue;

      const expiresAt = new Date(row.expires_at).getTime();
      const stale = !Number.isFinite(expiresAt) || now > expiresAt;
      if (stale && !allowStale) continue;

      out[category] = {
        data: row.payload,
        scrapedAt: row.scraped_at,
        stale,
      };
    }

    console.log(
      `[commodity-db-cache] batch HIT categories=[${Object.keys(out).join(", ")}] allowStale=${allowStale}`,
    );
    return out;
  } catch (e) {
    console.warn("[commodity-db-cache] batch read failed:", e);
    return out;
  }
}

/**
 * Overwrite the single row for this category (no append / no history).
 */
export async function writeCommodityMarketToDb(
  category: CommodityMarketCategory,
  commodities: unknown[],
  ttlMs: number = COMMODITY_DB_TTL_MS,
): Promise<boolean> {
  if (!isUsablePayload(category, commodities)) {
    console.warn(`[commodity-db-cache] skip write empty/invalid ${category}`);
    return false;
  }

  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);

  try {
    const { error } = await supabase.from("commodity_market_cache").upsert(
      {
        category,
        payload: commodities,
        item_count: commodities.length,
        scraped_at: now.toISOString(),
        expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "category" },
    );

    if (error) {
      console.warn(`[commodity-db-cache] upsert ${category}:`, error.message);
      return false;
    }

    console.log(
      `[commodity-db-cache] UPSERT ${category}: ${commodities.length} items (expires ${expires.toISOString()})`,
    );
    return true;
  } catch (e) {
    console.warn(`[commodity-db-cache] write failed ${category}:`, e);
    return false;
  }
}
