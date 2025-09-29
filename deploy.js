#!/usr/bin/env node

/**
 * Script de déploiement pour Forex Pricers
 * Ce script automatise le processus de déploiement de l'application
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const config = {
  buildDir: 'dist',
  environment: process.env.NODE_ENV || 'production',
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY
}

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// Vérifier les prérequis
function checkPrerequisites() {
  logStep('1', 'Vérification des prérequis...')
  
  // Vérifier Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim()
    logSuccess(`Node.js version: ${nodeVersion}`)
  } catch (error) {
    logError('Node.js n\'est pas installé')
    process.exit(1)
  }

  // Vérifier npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
    logSuccess(`npm version: ${npmVersion}`)
  } catch (error) {
    logError('npm n\'est pas installé')
    process.exit(1)
  }

  // Vérifier les variables d'environnement
  if (!config.supabaseUrl) {
    logWarning('VITE_SUPABASE_URL n\'est pas définie')
  } else {
    logSuccess('VITE_SUPABASE_URL configurée')
  }

  if (!config.supabaseKey) {
    logWarning('VITE_SUPABASE_ANON_KEY n\'est pas définie')
  } else {
    logSuccess('VITE_SUPABASE_ANON_KEY configurée')
  }
}

// Nettoyer le build précédent
function cleanBuild() {
  logStep('2', 'Nettoyage du build précédent...')
  
  if (fs.existsSync(config.buildDir)) {
    fs.rmSync(config.buildDir, { recursive: true, force: true })
    logSuccess('Dossier dist nettoyé')
  } else {
    logSuccess('Aucun build précédent à nettoyer')
  }
}

// Installer les dépendances
function installDependencies() {
  logStep('3', 'Installation des dépendances...')
  
  try {
    execSync('npm ci --only=production', { stdio: 'inherit' })
    logSuccess('Dépendances installées')
  } catch (error) {
    logError('Échec de l\'installation des dépendances')
    process.exit(1)
  }
}

// Construire l'application
function buildApplication() {
  logStep('4', 'Construction de l\'application...')
  
  try {
    execSync('npm run build', { stdio: 'inherit' })
    logSuccess('Application construite avec succès')
  } catch (error) {
    logError('Échec de la construction de l\'application')
    process.exit(1)
  }
}

// Vérifier le build
function verifyBuild() {
  logStep('5', 'Vérification du build...')
  
  if (!fs.existsSync(config.buildDir)) {
    logError('Le dossier de build n\'existe pas')
    process.exit(1)
  }

  const indexFile = path.join(config.buildDir, 'index.html')
  if (!fs.existsSync(indexFile)) {
    logError('Le fichier index.html n\'existe pas dans le build')
    process.exit(1)
  }

  // Vérifier la taille du build
  const buildSize = getDirectorySize(config.buildDir)
  logSuccess(`Taille du build: ${formatBytes(buildSize)}`)

  if (buildSize > 50 * 1024 * 1024) { // 50MB
    logWarning('Le build est très volumineux (>50MB)')
  }
}

// Obtenir la taille d'un dossier
function getDirectorySize(dirPath) {
  let totalSize = 0
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath)
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(itemPath)
      files.forEach(file => {
        calculateSize(path.join(itemPath, file))
      })
    } else {
      totalSize += stats.size
    }
  }
  
  calculateSize(dirPath)
  return totalSize
}

// Formater les bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Créer un fichier de configuration pour le déploiement
function createDeploymentConfig() {
  logStep('6', 'Création de la configuration de déploiement...')
  
  const configContent = {
    environment: config.environment,
    buildTime: new Date().toISOString(),
    version: require('./package.json').version,
    supabase: {
      url: config.supabaseUrl,
      configured: !!config.supabaseUrl
    },
    features: {
      supabaseSync: true,
      userAuthentication: true,
      realTimeData: false,
      advancedAnalytics: true
    }
  }

  const configPath = path.join(config.buildDir, 'deployment-config.json')
  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2))
  logSuccess('Configuration de déploiement créée')
}

// Générer un rapport de déploiement
function generateDeploymentReport() {
  logStep('7', 'Génération du rapport de déploiement...')
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: config.environment,
    buildSize: getDirectorySize(config.buildDir),
    files: getBuildFiles(),
    configuration: {
      supabaseUrl: config.supabaseUrl ? '✅ Configurée' : '❌ Non configurée',
      supabaseKey: config.supabaseKey ? '✅ Configurée' : '❌ Non configurée'
    },
    recommendations: generateRecommendations()
  }

  const reportPath = path.join(config.buildDir, 'deployment-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  logSuccess('Rapport de déploiement généré')
}

// Obtenir la liste des fichiers du build
function getBuildFiles() {
  const files = []
  
  function scanDirectory(dirPath, relativePath = '') {
    const items = fs.readdirSync(dirPath)
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item)
      const relativeItemPath = path.join(relativePath, item)
      const stats = fs.statSync(fullPath)
      
      if (stats.isDirectory()) {
        scanDirectory(fullPath, relativeItemPath)
      } else {
        files.push({
          path: relativeItemPath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        })
      }
    })
  }
  
  scanDirectory(config.buildDir)
  return files
}

// Générer des recommandations
function generateRecommendations() {
  const recommendations = []
  
  if (!config.supabaseUrl) {
    recommendations.push('Configurer VITE_SUPABASE_URL pour l\'intégration Supabase')
  }
  
  if (!config.supabaseKey) {
    recommendations.push('Configurer VITE_SUPABASE_ANON_KEY pour l\'authentification')
  }
  
  const buildSize = getDirectorySize(config.buildDir)
  if (buildSize > 10 * 1024 * 1024) { // 10MB
    recommendations.push('Considérer l\'optimisation du bundle pour réduire la taille')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Configuration optimale détectée')
  }
  
  return recommendations
}

// Fonction principale
function main() {
  log('🚀 Déploiement de Forex Pricers', 'bright')
  log(`Environnement: ${config.environment}`, 'blue')
  
  try {
    checkPrerequisites()
    cleanBuild()
    installDependencies()
    buildApplication()
    verifyBuild()
    createDeploymentConfig()
    generateDeploymentReport()
    
    log('\n🎉 Déploiement terminé avec succès!', 'green')
    log(`📁 Dossier de build: ${config.buildDir}`, 'cyan')
    log('📋 Consultez deployment-report.json pour plus de détails', 'cyan')
    
  } catch (error) {
    logError(`Erreur lors du déploiement: ${error.message}`)
    process.exit(1)
  }
}

// Exécuter le script
if (require.main === module) {
  main()
}

module.exports = {
  main,
  config
}
