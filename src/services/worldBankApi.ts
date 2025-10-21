import * as XLSX from 'xlsx';

export interface WorldBankCommodity {
  id: string;
  name: string;
  unit: string;
  symbol: string;
  category: string;
  data: {
    date: string;
    value: number;
  }[];
  currentValue?: number;
  change?: number;
  changePercent?: number;
}

export interface WorldBankData {
  commodities: WorldBankCommodity[];
  lastUpdated: Date;
  fileName?: string;
  isDefault?: boolean;
}

// Catégories de commodités World Bank
export const WORLD_BANK_CATEGORIES = {
  ENERGY: 'Energy',
  AGRICULTURAL: 'Agricultural',
  METALS: 'Metals',
  FERTILIZERS: 'Fertilizers',
  OTHER: 'Other'
} as const;

// Mapping des commodités vers leurs catégories
const COMMODITY_CATEGORIES: Record<string, string> = {
  // Energy
  'CRUDE_PETRO': WORLD_BANK_CATEGORIES.ENERGY,
  'CRUDE_BRENT': WORLD_BANK_CATEGORIES.ENERGY,
  'CRUDE_DUBAI': WORLD_BANK_CATEGORIES.ENERGY,
  'CRUDE_WTI': WORLD_BANK_CATEGORIES.ENERGY,
  'COAL_AUS': WORLD_BANK_CATEGORIES.ENERGY,
  'COAL_SAFRICA': WORLD_BANK_CATEGORIES.ENERGY,
  'NGAS_US': WORLD_BANK_CATEGORIES.ENERGY,
  'NGAS_EUR': WORLD_BANK_CATEGORIES.ENERGY,
  'NGAS_JP': WORLD_BANK_CATEGORIES.ENERGY,
  'iNATGAS': WORLD_BANK_CATEGORIES.ENERGY,
  
  // Agricultural
  'COCOA': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'COFFEE_ARABIC': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'COFFEE_ROBUS': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'TEA_AVG': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'TEA_COLOMBO': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'TEA_KOLKATA': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'TEA_MOMBASA': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'COCONUT_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'GRNUT': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'FISH_MEAL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'GRNUT_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'PALM_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'PLMKRNL_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SOYBEANS': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SOYBEAN_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SOYBEAN_MEAL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RAPESEED_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SUNFLOWER_OIL': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'BARLEY': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'MAIZE': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SORGHUM': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RICE_05': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RICE_25': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RICE_A1': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RICE_05_VNM': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'WHEAT_US_SRW': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'WHEAT_US_HRW': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'BANANA_EU': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'BANANA_US': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'ORANGE': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'BEEF': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'CHICKEN': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'LAMB': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SHRIMP_MEX': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SUGAR_EU': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SUGAR_US': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SUGAR_WLD': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'TOBAC_US': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'LOGS_CMR': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'LOGS_MYS': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SAWNWD_CMR': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'SAWNWD_MYS': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'PLYWOOD': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'COTTON_A_INDX': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RUBBER_TSR20': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  'RUBBER1_MYSG': WORLD_BANK_CATEGORIES.AGRICULTURAL,
  
  // Metals
  'ALUMINUM': WORLD_BANK_CATEGORIES.METALS,
  'IRON_ORE': WORLD_BANK_CATEGORIES.METALS,
  'COPPER': WORLD_BANK_CATEGORIES.METALS,
  'LEAD': WORLD_BANK_CATEGORIES.METALS,
  'Tin': WORLD_BANK_CATEGORIES.METALS,
  'NICKEL': WORLD_BANK_CATEGORIES.METALS,
  'Zinc': WORLD_BANK_CATEGORIES.METALS,
  'GOLD': WORLD_BANK_CATEGORIES.METALS,
  'PLATINUM': WORLD_BANK_CATEGORIES.METALS,
  'SILVER': WORLD_BANK_CATEGORIES.METALS,
  
  // Fertilizers
  'PHOSROCK': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'DAP': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'DAP_FERTILIZER': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'DIAMMONIUM_PHOSPHATE': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'TSP': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'UREA_EE_BULK': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'UREA': WORLD_BANK_CATEGORIES.FERTILIZERS,
  'POTASH': WORLD_BANK_CATEGORIES.FERTILIZERS
};

// Mapping des noms d'affichage
const COMMODITY_DISPLAY_NAMES: Record<string, string> = {
  // Energy commodities
  'CRUDE_PETRO': 'Crude oil, average',
  'CRUDE_BRENT': 'Crude oil, Brent',
  'CRUDE_DUBAI': 'Crude oil, Dubai',
  'CRUDE_WTI': 'Crude oil, WTI',
  'COAL_AUS': 'Coal, Australian',
  'COAL_SAFRICA': 'Coal, South African',
  'NGAS_US': 'Natural gas, US',
  'NGAS_EUR': 'Natural gas, Europe',
  'NGAS_JP': 'Liquefied natural gas, Japan',
  'iNATGAS': 'Natural gas index',
  
  // Agricultural - Beverages
  'COCOA': 'Cocoa',
  'COFFEE_ARABIC': 'Coffee, Arabica',
  'COFFEE_ROBUS': 'Coffee, Robusta',
  'TEA_AVG': 'Tea, avg 3 auctions',
  'TEA_COLOMBO': 'Tea, Colombo',
  'TEA_KOLKATA': 'Tea, Kolkata',
  'TEA_MOMBASA': 'Tea, Mombasa',
  
  // Agricultural - Oils
  'COCONUT_OIL': 'Coconut oil',
  'GRNUT': 'Groundnuts',
  'FISH_MEAL': 'Fish meal',
  'GRNUT_OIL': 'Groundnut oil',
  'PALM_OIL': 'Palm oil',
  'PLMKRNL_OIL': 'Palm kernel oil',
  'SOYBEANS': 'Soybeans',
  'SOYBEAN_OIL': 'Soybean oil',
  'SOYBEAN_MEAL': 'Soybean meal',
  'RAPESEED_OIL': 'Rapeseed oil',
  'SUNFLOWER_OIL': 'Sunflower oil',
  
  // Agricultural - Grains
  'BARLEY': 'Barley',
  'MAIZE': 'Maize',
  'SORGHUM': 'Sorghum',
  'RICE_05': 'Rice, Thai 5%',
  'RICE_25': 'Rice, Thai 25%',
  'RICE_A1': 'Rice, Thai A.1',
  'RICE_05_VNM': 'Rice, Viet Namese 5%',
  'WHEAT_US_SRW': 'Wheat, US SRW',
  'WHEAT_US_HRW': 'Wheat, US HRW',
  
  // Agricultural - Other foods
  'BANANA_EU': 'Banana, Europe',
  'BANANA_US': 'Banana, US',
  'ORANGE': 'Orange',
  'BEEF': 'Beef',
  'CHICKEN': 'Chicken',
  'LAMB': 'Lamb',
  'SHRIMP_MEX': 'Shrimps, Mexican',
  'SUGAR_EU': 'Sugar, EU',
  'SUGAR_US': 'Sugar, US',
  'SUGAR_WLD': 'Sugar, world',
  'TOBAC_US': 'Tobacco, US import u.v.',
  
  // Agricultural - Raw materials
  'LOGS_CMR': 'Logs, Cameroon',
  'LOGS_MYS': 'Logs, Malaysian',
  'SAWNWD_CMR': 'Sawnwood, Cameroon',
  'SAWNWD_MYS': 'Sawnwood, Malaysian',
  'PLYWOOD': 'Plywood',
  'COTTON_A_INDX': 'Cotton, A Index',
  'RUBBER_TSR20': 'Rubber, TSR20',
  'RUBBER1_MYSG': 'Rubber, RSS3',
  
  // Fertilizers
  'PHOSROCK': 'Phosphate rock',
  'DAP': 'DAP',
  'DAP_FERTILIZER': 'DAP',
  'DIAMMONIUM_PHOSPHATE': 'DAP',
  'TSP': 'TSP',
  'UREA_EE_BULK': 'Urea',
  'UREA': 'Urea',
  'POTASH': 'Potassium chloride',
  
  // Metals
  'ALUMINUM': 'Aluminum',
  'IRON_ORE': 'Iron ore',
  'COPPER': 'Copper',
  'LEAD': 'Lead',
  'Tin': 'Tin',
  'NICKEL': 'Nickel',
  'Zinc': 'Zinc',
  'GOLD': 'Gold',
  'PLATINUM': 'Platinum',
  'SILVER': 'Silver'
};

// Cache pour les données World Bank
let cachedData: WorldBankData | null = null;

// Fonction pour obtenir la catégorie d'une commodité
function getCommodityCategory(symbol: string): string {
  return COMMODITY_CATEGORIES[symbol] || WORLD_BANK_CATEGORIES.OTHER;
}

// Fonction pour obtenir le nom d'affichage d'une commodité
function getCommodityDisplayName(symbol: string): string {
  return COMMODITY_DISPLAY_NAMES[symbol] || symbol;
}

// Fonction pour calculer les changements
function calculateChanges(commodity: WorldBankCommodity): WorldBankCommodity {
  if (commodity.data.length < 2) {
    return {
      ...commodity,
      currentValue: commodity.data[0]?.value || 0,
      change: 0,
      changePercent: 0
    };
  }

  const currentValue = commodity.data[commodity.data.length - 1].value;
  const previousValue = commodity.data[commodity.data.length - 2].value;
  
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

  return {
    ...commodity,
    currentValue,
    change,
    changePercent
  };
}

// Fonction pour parser les données Excel
function parseExcelData(arrayBuffer: ArrayBuffer): WorldBankCommodity[] {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!jsonData || jsonData.length < 2) {
      throw new Error('Invalid Excel file format');
    }

    // La première ligne contient les en-têtes
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as any[][];

    // Trouver l'index de la colonne "Commodity"
    const commodityIndex = headers.findIndex(header => 
      header && header.toLowerCase().includes('commodity')
    );

    if (commodityIndex === -1) {
      throw new Error('Commodity column not found');
    }

    // Créer un mapping des commodités
    const commoditiesMap = new Map<string, WorldBankCommodity>();

    dataRows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;

      const commodityName = row[commodityIndex];
      if (!commodityName || typeof commodityName !== 'string') return;

      // Nettoyer le nom de la commodité
      const cleanName = commodityName.trim();
      if (!cleanName) return;

      // Créer un ID unique
      const id = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Obtenir la catégorie
      const category = getCommodityCategory(id);
      const displayName = getCommodityDisplayName(id);

      // Initialiser la commodité si elle n'existe pas
      if (!commoditiesMap.has(id)) {
        commoditiesMap.set(id, {
          id,
          name: displayName,
          unit: 'USD/MT', // Unité par défaut
          symbol: cleanName,
          category,
          data: []
        });
      }

      const commodity = commoditiesMap.get(id)!;

      // Parcourir les colonnes pour extraire les données temporelles
      headers.forEach((header, colIndex) => {
        if (colIndex === commodityIndex) return; // Ignorer la colonne commodity
        
        const value = row[colIndex];
        if (value === null || value === undefined || value === '') return;

        // Essayer de parser la valeur comme un nombre
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) return;

        // Essayer de parser la date depuis l'en-tête
        let dateStr = header;
        if (typeof header === 'string') {
          // Formats de date courants
          const dateMatch = header.match(/(\d{4})/);
          if (dateMatch) {
            dateStr = dateMatch[1];
          }
        }

        // Ajouter les données temporelles
        commodity.data.push({
          date: dateStr,
          value: numericValue
        });
      });
    });

    // Convertir en array et calculer les changements
    const commodities: WorldBankCommodity[] = Array.from(commoditiesMap.values())
      .map(commodity => calculateChanges(commodity))
      .filter(commodity => commodity.data.length > 0);

    console.log(`Parsed ${commodities.length} commodities from Excel file`);
    return commodities;

  } catch (error) {
    console.error('Error parsing Excel data:', error);
    throw new Error('Failed to parse Excel file: ' + error.message);
  }
}

// Fonction pour créer des données par défaut
function createDefaultData(): WorldBankCommodity[] {
  const defaultCommodities: WorldBankCommodity[] = [
    {
      id: 'crude_oil',
      name: 'Crude oil, average',
      unit: 'USD/barrel',
      symbol: 'CRUDE_OIL',
      category: WORLD_BANK_CATEGORIES.ENERGY,
      data: [
        { date: '2020-01', value: 60.0 },
        { date: '2020-06', value: 40.0 },
        { date: '2021-01', value: 50.0 },
        { date: '2021-06', value: 70.0 },
        { date: '2022-01', value: 80.0 },
        { date: '2022-06', value: 100.0 },
        { date: '2023-01', value: 75.0 },
        { date: '2023-06', value: 85.0 },
        { date: '2024-01', value: 90.0 }
      ],
      currentValue: 90.0,
      change: 5.0,
      changePercent: 5.88
    },
    {
      id: 'gold',
      name: 'Gold',
      unit: 'USD/troy oz',
      symbol: 'GOLD',
      category: WORLD_BANK_CATEGORIES.METALS,
      data: [
        { date: '2020-01', value: 1600.0 },
        { date: '2020-06', value: 1700.0 },
        { date: '2021-01', value: 1800.0 },
        { date: '2021-06', value: 1900.0 },
        { date: '2022-01', value: 2000.0 },
        { date: '2022-06', value: 2100.0 },
        { date: '2023-01', value: 1950.0 },
        { date: '2023-06', value: 2050.0 },
        { date: '2024-01', value: 2100.0 }
      ],
      currentValue: 2100.0,
      change: 50.0,
      changePercent: 2.44
    },
    {
      id: 'wheat',
      name: 'Wheat, US HRW',
      unit: 'USD/MT',
      symbol: 'WHEAT_US_HRW',
      category: WORLD_BANK_CATEGORIES.AGRICULTURAL,
      data: [
        { date: '2020-01', value: 200.0 },
        { date: '2020-06', value: 180.0 },
        { date: '2021-01', value: 220.0 },
        { date: '2021-06', value: 250.0 },
        { date: '2022-01', value: 300.0 },
        { date: '2022-06', value: 350.0 },
        { date: '2023-01', value: 280.0 },
        { date: '2023-06', value: 320.0 },
        { date: '2024-01', value: 340.0 }
      ],
      currentValue: 340.0,
      change: 20.0,
      changePercent: 6.25
    }
  ];

  return defaultCommodities.map(commodity => calculateChanges(commodity));
}

// Fonction pour importer un fichier World Bank Pink Sheet
export async function importWorldBankPinkSheet(file: File): Promise<WorldBankData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const commodities = parseExcelData(arrayBuffer);
    
    const result: WorldBankData = {
      commodities,
      lastUpdated: new Date(),
      fileName: file.name,
      isDefault: false
    };

    // Sauvegarder dans le cache
    cachedData = result;
    localStorage.setItem('world_bank_data', JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('Error importing World Bank data:', error);
    throw error;
  }
}

// Fonction pour récupérer les données World Bank
export async function fetchWorldBankData(): Promise<WorldBankData> {
  try {
    // Vérifier le cache local
    const cached = localStorage.getItem('world_bank_data');
    if (cached) {
      const parsedData = JSON.parse(cached);
      cachedData = {
        ...parsedData,
        lastUpdated: new Date(parsedData.lastUpdated)
      };
      return cachedData;
    }

    // Si pas de cache, utiliser les données par défaut
    const defaultCommodities = createDefaultData();
    
    const result: WorldBankData = {
      commodities: defaultCommodities,
      lastUpdated: new Date(),
      fileName: 'Default Data',
      isDefault: true
    };

    // Sauvegarder dans le cache
    cachedData = result;
    localStorage.setItem('world_bank_data', JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('Error fetching World Bank data:', error);
    throw error;
  }
}

// Fonction pour récupérer les données par catégorie
export async function fetchWorldBankDataByCategory(category: string): Promise<WorldBankCommodity[]> {
  const data = await fetchWorldBankData();
  return data.commodities.filter(commodity => commodity.category === category);
}

// Fonction pour obtenir les catégories disponibles
export function getWorldBankCategories(): string[] {
  return Object.values(WORLD_BANK_CATEGORIES);
}

// Fonction pour vérifier si des données existent
export function hasWorldBankData(): boolean {
  return cachedData !== null || localStorage.getItem('world_bank_data') !== null;
}

// Fonction pour obtenir les données actuelles
export function getCurrentWorldBankData(): WorldBankData | null {
  return cachedData;
}

// Fonction pour effacer les données
export function clearWorldBankData(): void {
  cachedData = null;
  localStorage.removeItem('world_bank_data');
}

// Fonction pour rafraîchir les données
export async function refreshWorldBankData(): Promise<WorldBankData> {
  clearWorldBankData();
  return fetchWorldBankData();
}
