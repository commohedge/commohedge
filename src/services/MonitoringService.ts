import { config } from '../config/environment'

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  context?: string
}

export interface AppHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  metrics: {
    responseTime: number
    errorRate: number
    memoryUsage: number
    connectionStatus: boolean
  }
  issues: string[]
}

class MonitoringService {
  private static instance: MonitoringService
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000
  private healthCheckInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.startHealthMonitoring()
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService()
    }
    return MonitoringService.instance
  }

  // Démarrer le monitoring de santé
  private startHealthMonitoring() {
    if (config.app.environment === 'production') {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck()
      }, 60000) // Vérification toutes les minutes
    }
  }

  // Effectuer une vérification de santé
  private async performHealthCheck() {
    try {
      const health = await this.getAppHealth()
      
      if (health.status === 'unhealthy') {
        console.warn('Application health check failed:', health.issues)
        this.logMetric('health_check_failed', 1, 'Health check failed')
      } else if (health.status === 'degraded') {
        console.warn('Application health degraded:', health.issues)
        this.logMetric('health_check_degraded', 1, 'Health check degraded')
      } else {
        this.logMetric('health_check_success', 1, 'Health check passed')
      }
    } catch (error) {
      console.error('Health check error:', error)
      this.logMetric('health_check_error', 1, 'Health check error')
    }
  }

  // Obtenir la santé de l'application
  public async getAppHealth(): Promise<AppHealth> {
    const issues: string[] = []
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Vérifier le temps de réponse
    const responseTime = await this.measureResponseTime()
    if (responseTime > 5000) {
      issues.push('Response time too high')
      status = 'degraded'
    }

    // Vérifier le taux d'erreur
    const errorRate = this.calculateErrorRate()
    if (errorRate > 0.1) { // 10%
      issues.push('High error rate')
      status = 'unhealthy'
    } else if (errorRate > 0.05) { // 5%
      issues.push('Elevated error rate')
      status = status === 'healthy' ? 'degraded' : status
    }

    // Vérifier l'utilisation mémoire
    const memoryUsage = this.getMemoryUsage()
    if (memoryUsage > 0.9) { // 90%
      issues.push('High memory usage')
      status = 'unhealthy'
    } else if (memoryUsage > 0.8) { // 80%
      issues.push('Elevated memory usage')
      status = status === 'healthy' ? 'degraded' : status
    }

    // Vérifier la connexion Supabase
    const connectionStatus = await this.checkSupabaseConnection()
    if (!connectionStatus) {
      issues.push('Supabase connection failed')
      status = 'unhealthy'
    }

    return {
      status,
      timestamp: new Date(),
      metrics: {
        responseTime,
        errorRate,
        memoryUsage,
        connectionStatus
      },
      issues
    }
  }

  // Mesurer le temps de réponse
  private async measureResponseTime(): Promise<number> {
    const start = performance.now()
    
    try {
      // Simuler une requête simple
      await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      }).catch(() => {
        // Ignorer les erreurs pour cette mesure
      })
    } catch (error) {
      // Ignorer les erreurs
    }
    
    return performance.now() - start
  }

  // Calculer le taux d'erreur
  private calculateErrorRate(): number {
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > new Date(Date.now() - 5 * 60 * 1000) // 5 dernières minutes
    )
    
    if (recentMetrics.length === 0) return 0
    
    const errorMetrics = recentMetrics.filter(m => m.name.includes('error'))
    return errorMetrics.length / recentMetrics.length
  }

  // Obtenir l'utilisation mémoire
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    return 0
  }

  // Vérifier la connexion Supabase
  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { SupabaseService } = await import('../lib/supabase')
      return await SupabaseService.checkConnection()
    } catch (error) {
      return false
    }
  }

  // Logger une métrique
  public logMetric(name: string, value: number, context?: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      context
    }

    this.metrics.unshift(metric)
    
    // Limiter la taille des métriques
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics)
    }

    // Logger en développement
    if (config.app.environment === 'development') {
      console.log('Metric logged:', metric)
    }
  }

  // Obtenir les métriques récentes
  public getRecentMetrics(limit: number = 100): PerformanceMetric[] {
    return this.metrics.slice(0, limit)
  }

  // Obtenir les métriques par nom
  public getMetricsByName(name: string, limit: number = 50): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.name === name)
      .slice(0, limit)
  }

  // Obtenir les statistiques de performance
  public getPerformanceStats() {
    const now = new Date()
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const metricsLastHour = this.metrics.filter(m => m.timestamp > lastHour)
    const metricsLast24h = this.metrics.filter(m => m.timestamp > last24h)

    return {
      totalMetrics: this.metrics.length,
      metricsLastHour: metricsLastHour.length,
      metricsLast24h: metricsLast24h.length,
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      topMetrics: this.getTopMetrics()
    }
  }

  // Calculer le temps de réponse moyen
  private calculateAverageResponseTime(): number {
    const responseMetrics = this.metrics.filter(m => m.name.includes('response_time'))
    if (responseMetrics.length === 0) return 0
    
    const sum = responseMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / responseMetrics.length
  }

  // Obtenir les métriques les plus fréquentes
  private getTopMetrics(): Array<{name: string, count: number}> {
    const metricCount: Record<string, number> = {}
    
    this.metrics.forEach(metric => {
      metricCount[metric.name] = (metricCount[metric.name] || 0) + 1
    })

    return Object.entries(metricCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  }

  // Nettoyer les métriques anciennes
  public cleanupOldMetrics(maxAge: number = 24 * 60 * 60 * 1000) { // 24 heures par défaut
    const cutoff = new Date(Date.now() - maxAge)
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
  }

  // Arrêter le monitoring
  public stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

export default MonitoringService
