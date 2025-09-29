# Configuration de Déploiement - Forex Pricers

## 🔧 Variables d'Environnement Requises

### Variables Supabase (Obligatoires)
```bash
VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZXR5dndqYXduaG5vd2R1bnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzM5MDcsImV4cCI6MjA3NDU0OTkwN30.M7CkHVh812jNENMlZVoDkCt1vZlgar-3cmwF4xAmtOs
```

### Variables Application (Optionnelles)
```bash
VITE_APP_NAME=Forex Pricers
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
```

### Feature Flags
```bash
VITE_ENABLE_SUPABASE_SYNC=true
VITE_ENABLE_REAL_TIME_DATA=false
VITE_ENABLE_ADVANCED_ANALYTICS=true
VITE_ENABLE_USER_AUTHENTICATION=true
```

## 🚀 Instructions de Déploiement

### 1. Configuration Supabase
1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL
3. Exécutez le script `supabase-schema.sql`
4. Vérifiez que les tables sont créées

### 2. Configuration de l'Application
1. Définissez les variables d'environnement
2. Lancez `npm run build`
3. Déployez le dossier `dist/`

### 3. Vérification Post-Déploiement
1. Testez la connexion Supabase
2. Vérifiez l'authentification
3. Testez la synchronisation des données
