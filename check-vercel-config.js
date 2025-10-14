// Script pour vérifier la configuration Vercel + Supabase
// Exécutez ce script dans la console de votre navigateur sur Vercel

console.log('🔍 Vérification de la configuration Vercel + Supabase');

// Vérifier les variables d'environnement
console.log('📊 Variables d\'environnement:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Présent' : 'Manquant');

// Vérifier l'URL actuelle
console.log('🌐 URL actuelle:', window.location.href);
console.log('🏠 Origin:', window.location.origin);

// Vérifier la configuration Supabase
if (typeof supabase !== 'undefined') {
  console.log('✅ Supabase client initialisé');
  
  // Tester la connexion
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ Erreur de session:', error);
    } else {
      console.log('📱 Session actuelle:', data.session ? 'Connecté' : 'Non connecté');
      if (data.session) {
        console.log('👤 Utilisateur:', data.session.user.email);
      }
    }
  });
} else {
  console.error('❌ Supabase client non initialisé');
}

// Vérifier les redirections
console.log('🔄 Test de redirection Google OAuth...');
console.log('URL de redirection attendue:', window.location.origin + '/dashboard');

// Fonction de test de connexion Google
window.testGoogleAuth = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    
    if (error) {
      console.error('❌ Erreur OAuth:', error);
    } else {
      console.log('✅ Redirection OAuth initiée:', data);
    }
  } catch (err) {
    console.error('❌ Erreur de test:', err);
  }
};

console.log('🧪 Pour tester la connexion Google, exécutez: testGoogleAuth()');
