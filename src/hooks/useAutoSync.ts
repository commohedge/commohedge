import { useState, useEffect, useCallback } from 'react'
import AutoSyncService from '../services/AutoSyncService'
import { useToast } from './use-toast'

export const useAutoSync = () => {
  const { toast } = useToast()
  const [autoSyncService] = useState(() => AutoSyncService.getInstance())
  const [isConnected, setIsConnected] = useState(autoSyncService.connectionStatus)
  const [lastSync, setLastSync] = useState(autoSyncService.lastSync)
  const [hasPendingChanges, setHasPendingChanges] = useState(autoSyncService.hasPendingChanges)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(autoSyncService.autoSync)

  // Mettre à jour l'état local quand le service change
  useEffect(() => {
    const updateState = () => {
      setIsConnected(autoSyncService.connectionStatus)
      setLastSync(autoSyncService.lastSync)
      setHasPendingChanges(autoSyncService.hasPendingChanges)
      setAutoSyncEnabled(autoSyncService.autoSync)
    }

    // Vérifier la connexion périodiquement
    const connectionCheck = setInterval(async () => {
      await autoSyncService.checkConnection()
      updateState()
    }, 60000) // Toutes les minutes

    updateState()

    return () => {
      clearInterval(connectionCheck)
    }
  }, [autoSyncService])

  // Fonction pour marquer des changements
  const markChanges = useCallback(() => {
    autoSyncService.markPendingChanges()
    setHasPendingChanges(true)
  }, [autoSyncService])

  // Fonction pour synchroniser manuellement
  const syncNow = useCallback(async () => {
    try {
      const success = await autoSyncService.performSync()
      if (success) {
        toast({
          title: "Synchronisation réussie",
          description: "Vos données ont été sauvegardées sur Supabase",
        })
      } else {
        toast({
          title: "Erreur de synchronisation",
          description: "Impossible de synchroniser avec Supabase",
          variant: "destructive"
        })
      }
      setLastSync(autoSyncService.lastSync)
      setHasPendingChanges(false)
    } catch (error) {
      console.error('Erreur de synchronisation:', error)
      toast({
        title: "Erreur de synchronisation",
        description: "Une erreur est survenue lors de la synchronisation",
        variant: "destructive"
      })
    }
  }, [autoSyncService, toast])

  // Fonction pour activer/désactiver la synchronisation automatique
  const toggleAutoSync = useCallback((enabled: boolean) => {
    autoSyncService.autoSync = enabled
    setAutoSyncEnabled(enabled)
    
    toast({
      title: enabled ? "Synchronisation automatique activée" : "Synchronisation automatique désactivée",
      description: enabled 
        ? "Vos données seront synchronisées automatiquement" 
        : "La synchronisation automatique est désactivée",
    })
  }, [autoSyncService, toast])

  // Fonction pour redémarrer le service
  const restartService = useCallback(() => {
    autoSyncService.restart()
    setIsConnected(autoSyncService.connectionStatus)
    toast({
      title: "Service redémarré",
      description: "Le service de synchronisation a été redémarré",
    })
  }, [autoSyncService, toast])

  return {
    // État
    isConnected,
    lastSync,
    hasPendingChanges,
    autoSyncEnabled,
    
    // Actions
    markChanges,
    syncNow,
    toggleAutoSync,
    restartService,
    
    // Service
    service: autoSyncService
  }
}
