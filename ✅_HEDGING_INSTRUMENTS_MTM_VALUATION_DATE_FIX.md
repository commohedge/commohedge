# ✅ HEDGING INSTRUMENTS MTM VALUATION DATE FIX

## 🎯 Problème Résolu

**Problème Principal** : Le MTM ne changeait pas quand l'utilisateur modifiait la `valuationDate`, rendant le système de valuation inutile.

**Cause Racine** : 3 problèmes majeurs dans la logique de calcul du MTM :

1. **Logique `initialPrice` Incorrecte** : Redondance dans la condition
2. **`calculateTodayPrice` Ignorait la `valuationDate`** : Utilisait `exportStrategyStartDate` pour les stratégies exportées
3. **Affichage Time to Maturity Incohérent** : Logique différente entre calcul et affichage

## 🔧 Solutions Implémentées

### **1. Correction de `calculateTodayPrice`**

**Avant** :
```typescript
// ❌ PROBLÈME : Les stratégies exportées ignoraient la valuationDate
if (isExportedStrategy && instrument.exportStrategyStartDate) {
  calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, instrument.exportStrategyStartDate);
} else {
  calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
}
```

**Après** :
```typescript
// ✅ CORRECTION : TOUJOURS utiliser la Valuation Date pour le calcul du todayPrice
const calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
console.log(`[DEBUG] ${instrument.id}: TODAY PRICE - Using Valuation Date ${valuationDate}: ${calculationTimeToMaturity.toFixed(4)}y`);
```

### **2. Correction de la Logique `initialPrice`**

**Avant** :
```typescript
// ❌ PROBLÈME : Logique redondante et incorrecte
const initialPrice = isExportedStrategy ? originalPrice : originalPrice;
```

**Après** :
```typescript
// ✅ CORRECTION : Logique correcte pour initialPrice
const isExportedStrategy = inst.exportSpotPrice && inst.exportTimeToMaturity;
// Pour les stratégies exportées : initialPrice = prix d'export (pour MTM=0 à l'export)
// Pour les stratégies manuelles : initialPrice = premium saisi par l'utilisateur
const initialPrice = isExportedStrategy ? originalPrice : (inst.premium || 0);
```

### **3. Correction de l'Affichage Time to Maturity**

**Avant** :
```typescript
// ❌ PROBLÈME : Logique complexe et incohérente
if (isExportedStrategy && instrument.exportStrategyStartDate) {
  timeToMaturity = calculateTimeToMaturity(instrument.maturity, instrument.exportStrategyStartDate);
} else {
  timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
}
```

**Après** :
```typescript
// ✅ CORRECTION : Pour l'affichage "Current", TOUJOURS utiliser la Valuation Date
timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
console.log(`[DEBUG] ${instrument.id}: CURRENT DISPLAY - Using Valuation Date ${valuationDate}: ${timeToMaturity.toFixed(4)}y`);
```

## 🎉 Résultats

### **✅ MTM Réactif à la Valuation Date**

- **Stratégies Exportées** : MTM change maintenant avec la `valuationDate`
- **Instruments Manuels** : MTM basé sur le `premium` saisi par l'utilisateur
- **Today Price** : Reflète toujours la valeur actuelle basée sur `valuationDate`

### **✅ Logique Unifiée**

- **Calcul de Pricing** : Utilise toujours `valuationDate`
- **Affichage Current** : Utilise toujours `valuationDate`
- **MTM Calculation** : Logique cohérente entre `totalMTM` et affichage tableau

### **✅ Comportement Attendu**

1. **Changement de `valuationDate`** → **Today Price change** → **MTM change**
2. **Stratégies Exportées** : MTM = 0 à l'export, puis évolue avec le temps
3. **Instruments Manuels** : MTM basé sur la différence entre Today Price et Premium

## 📊 Impact Technique

### **Avant la Correction**
```
valuationDate change → todayPrice unchanged → MTM unchanged ❌
```

### **Après la Correction**
```
valuationDate change → todayPrice changes → MTM changes ✅
```

## 🔍 Debug Logs Améliorés

Les logs de debug montrent maintenant :
```
[DEBUG] Instrument: TODAY PRICE - Using Valuation Date [date]: [TTM]y
[DEBUG] Instrument: CURRENT DISPLAY - Using Valuation Date [date]: [TTM]y
[DEBUG] Instrument: MTM Calculation - Initial: [price], Today: [price], MTM: [value]
```

## 🎯 Test de Validation

**Étapes de Test** :
1. Exporter une stratégie depuis Strategy Builder
2. Changer la `valuationDate` dans HedgingInstruments
3. Vérifier que le MTM change
4. Vérifier que le Time to Maturity "Current" change
5. Vérifier que le Today Price change

**Status** : ✅ **RÉSOLU** - MTM réactif aux changements de `valuationDate`
