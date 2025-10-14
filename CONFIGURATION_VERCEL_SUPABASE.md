# 🔧 Configuration Vercel + Supabase OAuth

## 🚨 **PROBLÈME IDENTIFIÉ**

Quand vous vous connectez avec Google sur Vercel, l'application redirige vers `localhost:3000` au lieu de rester sur votre domaine Vercel.

**URL problématique :**
```
http://localhost:3000/#access_token=eyJhbGciOiJIUzI1NiIsImtpZCI6ImlFenBXcytya2EzK1ltYTkiLCJ0eXAiOiJKV1QifQ...
```

## ✅ **SOLUTION**

### **1. Configuration Supabase Dashboard**

#### **A. Accéder aux Paramètres**
1. Allez sur : https://supabase.com/dashboard/project/xxetyvwjawnhnowdunsw
2. Cliquez sur **"Authentication"** dans le menu de gauche
3. Cliquez sur **"URL Configuration"**

#### **B. Configurer les URLs**

**Site URL :**
```
https://forex-pricers-advanced.vercel.app
```

**Redirect URLs (une par ligne) :**
```
https://forex-pricers-advanced.vercel.app/**
https://forex-pricers-advanced.vercel.app/dashboard
https://forex-pricers-advanced.vercel.app/login
https://forex-pricers-advanced.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:5173/**
http://localhost:8072/**
```

#### **C. Configurer Google OAuth**
1. Dans **"Authentication"** → **"Providers"** → **"Google"**
2. Activez Google si ce n'est pas déjà fait
3. Dans **"Authorized redirect URIs"**, ajoutez :
```
https://forex-pricers-advanced.vercel.app/auth/callback
https://xxetyvwjawnhnowdunsw.supabase.co/auth/v1/callback
```

### **2. Variables d'Environnement Vercel**

Dans votre dashboard Vercel, ajoutez ces variables d'environnement :

```bash
VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZXR5dndqYXduaG5vd2R1bnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzM5MDcsImV4cCI6MjA3NDU0OTkwN30.M7CkHVh812jNENMlZVoDkCt1vZlgar-3cmwF4xAmtOs
```

### **3. Code de Redirection (Optionnel)**

Si le problème persiste, ajoutez ce code dans votre composant de connexion :

```typescript
// Dans votre composant de connexion Google
const handleGoogleSignIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  })
}
```

## 🧪 **TEST**

1. Sauvegardez les modifications dans Supabase
2. Redéployez votre application Vercel
3. Testez la connexion Google
4. Vérifiez que vous restez sur `https://forex-pricers-advanced.vercel.app`

## 📋 **CHECKLIST**

- [ ] Site URL configuré sur `https://forex-pricers-advanced.vercel.app`
- [ ] Redirect URLs incluent votre domaine Vercel
- [ ] Google OAuth redirect URI configuré
- [ ] Variables d'environnement Vercel mises à jour
- [ ] Application redéployée
- [ ] Test de connexion Google réussi

## 🔍 **DÉBOGAGE**

Si le problème persiste :

1. **Vérifiez les logs Vercel** pour les erreurs
2. **Vérifiez les logs Supabase** dans Authentication → Logs
3. **Testez en local** d'abord avec `http://localhost:3000`
4. **Vérifiez la console navigateur** pour les erreurs JavaScript

## 📞 **SUPPORT**

Si vous avez besoin d'aide supplémentaire :
- Logs Supabase : https://supabase.com/dashboard/project/xxetyvwjawnhnowdunsw/logs
- Logs Vercel : Dashboard Vercel → Functions → Logs
