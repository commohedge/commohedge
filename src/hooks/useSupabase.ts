import { useState, useEffect } from 'react'
import { supabase, SupabaseService, ForexStrategy, SavedScenario, RiskMatrix } from '../lib/supabase'

export const useSupabase = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vérifier la connexion
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('forex_strategies').select('count').limit(1)
        if (error) throw error
        setIsConnected(true)
      } catch (err) {
        console.warn('Supabase connection check failed:', err)
        setIsConnected(false)
      }
    }
    
    checkConnection()
  }, [])

  // Gestion des erreurs
  const handleError = (err: any) => {
    console.error('Supabase error:', err)
    setError(err.message || 'Une erreur est survenue')
    setLoading(false)
  }

  // Stratégies Forex
  const saveStrategy = async (strategy: Omit<ForexStrategy, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.saveStrategy(strategy)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getStrategies = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getStrategies()
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getStrategy = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getStrategy(id)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const updateStrategy = async (id: string, updates: Partial<ForexStrategy>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.updateStrategy(id, updates)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const deleteStrategy = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await SupabaseService.deleteStrategy(id)
      setLoading(false)
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  // Scénarios sauvegardés
  const saveScenario = async (scenario: Omit<SavedScenario, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.saveScenario(scenario)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getScenarios = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getScenarios()
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getScenario = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getScenario(id)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const updateScenario = async (id: string, updates: Partial<SavedScenario>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.updateScenario(id, updates)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const deleteScenario = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await SupabaseService.deleteScenario(id)
      setLoading(false)
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  // Matrices de risque
  const saveRiskMatrix = async (riskMatrix: Omit<RiskMatrix, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.saveRiskMatrix(riskMatrix)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getRiskMatrices = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getRiskMatrices()
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getRiskMatrix = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getRiskMatrix(id)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const updateRiskMatrix = async (id: string, updates: Partial<RiskMatrix>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.updateRiskMatrix(id, updates)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const deleteRiskMatrix = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await SupabaseService.deleteRiskMatrix(id)
      setLoading(false)
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  // Instruments de couverture
  const saveHedgingInstrument = async (instrument: any) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.saveHedgingInstrument(instrument)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const getHedgingInstruments = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.getHedgingInstruments()
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const updateHedgingInstrument = async (id: string, updates: any) => {
    setLoading(true)
    setError(null)
    try {
      const result = await SupabaseService.updateHedgingInstrument(id, updates)
      setLoading(false)
      return result
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const deleteHedgingInstrument = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await SupabaseService.deleteHedgingInstrument(id)
      setLoading(false)
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  return {
    // État
    isConnected,
    loading,
    error,
    
    // Stratégies
    saveStrategy,
    getStrategies,
    getStrategy,
    updateStrategy,
    deleteStrategy,
    
    // Scénarios
    saveScenario,
    getScenarios,
    getScenario,
    updateScenario,
    deleteScenario,
    
    // Matrices de risque
    saveRiskMatrix,
    getRiskMatrices,
    getRiskMatrix,
    updateRiskMatrix,
    deleteRiskMatrix,
    
    // Instruments de couverture
    saveHedgingInstrument,
    getHedgingInstruments,
    updateHedgingInstrument,
    deleteHedgingInstrument,
    
    // Utilitaires
    clearError: () => setError(null)
  }
}
