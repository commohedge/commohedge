import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/environment'
import CacheService from '../services/CacheService'
import ErrorService from '../services/ErrorService'

// Configuration Supabase avec options de production
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': `forex-pricers@${config.app.version}`
    }
  }
}

export const supabase: SupabaseClient = createClient(
  config.supabase.url, 
  config.supabase.anonKey,
  supabaseOptions
)

// Types pour les données Forex
export interface ForexStrategy {
  id?: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
  
  // Paramètres principaux
  start_date: string
  strategy_start_date: string
  months_to_hedge: number
  domestic_rate: number
  foreign_rate: number
  base_volume: number
  quote_volume: number
  spot_price: number
  currency_pair: {
    symbol: string
    name: string
    base: string
    quote: string
    category: string
    default_spot_rate: number
  }
  use_custom_periods: boolean
  custom_periods?: Array<{
    maturity_date: string
    volume: number
  }>
  
  // Composants de stratégie
  strategy_components: Array<{
    type: string
    strike: number
    strike_type: string
    volatility: number
    quantity: number
    barrier?: number
    second_barrier?: number
    barrier_type?: string
    rebate?: number
    time_to_payoff?: number
    dynamic_strike?: {
      method: string
      balance_with_index: number
      volatility_adjustment?: number
    }
  }>
  
  // Modèles de pricing
  option_pricing_model: string
  barrier_pricing_model: string
  
  // Options avancées
  use_implied_vol: boolean
  implied_volatilities?: Record<string, number>
  use_custom_option_prices: boolean
  custom_option_prices?: Record<string, Record<string, number>>
  barrier_option_simulations: number
  
  // Résultats
  results?: any
  payoff_data?: Array<{ price: number; payoff: number }>
  
  // Scénarios de stress test
  stress_test_scenarios?: Record<string, {
    name: string
    description: string
    volatility: number
    drift: number
    price_shock: number
    forward_basis?: number
    real_basis?: number
    is_custom?: boolean
    is_editable?: boolean
    is_historical?: boolean
  }>
  
  // Prix manuels et réels
  manual_forwards?: Record<string, number>
  real_prices?: Record<string, number>
  real_price_params?: {
    use_simulation: boolean
    volatility: number
    drift: number
    num_simulations: number
  }
}

export interface SavedScenario {
  id?: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
  strategy_id?: string
  
  // Données du scénario
  params: any
  strategy: any[]
  results: any[]
  payoff_data: Array<{ price: number; payoff: number }>
  stress_test?: any
  manual_forwards?: Record<string, number>
  real_prices?: Record<string, number>
  use_implied_vol?: boolean
  implied_volatilities?: Record<string, number>
  custom_option_prices?: Record<string, Record<string, number>>
}

export interface RiskMatrix {
  id?: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
  user_id?: string
  
  components: any[]
  coverage_ratio: number
  results: any[]
}

// Service pour gérer les données Supabase
export class SupabaseService {
  private static cacheService = CacheService.getInstance()
  private static errorService = ErrorService.getInstance()

  // Gestion d'erreur centralisée
  private static handleError(error: any, operation: string) {
    return this.errorService.handleSupabaseError(error, operation)
  }

  // Vérification de la connexion
  static async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('forex_strategies')
        .select('count')
        .limit(1)
      
      return !error
    } catch (error) {
      return false
    }
  }

  // Stratégies Forex
  static async saveStrategy(strategy: Omit<ForexStrategy, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('forex_strategies')
        .insert([strategy])
        .select()
        .single()
      
      if (error) this.handleError(error, 'sauvegarde de stratégie')
      return data
    } catch (error) {
      this.handleError(error, 'sauvegarde de stratégie')
    }
  }
  
  static async getStrategies() {
    const cacheKey = 'forex_strategies_all'
    
    return this.cacheService.cacheSupabaseQuery(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('forex_strategies')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw this.handleError(error, 'récupération des stratégies')
        return data || []
      },
      5 * 60 * 1000 // Cache pendant 5 minutes
    )
  }
  
  static async getStrategy(id: string) {
    try {
      const { data, error } = await supabase
        .from('forex_strategies')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) this.handleError(error, 'récupération de stratégie')
      return data
    } catch (error) {
      this.handleError(error, 'récupération de stratégie')
    }
  }
  
  static async updateStrategy(id: string, updates: Partial<ForexStrategy>) {
    try {
      const { data, error } = await supabase
        .from('forex_strategies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) this.handleError(error, 'mise à jour de stratégie')
      return data
    } catch (error) {
      this.handleError(error, 'mise à jour de stratégie')
    }
  }
  
  static async deleteStrategy(id: string) {
    try {
      const { error } = await supabase
        .from('forex_strategies')
        .delete()
        .eq('id', id)
      
      if (error) this.handleError(error, 'suppression de stratégie')
      return true
    } catch (error) {
      this.handleError(error, 'suppression de stratégie')
    }
  }
  
  // Scénarios sauvegardés
  static async saveScenario(scenario: Omit<SavedScenario, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('saved_scenarios')
      .insert([scenario])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  static async getScenarios() {
    const { data, error } = await supabase
      .from('saved_scenarios')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  static async getScenario(id: string) {
    const { data, error } = await supabase
      .from('saved_scenarios')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }
  
  static async updateScenario(id: string, updates: Partial<SavedScenario>) {
    const { data, error } = await supabase
      .from('saved_scenarios')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  static async deleteScenario(id: string) {
    const { error } = await supabase
      .from('saved_scenarios')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
  
  // Matrices de risque
  static async saveRiskMatrix(riskMatrix: Omit<RiskMatrix, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('risk_matrices')
      .insert([riskMatrix])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  static async getRiskMatrices() {
    const { data, error } = await supabase
      .from('risk_matrices')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  static async getRiskMatrix(id: string) {
    const { data, error } = await supabase
      .from('risk_matrices')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }
  
  static async updateRiskMatrix(id: string, updates: Partial<RiskMatrix>) {
    const { data, error } = await supabase
      .from('risk_matrices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  static async deleteRiskMatrix(id: string) {
    const { error } = await supabase
      .from('risk_matrices')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
  
  // Instruments de couverture
  static async saveHedgingInstrument(instrument: any) {
    const { data, error } = await supabase
      .from('hedging_instruments')
      .insert([instrument])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  static async getHedgingInstruments() {
    const { data, error } = await supabase
      .from('hedging_instruments')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  static async updateHedgingInstrument(id: string, updates: any) {
    const { data, error } = await supabase
      .from('hedging_instruments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  static async deleteHedgingInstrument(id: string) {
    const { error } = await supabase
      .from('hedging_instruments')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
