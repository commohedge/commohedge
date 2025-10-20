/**
 * Commodities Constants
 * 
 * Définition de toutes les commodities supportées avec leurs spécifications
 */

import { Commodity, CommodityCategory } from '@/types/Commodity';

// ===== ENERGY COMMODITIES =====

export const WTI_CRUDE: Commodity = {
  symbol: 'WTI',
  name: 'WTI Crude Oil',
  category: 'energy',
  subCategory: 'crude-oil',
  unit: 'barrel',
  contractSize: 1000,
  quoteCurrency: 'USD',
  tickSize: 0.01,
  tickValue: 10.00,
  defaultSpotPrice: 75.50,
  deliveryLocation: 'Cushing, Oklahoma',
  qualitySpecifications: 'Light Sweet Crude Oil, API gravity 39.6°',
  tradingHours: '18:00 - 17:00 ET (Sun-Fri)',
  exchange: 'NYMEX',
  bloombergSymbol: 'CL1 Comdty',
  reutersSymbol: 'CLc1'
};

export const BRENT_CRUDE: Commodity = {
  symbol: 'BRENT',
  name: 'Brent Crude Oil',
  category: 'energy',
  subCategory: 'crude-oil',
  unit: 'barrel',
  contractSize: 1000,
  quoteCurrency: 'USD',
  tickSize: 0.01,
  tickValue: 10.00,
  defaultSpotPrice: 78.20,
  deliveryLocation: 'North Sea',
  qualitySpecifications: 'Brent Blend, API gravity 38°',
  exchange: 'ICE',
  bloombergSymbol: 'CO1 Comdty',
  reutersSymbol: 'LCOc1'
};

export const NATURAL_GAS: Commodity = {
  symbol: 'NATGAS',
  name: 'Natural Gas',
  category: 'energy',
  subCategory: 'natural-gas',
  unit: 'MMBtu',
  contractSize: 10000,
  quoteCurrency: 'USD',
  tickSize: 0.001,
  tickValue: 10.00,
  defaultSpotPrice: 2.65,
  deliveryLocation: 'Henry Hub, Louisiana',
  exchange: 'NYMEX',
  bloombergSymbol: 'NG1 Comdty',
  reutersSymbol: 'NGc1'
};

export const HEATING_OIL: Commodity = {
  symbol: 'HEATING',
  name: 'Heating Oil',
  category: 'energy',
  subCategory: 'refined-products',
  unit: 'gallon',
  contractSize: 42000,
  quoteCurrency: 'USD',
  tickSize: 0.0001,
  tickValue: 4.20,
  defaultSpotPrice: 2.45,
  exchange: 'NYMEX',
  bloombergSymbol: 'HO1 Comdty'
};

export const RBOB_GASOLINE: Commodity = {
  symbol: 'GASOLINE',
  name: 'RBOB Gasoline',
  category: 'energy',
  subCategory: 'refined-products',
  unit: 'gallon',
  contractSize: 42000,
  quoteCurrency: 'USD',
  tickSize: 0.0001,
  tickValue: 4.20,
  defaultSpotPrice: 2.35,
  exchange: 'NYMEX',
  bloombergSymbol: 'XB1 Comdty'
};

// ===== PRECIOUS METALS =====

export const GOLD: Commodity = {
  symbol: 'GOLD',
  name: 'Gold',
  category: 'metals',
  subCategory: 'precious-metals',
  unit: 'troy ounce',
  contractSize: 100,
  quoteCurrency: 'USD',
  tickSize: 0.10,
  tickValue: 10.00,
  defaultSpotPrice: 1850.25,
  qualitySpecifications: '99.5% purity minimum',
  exchange: 'COMEX',
  bloombergSymbol: 'GC1 Comdty',
  reutersSymbol: 'GCc1'
};

export const SILVER: Commodity = {
  symbol: 'SILVER',
  name: 'Silver',
  category: 'metals',
  subCategory: 'precious-metals',
  unit: 'troy ounce',
  contractSize: 5000,
  quoteCurrency: 'USD',
  tickSize: 0.005,
  tickValue: 25.00,
  defaultSpotPrice: 23.45,
  qualitySpecifications: '99.9% purity minimum',
  exchange: 'COMEX',
  bloombergSymbol: 'SI1 Comdty',
  reutersSymbol: 'SIc1'
};

export const PLATINUM: Commodity = {
  symbol: 'PLATINUM',
  name: 'Platinum',
  category: 'metals',
  subCategory: 'precious-metals',
  unit: 'troy ounce',
  contractSize: 50,
  quoteCurrency: 'USD',
  tickSize: 0.10,
  tickValue: 5.00,
  defaultSpotPrice: 925.00,
  qualitySpecifications: '99.95% purity minimum',
  exchange: 'NYMEX',
  bloombergSymbol: 'PL1 Comdty'
};

export const PALLADIUM: Commodity = {
  symbol: 'PALLADIUM',
  name: 'Palladium',
  category: 'metals',
  subCategory: 'precious-metals',
  unit: 'troy ounce',
  contractSize: 100,
  quoteCurrency: 'USD',
  tickSize: 0.05,
  tickValue: 5.00,
  defaultSpotPrice: 1050.00,
  qualitySpecifications: '99.95% purity minimum',
  exchange: 'NYMEX',
  bloombergSymbol: 'PA1 Comdty'
};

// ===== BASE METALS =====

export const COPPER: Commodity = {
  symbol: 'COPPER',
  name: 'Copper',
  category: 'metals',
  subCategory: 'base-metals',
  unit: 'pound',
  contractSize: 25000,
  quoteCurrency: 'USD',
  tickSize: 0.0005,
  tickValue: 12.50,
  defaultSpotPrice: 3.85,
  qualitySpecifications: 'Grade 1 Copper',
  exchange: 'COMEX',
  bloombergSymbol: 'HG1 Comdty',
  reutersSymbol: 'HGc1'
};

export const ALUMINUM: Commodity = {
  symbol: 'ALUMINUM',
  name: 'Aluminum',
  category: 'metals',
  subCategory: 'base-metals',
  unit: 'metric ton',
  contractSize: 25,
  quoteCurrency: 'USD',
  tickSize: 0.50,
  tickValue: 12.50,
  defaultSpotPrice: 2250.00,
  exchange: 'LME',
  bloombergSymbol: 'LMAHDS03 Comdty'
};

export const ZINC: Commodity = {
  symbol: 'ZINC',
  name: 'Zinc',
  category: 'metals',
  subCategory: 'base-metals',
  unit: 'metric ton',
  contractSize: 25,
  quoteCurrency: 'USD',
  tickSize: 0.50,
  tickValue: 12.50,
  defaultSpotPrice: 2450.00,
  exchange: 'LME',
  bloombergSymbol: 'LMZSDS03 Comdty'
};

export const NICKEL: Commodity = {
  symbol: 'NICKEL',
  name: 'Nickel',
  category: 'metals',
  subCategory: 'base-metals',
  unit: 'metric ton',
  contractSize: 6,
  quoteCurrency: 'USD',
  tickSize: 5.00,
  tickValue: 30.00,
  defaultSpotPrice: 16500.00,
  exchange: 'LME',
  bloombergSymbol: 'LMNIDS03 Comdty'
};

export const LEAD: Commodity = {
  symbol: 'LEAD',
  name: 'Lead',
  category: 'metals',
  subCategory: 'base-metals',
  unit: 'metric ton',
  contractSize: 25,
  quoteCurrency: 'USD',
  tickSize: 0.50,
  tickValue: 12.50,
  defaultSpotPrice: 2100.00,
  exchange: 'LME',
  bloombergSymbol: 'LMPBDS03 Comdty'
};

// ===== AGRICULTURE - GRAINS =====

export const CORN: Commodity = {
  symbol: 'CORN',
  name: 'Corn',
  category: 'agriculture',
  subCategory: 'grains',
  unit: 'bushel',
  contractSize: 5000,
  quoteCurrency: 'USD',
  tickSize: 0.0025,
  tickValue: 12.50,
  defaultSpotPrice: 4.85,
  qualitySpecifications: 'No. 2 Yellow Corn',
  deliveryLocation: 'Chicago, Illinois',
  exchange: 'CBOT',
  bloombergSymbol: 'C 1 Comdty',
  reutersSymbol: 'Cc1'
};

export const WHEAT: Commodity = {
  symbol: 'WHEAT',
  name: 'Wheat',
  category: 'agriculture',
  subCategory: 'grains',
  unit: 'bushel',
  contractSize: 5000,
  quoteCurrency: 'USD',
  tickSize: 0.0025,
  tickValue: 12.50,
  defaultSpotPrice: 6.25,
  qualitySpecifications: 'No. 2 Soft Red Winter Wheat',
  deliveryLocation: 'Chicago, Illinois',
  exchange: 'CBOT',
  bloombergSymbol: 'W 1 Comdty',
  reutersSymbol: 'Wc1'
};

export const SOYBEANS: Commodity = {
  symbol: 'SOYBEANS',
  name: 'Soybeans',
  category: 'agriculture',
  subCategory: 'oilseeds',
  unit: 'bushel',
  contractSize: 5000,
  quoteCurrency: 'USD',
  tickSize: 0.0025,
  tickValue: 12.50,
  defaultSpotPrice: 13.50,
  qualitySpecifications: 'No. 1 Yellow Soybeans',
  deliveryLocation: 'Chicago, Illinois',
  exchange: 'CBOT',
  bloombergSymbol: 'S 1 Comdty',
  reutersSymbol: 'Sc1'
};

// ===== AGRICULTURE - SOFTS =====

export const COFFEE: Commodity = {
  symbol: 'COFFEE',
  name: 'Coffee',
  category: 'agriculture',
  subCategory: 'softs',
  unit: 'pound',
  contractSize: 37500,
  quoteCurrency: 'USD',
  tickSize: 0.0005,
  tickValue: 18.75,
  defaultSpotPrice: 1.85,
  qualitySpecifications: 'Arabica Coffee',
  exchange: 'ICE',
  bloombergSymbol: 'KC1 Comdty'
};

export const SUGAR: Commodity = {
  symbol: 'SUGAR',
  name: 'Sugar No. 11',
  category: 'agriculture',
  subCategory: 'softs',
  unit: 'pound',
  contractSize: 112000,
  quoteCurrency: 'USD',
  tickSize: 0.0001,
  tickValue: 11.20,
  defaultSpotPrice: 0.18,
  qualitySpecifications: 'Raw Cane Sugar',
  exchange: 'ICE',
  bloombergSymbol: 'SB1 Comdty'
};

export const COTTON: Commodity = {
  symbol: 'COTTON',
  name: 'Cotton No. 2',
  category: 'agriculture',
  subCategory: 'softs',
  unit: 'pound',
  contractSize: 50000,
  quoteCurrency: 'USD',
  tickSize: 0.0001,
  tickValue: 5.00,
  defaultSpotPrice: 0.82,
  qualitySpecifications: 'Upland Cotton',
  exchange: 'ICE',
  bloombergSymbol: 'CT1 Comdty'
};

export const COCOA: Commodity = {
  symbol: 'COCOA',
  name: 'Cocoa',
  category: 'agriculture',
  subCategory: 'softs',
  unit: 'metric ton',
  contractSize: 10,
  quoteCurrency: 'USD',
  tickSize: 1.00,
  tickValue: 10.00,
  defaultSpotPrice: 3250.00,
  exchange: 'ICE',
  bloombergSymbol: 'CC1 Comdty'
};

// ===== LIVESTOCK =====

export const LIVE_CATTLE: Commodity = {
  symbol: 'CATTLE',
  name: 'Live Cattle',
  category: 'livestock',
  unit: 'cwt',
  contractSize: 40000,
  quoteCurrency: 'USD',
  tickSize: 0.00025,
  tickValue: 10.00,
  defaultSpotPrice: 165.00,
  exchange: 'CME',
  bloombergSymbol: 'LC1 Comdty'
};

export const LEAN_HOGS: Commodity = {
  symbol: 'HOGS',
  name: 'Lean Hogs',
  category: 'livestock',
  unit: 'cwt',
  contractSize: 40000,
  quoteCurrency: 'USD',
  tickSize: 0.00025,
  tickValue: 10.00,
  defaultSpotPrice: 75.50,
  exchange: 'CME',
  bloombergSymbol: 'LH1 Comdty'
};

// ===== COMMODITY LISTS =====

export const ENERGY_COMMODITIES: Commodity[] = [
  WTI_CRUDE,
  BRENT_CRUDE,
  NATURAL_GAS,
  HEATING_OIL,
  RBOB_GASOLINE
];

export const PRECIOUS_METALS: Commodity[] = [
  GOLD,
  SILVER,
  PLATINUM,
  PALLADIUM
];

export const BASE_METALS: Commodity[] = [
  COPPER,
  ALUMINUM,
  ZINC,
  NICKEL,
  LEAD
];

export const GRAIN_COMMODITIES: Commodity[] = [
  CORN,
  WHEAT,
  SOYBEANS
];

export const SOFT_COMMODITIES: Commodity[] = [
  COFFEE,
  SUGAR,
  COTTON,
  COCOA
];

export const LIVESTOCK_COMMODITIES: Commodity[] = [
  LIVE_CATTLE,
  LEAN_HOGS
];

export const ALL_COMMODITIES: Commodity[] = [
  ...ENERGY_COMMODITIES,
  ...PRECIOUS_METALS,
  ...BASE_METALS,
  ...GRAIN_COMMODITIES,
  ...SOFT_COMMODITIES,
  ...LIVESTOCK_COMMODITIES
];

// ===== COMMODITY CATEGORIES =====

export const COMMODITY_CATEGORIES = {
  energy: {
    name: 'Energy',
    commodities: ENERGY_COMMODITIES,
    icon: '⚡',
    color: '#f59e0b' // orange
  },
  metals: {
    name: 'Metals',
    commodities: [...PRECIOUS_METALS, ...BASE_METALS],
    icon: '⚙️',
    color: '#8b5cf6' // purple
  },
  agriculture: {
    name: 'Agriculture',
    commodities: [...GRAIN_COMMODITIES, ...SOFT_COMMODITIES],
    icon: '🌾',
    color: '#10b981' // green
  },
  livestock: {
    name: 'Livestock',
    commodities: LIVESTOCK_COMMODITIES,
    icon: '🐄',
    color: '#ef4444' // red
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Trouve une commodity par son symbole
 */
export function getCommodityBySymbol(symbol: string): Commodity | undefined {
  return ALL_COMMODITIES.find(c => c.symbol === symbol);
}

/**
 * Obtient toutes les commodities d'une catégorie
 */
export function getCommoditiesByCategory(category: CommodityCategory): Commodity[] {
  return ALL_COMMODITIES.filter(c => c.category === category);
}

/**
 * Formate un prix de commodity avec l'unité appropriée
 */
export function formatCommodityPrice(price: number, commodity: Commodity): string {
  const formattedPrice = price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `$${formattedPrice}/${commodity.unit}`;
}

/**
 * Calcule la valeur totale d'un contrat
 */
export function calculateContractValue(price: number, commodity: Commodity): number {
  return price * commodity.contractSize;
}

