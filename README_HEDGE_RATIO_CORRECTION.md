# Correction du Calcul du Hedge Ratio - FX Exposures

## Problème Identifié

**Problème Initial** : Le Hedge Ratio dans FX Exposures était plafonné à 100% au lieu d'utiliser le pourcentage réel maximum des composants de la stratégie (options, swaps, futures).

**Exemple Problématique** :
- Stratégie avec composants : Call 150%, Put 200%, Forward 75%
- **Avant** : Hedge Ratio = 100% (plafonné)
- **Après** : Hedge Ratio = 200% (maximum des composants)

## Solution Implémentée

### 🔧 **Modifications Techniques**

#### **useFinancialData.ts - Fonction `autoGenerateExposures`**

**Avant** :
```typescript
maxHedgeQuantity = Math.max(...originalInstruments.map(inst => {
  const quantity = inst.hedgeQuantity !== undefined ? 
    inst.hedgeQuantity : 
    (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
  return Math.min(100, quantity); // ❌ PLAFONNEMENT À 100%
}));
```

**Après** :
```typescript
// ✅ CORRECTION : Prendre le maximum des quantités absolues des instruments originaux SANS plafonnement
const maturityOriginalInstruments = originalInstruments.filter(orig => {
  const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
  return origMaturity === maturityStr;
});

if (maturityOriginalInstruments.length > 0) {
  // Utiliser les instruments de cette échéance spécifique
  maxHedgeQuantity = Math.max(...maturityOriginalInstruments.map(inst => {
    const quantity = inst.hedgeQuantity !== undefined ? 
      inst.hedgeQuantity : 
      (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
    return quantity; // ✅ SUPPRESSION du plafonnement Math.min(100, quantity)
  }));
} else {
  // Fallback: utiliser tous les instruments originaux
  maxHedgeQuantity = Math.max(...originalInstruments.map(inst => {
    const quantity = inst.hedgeQuantity !== undefined ? 
      inst.hedgeQuantity : 
      (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
    return quantity; // ✅ SUPPRESSION du plafonnement Math.min(100, quantity)
  }));
}
```

### 📊 **Logique de Calcul Améliorée**

#### **1. Filtrage par Échéance**
- **Granularité** : Calcul du hedge ratio par échéance spécifique
- **Précision** : Utilisation des instruments de la même échéance
- **Fallback** : Si aucun instrument pour l'échéance, utiliser tous les instruments

#### **2. Extraction des Quantités Réelles**
- **hedgeQuantity** : Priorité à la quantité de couverture explicite
- **quantity** : Utilisation de la quantité du composant (valeur absolue)
- **Fallback** : 95% si aucune quantité disponible

#### **3. Maximum des Composants**
- **Math.max()** : Prendre le maximum des pourcentages
- **Pas de plafonnement** : Permettre des hedge ratios > 100%
- **Cohérence** : Refléter la vraie exposition de la stratégie

## 🎯 Exemples Concrets

### **Exemple 1 : Stratégie avec Sur-Couverture**
```typescript
// Composants de la stratégie
const strategy = [
  { type: 'call', quantity: 150 },    // 150% Call
  { type: 'put', quantity: 200 },     // 200% Put
  { type: 'forward', quantity: 75 }   // 75% Forward
];

// Calcul du hedge ratio
const hedgeRatio = Math.max(150, 200, 75); // = 200%

// Résultat dans FX Exposures
const exposure = {
  currency: 'EUR',
  amount: 1000000,
  hedgeRatio: 200,                    // ✅ 200% (non plafonné)
  hedgedAmount: 2000000,              // 200% * 1,000,000
  description: 'Hedge Ratio: 200%'   // ✅ Affichage correct
};
```

### **Exemple 2 : Stratégie Conservative**
```typescript
// Composants de la stratégie
const strategy = [
  { type: 'call', quantity: 50 },     // 50% Call
  { type: 'put', quantity: 30 },      // 30% Put
];

// Calcul du hedge ratio
const hedgeRatio = Math.max(50, 30); // = 50%

// Résultat dans FX Exposures
const exposure = {
  currency: 'USD',
  amount: 500000,
  hedgeRatio: 50,                     // ✅ 50% (réel)
  hedgedAmount: 250000,               // 50% * 500,000
  description: 'Hedge Ratio: 50%'    // ✅ Affichage correct
};
```

### **Exemple 3 : Stratégie Multi-Échéances**
```typescript
// Instruments par échéance
const maturity1 = [
  { quantity: 100, maturity: '2024-03-31' },  // 100% Mars
  { quantity: 75, maturity: '2024-03-31' }    // 75% Mars
];

const maturity2 = [
  { quantity: 150, maturity: '2024-06-30' },  // 150% Juin
  { quantity: 200, maturity: '2024-06-30' }   // 200% Juin
];

// Calculs par échéance
const hedgeRatioMarch = Math.max(100, 75);    // = 100%
const hedgeRatioJune = Math.max(150, 200);    // = 200%

// Résultat : 2 expositions distinctes
const exposures = [
  { currency: 'EUR', maturity: '2024-03-31', hedgeRatio: 100 },
  { currency: 'EUR', maturity: '2024-06-30', hedgeRatio: 200 }
];
```

## ✅ Avantages de la Correction

### **1. Réalisme Financier**
- **Hedge ratios réels** : Reflet fidèle de la stratégie
- **Sur-couverture visible** : Hedge ratios > 100% possibles
- **Sous-couverture claire** : Hedge ratios < 100% explicites

### **2. Granularité par Échéance**
- **Calcul spécifique** : Hedge ratio par échéance
- **Précision temporelle** : Évolution du hedge ratio dans le temps
- **Suivi détaillé** : Monitoring par période

### **3. Cohérence avec Strategy Builder**
- **Synchronisation parfaite** : Même logique de calcul
- **Pas de perte d'information** : Tous les pourcentages préservés
- **Traçabilité** : Lien direct avec les composants originaux

### **4. Interface Utilisateur Améliorée**
- **Affichage correct** : Pourcentages réels dans le tableau
- **Descriptions enrichies** : Hedge Ratio affiché dans la description
- **Badges de statut** : Indication visuelle du niveau de couverture

## 🔄 Impact sur les Calculs

### **Montant Couvert (Hedged Amount)**
```typescript
// Calcul du montant couvert
const hedgedAmount = (maxHedgeQuantity / 100) * Math.abs(exposureAmount);

// Exemple avec hedge ratio 200%
const exposureAmount = 1000000;
const hedgeRatio = 200;
const hedgedAmount = (200 / 100) * 1000000 = 2000000; // ✅ Sur-couverture
```

### **Montant Non Couvert (Unhedged Amount)**
```typescript
// Calcul du montant non couvert
const unhedgedAmount = exposureAmount - hedgedAmount;

// Exemple avec sur-couverture
const exposureAmount = 1000000;
const hedgedAmount = 2000000;
const unhedgedAmount = 1000000 - 2000000 = -1000000; // ✅ Sur-couverture négative
```

## 🎯 Validation

### **Tests Effectués**
1. ✅ **Compilation réussie** : npm run build sans erreurs
2. ✅ **Logique de calcul** : Vérification des formules
3. ✅ **Cas limites** : Hedge ratios > 100% et < 100%
4. ✅ **Multi-échéances** : Calculs distincts par échéance
5. ✅ **Synchronisation** : Cohérence avec Strategy Builder

### **Comportement Attendu**
- **Hedge Ratio** = Maximum des pourcentages des composants
- **Pas de plafonnement** à 100%
- **Granularité** par devise et échéance
- **Synchronisation** automatique lors des exports

Cette correction garantit que le Hedge Ratio dans FX Exposures reflète fidèlement la réalité de la stratégie de couverture, permettant une gestion des risques plus précise et une meilleure visibilité sur les niveaux de couverture réels. 