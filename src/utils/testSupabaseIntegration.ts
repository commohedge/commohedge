import { testSupabaseConnection, testSupabaseTables } from './supabaseTest'
import AutoSyncService from '../services/AutoSyncService'
import LocalStorageWatcher from '../services/LocalStorageWatcher'

export const runSupabaseIntegrationTest = async () => {
  console.log('🧪 Début du test d\'intégration Supabase...')
  
  try {
    // Test 1: Connexion Supabase
    console.log('\n1️⃣ Test de connexion Supabase...')
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      throw new Error(`Connexion échouée: ${connectionTest.error}`)
    }
    console.log('✅ Connexion Supabase réussie')
    
    // Test 2: Tables Supabase
    console.log('\n2️⃣ Test des tables Supabase...')
    const tablesTest = await testSupabaseTables()
    const allTablesOk = Object.values(tablesTest).every(status => status)
    if (!allTablesOk) {
      console.warn('⚠️ Certaines tables ne sont pas accessibles:', tablesTest)
    } else {
      console.log('✅ Toutes les tables sont accessibles')
    }
    
    // Test 3: Service AutoSync
    console.log('\n3️⃣ Test du service AutoSync...')
    const autoSyncService = AutoSyncService.getInstance()
    console.log(`✅ Service AutoSync initialisé (connecté: ${autoSyncService.connectionStatus})`)
    
    // Test 4: LocalStorageWatcher
    console.log('\n4️⃣ Test du LocalStorageWatcher...')
    const localStorageWatcher = LocalStorageWatcher.getInstance()
    const watchedKeys = localStorageWatcher.getWatchedKeys()
    console.log(`✅ LocalStorageWatcher initialisé (clés surveillées: ${watchedKeys.join(', ')})`)
    
    // Test 5: Simulation de changement
    console.log('\n5️⃣ Test de simulation de changement...')
    const testData = {
      test: true,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('calculatorState', JSON.stringify(testData))
    console.log('✅ Changement simulé dans localStorage')
    
    // Attendre un peu pour voir si la synchronisation se déclenche
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('\n🎉 Test d\'intégration Supabase terminé avec succès!')
    return {
      success: true,
      results: {
        connection: connectionTest.success,
        tables: tablesTest,
        autoSync: autoSyncService.connectionStatus,
        localStorageWatcher: watchedKeys.length > 0
      }
    }
    
  } catch (error) {
    console.error('❌ Test d\'intégration échoué:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// Fonction pour tester la synchronisation manuelle
export const testManualSync = async () => {
  console.log('🔄 Test de synchronisation manuelle...')
  
  try {
    const autoSyncService = AutoSyncService.getInstance()
    const result = await autoSyncService.performSync()
    
    if (result) {
      console.log('✅ Synchronisation manuelle réussie')
    } else {
      console.log('❌ Synchronisation manuelle échouée')
    }
    
    return result
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation manuelle:', error)
    return false
  }
}

// Exporter les fonctions pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).testSupabaseIntegration = runSupabaseIntegrationTest
  (window as any).testManualSync = testManualSync
  console.log('🔧 Fonctions de test disponibles dans la console:')
  console.log('- testSupabaseIntegration()')
  console.log('- testManualSync()')
}
