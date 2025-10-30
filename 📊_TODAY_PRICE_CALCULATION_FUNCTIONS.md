# 📊 TODAY PRICE CALCULATION - TOUTES LES FONCTIONS UTILISÉES

## 🎯 Vue d'Ensemble

Le **Today Price** dans HedgingInstruments est calculé en utilisant **exactement les mêmes fonctions** que Strategy Builder pour garantir la cohérence des prix.

## 🔄 Flux de Calcul du Today Price

### **1. Fonction Principale : `calculateTodayPrice`**

**Localisation** : `HedgingInstruments.tsx` (ligne 438)

**Paramètres d'Entrée** :
- `instrument: HedgingInstrument` - L'instrument à pricer

**Logique** :
1. **Vérification d'Expiration** : Si `valuationDate >= maturityDate` → Valeur intrinsèque
2. **Calcul Time to Maturity** : `calculateTimeToMaturity(maturity, valuationDate)`
3. **Récupération des Paramètres de Marché** : Spot, volatilité, taux
4. **Mapping du Type d'Option** : Conversion vers les types reconnus
5. **Appel à `calculateOptionPrice`** : Fonction principale de Strategy Builder

---

## 🧮 Fonctions Utilisées dans le Calcul

### **A. FONCTIONS DE TEMPS ET DATES**

#### **1. `calculateTimeToMaturity`**
**Source** : `Index.tsx` (ligne 755)
```typescript
export const calculateTimeToMaturity = (maturityDate: string, valuationDate: string): number => {
  const maturity = new Date(maturityDate + 'T24:00:00Z');
  const valuation = new Date(valuationDate + 'T00:00:00Z');
  const diffTime = Math.abs(maturity.getTime() - valuation.getTime());
  return diffTime / (365.25 * 24 * 60 * 60 * 1000);
}
```
**Usage** : Calcule le temps restant jusqu'à la maturité en années

---

### **B. FONCTION PRINCIPALE DE PRICING**

#### **2. `calculateOptionPrice`**
**Source** : `Index.tsx` (ligne 662)
```typescript
export const calculateOptionPrice = (
  type: string,
  S: number,        // Spot price
  K: number,        // Strike price
  r_d: number,      // Domestic rate
  r_f: number,      // Foreign rate
  t: number,        // Time to maturity
  sigma: number,    // Volatility
  barrier?: number,
  secondBarrier?: number,
  rebate?: number,
  numSimulations: number = 1000
): number
```

**Logique de Routage** :
- **Options Vanilles** (`call`, `put`) → `calculateGarmanKohlhagenPrice`
- **Options à Barrière** (`knockout`, `knockin`) → `calculateBarrierOptionClosedForm`
- **Options Digitales** (autres) → `calculateDigitalOptionPrice`

---

### **C. FONCTIONS DE PRICING SPÉCIALISÉES**

#### **3. `calculateGarmanKohlhagenPrice`**
**Source** : `Index.tsx` (ligne 75)
```typescript
export const calculateGarmanKohlhagenPrice = (type: string, S: number, K: number, r_d: number, r_f: number, t: number, sigma: number): number
```
**Usage** : Options vanilles (call/put) avec modèle Garman-Kohlhagen

#### **4. `calculateBarrierOptionClosedForm`**
**Source** : `Index.tsx` (ligne 394)
```typescript
export const calculateBarrierOptionClosedForm = (
  optionType: string,
  S: number,        // Current price
  K: number,        // Strike price
  r: number,        // Risk-free rate
  t: number,        // Time to maturity
  sigma: number,    // Volatility
  barrier: number,  // Barrier level
  secondBarrier?: number,
  r_f: number = 0
): number
```
**Usage** : Options à barrière (knock-out, knock-in, reverse, double)

#### **5. `calculateDigitalOptionPrice`**
**Source** : `Index.tsx` (ligne 319)
```typescript
export const calculateDigitalOptionPrice = (
  optionType: string,
  S: number,        // Current price
  K: number,        // Strike/Barrier level
  r: number,        // Risk-free rate
  t: number,        // Time to maturity
  sigma: number,    // Volatility
  barrier?: number,
  secondBarrier?: number,
  numSimulations: number = 10000,
  rebate: number = 1
): number
```
**Usage** : Options digitales (one-touch, no-touch, double-touch, etc.)

---

### **D. FONCTIONS UTILITAIRES**

#### **6. `erf` (Error Function)**
**Source** : `Index.tsx` (ligne 25)
```typescript
export const erf = (x: number): number => {
  // Approximation de la fonction d'erreur
}
```
**Usage** : Calculs statistiques pour les modèles Black-Scholes

#### **7. `CND` (Cumulative Normal Distribution)**
**Source** : `Index.tsx` (ligne 43)
```typescript
export const CND = (x: number): number => (1 + erf(x / Math.sqrt(2))) / 2;
```
**Usage** : Distribution normale cumulative pour les modèles de pricing

---

## 🔍 Mapping des Types d'Options

### **Types d'Entrée → Types de Pricing**

| Type d'Instrument | Type Mappé | Fonction Utilisée |
|-------------------|-------------|-------------------|
| `vanilla call` | `call` | `calculateGarmanKohlhagenPrice` |
| `vanilla put` | `put` | `calculateGarmanKohlhagenPrice` |
| `call-knockout` | `call-knockout` | `calculateBarrierOptionClosedForm` |
| `put-knockout` | `put-knockout` | `calculateBarrierOptionClosedForm` |
| `call-knockin` | `call-knockin` | `calculateBarrierOptionClosedForm` |
| `put-knockin` | `put-knockin` | `calculateBarrierOptionClosedForm` |
| `call-reverse-knockout` | `call-reverse-knockout` | `calculateBarrierOptionClosedForm` |
| `put-reverse-knockout` | `put-reverse-knockout` | `calculateBarrierOptionClosedForm` |
| `call-double-knockout` | `call-double-knockout` | `calculateBarrierOptionClosedForm` |
| `put-double-knockout` | `put-double-knockout` | `calculateBarrierOptionClosedForm` |
| `one-touch` | `one-touch` | `calculateDigitalOptionPrice` |
| `no-touch` | `no-touch` | `calculateDigitalOptionPrice` |
| `double-touch` | `double-touch` | `calculateDigitalOptionPrice` |
| `double-no-touch` | `double-no-touch` | `calculateDigitalOptionPrice` |

---

## 📊 Paramètres Utilisés

### **Paramètres de Marché**
- **Spot Price** : `instrument.impliedSpotPrice || marketData.spot`
- **Volatilité** : `instrument.impliedVolatility || instrument.volatility || marketData.volatility`
- **Taux Risk-Free** : `marketData.riskFreeRate || marketData.domesticRate`
- **Taux Étranger** : `marketData.foreignRate` (0 pour commodités)

### **Paramètres d'Option**
- **Strike** : `instrument.strike`
- **Barrière 1** : `instrument.barrier`
- **Barrière 2** : `instrument.secondBarrier`
- **Rebate** : `instrument.rebate || 1`

### **Paramètres Temporels**
- **Time to Maturity** : `calculateTimeToMaturity(maturity, valuationDate)`
- **Valuation Date** : Date de calcul (modifiable par l'utilisateur)

---

## 🔄 Flux de Calcul Détaillé

### **Étape 1 : Vérification d'Expiration**
```typescript
if (valuationDateObj >= maturityDateObj) {
  // Retourner valeur intrinsèque
  return Math.max(0, spotRate - K); // Call
  return Math.max(0, K - spotRate); // Put
}
```

### **Étape 2 : Calcul Time to Maturity**
```typescript
const calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
```

### **Étape 3 : Récupération des Paramètres**
```typescript
const spotRate = instrument.impliedSpotPrice || marketData.spot;
const sigma = instrument.impliedVolatility || instrument.volatility || marketData.volatility;
const r = (marketData.riskFreeRate || marketData.domesticRate) / 100;
```

### **Étape 4 : Mapping du Type**
```typescript
let mappedType = instrument.type.toLowerCase();
if (mappedType === 'vanilla call') mappedType = 'call';
if (mappedType === 'vanilla put') mappedType = 'put';
// ... autres mappings
```

### **Étape 5 : Appel à la Fonction de Pricing**
```typescript
const price = calculateOptionPrice(
  mappedType,
  spotRate,
  K,
  r,
  0, // r_f pour commodités
  calculationTimeToMaturity,
  sigma,
  instrument.barrier,
  instrument.secondBarrier,
  instrument.rebate || 1,
  barrierOptionSimulations || 1000
);
```

---

## 🎯 Avantages de cette Architecture

### **✅ Cohérence avec Strategy Builder**
- Utilise exactement les mêmes fonctions
- Même logique de pricing
- Même paramètres de calcul

### **✅ Flexibilité**
- Support de tous les types d'options
- Paramètres modifiables par l'utilisateur
- Gestion des options expirées

### **✅ Performance**
- Fonctions optimisées
- Calculs en temps réel
- Gestion des cas d'erreur

---

## 🔍 Debug et Logs

### **Logs de Debug Actifs**
```
[DEBUG] Instrument: TODAY PRICE - Using Valuation Date [date]: [TTM]y
[DEBUG] Instrument: Using CURRENT parameters - spot=[spot], r=[r]%, b=[b]%, t=[TTM]
[DEBUG] Instrument: TYPE MAPPING - Original: [type], Mapped: [mappedType]
[DEBUG] Instrument: STRATEGY BUILDER PRICING RESULT - Calculated: [price], Export: [exportPrice]
```

### **Vérification des Résultats**
- Comparaison avec les prix d'export
- Validation des paramètres
- Traçabilité des calculs

---

## 📈 Exemple de Calcul

**Instrument** : Vanilla Call WTI
- **Spot** : 75.50
- **Strike** : 80.00
- **Volatilité** : 25%
- **Taux** : 5%
- **Time to Maturity** : 0.25 ans

**Calcul** :
1. `calculateTimeToMaturity("2024-06-30", "2024-03-31")` → 0.25 ans
2. `calculateOptionPrice("call", 75.50, 80.00, 0.05, 0, 0.25, 0.25)` 
3. → `calculateGarmanKohlhagenPrice("call", 75.50, 80.00, 0.05, 0, 0.25, 0.25)`
4. **Résultat** : 2.34

**Status** : ✅ **FONCTIONNEL** - Today Price calculé avec exactement les mêmes fonctions que Strategy Builder
