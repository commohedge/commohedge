# Comparaison des Fonctions de Pricing - Options avec Barrières

## 📊 Analyse : Forward Price vs Strike pour les Options avec Barrières

### 🔍 Question Principale
**Les options avec barrières utilisent-elles le forward price ou le strike pour le pricing ?**

---

## 1️⃣ Strategy Builder (Index.tsx)

### A. Calcul des Barrières
**Fichier**: `src/pages/Index.tsx` (lignes 3469-3477)

```typescript
// Calcul des barrières - BASÉ SUR SPOT PRICE
const barrier = option.barrierType === 'percent' ? 
  params.spotPrice * (option.barrier / 100) :  // ✅ Calculé avec spotPrice
  option.barrier;

const secondBarrier = option.type.includes('double') ? 
  (option.barrierType === 'percent' ? 
    params.spotPrice * (option.secondBarrier / 100) :  // ✅ Calculé avec spotPrice
    option.secondBarrier) : 
  undefined;
```

**Observation**: Les barrières sont calculées avec `params.spotPrice`, pas avec le forward price.

### B. Pricing des Options avec Barrières
**Fichier**: `src/pages/Index.tsx` (lignes 3487-3498)

```typescript
if (barrierPricingModel === 'closed-form') {
  price = calculateBarrierOptionClosedForm(
    option.type,
    forward, // ✅ Forward price utilisé comme S (sous-jacent)
    strike,  // Strike price
    getRiskFreeRate(params),
    t,
    effectiveSigma,
    barrier,      // ⚠️ Barrière calculée avec spotPrice
    secondBarrier // ⚠️ Barrière calculée avec spotPrice
  );
}
```

**Observation**: 
- ✅ Le **forward price** est utilisé comme `S` (prix sous-jacent) dans la fonction de pricing
- ⚠️ Mais les **barrières** sont calculées avec le **spot price**

### C. Fonction de Pricing (PricingService.ts)
**Fichier**: `src/services/PricingService.ts` (lignes 137-244)

```typescript
export function calculateBarrierOptionClosedForm(
  optionType: string,
  S: number,        // ✅ Reçoit le forward price
  K: number,        // Strike
  r_d: number,
  t: number,
  sigma: number,
  barrier: number,  // ⚠️ Barrière calculée avec spot
  secondBarrier?: number,
  ...
): number {
  const X = K;      // Strike price
  const H = barrier; // Barrière
  
  // Comparaisons utilisées pour déterminer le TypeFlag
  // ✅ Utilise S (forward) pour comparer avec H (barrière)
  if (isCall && isKnockin && H < S) {  // ✅ Compare H (spot-based) avec S (forward)
    TypeFlag = "cdi";
  } else if (isCall && isKnockin && H > S) {
    TypeFlag = "cui";
  }
  // ... autres comparaisons H vs S
  
  // Calculs des formules analytiques
  const X1 = Math.log(S / X) / (v * Math.sqrt(T)) + ...;  // ✅ Utilise S (forward)
  const X2 = Math.log(S / H) / (v * Math.sqrt(T)) + ...;  // ✅ Utilise S (forward) et H (barrière)
  const y1 = Math.log(H ** 2 / (S * X)) / (v * Math.sqrt(T)) + ...;  // ✅ Utilise S (forward)
  
  // Formules de pricing
  const f1 = phi * S * Math.exp((b - r) * T) * CND(...);  // ✅ Utilise S (forward)
  const f3 = phi * S * Math.exp((b - r) * T) * (H / S) ** (2 * (mu + 1)) * CND(...);  // ✅ Utilise S (forward) et H
}
```

**Observation Critique**:
- ✅ La fonction utilise **S (forward price)** pour tous les calculs
- ⚠️ Mais **H (barrière)** est calculée avec le **spot price**
- ⚠️ **Incohérence potentielle**: Comparaison entre barrière (spot-based) et forward price

---

## 2️⃣ Hedging Instruments (HedgingInstruments.tsx)

### A. Calcul du Forward Price
**Fichier**: `src/pages/HedgingInstruments.tsx` (lignes 569-582)

```typescript
// Calcul du forward price
let S;
if (isExportedStrategy && instrument.exportForwardPrice && 
    Math.abs(calculationTimeToMaturity - (instrument.exportTimeToMaturity || 0)) < 0.0001 && 
    !useCurrentParams) {
  S = instrument.exportForwardPrice;  // ✅ Utilise forward d'export
} else {
  S = spotRate * Math.exp(r_d * calculationTimeToMaturity);  // ✅ Calcule forward: S * e^(r*t)
}
```

**Observation**: Le forward price `S` est correctement calculé.

### B. Calcul des Barrières
**Fichier**: `src/pages/HedgingInstruments.tsx` (lignes 738-756)

```typescript
let calculatedBarrier = instrument.barrier || 0;
let calculatedSecondBarrier = instrument.secondBarrier;

// Si l'instrument a des données d'export et que le spot price a changé, recalculer les barrières
if (instrument.originalComponent?.barrierType === 'percent' && instrument.exportSpotPrice) {
  const exportSpotPrice = instrument.exportSpotPrice;
  const currentSpotPrice = spotRate;  // ✅ Utilise spotRate
  
  if (Math.abs(exportSpotPrice - currentSpotPrice) > 0.0001) {
    const spotRatio = currentSpotPrice / exportSpotPrice;
    calculatedBarrier = (instrument.barrier || 0) * spotRatio;  // ⚠️ Recalculé avec spotRatio
    if (instrument.secondBarrier) {
      calculatedSecondBarrier = instrument.secondBarrier * spotRatio;  // ⚠️ Recalculé avec spotRatio
    }
  }
}
```

**Observation**: 
- Les barrières sont recalculées avec le **spot price** (spotRatio)
- Pas de recalcul basé sur le forward price

### C. Pricing des Options avec Barrières
**Fichier**: `src/pages/HedgingInstruments.tsx` (lignes 818-832)

```typescript
// ✅ OPTIONS AVEC BARRIÈRES ET DIGITALES
price = calculateOptionPrice(
  mappedType,
  S, // ✅ Forward price (comme Strategy Builder)
  K,
  r_d,
  r_d,
  calculationTimeToMaturity,
  sigma,
  calculatedBarrier,      // ⚠️ Barrière calculée avec spot
  calculatedSecondBarrier, // ⚠️ Barrière calculée avec spot
  instrument.rebate || 1,
  barrierOptionSimulations || 1000
);
```

**Observation**: 
- ✅ Utilise **S (forward price)** comme Strategy Builder
- ⚠️ Mais les barrières sont calculées avec le **spot price**

### D. Vérification des Barrières (Avant Pricing)
**Fichier**: `src/pages/HedgingInstruments.tsx` (lignes 604-663)

```typescript
// Pour les options à barrière, vérifier si le spot actuel a franchi les barrières
if (optionType.includes('knock') || optionType.includes('barrier')) {
  const barrier = instrument.barrier;
  const secondBarrier = instrument.secondBarrier;
  
  if (barrier) {
    console.log(`Barrier analysis - spot=${spotRate.toFixed(4)}, barrier=${barrier.toFixed(4)}`);
    
    // Comparaisons utilisent spotRate (spot price), pas S (forward)
    if (optionType.includes('call')) {
      barrierCrossed = spotRate >= barrier;  // ⚠️ Compare spot avec barrière
    } else {
      barrierCrossed = spotRate <= barrier;  // ⚠️ Compare spot avec barrière
    }
  }
}
```

**Observation Critique**:
- ⚠️ La vérification des barrières utilise `spotRate` (spot price)
- ⚠️ Mais le pricing utilise `S` (forward price)
- ⚠️ **Incohérence**: Vérification avec spot, pricing avec forward

---

## 3️⃣ Comparaison Détaillée

### Tableau Comparatif

| Aspect | Strategy Builder | Hedging Instruments | Cohérence |
|--------|-----------------|---------------------|-----------|
| **Prix sous-jacent (S)** | ✅ Forward price | ✅ Forward price | ✅ **COHÉRENT** |
| **Strike (K)** | ✅ Strike price | ✅ Strike price | ✅ **COHÉRENT** |
| **Calcul des barrières** | ⚠️ Basé sur spotPrice | ⚠️ Basé sur spotRate | ⚠️ **INCOHÉRENT** |
| **Comparaison H vs S** | ⚠️ H (spot) vs S (forward) | ⚠️ H (spot) vs S (forward) | ⚠️ **INCOHÉRENT** |
| **Vérification barrières** | N/A (dans pricing) | ⚠️ Utilise spotRate | ⚠️ **INCOHÉRENT** |

### Problème Identifié

**🔴 INCOHÉRENCE MAJEURE**:

1. **Les barrières sont calculées avec le spot price**:
   - Strategy Builder: `barrier = params.spotPrice * (option.barrier / 100)`
   - Hedging Instruments: `calculatedBarrier = instrument.barrier * spotRatio`

2. **Mais le pricing utilise le forward price comme S**:
   - Strategy Builder: `calculateBarrierOptionClosedForm(forward, ..., barrier, ...)`
   - Hedging Instruments: `calculateOptionPrice(S (forward), ..., calculatedBarrier, ...)`

3. **La fonction de pricing compare H (barrière spot-based) avec S (forward)**:
   ```typescript
   if (H < S) { ... }  // H est basé sur spot, S est forward
   ```

4. **Résultat**: Les comparaisons `H < S` et `H > S` dans `calculateBarrierOptionClosedForm` comparent une barrière calculée avec le spot avec un forward price, ce qui peut donner des résultats incorrects.

---

## 4️⃣ Impact sur le Pricing

### Exemple Concret

**Scénario**:
- Spot Price: 100
- Forward Price (1 an, r=5%): 105.13
- Barrière: 110 (10% au-dessus du spot)
- Strike: 100

**Calcul actuel**:
- Barrière calculée: `110` (basée sur spot 100)
- S utilisé: `105.13` (forward)
- Comparaison: `H (110) > S (105.13)` → TypeFlag déterminé

**Problème**:
- La barrière devrait-elle être comparée au spot ou au forward ?
- Si la barrière est définie en % du spot, elle devrait être recalculée pour le forward ?
- Ou la barrière devrait-elle être comparée au spot, pas au forward ?

---

## 5️⃣ Recommandations

### Option 1: Utiliser Forward Price pour les Barrières (Recommandé)
**Cohérence avec le modèle Black-76**:
- Les barrières devraient être calculées/ajustées avec le forward price
- Si barrière = 10% du spot, alors barrière_forward = 10% du forward

**Modifications nécessaires**:
```typescript
// Strategy Builder
const barrier = option.barrierType === 'percent' ? 
  forward * (option.barrier / 100) :  // ✅ Utiliser forward au lieu de spotPrice
  option.barrier;

// Hedging Instruments
const forwardRatio = S / spotRate;  // Ratio forward/spot
calculatedBarrier = (instrument.barrier || 0) * forwardRatio;  // ✅ Ajuster avec forward
```

### Option 2: Utiliser Spot Price pour S (Non recommandé)
**Incohérence avec Black-76**:
- Le pricing des commodities devrait utiliser le forward price (Black-76 model)
- Utiliser le spot violerait le modèle

### Option 3: Séparer Barrière de Pricing (Compromis)
**Logique**:
- Les barrières restent basées sur le spot (définition contractuelle)
- Mais dans les formules, utiliser un ratio d'ajustement

---

## 6️⃣ Conclusion

### État Actuel
- ✅ **Cohérent**: Les deux utilisent le forward price comme `S` dans le pricing
- ⚠️ **Incohérent**: Les barrières sont calculées avec le spot mais comparées au forward
- ⚠️ **Impact**: Les comparaisons `H < S` et `H > S` peuvent être incorrectes

### Recommandation
**Utiliser le forward price pour calculer les barrières** afin d'assurer la cohérence avec le modèle Black-76 et les comparaisons dans `calculateBarrierOptionClosedForm`.

---

**Date d'Analyse**: 2024  
**Fichiers Analysés**:
- `src/pages/Index.tsx` (Strategy Builder)
- `src/pages/HedgingInstruments.tsx` (Hedging Instruments)
- `src/services/PricingService.ts` (Fonction de pricing)

