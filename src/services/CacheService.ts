import { config } from '../config/environment'

export interface CacheItem<T> {
  data: T
  timestamp: Date
  expiresAt: Date
  key: string
}

export interface CacheOptions {
  ttl?: number // Time to live en millisecondes
  maxSize?: number
  strategy?: 'lru' | 'fifo' | 'ttl'
}

class CacheService {
  private static instance: CacheService
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes par défaut
  private maxSize = 1000
  private strategy: 'lru' | 'fifo' | 'ttl' = 'lru'

  private constructor() {
    this.startCleanupInterval()
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  // Configurer le cache
  public configure(options: CacheOptions) {
    if (options.ttl) this.defaultTTL = options.ttl
    if (options.maxSize) this.maxSize = options.maxSize
    if (options.strategy) this.strategy = options.strategy
  }

  // Obtenir une valeur du cache
  public get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Vérifier l'expiration
    if (new Date() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Mettre à jour l'ordre pour LRU
    if (this.strategy === 'lru') {
      this.cache.delete(key)
      this.cache.set(key, item)
    }

    return item.data
  }

  // Définir une valeur dans le cache
  public set<T>(key: string, data: T, ttl?: number): void {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (ttl || this.defaultTTL))

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt,
      key
    }

    // Vérifier la taille du cache
    if (this.cache.size >= this.maxSize) {
      this.evictItem()
    }

    this.cache.set(key, item)
  }

  // Supprimer un élément du cache
  public delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // Vider le cache
  public clear(): void {
    this.cache.clear()
  }

  // Vérifier si une clé existe
  public has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    // Vérifier l'expiration
    if (new Date() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  // Obtenir les statistiques du cache
  public getStats() {
    const now = new Date()
    const expired = Array.from(this.cache.values()).filter(item => item.expiresAt < now).length
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  // Calculer le taux de succès
  private calculateHitRate(): number {
    // Cette méthode nécessiterait un compteur de hits/misses
    // Pour l'instant, on retourne une estimation basée sur la taille
    return this.cache.size > 0 ? 0.8 : 0
  }

  // Estimer l'utilisation mémoire
  private estimateMemoryUsage(): number {
    let size = 0
    this.cache.forEach((item, key) => {
      size += key.length * 2 // UTF-16
      size += JSON.stringify(item.data).length * 2
      size += 100 // Overhead pour l'objet CacheItem
    })
    return size
  }

  // Évincer un élément selon la stratégie
  private evictItem(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    switch (this.strategy) {
      case 'lru':
        // Le premier élément est le moins récemment utilisé
        keyToEvict = this.cache.keys().next().value
        break
      
      case 'fifo':
        // Le premier élément ajouté
        keyToEvict = this.cache.keys().next().value
        break
      
      case 'ttl':
        // L'élément qui expire le plus tôt
        let earliestExpiry = new Date()
        this.cache.forEach((item, key) => {
          if (item.expiresAt < earliestExpiry) {
            earliestExpiry = item.expiresAt
            keyToEvict = key
          }
        })
        break
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
    }
  }

  // Nettoyer les éléments expirés
  private cleanupExpired(): void {
    const now = new Date()
    const expiredKeys: string[] = []

    this.cache.forEach((item, key) => {
      if (item.expiresAt < now) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => this.cache.delete(key))
  }

  // Démarrer l'intervalle de nettoyage
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired()
    }, 60000) // Nettoyage toutes les minutes
  }

  // Obtenir toutes les clés
  public keys(): string[] {
    return Array.from(this.cache.keys())
  }

  // Obtenir tous les éléments
  public entries(): Array<[string, any]> {
    const result: Array<[string, any]> = []
    this.cache.forEach((item, key) => {
      if (new Date() <= item.expiresAt) {
        result.push([key, item.data])
      }
    })
    return result
  }

  // Cache avec fonction de fallback
  public async getOrSet<T>(
    key: string, 
    fallback: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await fallback()
    this.set(key, data, ttl)
    return data
  }

  // Cache pour les requêtes Supabase
  public async cacheSupabaseQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return this.getOrSet(key, queryFn, ttl || this.defaultTTL)
  }

  // Invalider le cache par pattern
  public invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Précharger des données
  public async preload<T>(
    key: string,
    dataLoader: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      const data = await dataLoader()
      this.set(key, data, ttl)
    } catch (error) {
      console.warn(`Failed to preload cache for key ${key}:`, error)
    }
  }
}

export default CacheService
