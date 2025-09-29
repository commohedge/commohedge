# Guide de Déploiement - Forex Pricers

## 🚀 Déploiement Complet et Production-Ready

Ce guide vous accompagne pour déployer l'application Forex Pricers avec une intégration Supabase complète et optimisée.

## 📋 Prérequis

### 1. **Configuration Supabase**
- ✅ Projet Supabase créé
- ✅ Tables créées avec le script `supabase-schema.sql`
- ✅ URL et clé API récupérées

### 2. **Variables d'Environnement**
```bash
# Obligatoires
VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optionnelles
VITE_APP_NAME=Forex Pricers
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
```

## 🔧 Déploiement Automatique

### Script de Déploiement
```bash
# Exécuter le script de déploiement
node deploy.js

# Ou avec npm
npm run deploy
```

Le script automatise :
- ✅ Vérification des prérequis
- ✅ Nettoyage du build précédent
- ✅ Installation des dépendances
- ✅ Construction optimisée
- ✅ Vérification du build
- ✅ Génération des rapports

## 🌐 Déploiement sur Différentes Plateformes

### 1. **Vercel** (Recommandé)

#### Configuration
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod
```

#### Variables d'environnement dans Vercel
```bash
VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENVIRONMENT=production
```

#### Fichier `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. **Netlify**

#### Configuration
```bash
# Installer Netlify CLI
npm i -g netlify-cli

# Déployer
netlify deploy --prod --dir=dist
```

#### Fichier `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. **GitHub Pages**

#### Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 4. **Docker**

#### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache statique
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 🔒 Configuration de Sécurité

### 1. **Politiques RLS Supabase**

#### Activer l'authentification
```sql
-- Dans l'éditeur SQL de Supabase
-- Remplacer les politiques publiques par :

-- Politiques pour les stratégies
DROP POLICY IF EXISTS "Allow all operations on forex_strategies" ON forex_strategies;
CREATE POLICY "Users can manage their own strategies" ON forex_strategies
    FOR ALL USING (auth.uid() = user_id);

-- Politiques pour les scénarios
DROP POLICY IF EXISTS "Allow all operations on saved_scenarios" ON saved_scenarios;
CREATE POLICY "Users can manage their own scenarios" ON saved_scenarios
    FOR ALL USING (auth.uid() = user_id);

-- Politiques pour les matrices de risque
DROP POLICY IF EXISTS "Allow all operations on risk_matrices" ON risk_matrices;
CREATE POLICY "Users can manage their own risk matrices" ON risk_matrices
    FOR ALL USING (auth.uid() = user_id);

-- Politiques pour les instruments de couverture
DROP POLICY IF EXISTS "Allow all operations on hedging_instruments" ON hedging_instruments;
CREATE POLICY "Users can manage their own hedging instruments" ON hedging_instruments
    FOR ALL USING (auth.uid() = user_id);
```

### 2. **Configuration CORS**
```sql
-- Dans l'éditeur SQL de Supabase
-- Configurer CORS pour votre domaine
UPDATE auth.config 
SET site_url = 'https://votre-domaine.com',
    additional_redirect_urls = 'https://votre-domaine.com/**';
```

## 📊 Monitoring et Analytics

### 1. **Services Intégrés**
- ✅ **ErrorService** : Gestion centralisée des erreurs
- ✅ **MonitoringService** : Surveillance des performances
- ✅ **CacheService** : Optimisation du cache
- ✅ **AutoSyncService** : Synchronisation automatique

### 2. **Métriques Disponibles**
- 📈 Temps de réponse
- 📊 Taux d'erreur
- 💾 Utilisation mémoire
- 🔄 Statut de connexion Supabase

### 3. **Logs de Production**
```javascript
// Accéder aux métriques dans la console
const monitoring = MonitoringService.getInstance()
const stats = monitoring.getPerformanceStats()
console.log('Performance stats:', stats)
```

## 🧪 Tests Post-Déploiement

### 1. **Vérifications Essentielles**
```bash
# 1. Vérifier la connexion Supabase
curl -X GET "https://votre-domaine.com/api/health"

# 2. Tester l'authentification
# - Inscription d'un nouvel utilisateur
# - Connexion
# - Déconnexion

# 3. Tester la synchronisation
# - Créer une stratégie
# - Vérifier la sauvegarde
# - Tester le chargement
```

### 2. **Checklist de Déploiement**
- [ ] Variables d'environnement configurées
- [ ] Tables Supabase créées
- [ ] Politiques RLS configurées
- [ ] CORS configuré
- [ ] SSL/HTTPS activé
- [ ] Cache configuré
- [ ] Monitoring activé
- [ ] Tests fonctionnels passés

## 🚨 Dépannage

### Problèmes Courants

#### 1. **Erreur de Connexion Supabase**
```bash
# Vérifier les variables d'environnement
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Vérifier la configuration CORS
# Dans Supabase Dashboard > Settings > API
```

#### 2. **Erreur 404 sur les Routes**
```bash
# Vérifier la configuration de redirection
# Toutes les routes doivent rediriger vers index.html
```

#### 3. **Problèmes de Performance**
```bash
# Vérifier la taille du bundle
npm run build
ls -la dist/assets/

# Optimiser les images
# Utiliser des formats modernes (WebP, AVIF)
```

## 📈 Optimisations Avancées

### 1. **CDN et Cache**
```bash
# Configuration Cloudflare
# - Activer le cache
# - Configurer les règles de cache
# - Optimiser les images
```

### 2. **Monitoring Externe**
```bash
# Intégration avec Sentry
npm install @sentry/react @sentry/tracing

# Configuration dans main.tsx
import * as Sentry from "@sentry/react"
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production"
})
```

### 3. **Analytics**
```bash
# Intégration Google Analytics
npm install gtag

# Configuration dans index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

## 🎉 Résultat Final

Après le déploiement, votre application disposera de :

- ✅ **Authentification complète** avec Supabase Auth
- ✅ **Synchronisation automatique** des données
- ✅ **Interface utilisateur** moderne et responsive
- ✅ **Gestion d'erreur** robuste
- ✅ **Monitoring** en temps réel
- ✅ **Cache optimisé** pour les performances
- ✅ **Sécurité** avec RLS et CORS
- ✅ **Déploiement automatisé**

---

**🚀 Votre application Forex Pricers est maintenant prête pour la production !**
