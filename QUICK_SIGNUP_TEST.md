# Test Rapide - Problème Sign Up

## 🚀 Test Immédiat

### 1. **Démarrer l'Application**
```bash
npm run dev
```

### 2. **Ouvrir la Console (F12)**
Aller sur `http://localhost:5173/supabase-login`

### 3. **Exécuter les Tests de Diagnostic**
Dans la console du navigateur :

```javascript
// Test 1: Configuration Supabase
testSupabaseConfig()

// Test 2: Fonction Sign Up
testSignUpFunction()

// Test 3: Paramètres d'authentification
testAuthSettings()
```

### 4. **Tester l'Inscription Manuelle**
1. Aller sur `/supabase-login`
2. Cliquer sur "Pas de compte ? Créer un compte"
3. Remplir le formulaire :
   ```
   Nom: Test User
   Email: test@example.com
   Password: TestPassword123!
   ```
4. Cliquer sur "Créer le compte"
5. Vérifier les logs dans la console

## 🔍 Diagnostic des Erreurs

### **Erreur: "Variables d'environnement manquantes"**
**Solution :**
```bash
# Créer le fichier .env.local dans le répertoire racine
echo "VITE_SUPABASE_URL=https://xxetyvwjawnhnowdunsw.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZXR5dndqYXduaG5vd2R1bnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzM5MDcsImV4cCI6MjA3NDU0OTkwN30.M7CkHVh812jNENMlZVoDkCt1vZlgar-3cmwF4xAmtOs" >> .env.local
```

### **Erreur: "User already registered"**
**Solution :**
- Utiliser un email différent
- Ou se connecter avec l'email existant

### **Erreur: "Email confirmation required"**
**Solution :**
1. Aller dans Supabase Dashboard
2. Authentication → Settings
3. Désactiver "Enable email confirmations"
4. Sauvegarder

### **Erreur: "Invalid API key"**
**Solution :**
1. Vérifier la clé API dans Supabase Dashboard
2. Copier la nouvelle clé dans .env.local
3. Redémarrer le serveur

## 🎯 Test de Validation

### **Données de Test Valides**
```
Nom: John Doe
Email: john.doe@example.com
Password: SecurePass123!
```

### **Résultats Attendus**
- ✅ Message "Inscription réussie"
- ✅ Toast de confirmation
- ✅ Redirection vers dashboard (si email confirmé)
- ✅ Utilisateur visible dans Supabase Dashboard

## 🚨 Solutions d'Urgence

### **Solution 1: Désactiver la Confirmation Email**
```sql
-- Dans Supabase Dashboard → SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'test@example.com';
```

### **Solution 2: Créer un Utilisateur Manuel**
1. Supabase Dashboard → Authentication → Users
2. "Add user"
3. Email: `demo@fx-hedging.com`
4. Password: `demo123`
5. Confirm: `true`

### **Solution 3: Test avec API Directe**
```javascript
// Dans la console du navigateur
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'TestPassword123!'
})
console.log('Data:', data)
console.log('Error:', error)
```

## 📋 Checklist de Résolution

- [ ] Variables d'environnement configurées
- [ ] Serveur redémarré
- [ ] Console du navigateur ouverte
- [ ] Tests de diagnostic exécutés
- [ ] Données de test valides utilisées
- [ ] Logs d'erreur vérifiés
- [ ] Configuration Supabase vérifiée

## 🎊 Test Final

Si tout fonctionne :
1. ✅ Inscription réussie
2. ✅ Message de confirmation
3. ✅ Utilisateur créé dans Supabase
4. ✅ Redirection vers dashboard

---

**🎯 Objectif :** Résoudre rapidement le problème de sign up pour permettre l'inscription des utilisateurs.
