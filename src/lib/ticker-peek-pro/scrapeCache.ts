/**
 * Cache solide pour Ticker Peek Pro : réduit le scraping et rend l'app plus fluide.
 * - TTL différenciés par type de données (liste instruments court, surface IV longue).
 * - Limite de taille + éviction LRU (entrées les plus anciennes supprimées).
 * - Persistance sessionStorage (survit au refresh, TTL réduit pour les entrées rechargées).
 */

const MS = 1000;
const MIN = 60 * MS;

/** TTL par type de données (en ms). Données lourdes (surface IV) cachées plus longtemps. */
export const CACHE_TTL = {
  /** Listes instruments par catégorie — 10 min */
  CURRENCIES: 10 * MIN,
  /** Contrats futures par symbole — 15 min */
  FUTURES: 15 * MIN,
  /** Options par symbole/maturité — 12 min */
  OPTIONS: 12 * MIN,
  /** Vol & Greeks — 15 min */
  VOLATILITY: 15 * MIN,
  /** Liste des strikes pour la surface — 20 min */
  VOL_SURFACE_STRIKES: 20 * MIN,
  /** Surface IV complète (scraping lourd) — 45 min */
  VOL_SURFACE: 45 * MIN,
  /** Matrice IV (même source que vol surface) — 45 min */
  IVMATRIX: 45 * MIN,
  /** Défaut si préfixe inconnu — 10 min */
  DEFAULT: 10 * MIN,
} as const;

/** TTL pour les entrées rechargées depuis sessionStorage après un refresh (plus court). */
const PERSISTED_TTL = 5 * MIN;

/** Nombre max d'entrées en mémoire ; au-delà, éviction LRU. */
const MAX_CACHE_SIZE = 180;

const SESSION_PREFIX = "tickerpeek_";

type CacheEntry<T = unknown> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

/** Retourne le TTL recommandé (ms) selon le préfixe de la clé. */
export function getTTLForKey(key: string): number {
  if (key.startsWith("commodities:")) return CACHE_TTL.CURRENCIES;
  if (key.startsWith("futures:")) return CACHE_TTL.FUTURES;
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
 * Récupère une entrée en cache.
 * @param key Clé (ex: commodities:currencies, futures:GC)
 * @param ttl Optionnel. Si absent, TTL déduit du préfixe de la clé.
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
 * Met une entrée en cache (mémoire + sessionStorage si possible).
 * Déclenche une éviction LRU si la taille dépasse MAX_CACHE_SIZE.
 */
export function setCache<T>(key: string, data: T): void {
  evictOldest();
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  cache.set(key, entry);
  writeToSession(key, entry);
}

/**
 * Vide le cache (mémoire et sessionStorage pour les clés Ticker Peek Pro).
 * @param keyPrefix Si fourni, ne supprime que les clés commençant par ce préfixe.
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

/** Nombre d'entrées en mémoire (debug). */
export function getCacheSize(): number {
  return cache.size;
}

/** Liste des préfixes de clés actuellement en cache (debug). */
export function getCacheKeyPrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const key of cache.keys()) {
    const idx = key.indexOf(":");
    if (idx > 0) prefixes.add(key.slice(0, idx + 1));
    else prefixes.add(key);
  }
  return Array.from(prefixes);
}
