# ✅ HEDGING INSTRUMENTS TIME TO MATURITY FIX

## 🎯 Problème Résolu

**Problème** : Après l'export d'une stratégie depuis Strategy Builder, le Time to Maturity affiché dans HedgingInstruments montrait des valeurs différentes entre "Export" et "Current", même si la stratégie venait d'être exportée.

**Cause** : La logique de calcul du Time to Maturity utilisait des dates de référence différentes :
- **Export** : Calculé avec la date de stratégie de Strategy Builder
- **Current** : Calculé avec la date de valuation actuelle

## 🔧 Solution Implémentée

### 1. **Cohérence de Calcul du Time to Maturity**

**Avant** :
```typescript
// Dans calculateTodayPrice()
const calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);

// Dans l'affichage du tableau
timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
```

**Après** :
```typescript
// ✅ CORRECTION : Utiliser la même logique que Strategy Builder
const isExportedStrategy = instrument.exportSpotPrice && instrument.exportTimeToMaturity;

if (isExportedStrategy && instrument.exportStrategyStartDate) {
  // Pour les stratégies exportées, utiliser la même logique que Strategy Builder
  calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, instrument.exportStrategyStartDate);
} else {
  // Pour les instruments manuels, utiliser la Valuation Date
  calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
}
```

### 2. **Logique Unifiée**

- **Stratégies Exportées** : Utilisent la même date de référence que Strategy Builder (`exportStrategyStartDate`)
- **Instruments Manuels** : Utilisent la date de valuation actuelle
- **Cohérence** : Export et Current utilisent maintenant la même logique de calcul

### 3. **Amélioration de l'Affichage**

Le Time to Maturity affiché dans le tableau utilise maintenant la même logique que le calcul de pricing, garantissant la cohérence entre :
- L'affichage "Current" dans le tableau
- Le calcul de pricing dans `calculateTodayPrice()`
- Les valeurs d'export depuis Strategy Builder

## 🎉 Résultat

✅ **Time to Maturity Cohérent** : Export et Current affichent maintenant les mêmes valeurs pour les stratégies exportées

✅ **Logique Unifiée** : Même calcul que Strategy Builder pour les stratégies exportées

✅ **Pricing Correct** : Le calcul de pricing utilise la même logique de Time to Maturity

✅ **MTM Précis** : Le Mark-to-Market est maintenant calculé avec la cohérence temporelle

## 📊 Impact

- **Stratégies Exportées** : Time to Maturity identique entre Export et Current
- **Instruments Manuels** : Time to Maturity basé sur la date de valuation
- **Pricing Unifié** : Même logique de calcul partout
- **MTM Correct** : Mark-to-Market précis avec la cohérence temporelle

## 🔍 Debug Logs

Les logs de debug montrent maintenant :
```
[DEBUG] Instrument: EXPORTED STRATEGY - Using Strategy Builder logic from [date]: [TTM]y
[DEBUG] Instrument: Time to Maturity - Current: [TTM]y, Export: [TTM]y
```

**Status** : ✅ **RÉSOLU** - Time to Maturity cohérent entre Export et Current pour les stratégies exportées
