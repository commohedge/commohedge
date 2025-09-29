# Guide de Résolution - Problème Sign Up

## 🔍 Diagnostic du Problème

Le problème avec la fonction sign up peut avoir plusieurs causes. Voici un guide complet pour diagnostiquer et résoudre le problème.

## 🧪 Tests de Diagnostic

### 1. **Test de Configuration Supabase**

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
// Test de la configuration Supabase
testSupabaseConfig()
```

**Résultats attendus :**
- ✅ Variables d'environnement présentes
- ✅ Configuration du client correcte
- ✅ Connexion Supabase OK

### 2. **Test de la Fonction Sign Up**

```javascript
// Test direct de la fonction sign up
testSignUpFunction()
```

**Résultats attendus :**
- ✅ Connexion Supabase OK
- ✅ Sign up réussi
- ✅ Utilisateur créé

### 3. **Test des Paramètres d'Authentification**

```javascript
// Test des paramètres d'authentification
testAuthSettings()
```

## 🚨 Causes Possibles et Solutions

### **Cause 1: Configuration Supabase**

**Symptômes :**
- Erreur "Invalid API key"
- Erreur de connexion
- Variables d'environnement manquantes

**Solutions :**

1. **Vérifier les variables d'environnement :**
   ```env
   VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Créer un fichier `.env.local` :**
   ```bash
   # Dans le répertoire racine du projet
   touch .env.local
   ```

3. **Redémarrer le serveur de développement :**
   ```bash
   npm run dev
   ```

### **Cause 2: Paramètres d'Authentification Supabase**

**Symptômes :**
- Erreur "Email confirmation required"
- Erreur "User already registered"
- Erreur de validation

**Solutions :**

1. **Vérifier les paramètres dans Supabase Dashboard :**
   - Allez dans **Authentication** → **Settings**
   - Vérifiez que **Enable email confirmations** est configuré correctement
   - Vérifiez les **Site URL** et **Redirect URLs**

2. **Configurer les URLs de redirection :**
   ```
   Site URL: http://localhost:5173
   Redirect URLs: 
   - http://localhost:5173/dashboard
   - http://localhost:5173/supabase-login
   ```

### **Cause 3: Politiques RLS (Row Level Security)**

**Symptômes :**
- Erreur "Row Level Security"
- Erreur de permissions
- Données non accessibles

**Solutions :**

1. **Vérifier les politiques RLS dans Supabase :**
   ```sql
   -- Vérifier que RLS est activé
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Mettre à jour les politiques si nécessaire :**
   ```sql
   -- Politique temporaire pour les tests
   CREATE POLICY "Allow all operations for testing" ON forex_strategies
       FOR ALL USING (true);
   ```

### **Cause 4: Problème de Validation des Données**

**Symptômes :**
- Erreur de validation des champs
- Erreur "Invalid email format"
- Erreur de mot de passe

**Solutions :**

1. **Vérifier la validation côté client :**
   - Email valide
   - Mot de passe d'au moins 6 caractères
   - Nom rempli pour l'inscription

2. **Tester avec des données valides :**
   ```
   Email: test@example.com
   Password: TestPassword123!
   Name: Test User
   ```

### **Cause 5: Problème de Réseau/CORS**

**Symptômes :**
- Erreur CORS
- Timeout de connexion
- Erreur réseau

**Solutions :**

1. **Vérifier la configuration CORS dans Supabase :**
   - Allez dans **Settings** → **API**
   - Ajoutez `http://localhost:5173` aux domaines autorisés

2. **Vérifier la connexion internet**
3. **Tester avec un autre navigateur**

## 🔧 Solutions Spécifiques

### **Solution 1: Désactiver Temporairement la Confirmation Email**

Si le problème vient de la confirmation email :

1. **Dans Supabase Dashboard :**
   - Allez dans **Authentication** → **Settings**
   - Désactivez **Enable email confirmations**
   - Sauvegardez les changements

2. **Tester l'inscription :**
   - L'utilisateur sera créé directement
   - Pas besoin de confirmation email

### **Solution 2: Créer un Utilisateur de Test Manuel**

1. **Dans Supabase Dashboard :**
   - Allez dans **Authentication** → **Users**
   - Cliquez sur **"Add user"**
   - Créez un utilisateur de test

2. **Utiliser cet utilisateur pour tester :**
   ```
   Email: demo@fx-hedging.com
   Password: demo123
   ```

### **Solution 3: Vérifier les Logs de Debug**

1. **Ouvrir la console du navigateur (F12)**
2. **Aller sur la page de sign up**
3. **Tenter une inscription**
4. **Vérifier les logs d'erreur**

### **Solution 4: Test avec un Email Différent**

Parfois, l'email peut déjà exister :

```javascript
// Test avec un email unique
const testEmail = `test-${Date.now()}@example.com`
```

## 📋 Checklist de Diagnostic

- [ ] Variables d'environnement configurées
- [ ] Serveur de développement redémarré
- [ ] Configuration Supabase vérifiée
- [ ] URLs de redirection configurées
- [ ] Politiques RLS vérifiées
- [ ] Données de test valides
- [ ] Console du navigateur vérifiée
- [ ] Connexion internet stable

## 🚀 Test Final

Après avoir appliqué les solutions :

1. **Redémarrer l'application :**
   ```bash
   npm run dev
   ```

2. **Aller sur `/supabase-login`**

3. **Basculer en mode "Créer un compte"**

4. **Remplir le formulaire :**
   ```
   Nom: Test User
   Email: test@example.com
   Password: TestPassword123!
   ```

5. **Cliquer sur "Créer le compte"**

6. **Vérifier les résultats :**
   - Message de succès
   - Redirection vers le dashboard
   - Utilisateur créé dans Supabase

## 📞 Support Supplémentaire

Si le problème persiste :

1. **Vérifier les logs Supabase :**
   - Allez dans **Logs** → **Auth**
   - Cherchez les erreurs récentes

2. **Tester avec l'API directement :**
   ```javascript
   // Test direct de l'API Supabase
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'TestPassword123!'
   })
   console.log('Data:', data)
   console.log('Error:', error)
   ```

3. **Vérifier la documentation Supabase :**
   - [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
   - [Troubleshooting Guide](https://supabase.com/docs/guides/auth/troubleshooting)

---

**🎯 Objectif :** Résoudre le problème de sign up pour permettre l'inscription des nouveaux utilisateurs.

**📝 Note :** Gardez ce guide à portée de main pour les futurs problèmes d'authentification.
