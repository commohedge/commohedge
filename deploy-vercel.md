# 🚀 Guide de Déploiement Vercel - Correction 404

## 🔍 **Problème Identifié**

✅ **Supabase OAuth** : Fonctionne (redirection vers Vercel)  
❌ **Routing Vercel** : Erreur 404 sur `/dashboard`

## 🛠️ **Solutions Appliquées**

### **1. Fichier `vercel.json` Créé**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### **2. Fichier `public/_redirects` Créé**
```
/*    /index.html   200
```

## 📋 **Étapes de Déploiement**

### **Étape 1 : Commiter les Changements**
```bash
git add .
git commit -m "Fix Vercel routing configuration"
git push origin main
```

### **Étape 2 : Redéployer sur Vercel**
1. Allez sur votre dashboard Vercel
2. Cliquez sur "Redeploy" pour votre projet
3. Ou attendez le déploiement automatique

### **Étape 3 : Vérifier la Configuration**
- ✅ `vercel.json` présent à la racine
- ✅ `public/_redirects` présent
- ✅ Routes React définies dans `App.tsx`

## 🧪 **Test de Fonctionnement**

1. **Testez la connexion Google** sur Vercel
2. **Vérifiez** que vous arrivez sur `/dashboard` sans erreur 404
3. **Confirmez** que l'authentification fonctionne

## 🔧 **Configuration Vercel Dashboard**

Si le problème persiste, vérifiez dans Vercel :

1. **Settings** → **Functions**
2. **Build & Development Settings**
3. **Framework Preset** : Vite
4. **Build Command** : `npm run build`
5. **Output Directory** : `dist`

## 📊 **Variables d'Environnement Vercel**

Assurez-vous que ces variables sont définies :

```bash
VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZXR5dndqYXduaG5vd2R1bnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzM5MDcsImV4cCI6MjA3NDU0OTkwN30.M7CkHVh812jNENMlZVoDkCt1vZlgar-3cmwF4xAmtOs
```

## 🎯 **Résultat Attendu**

Après le redéploiement :
- ✅ Connexion Google fonctionne
- ✅ Redirection vers `/dashboard` sans erreur 404
- ✅ Application React charge correctement
- ✅ Authentification Supabase opérationnelle

## 🆘 **Dépannage**

Si l'erreur 404 persiste :

1. **Vérifiez les logs Vercel** dans Functions → Logs
2. **Testez en local** : `npm run build && npm run preview`
3. **Vérifiez** que `dist/index.html` contient votre application
4. **Contactez le support Vercel** si nécessaire
