import { supabase, SupabaseService } from '../lib/supabase'
import { testSupabaseConnection } from '../utils/supabaseTest'

interface SyncOptions {
  autoSync: boolean
  syncInterval: number // en millisecondes
  maxRetries: number
}

class AutoSyncService {
  private static instance: AutoSyncService
  private syncOptions: SyncOptions = {
    autoSync: true,
    syncInterval: 30000, // 30 secondes
    maxRetries: 3
  }
  private syncTimer: NodeJS.Timeout | null = null
  private isConnected: boolean = false
  private lastSyncTime: Date | null = null
  private pendingChanges: boolean = false
  private retryCount: number = 0

  private constructor() {
    this.initializeConnection()
    this.startAutoSync()
  }

  public static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService()
    }
    return AutoSyncService.instance
  }

  private async initializeConnection() {
    try {
      const result = await testSupabaseConnection()
      this.isConnected = result.success
      console.log(`🔄 AutoSync: ${this.isConnected ? 'Connecté' : 'Déconnecté'} à Supabase`)
    } catch (error) {
      console.error('❌ Erreur d\'initialisation AutoSync:', error)
      this.isConnected = false
    }
  }

  private startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }

    this.syncTimer = setInterval(async () => {
      if (this.autoSync && this.pendingChanges && this.isConnected) {
        await this.performSync()
      }
    }, this.syncOptions.syncInterval)
  }

  public get autoSync(): boolean {
    return this.syncOptions.autoSync
  }

  public set autoSync(enabled: boolean) {
    this.syncOptions.autoSync = enabled
    if (enabled) {
      this.startAutoSync()
    } else if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  public get connectionStatus(): boolean {
    return this.isConnected
  }

  public get lastSync(): Date | null {
    return this.lastSyncTime
  }

  public get hasPendingChanges(): boolean {
    return this.pendingChanges
  }

  // Marquer qu'il y a des changements à synchroniser
  public markPendingChanges() {
    this.pendingChanges = true
    console.log('📝 AutoSync: Changements détectés, synchronisation programmée')
  }

  // Synchronisation manuelle
  public async performSync(): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('⚠️ AutoSync: Pas de connexion Supabase')
      return false
    }

    try {
      console.log('🔄 AutoSync: Début de la synchronisation...')
      
      // Vérifier l'utilisateur Supabase actuel
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.warn('⚠️ AutoSync: Aucun utilisateur Supabase connecté')
        return false
      }
      
      const currentUser = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'Risk Manager'
      }
      
      // Récupérer les données du localStorage
      const calculatorState = localStorage.getItem('calculatorState')
      const savedScenarios = localStorage.getItem('savedScenarios')
      const savedRiskMatrices = localStorage.getItem('savedRiskMatrices')
      const hedgingInstruments = localStorage.getItem('hedgingInstruments')

      let syncCount = 0

      // Synchroniser la stratégie principale
      if (calculatorState) {
        const state = JSON.parse(calculatorState)
        const strategyData = {
          name: `AutoSync Strategy ${new Date().toLocaleString()}`,
          description: 'Stratégie synchronisée automatiquement',
          user_id: currentUser.id, // Utiliser l'ID utilisateur Supabase
          start_date: state.params?.startDate || new Date().toISOString().split('T')[0],
          strategy_start_date: state.params?.strategyStartDate || new Date().toISOString().split('T')[0],
          months_to_hedge: state.params?.monthsToHedge || 12,
          domestic_rate: state.params?.domesticRate || 1.0,
          foreign_rate: state.params?.foreignRate || 0.5,
          base_volume: state.params?.baseVolume || 10000000,
          quote_volume: state.params?.quoteVolume || 10000000,
          spot_price: state.params?.spotPrice || 1.0850,
          currency_pair: state.params?.currencyPair || {
            symbol: 'EUR/USD',
            name: 'Euro / US Dollar',
            base: 'EUR',
            quote: 'USD',
            category: 'majors',
            default_spot_rate: 1.0850
          },
          use_custom_periods: state.params?.useCustomPeriods || false,
          custom_periods: state.params?.customPeriods || [],
          strategy_components: state.strategy || [],
          option_pricing_model: 'garman-kohlhagen',
          barrier_pricing_model: 'closed-form',
          use_implied_vol: state.useImpliedVol || false,
          implied_volatilities: state.impliedVolatilities || {},
          use_custom_option_prices: state.useCustomOptionPrices || false,
          custom_option_prices: state.customOptionPrices || {},
          barrier_option_simulations: state.barrierOptionSimulations || 1000,
          results: state.results,
          payoff_data: state.payoffData || [],
          stress_test_scenarios: state.stressTestScenarios || {},
          manual_forwards: state.manualForwards || {},
          real_prices: state.realPrices || {},
          real_price_params: state.realPriceParams || {
            use_simulation: false,
            volatility: 15.0,
            drift: 0.0,
            num_simulations: 1000
          }
        }

        await SupabaseService.saveStrategy(strategyData)
        syncCount++
      }

      // Synchroniser les scénarios
      if (savedScenarios) {
        const scenarios = JSON.parse(savedScenarios)
        for (const scenario of scenarios) {
          await SupabaseService.saveScenario({
            name: scenario.name,
            description: scenario.description || '',
            user_id: currentUser.id, // Utiliser l'ID utilisateur Supabase
            params: scenario.params,
            strategy: scenario.strategy,
            results: scenario.results,
            payoff_data: scenario.payoffData || [],
            stress_test: scenario.stressTest,
            manual_forwards: scenario.manualForwards || {},
            real_prices: scenario.realPrices || {},
            use_implied_vol: scenario.useImpliedVol || false,
            implied_volatilities: scenario.impliedVolatilities || {},
            custom_option_prices: scenario.customOptionPrices || {}
          })
          syncCount++
        }
      }

      // Synchroniser les matrices de risque
      if (savedRiskMatrices) {
        const matrices = JSON.parse(savedRiskMatrices)
        for (const matrix of matrices) {
          await SupabaseService.saveRiskMatrix({
            name: matrix.name,
            description: matrix.description || '',
            user_id: currentUser.id, // Utiliser l'ID utilisateur Supabase
            components: matrix.components || [],
            coverage_ratio: matrix.coverageRatio || 0,
            results: matrix.results || []
          })
          syncCount++
        }
      }

      // Synchroniser les instruments de couverture
      if (hedgingInstruments) {
        const instruments = JSON.parse(hedgingInstruments)
        for (const instrument of instruments) {
          await SupabaseService.saveHedgingInstrument({
            ...instrument,
            user_id: currentUser.id, // Utiliser l'ID utilisateur Supabase
            created_at: new Date().toISOString()
          })
          syncCount++
        }
      }

      this.lastSyncTime = new Date()
      this.pendingChanges = false
      this.retryCount = 0

      console.log(`✅ AutoSync: Synchronisation réussie (${syncCount} éléments)`)
      return true

    } catch (error) {
      console.error('❌ AutoSync: Erreur de synchronisation:', error)
      this.retryCount++
      
      if (this.retryCount >= this.syncOptions.maxRetries) {
        console.error('❌ AutoSync: Nombre maximum de tentatives atteint')
        this.pendingChanges = false
        this.retryCount = 0
      }
      
      return false
    }
  }

  // Vérifier la connexion périodiquement
  public async checkConnection(): Promise<boolean> {
    try {
      const result = await testSupabaseConnection()
      this.isConnected = result.success
      return this.isConnected
    } catch (error) {
      this.isConnected = false
      return false
    }
  }

  // Arrêter le service
  public stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  // Redémarrer le service
  public restart() {
    this.stop()
    this.initializeConnection()
    this.startAutoSync()
  }
}

export default AutoSyncService
