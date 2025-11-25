# Analyse de la Structure des Données TradingView - NYMEX-T8C1!

## Vue d'ensemble

Le symbole **NYMEX-T8C1!** représente un contrat à terme de gaz naturel (Natural Gas Futures) sur le New York Mercantile Exchange (NYMEX). Cette analyse détaille comment TradingView structure les données sur une page de symbole individuel.

## URL de la Page

```
https://fr.tradingview.com/symbols/NYMEX-T8C1!/
```

## Structure HTML Principale

### 1. En-tête du Symbole (Symbol Header)

**Sélecteurs CSS identifiés :**
- `.tv-symbol-price-quote__value` - Prix principal actuel
- `.tv-symbol-header__price` - Prix dans l'en-tête
- `[data-field="last_price"]` - Prix de dernière transaction
- `.js-symbol-last` - Prix JavaScript

**Structure typique :**
```html
<div class="tv-symbol-price-quote">
  <div class="tv-symbol-price-quote__value">2.850</div>
  <div class="tv-symbol-price-quote__change">+0.025 (+0.88%)</div>
</div>
```

### 2. Informations de Marché (Market Data)

**Données disponibles :**
- **Prix actuel (Last Price)**: Prix de la dernière transaction
- **Variation (Change)**: Variation absolue et en pourcentage
- **High/Low**: Prix maximum et minimum de la session
- **Volume**: Volume échangé
- **Open Interest**: Intérêt ouvert (pour les futures)

**Sélecteurs potentiels :**
```html
<table class="tv-data-table">
  <tr data-rowid="...">
    <td>Prix</td>
    <td>2.850</td>
    <td>+0.88%</td>
    <td>+0.025</td>
    <td>2.875</td> <!-- High -->
    <td>2.820</td> <!-- Low -->
  </tr>
</table>
```

### 3. Métadonnées du Symbole

**Informations structurées :**
- **Symbole complet**: `NYMEX-T8C1!`
- **Nom**: "Natural Gas Futures"
- **Exchange**: NYMEX (New York Mercantile Exchange)
- **Type**: Futures Contract
- **Unité**: MMBtu (Million British Thermal Units)
- **Taille du contrat**: 10,000 MMBtu
- **Maturité**: T8C1 (déterminée par le code de maturité)

**Structure JSON potentielle (dans le HTML) :**
```javascript
window.__TV_DATA__ = {
  symbol: "NYMEX:T8C1!",
  name: "Natural Gas Futures",
  exchange: "NYMEX",
  type: "futures",
  unit: "MMBtu",
  contractSize: 10000,
  // ... autres métadonnées
}
```

### 4. Données de Prix en Temps Réel

**Format des prix :**
- Les prix sont généralement en format décimal (ex: `2.850`)
- Les variations peuvent être positives (+) ou négatives (-)
- Les pourcentages sont affichés avec le signe (ex: `+0.88%`)

**Extraction des prix :**
```javascript
// Exemple de parsing (basé sur commodityApi.ts)
const priceSelectors = [
  '.tv-symbol-price-quote__value',
  '[data-field="last_price"]',
  '.js-symbol-last',
  '.tv-symbol-header__price'
];

// Format attendu: "2.850" ou "2,850" (selon locale)
// Nécessite normalisation pour parsing numérique
```

### 5. Tableaux de Données (Data Tables)

**Structure des tableaux :**
```html
<table class="tv-data-table">
  <thead>
    <tr>
      <th>Symbole</th>
      <th>Prix</th>
      <th>%</th>
      <th>Change</th>
      <th>High</th>
      <th>Low</th>
      <th>Technical</th>
    </tr>
  </thead>
  <tbody>
    <tr class="tv-data-table__row" data-rowid="...">
      <td>
        <span class="symbol-name">NYMEX-T8C1!</span>
      </td>
      <td>2.850</td>
      <td class="positive">+0.88%</td>
      <td class="positive">+0.025</td>
      <td>2.875</td>
      <td>2.820</td>
      <td>Neutral</td>
    </tr>
  </tbody>
</table>
```

**Sélecteurs utilisés dans le code actuel :**
- `.tv-data-table__row` - Lignes du tableau
- `tr[data-rowid]` - Lignes avec ID de données
- `table tr` - Toutes les lignes de tableau (fallback)

### 6. Données JSON Embarquées

TradingView peut également embarquer des données dans des scripts JSON-LD ou dans des objets JavaScript globaux :

```html
<script type="application/json" id="__NEXT_DATA__">
{
  "props": {
    "pageProps": {
      "symbol": {
        "symbol": "NYMEX:T8C1!",
        "price": 2.850,
        "change": 0.025,
        "changePercent": 0.88,
        "high": 2.875,
        "low": 2.820,
        "volume": 123456,
        "openInterest": 789012
      }
    }
  }
}
</script>
```

### 7. Graphique et Données Historiques

**Structure du graphique :**
- TradingView utilise un widget de graphique interactif
- Les données historiques sont chargées via WebSocket ou API REST
- Les séries de prix sont dans des formats comme:
  - OHLC (Open, High, Low, Close)
  - Volume
  - Indicateurs techniques

**Sélecteurs du graphique :**
```html
<div class="tv-chart-container">
  <div id="tradingview_widget">
    <!-- Widget TradingView -->
  </div>
</div>
```

## Format des Données Extraites

### Structure Commodity (basée sur commodityApi.ts)

```typescript
interface Commodity {
  symbol: string;              // "NYMEX-T8C1!"
  name: string;                 // "Natural Gas Futures"
  price: number;                // 2.850
  percentChange: number;        // 0.88
  absoluteChange: number;       // 0.025
  high: number;                 // 2.875
  low: number;                  // 2.820
  technicalEvaluation: string;  // "Neutral" | "Positive" | "Negative"
  type: string;                 // "natural_gas"
  category: CommodityCategory;   // "energy"
}
```

## Méthodes d'Extraction Actuelles

### 1. Scraping HTML avec Puppeteer

**Processus :**
1. Navigation vers l'URL avec Puppeteer
2. Attente du chargement du contenu (6 secondes)
3. Extraction du HTML complet
4. Parsing avec `node-html-parser`
5. Recherche des sélecteurs CSS spécifiques

**Code actuel :**
```typescript
// api/tradingview/symbol/[symbol].js
const url = `https://www.tradingview.com/symbols/NYMEX-${symbol}/`;
await page.goto(url, { waitUntil: 'domcontentloaded' });
await new Promise(resolve => setTimeout(resolve, 6000));
const html = await page.content();
```

### 2. Parsing des Prix

**Logique de parsing (commodityApi.ts lignes 512-608) :**

```typescript
// 1. Recherche dans plusieurs sélecteurs
const priceSelectors = [
  '.tv-symbol-price-quote__value',
  '[data-field="last_price"]',
  '.js-symbol-last',
  '.tv-symbol-header__price'
];

// 2. Nettoyage du texte
priceText = priceText.replace(/\s*(USD|usd|$|€|EUR|eur)\s*/gi, '');
priceText = priceText.replace(/[^\d.,]/g, '');

// 3. Gestion des formats numériques
// Format US: "2,850.50" -> 2850.50
// Format EU: "2.850,50" -> 2850.50
// Format simple: "2.850" -> 2.850
```

### 3. Extraction des Variations

**Détection du signe :**
```typescript
// Vérification des classes CSS pour le signe
const isPercentNegative = percentCell.toString().includes('negative') || 
                         percentCell.toString().includes('down') || 
                         percentCell.toString().includes('red');

// Si négatif mais valeur positive, inverser
if (isPercentNegative && percentChange > 0) {
  percentChange = -percentChange;
}
```

## Données Spécifiques pour NYMEX-T8C1!

### Informations du Contrat

- **Symbole**: `NYMEX-T8C1!`
- **Commodité**: Natural Gas (Gaz Naturel)
- **Exchange**: NYMEX (New York Mercantile Exchange)
- **Unité**: MMBtu (Million British Thermal Units)
- **Taille du contrat**: 10,000 MMBtu
- **Code de maturité**: T8C1
  - T = Type de contrat
  - 8 = Année (2028)
  - C = Mois (C = Mars/March)
  - 1 = Série

### Données de Marché Typiques

```json
{
  "symbol": "NYMEX-T8C1!",
  "name": "Natural Gas Futures",
  "price": 2.850,
  "percentChange": 0.88,
  "absoluteChange": 0.025,
  "high": 2.875,
  "low": 2.820,
  "volume": 123456,
  "openInterest": 789012,
  "unit": "MMBtu",
  "contractSize": 10000,
  "maturity": "2028-03",
  "category": "energy",
  "type": "natural_gas"
}
```

## Recommandations pour l'Amélioration

### 1. Extraction des Métadonnées

**Améliorer l'extraction des informations du contrat :**
```typescript
// Extraire depuis le HTML ou JSON embarqué
const contractInfo = {
  unit: extractUnit(html),           // "MMBtu"
  contractSize: extractContractSize(html), // 10000
  maturity: parseMaturityCode("T8C1"), // "2028-03"
  exchange: "NYMEX"
};
```

### 2. Données Additionnelles

**Extraire également :**
- Volume échangé
- Open Interest (intérêt ouvert)
- Bid/Ask spread
- Timestamp de dernière mise à jour
- Données historiques (OHLC)

### 3. Gestion des Erreurs

**Améliorer la robustesse :**
- Vérifier la présence des éléments avant extraction
- Gérer les cas où les données ne sont pas encore chargées
- Implémenter des retry logic
- Logger les sélecteurs qui fonctionnent pour chaque symbole

### 4. Performance

**Optimisations possibles :**
- Réduire le temps d'attente si les données sont déjà chargées
- Utiliser des sélecteurs plus spécifiques
- Mettre en cache les métadonnées statiques (unité, taille de contrat)

## Structure JSON Recommandée

Pour une meilleure intégration, structurer les données comme suit :

```typescript
interface TradingViewSymbolData {
  // Identifiants
  symbol: string;              // "NYMEX-T8C1!"
  fullSymbol: string;          // "NYMEX:T8C1!"
  name: string;                 // "Natural Gas Futures"
  exchange: string;            // "NYMEX"
  
  // Prix et variations
  price: number;               // 2.850
  change: {
    absolute: number;          // 0.025
    percent: number;          // 0.88
    direction: 'up' | 'down' | 'neutral';
  };
  
  // Données de session
  session: {
    high: number;             // 2.875
    low: number;              // 2.820
    open: number;             // 2.825
    previousClose: number;    // 2.825
  };
  
  // Volume et intérêt
  volume: number;              // 123456
  openInterest?: number;       // 789012 (pour futures)
  
  // Métadonnées du contrat
  contract: {
    type: 'futures' | 'spot' | 'option';
    unit: string;              // "MMBtu"
    contractSize: number;      // 10000
    maturity: string;          // "2028-03"
    maturityCode: string;      // "T8C1"
  };
  
  // Évaluation technique
  technical: {
    evaluation: 'positive' | 'negative' | 'neutral';
    indicators?: {
      rsi?: number;
      macd?: number;
      // ... autres indicateurs
    };
  };
  
  // Métadonnées
  timestamp: string;           // ISO 8601
  lastUpdate: string;          // ISO 8601
  source: 'tradingview';
}
```

## Conclusion

La structure des données TradingView pour un symbole individuel comme NYMEX-T8C1! est principalement basée sur :

1. **HTML structuré** avec des classes CSS spécifiques
2. **Données JSON embarquées** dans des scripts
3. **Widgets JavaScript** pour les graphiques interactifs
4. **WebSockets** pour les mises à jour en temps réel

L'extraction actuelle via Puppeteer + HTML parsing fonctionne mais pourrait être améliorée en :
- Extrayant plus de métadonnées (unité, taille de contrat, maturité)
- Gérant mieux les formats numériques selon les locales
- Ajoutant la détection des données JSON embarquées
- Implémentant une extraction plus robuste des données de session

