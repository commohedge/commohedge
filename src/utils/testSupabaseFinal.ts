// Test final de l'intégration Supabase
import { supabase, SupabaseService } from '../lib/supabase'
import { testSupabaseConnection } from './supabaseTest'

// Fonction de test complète
export const testSupabaseFinalIntegration = async () => {
  console.log('🧪 Début du test final d\'intégration Supabase...')
  
  try {
    // 1. Test de connexion
    console.log('1️⃣ Test de connexion...')
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      throw new Error('Échec du test de connexion')
    }
    console.log('✅ Connexion Supabase OK')

    // 2. Test de création d'une stratégie
    console.log('2️⃣ Test de création d\'une stratégie...')
    const testStrategy = {
      name: 'Test Strategy Final',
      description: 'Stratégie de test pour l\'intégration finale',
      start_date: new Date().toISOString().split('T')[0],
      strategy_start_date: new Date().toISOString().split('T')[0],
      months_to_hedge: 12,
      domestic_rate: 1.0,
      foreign_rate: 0.5,
      base_volume: 10000000,
      quote_volume: 10000000,
      spot_price: 1.0850,
      currency_pair: {
        symbol: 'EUR/USD',
        name: 'Euro / US Dollar',
        base: 'EUR',
        quote: 'USD',
        category: 'majors',
        default_spot_rate: 1.0850
      },
      use_custom_periods: false,
      custom_periods: [],
      strategy_components: [
        {
          type: 'call',
          strike: 1.1,
          strike_type: 'percent',
          volatility: 15.0,
          quantity: 100
        }
      ],
      option_pricing_model: 'garman-kohlhagen',
      barrier_pricing_model: 'closed-form',
      use_implied_vol: false,
      implied_volatilities: {},
      use_custom_option_prices: false,
      custom_option_prices: {},
      barrier_option_simulations: 1000,
      results: { test: 'data' },
      payoff_data: [{ price: 1.0, payoff: 1000 }],
      stress_test_scenarios: {},
      manual_forwards: {},
      real_prices: {},
      real_price_params: {
        use_simulation: false,
        volatility: 15.0,
        drift: 0.0,
        num_simulations: 1000
      }
    }

    const savedStrategy = await SupabaseService.saveStrategy(testStrategy)
    console.log('✅ Stratégie créée:', savedStrategy.id)

    // 3. Test de récupération des stratégies
    console.log('3️⃣ Test de récupération des stratégies...')
    const strategies = await SupabaseService.getStrategies()
    console.log(`✅ ${strategies.length} stratégies récupérées`)

    // 4. Test de création d'un scénario
    console.log('4️⃣ Test de création d\'un scénario...')
    const testScenario = {
      name: 'Test Scenario Final',
      description: 'Scénario de test pour l\'intégration finale',
      strategy_id: savedStrategy.id,
      params: { test: 'params' },
      strategy: [{ type: 'call', strike: 1.1 }],
      results: [{ test: 'results' }],
      payoff_data: [{ price: 1.0, payoff: 1000 }],
      stress_test: { test: 'stress' },
      manual_forwards: {},
      real_prices: {},
      use_implied_vol: false,
      implied_volatilities: {},
      custom_option_prices: {}
    }

    const savedScenario = await SupabaseService.saveScenario(testScenario)
    console.log('✅ Scénario créé:', savedScenario.id)

    // 5. Test de création d'une matrice de risque
    console.log('5️⃣ Test de création d\'une matrice de risque...')
    const testRiskMatrix = {
      name: 'Test Risk Matrix Final',
      description: 'Matrice de risque de test pour l\'intégration finale',
      components: [{ type: 'option', strike: 1.1 }],
      coverage_ratio: 0.8,
      results: [{ test: 'risk results' }]
    }

    const savedRiskMatrix = await SupabaseService.saveRiskMatrix(testRiskMatrix)
    console.log('✅ Matrice de risque créée:', savedRiskMatrix.id)

    // 6. Test de création d'un instrument de couverture
    console.log('6️⃣ Test de création d\'un instrument de couverture...')
    const testInstrument = {
      instrument_type: 'call_option',
      currency_pair: 'EUR/USD',
      notional_base: 1000000,
      notional_quote: 1085000,
      strike_price: 1.1,
      strike_type: 'percent',
      volatility: 15.0,
      quantity: 100,
      start_date: new Date().toISOString().split('T')[0],
      maturity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      option_price: 0.05,
      premium: 50000,
      mtm_value: 50000,
      hedge_accounting: false,
      notes: 'Instrument de test pour l\'intégration finale',
      full_data: { test: 'full data' }
    }

    const savedInstrument = await SupabaseService.saveHedgingInstrument(testInstrument)
    console.log('✅ Instrument de couverture créé:', savedInstrument.id)

    // 7. Test de récupération de toutes les données
    console.log('7️⃣ Test de récupération de toutes les données...')
    const [allStrategies, allScenarios, allRiskMatrices, allInstruments] = await Promise.all([
      SupabaseService.getStrategies(),
      SupabaseService.getScenarios(),
      SupabaseService.getRiskMatrices(),
      SupabaseService.getHedgingInstruments()
    ])

    console.log(`✅ Données récupérées:`)
    console.log(`   - Stratégies: ${allStrategies.length}`)
    console.log(`   - Scénarios: ${allScenarios.length}`)
    console.log(`   - Matrices de risque: ${allRiskMatrices.length}`)
    console.log(`   - Instruments: ${allInstruments.length}`)

    // 8. Test de mise à jour
    console.log('8️⃣ Test de mise à jour...')
    const updatedStrategy = await SupabaseService.updateStrategy(savedStrategy.id, {
      name: 'Test Strategy Final - Updated',
      description: 'Stratégie mise à jour'
    })
    console.log('✅ Stratégie mise à jour:', updatedStrategy.name)

    // 9. Test de suppression
    console.log('9️⃣ Test de suppression...')
    await SupabaseService.deleteStrategy(savedStrategy.id)
    await SupabaseService.deleteScenario(savedScenario.id)
    await SupabaseService.deleteRiskMatrix(savedRiskMatrix.id)
    await SupabaseService.deleteHedgingInstrument(savedInstrument.id)
    console.log('✅ Éléments de test supprimés')

    console.log('🎉 Test final d\'intégration Supabase RÉUSSI !')
    console.log('✅ Toutes les fonctionnalités sont opérationnelles')
    
    return {
      success: true,
      message: 'Intégration Supabase complètement fonctionnelle',
      tests: {
        connection: true,
        createStrategy: true,
        getStrategies: true,
        createScenario: true,
        createRiskMatrix: true,
        createInstrument: true,
        getAllData: true,
        update: true,
        delete: true
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test final:', error)
    return {
      success: false,
      error: error.message,
      message: 'Échec du test d\'intégration'
    }
  }
}

// Test de performance
export const testSupabasePerformance = async () => {
  console.log('⚡ Test de performance Supabase...')
  
  const startTime = Date.now()
  
  try {
    // Test de récupération rapide
    const strategies = await SupabaseService.getStrategies()
    const scenarios = await SupabaseService.getScenarios()
    const riskMatrices = await SupabaseService.getRiskMatrices()
    const instruments = await SupabaseService.getHedgingInstruments()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`⚡ Performance test terminé en ${duration}ms`)
    console.log(`   - Stratégies: ${strategies.length}`)
    console.log(`   - Scénarios: ${scenarios.length}`)
    console.log(`   - Matrices: ${riskMatrices.length}`)
    console.log(`   - Instruments: ${instruments.length}`)
    
    return {
      success: true,
      duration,
      dataCount: {
        strategies: strategies.length,
        scenarios: scenarios.length,
        riskMatrices: riskMatrices.length,
        instruments: instruments.length
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test de performance:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Test de synchronisation automatique
export const testAutoSync = async () => {
  console.log('🔄 Test de synchronisation automatique...')
  
  try {
    // Simuler des données dans localStorage
    const testData = {
      params: {
        startDate: new Date().toISOString().split('T')[0],
        strategyStartDate: new Date().toISOString().split('T')[0],
        monthsToHedge: 12,
        domesticRate: 1.0,
        foreignRate: 0.5,
        baseVolume: 10000000,
        quoteVolume: 10000000,
        spotPrice: 1.0850,
        currencyPair: {
          symbol: 'EUR/USD',
          name: 'Euro / US Dollar',
          base: 'EUR',
          quote: 'USD',
          category: 'majors',
          default_spot_rate: 1.0850
        }
      },
      strategy: [
        {
          type: 'call',
          strike: 1.1,
          strike_type: 'percent',
          volatility: 15.0,
          quantity: 100
        }
      ],
      results: { test: 'auto sync data' },
      payoffData: [{ price: 1.0, payoff: 1000 }]
    }
    
    localStorage.setItem('calculatorState', JSON.stringify(testData))
    console.log('✅ Données de test ajoutées au localStorage')
    
    // Attendre un peu pour que la synchronisation automatique se déclenche
    console.log('⏳ Attente de la synchronisation automatique...')
    await new Promise(resolve => setTimeout(resolve, 35000)) // 35 secondes
    
    // Vérifier que les données ont été synchronisées
    const strategies = await SupabaseService.getStrategies()
    const latestStrategy = strategies.find(s => s.name.includes('AutoSync'))
    
    if (latestStrategy) {
      console.log('✅ Synchronisation automatique réussie')
      console.log('   - Stratégie synchronisée:', latestStrategy.name)
      
      // Nettoyer
      await SupabaseService.deleteStrategy(latestStrategy.id)
      console.log('✅ Données de test nettoyées')
      
      return {
        success: true,
        message: 'Synchronisation automatique fonctionnelle'
      }
    } else {
      console.log('⚠️ Aucune stratégie de synchronisation automatique trouvée')
      return {
        success: false,
        message: 'Synchronisation automatique non détectée'
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test de synchronisation automatique:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Exporter les fonctions globalement pour la console
if (typeof window !== 'undefined') {
  (window as any).testSupabaseFinalIntegration = testSupabaseFinalIntegration
  (window as any).testSupabasePerformance = testSupabasePerformance
  (window as any).testAutoSync = testAutoSync
  
  console.log('🧪 Fonctions de test final disponibles:')
  console.log('   - testSupabaseFinalIntegration()')
  console.log('   - testSupabasePerformance()')
  console.log('   - testAutoSync()')
}
