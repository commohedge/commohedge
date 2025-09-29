// Configuration de l'environnement
export const config = {
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://xxetyvwjawnhnowdunsw.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZXR5dndqYXduaG5vd2R1bnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzM5MDcsImV4cCI6MjA3NDU0OTkwN30.M7CkHVh812jNENMlZVoDkCt1vZlgar-3cmwF4xAmtOs'
  },
  
  // Application Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Forex Pricers',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development',
    baseUrl: import.meta.env.VITE_APP_BASE_URL || window.location.origin
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
    supabaseSync: import.meta.env.VITE_ENABLE_SUPABASE_SYNC !== 'false',
    realTimeData: import.meta.env.VITE_ENABLE_REAL_TIME_DATA === 'true',
    advancedAnalytics: import.meta.env.VITE_ENABLE_ADVANCED_ANALYTICS !== 'false',
    userAuthentication: import.meta.env.VITE_ENABLE_USER_AUTHENTICATION !== 'false'
  },
  
  // Performance Configuration
  performance: {
    syncInterval: parseInt(import.meta.env.VITE_SYNC_INTERVAL || '30000'), // 30 secondes
    maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES || '3'),
    requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000') // 10 secondes
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
