/**
 * Commodity Types and Interfaces
 * 
 * Définition des types pour la gestion des risques de commodités
 */

// Categories principales de commodities
export type CommodityCategory = 'energy' | 'metals' | 'agriculture' | 'livestock';

// Sous-catégories
export type CommoditySubCategory = 
  | 'crude-oil' | 'natural-gas' | 'refined-products'  // Energy
  | 'precious-metals' | 'base-metals'                 // Metals
  | 'grains' | 'softs' | 'oilseeds'                   // Agriculture
  | 'live-cattle' | 'lean-hogs';                      // Livestock

// Unités de mesure
export type CommodityUnit = 
  | 'barrel' | 'bbl'           // Pétrole
  | 'MMBtu' | 'therm'          // Gaz naturel
  | 'gallon' | 'gal'           // Produits raffinés
  | 'troy ounce' | 'oz'        // Métaux précieux
  | 'metric ton' | 'MT' | 'ton' // Métaux de base, agriculture
  | 'pound' | 'lb'             // Cuivre, café, sucre
  | 'bushel' | 'bu'            // Grains (maïs, blé, soja)
  | 'cwt';                     // Bétail (hundredweight)

// Interface principale pour une commodity
export interface Commodity {
  symbol: string;                    // "WTI", "CL", "GC", etc.
  name: string;                      // "WTI Crude Oil", "Gold"
  category: CommodityCategory;
  subCategory?: CommoditySubCategory;
  unit: CommodityUnit;
  contractSize: number;              // Taille standard du contrat (1000 barrels, 100 oz, etc.)
  quoteCurrency: string;             // "USD" généralement
  tickSize: number;                  // Variation minimale de prix (0.01 pour WTI)
  tickValue: number;                 // Valeur d'un tick en USD
  defaultSpotPrice: number;          // Prix spot par défaut
  deliveryLocation?: string;         // "Cushing, OK" pour WTI
  qualitySpecifications?: string;    // Spécifications de qualité
  tradingHours?: string;             // Heures de trading
  exchange?: string;                 // "NYMEX", "COMEX", "CBOT", etc.
  bloombergSymbol?: string;          // Symbole Bloomberg
  reutersSymbol?: string;            // Symbole Reuters
}

// Données de marché pour commodities
export interface CommodityMarketData {
  spotPrices: { [commodity: string]: number };           // Prix spot actuels
  volatilities: { [commodity: string]: number };         // Volatilités annualisées
  riskFreeRate: number;                                  // Taux sans risque (SOFR, T-Bills)
  storageCosts: { [commodity: string]: number };         // Coûts de stockage (% annuel)
  convenienceYields: { [commodity: string]: number };    // Convenience yields (% annuel)
  costOfCarry: { [commodity: string]: number };          // b = r + storage - convenience
  forwardCurve: { [commodity: string]: { [tenor: string]: number } };  // Courbe des forwards
  contangoBackwardation: { [commodity: string]: number }; // Structure de la courbe (+/-)
  lastUpdated: Date;
}

// Exposition à une commodity
export interface CommodityExposureData {
  id: string;
  commodity: string;                 // Symbole de la commodity
  commodityName: string;             // Nom complet
  quantity: number;                  // Quantité en unités
  unit: CommodityUnit;               // Unité de mesure
  type: 'long' | 'short';           // Position longue ou courte
  pricePerUnit: number;              // Prix par unité
  totalValue: number;                // Valeur totale (quantity * pricePerUnit)
  maturity: Date;                    // Date d'échéance
  description: string;
  subsidiary?: string;
  hedgeRatio: number;                // % couvert
  hedgedQuantity: number;            // Quantité couverte
  deliveryLocation?: string;
  qualityGrade?: string;
}

// Instrument de couverture pour commodities
export interface CommodityHedgingInstrument {
  id: string;
  type: 'forward' | 'vanilla-call' | 'vanilla-put' | 'collar' | 'swap' | 'barrier' | 'asian' | 'spread';
  commodity: string;                 // Symbole de la commodity
  commodityName: string;             // Nom complet
  notional: number;                  // Notionnel en unités
  unit: CommodityUnit;               // Unité
  strike?: number;                   // Strike price
  premium?: number;                  // Prime payée/reçue
  maturity: Date;                    // Date d'échéance
  counterparty: string;              // Contrepartie
  mtm: number;                       // Mark-to-Market
  hedgeAccounting: boolean;          // Hedge accounting IFRS 9
  effectivenessRatio?: number;       // Ratio d'efficacité
  contractSize: number;              // Taille du contrat
  physicalDelivery: boolean;         // Livraison physique ou cash settlement
  deliveryLocation?: string;
  settlementCurrency: string;        // Devise de règlement
  volumeType?: 'long' | 'short' | 'receivable' | 'payable'; // Type de position: long/short (commodity) ou receivable/payable (FX)
}

// Métriques de risque pour commodities
export interface CommodityRiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  totalExposure: number;
  hedgedAmount: number;
  unhedgedRisk: number;
  hedgeRatio: number;
  mtmImpact: number;
  // Métriques spécifiques commodities
  totalVolume: number;               // Volume total en unités
  averagePrice: number;              // Prix moyen
  priceRisk: number;                 // Risque de prix
  basisRisk?: number;                // Risque de base (location, qualité)
}

// Exposition par commodity agrégée
export interface CommodityExposure {
  commodity: string;
  commodityName: string;
  category: CommodityCategory;
  unit: CommodityUnit;
  grossExposure: number;             // Volume brut
  netExposure: number;               // Volume net (long - short)
  hedgedAmount: number;              // Volume couvert
  hedgeRatio: number;                // % de couverture
  var95: number;
  averagePrice: number;
  totalValue: number;
  trend: 'up' | 'down' | 'stable';
  contangoBackwardation: 'contango' | 'backwardation' | 'neutral';
}

// Paramètres pour calcul du cost of carry
export interface CostOfCarryParams {
  riskFreeRate: number;              // Taux sans risque (r)
  storageCost: number;               // Coût de stockage (% annuel)
  convenienceYield: number;          // Convenience yield (% annuel)
}

// Forward/Futures price components
export interface ForwardPriceComponents {
  spotPrice: number;
  forwardPrice: number;
  costOfCarry: number;               // b = r + storage - convenience
  timeToMaturity: number;
  impliedStorageCost?: number;
  impliedConvenienceYield?: number;
  contangoBackwardation: number;     // Forward - Spot ($ ou %)
}

// Commodity price data point
export interface CommodityPricePoint {
  date: Date | string;
  commodity: string;
  spotPrice: number;
  forwardPrices?: { [tenor: string]: number };
  volatility?: number;
  volume?: number;
  openInterest?: number;
}

// Seasonality pattern (pour agriculture)
export interface SeasonalityPattern {
  commodity: string;
  month: number;                     // 1-12
  averagePriceMultiplier: number;    // Multiplicateur par rapport à moyenne annuelle
  volatilityMultiplier: number;
  historicalData?: number[];         // Données historiques
}

