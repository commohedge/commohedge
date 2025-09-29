// Script de nettoyage du localStorage pour le déploiement
export const cleanupLocalStorage = () => {
  console.log('🧹 Nettoyage du localStorage...')
  
  // Supprimer toutes les données d'authentification locale
  const keysToRemove = [
    'fx_hedging_auth',
    'fx_hedging_user',
    'calculatorState',
    'savedScenarios',
    'savedRiskMatrices',
    'hedgingInstruments'
  ]
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      console.log(`✅ Supprimé: ${key}`)
    }
  })
  
  console.log('🎉 Nettoyage terminé !')
}

// Exporter la fonction globalement pour la console
if (typeof window !== 'undefined') {
  (window as any).cleanupLocalStorage = cleanupLocalStorage
  console.log('🧹 Fonction de nettoyage disponible: cleanupLocalStorage()')
}
