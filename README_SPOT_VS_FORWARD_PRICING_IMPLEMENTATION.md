# Implementation: Spot vs Forward Pricing Configuration

## Vue d'ensemble

Cette implémentation ajoute la possibilité pour l'utilisateur de choisir entre le **prix spot** et le **prix forward** comme prix sous-jacent pour tous les calculs de pricing d'options dans l'application FX Risk Manager.

## Fonctionnalités implémentées

### 1. Configuration dans Settings ⚙️

- **Localisation** : Settings → Pricing → "Underlying Price for Options"
- **Options disponibles** :
  - `Spot Price` : Utilise le prix spot comme prix sous-jacent
  - `Forward Price` : Utilise le prix forward calculé selon la formule FX Forward
- **Portée** : S'applique à Strategy Builder et Hedging Instruments

### 2. Service de Pricing centralisé 🔧

**Nouvelles fonctions dans `PricingService.ts` :**

```typescript
// Récupère les paramètres de pricing depuis localStorage
getPricingSettings()

// Récupère le type de prix sous-jacent configuré
getUnderlyingPriceType(): 'spot' | 'forward'

// Calcule le prix sous-jacent approprié selon la configuration
calculateUnderlyingPrice(spotPrice, domesticRate, foreignRate, timeToMaturity)
```

### 3. Intégration dans Strategy Builder 📊

**Modifications dans `Index.tsx` :**

- **Garman-Kohlhagen pricing** : Utilise désormais `calculateUnderlyingPrice()`
- **Monte Carlo pricing** : Utilise désormais `calculateUnderlyingPrice()`
- **Digital Options pricing** : Utilise désormais `calculateUnderlyingPrice()`

### 4. Intégration dans Hedging Instruments 🛡️

**Modifications dans `HedgingInstruments.tsx` :**

- **Options vanilles (Call/Put)** : Utilise désormais `calculateUnderlyingPrice()`
- **Pricing de fallback** : Utilise désormais `calculateUnderlyingPrice()`
- **Logging amélioré** : Indique quel type de prix est utilisé

## Architecture technique

### Flux de données

```
Settings → localStorage → PricingService → Strategy Builder / Hedging Instruments
```

### Persistance

- Configuration stockée dans `localStorage` sous `fxRiskManagerSettings.pricing.underlyingPriceType`
- Valeur par défaut : `"spot"`
- Synchronisation automatique entre tous les composants

### Formule Forward utilisée

```typescript
forwardPrice = spotPrice * exp((domesticRate - foreignRate) * timeToMaturity)
```

## Types d'options supportés

### ✅ Strategy Builder
- Options vanilles (Call/Put)
- Options barrières 
- Options digitales/binaires
- Monte Carlo simulations

### ✅ Hedging Instruments  
- Options vanilles (Call/Put)
- Instruments de hedge génériques
- Calculs MTM (Mark-to-Market)

### ❌ Instruments non modifiés
- FX Forwards (utilisent toujours leur propre calcul forward)
- FX Swaps (utilisent toujours leur propre calcul forward)

## Impact sur les calculs existants

### Comportement par défaut (Spot)
- **Aucun changement** dans les calculs existants
- Compatible avec toutes les stratégies et instruments existants

### Nouveau comportement (Forward)
- Utilise le prix forward comme prix sous-jacent
- Plus approprié théoriquement pour les options avec maturité
- Impact sur les Greeks et la valorisation

## Utilisation

### Configuration
1. Aller dans **Settings** → **Pricing**
2. Sélectionner "**Underlying Price for Options**"
3. Choisir entre "**Spot Price**" ou "**Forward Price**"
4. Cliquer "**Save**"

### Vérification
- Les logs de debug affichent le type de prix utilisé
- Console développeur : `[DEBUG] Using spot/forward price: X.XXXX`

## Avantages

### ✅ Pour les utilisateurs
- **Flexibilité** : Choix entre approches spot et forward
- **Cohérence** : Configuration unique pour toute l'application
- **Simplicité** : Interface utilisateur claire

### ✅ Pour les développeurs
- **Centralisé** : Logique dans `PricingService`
- **Extensible** : Facile d'ajouter d'autres types de pricing
- **Maintenu** : Code DRY (Don't Repeat Yourself)

## Tests recommandés

### Test 1 : Configuration Spot
1. Configurer sur "Spot Price"
2. Créer une stratégie avec options
3. Vérifier que le pricing utilise le prix spot

### Test 2 : Configuration Forward  
1. Configurer sur "Forward Price"
2. Créer la même stratégie
3. Vérifier que le pricing utilise le prix forward
4. Comparer les résultats (prix forward > spot si r_d > r_f)

### Test 3 : Synchronisation
1. Modifier la configuration dans Settings
2. Vérifier que Strategy Builder utilise la nouvelle configuration
3. Vérifier que Hedging Instruments utilise la nouvelle configuration

## Files modifiés

- `src/pages/Settings.tsx` - Interface de configuration
- `src/services/PricingService.ts` - Logique de pricing centralisée  
- `src/pages/Index.tsx` - Strategy Builder intégration
- `src/pages/HedgingInstruments.tsx` - Hedging Instruments intégration

---

*Cette implémentation respecte l'architecture existante et assure une compatibilité totale avec les fonctionnalités existantes.*