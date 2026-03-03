/**
 * Solid cache for Ticker Peek Pro: reduces scraping and keeps the app responsive.
 * - TTL varies by data type (short for instrument lists, longer for IV surface).
 * - Size limit + LRU eviction (oldest entries removed).
 * - sessionStorage persistence (survives refresh; shorter TTL for reloaded entries).
 */

const MS = 1000;
const MIN = 60 * MS;

/** TTL by data type (ms). Heavy data (IV surface) cached longer. */
export const CACHE_TTL = {
  /** Instrument lists by category — 10 min */
  CURRENCIES: 10 * MIN,
  /** Futures contracts by symbol — 15 min */
  FUTURES: 15 * MIN,
  /** Futures curve (DTE/price points) derived from contracts — 15 min */
  FUTURES_CURVE: 15 * MIN,
  /** Options by symbol/maturity — 12 min */
  OPTIONS: 12 * MIN,
  /** Vol & Greeks — 15 min */
  VOLATILITY: 15 * MIN,
  /** Strike list for surface — 20 min */
  VOL_SURFACE_STRIKES: 20 * MIN,
  /** Full IV surface (heavy scraping) — 45 min */
  VOL_SURFACE: 45 * MIN,
  /** IV matrix (same source as vol surface) — 45 min */
  IVMATRIX: 45 * MIN,
  /** Default for unknown prefix — 10 min */
  DEFAULT: 10 * MIN,
} as const;

/** TTL for entries reloaded from sessionStorage after refresh (shorter). */
const PERSISTED_TTL = 5 * MIN;

/** Max in-memory entries; beyond that, LRU eviction. */
const MAX_CACHE_SIZE = 180;

const SESSION_PREFIX = "tickerpeek_";

type CacheEntry<T = unknown> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

/** Returns recommended TTL (ms) from key prefix. */
export function getTTLForKey(key: string): number {
  if (key.startsWith("commodities:")) return CACHE_TTL.CURRENCIES;
  if (key.startsWith("futures:")) return CACHE_TTL.FUTURES;
  if (key.startsWith("futures_curve:")) return CACHE_TTL.FUTURES_CURVE;
  if (key.startsWith("options:")) return CACHE_TTL.OPTIONS;
  if (key.startsWith("volatility:")) return CACHE_TTL.VOLATILITY;
  if (key.startsWith("volsurface-strikes:")) return CACHE_TTL.VOL_SURFACE_STRIKES;
  if (key.startsWith("volsurface:")) return CACHE_TTL.VOL_SURFACE;
  if (key.startsWith("ivmatrix:")) return CACHE_TTL.IVMATRIX;
  return CACHE_TTL.DEFAULT;
}

function evictOldest(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const toRemove = cache.size - Math.floor(MAX_CACHE_SIZE * 0.75);
  const entries = Array.from(cache.entries())
    .map(([k, v]) => [k, v.timestamp] as const)
    .sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    cache.delete(entries[i][0]);
    try {
      sessionStorage.removeItem(SESSION_PREFIX + entries[i][0]);
    } catch {
      // ignore
    }
  }
}

function readFromSession<T>(key: string, ttl: number): T | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    const age = Date.now() - parsed.timestamp;
    if (age > Math.min(ttl, PERSISTED_TTL)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeToSession(key: string, entry: CacheEntry): void {
  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length > 2 * 1024 * 1024) return; // skip entries > 2MB
    sessionStorage.setItem(SESSION_PREFIX + key, serialized);
  } catch {
    // QuotaExceeded or parse error — ignore
  }
}

/**
 * Get a cached entry.
 * @param key Key (e.g. commodities:energies, futures:GC)
 * @param ttl Optional. If omitted, TTL inferred from key prefix.
 */
export function getCached<T>(key: string, ttl?: number): T | null {
  const effectiveTtl = ttl ?? getTTLForKey(key);
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry) {
    if (Date.now() - entry.timestamp > effectiveTtl) {
      cache.delete(key);
      try {
        sessionStorage.removeItem(SESSION_PREFIX + key);
      } catch {
        // ignore
      }
      return null;
    }
    return entry.data;
  }
  const fromSession = readFromSession<T>(key, effectiveTtl);
  if (fromSession !== null) {
    cache.set(key, { data: fromSession, timestamp: Date.now() });
    return fromSession;
  }
  return null;
}

/**
 * Store an entry in cache (memory + sessionStorage when possible).
 * Triggers LRU eviction if size exceeds MAX_CACHE_SIZE.
 */
export function setCache<T>(key: string, data: T): void {
  evictOldest();
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  cache.set(key, entry);
  writeToSession(key, entry);
}

/**
 * Clear cache (memory and sessionStorage for Ticker Peek Pro keys).
 * @param keyPrefix If provided, only removes keys starting with this prefix.
 */
export function clearCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(SESSION_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // ignore
    }
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key);
      try {
        sessionStorage.removeItem(SESSION_PREFIX + key);
      } catch {
        // ignore
      }
    }
  }
}

/** Number of in-memory entries (debug). */
export function getCacheSize(): number {
  return cache.size;
}

/** List of key prefixes currently in cache (debug). */
export function getCacheKeyPrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const key of cache.keys()) {
    const idx = key.indexOf(":");
    if (idx > 0) prefixes.add(key.slice(0, idx + 1));
    else prefixes.add(key);
  }
  return Array.from(prefixes);
}
