# ✅ HEDGING INSTRUMENTS TIME TO MATURITY STRATEGY BUILDER SYNC

## 🎯 Problème Résolu

**Problème** : Avec exactement les mêmes dates, il y avait une différence de 2 jours entre "Export" et "Current" dans le Time to Maturity.

**Cause Racine** : HedgingInstruments utilisait `valuationDate` comme date de référence, tandis que Strategy Builder utilise `strategyStartDate` (Hedging Start Date).

## 🔍 Analyse Approfondie

### **Logique Strategy Builder**
```typescript
// Dans Index.tsx - Strategy Builder
const startDate = new Date(params.strategyStartDate); // Hedging Start Date
const timeToMaturities = months.map(date => {
  const maturityDateStr = date.toISOString().split('T')[0];
  const valuationDateStr = startDate.toISOString().split('T')[0];
  return calculateTimeToMaturity(maturityDateStr, valuationDateStr);
});
```

### **Logique HedgingInstruments (Avant Correction)**
```typescript
// ❌ PROBLÈME : Utilisait valuationDate au lieu de strategyStartDate
const calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
```

### **Fonction calculateTimeToMaturity**
```typescript
export const calculateTimeToMaturity = (maturityDate: string, valuationDate: string): number => {
  const maturity = new Date(maturityDate + 'T24:00:00Z');  // Fin de journée
  const valuation = new Date(valuationDate + 'T00:00:00Z'); // Début de journée
  const diffTime = Math.abs(maturity.getTime() - valuation.getTime());
  return diffTime / (365.25 * 24 * 60 * 60 * 1000);
};
```

## 🔧 Solution Implémentée

### **1. Correction du Calcul de Pricing**

**Avant** :
```typescript
// ❌ PROBLÈME : Toujours utiliser valuationDate
const calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
```

**Après** :
```typescript
// ✅ CORRECTION : Utiliser EXACTEMENT la même logique que Strategy Builder
const isExportedStrategy = instrument.exportSpotPrice && instrument.exportTimeToMaturity;

if (isExportedStrategy && instrument.exportStrategyStartDate) {
  // Pour les stratégies exportées, utiliser la même date de référence que Strategy Builder
  calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, instrument.exportStrategyStartDate);
} else {
  // Pour les instruments manuels, utiliser la Valuation Date
  calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
}
```

### **2. Correction de l'Affichage Time to Maturity**

**Avant** :
```typescript
// ❌ PROBLÈME : Toujours utiliser valuationDate pour l'affichage
timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
```

**Après** :
```typescript
// ✅ CORRECTION : Utiliser EXACTEMENT la même logique que Strategy Builder pour l'affichage
const isExportedStrategy = instrument.exportSpotPrice && instrument.exportTimeToMaturity;

if (isExportedStrategy && instrument.exportStrategyStartDate) {
  // Pour les stratégies exportées, utiliser la même logique que Strategy Builder
  timeToMaturity = calculateTimeToMaturity(instrument.maturity, instrument.exportStrategyStartDate);
} else {
  // Pour les instruments manuels, utiliser la Valuation Date
  timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
}
```

## 🎉 Résultats

### **✅ Cohérence Parfaite**

- **Stratégies Exportées** : Utilisent `exportStrategyStartDate` (même que Strategy Builder)
- **Instruments Manuels** : Utilisent `valuationDate` (logique de valuation)
- **Time to Maturity** : Identique entre Export et Current pour les stratégies exportées

### **✅ Logique Unifiée**

1. **Strategy Builder** : `strategyStartDate` → `calculateTimeToMaturity`
2. **HedgingInstruments Export** : `exportStrategyStartDate` → `calculateTimeToMaturity`
3. **HedgingInstruments Manual** : `valuationDate` → `calculateTimeToMaturity`

### **✅ Même Fonction de Calcul**

- **Même fonction** : `calculateTimeToMaturity` de `Index.tsx`
- **Même logique** : `T24:00:00Z` pour maturity, `T00:00:00Z` pour valuation
- **Même formule** : `diffTime / (365.25 * 24 * 60 * 60 * 1000)`

## 📊 Comparaison Avant/Après

| Scénario | Avant | Après |
|----------|-------|-------|
| **Stratégie Exportée** | `valuationDate` vs `exportStrategyStartDate` | `exportStrategyStartDate` vs `exportStrategyStartDate` ✅ |
| **Instrument Manuel** | `valuationDate` vs `valuationDate` | `valuationDate` vs `valuationDate` ✅ |
| **Différence Export/Current** | 2 jours | 0 jours ✅ |

## 🔍 Debug Logs Améliorés

Les logs de debug montrent maintenant :
```
[DEBUG] Instrument: EXPORTED STRATEGY - Using Strategy Builder logic from [exportStrategyStartDate]: [TTM]y
[DEBUG] Instrument: EXPORTED STRATEGY DISPLAY - Using Strategy Builder logic from [exportStrategyStartDate]: [TTM]y
[DEBUG] Instrument: Time to Maturity - Current: [TTM]y, Export: [TTM]y
```

## 🎯 Test de Validation

**Étapes de Test** :
1. Exporter une stratégie depuis Strategy Builder
2. Vérifier que Export et Current affichent le même Time to Maturity
3. Vérifier que le Today Price est cohérent
4. Vérifier que le MTM est calculé correctement

**Status** : ✅ **RÉSOLU** - Time to Maturity parfaitement synchronisé avec Strategy Builder
