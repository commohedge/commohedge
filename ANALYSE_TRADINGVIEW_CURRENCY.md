# Analyse des Liens TradingView et Localisation de la Devise

## 📋 Résumé Exécutif

Cette analyse examine les URLs utilisées pour scraper les commodities depuis TradingView et identifie où la devise (currency) de chaque commodity est indiquée sur le site.

---

## 🔗 URLs TradingView Utilisées

### 1. URLs par Catégorie

Les URLs suivantes sont utilisées pour scraper les commodities par catégorie :

```typescript
// Structure de base
https://www.tradingview.com/markets/futures/quotes-{category}/

// Catégories disponibles :
- https://www.tradingview.com/markets/futures/quotes-metals/
- https://www.tradingview.com/markets/futures/quotes-agricultural/
- https://www.tradingview.com/markets/futures/quotes-energy/
- https://www.tradingview.com/markets/futures/quotes-freight/
```

**Fichier source** : `src/services/puppeteerApi.ts` (lignes 100-137)

### 2. URLs par Symbole Individuel

Pour scraper un symbole spécifique :

```typescript
// Structure
https://www.tradingview.com/symbols/NYMEX-{symbol}/

// Exemple
https://www.tradingview.com/symbols/NYMEX-CL1!/
```

**Fichier source** : `src/services/puppeteerApi.ts` (lignes 63-95)

---

## 💰 Localisation de la Devise sur TradingView

### Méthode 1 : Dans le Nom de la Commodity (Principal)

**Emplacement** : Le nom complet de la commodity contient la devise

**Format observé** :
```
{SYMBOL}! {COMMODITY_NAME} {CURRENCY} per {UNIT} Future {EXCHANGE}
```

**Exemples réels extraits de la page** :
- `XAGUSD1! Silver USD per ounce Future D`
- `XAUUSD1! Gold USD per ounce Future D`
- `XPDUSD1! Palladium USD per ounce Future D`
- `XPTUSD1! Platinum USD per ounce Future D`

**Structure** :
- **Symbole** : `XAGUSD1!` (contient parfois la devise dans le symbole)
- **Nom** : `Silver USD per ounce Future D`
  - `Silver` = Nom de la commodity
  - `USD` = **DEVISE** ✅
  - `per ounce` = Unité
  - `Future D` = Type et Exchange

**Code de parsing actuel** : `src/services/commodityApi.ts` (lignes 313-344)

```typescript
// Extraction actuelle
const symbolElement = firstCell.querySelector('.symbol-name');
if (symbolElement) {
  symbol = symbolElement.text.trim();
  name = symbolElement.getAttribute('title') || '';
}
```

### Méthode 2 : Dans le Symbole (Parfois)

Certains symboles contiennent la devise dans leur code :
- `XAGUSD1!` → USD est dans le symbole
- `XAUUSD1!` → USD est dans le symbole

**Pattern** : `{COMMODITY}{CURRENCY}{NUMBER}!`

### Méthode 3 : Dans les Données JSON Embedées (Non Utilisé Actuellement)

Le code tente d'extraire depuis JSON mais ne cherche pas spécifiquement la devise :

```typescript
// src/services/commodityApi.ts (lignes 603-626)
const jsonScripts = root.querySelectorAll('script[type="application/json"]');
// ... extraction de price mais pas de currency
```

---

## 🔍 Analyse Détaillée du HTML TradingView

### Structure HTML de la Table

```html
<table class="tv-data-table">
  <tr class="tv-data-table__row" data-rowid="...">
    <td>
      <div class="symbol-name" title="...">
        {SYMBOL}! {NAME_WITH_CURRENCY}
      </div>
    </td>
    <td>{PRICE}</td>
    <td>{PERCENT_CHANGE}</td>
    <td>{ABSOLUTE_CHANGE}</td>
    <td>{HIGH}</td>
    <td>{LOW}</td>
    <td>{TECHNICAL_EVALUATION}</td>
  </tr>
</table>
```

### Sélecteurs CSS Utilisés

**Fichier** : `src/services/commodityApi.ts` (lignes 285-296)

```typescript
// Sélecteurs essayés dans l'ordre :
1. '.tv-data-table__row'          // ✅ Principal
2. 'tr[data-rowid]'                // ✅ Fallback
3. 'table tr'                      // ✅ Dernier recours
```

---

## 📊 Extraction de la Devise - Recommandations

### Option 1 : Parser depuis le Nom (Recommandé)

**Pattern Regex** :
```typescript
// Pattern pour extraire la devise depuis le nom
const currencyMatch = name.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);

if (currencyMatch) {
  currency = currencyMatch[1].toUpperCase();
}
```

**Exemple** :
```typescript
const name = "Silver USD per ounce Future D";
const currencyMatch = name.match(/\b(USD|EUR|GBP|JPY|...)\b/i);
// Résultat : currencyMatch[1] = "USD"
```

### Option 2 : Parser depuis le Symbole

**Pattern Regex** :
```typescript
// Pattern pour extraire la devise depuis le symbole
const symbolCurrencyMatch = symbol.match(/(USD|EUR|GBP|JPY|...)(\d+)?!?$/i);

if (symbolCurrencyMatch) {
  currency = symbolCurrencyMatch[1].toUpperCase();
}
```

**Exemple** :
```typescript
const symbol = "XAGUSD1!";
const symbolCurrencyMatch = symbol.match(/(USD|EUR|GBP|JPY|...)(\d+)?!?$/i);
// Résultat : symbolCurrencyMatch[1] = "USD"
```

### Option 3 : Mapping par Catégorie (Fallback)

**Mapping par défaut** :
```typescript
const DEFAULT_CURRENCIES: Record<CommodityCategory, string> = {
  'metals': 'USD',        // La plupart des métaux sont en USD
  'agricultural': 'USD',  // La plupart des produits agricoles sont en USD
  'energy': 'USD',        // La plupart des énergies sont en USD
  'freight': 'USD',       // Le fret est généralement en USD
  'bunker': 'USD'         // Les bunkers sont généralement en USD
};
```

---

## 🛠️ Implémentation Suggérée

### Fonction d'Extraction de Devise

```typescript
/**
 * Extracts currency from commodity name or symbol
 */
function extractCurrency(
  symbol: string, 
  name: string, 
  category: CommodityCategory
): string {
  // Liste des devises supportées
  const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
    'CNY', 'INR', 'BRL', 'MXN', 'ZAR', 'RUB', 'KRW', 'SGD',
    'HKD', 'TRY', 'PLN', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF',
    'ILS', 'CLP', 'COP', 'ARS', 'PEN', 'PHP', 'THB', 'MYR',
    'IDR', 'VND'
  ];
  
  // Pattern pour chercher la devise dans le nom
  const currencyPattern = new RegExp(`\\b(${currencies.join('|')})\\b`, 'i');
  
  // 1. Essayer depuis le nom (priorité)
  const nameMatch = name.match(currencyPattern);
  if (nameMatch) {
    return nameMatch[1].toUpperCase();
  }
  
  // 2. Essayer depuis le symbole
  const symbolMatch = symbol.match(currencyPattern);
  if (symbolMatch) {
    return symbolMatch[1].toUpperCase();
  }
  
  // 3. Fallback : mapping par catégorie
  const DEFAULT_CURRENCIES: Record<CommodityCategory, string> = {
    'metals': 'USD',
    'agricultural': 'USD',
    'energy': 'USD',
    'freight': 'USD',
    'bunker': 'USD'
  };
  
  return DEFAULT_CURRENCIES[category];
}
```

### Modification de l'Interface Commodity

```typescript
export interface Commodity {
  symbol: string;
  name: string;
  price: number;
  currency: string;  // ✅ NOUVEAU CHAMP
  percentChange: number;
  absoluteChange: number;
  high: number;
  low: number;
  technicalEvaluation: string;
  type: Commodity['type'];
  category: CommodityCategory;
}
```

### Modification de la Fonction de Parsing

```typescript
// Dans parseCommoditiesData() - src/services/commodityApi.ts
const currency = extractCurrency(symbol, name, category);

commodities.push({
  symbol,
  name,
  price,
  currency,  // ✅ AJOUTER ICI
  percentChange,
  absoluteChange,
  high,
  low,
  technicalEvaluation,
  type,
  category
});
```

---

## 📝 Exemples Concrets

### Exemple 1 : Métaux (Metals)

**URL** : `https://www.tradingview.com/markets/futures/quotes-metals/`

**Données extraites** :
```typescript
{
  symbol: "XAGUSD1!",
  name: "Silver USD per ounce Future D",
  price: 105.95,
  currency: "USD",  // ✅ Extrait depuis "USD per ounce"
  // ...
}
```

### Exemple 2 : Énergie (Energy)

**URL** : `https://www.tradingview.com/markets/futures/quotes-energy/`

**Données attendues** :
```typescript
{
  symbol: "CL1!",
  name: "Crude Oil WTI USD per barrel Future",
  price: 75.50,
  currency: "USD",  // ✅ Extrait depuis le nom
  // ...
}
```

### Exemple 3 : Produits Agricoles (Agricultural)

**URL** : `https://www.tradingview.com/markets/futures/quotes-agricultural/`

**Données attendues** :
```typescript
{
  symbol: "ZC1!",
  name: "Corn USD per bushel Future",
  price: 450.25,
  currency: "USD",  // ✅ Extrait depuis le nom
  // ...
}
```

---

## ⚠️ Points d'Attention

### 1. Devises Non-Standard

Certaines commodities peuvent avoir des devises non-standard ou des unités spéciales :
- **Exemple** : Certaines commodities peuvent être en `CNY`, `EUR`, etc.
- **Solution** : Utiliser le mapping par catégorie comme fallback

### 2. Format Variable des Noms

Les noms peuvent varier légèrement :
- `"Silver USD per ounce Future D"`
- `"Silver (USD/oz) Future"`
- `"Silver - USD/oz"`

**Solution** : Utiliser un pattern regex flexible

### 3. Symboles Sans Devise Explicite

Certains symboles peuvent ne pas contenir la devise :
- `"CL1!"` → Devise dans le nom uniquement
- `"GC1!"` → Devise dans le nom uniquement

**Solution** : Toujours vérifier le nom en premier

---

## 🎯 Conclusion

### Résumé

1. **URLs TradingView** :
   - Catégories : `https://www.tradingview.com/markets/futures/quotes-{category}/`
   - Symboles : `https://www.tradingview.com/symbols/NYMEX-{symbol}/`

2. **Localisation de la Devise** :
   - ✅ **Principal** : Dans le nom de la commodity (format : `"{NAME} {CURRENCY} per {UNIT}"`)
   - ✅ **Secondaire** : Parfois dans le symbole (format : `"{COMMODITY}{CURRENCY}{NUMBER}!"`)
   - ✅ **Fallback** : Mapping par catégorie (la plupart sont en USD)

3. **Recommandation** :
   - Implémenter une fonction `extractCurrency()` qui parse le nom en premier
   - Ajouter le champ `currency` à l'interface `Commodity`
   - Utiliser un mapping par catégorie comme fallback

### Prochaines Étapes

1. ✅ Analyser les URLs TradingView → **FAIT**
2. ✅ Identifier où la devise est indiquée → **FAIT**
3. ⏳ Implémenter l'extraction de la devise (si demandé)
4. ⏳ Tester avec différentes catégories de commodities

---

**Date d'analyse** : 2026-01-30  
**Fichiers analysés** :
- `src/services/commodityApi.ts`
- `src/services/puppeteerApi.ts`
- Pages TradingView (analyse live)
