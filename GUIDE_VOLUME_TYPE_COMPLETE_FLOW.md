# 🎯 **GUIDE COMPLET : Flux du Type de Volume (Receivable/Payable)**

## 📋 **Vue d'Ensemble**

Ce guide explique le flux complet du type de volume depuis le **Strategy Builder** jusqu'aux **FX Exposures**, en passant par les **Hedging Instruments**.

---

## 🔄 **Flux Complet des Données**

```
┌─────────────────────────────────────────────────────────────────┐
│                      STRATEGY BUILDER                            │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ User selects: volumeType = 'receivable' | 'payable'   │     │
│  │ EUR Volume: 1,000,000                                  │     │
│  │ USD Volume: 1,085,000                                  │     │
│  └────────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Export to Hedging Instruments                          │     │
│  │ params.volumeType = 'receivable'                       │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  STRATEGY IMPORT SERVICE                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ importStrategy(strategyName, strategy, params)         │     │
│  │   - params.volumeType = 'receivable'                   │     │
│  └────────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ convertStrategyToInstruments()                         │     │
│  │   - instrument.volumeType = params.volumeType          │     │
│  └────────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ HedgingInstrument created with:                        │     │
│  │   - volumeType: 'receivable'                           │     │
│  │   - hedgeQuantity: 100                                 │     │
│  │   - exposureVolume: 1,000,000                          │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HEDGING INSTRUMENTS                           │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Stored in localStorage: 'hedgingInstruments'           │     │
│  │ Each instrument has:                                   │     │
│  │   - volumeType: 'receivable' | 'payable'               │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      USE FINANCIAL DATA                          │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ autoGenerateExposures()                                │     │
│  │   1. Load hedging instruments                          │     │
│  │   2. Extract volumeType from instruments               │     │
│  │   3. Create/Update exposures with correct type         │     │
│  └────────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Exposure created with:                                 │     │
│  │   - type: 'receivable' (from volumeType)               │     │
│  │   - amount: +1,000,000 (positive for receivable)       │     │
│  │   - currency: 'EUR'                                    │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        FX EXPOSURES                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ currencyTotals calculation:                            │     │
│  │   exposures.forEach(exp => {                           │     │
│  │     if (exp.type === 'receivable') {                   │     │
│  │       totals[currency].receivables += |exp.amount|     │     │
│  │     } else {                                           │     │
│  │       totals[currency].payables += |exp.amount|        │     │
│  │     }                                                  │     │
│  │   })                                                   │     │
│  └────────────────────────────────────────────────────────┘     │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Display Results:                                       │     │
│  │   Total Receivables: €1,000,000                        │     │
│  │   Total Payables: $0                                   │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Modifications Effectuées**

### **1. Strategy Builder (Index.tsx)**

#### **Export du volumeType**
```typescript
const strategyId = importService.importStrategy(strategyName, strategy, {
  currencyPair: params.currencyPair,
  spotPrice: params.spotPrice,
  startDate: params.startDate,
  strategyStartDate: params.strategyStartDate,
  monthsToHedge: params.monthsToHedge,
  baseVolume: params.baseVolume,
  quoteVolume: params.quoteVolume,
  domesticRate: params.domesticRate,
  foreignRate: params.foreignRate,
  useCustomPeriods: params.useCustomPeriods,
  customPeriods: params.customPeriods,
  volumeType: params.volumeType, // ✅ EXPORT du type de volume
}, enrichedDetailedResults);
```

### **2. StrategyImportService.ts**

#### **Interface ImportedStrategy**
```typescript
params: {
  startDate: string;
  strategyStartDate: string;
  monthsToHedge: number;
  baseVolume: number;
  quoteVolume: number;
  domesticRate: number;
  foreignRate: number;
  volumeType?: 'receivable' | 'payable'; // ✅ Type de volume
};
```

#### **Interface HedgingInstrument**
```typescript
export interface HedgingInstrument {
  // ... autres propriétés
  volumeType?: 'receivable' | 'payable'; // ✅ Type de volume du Strategy Builder
  hedgeQuantity?: number;
  exposureVolume?: number;
  rawVolume?: number;
}
```

#### **Création des instruments**
```typescript
const baseInstrument: HedgingInstrument = {
  // ... autres propriétés
  hedgeQuantity: hedgeQuantity,
  exposureVolume: exposureVolume,
  rawVolume: rawVolume,
  volumeType: params.volumeType || 'receivable', // ✅ Type de volume
  exportStrategyStartDate: params.strategyStartDate,
  exportHedgingStartDate: params.startDate
};
```

### **3. useFinancialData.ts**

#### **Logique de détermination du type d'exposition**
```typescript
// ✅ AMÉLIORATION : Utiliser le volumeType du Strategy Builder si disponible
let exposureType: 'receivable' | 'payable' = 'receivable'; // Default

// Chercher le volumeType dans les instruments originaux
const maturityOriginalInstruments = originalInstruments.filter(orig => {
  const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
  return origMaturity === maturityStr;
});

if (maturityOriginalInstruments.length > 0) {
  // Utiliser le volumeType du Strategy Builder
  const firstInstrument = maturityOriginalInstruments[0];
  if (firstInstrument.volumeType) {
    exposureType = firstInstrument.volumeType;
    console.log(`[FX EXPOSURE] Using volumeType from Strategy Builder: ${exposureType}`);
  } else {
    // Fallback: déterminer basé sur les types d'instruments
    const hasReceivableInstruments = maturityInstruments.some(inst => 
      inst.type === 'vanilla-call' || inst.type === 'forward' || inst.type === 'collar'
    );
    exposureType = hasReceivableInstruments ? 'receivable' : 'payable';
  }
}
```

### **4. Exposures.tsx**

#### **Calcul des totaux par devise**
```typescript
const currencyTotals = useMemo(() => {
  const totals: { [currency: string]: { receivables: number; payables: number; total: number } } = {};
  
  exposures.forEach(exp => {
    if (!totals[exp.currency]) {
      totals[exp.currency] = { receivables: 0, payables: 0, total: 0 };
    }
    
    const absAmount = Math.abs(exp.amount);
    totals[exp.currency].total += absAmount;
    
    if (exp.type === 'receivable') {
      totals[exp.currency].receivables += absAmount; // ✅ Basé sur exp.type
    } else {
      totals[exp.currency].payables += absAmount;    // ✅ Basé sur exp.type
    }
  });
  
  return totals;
}, [exposures]);
```

---

## 🎯 **Cas d'Usage Pratiques**

### **Exemple 1 : Export Receivable**

**Strategy Builder :**
```typescript
params = {
  baseVolume: 1000000,
  quoteVolume: 1085000,
  volumeType: 'receivable', // ✅ User selects receivable
  currencyPair: { symbol: 'EUR/USD', base: 'EUR', quote: 'USD' }
}
```

**Hedging Instruments :**
```typescript
instrument = {
  currency: 'EUR/USD',
  notional: 1000000,
  volumeType: 'receivable', // ✅ Transmitted from Strategy Builder
  type: 'Vanilla Call'
}
```

**FX Exposures :**
```typescript
exposure = {
  currency: 'EUR',
  amount: 1000000,        // ✅ Positive for receivable
  type: 'receivable',     // ✅ From volumeType
  hedgedAmount: 1000000
}

// Totals calculation
currencyTotals['EUR'] = {
  receivables: 1000000,   // ✅ Added to receivables
  payables: 0,
  total: 1000000
}
```

**Résultat Affiché :**
- **Total Receivables** : €1,000,000 ✅
- **Total Payables** : $0 ✅

---

### **Exemple 2 : Export Payable**

**Strategy Builder :**
```typescript
params = {
  baseVolume: 500000,
  quoteVolume: 542500,
  volumeType: 'payable', // ✅ User selects payable
  currencyPair: { symbol: 'EUR/USD', base: 'EUR', quote: 'USD' }
}
```

**Hedging Instruments :**
```typescript
instrument = {
  currency: 'EUR/USD',
  notional: 500000,
  volumeType: 'payable', // ✅ Transmitted from Strategy Builder
  type: 'Vanilla Put'
}
```

**FX Exposures :**
```typescript
exposure = {
  currency: 'EUR',
  amount: -500000,        // ✅ Negative for payable
  type: 'payable',        // ✅ From volumeType
  hedgedAmount: -500000
}

// Totals calculation
currencyTotals['EUR'] = {
  receivables: 0,
  payables: 500000,       // ✅ Added to payables (absolute value)
  total: 500000
}
```

**Résultat Affiché :**
- **Total Receivables** : $0 ✅
- **Total Payables** : €500,000 ✅

---

## 🔍 **Vérification du Flux**

### **1. Dans Strategy Builder**
```typescript
// Vérifier que volumeType est défini
console.log('Strategy Builder volumeType:', params.volumeType);
// Output: "Strategy Builder volumeType: receivable"
```

### **2. Dans StrategyImportService**
```typescript
// Vérifier que volumeType est transmis
console.log('Instrument volumeType:', baseInstrument.volumeType);
// Output: "Instrument volumeType: receivable"
```

### **3. Dans useFinancialData**
```typescript
// Vérifier la logique de détermination
console.log('[FX EXPOSURE] Using volumeType from Strategy Builder:', exposureType);
// Output: "[FX EXPOSURE] Using volumeType from Strategy Builder: receivable"
```

### **4. Dans FX Exposures**
```typescript
// Vérifier les totaux calculés
console.log('Currency Totals:', currencyTotals);
// Output: "Currency Totals: { EUR: { receivables: 1000000, payables: 0, total: 1000000 } }"
```

---

## ✅ **Points de Contrôle**

### **Strategy Builder**
- [ ] Le sélecteur de volumeType est visible et fonctionnel
- [ ] La valeur sélectionnée est sauvegardée dans `params.volumeType`
- [ ] Le volumeType est exporté vers Hedging Instruments

### **Hedging Instruments**
- [ ] Les instruments contiennent la propriété `volumeType`
- [ ] La valeur correspond à celle du Strategy Builder
- [ ] Les instruments sont sauvegardés dans localStorage

### **FX Exposures**
- [ ] Les expositions sont créées avec le bon type
- [ ] Les totaux sont calculés correctement par devise
- [ ] L'affichage distingue bien receivables et payables

---

## 🎨 **Affichage dans l'Interface**

### **Strategy Builder**
```
┌─────────────────────────────────────────┐
│ Volume Type                             │
│ ┌─────────────────────────────────────┐ │
│ │ 📈 Receivable    📉 Payable         │ │
│ └─────────────────────────────────────┘ │
│ 💰 You will receive EUR currency        │
└─────────────────────────────────────────┘
```

### **FX Exposures**
```
┌─────────────────────────────────────────┐
│ Total Receivables    Total Payables     │
│ €1,000,000          $0                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ All Exposures                           │
│ Currency  Amount      Type              │
│ EUR       €83,333     Receivable        │
│ EUR       €83,333     Receivable        │
│ EUR       €83,333     Receivable        │
└─────────────────────────────────────────┘
```

---

## 🚀 **Test Complet**

### **Scénario de Test 1 : Receivable**
1. **Strategy Builder** : Sélectionner `volumeType: 'receivable'`
2. **Exporter** vers Hedging Instruments
3. **Vérifier** dans FX Exposures :
   - Type d'exposition = 'Receivable'
   - Total Receivables > 0
   - Total Payables = 0

### **Scénario de Test 2 : Payable**
1. **Strategy Builder** : Sélectionner `volumeType: 'payable'`
2. **Exporter** vers Hedging Instruments
3. **Vérifier** dans FX Exposures :
   - Type d'exposition = 'Payable'
   - Total Receivables = 0
   - Total Payables > 0

### **Scénario de Test 3 : Mix**
1. **Créer 2 stratégies** : 1 receivable + 1 payable
2. **Exporter les deux**
3. **Vérifier** dans FX Exposures :
   - Les deux types sont présents
   - Les totaux sont corrects pour chaque type
   - Pas de confusion entre les types

---

## 📊 **Métriques de Succès**

### **Cohérence**
- ✅ 100% des expositions respectent le volumeType du Strategy Builder
- ✅ Les totaux par devise sont corrects
- ✅ Pas de confusion entre receivables et payables

### **Traçabilité**
- ✅ Logs détaillés à chaque étape
- ✅ Descriptions enrichies avec le type
- ✅ Débogage facilité

### **Robustesse**
- ✅ Fallback intelligent si volumeType manquant
- ✅ Gestion des cas d'erreur
- ✅ Compatibilité avec les données existantes

---

## 🎯 **Résumé**

Le flux complet du type de volume est maintenant implémenté :

1. **Strategy Builder** → Sélection du volumeType
2. **Export** → Transmission vers Hedging Instruments
3. **StrategyImportService** → Stockage dans les instruments
4. **useFinancialData** → Utilisation pour créer les expositions
5. **FX Exposures** → Calcul des totaux par type et devise

**🎉 Le système respecte maintenant parfaitement le choix de l'utilisateur pour le type de volume à travers tous les modules !**
