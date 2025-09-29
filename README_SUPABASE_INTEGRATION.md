# Intégration Supabase - Forex Pricers

Ce document explique comment configurer et utiliser l'intégration Supabase avec l'application Forex Pricers.

## 🚀 Configuration Initiale

### 1. Installation des Dépendances

Les dépendances Supabase sont déjà installées :
```bash
npm install @supabase/supabase-js
```

### 2. Configuration de la Base de Données

1. **Connectez-vous à votre projet Supabase** : https://supabase.com/dashboard
2. **Allez dans l'éditeur SQL** de votre projet
3. **Exécutez le script SQL** fourni dans `supabase-schema.sql`

Ce script créera :
- 4 tables principales : `forex_strategies`, `saved_scenarios`, `risk_matrices`, `hedging_instruments`
- Les index pour optimiser les performances
- Les triggers pour la mise à jour automatique des timestamps
- Les politiques RLS (Row Level Security) pour la sécurité

### 3. Configuration de l'Application

L'application est déjà configurée avec :
- **URL Supabase** : `https://xxetyvwjawnhnowdunsw.supabase.co`
- **Clé API** : Configurée dans `src/lib/supabase.ts`

## 📊 Structure des Données

### Tables Principales

#### 1. `forex_strategies`
Stocke les stratégies Forex complètes avec tous leurs paramètres :
- Paramètres de base (dates, taux, volumes, paires de devises)
- Composants de stratégie (options, barrières, etc.)
- Modèles de pricing
- Résultats et données de payoff
- Scénarios de stress test

#### 2. `saved_scenarios`
Stocke les scénarios sauvegardés :
- Paramètres du scénario
- Stratégies associées
- Résultats de calcul
- Données de payoff

#### 3. `risk_matrices`
Stocke les matrices de risque :
- Composants de la matrice
- Ratio de couverture
- Résultats d'analyse

#### 4. `hedging_instruments`
Stocke les instruments de couverture :
- Type d'instrument
- Paramètres de pricing
- Dates et maturités
- Valeurs MTM

## 🔧 Utilisation

### 1. Accès à la Synchronisation

1. **Connectez-vous** à l'application
2. **Allez dans le menu latéral** → "Database Sync"
3. **Vérifiez le statut de connexion** (vert = connecté, rouge = déconnecté)

### 2. Synchronisation des Données

#### Sauvegarder vers Supabase
- Cliquez sur **"Sauvegarder"** pour envoyer toutes vos données locales vers Supabase
- Cela inclut : stratégies, scénarios, matrices de risque, instruments de couverture

#### Charger depuis Supabase
- Cliquez sur **"Charger"** pour récupérer les données depuis Supabase
- Les données locales seront remplacées par celles de la base de données

### 3. Statistiques

La page affiche des statistiques en temps réel :
- Nombre de stratégies sauvegardées
- Nombre de scénarios sauvegardés
- Nombre de matrices de risque
- Nombre d'instruments de couverture

## 🛠️ API et Hooks

### Hook `useSupabase`

```typescript
import { useSupabase } from '../hooks/useSupabase'

const { 
  isConnected, 
  loading, 
  error,
  saveStrategy,
  getStrategies,
  // ... autres méthodes
} = useSupabase()
```

### Service `SupabaseService`

```typescript
import { SupabaseService } from '../lib/supabase'

// Sauvegarder une stratégie
const strategy = await SupabaseService.saveStrategy(strategyData)

// Récupérer toutes les stratégies
const strategies = await SupabaseService.getStrategies()
```

## 🔒 Sécurité

### Politiques RLS (Row Level Security)

Actuellement, les politiques permettent l'accès public. Pour un environnement de production :

1. **Activez l'authentification** dans Supabase
2. **Modifiez les politiques RLS** pour restreindre l'accès par utilisateur
3. **Implémentez l'authentification** dans l'application

### Exemple de politique sécurisée :

```sql
-- Remplacer la politique publique par :
CREATE POLICY "Users can only see their own strategies" ON forex_strategies
    FOR ALL USING (auth.uid() = user_id);
```

## 📝 Types TypeScript

### Interface `ForexStrategy`

```typescript
interface ForexStrategy {
  id?: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
  
  // Paramètres principaux
  start_date: string
  strategy_start_date: string
  months_to_hedge: number
  domestic_rate: number
  foreign_rate: number
  base_volume: number
  quote_volume: number
  spot_price: number
  currency_pair: CurrencyPair
  use_custom_periods: boolean
  custom_periods?: CustomPeriod[]
  
  // Composants de stratégie
  strategy_components: StrategyComponent[]
  
  // ... autres propriétés
}
```

## 🚨 Dépannage

### Problèmes Courants

1. **Erreur de connexion**
   - Vérifiez votre connexion internet
   - Vérifiez que l'URL et la clé API sont correctes
   - Vérifiez que les tables existent dans Supabase

2. **Erreur de permissions**
   - Vérifiez que les politiques RLS sont correctement configurées
   - Vérifiez que l'utilisateur a les bonnes permissions

3. **Données corrompues**
   - Vérifiez le format JSON des données
   - Utilisez la fonction de récupération d'urgence si disponible

### Logs et Debug

Les erreurs sont loggées dans la console du navigateur. Activez les outils de développement pour voir les détails.

## 🔄 Sauvegarde et Récupération

### Sauvegarde Automatique

L'application sauvegarde automatiquement dans le localStorage. La synchronisation Supabase ajoute une couche de sauvegarde cloud.

### Récupération d'Urgence

Si les données sont corrompues :
1. **Effacez le localStorage** du navigateur
2. **Rechargez la page**
3. **Chargez les données depuis Supabase**

## 📈 Performance

### Optimisations

- **Index** sur les colonnes fréquemment utilisées
- **Pagination** pour les grandes listes
- **Cache** des requêtes fréquentes
- **Compression** des données JSON

### Monitoring

Surveillez :
- Temps de réponse des requêtes
- Taille des données stockées
- Nombre de requêtes par utilisateur

## 🔮 Évolutions Futures

### Fonctionnalités Prévues

1. **Authentification utilisateur** avec Supabase Auth
2. **Synchronisation en temps réel** avec les subscriptions
3. **Partage de stratégies** entre utilisateurs
4. **Versioning** des stratégies
5. **Backup automatique** programmé
6. **API REST** pour intégrations externes

### Améliorations Techniques

1. **Optimistic updates** pour une meilleure UX
2. **Offline support** avec synchronisation différée
3. **Compression** des données pour réduire la bande passante
4. **Chiffrement** des données sensibles
