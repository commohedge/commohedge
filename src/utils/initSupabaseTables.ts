import { supabase } from '../lib/supabase'

export const initSupabaseTables = async () => {
  console.log('🔧 Initialisation des tables Supabase...')
  
  try {
    // Vérifier si les tables existent en essayant de les interroger
    const tables = ['forex_strategies', 'saved_scenarios', 'risk_matrices', 'hedging_instruments']
    const existingTables: string[] = []
    const missingTables: string[] = []
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          missingTables.push(table)
          console.log(`❌ Table ${table} manquante: ${error.message}`)
        } else {
          existingTables.push(table)
          console.log(`✅ Table ${table} existe`)
        }
      } catch (err) {
        missingTables.push(table)
        console.log(`❌ Erreur lors de la vérification de ${table}:`, err)
      }
    }
    
    if (missingTables.length > 0) {
      console.warn('⚠️ Tables manquantes détectées:', missingTables)
      console.log('📋 Veuillez exécuter le script SQL dans supabase-schema.sql pour créer les tables manquantes')
      
      // Créer un exemple de données pour tester
      if (existingTables.length > 0) {
        console.log('🧪 Test de création de données d\'exemple...')
        await createSampleData()
      }
    } else {
      console.log('✅ Toutes les tables existent')
      await createSampleData()
    }
    
    return {
      success: true,
      existingTables,
      missingTables
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

const createSampleData = async () => {
  try {
    // Créer une stratégie d'exemple si aucune n'existe
    const { data: existingStrategies } = await supabase
      .from('forex_strategies')
      .select('id')
      .limit(1)
    
    if (!existingStrategies || existingStrategies.length === 0) {
      console.log('📝 Création d\'une stratégie d\'exemple...')
      
      const sampleStrategy = {
        name: 'Stratégie EUR/USD Exemple',
        description: 'Exemple de stratégie de couverture EUR/USD créée automatiquement',
        start_date: new Date().toISOString().split('T')[0],
        strategy_start_date: new Date().toISOString().split('T')[0],
        months_to_hedge: 12,
        domestic_rate: 1.0,
        foreign_rate: 0.5,
        base_volume: 10000000,
        quote_volume: 10850000,
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
            strike: 110.0,
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
        results: null,
        payoff_data: [],
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
      
      const { error } = await supabase
        .from('forex_strategies')
        .insert([sampleStrategy])
      
      if (error) {
        console.error('❌ Erreur lors de la création de la stratégie d\'exemple:', error)
      } else {
        console.log('✅ Stratégie d\'exemple créée avec succès')
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données d\'exemple:', error)
  }
}

// Exporter pour utilisation dans la console
if (typeof window !== 'undefined') {
  (window as any).initSupabaseTables = initSupabaseTables
  console.log('🔧 Fonction d\'initialisation disponible: initSupabaseTables()')
}
