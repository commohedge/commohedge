// Configuration de l'environnement
//
// Intelligence workspace (carte, Hormuz, AIS, Live TV) — variables optionnelles utiles :
// - VITE_PMTILES_URL / VITE_PMTILES_URL_PUBLIC : tuiles vectorielles Protomaps (carte détaillée)
// - VITE_LIVE_NEWS_API_BASE : relais métadonnées YouTube (défaut interne world-watcher si non défini)
// - VITE_WS_API_URL : API WorldMonitor / RPC (optionnel)
// - VITE_FUTURES_SUPABASE_URL / VITE_FUTURES_SUPABASE_PUBLISHABLE_KEY : second projet Supabase (scraping / terminal)
// Les Edge Functions `hormuz-tracker` et `ais-sse` doivent être déployées sur le projet visé par
// VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (ou utiliser les mêmes URL/clés que le projet `fertilizers`).
// Copier les entrées du fichier `fertilizers/.env` vers la racine de cette app (fichier `.env` local, non versionné).
//
// Carte / intelligence :
// - VITE_WS_API_URL : API WorldMonitor (couches RPC). Par défaut le code utilise api.worldmonitor.app en localhost.
// - VITE_PMTILES_URL : tuiles Protomaps vectorielles (optionnel) ; sans → fond OpenFreeMap / CARTO.
// - VITE_MAP_INTERACTION_MODE=flat : affichage 2D “plat” côté deck ; sans → mode 3D bâtiments quand le style le permet.
// - Globe 3D : WebGL2 requis ; bouton 2D/3D sur la carte. Workspace intégré : globe par défaut (desktop).
//   VITE_DEFAULT_MAP_MODE=globe|flat pour forcer le défaut si pas de clé localStorage.
export const config = {
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://iflnsckduohrcafafcpj.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1wxQlJYrs4cqXinMMohHtw_KIsybCpJ'
  },
  
  // Application Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Forex Pricers',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development'
  },
  
  // External APIs
  apis: {
    exchangeRate: {
      key: import.meta.env.VITE_EXCHANGE_RATE_API_KEY || ''
    },
    bloomberg: {
      key: import.meta.env.VITE_BLOOMBERG_API_KEY || ''
    }
  },
  
  // Feature Flags
  features: {
    supabaseSync: true,
    realTimeData: false,
    advancedAnalytics: true,
    userAuthentication: true
  }
}

// Validation de la configuration
export const validateConfig = () => {
  const errors: string[] = []
  
  if (!config.supabase.url) {
    errors.push('VITE_SUPABASE_URL is required')
  }
  
  if (!config.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is required')
  }
  
  if (errors.length > 0) {
    console.warn('Configuration validation errors:', errors)
  }
  
  return errors.length === 0
}

// Initialiser la validation
validateConfig()
