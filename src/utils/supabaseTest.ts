import { supabase } from '../lib/supabase'

export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Test de connexion Supabase...')
    
    // Test de connexion basique
    const { data, error } = await supabase
      .from('forex_strategies')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Erreur de connexion Supabase:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Connexion Supabase réussie')
    return { success: true, data }
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

export const testSupabaseTables = async () => {
  const tables = ['forex_strategies', 'saved_scenarios', 'risk_matrices', 'hedging_instruments']
  const results: Record<string, boolean> = {}
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      results[table] = !error
      console.log(`${results[table] ? '✅' : '❌'} Table ${table}: ${results[table] ? 'OK' : error?.message}`)
    } catch (err) {
      results[table] = false
      console.log(`❌ Table ${table}: Erreur - ${err}`)
    }
  }
  
  return results
}
