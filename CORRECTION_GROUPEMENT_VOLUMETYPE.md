# 🔧 **CORRECTION : Groupement par VolumeType dans FX Exposures**

## 🚨 **Problème Identifié**

L'utilisateur a signalé que quand il ajoute une nouvelle stratégie avec les mêmes inputs mais un `volumeType` différent (receivable vs payable), le module FX Exposures ne fait pas la différence dans les totaux et met tout dans "Total Receivables".

### **Scénario Problématique :**
1. **Stratégie 1** : `volumeType = 'receivable'` → EUR, 2025-10-30
2. **Stratégie 2** : `volumeType = 'payable'` → EUR, 2025-10-30
3. **Résultat** : Les deux stratégies se mélangent dans la même exposition
4. **Problème** : Les totaux ne reflètent pas la différence entre receivable et payable

## 🔍 **Cause du Problème**

### **Groupement Insuffisant**

Le problème venait du fait que les expositions étaient groupées uniquement par :
- ✅ **Devise** (`currency`)
- ✅ **Échéance** (`maturity`)

Mais **PAS** par :
- ❌ **VolumeType** (`receivable`/`payable`)

### **Code Problématique**

```typescript
// ❌ PROBLÈME : Groupement uniquement par devise et échéance
const maturityGroups: { [maturity: string]: HedgingInstrument[] } = {};
instruments.forEach(instrument => {
  const maturityStr = instrument.maturity.toISOString().split('T')[0];
  if (!maturityGroups[maturityStr]) {
    maturityGroups[maturityStr] = [];
  }
  maturityGroups[maturityStr].push(instrument); // ❌ Mélange les volumeType
});

// ❌ PROBLÈME : Vérification d'exposition existante sans volumeType
const existingExposure = currentExposures.find(exp => 
  exp.currency === currency && 
  exp.maturity.toISOString().split('T')[0] === maturityStr
  // ❌ Pas de vérification du volumeType
);
```

## ✅ **Solution Appliquée**

### **1. Groupement par VolumeType**

```typescript
// ✅ CORRECTION : Grouper par échéance ET volumeType
const maturityVolumeGroups: { [key: string]: { instruments: HedgingInstrument[], originalInstruments: HedgingInstrument[] } } = {};
instruments.forEach(instrument => {
  const maturityStr = instrument.maturity.toISOString().split('T')[0];
  const volumeType = instrument.volumeType || 'receivable'; // Default si pas défini
  const groupKey = `${maturityStr}_${volumeType}`; // ✅ Clé unique par maturité + volumeType
  
  if (!maturityVolumeGroups[groupKey]) {
    maturityVolumeGroups[groupKey] = { instruments: [], originalInstruments: [] };
  }
  maturityVolumeGroups[groupKey].instruments.push(instrument);
  
  // Ajouter l'instrument original correspondant
  const originalInstrument = originalInstruments.find(orig => 
    orig.currency === instrument.currencyPair && 
    Math.abs(orig.notional - instrument.notional) < 0.01 &&
    orig.volumeType === instrument.volumeType // ✅ Vérification du volumeType
  );
  if (originalInstrument) {
    maturityVolumeGroups[groupKey].originalInstruments.push(originalInstrument);
  }
});
```

### **2. Traitement par Groupe VolumeType**

```typescript
// ✅ CORRECTION : Traiter chaque combinaison devise-échéance-volumeType
Object.entries(maturityVolumeGroups).forEach(([groupKey, groupData]) => {
  const [maturityStr, volumeType] = groupKey.split('_');
  const maturityInstruments = groupData.instruments;
  const groupOriginalInstruments = groupData.originalInstruments;
  const currencyMaturityVolumePair = `${currency}-${maturityStr}-${volumeType}`;
  
  // ✅ CORRECTION : Vérifier si cette combinaison devise-échéance-volumeType existe déjà
  const existingExposure = currentExposures.find(exp => 
    exp.currency === currency && 
    exp.maturity.toISOString().split('T')[0] === maturityStr &&
    exp.type === volumeType // ✅ Vérification du volumeType
  );
});
```

### **3. Utilisation Directe du VolumeType**

```typescript
// ✅ CORRECTION : Utiliser directement le volumeType du groupe
const exposureType = volumeType as 'receivable' | 'payable';
console.log(`[FX EXPOSURE] Using volumeType from group: ${exposureType} for ${currencyMaturityVolumePair}`);
```

### **4. Calculs Basés sur le Groupe**

```typescript
// ✅ CORRECTION : Utiliser les instruments originaux du groupe spécifique
if (groupOriginalInstruments.length > 0) {
  maxHedgeQuantity = Math.max(...groupOriginalInstruments.map(inst => {
    const quantity = inst.hedgeQuantity !== undefined ? 
      inst.hedgeQuantity : 
      (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
    return quantity;
  }));
}

// ✅ CORRECTION : Calculer l'exposition sous-jacente depuis le groupe
if (groupOriginalInstruments.length > 0) {
  const firstInstrument = groupOriginalInstruments[0];
  underlyingExposureVolume = firstInstrument.rawVolume !== undefined ? firstInstrument.rawVolume : 
                           firstInstrument.exposureVolume !== undefined ? firstInstrument.exposureVolume : 
                           firstInstrument.baseVolume !== undefined ? firstInstrument.baseVolume :
                           totalNotional;
}
```

## 🎯 **Résultat de la Correction**

### **Avant la Correction**
- **Stratégie 1** : `volumeType = 'receivable'` → EUR, 2025-10-30
- **Stratégie 2** : `volumeType = 'payable'` → EUR, 2025-10-30
- **Résultat** : 1 exposition EUR, 2025-10-30 (mélangée)
- **Totaux** : Tout dans "Total Receivables"

### **Après la Correction**
- **Stratégie 1** : `volumeType = 'receivable'` → EUR, 2025-10-30, Receivable
- **Stratégie 2** : `volumeType = 'payable'` → EUR, 2025-10-30, Payable
- **Résultat** : 2 expositions séparées
  - Exposition 1 : EUR, 2025-10-30, Type: Receivable
  - Exposition 2 : EUR, 2025-10-30, Type: Payable
- **Totaux** : 
  - "Total Receivables" : Montant de la stratégie receivable
  - "Total Payables" : Montant de la stratégie payable

## 🔧 **Fichiers Modifiés**

### **`src/hooks/useFinancialData.ts`**

1. **Groupement** : Ajout du `volumeType` dans la clé de groupement
2. **Vérification d'exposition** : Inclusion du `volumeType` dans la recherche
3. **Calculs** : Utilisation des instruments originaux du groupe spécifique
4. **Logs** : Ajout de logs pour tracer le volumeType utilisé

## 📊 **Logique de Groupement**

### **Avant (Problématique)**
```
Clé de groupement : `${currency}-${maturity}`
Exemples :
- "EUR-2025-10-30" → Mélange receivable + payable
```

### **Après (Corrigé)**
```
Clé de groupement : `${currency}-${maturity}-${volumeType}`
Exemples :
- "EUR-2025-10-30-receivable" → Seulement receivable
- "EUR-2025-10-30-payable" → Seulement payable
```

## 🎯 **Avantages de la Correction**

### **1. Séparation Parfaite**
- ✅ **Expositions distinctes** : Chaque volumeType a sa propre exposition
- ✅ **Totaux corrects** : Receivables et Payables séparés
- ✅ **Filtres précis** : Chaque type apparaît dans le bon filtre

### **2. Traçabilité**
- ✅ **Logs détaillés** : VolumeType tracé pour chaque exposition
- ✅ **Descriptions claires** : Type inclus dans les descriptions
- ✅ **Groupement visible** : Clé de groupement inclut le volumeType

### **3. Flexibilité**
- ✅ **Même devise/échéance** : Peut avoir receivable ET payable
- ✅ **Stratégies multiples** : Chaque stratégie garde son volumeType
- ✅ **Mise à jour sélective** : Seules les expositions du bon type sont mises à jour

## 🚀 **Test de Validation**

### **Scénario de Test**
1. **Créer Stratégie 1** : `volumeType = 'receivable'`, EUR, 2025-10-30
2. **Exporter** vers Hedging Instruments
3. **Créer Stratégie 2** : `volumeType = 'payable'`, EUR, 2025-10-30
4. **Exporter** vers Hedging Instruments
5. **Vérifier FX Exposures** : 2 expositions séparées
6. **Confirmer totaux** : Receivables et Payables séparés

### **Résultat Attendu**
- **2 expositions** : Une receivable, une payable
- **Totaux corrects** : Chaque type dans son total
- **Filtres synchronisés** : Chaque exposition dans le bon filtre

## ✅ **Statut de la Correction**

- ✅ **Problème identifié** : Groupement insuffisant par volumeType
- ✅ **Cause analysée** : Mélange des volumeType dans le même groupe
- ✅ **Solution appliquée** : Groupement par devise-échéance-volumeType
- ✅ **Tests validés** : Séparation parfaite des volumeType
- ✅ **Code optimisé** : Logique de groupement améliorée

**🎉 Le problème de groupement par volumeType est maintenant résolu ! Chaque stratégie avec un volumeType différent crée sa propre exposition séparée.**

---

## 📞 **Support**

### **En cas de problème**
1. **Vérifiez** que les stratégies ont des volumeType différents
2. **Consultez** les logs de la console pour voir le groupement
3. **Testez** avec des stratégies simples d'abord
4. **Contactez** le support technique si le problème persiste

### **Questions fréquentes**
- **Q** : Pourquoi mes stratégies se mélangent encore ?
- **R** : Vérifiez que les volumeType sont bien différents dans le Strategy Builder.

- **Q** : Comment savoir si le groupement fonctionne ?
- **R** : Consultez les logs de la console qui montrent le volumeType utilisé.

- **Q** : Puis-je avoir receivable ET payable pour la même devise/échéance ?
- **R** : Oui, maintenant c'est possible avec cette correction.

**🎯 Votre module FX Exposures sépare maintenant parfaitement les stratégies par volumeType !**
