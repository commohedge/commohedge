# Propositions d'optimisation du système de scraping

## 📊 Analyse des points d'amélioration

### 1. ⚡ PERFORMANCE

#### A. Cache intelligent avec durées variables
**Problème actuel:**
- Durée fixe de 24h pour toutes les catégories
- Les données financières devraient être rafraîchies plus fréquemment
- WTI et GOLD peuvent changer significativement en 24h

**Solution proposée:**
```typescript
const CACHE_DURATIONS = {
  metals: 1 * 60 * 60 * 1000,        // 1 heure (or, argent volatiles)
  energy: 30 * 60 * 1000,            // 30 minutes (pétrole très volatile)
  agricultural: 4 * 60 * 60 * 1000,  // 4 heures (moins volatile)
  freight: 12 * 60 * 60 * 1000,      // 12 heures (changements lents)
  bunker: 6 * 60 * 60 * 1000         // 6 heures (marché quotidien)
};
```

**Bénéfices:**
- Données plus récentes pour les commodities volatiles
- Réduction des requêtes inutiles pour données stables
- Amélioration de l'expérience utilisateur

#### B. Optimisation du batching pour Freight
**Problème actuel:**
- 29 symboles × ~6s chacun = ~174s total
- Batch size fixe de 5
- Delay fixe de 1s entre batches

**Solution proposée:**
```typescript
// Batch adaptatif selon la performance
let batchSize = 5;
const adaptiveBatching = async (symbols) => {
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const startTime = Date.now();
    
    await Promise.allSettled(batch.map(...));
    
    const duration = Date.now() - startTime;
    
    // Ajuster batch size selon performance
    if (duration < 3000 && batchSize < 10) {
      batchSize++; // Augmenter si rapide
    } else if (duration > 8000 && batchSize > 3) {
      batchSize--; // Réduire si lent
    }
  }
};
```

**Bénéfices:**
- Réduction du temps total de scraping
- Adaptation automatique aux performances réseau
- Meilleure utilisation des ressources

#### C. Préchargement et cache warming
**Problème actuel:**
- Première requête toujours lente (cache miss)
- Pas de préchargement proactif

**Solution proposée:**
```typescript
// Background worker pour rafraîchir le cache avant expiration
setInterval(() => {
  // Rafraîchir les caches qui expirent dans 1h
  const nearExpiry = getNearExpiryCaches(60 * 60 * 1000);
  nearExpiry.forEach(category => {
    fetchCommoditiesData(category, true).catch(console.error);
  });
}, 30 * 60 * 1000); // Toutes les 30 minutes
```

**Bénéfices:**
- Cache toujours frais sans attendre l'utilisateur
- Expérience utilisateur instantanée
- Réduction des requêtes synchrones

#### D. Compression du cache
**Problème actuel:**
- Stockage brut en localStorage
- Limite de ~5-10MB pour localStorage

**Solution proposée:**
```typescript
import { compress, decompress } from 'lz-string';

function saveToCache(category: CommodityCategory, data: any[]): void {
  const cacheData: CacheData = {
    data,
    timestamp: Date.now(),
    lastUpdated: new Date().toISOString()
  };
  
  // Compresser avant sauvegarde
  const compressed = compress(JSON.stringify(cacheData));
  localStorage.setItem(getCacheKey(category), compressed);
}

function loadFromCache(category: CommodityCategory): any[] | null {
  const compressed = localStorage.getItem(getCacheKey(category));
  if (!compressed) return null;
  
  // Décompresser
  const decompressed = decompress(compressed);
  const cacheData: CacheData = JSON.parse(decompressed);
  // ... reste du code
}
```

**Bénéfices:**
- Réduction de 60-80% de la taille du cache
- Plus de données peuvent être stockées
- Meilleure performance localStorage

### 2. 🛡️ ROBUSTESSE

#### A. Système de retry avec backoff exponentiel
**Problème actuel:**
- Pas de retry automatique en cas d'échec
- Erreur immédiate si le scraping échoue

**Solution proposée:**
```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Backoff exponentiel
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Usage
const data = await fetchWithRetry(
  () => scrapeTradingViewCategory(category),
  3,  // 3 retries
  1000 // 1s, 2s, 4s delays
);
```

**Bénéfices:**
- Résilience aux erreurs temporaires
- Meilleur taux de succès
- Réduction des échecs utilisateur

#### B. Validation des données parsées
**Problème actuel:**
- Pas de validation après parsing
- Données invalides peuvent passer (prix = 0, symboles vides)

**Solution proposée:**
```typescript
interface ValidationRule {
  field: keyof Commodity;
  validator: (value: any) => boolean;
  errorMessage: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'symbol',
    validator: (v) => typeof v === 'string' && v.length > 0,
    errorMessage: 'Symbol must be a non-empty string'
  },
  {
    field: 'price',
    validator: (v) => typeof v === 'number' && v > 0 && v < 1000000,
    errorMessage: 'Price must be a positive number < 1,000,000'
  },
  {
    field: 'percentChange',
    validator: (v) => typeof v === 'number' && Math.abs(v) <= 100,
    errorMessage: 'Percent change must be between -100% and 100%'
  }
];

function validateCommodity(commodity: Commodity): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  VALIDATION_RULES.forEach(rule => {
    const value = commodity[rule.field];
    if (!rule.validator(value)) {
      errors.push(`${rule.field}: ${rule.errorMessage}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Dans parseCommoditiesData
commodities.push({
  symbol,
  name,
  price,
  // ...
});

const validation = validateCommodity(commodity);
if (!validation.valid) {
  console.warn(`Invalid commodity ${symbol}:`, validation.errors);
  // Optionnel: skip ou fix selon le cas
}
```

**Bénéfices:**
- Détection précoce des problèmes de parsing
- Qualité de données garantie
- Debugging facilité

#### C. Fallback avec données de cache même si expiré
**Problème actuel:**
- Si scraping échoue ET cache expiré → erreur totale
- L'utilisateur ne voit rien

**Solution proposée:**
```typescript
export async function fetchCommoditiesData(
  category: CommodityCategory,
  forceRefresh: boolean = false
): Promise<Commodity[]> {
  // Essayer nouveau scraping
  try {
    const freshData = await scrapeFreshData(category);
    return freshData;
  } catch (error) {
    console.warn(`Fresh scraping failed, trying expired cache...`);
    
    // Fallback: utiliser cache même expiré (stale data)
    const staleData = loadFromCache(category, true); // allowExpired = true
    if (staleData) {
      console.log(`Using stale cache for ${category} (${staleData.length} items)`);
      return staleData;
    }
    
    // Dernier recours: essayer autres catégories pour données similaires
    throw error;
  }
}
```

**Bénéfices:**
- Expérience utilisateur améliorée (affichage de données anciennes plutôt que rien)
- Résilience maximale
- Graceful degradation

### 3. 🔍 AMÉLIORATION DU PARSING

#### A. Selectors multiples avec priorité
**Problème actuel:**
- Selectors essayés séquentiellement
- Si le premier échoue, attend avant d'essayer le suivant

**Solution proposée:**
```typescript
async function findRowsWithMultipleStrategies(root: any) {
  // Essayer tous les selectors en parallèle
  const strategies = [
    () => root.querySelectorAll('.tv-data-table__row'),
    () => root.querySelectorAll('tr[data-rowid]'),
    () => root.querySelectorAll('table.tv-data-table tr'),
    () => root.querySelectorAll('table tr[data-symbol]'),
    () => root.querySelectorAll('tbody tr')
  ];
  
  for (const strategy of strategies) {
    try {
      const rows = strategy();
      if (rows && rows.length > 0) {
        console.log(`Found ${rows.length} rows with strategy: ${strategy.name}`);
        return rows;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('No rows found with any strategy');
}
```

**Bénéfices:**
- Parsing plus robuste
- Adaptation automatique aux changements TradingView
- Meilleure détection des données

#### B. Parsing basé sur structure sémantique
**Problème actuel:**
- Parsing basé uniquement sur position de cellules
- Fragile si structure change

**Solution proposée:**
```typescript
function parseRowSemantic(row: any): Commodity | null {
  // Chercher données par sens plutôt que position
  const cells = row.querySelectorAll('td, th');
  
  // Trouver la cellule avec symbole (contient '!' ou code boursier)
  const symbolCell = Array.from(cells).find(cell => 
    cell.text.match(/[A-Z0-9]{1,5}[!]?/) && cell.text.includes('!')
  );
  
  // Trouver prix (nombre avec format monétaire)
  const priceCell = Array.from(cells).find(cell => 
    /[\d.,]+/.test(cell.text) && parseFloat(cell.text.replace(/[^\d.,]/g, '')) > 0
  );
  
  // Trouver changement (contient + ou - ou %)
  const changeCell = Array.from(cells).find(cell =>
    cell.text.match(/[+-]?[\d.,]+%?/)
  );
  
  // Extraction avec validation
  if (!symbolCell || !priceCell) return null;
  
  return {
    symbol: extractSymbol(symbolCell.text),
    name: extractName(symbolCell.text),
    price: parseNumber(priceCell.text),
    // ...
  };
}
```

**Bénéfices:**
- Plus robuste aux changements de structure
- Parsing intelligent par contenu
- Meilleure résistance aux évolutions HTML

#### C. Normalisation améliorée des symboles
**Problème actuel:**
- Normalisation simple basée sur regex
- Ne gère pas tous les cas edge

**Solution proposée:**
```typescript
interface SymbolPattern {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => { symbol: string; name: string };
}

const SYMBOL_PATTERNS: SymbolPattern[] = [
  {
    // Pattern 1: "AG1!Silver" → "AG1!" + "Silver"
    pattern: /^([A-Z0-9]{1,5}[!])(.+)$/,
    extract: (m) => ({ symbol: m[1], name: m[2].trim() })
  },
  {
    // Pattern 2: "CL1! WTI Crude Oil" → "CL1!" + "WTI Crude Oil"
    pattern: /^([A-Z0-9]{1,5}[!])\s+(.+)$/,
    extract: (m) => ({ symbol: m[1], name: m[2].trim() })
  },
  {
    // Pattern 3: "Gold" dans title attribute
    pattern: /^([A-Z0-9]{1,5}[!]?)$/,
    extract: (m) => ({ 
      symbol: m[1], 
      name: extractFromTitle(element) || '' 
    })
  }
];

function normalizeSymbolAdvanced(text: string, element: any): { symbol: string; name: string } {
  for (const { pattern, extract } of SYMBOL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return extract(match);
    }
  }
  
  // Fallback
  return { symbol: text, name: '' };
}
```

**Bénéfices:**
- Gestion de tous les formats TradingView
- Extraction plus précise
- Moins de symboles malformés

### 4. 📈 SCALABILITÉ

#### A. Rate limiting et throttling
**Problème actuel:**
- Pas de protection contre rate limiting
- Risque de ban par TradingView

**Solution proposée:**
```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = false;
  private requests: number[] = []; // Timestamps des requêtes
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    
    while (this.queue.length > 0) {
      // Nettoyer anciennes requêtes
      const now = Date.now();
      this.requests = this.requests.filter(t => now - t < this.windowMs);
      
      // Vérifier limite
      if (this.requests.length >= this.maxRequests) {
        const oldest = this.requests[0];
        const waitTime = this.windowMs - (now - oldest);
        if (waitTime > 0) {
          console.log(`Rate limit: waiting ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // Exécuter requête
      this.requests.push(Date.now());
      const task = this.queue.shift()!;
      await task();
      
      // Délai minimum entre requêtes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.running = false;
  }
}

const rateLimiter = new RateLimiter(10, 60000); // 10 req/min

// Usage
const data = await rateLimiter.throttle(() => 
  scrapeTradingViewCategory(category)
);
```

**Bénéfices:**
- Protection contre bans
- Respect des limites TradingView
- Comportement prévisible

#### B. Pooling de connections Puppeteer
**Problème actuel:**
- Nouveau browser pour chaque requête
- Startup coûteux (~2-3s)

**Solution proposée:**
```typescript
class BrowserPool {
  private pool: Browser[] = [];
  private maxSize: number = 3;
  private inUse: Set<Browser> = new Set();
  
  async acquire(): Promise<Browser> {
    // Réutiliser browser disponible
    const available = this.pool.find(b => !this.inUse.has(b));
    if (available) {
      this.inUse.add(available);
      return available;
    }
    
    // Créer nouveau si pool pas plein
    if (this.pool.length < this.maxSize) {
      const browser = await getBrowser();
      this.pool.push(browser);
      this.inUse.add(browser);
      return browser;
    }
    
    // Attendre qu'un browser soit libéré
    return this.waitForAvailable();
  }
  
  release(browser: Browser) {
    this.inUse.delete(browser);
  }
  
  private async waitForAvailable(): Promise<Browser> {
    return new Promise((resolve) => {
      const check = () => {
        const available = this.pool.find(b => !this.inUse.has(b));
        if (available) {
          this.inUse.add(available);
          resolve(available);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}
```

**Bénéfices:**
- Réduction du temps de startup (de 3s à ~0.1s)
- Réutilisation des ressources
- Meilleure performance globale

#### C. Caching au niveau API (Vercel Edge Cache)
**Problème actuel:**
- Chaque requête API → scraping complet
- Pas de cache HTTP

**Solution proposée:**
```typescript
// Dans les API routes Vercel
export default async function handler(req, res) {
  // Vérifier cache Vercel Edge
  const cacheKey = `scrape:${category}:${Date.now() - (Date.now() % (5 * 60 * 1000))}`; // 5 min cache
  
  // Set cache headers
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  
  // ... scraping ...
  
  res.status(200).json({ data: html });
}
```

**Bénéfices:**
- Réduction drastique des requêtes Puppeteer
- Réponses plus rapides
- Réduction des coûts serverless

### 5. 📊 MONITORING ET LOGGING

#### A. Métriques de performance
**Solution proposée:**
```typescript
interface ScrapingMetrics {
  category: CommodityCategory;
  duration: number;
  itemsFound: number;
  success: boolean;
  cacheHit: boolean;
  retries: number;
  timestamp: number;
}

class MetricsCollector {
  private metrics: ScrapingMetrics[] = [];
  
  record(metric: ScrapingMetrics) {
    this.metrics.push(metric);
    
    // Garder seulement 100 dernières métriques
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }
  
  getStats(): {
    successRate: number;
    avgDuration: number;
    avgItems: number;
    cacheHitRate: number;
  } {
    const recent = this.metrics.slice(-20); // Dernières 20 requêtes
    
    return {
      successRate: recent.filter(m => m.success).length / recent.length,
      avgDuration: recent.reduce((sum, m) => sum + m.duration, 0) / recent.length,
      avgItems: recent.reduce((sum, m) => sum + m.itemsFound, 0) / recent.length,
      cacheHitRate: recent.filter(m => m.cacheHit).length / recent.length
    };
  }
}
```

**Bénéfices:**
- Visibilité sur les performances
- Détection précoce des problèmes
- Optimisation basée sur données

#### B. Alertes automatiques
**Solution proposée:**
```typescript
function checkHealth() {
  const stats = metricsCollector.getStats();
  
  // Alerte si taux de succès < 80%
  if (stats.successRate < 0.8) {
    console.error('⚠️ Scraping success rate below 80%');
    // Optionnel: envoyer notification (email, Slack, etc.)
  }
  
  // Alerte si durée moyenne > 15s
  if (stats.avgDuration > 15000) {
    console.warn('⚠️ Average scraping duration above 15s');
  }
  
  // Alerte si aucune donnée trouvée
  if (stats.avgItems === 0) {
    console.error('⚠️ No items being scraped - parsing may be broken');
  }
}

// Exécuter toutes les heures
setInterval(checkHealth, 60 * 60 * 1000);
```

### 6. 🎯 OPTIMISATIONS SPÉCIFIQUES

#### A. Streaming des données pour Freight
**Problème actuel:**
- Attend tous les 29 symboles avant de retourner
- Utilisateur attend ~3 minutes

**Solution proposée:**
```typescript
// Streaming avec EventEmitter
import { EventEmitter } from 'events';

class StreamingScraper extends EventEmitter {
  async scrapeFreightStreaming() {
    for (const symbol of FREIGHT_SYMBOLS) {
      const data = await fetchFreightSymbolData(symbol);
      if (data) {
        this.emit('commodity', data); // Émettre dès qu'une donnée est prête
      }
    }
    this.emit('complete');
  }
}

// Usage frontend
const scraper = new StreamingScraper();
scraper.on('commodity', (commodity) => {
  // Afficher immédiatement dans l'UI
  updateUI(commodity);
});
scraper.on('complete', () => {
  console.log('All freight data loaded');
});
```

**Bénéfices:**
- Affichage progressif (meilleure UX)
- Utilisateur voit les données au fur et à mesure
- Perception de performance améliorée

#### B. IndexedDB au lieu de localStorage
**Problème actuel:**
- localStorage limité à ~5-10MB
- Synchronisation bloquante

**Solution proposée:**
```typescript
import { openDB, DBSchema } from 'idb';

interface CommodityDB extends DBSchema {
  commodities: {
    key: string; // category
    value: {
      category: CommodityCategory;
      data: Commodity[];
      timestamp: number;
      lastUpdated: string;
    };
    indexes: { 'by-timestamp': number };
  };
}

const db = await openDB<CommodityDB>('commodities-db', 1, {
  upgrade(db) {
    const store = db.createObjectStore('commodities', {
      keyPath: 'category'
    });
    store.createIndex('by-timestamp', 'timestamp');
  }
});

// Sauvegarde async et non-bloquante
await db.put('commodities', {
  category,
  data,
  timestamp: Date.now(),
  lastUpdated: new Date().toISOString()
});
```

**Bénéfices:**
- Capacité beaucoup plus grande (plusieurs GB)
- Accès async non-bloquant
- Requêtes indexées pour recherche rapide

#### C. Web Workers pour parsing
**Problème actuel:**
- Parsing HTML bloque le thread principal
- UI peut freeze pendant parsing

**Solution proposée:**
```typescript
// parsing.worker.ts
self.onmessage = (e) => {
  const { html, category } = e.data;
  
  // Parsing dans worker
  const commodities = parseCommoditiesData(html, category);
  
  self.postMessage({ commodities });
};

// Usage
const worker = new Worker('parsing.worker.ts');
worker.postMessage({ html, category });
worker.onmessage = (e) => {
  const { commodities } = e.data;
  setCommodities(commodities);
};
```

**Bénéfices:**
- UI reste réactive pendant parsing
- Utilisation multi-core
- Meilleure expérience utilisateur

## 📊 Impact estimé des optimisations

| Optimisation | Impact Performance | Complexité | Priorité |
|-------------|-------------------|------------|----------|
| Cache intelligent | ⭐⭐⭐⭐⭐ | Faible | 🔴 Haute |
| Retry logic | ⭐⭐⭐⭐ | Moyenne | 🔴 Haute |
| Validation données | ⭐⭐⭐ | Faible | 🟡 Moyenne |
| Rate limiting | ⭐⭐⭐ | Moyenne | 🟡 Moyenne |
| Browser pooling | ⭐⭐⭐⭐⭐ | Élevée | 🟢 Basse |
| IndexedDB | ⭐⭐⭐ | Moyenne | 🟡 Moyenne |
| Streaming | ⭐⭐⭐⭐ | Moyenne | 🟡 Moyenne |
| Web Workers | ⭐⭐ | Élevée | 🟢 Basse |

## 🎯 Plan d'implémentation recommandé

### Phase 1 - Quick Wins (1-2 jours)
1. ✅ Cache intelligent avec durées variables
2. ✅ Retry logic avec backoff
3. ✅ Validation des données
4. ✅ Fallback cache expiré

### Phase 2 - Robustesse (2-3 jours)
5. ✅ Rate limiting
6. ✅ Métriques et monitoring
7. ✅ Parsing amélioré avec stratégies multiples

### Phase 3 - Performance avancée (3-5 jours)
8. ✅ Browser pooling (si budget permet)
9. ✅ IndexedDB migration
10. ✅ Streaming pour Freight

### Phase 4 - Optimisations avancées (optionnel)
11. ⚪ Web Workers
12. ⚪ Edge caching Vercel
13. ⚪ Préchargement proactif

## 💡 Recommandations finales

**Priorités immédiates:**
1. **Cache intelligent** - Impact énorme, effort minimal
2. **Retry logic** - Améliore drastiquement la fiabilité
3. **Validation** - Protège contre données corrompues

**À éviter pour l'instant:**
- Browser pooling (complexe, nécessite infrastructure)
- Web Workers (overkill pour parsing actuel)

**À considérer selon budget:**
- Edge caching Vercel (réduction coûts si traffic élevé)
- Monitoring avancé (si besoin de SLA)

## 📈 Résultats attendus

Avec les optimisations Phase 1-2:
- **Taux de succès**: 95% → 99%+
- **Temps de réponse moyen**: 8s → 2s (avec cache)
- **Fiabilité**: +40%
- **Expérience utilisateur**: Significativement améliorée

