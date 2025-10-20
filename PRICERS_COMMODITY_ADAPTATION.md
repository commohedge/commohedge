# 🎯 ADAPTATION PRICERS : FX → COMMODITY

## 📋 **RÉSUMÉ DES MODIFICATIONS**

La page **Pricers** a été entièrement adaptée pour les **commodities** au lieu des devises FX.

---

## 🔄 **CHANGEMENTS PRINCIPAUX**

### **1️⃣ Interface et Labels**

| Élément | Avant (FX) | Après (Commodity) |
|---------|------------|-------------------|
| **Titre** | "FX Pricers" | "Commodity Pricers" |
| **Description** | "Advanced pricing engine..." | "Advanced commodity pricing engine..." |
| **Sélecteur** | "Currency Pair" | "Commodity" |
| **Données** | EUR/USD, GBP/USD | WTI, GOLD, CORN, etc. |
| **Default** | EUR/USD | WTI |

### **2️⃣ Paramètres de Pricing**

| Paramètre | Avant (FX) | Après (Commodity) |
|-----------|------------|-------------------|
| **Rate 1** | Domestic Rate (r_d) | Risk-free Rate (r) |
| **Rate 2** | Foreign Rate (r_f) | Storage Cost |
| **Rate 3** | - | Convenience Yield |
| **Spot Price** | 1.1000 (EUR/USD) | 75.50 (WTI) |
| **Volatility** | 15% (FX typical) | 25% (Commodity typical) |

### **3️⃣ Modèles de Pricing**

| Type d'Option | Avant (FX) | Après (Commodity) |
|---------------|------------|-------------------|
| **Vanilla** | Garman-Kohlhagen | Black-76 ⭐ |
| **Forward** | FX Forward | Commodity Forward |
| **Barrier** | Garman-Kohlhagen | Black-76 |
| **Digital** | Monte Carlo | Monte Carlo ✓ |
| **Swap** | FX Swap | Commodity Swap |

---

## 🧮 **CALCULS ADAPTÉS**

### **Forward Pricing**

```typescript
// AVANT (FX)
F = S * exp((r_d - r_f) * t)

// APRÈS (Commodity)
F = S * exp(b * t)
où b = r + storage - convenience
```

### **Option Pricing**

```typescript
// AVANT (FX)
Garman-Kohlhagen: C = S*exp(-r_f*t)*N(d1) - K*exp(-r_d*t)*N(d2)

// APRÈS (Commodity)
Black-76: C = exp(-r*t) * [F*N(d1) - K*N(d2)]
où F = S * exp(b*t)
```

### **Cost of Carry**

```typescript
// Nouveau concept pour commodities
const calculateCostOfCarry = () => {
  const r = getRiskFreeRate();        // 5%
  const storage = getStorageCost();   // 2%
  const convenience = getConvenienceYield(); // 1%
  return r + storage - convenience;   // b = 6%
};
```

---

## 🎨 **INTERFACE UTILISATEUR**

### **Nouveaux Champs de Saisie**

```typescript
// Risk-free Rate
<Label>Risk-free Rate (%)</Label>
<Input value={pricingInputs.interestRate} />

// Storage Cost  
<Label>Storage Cost (%)</Label>
<Input value={pricingInputs.storageCost} />

// Convenience Yield
<Label>Convenience Yield (%)</Label>
<Input value={pricingInputs.convenienceYield} />
```

### **Affichage des Paramètres**

```typescript
// Dashboard des paramètres
<div>Risk-free Rate: {pricingInputs.interestRate}%</div>
<div>Storage Cost: {pricingInputs.storageCost}%</div>
<div>Convenience Yield: {pricingInputs.convenienceYield}%</div>
```

---

## 📊 **DONNÉES COMMODITY**

### **Commodities Disponibles**

```typescript
// Energy
WTI: $75.50/BBL
BRENT: $79.80/BBL
NATGAS: $3.20/MMBTU

// Metals  
GOLD: $2000.00/OZ
SILVER: $25.50/OZ
COPPER: $8500.00/MT

// Agriculture
CORN: $6.50/BU
WHEAT: $7.20/BU
SOYBEAN: $13.50/BU

// Livestock
CATTLE: $180.00/CWT
HOGS: $95.00/CWT
```

### **Catégories**

- ⚡ **Energy**: WTI, BRENT, NATGAS
- 🔩 **Metals**: GOLD, SILVER, COPPER  
- 🌾 **Agriculture**: CORN, WHEAT, SOYBEAN
- 🐄 **Livestock**: CATTLE, HOGS

---

## 🔧 **FONCTIONS HELPER AJOUTÉES**

```typescript
// Helper functions for commodity pricing
const getRiskFreeRate = () => pricingInputs.interestRate / 100;
const getStorageCost = () => pricingInputs.storageCost / 100;
const getConvenienceYield = () => pricingInputs.convenienceYield / 100;
const calculateCostOfCarry = () => getRiskFreeRate() + getStorageCost() - getConvenienceYield();
```

---

## 📈 **EXEMPLES DE CALCULS**

### **WTI Call Option**

```typescript
// Paramètres
S = 75.50 (WTI spot)
K = 80.00 (strike)
r = 5% (risk-free rate)
storage = 2% (storage cost)
convenience = 1% (convenience yield)
t = 0.25 (3 months)
σ = 25% (volatility)

// Cost of carry
b = 5% + 2% - 1% = 6%

// Forward
F = 75.50 * exp(0.06 * 0.25) = 76.64

// Black-76 Call
C = exp(-0.05 * 0.25) * [76.64 * N(d1) - 80.00 * N(d2)]
```

---

## ✅ **VALIDATION**

### **Tests Effectués**

```bash
✅ 0 erreurs de linting
✅ 0 erreurs TypeScript
✅ Interface adaptée (titre, labels, sélecteurs)
✅ Paramètres commodity (r, storage, convenience)
✅ Calculs Black-76 avec cost of carry
✅ Forward pricing commodity
✅ Données commodity (WTI, GOLD, etc.)
✅ Helper functions ajoutées
```

### **Fonctionnalités Vérifiées**

- ✅ Sélection de commodity (WTI, GOLD, CORN, etc.)
- ✅ Paramètres de pricing (Risk-free Rate, Storage Cost, Convenience Yield)
- ✅ Calculs d'options (Call, Put, Barrier, Digital)
- ✅ Forward pricing avec cost of carry
- ✅ Affichage des résultats et grecques
- ✅ Payoff chart avec données commodity

---

## 🚀 **UTILISATION**

### **Accès à la Page**

```bash
cd Fx_commo_Pricers
npm run dev
```

➡️ **http://localhost:8080/pricers**

### **Workflow Typique**

1. **Sélectionner** une commodity (WTI, GOLD, etc.)
2. **Configurer** les paramètres (Risk-free Rate, Storage Cost, Convenience Yield)
3. **Choisir** le type d'instrument (Call, Put, Forward, etc.)
4. **Ajuster** le strike et la volatilité
5. **Calculer** le prix et les grecques
6. **Visualiser** le payoff chart

---

## 📚 **DOCUMENTATION LIÉE**

- `Index.tsx` : Strategy Builder adapté
- `HedgingInstruments.tsx` : Instruments de couverture
- `CommodityPricingModels.ts` : Modèles Black-76
- `PricingService.ts` : Service de pricing

---

**Date** : Aujourd'hui  
**Version** : 2.6  
**Statut** : ✅ **PRICERS COMMODITY OPÉRATIONNEL !**

**La page Pricers est maintenant entièrement adaptée pour les commodities avec les modèles Black-76 !** 🎉⚡🔩🌾🐄
