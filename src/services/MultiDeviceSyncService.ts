import { supabase } from '../lib/supabase'
import UserPreferencesService from './UserPreferencesService'

export interface DeviceInfo {
  id: string
  user_id: string
  device_name: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  last_seen: string
  is_active: boolean
  ip_address?: string
  location?: string
}

export interface SyncSession {
  id: string
  user_id: string
  device_id: string
  session_token: string
  created_at: string
  expires_at: string
  is_active: boolean
}

class MultiDeviceSyncService {
  private static instance: MultiDeviceSyncService
  private currentDeviceId: string | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private preferencesService = UserPreferencesService.getInstance()

  private constructor() {
    this.initializeDevice()
  }

  public static getInstance(): MultiDeviceSyncService {
    if (!MultiDeviceSyncService.instance) {
      MultiDeviceSyncService.instance = new MultiDeviceSyncService()
    }
    return MultiDeviceSyncService.instance
  }

  // Initialiser l'appareil actuel
  private async initializeDevice() {
    try {
      const deviceInfo = this.getCurrentDeviceInfo()
      this.currentDeviceId = await this.registerDevice(deviceInfo)
      
      // Démarrer la synchronisation périodique
      this.startPeriodicSync()
      
      // Écouter les changements de visibilité de la page
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncUserData()
        }
      })

      // Écouter les changements de focus de la fenêtre
      window.addEventListener('focus', () => {
        this.syncUserData()
      })

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'appareil:', error)
    }
  }

  // Obtenir les informations de l'appareil actuel
  private getCurrentDeviceInfo(): Omit<DeviceInfo, 'id' | 'user_id' | 'last_seen' | 'is_active'> {
    const userAgent = navigator.userAgent
    const platform = navigator.platform

    // Détecter le type d'appareil
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = 'mobile'
    } else if (/iPad|Android(?=.*Tablet)|Windows NT.*Touch/i.test(userAgent)) {
      deviceType = 'tablet'
    }

    // Détecter le navigateur
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    // Détecter l'OS
    let os = 'Unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    return {
      device_name: `${browser} on ${os}`,
      device_type: deviceType,
      browser,
      os
    }
  }

  // Enregistrer l'appareil dans la base de données
  private async registerDevice(deviceInfo: Omit<DeviceInfo, 'id' | 'user_id' | 'last_seen' | 'is_active'>): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      // Vérifier si l'appareil existe déjà
      const { data: existingDevice } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_name', deviceInfo.device_name)
        .eq('browser', deviceInfo.browser)
        .eq('os', deviceInfo.os)
        .single()

      if (existingDevice) {
        // Mettre à jour la dernière activité
        await supabase
          .from('user_devices')
          .update({ 
            last_seen: new Date().toISOString(),
            is_active: true
          })
          .eq('id', existingDevice.id)
        
        return existingDevice.id
      }

      // Créer un nouvel appareil
      const { data: newDevice, error } = await supabase
        .from('user_devices')
        .insert({
          user_id: user.id,
          ...deviceInfo,
          last_seen: new Date().toISOString(),
          is_active: true
        })
        .select('id')
        .single()

      if (error) throw error
      return newDevice.id

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'appareil:', error)
      throw error
    }
  }

  // Synchroniser les données utilisateur
  async syncUserData(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Synchroniser les préférences
      await this.preferencesService.syncWithLocalStorage(user.id)

      // Mettre à jour la dernière activité de l'appareil
      if (this.currentDeviceId) {
        await supabase
          .from('user_devices')
          .update({ 
            last_seen: new Date().toISOString(),
            is_active: true
          })
          .eq('id', this.currentDeviceId)
      }

      console.log('✅ Synchronisation des données utilisateur terminée')

    } catch (error) {
      console.error('Erreur lors de la synchronisation des données:', error)
    }
  }

  // Démarrer la synchronisation périodique
  private startPeriodicSync() {
    // Synchroniser toutes les 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncUserData()
    }, 5 * 60 * 1000)
  }

  // Arrêter la synchronisation périodique
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Obtenir la liste des appareils de l'utilisateur
  async getUserDevices(): Promise<DeviceInfo[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Erreur lors de la récupération des appareils:', error)
      return []
    }
  }

  // Déconnecter un appareil
  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('id', deviceId)

      if (error) throw error
      return true

    } catch (error) {
      console.error('Erreur lors de la déconnexion de l\'appareil:', error)
      return false
    }
  }

  // Obtenir les sessions actives
  async getActiveSessions(): Promise<SyncSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          user_devices (
            device_name,
            device_type,
            browser,
            os
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Erreur lors de la récupération des sessions:', error)
      return []
    }
  }

  // Nettoyer les sessions expirées
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())

      console.log('✅ Sessions expirées nettoyées')

    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions:', error)
    }
  }

  // Obtenir l'ID de l'appareil actuel
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId
  }
}

export default MultiDeviceSyncService
