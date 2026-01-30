# 🔍 Analyse Approfondie du Scraping des Données Freight

## 📋 Résumé Exécutif

Le scraping des données Freight utilise une approche **double stratégie** avec optimisation avancée :
1. **Méthode Rapide** : Scraping de la page catégorie TradingView (1 requête)
2. **Méthode Fallback** : Scraping individuel de chaque symbole (33 requêtes) avec système avancé de gestion d'erreurs

---

## 🎯 Vue d'Ensemble

### Statistiques
- **Total de symboles** : 33 symboles freight
- **Catégories** :
  - Container Freight : 6 symboles (CS11!, CS21!, CS31!, CS41!, CS51!, CS61!)
  - Freight Routes : 18 symboles (TM1!, TD81!, TC71!, etc.)
  - LNG Freight : 6 symboles (BG11!, BG21!, BG31!, BL11!, BL21!, BL31!)
  - Dirty Freight : 3 symboles (USC1!, USE1!, XUK1!)
  - Liquid Petroleum Gas : 2 symboles (FLJ1!, FLP1!)

### Performance
- **Méthode rapide** : ~2-5 secondes (1 requête)
- **Méthode fallback** : ~165 secondes estimées (33 × 5s)
- **Gain de performance** : ~33x plus rapide avec la méthode rapide

---

## 🔄 Flux de Scraping Freight

### Étape 1 : Vérification du Cache

```typescript
// Fichier: commodityApi.ts, ligne 656-672
if (!forceRefresh) {
  const cachedData = loadFromCache(category);
  if (cachedData) {
    // Retourne les données en cache si disponibles
    return normalized as any;
  }
}
```

**Cache Key** : `fx_commodities_cache_freight`  
**Durée** : 24 heures  
**Migration automatique** : Les anciennes données sont migrées pour inclure le champ `currency`

---

### Étape 2 : Tentative de Scraping Rapide (Méthode Catégorie)

```typescript
// Fichier: commodityApi.ts, ligne 675-714
if (category === 'freight') {
  try {
    // 1. Scrape la page catégorie
    const categoryData = await scrapeTradingViewCategory('freight');
    
    // 2. Parse le HTML
    const parsedCommodities = parseCommoditiesData(categoryData, category);
    
    // 3. Filtre pour ne garder que les symboles freight
    const freightFromCategory = parsedCommodities.filter(c => {
      // Filtrage par symboles connus ou patterns
    });
    
    // 4. Retourne si succès
    if (freightFromCategory.length > 0) {
      return freightFromCategory;
    }
  } catch (error) {
    // Fallback vers méthode individuelle
  }
}
```

#### URL Utilisée
```
https://www.tradingview.com/markets/futures/quotes-freight/
```

#### Filtrage des Symboles
Le code filtre les commodities pour ne garder que celles qui :
- Matchent les symboles connus dans `FREIGHT_SYMBOLS`
- Contiennent des patterns : `CS`, `TM`, `TD`, `TC`, `BG`, `BL`, `USC`, `USE`, `XUK`, `FLJ`, `FLP`
- Ont "freight" ou "container" dans le nom

**Avantages** :
- ✅ 1 seule requête HTTP
- ✅ ~33x plus rapide
- ✅ Moins de risque de CAPTCHA

**Inconvénients** :
- ⚠️ Peut ne pas retourner tous les symboles
- ⚠️ Dépend de la structure HTML de TradingView

---

### Étape 3 : Fallback - Scraping Individuel (Méthode Avancée)

Si la méthode rapide échoue, le système utilise un **système avancé de scraping parallèle** :

```typescript
// Fichier: commodityApi.ts, ligne 1001-1641
async function fetchFreightData(): Promise<Commodity[]>
```

#### Architecture du Système

**1. Configuration Avancée**
```typescript
const config = {
  initialConcurrency: 8,      // 8 workers parallèles au départ
  maxConcurrency: 12,         // Maximum 12 workers
  minConcurrency: 3,           // Minimum 3 workers
  baseDelay: 1500,            // Délai de base 1.5s entre requêtes
  requestTimeout: 25000,      // Timeout 25s par requête
  maxRetries: 3,              // 3 tentatives max par symbole
  retryBackoffBase: 2,        // Backoff exponentiel base 2
  retryJitter: 0.3,           // 30% de jitter
  failureThreshold: 0.5,      // Circuit breaker: >50% échecs
  successThreshold: 0.7,       // Circuit breaker: >70% succès
  circuitTimeout: 30000        // 30s avant réessai
};
```

**2. File de Priorité**
```typescript
// Priorisation des symboles
- Priority 3: Container Freight (CS11!, CS21!, etc.)
- Priority 2: Freight Routes (TM1!, TD81!, etc.)
- Priority 1: Autres (LNG, Dirty, LPG)
```

**3. Circuit Breaker Pattern**
```typescript
// États du circuit breaker
- 'closed': Normal, toutes les requêtes passent
- 'open': Trop d'échecs, bloque les requêtes
- 'half-open': Test de récupération
```

**4. Concurrence Adaptative**
```typescript
// Ajuste le nombre de workers selon le taux de succès
if (successRate > 0.8 && currentConcurrency < maxConcurrency) {
  currentConcurrency++;  // Augmente si succès
} else if (successRate < 0.3 && currentConcurrency > minConcurrency) {
  currentConcurrency--;  // Diminue si échecs
}
```

---

## 🔧 Fonction `fetchFreightSymbolData()`

### Responsabilité
Scrape un symbole freight individuel depuis TradingView et extrait **uniquement le prix** (optimisation).

### Flux d'Exécution

#### 1. Vérification du Cache Local
```typescript
// Cache par symbole (10 minutes TTL)
const cacheKey = `freight_symbol_${symbol}`;
const cached = localStorage.getItem(cacheKey);
if (cached && cacheAge < 10 * 60 * 1000) {
  return cachedData;  // Retourne immédiatement
}
```

#### 2. Requête avec Timeout
```typescript
const timeoutPromise = new Promise<null>((resolve) => {
  setTimeout(() => resolve(null), 25000);
});

const fetchPromise = scrapeTradingViewSymbol(symbol);
const data = await Promise.race([fetchPromise, timeoutPromise]);
```

**URL Utilisée** :
```
https://www.tradingview.com/symbols/NYMEX-{symbol}/
```

#### 3. Détection CAPTCHA
```typescript
const captchaIndicators = [
  htmlContent.includes('Complete the test below'),
  htmlContent.includes('Just one more step'),
  htmlContent.includes('challenge-platform'),
  htmlContent.includes('cloudflare') && htmlContent.length < 20000,
  root.querySelector('[class*="captcha"]') !== null,
  root.querySelector('[id*="captcha"]') !== null,
  root.querySelector('[class*="challenge"]') !== null,
  root.querySelector('[class*="cf-"]') !== null
];

if (captchaIndicators.some(indicator => indicator === true)) {
  return null;  // Échec silencieux
}
```

#### 4. Extraction du Prix (3 Stratégies)

**Stratégie 1 : JSON Embedé** (Plus rapide et fiable)
```typescript
const jsonScripts = root.querySelectorAll(
  'script[type="application/json"], ' +
  'script[id*="__NEXT_DATA__"], ' +
  'script[id*="__TV_DATA__"]'
);

for (const script of jsonScripts) {
  const jsonData = JSON.parse(script.text);
  const priceData = jsonData?.props?.pageProps?.symbol || 
                   jsonData?.symbol || 
                   jsonData?.data?.symbol ||
                   jsonData?.quotes?.[0];
  
  if (priceData?.price || priceData?.last_price) {
    price = priceData.price || priceData.last_price || 0;
    break;
  }
}
```

**Stratégie 2 : Sélecteurs CSS** (Fallback)
```typescript
const priceSelectors = [
  '.tv-symbol-price-quote__value',
  '[data-field="last_price"]',
  '[data-field="price"]',
  '.js-symbol-last',
  '.tv-symbol-header__price',
  '[class*="price-quote"]',
  '[class*="last-price"]',
  '[class*="symbol-price"]',
  '[class*="tv-symbol-price"]',
  '[class*="price-value"]',
  '[data-field="last"]'
];

for (const selector of priceSelectors) {
  const priceElements = root.querySelectorAll(selector);
  for (const priceElement of priceElements) {
    // Parse le texte pour extraire le prix
    const parsedPrice = parseFloat(priceText) || 0;
    if (parsedPrice > 0) {
      price = parsedPrice;
      break;
    }
  }
}
```

**Stratégie 3 : Regex sur le Contenu** (Dernier recours)
```typescript
const pricePatterns = [
  /"price":\s*(\d+\.?\d*)/i,
  /"last_price":\s*(\d+\.?\d*)/i,
  /"lastPrice":\s*(\d+\.?\d*)/i,
  /(?:last|price|close)[\s:]*([+-]?\d{1,3}(?:,\d{3})*\.\d{1,4})/i,
  /(?:last|price|close)[\s:]*([+-]?\d+\.\d{1,4})/i
];

for (const pattern of pricePatterns) {
  const priceMatch = htmlContent.match(pattern);
  if (priceMatch) {
    price = parseFloat(priceMatch[1]);
    break;
  }
}
```

#### 5. Parsing du Format de Prix

Le code gère plusieurs formats de nombres :
- **Format US** : `1,234.56` → `1234.56`
- **Format EU** : `1.234,56` → `1234.56`
- **Format simple** : `1234.56` → `1234.56`
- **Avec unités** : `$1,234.56 USD` → `1234.56`

```typescript
// Supprime les unités
priceText = priceText.replace(/\s*(USD|usd|$|€|EUR|eur|MMBtu|BBL|MT|OZ|LB|BU|GAL)\s*/gi, '');

// Gère les séparateurs
if (priceText.includes(',') && priceText.includes('.')) {
  const lastDotIndex = priceText.lastIndexOf('.');
  const lastCommaIndex = priceText.lastIndexOf(',');
  
  if (lastDotIndex > lastCommaIndex) {
    priceText = priceText.replace(/,/g, '');  // US format
  } else {
    priceText = priceText.replace(/\./g, '').replace(',', '.');  // EU format
  }
}
```

#### 6. Création de l'Objet Commodity

```typescript
const currency = extractCurrency(symbol, name, 'freight');
const result = {
  symbol,
  name,
  price,
  currency,              // ✅ Extrait automatiquement
  percentChange: 0,      // Non utilisé pour freight
  absoluteChange: 0,     // Non utilisé pour freight
  high: 0,               // Non utilisé pour freight
  low: 0,                // Non utilisé pour freight
  technicalEvaluation: 'Positive',
  type,
  category: 'freight'
};
```

#### 7. Cache du Résultat
```typescript
// Cache pour 10 minutes
const cacheKey = `freight_symbol_${symbol}`;
const cacheData = {
  ...result,
  timestamp: Date.now()
};
localStorage.setItem(cacheKey, JSON.stringify(cacheData));
```

---

## 🚀 Système de Worker Pool

### Architecture

```typescript
const processQueue = async (): Promise<void> => {
  const workers: Promise<void>[] = [];
  let queueIndex = 0;
  
  // Crée N workers parallèles
  for (let i = 0; i < currentConcurrency; i++) {
    workers.push(worker(i));
  }
  
  await Promise.all(workers);
};
```

### Fonction Worker

```typescript
const worker = async (workerId: number): Promise<void> => {
  while (queueIndex < symbolQueue.length) {
    const index = queueIndex++;  // Atomic increment
    const item = symbolQueue[index];
    
    // Délai adaptatif basé sur le taux de succès
    const adaptiveDelay = Math.max(
      config.minDelay,
      Math.min(config.maxDelay, config.baseDelay * (1 / recentSuccessRate))
    );
    
    if (index > 0) {
      await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
    }
    
    // Traite le symbole
    const result = await processSymbol(item);
    
    if (result) {
      results.push(result);
      console.log(`✅ [${results.length}/${FREIGHT_SYMBOLS.length}] ${symbol}`);
    }
  }
};
```

### Retry Logic avec Backoff Exponentiel

```typescript
const processSymbol = async (item): Promise<Commodity | null> => {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      // Backoff exponentiel avec jitter
      const delay = getRetryDelay(attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const { result, wasTimeout, wasCaptcha, error } = 
      await fetchSymbolAdvanced(symbol, name, type, attempt);
    
    if (result) {
      return result;  // Succès
    }
    
    // Continue avec retry si nécessaire
  }
  
  return null;  // Tous les retries ont échoué
};

const getRetryDelay = (attempt: number): number => {
  const baseDelay = 1000 * Math.pow(2, attempt);  // 1s, 2s, 4s, 8s
  const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1);  // ±30%
  return Math.min(baseDelay + jitter, 10000);  // Max 10s
};
```

---

## 📊 Métriques et Monitoring

### Métriques Collectées

```typescript
const metrics = {
  success: 0,              // Nombre de succès
  captcha: 0,              // Nombre de CAPTCHA détectés
  timeout: 0,              // Nombre de timeouts
  error: 0,                // Nombre d'erreurs
  retries: 0,              // Nombre total de retries
  cacheHits: 0,            // Nombre de hits de cache
  totalRequests: 0,        // Nombre total de requêtes
  avgResponseTime: 0,       // Temps de réponse moyen
  responseTimes: []         // Tableau des temps de réponse
};
```

### Rapport Final

```typescript
console.log(`📊 ADVANCED Freight Scraping Summary (${elapsedTime}s):`);
console.log(`   ✅ Success: ${metrics.success}/${FREIGHT_SYMBOLS.length} (${successRate.toFixed(1)}%)`);
console.log(`   ⚠️  CAPTCHA: ${metrics.captcha}`);
console.log(`   ⏱️  Timeouts: ${metrics.timeout}`);
console.log(`   ❌ Errors: ${metrics.error}`);
console.log(`   🔄 Retries: ${metrics.retries}`);
console.log(`   ⚡ Avg Response: ${metrics.avgResponseTime.toFixed(0)}ms`);
console.log(`   📈 Final Concurrency: ${currentConcurrency}`);
console.log(`   🔌 Circuit State: ${circuitState}`);
```

---

## 🔄 Gestion du Cache Stale

### Smart Cache Merging

Si moins de 50% des symboles sont récupérés, le système fusionne avec le cache stale :

```typescript
if (results.length < FREIGHT_SYMBOLS.length * 0.5 && config.useStaleCache) {
  const staleCache = loadFromCache('freight');
  if (staleCache && staleCache.length > 0) {
    const cachedSymbols = new Set(results.map(r => r.symbol));
    const additionalFromCache = staleCache.filter((item: any) => 
      item && item.symbol && !cachedSymbols.has(item.symbol)
    );
    
    if (additionalFromCache.length > 0) {
      results.push(...additionalFromCache);
    }
  }
}
```

### Fallback Final

Si aucun symbole n'est récupéré, utilise le cache stale complet :

```typescript
if (results.length === 0) {
  const staleCache = loadFromCache('freight');
  if (staleCache && staleCache.length > 0) {
    return staleCache as Commodity[];
  }
}
```

---

## 🎯 Extraction de la Devise pour Freight

### Fonction Utilisée
```typescript
const currency = extractCurrency(symbol, name, 'freight');
```

### Stratégies pour Freight

1. **Détection depuis le nom** : Cherche "USD", "EUR", "GBP", etc.
2. **Détection depuis le symbole** : Cherche dans le code du symbole
3. **Détection géographique** : "London" → GBP, "US" → USD, etc.
4. **Détection d'échange** : "ICE Futures Europe" → GBP, "NYMEX" → USD
5. **Fallback** : USD par défaut pour freight

### Exemples

```typescript
// Exemple 1 : Container Freight
symbol: "CS11!"
name: "Container Freight (China/East Asia to US West Coast) (FBX01) (Baltic) Futures"
→ currency: "USD" (détecté depuis "US" dans le nom)

// Exemple 2 : Freight Route
symbol: "TF21!"
name: "Freight Route Middle East to UK Continent (TC20) (Baltic) Futures"
→ currency: "GBP" (détecté depuis "UK" dans le nom)

// Exemple 3 : LNG Freight
symbol: "BG11!"
name: "LNG Freight Australia to Japan (BLNG1-174)"
→ currency: "USD" (fallback, pas d'indicateur clair)
```

---

## ⚠️ Gestion des Erreurs

### Types d'Erreurs Gérées

1. **CAPTCHA** : Détecté et ignoré silencieusement
2. **Timeout** : 25s par requête, retry avec backoff
3. **Erreurs réseau** : Retry avec backoff exponentiel
4. **Circuit Breaker** : Bloque les requêtes si >50% d'échecs
5. **Données invalides** : Retourne null, continue avec les autres

### Stratégies de Récupération

- **Retry automatique** : Jusqu'à 3 tentatives par symbole
- **Backoff exponentiel** : Délais croissants entre retries
- **Jitter** : Variation aléatoire pour éviter les thundering herds
- **Cache stale** : Utilise les anciennes données si disponibles
- **Circuit breaker** : Protège contre les surcharges

---

## 📈 Optimisations Implémentées

### 1. Cache Multi-Niveaux
- **Cache catégorie** : 24 heures (localStorage)
- **Cache symbole** : 10 minutes (localStorage)
- **Cache stale** : Utilisé en fallback

### 2. Parsing Optimisé
- **JSON d'abord** : Plus rapide et fiable
- **Sélecteurs CSS** : Fallback structuré
- **Regex** : Dernier recours

### 3. Concurrence Adaptative
- **Ajustement dynamique** : Selon le taux de succès
- **Limites** : Min 3, Max 12 workers
- **Délais adaptatifs** : Basés sur les performances

### 4. Priorisation
- **Container Freight** : Priorité 3 (plus important)
- **Freight Routes** : Priorité 2
- **Autres** : Priorité 1

---

## 🔍 Points d'Attention

### 1. CAPTCHA TradingView
- **Problème** : TradingView peut bloquer avec CAPTCHA
- **Solution** : Détection multiple, retry avec délais, circuit breaker

### 2. Structure HTML Variable
- **Problème** : TradingView peut changer la structure HTML
- **Solution** : Multiple sélecteurs CSS, fallback JSON, regex

### 3. Timeouts
- **Problème** : Certaines requêtes peuvent être lentes
- **Solution** : Timeout 25s, retry automatique, cache stale

### 4. Devise Manquante
- **Problème** : Certains symboles n'ont pas de devise explicite
- **Solution** : Détection géographique, détection d'échange, fallback USD

---

## 📝 Recommandations

### Améliorations Possibles

1. **API Officielle** : Si TradingView propose une API, l'utiliser
2. **Proxy Rotation** : Pour éviter les CAPTCHA
3. **User-Agent Rotation** : Pour simuler différents navigateurs
4. **Rate Limiting Intelligent** : Basé sur les réponses du serveur
5. **Monitoring Avancé** : Alertes si taux de succès < 50%

### Tests Recommandés

1. **Test de charge** : Vérifier avec tous les 33 symboles
2. **Test de résilience** : Simuler des CAPTCHA et timeouts
3. **Test de cache** : Vérifier la migration des données
4. **Test de devise** : Vérifier l'extraction pour tous les types

---

## 🎯 Conclusion

Le système de scraping Freight est **très sophistiqué** avec :
- ✅ Double stratégie (rapide + fallback)
- ✅ Système de retry avancé
- ✅ Circuit breaker pattern
- ✅ Concurrence adaptative
- ✅ Cache multi-niveaux
- ✅ Gestion d'erreurs robuste
- ✅ Extraction de devise automatique

**Performance** : Optimisé pour être le plus rapide possible tout en restant fiable.

---

**Date d'analyse** : 2026-01-30  
**Fichiers analysés** :
- `src/services/commodityApi.ts` (lignes 19-67, 674-724, 761-986, 1001-1641)
- `src/services/puppeteerApi.ts` (lignes 63-95, 100-137)
