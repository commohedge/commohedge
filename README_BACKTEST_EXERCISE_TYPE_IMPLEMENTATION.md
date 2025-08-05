# Implementation: Backtest Exercise Type Configuration

## Vue d'ensemble

Cette implémentation ajoute la possibilité pour l'utilisateur de choisir entre deux méthodes de calcul des prix d'exercice pour les backtests historiques :

- **Monthly Average** : Prix moyen de tous les jours du mois
- **Third Friday Price** : Prix du 3ème vendredi du mois (date d'expiration typique des options)

## Fonctionnalités implémentées

### 1. Configuration dans Settings ⚙️

- **Localisation** : Settings → Pricing → "Backtest Exercise Type"
- **Options disponibles** :
  - `Monthly Average` : Utilise la moyenne mensuelle des prix
  - `Third Friday Price` : Utilise le prix du 3ème vendredi du mois
- **Application** : Affecte les calculs de backtesting dans Strategy Builder

### 2. Service de Pricing centralisé 🔧

**Nouvelles fonctions dans `PricingService.ts` :**

```typescript
// Récupère le type d'exercice configuré pour les backtests
getBacktestExerciseType(): 'monthly-average' | 'third-friday'

// Calcule la date du 3ème vendredi d'un mois donné
getThirdFridayOfMonth(year: number, month: number): Date
```

### 3. Intégration dans Strategy Builder 📊

**Modifications dans `Index.tsx` :**

- **calculateMonthlyStats()** : Utilise la configuration pour déterminer le prix d'exercice
- **Logging amélioré** : Indique quelle méthode est utilisée pour chaque mois
- **Compatibilité** : Fonctionne avec les données historiques importées

## Architecture technique

### Flux de données

```
Settings → localStorage → PricingService → Strategy Builder (calculateMonthlyStats)
```

### Persistance

- Configuration stockée dans `localStorage` sous `fxRiskManagerSettings.pricing.backtestExerciseType`
- Valeur par défaut : `"monthly-average"`
- Synchronisation automatique lors des calculs

### Algorithme Third Friday

```typescript
// 1. Trouver le premier vendredi du mois
// 2. Ajouter 14 jours pour obtenir le 3ème vendredi
// 3. Trouver la date la plus proche dans les données historiques
// 4. Utiliser le prix de cette date
```

## Cas d'usage typiques

### 📈 **Monthly Average (Défaut)**
- **Avantage** : Plus représentatif du mois entier
- **Usage** : Analyse générale de performance
- **Calcul** : `(Prix1 + Prix2 + ... + PrixN) / N`

### 📅 **Third Friday**
- **Avantage** : Simule les conditions réelles d'expiration d'options
- **Usage** : Backtesting précis d'options sur actions/indices
- **Calcul** : Prix du jour le plus proche du 3ème vendredi

## Impact sur les données affichées

### Monthly Statistics Table
La table "Monthly Statistics" affiche maintenant :
- **Monthly Average** : Prix moyen de tous les points de données du mois
- **Third Friday** : Prix spécifique du 3ème vendredi (ou jour le plus proche)

### Console Logging
```
[BACKTEST] 2025-01: Using monthly average: 1.0425
[BACKTEST] 2025-02: Using 3rd Friday price (2025-02-21): 1.0389
```

## Utilisation

### Configuration
1. Aller dans **Settings** → **Pricing**
2. Localiser "**Backtest Exercise Type**"
3. Choisir entre "**Monthly Average**" ou "**Third Friday Price**"
4. Cliquer "**Save**"

### Import de données historiques
1. Dans **Strategy Builder**, section "Historical Data Analysis"
2. Importer fichier CSV avec colonnes : `date,price`
3. Les statistiques mensuelles se calculent selon la configuration

### Vérification
- Observer les logs de console pour voir quelle méthode est utilisée
- Comparer les valeurs dans "Monthly Statistics" après changement de configuration

## Avantages

### ✅ Pour les traders d'options
- **Réalisme** : Simule les vraies conditions d'expiration
- **Précision** : Évalue les performances comme en conditions réelles

### ✅ Pour l'analyse générale
- **Stabilité** : Moyenne mensuelle moins volatile
- **Tendance** : Meilleure vue d'ensemble des mouvements de marché

### ✅ Pour les développeurs
- **Flexible** : Choix entre deux méthodes selon les besoins
- **Extensible** : Architecture permettant d'ajouter d'autres méthodes
- **Centralisé** : Configuration unique dans Settings

## Tests recommandés

### Test 1 : Configuration Monthly Average
1. Configurer sur "Monthly Average"
2. Importer données historiques avec plusieurs prix par mois
3. Vérifier que le prix affiché = moyenne arithmétique

### Test 2 : Configuration Third Friday
1. Configurer sur "Third Friday Price"  
2. Importer les mêmes données
3. Vérifier que le prix affiché correspond au jour le plus proche du 3ème vendredi

### Test 3 : Changement de configuration
1. Importer des données avec la configuration "Monthly Average"
2. Passer à "Third Friday Price" et sauvegarder
3. Réimporter les mêmes données
4. Vérifier que les statistiques changent

## Calcul du 3ème vendredi

### Algorithme
```javascript
function getThirdFridayOfMonth(year, month) {
  // 1. Premier jour du mois
  const firstDay = new Date(year, month - 1, 1);
  
  // 2. Trouver le premier vendredi
  const dayOfWeek = firstDay.getDay();
  const daysToAdd = dayOfWeek <= 5 ? (5 - dayOfWeek) : (12 - dayOfWeek);
  const firstFriday = new Date(firstDay);
  firstFriday.setDate(1 + daysToAdd);
  
  // 3. Ajouter 14 jours pour le 3ème vendredi
  const thirdFriday = new Date(firstFriday);
  thirdFriday.setDate(firstFriday.getDate() + 14);
  
  return thirdFriday;
}
```

### Exemples
- **Janvier 2025** : 3ème vendredi = 17 janvier 2025
- **Février 2025** : 3ème vendredi = 21 février 2025
- **Mars 2025** : 3ème vendredi = 21 mars 2025

## Files modifiés

- `src/pages/Settings.tsx` - Interface de configuration
- `src/services/PricingService.ts` - Logique de calcul et configuration
- `src/pages/Index.tsx` - Implémentation dans calculateMonthlyStats

---

*Cette implémentation respecte les standards financiers pour l'expiration d'options et offre la flexibilité nécessaire pour différents types d'analyses.*