// Test spécifique pour la fonction sign up
import { supabase } from '../lib/supabase'

export const testSignUpFunction = async () => {
  console.log('🧪 Test de la fonction sign up...')
  
  try {
    // Test 1: Vérifier la configuration Supabase
    console.log('1️⃣ Vérification de la configuration Supabase...')
    console.log('URL:', supabase.supabaseUrl)
    console.log('Anon Key:', supabase.supabaseKey ? 'Présent' : 'Manquant')
    
    // Test 2: Test de connexion basique
    console.log('2️⃣ Test de connexion basique...')
    const { data: testData, error: testError } = await supabase
      .from('forex_strategies')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Erreur de connexion:', testError)
      return { success: false, error: 'Connexion Supabase échouée' }
    }
    console.log('✅ Connexion Supabase OK')
    
    // Test 3: Test de sign up avec un email de test
    console.log('3️⃣ Test de sign up...')
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User',
          role: 'Risk Manager'
        }
      }
    })
    
    if (error) {
      console.error('❌ Erreur de sign up:', error)
      return {
        success: false,
        error: error.message,
        details: {
          code: error.status,
          message: error.message
        }
      }
    }
    
    console.log('✅ Sign up réussi!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('Email confirmé:', data.user?.email_confirmed_at ? 'Oui' : 'Non')
    
    // Test 4: Nettoyer l'utilisateur de test
    if (data.user?.id) {
      console.log('4️⃣ Nettoyage de l\'utilisateur de test...')
      // Note: On ne peut pas supprimer l'utilisateur via l'API client
      // Il faudra le faire manuellement dans le dashboard Supabase
      console.log('⚠️ Utilisateur de test créé, à supprimer manuellement:', testEmail)
    }
    
    return {
      success: true,
      message: 'Sign up fonctionne correctement',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailConfirmed: !!data.user?.email_confirmed_at
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erreur inattendue:', error)
    return {
      success: false,
      error: error.message || 'Erreur inattendue'
    }
  }
}

// Test de configuration Supabase
export const testSupabaseConfig = async () => {
  console.log('🔧 Test de la configuration Supabase...')
  
  try {
    // Vérifier les variables d'environnement
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    console.log('Variables d\'environnement:')
    console.log('- VITE_SUPABASE_URL:', url ? 'Présent' : 'Manquant')
    console.log('- VITE_SUPABASE_ANON_KEY:', key ? 'Présent' : 'Manquant')
    
    if (!url || !key) {
      return {
        success: false,
        error: 'Variables d\'environnement manquantes',
        missing: {
          url: !url,
          key: !key
        }
      }
    }
    
    // Vérifier la configuration du client
    console.log('Configuration du client Supabase:')
    console.log('- URL:', supabase.supabaseUrl)
    console.log('- Anon Key:', supabase.supabaseKey ? 'Présent' : 'Manquant')
    
    // Test de ping
    const { data, error } = await supabase
      .from('forex_strategies')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Erreur de ping:', error)
      return {
        success: false,
        error: error.message,
        details: error
      }
    }
    
    console.log('✅ Configuration Supabase OK')
    return {
      success: true,
      message: 'Configuration Supabase correcte'
    }
    
  } catch (error: any) {
    console.error('❌ Erreur de configuration:', error)
    return {
      success: false,
      error: error.message || 'Erreur de configuration'
    }
  }
}

// Test des paramètres d'authentification
export const testAuthSettings = async () => {
  console.log('🔐 Test des paramètres d\'authentification...')
  
  try {
    // Vérifier les paramètres d'authentification
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Erreur de session:', error)
      return {
        success: false,
        error: error.message
      }
    }
    
    console.log('Session actuelle:', data.session ? 'Connecté' : 'Non connecté')
    
    // Test de récupération des paramètres
    const { data: settings, error: settingsError } = await supabase
      .from('forex_strategies')
      .select('*')
      .limit(1)
    
    if (settingsError) {
      console.error('❌ Erreur de paramètres:', settingsError)
      return {
        success: false,
        error: settingsError.message
      }
    }
    
    console.log('✅ Paramètres d\'authentification OK')
    return {
      success: true,
      message: 'Paramètres d\'authentification corrects'
    }
    
  } catch (error: any) {
    console.error('❌ Erreur de paramètres d\'authentification:', error)
    return {
      success: false,
      error: error.message || 'Erreur de paramètres'
    }
  }
}

// Exporter les fonctions globalement pour la console
if (typeof window !== 'undefined') {
  (window as any).testSignUpFunction = testSignUpFunction
  (window as any).testSupabaseConfig = testSupabaseConfig
  (window as any).testAuthSettings = testAuthSettings
  
  console.log('🧪 Fonctions de test sign up disponibles:')
  console.log('   - testSignUpFunction()')
  console.log('   - testSupabaseConfig()')
  console.log('   - testAuthSettings()')
}
