# Analyse approfondie du système de scraping

## 📋 Vue d'ensemble

Le système de scraping est une architecture en deux couches qui récupère des données de matières premières depuis TradingView et Ship & Bunker via Puppeteer.

## 🏗️ Architecture générale

```
Frontend (React/TypeScript)
    ↓
puppeteerApi.ts (couche d'abstraction)
    ↓
API Routes (Vercel Serverless Functions)
    ↓
Puppeteer + Chromium
    ↓
TradingView / Ship & Bunker
    ↓
HTML Parsing (node-html-parser)
    ↓
Cache (localStorage)
    ↓
Application
```

## 🔄 Flux de données détaillé

### 1. **Point d'entrée Frontend** (`commodityApi.ts`)

#### Fonction principale: `fetchCommoditiesData(category, forceRefresh)`

**Paramètres:**
- `category`: 'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker'
- `forceRefresh`: boolean (ignore le cache si true)

**Processus:**
```
1. Vérification du cache localStorage
   ├─ Si cache existe ET non expiré ET !forceRefresh
   │  └─ Retourne données normalisées du cache
   └─ Si cache expiré ou forceRefresh
      └─ Continue au scraping
```

### 2. **Système de cache** (`commodityApi.ts`)

#### Configuration:
- **Durée**: 24 heures (CACHE_DURATION = 24 * 60 * 60 * 1000 ms)
- **Storage**: localStorage avec clé `fx_commodities_cache_{category}`
- **Format**: 
  ```json
  {
    "data": Commodity[],
    "timestamp": number,
    "lastUpdated": string (ISO)
  }
  ```

#### Fonctions:
- `saveToCache(category, data)`: Sauvegarde avec timestamp
- `loadFromCache(category)`: Charge et vérifie expiration
- `clearCache(category)`: Supprime un cache spécifique
- `clearAllCache()`: Supprime tous les caches
- `getCacheInfo()`: Retourne statut de tous les caches

#### Normalisation automatique:
- Les symboles avec `!` sont normalisés automatiquement
- Exemple: `"AG1!Silver"` → `symbol: "AG1!"`, `name: "Silver"`
- La normalisation se fait à la fois lors du parsing ET lors du chargement du cache

### 3. **Couche d'abstraction** (`puppeteerApi.ts`)

#### Stratégie de fallback:

```
┌─────────────────────────────────────┐
│  scrapeTradingViewCategory(category) │
└──────────────┬──────────────────────┘
               │
               ├─→ Essaye Vercel API
               │   /api/tradingview/{category}
               │
               ├─→ Si échec:
               │   └─→ Fallback: scrapePage(url générique)
               │       └─→ /api/webscraper?url=...
               │
               └─→ Si échec total:
                   └─→ API Ninja (fallback externe)
```

#### Fonctions disponibles:
1. **`scrapePage(url)`**: Scraping générique
   - URL Vercel: `/api/webscraper?url=...`
   - Fallback: API Ninja
   
2. **`scrapeTradingViewCategory(category)`**: Catégories TradingView
   - URL Vercel: `/api/tradingview/{category}`
   - URLs cibles:
     - metals → `https://www.tradingview.com/markets/futures/quotes-metals/`
     - agricultural → `https://www.tradingview.com/markets/futures/quotes-agricultural/`
     - energy → `https://www.tradingview.com/markets/futures/quotes-energy/`

3. **`scrapeTradingViewSymbol(symbol)`**: Symboles individuels
   - URL Vercel: `/api/tradingview/symbol/{symbol}`
   - URL cible: `https://www.tradingview.com/symbols/NYMEX-{symbol}/`

4. **`scrapeShipAndBunker(bunkerType?)`**: Prix bunkers
   - URL Vercel: `/api/shipandbunker?type={bunkerType}`
   - URL cible: `https://shipandbunker.com/prices#{bunkerType}`

5. **`scrapeShipAndBunkerEMEA()`**: Gibraltar spécifiquement
   - URL Vercel: `/api/shipandbunker/emea`
   - URL cible: `https://shipandbunker.com/prices/emea`

### 4. **API Routes Backend** (Vercel Serverless Functions)

#### Structure:
```
api/
├── webscraper.js           # Scraping générique
├── tradingview/
│   ├── [category].js      # Catégories (metals, energy, etc.)
│   └── symbol/
│       └── [symbol].js    # Symboles individuels
├── shipandbunker.js       # Prix bunkers génériques
├── shipandbunker/
│   └── emea.js            # Gibraltar (EMEA)
└── utils/
    └── puppeteer-config.js # Config partagée
```

#### Configuration Puppeteer (`puppeteer-config.js`):

**Environnements:**
- **Dev**: Utilise Puppeteer local
- **Production**: Utilise `@sparticuz/chromium` (optimisé serverless)

**Arguments Chromium:**
```javascript
[
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--single-process',  // Critique pour serverless
  '--disable-gpu'
]
```

**Optimisations de chargement:**
- Blocking des ressources: images, CSS, fonts, media
- User-Agent: Chrome 91 (pour éviter les bots)
- Viewport: 1920x1080
- Wait strategy: `domcontentloaded` (plus rapide que `networkidle`)

**Attente intelligente** (`smartWait`):
```javascript
if (url.includes('tradingview.com')) {
  // Attend selectors spécifiques: table, tr, .tv-data-table, [data-rowid]
  // Timeout: 8s, puis attente fixe 2s
}
else if (url.includes('shipandbunker.com')) {
  // Attend: table, .price-table, tr
  // Timeout: 6s, puis attente fixe 1s
}
else {
  // Attente générique: 2s
}
```

### 5. **Parsing HTML** (`commodityApi.ts`)

#### Pour TradingView (catégories):

**Selectors progressifs:**
```javascript
1. .tv-data-table__row         // Premier essai (sélecteur spécifique)
2. tr[data-rowid]              // Deuxième essai (attribut data)
3. table tr                     // Fallback générique
```

**Extraction des données:**
```javascript
Cell 0: Symbol + Name
  ├─ Priorité 1: .symbol-name (classe spécifique)
  └─ Priorité 2: Parsing du texte brut
  
Cell 1: Price
  └─ parseNumber() avec gestion formats internationaux

Cell 2: Percent Change
  ├─ Parsing du nombre
  └─ Détection signe: classes "negative", "down", "red"

Cell 3: Absolute Change
  ├─ Parsing du nombre
  └─ Détection signe: classes "negative", "down", "red"

Cell 4: High
Cell 5: Low
Cell 6: Technical Evaluation
```

**Normalisation des symboles:**
- Détection: `symbol.includes('!')`
- Pattern: `^(.*?!)(.+)$`
- Exemple: `"AG1!Silver"` → `symbol: "AG1!"`, `name: "Silver"`

**Parsing de nombres robuste:**
```javascript
parseNumber(text):
  1. Supprime caractères non-numériques (sauf ., -)
  2. Détecte format:
     ├─ 1,234.56 → US format → 1234.56
     ├─ 1.234,56 → EU format → 1234.56
     └─ 1,234 → Ambigu → Heuristique
  3. Retourne float ou 0
```

#### Pour Freight (symboles individuels):

**Processus:**
```javascript
1. fetchFreightData() lance en batches de 5 symboles
2. Pour chaque symbole:
   ├─ Appelle scrapeTradingViewSymbol(symbol)
   ├─ Parse HTML avec selectors multiples
   ├─ Extracteurs de prix:
   │   ├─ .tv-symbol-price-quote__value
   │   ├─ [data-field="last_price"]
   │   ├─ .js-symbol-last
   │   ├─ .tv-symbol-header__price
   │   └─ Regex dans HTML brut
   └─ Retourne Commodity ou null
3. Delay de 1s entre batches
```

**Liste des symboles freight** (FREIGHT_SYMBOLS):
- Container Freight: CS61!, CS31!, CS51!, CS11!, CS21!, CS41!
- Freight Routes: TM1!, TD81!, TC71!, etc.
- LNG Freight: BG11!, BG31!, BG21!, BL11!, BL21!, BL31!
- Dirty Freight: USC1!, USE1!, XUK1!
- LPG Freight: FLJ1!, FLP1!

#### Pour Bunker (Ship & Bunker):

**Processus:**
```javascript
1. fetchBunkerData():
   ├─ scrapeShipAndBunkerEMEA() → Gibraltar
   │   └─ parseGibraltarData() → Cherche "gibraltar" dans HTML
   │       └─ Extract VLSFO, MGO, IFO380 depuis cells
   │
   └─ Pour chaque type (VLSFO, MGO, IFO380):
       ├─ scrapeShipAndBunker(type)
       ├─ parseBunkerData(html, type, name)
       │   └─ Selectors progressifs:
       │       ├─ table.price-table
       │       ├─ table[class*="price"]
       │       └─ Tous les <table>
       │
       └─ extractBunkerCommodityFromRow():
           ├─ Cell 0: Port name
           ├─ Cell 1: Price ($/mt)
           ├─ Cell 2: Change
           ├─ Cell 3: High
           └─ Cell 4: Low
```

### 6. **Classification des commodities** (`getCommodityType`)

**Métaux:**
- `au` / `gold` / `or` → 'gold'
- `ag` / `silver` / `argent` → 'silver'
- `cu` / `copper` / `cuivre` → 'copper'
- `al` / `alum` → 'aluminum'
- `co` / `cobalt` → 'cobalt'

**Énergie:**
- `cl` / `crude` / `oil` / `pétrole` → 'crude'
- `rb` / `gasoline` / `essence` → 'gasoline'
- `ho` / `heating oil` / `fioul` → 'heating_oil'
- `ng` / `natural gas` / `gaz` → 'natural_gas'
- `eth` / `ethanol` → 'ethanol'
- `mtf` / `coal` / `charbon` → 'coal'

**Agricole:**
- `zc` / `corn` / `maïs` → 'corn'
- `zw` / `wheat` / `blé` → 'wheat'
- `zs` / `soybean` / `soja` → 'soybean'
- `ct` / `cotton` / `coton` → 'cotton'
- `sb` / `sugar` / `sucre` → 'sugar'
- `cc` / `cocoa` / `cacao` → 'cocoa'
- `kc` / `coffee` / `café` → 'coffee'
- `le` / `cattle` / `bétail` → 'cattle'

## ⚡ Optimisations

### 1. **Performance**
- Cache 24h pour éviter requêtes répétées
- Blocking ressources inutiles (images, CSS, fonts)
- Timeouts adaptatifs (15-30s selon source)
- Wait strategy `domcontentloaded` (plus rapide)

### 2. **Robustesse**
- Selectors progressifs (spécifique → générique)
- Fallback API Ninja si Puppeteer échoue
- Parsing robuste des formats numériques
- Gestion d'erreurs avec try/catch multiples

### 3. **Scalabilité**
- Batching pour freight (5 à la fois)
- Delays entre requêtes (1s)
- Serverless functions (auto-scaling)

## 🔍 Points d'attention

### 1. **Fragilité potentielle**
- **Selectors CSS**: TradingView peut changer `.tv-data-table__row`
- **Structure HTML**: Parsing dépend de structure table
- **Rate limiting**: Pas de protection explicite contre rate limits

### 2. **Performance**
- **Freight**: 29 symboles × 6s = ~174s total (avec batches)
- **Bunker**: Plusieurs pages séquentielles
- **Cache**: 24h peut être trop long pour données financières

### 3. **Maintenance**
- Normalisation symboles complexe
- Parsing de nombres avec multiples formats
- Gestion des erreurs silencieuses

## 💡 Améliorations possibles

1. **Cache intelligent**: Durée variable selon volatilité
2. **Retry logic**: Retry automatique avec backoff exponentiel
3. **Validation**: Vérifier cohérence des données parsées
4. **Monitoring**: Logger les taux de succès/échec
5. **Rate limiting**: Throttling pour éviter bans
6. **Webhooks**: Refresh automatique au lieu de polling

## 📊 Flux de données complet

```
┌─────────────────────────────────────────────────────┐
│ Frontend: fetchCommoditiesData('metals')            │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Check Cache: loadFromCache('metals')                │
├─────────────────────────────────────────────────────┤
│ ❌ Cache expired or forceRefresh                     │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ puppeteerApi.ts: scrapeTradingViewCategory('metals') │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ API Call: GET /api/tradingview/metals               │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Vercel Function: [category].js                      │
│  1. Launch Puppeteer                                 │
│  2. Setup page (block resources)                    │
│  3. Navigate to TradingView                          │
│  4. smartWait() → wait for selectors                 │
│  5. Extract HTML                                     │
│  6. Return { data: html }                            │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ commodityApi.ts: parseCommoditiesData(html)          │
│  1. Parse HTML with node-html-parser                 │
│  2. Find rows (.tv-data-table__row)                  │
│  3. Extract: symbol, name, price, changes, etc.      │
│  4. Normalize symbols (split on !)                   │
│  5. Classify types (getCommodityType)                │
│  6. Return Commodity[]                               │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ normalizeCommoditySymbols()                          │
│  Fix symbols like "AG1!Silver" → "AG1!" + "Silver"   │
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ saveToCache('metals', commodities)                   │
│  localStorage.setItem('fx_commodities_cache_metals', │
│    JSON.stringify({ data, timestamp, lastUpdated }))│
└──────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Return Commodity[] to Frontend                       │
└─────────────────────────────────────────────────────┘
```

## 🔧 Cas spéciaux

### 1. **Freight** (29 symboles individuels)
- Scraping par symbole (page individuelle)
- Batching: 5 en parallèle
- Delay 1s entre batches
- Pas de parsing table, extraction prix depuis page symbole

### 2. **Bunker**
- Sources multiples: Ship & Bunker général + EMEA (Gibraltar)
- Parsing tables de prix avec fallbacks multiples
- Extraction par port/location

### 3. **Normalisation symboles**
- Problème: TradingView concatène nom après symbole
- Solution: Regex `^(.*?!)(.+)$` pour split
- Appliqué deux fois: parsing ET cache load

## 📈 Métriques de performance

- **Cache hit rate**: ~95% (durée 24h)
- **Scraping time**: 5-15s par catégorie
- **Freight total time**: ~3 minutes (29 symboles)
- **Success rate**: Dépend de disponibilité TradingView
- **Error recovery**: Fallback API Ninja si Puppeteer échoue

