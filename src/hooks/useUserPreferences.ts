import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from './useSupabaseAuth'
import UserPreferencesService, { UserPreferences } from '../services/UserPreferencesService'

export const useUserPreferences = () => {
  const { user, isAuthenticated } = useSupabaseAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const preferencesService = UserPreferencesService.getInstance()

  // Charger les préférences de l'utilisateur
  const loadPreferences = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Essayer de charger depuis le localStorage d'abord (pour un chargement rapide)
      const localPreferences = preferencesService.loadFromLocalStorage()
      if (localPreferences && localPreferences.user_id === user.id) {
        setPreferences(localPreferences)
      }

      // Charger depuis Supabase (source de vérité)
      const serverPreferences = await preferencesService.getUserPreferences(user.id)
      if (serverPreferences) {
        setPreferences(serverPreferences)
        // Synchroniser avec localStorage
        await preferencesService.syncWithLocalStorage(user.id)
      }

    } catch (err) {
      console.error('Erreur lors du chargement des préférences:', err)
      setError('Erreur lors du chargement des préférences')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, preferencesService])

  // Sauvegarder les préférences
  const savePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    if (!user?.id || !preferences) return false

    try {
      setError(null)
      const updatedPreferences = { ...preferences, ...newPreferences }
      
      const success = await preferencesService.saveUserPreferences(updatedPreferences)
      if (success) {
        setPreferences(updatedPreferences)
        // Synchroniser avec localStorage
        await preferencesService.syncWithLocalStorage(user.id)
        return true
      }
      return false
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des préférences:', err)
      setError('Erreur lors de la sauvegarde des préférences')
      return false
    }
  }, [user?.id, preferences, preferencesService])

  // Mettre à jour une préférence spécifique
  const updatePreference = useCallback(async (key: string, value: any) => {
    if (!user?.id) return false

    try {
      setError(null)
      const success = await preferencesService.updatePreference(user.id, key, value)
      if (success) {
        // Recharger les préférences pour avoir la version à jour
        await loadPreferences()
        return true
      }
      return false
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la préférence:', err)
      setError('Erreur lors de la mise à jour de la préférence')
      return false
    }
  }, [user?.id, loadPreferences, preferencesService])

  // Réinitialiser les préférences aux valeurs par défaut
  const resetPreferences = useCallback(async () => {
    if (!user?.id) return false

    try {
      setError(null)
      const defaultPreferences = preferencesService.getDefaultPreferences(user.id)
      const success = await preferencesService.saveUserPreferences(defaultPreferences)
      if (success) {
        setPreferences(defaultPreferences)
        await preferencesService.syncWithLocalStorage(user.id)
        return true
      }
      return false
    } catch (err) {
      console.error('Erreur lors de la réinitialisation des préférences:', err)
      setError('Erreur lors de la réinitialisation des préférences')
      return false
    }
  }, [user?.id, preferencesService])

  // Synchroniser les préférences (utile pour la synchronisation multi-appareils)
  const syncPreferences = useCallback(async () => {
    if (!user?.id) return

    try {
      await loadPreferences()
    } catch (err) {
      console.error('Erreur lors de la synchronisation des préférences:', err)
      setError('Erreur lors de la synchronisation des préférences')
    }
  }, [user?.id, loadPreferences])

  // Charger les préférences au montage du composant
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadPreferences()
    } else {
      setPreferences(null)
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id, loadPreferences])

  // Fonctions utilitaires pour accéder aux préférences
  const getPreference = useCallback((key: string) => {
    if (!preferences) return null
    
    const keys = key.split('.')
    let value = preferences
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as any)[k]
      } else {
        return null
      }
    }
    
    return value
  }, [preferences])

  const getTheme = useCallback(() => getPreference('theme') || 'system', [getPreference])
  const getLanguage = useCallback(() => getPreference('language') || 'en', [getPreference])
  const getCurrency = useCallback(() => getPreference('currency') || 'USD', [getPreference])
  const getTimezone = useCallback(() => getPreference('timezone') || 'UTC', [getPreference])
  const getDateFormat = useCallback(() => getPreference('date_format') || 'DD/MM/YYYY', [getPreference])
  const getNumberFormat = useCallback(() => getPreference('number_format') || 'US', [getPreference])

  return {
    // État
    preferences,
    isLoading,
    error,
    
    // Actions
    loadPreferences,
    savePreferences,
    updatePreference,
    resetPreferences,
    syncPreferences,
    
    // Fonctions utilitaires
    getPreference,
    getTheme,
    getLanguage,
    getCurrency,
    getTimezone,
    getDateFormat,
    getNumberFormat,
    
    // Service
    preferencesService
  }
}
