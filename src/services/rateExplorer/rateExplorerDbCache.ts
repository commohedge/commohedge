/**
 * Shared Rate Explorer cache in Supabase (main app project).
 * One row per cache_key — UPSERT overwrites payload (no history growth).
 *
 * Keys:
 *   rates:{indexId}           e.g. rates:sofr
 *   irs:{CURRENCY}            e.g. irs:USD
 *   bonds:countries
 *   bonds:country:{slug}      e.g. bonds:country:united-states
 */
import { supabase } from "@/lib/supabase";

export type RateExplorerCacheKind = "rates" | "irs" | "bonds";

/** Freshness window — morning cron (~07:00 CET) refreshes; 26h covers DST drift. */
export const RATE_EXPLORER_DB_TTL_MS = 26 * 60 * 60 * 1000;

export function ratesCacheKey(indexId: string): string {
  return `rates:${indexId.toLowerCase()}`;
}

export function irsCacheKey(currency: string): string {
  return `irs:${currency.toUpperCase()}`;
}

export function bondsCountriesCacheKey(): string {
  return "bonds:countries";
}

export function bondsCountryCacheKey(countrySlug: string): string {
  return `bonds:country:${countrySlug.toLowerCase()}`;
}

type DbRow = {
  cache_key: string;
  kind: RateExplorerCacheKind;
  payload: unknown;
  meta: Record<string, unknown> | null;
  item_count: number;
  scraped_at: string;
  expires_at: string;
};

function payloadLength(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") return 1;
  return 0;
}

function isUsablePayload(payload: unknown): boolean {
  return payloadLength(payload) > 0;
}

/**
 * Read shared cache. Returns null if missing, expired, empty, or table unavailable.
 * allowStale: return expired rows (better than empty when scrape fails).
 */
export async function readRateExplorerFromDb(
  cacheKey: string,
  options?: { allowStale?: boolean },
): Promise<{ payload: unknown; meta: Record<string, unknown>; scrapedAt: string; stale: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from("rate_explorer_cache")
      .select("cache_key, kind, payload, meta, item_count, scraped_at, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error) {
      console.warn(`[rate-db-cache] read ${cacheKey}:`, error.message);
      return null;
    }
    if (!data) return null;

    const row = data as DbRow;
    if (!isUsablePayload(row.payload)) {
      console.warn(`[rate-db-cache] unusable payload for ${cacheKey}`);
      return null;
    }

    const expiresAt = new Date(row.expires_at).getTime();
    const stale = !Number.isFinite(expiresAt) || Date.now() > expiresAt;
    if (stale && !options?.allowStale) {
      console.log(`[rate-db-cache] expired for ${cacheKey}`);
      return null;
    }

    console.log(
      `[rate-db-cache] HIT ${cacheKey}: ${payloadLength(row.payload)} items (scraped ${row.scraped_at}${stale ? ", stale" : ""})`,
    );
    return {
      payload: row.payload,
      meta: (row.meta || {}) as Record<string, unknown>,
      scrapedAt: row.scraped_at,
      stale,
    };
  } catch (e) {
    console.warn(`[rate-db-cache] read failed ${cacheKey}:`, e);
    return null;
  }
}

/**
 * Overwrite the single row for this key (no append / no history).
 */
export async function writeRateExplorerToDb(
  cacheKey: string,
  kind: RateExplorerCacheKind,
  payload: unknown,
  meta: Record<string, unknown> = {},
  ttlMs: number = RATE_EXPLORER_DB_TTL_MS,
): Promise<boolean> {
  if (!isUsablePayload(payload)) {
    console.warn(`[rate-db-cache] skip write empty/invalid ${cacheKey}`);
    return false;
  }

  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);

  try {
    const { error } = await supabase.from("rate_explorer_cache").upsert(
      {
        cache_key: cacheKey,
        kind,
        payload,
        meta,
        item_count: payloadLength(payload),
        scraped_at: now.toISOString(),
        expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "cache_key" },
    );

    if (error) {
      console.warn(`[rate-db-cache] upsert ${cacheKey}:`, error.message);
      return false;
    }

    console.log(
      `[rate-db-cache] UPSERT ${cacheKey}: ${payloadLength(payload)} items (expires ${expires.toISOString()})`,
    );
    return true;
  } catch (e) {
    console.warn(`[rate-db-cache] write failed ${cacheKey}:`, e);
    return false;
  }
}
