import { config } from '../config/environment'

export interface ErrorInfo {
  message: string
  code?: string
  timestamp: Date
  context?: string
  userId?: string
  stack?: string
}

class ErrorService {
  private static instance: ErrorService
  private errorLog: ErrorInfo[] = []
  private maxLogSize = 100

  private constructor() {
    this.setupGlobalErrorHandling()
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  // Configuration de la gestion d'erreur globale
  private setupGlobalErrorHandling() {
    // Gestion des erreurs JavaScript non capturées
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        code: 'JS_ERROR',
        timestamp: new Date(),
        context: `File: ${event.filename}, Line: ${event.lineno}`,
        stack: event.error?.stack
      })
    })

    // Gestion des promesses rejetées
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        code: 'PROMISE_REJECTION',
        timestamp: new Date(),
        context: 'Unhandled Promise Rejection',
        stack: event.reason?.stack
      })
    })
  }

  // Logger une erreur
  public logError(errorInfo: Omit<ErrorInfo, 'timestamp'>) {
    const fullErrorInfo: ErrorInfo = {
      ...errorInfo,
      timestamp: new Date()
    }

    // Ajouter à la liste des erreurs
    this.errorLog.unshift(fullErrorInfo)
    
    // Limiter la taille du log
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // Logger dans la console en développement
    if (config.app.environment === 'development') {
      console.error('Error logged:', fullErrorInfo)
    }

    // En production, on pourrait envoyer les erreurs à un service externe
    if (config.app.environment === 'production') {
      this.sendErrorToExternalService(fullErrorInfo)
    }
  }

  // Envoyer l'erreur à un service externe (ex: Sentry, LogRocket, etc.)
  private async sendErrorToExternalService(errorInfo: ErrorInfo) {
    try {
      // Ici vous pouvez intégrer avec un service d'erreur externe
      // Exemple avec Sentry, LogRocket, ou votre propre API
      console.warn('Error would be sent to external service:', errorInfo)
    } catch (error) {
      console.error('Failed to send error to external service:', error)
    }
  }

  // Obtenir les erreurs récentes
  public getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorLog.slice(0, limit)
  }

  // Obtenir toutes les erreurs
  public getAllErrors(): ErrorInfo[] {
    return [...this.errorLog]
  }

  // Nettoyer les erreurs
  public clearErrors() {
    this.errorLog = []
  }

  // Obtenir les statistiques d'erreur
  public getErrorStats() {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const errors24h = this.errorLog.filter(e => e.timestamp > last24h).length
    const errors7d = this.errorLog.filter(e => e.timestamp > last7d).length

    return {
      total: this.errorLog.length,
      last24h: errors24h,
      last7d: errors7d,
      mostCommonCode: this.getMostCommonErrorCode()
    }
  }

  // Obtenir le code d'erreur le plus commun
  private getMostCommonErrorCode(): string | null {
    const codeCount: Record<string, number> = {}
    
    this.errorLog.forEach(error => {
      if (error.code) {
        codeCount[error.code] = (codeCount[error.code] || 0) + 1
      }
    })

    const mostCommon = Object.entries(codeCount)
      .sort(([,a], [,b]) => b - a)[0]

    return mostCommon ? mostCommon[0] : null
  }

  // Créer une erreur personnalisée
  public createError(message: string, code?: string, context?: string): Error {
    const error = new Error(message)
    this.logError({
      message,
      code,
      context,
      stack: error.stack
    })
    return error
  }

  // Gestion des erreurs Supabase
  public handleSupabaseError(error: any, operation: string): Error {
    let message = `Erreur Supabase lors de ${operation}`
    let code = 'SUPABASE_ERROR'

    if (error.code === 'PGRST116') {
      message = 'Aucune donnée trouvée'
      code = 'NO_DATA_FOUND'
    } else if (error.code === '23505') {
      message = 'Cette donnée existe déjà'
      code = 'DUPLICATE_DATA'
    } else if (error.code === '23503') {
      message = 'Référence invalide'
      code = 'INVALID_REFERENCE'
    } else if (error.message?.includes('JWT')) {
      message = 'Session expirée, veuillez vous reconnecter'
      code = 'SESSION_EXPIRED'
    } else if (error.message?.includes('network')) {
      message = 'Erreur de connexion réseau'
      code = 'NETWORK_ERROR'
    } else if (error.message) {
      message = error.message
    }

    this.logError({
      message,
      code,
      context: `Supabase operation: ${operation}`,
      stack: error.stack
    })

    return new Error(message)
  }

  // Gestion des erreurs d'authentification
  public handleAuthError(error: any, operation: string): Error {
    let message = `Erreur d'authentification lors de ${operation}`
    let code = 'AUTH_ERROR'

    if (error.message?.includes('Invalid login credentials')) {
      message = 'Identifiants de connexion invalides'
      code = 'INVALID_CREDENTIALS'
    } else if (error.message?.includes('Email not confirmed')) {
      message = 'Email non confirmé'
      code = 'EMAIL_NOT_CONFIRMED'
    } else if (error.message?.includes('User already registered')) {
      message = 'Utilisateur déjà enregistré'
      code = 'USER_EXISTS'
    } else if (error.message?.includes('Password should be at least')) {
      message = 'Le mot de passe doit contenir au moins 6 caractères'
      code = 'WEAK_PASSWORD'
    } else if (error.message) {
      message = error.message
    }

    this.logError({
      message,
      code,
      context: `Auth operation: ${operation}`,
      stack: error.stack
    })

    return new Error(message)
  }
}

export default ErrorService
