import { supabase } from '../lib/supabase'

export interface UserPreferences {
  id?: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'fr' | 'es' | 'de'
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY'
  timezone: string
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  number_format: 'US' | 'EU' | 'UK'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    market_alerts: boolean
    risk_alerts: boolean
  }
  dashboard: {
    default_view: 'overview' | 'detailed' | 'compact'
    auto_refresh: boolean
    refresh_interval: number // en secondes
    show_charts: boolean
    show_news: boolean
  }
  trading: {
    default_currency_pair: string
    default_volume: number
    default_strategy: string
    auto_save: boolean
  }
  privacy: {
    share_analytics: boolean
    share_performance: boolean
    public_profile: boolean
  }
  created_at?: string
  updated_at?: string
}

class UserPreferencesService {
  private static instance: UserPreferencesService
  private cache: Map<string, UserPreferences> = new Map()

  private constructor() {}

  public static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService()
    }
    return UserPreferencesService.instance
  }

  // Obtenir les préférences de l'utilisateur
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      // Vérifier le cache d'abord
      if (this.cache.has(userId)) {
        return this.cache.get(userId)!
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erreur lors de la récupération des préférences:', error)
        return null
      }

      if (data) {
        this.cache.set(userId, data)
        return data
      }

      // Créer des préférences par défaut si elles n'existent pas
      const defaultPreferences = this.getDefaultPreferences(userId)
      await this.saveUserPreferences(defaultPreferences)
      this.cache.set(userId, defaultPreferences)
      return defaultPreferences

    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error)
      return null
    }
  }

  // Sauvegarder les préférences de l'utilisateur
  async saveUserPreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Erreur lors de la sauvegarde des préférences:', error)
        return false
      }

      // Mettre à jour le cache
      this.cache.set(preferences.user_id, preferences)
      return true

    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
      return false
    }
  }

  // Mettre à jour une préférence spécifique
  async updatePreference(userId: string, key: string, value: any): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences(userId)
      if (!currentPreferences) return false

      // Mise à jour récursive de la clé imbriquée
      const updatedPreferences = this.updateNestedKey(currentPreferences, key, value)
      
      return await this.saveUserPreferences(updatedPreferences)

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la préférence:', error)
      return false
    }
  }

  // Synchroniser les préférences avec le localStorage
  async syncWithLocalStorage(userId: string): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId)
      if (preferences) {
        localStorage.setItem('user_preferences', JSON.stringify(preferences))
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation avec localStorage:', error)
    }
  }

  // Charger les préférences depuis le localStorage
  loadFromLocalStorage(): UserPreferences | null {
    try {
      const stored = localStorage.getItem('user_preferences')
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Erreur lors du chargement depuis localStorage:', error)
      return null
    }
  }

  // Obtenir les préférences par défaut
  private getDefaultPreferences(userId: string): UserPreferences {
    return {
      user_id: userId,
      theme: 'system',
      language: 'en',
      currency: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date_format: 'DD/MM/YYYY',
      number_format: 'US',
      notifications: {
        email: true,
        push: true,
        sms: false,
        market_alerts: true,
        risk_alerts: true
      },
      dashboard: {
        default_view: 'overview',
        auto_refresh: true,
        refresh_interval: 30,
        show_charts: true,
        show_news: true
      },
      trading: {
        default_currency_pair: 'EUR/USD',
        default_volume: 1000000,
        default_strategy: 'vanilla_option',
        auto_save: true
      },
      privacy: {
        share_analytics: false,
        share_performance: false,
        public_profile: false
      }
    }
  }

  // Mise à jour récursive d'une clé imbriquée
  private updateNestedKey(obj: any, key: string, value: any): any {
    const keys = key.split('.')
    const result = { ...obj }
    let current = result

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    return result
  }

  // Nettoyer le cache
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId)
    } else {
      this.cache.clear()
    }
  }
}

export default UserPreferencesService
