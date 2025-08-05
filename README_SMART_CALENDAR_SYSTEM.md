# Smart Calendar System for Backtest Exercise Type

## Vue d'ensemble

Le système de calendrier intelligent améliore significativement la détection du **troisième vendredi de chaque mois** et la gestion des données historiques qui peuvent commencer et se terminer à **n'importe quelle date**. Ce système garantit une précision maximale dans les calculs de backtesting.

## Fonctionnalités du système intelligent

### 🗓️ **Détection précise des dates**

#### **Calcul du troisième vendredi**
```javascript
// Trouve TOUS les vendredis du mois
const fridays = getFridaysInMonth(2025, 1);
// Résultat: [3 Jan, 10 Jan, 17 Jan, 24 Jan, 31 Jan]

// Sélectionne le 3ème (index 2)
const thirdFriday = fridays[2]; // 17 Jan 2025
```

#### **Gestion des cas limites**
- **Mois avec moins de 3 vendredis** : Utilise le dernier vendredi disponible
- **Années bissextiles** : Calcul automatique correct pour février
- **Validation des dates** : Vérifie la validité de toutes les dates d'entrée

### 📊 **Analyse intelligente des données**

#### **Validation automatique**
```javascript
// Filtre automatiquement les données invalides
const validData = data.filter(point => 
  point && 
  point.date && 
  PricingService.isValidDateString(point.date) && 
  typeof point.price === 'number' && 
  !isNaN(point.price)
);
```

#### **Analyse de plage de données**
```javascript
const dateRange = PricingService.getDataDateRange(validData.map(p => p.date));
// Résultat: {
//   start: Date(2024-03-15),
//   end: Date(2025-02-28),
//   months: ["2024-03", "2024-04", ..., "2025-02"]
// }
```

### 🎯 **Correspondance intelligente des dates**

#### **Algorithme de proximité**
```javascript
const closestResult = PricingService.findClosestDateInData(thirdFriday, dates);
// Résultat: {
//   index: 12,
//   date: "2025-01-16", 
//   diffDays: 1  // 1 day difference from target
// }
```

#### **Seuils d'alerte**
- ✅ **≤ 7 jours** : Accepté silencieusement
- ⚠️ **> 7 jours** : Warning dans les logs
- 🚨 **Pas de données** : Fallback vers moyenne mensuelle

## Améliorations techniques

### 🔧 **Nouvelles fonctions PricingService**

#### **Gestion des calendriers**
```typescript
// Vérification des années bissextiles
isLeapYear(year: number): boolean

// Calcul précis des jours dans un mois
getDaysInMonth(year: number, month: number): number

// Trouve tous les vendredis d'un mois
getFridaysInMonth(year: number, month: number): Date[]

// Calcul robuste du 3ème vendredi
getThirdFridayOfMonth(year: number, month: number): Date | null
```

#### **Analyse des données**
```typescript
// Trouve la date la plus proche dans les données
findClosestDateInData(targetDate: Date, dates: string[]): {
  index: number;
  date: string; 
  diffDays: number;
} | null

// Validation des chaînes de date
isValidDateString(dateStr: string): boolean

// Analyse de plage temporelle des données
getDataDateRange(dates: string[]): {
  start: Date;
  end: Date;
  months: string[];
} | null
```

### 📈 **Logging amélioré**

#### **Informations détaillées**
```
[BACKTEST] Data range: 2024-03-15 to 2025-02-28
[BACKTEST] Months covered: 2024-03, 2024-04, 2024-05, ..., 2025-02

[CALENDAR] 2025-01: Found 3rd Friday on 2025-01-17 (5 Fridays total)
[BACKTEST] 2025-01: 3rd Friday (2025-01-16, 1 days diff) = 1.0389

[BACKTEST] 2025-02: Monthly average (23 data points) = 1.0425
```

#### **Alertes et warnings**
```
⚠️ [BACKTEST] 2025-01: 3rd Friday data is 8 days away from target date
🚨 [CALENDAR] 2025-02: Only 2 Fridays found, using last Friday
```

## Interface étendue

### 📋 **MonthlyStats enrichie**
```typescript
interface MonthlyStats {
  month: string;
  avgPrice: number;
  volatility: number | null;
  dataPoints?: number;          // Nouveau: nombre de points de données
  calculationMethod?: string;   // Nouveau: méthode utilisée
}
```

### 🎯 **Métadonnées de calcul**
Chaque statistique mensuelle inclut maintenant :
- **dataPoints** : Nombre de points de données utilisés
- **calculationMethod** : Description de la méthode employée
  - `"Monthly average (23 data points)"`
  - `"3rd Friday (2025-01-16, 1 days diff)"`
  - `"Monthly average (3rd Friday fallback)"`

## Gestion des cas complexes

### 📅 **Données partielles**

#### **Données commençant en milieu de mois**
```
Données: 15 Jan - 28 Feb
✅ Janvier: Trouve le 3ème vendredi (17 Jan) même avec données partielles
✅ Février: Calcul normal
```

#### **Données se terminant en milieu de mois**
```
Données: 1 Jan - 15 Feb  
✅ Janvier: Calcul normal
✅ Février: Utilise les données disponibles jusqu'au 15
```

### 🔄 **Fallbacks intelligents**

#### **Ordre de priorité**
1. **Prix du 3ème vendredi** (si configuré et disponible)
2. **Dernier vendredi du mois** (si moins de 3 vendredis)
3. **Moyenne mensuelle** (si aucun vendredi trouvé)
4. **Aucune donnée** (affichage d'erreur)

#### **Gestion des écarts temporels**
```javascript
if (closestResult.diffDays > 7) {
  console.warn(`3rd Friday data is ${diffDays} days away from target`);
  // Continue with calculation but alert user
}
```

## Avantages du système intelligent

### ✅ **Pour les utilisateurs**
- **Fiabilité** : Gestion automatique des cas limites
- **Transparence** : Logs détaillés expliquant chaque calcul
- **Flexibilité** : Fonctionne avec n'importe quelle plage de données
- **Précision** : Détection exacte des dates d'expiration

### ✅ **Pour les développeurs**
- **Robustesse** : Validation complète des données d'entrée
- **Maintenance** : Code modulaire et testable
- **Extensibilité** : Architecture permettant d'ajouter d'autres types de dates
- **Debugging** : Logs détaillés facilitent le diagnostic

## Exemples d'utilisation

### 📊 **Scénario 1 : Données complètes**
```
Données: 1 Jan 2025 - 31 Jan 2025 (données quotidiennes)
Configuration: Third Friday
Résultat: Utilise le prix du 17 janvier (3ème vendredi)
Log: "[BACKTEST] 2025-01: 3rd Friday (2025-01-17, 0 days diff) = 1.0389"
```

### 📊 **Scénario 2 : Données partielles**
```
Données: 10 Jan 2025 - 25 Jan 2025 (données partielles)
Configuration: Third Friday  
Résultat: Utilise le prix du 17 janvier (le plus proche disponible)
Log: "[BACKTEST] 2025-01: 3rd Friday (2025-01-17, 0 days diff) = 1.0389"
```

### 📊 **Scénario 3 : Données éparses**
```
Données: Seulement les lundis de janvier 2025
Configuration: Third Friday
Résultat: Utilise le lundi le plus proche (20 janvier, +3 jours)
Log: "[BACKTEST] 2025-01: 3rd Friday (2025-01-20, 3 days diff) = 1.0391"
```

### 📊 **Scénario 4 : Fallback automatique**
```
Données: Aucune donnée proche du 3ème vendredi
Configuration: Third Friday
Résultat: Fallback automatique vers moyenne mensuelle
Log: "[BACKTEST] 2025-01: Monthly average (3rd Friday fallback) = 1.0385"
```

## Tests recommandés

### 🧪 **Test 1 : Années bissextiles**
1. Importer données pour février 2024 (bissextile)
2. Vérifier que le calcul du 3ème vendredi est correct (16 février)
3. Comparer avec février 2023 (non-bissextile, 17 février)

### 🧪 **Test 2 : Mois avec 5 vendredis**
1. Tester mars 2024 (5 vendredis: 1, 8, 15, 22, 29)
2. Vérifier que le 3ème vendredi (15 mars) est correctement sélectionné

### 🧪 **Test 3 : Données éparses**
1. Créer un dataset avec seulement 3 points par mois
2. Configurer sur "Third Friday"
3. Vérifier que le système trouve la date la plus proche

### 🧪 **Test 4 : Validation des données**
1. Importer un fichier avec dates invalides
2. Vérifier que les données invalides sont filtrées
3. Confirmer que le système continue avec les données valides

## Configuration et utilisation

### ⚙️ **Dans Settings**
1. Aller dans **Settings** → **Pricing**
2. Sélectionner "**Third Friday Price**" 
3. Sauvegarder la configuration

### 📥 **Import de données**
1. Format CSV : `date,price`
2. Dates acceptées : ISO (YYYY-MM-DD), US (MM/DD/YYYY), EU (DD/MM/YYYY)
3. Le système détecte automatiquement et valide le format

### 📊 **Visualisation**
Les **Monthly Statistics** affichent maintenant les métadonnées :
- Prix calculé selon la méthode choisie
- Nombre de points de données utilisés
- Méthode de calcul employée (visible dans les logs)

---

*Ce système de calendrier intelligent garantit une précision maximale dans les calculs de backtesting, peu importe la complexité ou les lacunes des données historiques.*