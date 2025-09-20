# Script de nettoyage du localStorage

Si la page Settings ne fonctionne toujours pas après les modifications, exécutez ce script dans la console du navigateur (F12) :

```javascript
// Nettoyer et réinitialiser le localStorage
console.log("🧹 Nettoyage du localStorage...");

// Supprimer les anciennes données corrompues
localStorage.removeItem('fxRiskManagerSettings');
localStorage.removeItem('companyLogo');

// Réinitialiser avec les bonnes valeurs par défaut
const defaultSettings = {
  company: {
    name: "FX hedging - Risk Management Platform",
    currency: "USD",
    timezone: "Europe/Paris",
    fiscalYearStart: "01-01"
  },
  risk: {
    defaultConfidenceLevel: 95,
    varHorizon: 1,
    stressTestEnabled: true,
    monteCarloSimulations: 10000,
    riskLimits: {
      maxVaR: 5000000,
      maxUnhedgedRisk: 10000000,
      minHedgeRatio: 70
    }
  },
  pricing: {
    defaultModel: "garman-kohlhagen",
    useRealTimeData: true,
    volatilityModel: "garch",
    interestRateSource: "bloomberg",
    pricingFrequency: "real-time",
    underlyingPriceType: "spot",
    backtestExerciseType: "monthly-average"
  },
  ui: {
    theme: "light",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    numberFormat: "en-US",
    dashboardRefresh: 30
  },
  notifications: {
    riskAlerts: true,
    priceAlerts: true,
    maturityAlerts: true,
    emailNotifications: false,
    alertThresholds: {
      varExceeded: 110,
      hedgeRatioBelow: 60,
      maturityWithin: 30
    }
  },
  data: {
    autoSave: true,
    backupFrequency: "daily",
    dataRetention: 365,
    exportFormat: "xlsx"
  },
  fxExposures: {
    autoDetection: true,
    defaultMaturity: "1M",
    riskClassification: "low",
    consolidationLevel: "entity",
    exposureThreshold: 100000,
    reportingCurrency: "USD",
    includePendingTransactions: true,
    maturityBuckets: ["1M", "3M", "6M", "1Y", "2Y+"]
  },
  hedgingInstruments: {
    defaultInstrumentType: "forward",
    autoHedgeRatio: 80,
    maxLeverage: 10,
    counterpartyLimits: true,
    creditRiskAssessment: true,
    marginRequirements: true,
    settlementPreferences: "physical",
    approvalWorkflow: true,
    documentationRequired: ["ISDA", "CSA", "Confirmation"]
  }
};

localStorage.setItem('fxRiskManagerSettings', JSON.stringify(defaultSettings));

console.log("✅ localStorage nettoyé et réinitialisé");
console.log("🔄 Rechargez la page pour appliquer les changements");

// Recharger automatiquement la page
setTimeout(() => {
  window.location.reload();
}, 1000);
```

## Instructions :

1. Ouvrez votre navigateur sur http://localhost:8070/settings
2. Appuyez sur F12 pour ouvrir les outils de développement
3. Allez dans l'onglet "Console"
4. Copiez et collez le script ci-dessus
5. Appuyez sur Entrée pour l'exécuter
6. La page se rechargera automatiquement

Cela devrait résoudre tous les problèmes de localStorage corrompu.
