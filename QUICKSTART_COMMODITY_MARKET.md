# ⚡ Quick Start - Commodity Market

Guide rapide pour démarrer avec le système de scraping de données commodités.

## 🚀 Démarrage Rapide (3 minutes)

### 1. Vérifier les dépendances

Les dépendances sont déjà installées dans `package.json`:
```json
{
  "@sparticuz/chromium": "^141.0.0",
  "puppeteer-core": "^24.25.0",
  "node-html-parser": "^7.0.1"
}
```

### 2. Démarrer en développement

```bash
# Démarrer le serveur
npm run dev
```

### 3. Accéder à la page

```
http://localhost:5173/commodity-market
```

**⚠️ Note**: Vous devez être connecté (ProtectedRoute)

---

## 📊 Tester les Endpoints API

### En développement local

```bash
# Health check
curl http://localhost:3000/api/health

# Scraper TradingView Metals
curl http://localhost:3000/api/tradingview/metals

# Scraper TradingView Agricultural
curl http://localhost:3000/api/tradingview/agricultural

# Scraper TradingView Energy
curl http://localhost:3000/api/tradingview/energy
```

### En production (après déploiement Vercel)

```bash
# Remplacer YOUR_DOMAIN par votre domaine Vercel
curl https://YOUR_DOMAIN.vercel.app/api/health
curl https://YOUR_DOMAIN.vercel.app/api/tradingview/metals
```

---

## 🎯 Fonctionnalités Principales

### 1. Visualiser les données commodités

La page affiche automatiquement:
- ✅ Métaux (Or, Argent, Cuivre, Aluminium, Cobalt)
- ✅ Produits agricoles (Maïs, Blé, Soja, Coton, Sucre)
- ✅ Énergie (Pétrole, Gaz naturel, Essence, Fioul)

### 2. Statistiques en temps réel

- **Total Tracked**: Nombre total de commodités
- **Gainers**: Commodités en hausse
- **Losers**: Commodités en baisse
- **Avg Change**: Changement moyen

### 3. Refresh des données

**Automatique**: Toutes les 5 minutes
**Manuel**: Cliquer sur le bouton "Refresh"

---

## 🔧 Configuration Rapide

### Vérifier `vercel.json`

```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

### Fichiers importants

```
✅ api/                                  # API endpoints
✅ src/services/commodityApi.ts          # Service de gestion des données
✅ src/services/puppeteerApi.ts          # Service de scraping
✅ src/pages/CommodityMarket.tsx         # Page UI
✅ vercel.json                           # Configuration Vercel
```

---

## 📝 Utilisation dans le Code

### Importer le service

```typescript
import { 
  fetchCommoditiesData, 
  refreshCommoditiesData,
  Commodity,
  CommodityCategory 
} from "@/services/commodityApi";
```

### Charger des données

```typescript
// Charger avec cache
const metals = await fetchCommoditiesData('metals');

// Forcer le refresh (sans cache)
const metals = await refreshCommoditiesData('metals');
```

### Gérer le cache

```typescript
import { clearCache, clearAllCache, getCacheInfo } from "@/services/commodityApi";

// Effacer le cache d'une catégorie
clearCache('metals');

// Effacer tout le cache
clearAllCache();

// Obtenir les infos du cache
const cacheInfo = getCacheInfo();
console.log(cacheInfo);
```

---

## 🐛 Debugging Rapide

### 1. Vérifier les logs console

Ouvrir la console du navigateur (F12):
```
🚀 Starting parallel data loading...
✅ All data loaded in 3421ms (3.4s)
```

### 2. Vérifier le cache

```javascript
// Dans la console du navigateur
localStorage.getItem('fx_commodities_cache_metals')
```

### 3. Nettoyer le cache si problème

```javascript
// Dans la console du navigateur
localStorage.clear()
```

### 4. Tester un endpoint directement

```bash
# Ouvrir dans le navigateur
http://localhost:3000/api/health
http://localhost:3000/api/tradingview/metals
```

---

## 🚨 Problèmes Courants

### Problème: "Failed to scrape"

**Solution**:
1. Vérifier que Puppeteer est bien installé
2. Vérifier les logs de l'endpoint
3. Tester avec un timeout plus long

### Problème: "No data available"

**Solution**:
1. Vérifier la connexion internet
2. Effacer le cache localStorage
3. Rafraîchir la page manuellement

### Problème: Lenteur de chargement

**Solution**:
1. Les données sont mises en cache (24h)
2. Premier chargement peut prendre 5-10s
3. Chargements suivants sont instantanés

---

## 📦 Déploiement Vercel

### 1. Prérequis
- Compte Vercel
- Projet lié à Git

### 2. Commandes

```bash
# Build local
npm run build

# Déployer
vercel --prod

# Vérifier les logs
vercel logs
```

### 3. Vérifications post-déploiement

```bash
# Tester les endpoints
curl https://YOUR_DOMAIN.vercel.app/api/health

# Accéder à la page
https://YOUR_DOMAIN.vercel.app/commodity-market
```

---

## 💡 Tips & Astuces

### Performance

1. **Cache activé par défaut**: Les données sont en cache pendant 24h
2. **Chargement parallèle**: Toutes les catégories se chargent en même temps
3. **Optimisations**: Images et CSS bloqués pendant le scraping

### Personnalisation

```typescript
// Changer la durée du cache
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 heures

// Changer l'intervalle de refresh auto
const interval = setInterval(() => {
  loadAllData();
}, 10 * 60 * 1000); // 10 minutes
```

### Ajouter une nouvelle catégorie

1. Créer l'endpoint dans `/api/tradingview/[category].js`
2. Ajouter au type `CommodityCategory` dans `commodityApi.ts`
3. Ajouter le parsing dans `getCommodityType()`
4. Ajouter l'onglet dans la page `CommodityMarket.tsx`

---

## 📚 Ressources

- **Documentation Puppeteer**: https://pptr.dev/
- **Vercel Functions**: https://vercel.com/docs/functions
- **TradingView**: https://www.tradingview.com/
- **Implementation Details**: Voir `COMMODITY_MARKET_SCRAPING_IMPLEMENTATION.md`

---

## ✅ Checklist de Vérification

Avant de considérer l'implémentation comme complète:

- [ ] Les endpoints API répondent (health check)
- [ ] La page se charge sans erreurs
- [ ] Les données s'affichent correctement
- [ ] Le refresh manuel fonctionne
- [ ] Le cache fonctionne
- [ ] Les statistiques s'affichent
- [ ] Les badges de prix sont corrects
- [ ] Le déploiement Vercel réussit

---

## 🎉 C'est Prêt !

Votre système de scraping est maintenant opérationnel avec:
- ✅ 7 endpoints API
- ✅ Scraping temps réel
- ✅ Interface moderne
- ✅ Cache optimisé
- ✅ Déploiement serverless

**Profitez des données commodités en temps réel !** 🚀

---

**Date**: October 21, 2025
**Version**: 1.0.0

