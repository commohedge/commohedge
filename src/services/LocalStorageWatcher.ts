import AutoSyncService from './AutoSyncService'

class LocalStorageWatcher {
  private static instance: LocalStorageWatcher
  private originalSetItem: typeof Storage.prototype.setItem
  private originalRemoveItem: typeof Storage.prototype.removeItem
  private watchedKeys: Set<string>
  private autoSyncService: AutoSyncService

  private constructor() {
    this.autoSyncService = AutoSyncService.getInstance()
    this.watchedKeys = new Set([
      'calculatorState',
      'savedScenarios', 
      'savedRiskMatrices',
      'hedgingInstruments'
    ])
    
    this.originalSetItem = localStorage.setItem.bind(localStorage)
    this.originalRemoveItem = localStorage.removeItem.bind(localStorage)
    
    this.setupWatchers()
  }

  public static getInstance(): LocalStorageWatcher {
    if (!LocalStorageWatcher.instance) {
      LocalStorageWatcher.instance = new LocalStorageWatcher()
    }
    return LocalStorageWatcher.instance
  }

  private setupWatchers() {
    // Intercepter localStorage.setItem
    localStorage.setItem = (key: string, value: string) => {
      this.originalSetItem(key, value)
      
      if (this.watchedKeys.has(key)) {
        console.log(`📝 LocalStorageWatcher: Changement détecté dans ${key}`)
        this.autoSyncService.markPendingChanges()
      }
    }

    // Intercepter localStorage.removeItem
    localStorage.removeItem = (key: string) => {
      this.originalRemoveItem(key)
      
      if (this.watchedKeys.has(key)) {
        console.log(`🗑️ LocalStorageWatcher: Suppression détectée dans ${key}`)
        this.autoSyncService.markPendingChanges()
      }
    }

    // Écouter les événements de stockage (pour les onglets multiples)
    window.addEventListener('storage', (event) => {
      if (event.key && this.watchedKeys.has(event.key)) {
        console.log(`🔄 LocalStorageWatcher: Changement externe détecté dans ${event.key}`)
        this.autoSyncService.markPendingChanges()
      }
    })

    console.log('👀 LocalStorageWatcher: Surveillance activée pour les clés:', Array.from(this.watchedKeys))
  }

  // Ajouter une clé à surveiller
  public watchKey(key: string) {
    this.watchedKeys.add(key)
    console.log(`👀 LocalStorageWatcher: Ajout de la surveillance pour ${key}`)
  }

  // Retirer une clé de la surveillance
  public unwatchKey(key: string) {
    this.watchedKeys.delete(key)
    console.log(`👀 LocalStorageWatcher: Suppression de la surveillance pour ${key}`)
  }

  // Obtenir les clés surveillées
  public getWatchedKeys(): string[] {
    return Array.from(this.watchedKeys)
  }

  // Forcer la synchronisation
  public forceSync() {
    console.log('🔄 LocalStorageWatcher: Synchronisation forcée')
    this.autoSyncService.markPendingChanges()
  }

  // Arrêter la surveillance
  public stop() {
    localStorage.setItem = this.originalSetItem
    localStorage.removeItem = this.originalRemoveItem
    console.log('🛑 LocalStorageWatcher: Surveillance arrêtée')
  }
}

export default LocalStorageWatcher
