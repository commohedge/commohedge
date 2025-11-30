import { toast } from "sonner";
import { parse } from "node-html-parser";
import { scrapeTradingViewSymbol, scrapeTradingViewCategory, scrapeShipAndBunker, scrapeShipAndBunkerEMEA } from './puppeteerApi';

// Cache interface
interface CacheData {
  data: any[];
  timestamp: number;
  lastUpdated: string;
}

// Cache storage
const CACHE_PREFIX = 'fx_commodities_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// List of available commodity types
export type CommodityCategory = 'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker';

// List of freight symbols with their information
const FREIGHT_SYMBOLS = [
  // Container Freight
  { symbol: 'CS61!', name: 'Container Freight (China/East Asia to Mediterranean) (FBX13) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS31!', name: 'Container Freight (China/East Asia to US East Coast) (FBX03) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS51!', name: 'Container Freight (North Europe to China/East Asia) (FBX12) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS11!', name: 'Container Freight (China/East Asia to US West Coast) (FBX01) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS21!', name: 'Container Freight (US West Coast to China/East Asia) (FBX02) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS41!', name: 'Container Freight (China/East Asia to North Europe) (FBX11) (Baltic) Futures', type: 'container' as const },
  
  // Freight Routes
  { symbol: 'TM1!', name: 'Freight Route TC2 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TD81!', name: 'Freight Route TD8 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TC71!', name: 'Freight Route TC7 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TC61!', name: 'Freight Route TC6 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TH1!', name: 'Freight Route TC5 (Platts) Futures', type: 'freight_route' as const },
  { symbol: 'TK1!', name: 'Freight Route TD7 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TL1!', name: 'Freight Route TD3C (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'AEB1!', name: 'Freight Route TD25 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'T2D1!', name: 'Freight Route TD20 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'T7C1!', name: 'Freight Route TC17 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TD31!', name: 'Freight Route TD3C (Platts) Futures', type: 'freight_route' as const },
  { symbol: 'TDM1!', name: 'Freight Route TD19 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'FRS1!', name: 'Freight Route TC12 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'T5C1!', name: 'Freight Route TC15 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'ACB1!', name: 'Freight Route TD22 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'FRC1!', name: 'Freight Route TC14 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'T8C1!', name: 'Freight Route TC18 (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TC11!', name: 'Freight Route South Korea to Singapore (TC11) (Baltic) Futures', type: 'freight_route' as const },
  { symbol: 'TF21!', name: 'Freight Route Middle East to UK Continent (TC20) (Baltic) Futures', type: 'freight_route' as const },
  
  // LNG Freight
  { symbol: 'BG11!', name: 'LNG Freight Australia to Japan (BLNG1-174)', type: 'lng_freight' as const },
  { symbol: 'BG31!', name: 'LNG Freight US Gulf to Japan (BLNG3-174)', type: 'lng_freight' as const },
  { symbol: 'BG21!', name: 'LNG Freight US Gulf to Continent (BLNG2-174)', type: 'lng_freight' as const },
  { symbol: 'BL11!', name: 'LNG Freight Route BLNG1g (LNG Fuel) (Baltic) Futures', type: 'lng_freight' as const },
  { symbol: 'BL21!', name: 'LNG Freight Route BLNG2g (LNG Fuel) (Baltic) Futures', type: 'lng_freight' as const },
  { symbol: 'BL31!', name: 'LNG Freight Route BLNG3g (LNG Fuel) (Baltic) Futures', type: 'lng_freight' as const },
  
  // Dirty Freight
  { symbol: 'USC1!', name: 'USGC to China (Platts) Dirty Freight Futures', type: 'dirty_freight' as const },
  { symbol: 'USE1!', name: 'USGC to UK Continent (Platts) Dirty Freight Futures', type: 'dirty_freight' as const },
  { symbol: 'XUK1!', name: 'Cross North Sea Dirty Freight 80kt (Platts) Futures', type: 'dirty_freight' as const },
  
  // Liquid Petroleum Gas Freight
  { symbol: 'FLJ1!', name: 'Freight Route Liquid Petroleum Gas (BLPG3) (Baltic) Futures', type: 'lng_freight' as const },
  { symbol: 'FLP1!', name: 'Freight Route Liquid Petroleum Gas (BLPG1) (Baltic) Futures', type: 'lng_freight' as const }
];

// Interfaces for commodity data
export interface Commodity {
  symbol: string;
  name: string;
  price: number;
  percentChange: number;
  absoluteChange: number;
  high: number;
  low: number;
  technicalEvaluation: string;
  type: 'gold' | 'silver' | 'copper' | 'aluminum' | 'cobalt' | 'other' | 
        'corn' | 'wheat' | 'soybean' | 'cotton' | 'sugar' | 'cocoa' | 'coffee' | 'cattle' | 
        'crude' | 'gasoline' | 'heating_oil' | 'natural_gas' | 'ethanol' | 'coal' |
        'container' | 'freight_route' | 'lng_freight' | 'dirty_freight' |
        'vlsfo' | 'mgo' | 'ifo380';
  category: CommodityCategory;
  unit?: string; // Unit of measure (e.g., "OZ", "BBL", "MT", "BU", "LB", "MMBTU", "GAL", "CWT")
}

// Function to get cache key for a category
function getCacheKey(category: CommodityCategory): string {
  return `${CACHE_PREFIX}${category}`;
}

// Normalize symbols that include trailing name after '!'
function normalizeCommoditySymbols(commodities: any[]): any[] {
  return (commodities || []).map((item) => {
    if (item && typeof item.symbol === 'string' && item.symbol.includes('!')) {
      const match = item.symbol.match(/^(.*?!)(.+)$/);
      if (match) {
        const fixedSymbol = match[1].trim();
        const trailingName = match[2].trim();
        const fixedName = trailingName ? `${trailingName} ${item.name || ''}`.trim() : (item.name || '');
        return { ...item, symbol: fixedSymbol, name: fixedName };
      }
    }
    return item;
  });
}

// Function to save data to localStorage
function saveToCache(category: CommodityCategory, data: any[]): void {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(getCacheKey(category), JSON.stringify(cacheData));
    console.log(`Data cached for ${category}: ${data.length} items`);
  } catch (error) {
    console.error(`Error saving cache for ${category}:`, error);
  }
}

// Function to load data from localStorage
function loadFromCache(category: CommodityCategory): any[] | null {
  try {
    const cached = localStorage.getItem(getCacheKey(category));
    if (!cached) {
      console.log(`No cache found for ${category}`);
      return null;
    }

    const cacheData: CacheData = JSON.parse(cached);
    const now = Date.now();
    const isExpired = (now - cacheData.timestamp) > CACHE_DURATION;

    if (isExpired) {
      console.log(`Cache expired for ${category}, removing...`);
      localStorage.removeItem(getCacheKey(category));
      return null;
    }

    console.log(`Loading cached data for ${category}: ${cacheData.data.length} items (${Math.round((now - cacheData.timestamp) / (1000 * 60 * 60))} hours old)`);
    return cacheData.data;
  } catch (error) {
    console.error(`Error loading cache for ${category}:`, error);
    return null;
  }
}

// Function to clear cache for a specific category
export function clearCache(category: CommodityCategory): void {
  try {
    localStorage.removeItem(getCacheKey(category));
    console.log(`Cache cleared for ${category}`);
  } catch (error) {
    console.error(`Error clearing cache for ${category}:`, error);
  }
}

// Function to clear all cache
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('All cache cleared');
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

// Function to get cache info
export function getCacheInfo(): { [key in CommodityCategory]?: { lastUpdated: string; itemCount: number; isExpired: boolean } } {
  const info: { [key in CommodityCategory]?: { lastUpdated: string; itemCount: number; isExpired: boolean } } = {};
  
  const categories: CommodityCategory[] = ['metals', 'agricultural', 'energy', 'freight', 'bunker'];
  
  categories.forEach(category => {
    try {
      const cached = localStorage.getItem(getCacheKey(category));
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        const now = Date.now();
        const isExpired = (now - cacheData.timestamp) > CACHE_DURATION;
        
        info[category] = {
          lastUpdated: cacheData.lastUpdated,
          itemCount: cacheData.data.length,
          isExpired
        };
      }
    } catch (error) {
      console.error(`Error getting cache info for ${category}:`, error);
    }
  });
  
  return info;
}

/**
 * Determines the type of commodity from symbol or name
 */
function getCommodityType(symbol: string, name: string, category: CommodityCategory): Commodity['type'] {
  const lowerSymbol = symbol.toLowerCase();
  const lowerName = name.toLowerCase();
  
  // Metals
  if (category === 'metals') {
    if (lowerSymbol.includes('au') || lowerName.includes('gold') || lowerName.includes('or')) {
      return 'gold';
    } else if (lowerSymbol.includes('ag') || lowerName.includes('silver') || lowerName.includes('argent')) {
      return 'silver';
    } else if (lowerSymbol.includes('cu') || lowerName.includes('copper') || lowerName.includes('cuivre')) {
      return 'copper';
    } else if (lowerSymbol.includes('al') || lowerName.includes('alum')) {
      return 'aluminum';
    } else if (lowerSymbol.includes('co') || lowerName.includes('cobalt')) {
      return 'cobalt';
    }
  } 
  // Agricultural
  else if (category === 'agricultural') {
    if (lowerSymbol.includes('zc') || lowerName.includes('corn') || lowerName.includes('maïs')) {
      return 'corn';
    } else if (lowerSymbol.includes('zw') || lowerName.includes('wheat') || lowerName.includes('blé')) {
      return 'wheat';
    } else if (lowerSymbol.includes('zs') || lowerName.includes('soybean') || lowerName.includes('soja')) {
      return 'soybean';
    } else if (lowerSymbol.includes('ct') || lowerName.includes('cotton') || lowerName.includes('coton')) {
      return 'cotton';
    } else if (lowerSymbol.includes('sb') || lowerName.includes('sugar') || lowerName.includes('sucre')) {
      return 'sugar';
    } else if (lowerSymbol.includes('cc') || lowerName.includes('cocoa') || lowerName.includes('cacao')) {
      return 'cocoa';
    } else if (lowerSymbol.includes('kc') || lowerName.includes('coffee') || lowerName.includes('café')) {
      return 'coffee';
    } else if (lowerSymbol.includes('le') || lowerName.includes('cattle') || lowerName.includes('bétail')) {
      return 'cattle';
    }
  } 
  // Energy
  else if (category === 'energy') {
    if (lowerSymbol.includes('cl') || lowerName.includes('crude') || lowerName.includes('oil') || lowerName.includes('pétrole')) {
      return 'crude';
    } else if (lowerSymbol.includes('rb') || lowerName.includes('gasoline') || lowerName.includes('essence')) {
      return 'gasoline';
    } else if (lowerSymbol.includes('ho') || lowerName.includes('heating oil') || lowerName.includes('fioul')) {
      return 'heating_oil';
    } else if (lowerSymbol.includes('ng') || lowerName.includes('natural gas') || lowerName.includes('gaz')) {
      return 'natural_gas';
    } else if (lowerSymbol.includes('eth') || lowerName.includes('ethanol')) {
      return 'ethanol';
    } else if (lowerSymbol.includes('mtf') || lowerName.includes('coal') || lowerName.includes('charbon')) {
      return 'coal';
    }
  }
  
  return 'other';
}

/**
 * Infers unit of measure from commodity symbol, name, category, and type
 */
function inferUnitFromCommodity(symbol: string, name: string, category: CommodityCategory, type: Commodity['type']): string {
  const symbolLower = symbol.toLowerCase();
  const nameLower = name.toLowerCase();
  
  // Energy commodities
  if (category === 'energy') {
    if (symbolLower.includes('wti') || symbolLower.includes('brent') || symbolLower.includes('cl') || 
        nameLower.includes('crude') || nameLower.includes('oil')) {
      return 'BBL';
    }
    if (symbolLower.includes('ng') || symbolLower.includes('natgas') || nameLower.includes('natural gas')) {
      return 'MMBTU';
    }
    if (symbolLower.includes('ho') || nameLower.includes('heating oil') || nameLower.includes('heating')) {
      return 'GAL';
    }
    if (symbolLower.includes('rb') || symbolLower.includes('rbob') || nameLower.includes('gasoline')) {
      return 'GAL';
    }
  }
  
  // Metals
  if (category === 'metals') {
    if (type === 'gold' || symbolLower.includes('au') || symbolLower.includes('gc') || nameLower.includes('gold')) {
      return 'OZ';
    }
    if (type === 'silver' || symbolLower.includes('ag') || symbolLower.includes('si') || nameLower.includes('silver')) {
      return 'OZ';
    }
    if (type === 'platinum' || symbolLower.includes('pl') || nameLower.includes('platinum')) {
      return 'OZ';
    }
    if (type === 'palladium' || symbolLower.includes('pa') || nameLower.includes('palladium')) {
      return 'OZ';
    }
    if (type === 'copper' || symbolLower.includes('cu') || symbolLower.includes('hg') || nameLower.includes('copper')) {
      return 'LB';
    }
    if (type === 'aluminum' || symbolLower.includes('al') || nameLower.includes('aluminum') || nameLower.includes('aluminium')) {
      return 'MT';
    }
    if (symbolLower.includes('zn') || nameLower.includes('zinc')) {
      return 'MT';
    }
    if (symbolLower.includes('ni') || nameLower.includes('nickel')) {
      return 'MT';
    }
  }
  
  // Agricultural
  if (category === 'agricultural') {
    if (type === 'corn' || symbolLower.includes('zc') || nameLower.includes('corn')) {
      return 'BU';
    }
    if (type === 'wheat' || symbolLower.includes('zw') || nameLower.includes('wheat')) {
      return 'BU';
    }
    if (type === 'soybean' || symbolLower.includes('zs') || nameLower.includes('soybean') || nameLower.includes('soy')) {
      return 'BU';
    }
    if (type === 'coffee' || symbolLower.includes('kc') || nameLower.includes('coffee')) {
      return 'LB';
    }
    if (type === 'sugar' || symbolLower.includes('sb') || nameLower.includes('sugar')) {
      return 'LB';
    }
    if (type === 'cotton' || symbolLower.includes('ct') || nameLower.includes('cotton')) {
      return 'LB';
    }
    if (type === 'cocoa' || symbolLower.includes('cc') || nameLower.includes('cocoa')) {
      return 'MT';
    }
  }
  
  // Livestock (if added to category)
  if (type === 'cattle' || symbolLower.includes('le') || nameLower.includes('cattle')) {
    return 'CWT';
  }
  if (symbolLower.includes('he') || nameLower.includes('hog')) {
    return 'CWT';
  }
  
  // Freight and Bunker
  if (category === 'freight' || category === 'bunker') {
    return 'MT';
  }
  
  // Default
  return '';
}

/**
 * Parses HTML data to extract commodity information
 */
function parseCommoditiesData(data: any, category: CommodityCategory): Commodity[] {
  try {
    console.log(`Parsing data for ${category} from API response`);
    
    // Check if we have data
    if (!data || !data.data) {
      console.error("Invalid data received from API");
      throw new Error("Invalid data received from API");
    }
    
    // Parse HTML
    const htmlContent = data.data;
    console.log("HTML content length:", htmlContent.length);
    
    // Use node-html-parser to analyze HTML
    const root = parse(htmlContent);
    
    // Try different selections to find data
    let commodityRows = root.querySelectorAll('.tv-data-table__row');
    console.log("Data table rows found:", commodityRows.length);
    
    if (!commodityRows || commodityRows.length === 0) {
      commodityRows = root.querySelectorAll('tr[data-rowid]');
      console.log("Row data found with tr[data-rowid]:", commodityRows.length);
    }

    if (!commodityRows || commodityRows.length === 0) {
      commodityRows = root.querySelectorAll('table tr');
      console.log("Generic table rows found:", commodityRows.length);
    }
    
    if (!commodityRows || commodityRows.length === 0) {
      console.error("No commodity rows found in HTML");
      throw new Error("Failed to extract data");
    }
    
    const commodities: Commodity[] = [];
    
    commodityRows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll('td');
        
        if (!cells || cells.length < 6) {
          return; // Incomplete row, skip
        }
        
        // Extract symbol and name
        const firstCell = cells[0];
        let symbol = '';
        let name = '';
        
        const symbolElement = firstCell.querySelector('.symbol-name');
        if (symbolElement) {
          symbol = symbolElement.text.trim();
          name = symbolElement.getAttribute('title') || '';
        } else {
          const allText = firstCell.text.trim();
          const parts = allText.split(/\s+/);
          symbol = parts[0] || '';
          name = parts.slice(1).join(' ');
        }
        
        // Some TradingView tables concatenate the display name directly after the symbol
        // (e.g. "AG1!Silver", "AL1!Aluminum"). In that case, the true symbol is the
        // segment up to and including the last '!', and the remainder belongs to the name.
        if (symbol && symbol.includes('!')) {
          const concatMatch = symbol.match(/^(.*?!)(.+)$/);
          if (concatMatch) {
            const extractedSymbol = concatMatch[1].trim();
            const trailingName = concatMatch[2].trim();
            
            // Update symbol and augment name accordingly
            symbol = extractedSymbol;
            if (trailingName) {
              name = name ? `${trailingName} ${name}`.trim() : trailingName;
            }
          }
        }
        
        if (!symbol) {
          return;
        }
        
        // Parse number function
        const parseNumber = (text: string): number => {
          if (!text) return 0;
          let cleanText = text.replace(/[^\d.,-]/g, '');
          
          if (cleanText.includes(',') && cleanText.includes('.')) {
            const lastDotIndex = cleanText.lastIndexOf('.');
            const lastCommaIndex = cleanText.lastIndexOf(',');
            
            if (lastDotIndex > lastCommaIndex) {
              cleanText = cleanText.replace(/,/g, '');
            } else {
              cleanText = cleanText.replace(/\./g, '').replace(',', '.');
            }
          } else if (cleanText.includes(',')) {
            const parts = cleanText.split(',');
            if (parts.length === 2 && parts[1].length === 3) {
              cleanText = cleanText.replace(/,/g, '');
            } else {
              cleanText = cleanText.replace(',', '.');
            }
          }
          
          return parseFloat(cleanText) || 0;
        };
        
        const price = parseNumber(cells[1]?.text.trim());
        
        // Check for negative class indicators
        const percentCell = cells[2];
        const isPercentNegative = percentCell.toString().includes('negative') || 
                                 percentCell.toString().includes('down') || 
                                 percentCell.toString().includes('red');
        let percentChange = parseNumber(percentCell?.text.trim());
        if (isPercentNegative && percentChange > 0) {
          percentChange = -percentChange;
        }
        
        const changeCell = cells[3];
        const isChangeNegative = changeCell.toString().includes('negative') || 
                               changeCell.toString().includes('down') || 
                               changeCell.toString().includes('red');
        let absoluteChange = parseNumber(changeCell?.text.trim());
        if (isChangeNegative && absoluteChange > 0) {
          absoluteChange = -absoluteChange;
        }
        
        const high = parseNumber(cells[4]?.text.trim());
        const low = parseNumber(cells[5]?.text.trim());
        const technicalEvaluation = cells[6]?.text.trim() || 'Neutral';
        
        const type = getCommodityType(symbol, name, category);
        
        // Extract unit of measure from name or price cell
        let unit = '';
        const nameLower = name.toLowerCase();
        const priceCellText = cells[1]?.text.trim() || '';
        
        // Try to extract unit from price cell (e.g., "USD / OZ", "USD / BBL", "$/BBL")
        const unitMatch = priceCellText.match(/\/(\s*)?([A-Z]{2,5}|OZ|BBL|MT|BU|LB|MMBTU|GAL|CWT|MMBtu|MMBTU|MMBtu|MMBTU|APZ|TROY\s*OZ)/i);
        if (unitMatch) {
          let extractedUnit = unitMatch[2].toUpperCase().trim();
          // Normalize common variations
          if (extractedUnit === 'APZ' || extractedUnit.includes('TROY')) {
            unit = 'OZ';
          } else if (extractedUnit.includes('MMBTU') || extractedUnit.includes('MMBTU')) {
            unit = 'MMBTU';
          } else {
            unit = extractedUnit;
          }
        } else {
          // Try to extract from name
          const unitPatterns = [
            /\b(OZ|OUNCE|OUNCES|APZ|TROY\s*OZ|TROY\s*OUNCE)\b/i,
            /\b(BBL|BARREL|BARRELS)\b/i,
            /\b(MT|METRIC\s*TON|TONS?)\b/i,
            /\b(BU|BUSHEL|BUSHELS)\b/i,
            /\b(LB|POUND|POUNDS)\b/i,
            /\b(MMBTU|MMBtu|BTU)\b/i,
            /\b(GAL|GALLON|GALLONS)\b/i,
            /\b(CWT|HUNDREDWEIGHT)\b/i,
            /\b(KG|KILOGRAM|KILOGRAMS)\b/i
          ];
          
          for (const pattern of unitPatterns) {
            const match = name.match(pattern);
            if (match) {
              const matchedUnit = match[1].toUpperCase();
              // Normalize units
              if (matchedUnit.includes('OUNCE') || matchedUnit.includes('OZ') || matchedUnit === 'APZ' || matchedUnit.includes('TROY')) {
                unit = 'OZ';
              } else if (matchedUnit.includes('BARREL') || matchedUnit === 'BBL') {
                unit = 'BBL';
              } else if (matchedUnit.includes('TON') || matchedUnit === 'MT') {
                unit = 'MT';
              } else if (matchedUnit.includes('BUSHEL') || matchedUnit === 'BU') {
                unit = 'BU';
              } else if (matchedUnit.includes('POUND') || matchedUnit === 'LB') {
                unit = 'LB';
              } else if (matchedUnit.includes('BTU') || matchedUnit.includes('MMBTU')) {
                unit = 'MMBTU';
              } else if (matchedUnit.includes('GALLON') || matchedUnit === 'GAL') {
                unit = 'GAL';
              } else if (matchedUnit.includes('HUNDREDWEIGHT') || matchedUnit === 'CWT') {
                unit = 'CWT';
              } else {
                unit = matchedUnit;
              }
              break;
            }
          }
        }
        
        // Fallback: infer unit from commodity type/category if not found
        if (!unit) {
          unit = inferUnitFromCommodity(symbol, name, category, type);
        }
        
        commodities.push({
          symbol,
          name,
          price,
          percentChange,
          absoluteChange,
          high,
          low,
          technicalEvaluation,
          type,
          category,
          unit: unit || undefined
        });
        
      } catch (err) {
        console.error(`Error parsing row ${index}:`, err);
      }
    });
    
    if (commodities.length === 0) {
      console.error("No commodities could be extracted");
      throw new Error("No commodities could be extracted");
    }
    
    console.log(`Successfully extracted ${commodities.length} commodities for ${category}`);
    return commodities;
  } catch (error) {
    console.error('Error parsing data:', error);
    throw error;
  }
}

/**
 * Fetches commodity data from TradingView for a specific category
 * Uses cache by default, but can be forced to refresh
 */
export async function fetchCommoditiesData(category: CommodityCategory = 'metals', forceRefresh: boolean = false): Promise<Commodity[]> {
  try {
    console.log(`Fetching data for ${category} from TradingView...`);
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = loadFromCache(category);
      if (cachedData) {
        const normalized = normalizeCommoditySymbols(cachedData);
        // If normalization changed any entry, update cache silently
        try { saveToCache(category, normalized); } catch {}
        console.log(`Returning cached data for ${category}: ${normalized.length} items`);
        return normalized as any;
      }
    } else {
      console.log(`Force refresh requested for ${category}, ignoring cache`);
    }

    // Special handling for freight
    if (category === 'freight') {
      // Try to fetch from category page first (less likely to be blocked)
      try {
        console.log('Attempting to fetch freight data from TradingView category page...');
        const categoryData = await scrapeTradingViewCategory('freight');
        const parsedCommodities = normalizeCommoditySymbols(parseCommoditiesData(categoryData, category));
        
        // Filter to only freight-related symbols
        const freightFromCategory = parsedCommodities.filter(c => 
          c.symbol.includes('CS') || 
          c.symbol.includes('TM') || 
          c.symbol.includes('TD') || 
          c.symbol.includes('TC') || 
          c.symbol.includes('BG') || 
          c.symbol.includes('BL') || 
          c.symbol.includes('USC') || 
          c.symbol.includes('USE') || 
          c.symbol.includes('XUK') || 
          c.symbol.includes('FLJ') || 
          c.symbol.includes('FLP') ||
          c.name.toLowerCase().includes('freight') ||
          c.name.toLowerCase().includes('container')
        );
        
        if (freightFromCategory.length > 0) {
          console.log(`Successfully fetched ${freightFromCategory.length} freight commodities from category page`);
          saveToCache(category, freightFromCategory);
          return freightFromCategory;
        }
      } catch (error) {
        console.warn('Failed to fetch freight from category page, trying individual symbols:', error);
      }
      
      // Fallback to individual symbol pages (with increased delays)
      const freightData = await fetchFreightData();
      saveToCache(category, freightData);
      return freightData;
    }
    
    // Special handling for bunker
    if (category === 'bunker') {
      const bunkerData = await fetchBunkerData();
      saveToCache(category, bunkerData);
      return bunkerData;
    }

    // For other categories, use Puppeteer scraping
    const data = await scrapeTradingViewCategory(category);
    console.log("Raw scraping response:", data);
    
    // Parse the HTML retrieved to extract commodity data
    const commodities = normalizeCommoditySymbols(parseCommoditiesData(data, category));
    saveToCache(category, commodities);
    return commodities;
  } catch (error) {
    console.error(`Error fetching ${category} data:`, error);
    toast.error(`Error fetching ${category} data`);
    throw error;
  }
}

/**
 * Forces a refresh of commodity data for a specific category (ignores cache)
 */
export async function refreshCommoditiesData(category: CommodityCategory = 'metals'): Promise<Commodity[]> {
  return fetchCommoditiesData(category, true);
}

/**
 * Retrieves data for a specific freight symbol from TradingView
 */
async function fetchFreightSymbolData(symbol: string, name: string, type: Commodity['type']): Promise<Commodity | null> {
  try {
    const data = await scrapeTradingViewSymbol(symbol);
    
    if (!data || !data.data) {
      console.warn(`No data received for ${symbol}`);
      return null;
    }

    // Parse the HTML to extract data
    const htmlContent = data.data;
    const root = parse(htmlContent);
    
    // Check for CAPTCHA or protection page
    const captchaCheck = root.querySelector('[class*="captcha"], [id*="captcha"], [class*="challenge"], [id*="challenge"]');
    if (captchaCheck || htmlContent.includes('Complete the test below') || htmlContent.includes('Just one more step')) {
      console.warn(`CAPTCHA or protection page detected for ${symbol}`);
      return null;
    }
    
    // Extract the main price
    let price = 0;
    let percentChange = 0;
    let absoluteChange = 0;
    let high = 0;
    let low = 0;
    
    // Try to extract from JSON embedded data first (most reliable)
    try {
      // Look for JSON-LD or script tags with symbol data
      const jsonScripts = root.querySelectorAll('script[type="application/json"], script[id*="__NEXT_DATA__"], script[id*="__TV_DATA__"]');
      for (const script of jsonScripts) {
        try {
          const jsonData = JSON.parse(script.text);
          // Navigate through possible JSON structures
          const priceData = jsonData?.props?.pageProps?.symbol || 
                           jsonData?.symbol || 
                           jsonData?.data?.symbol ||
                           jsonData?.quotes?.[0];
          
          if (priceData?.price || priceData?.last_price) {
            price = priceData.price || priceData.last_price || 0;
            percentChange = priceData.change_percent || priceData.changePercent || priceData.percentChange || 0;
            absoluteChange = priceData.change || priceData.changeAbsolute || priceData.absoluteChange || 0;
            high = priceData.high || priceData.sessionHigh || 0;
            low = priceData.low || priceData.sessionLow || 0;
            
            if (price > 0) {
              console.log(`Extracted price from JSON for ${symbol}: ${price}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next script or fallback
        }
      }
    } catch (e) {
      console.log(`JSON extraction failed for ${symbol}, trying HTML selectors`);
    }
    
    // Search for price elements in different possible selectors (updated selectors)
    if (price === 0) {
      const priceSelectors = [
        '.tv-symbol-price-quote__value',
        '[data-field="last_price"]',
        '[data-field="price"]',
        '.js-symbol-last',
        '.tv-symbol-header__price',
        '[class*="price-quote"]',
        '[class*="last-price"]',
        '[class*="symbol-price"]',
        '.tv-symbol-price-quote__value',
        'span[data-symbol-price]',
        '[data-field="last_price"]',
        '.tv-symbol-price-quote__value.js-symbol-last',
        // New TradingView selectors
        '[class*="tv-symbol-price"]',
        '[class*="price-value"]',
        '[data-field="last"]',
        // Generic price selectors
        '[class*="price"]'
      ];
      
      for (const selector of priceSelectors) {
        const priceElements = root.querySelectorAll(selector);
        for (const priceElement of priceElements) {
          const rawPriceText = priceElement.text.trim();
          if (!rawPriceText || rawPriceText.length === 0) continue;
          
          console.log(`Raw price text for ${symbol} (${selector}): "${rawPriceText}"`);
          
          // Parse prices correctly for TradingView format
          let priceText = rawPriceText;
          
          // Remove units and spaces
          priceText = priceText.replace(/\s*(USD|usd|$|€|EUR|eur|MMBtu|BBL|MT|OZ|LB|BU|GAL)\s*/gi, '');
          
          // Remove all non-numeric characters except commas, dots, and minus
          priceText = priceText.replace(/[^\d.,-]/g, '');
          
          // Handle TradingView number format
          if (priceText.includes(',') && priceText.includes('.')) {
            const lastDotIndex = priceText.lastIndexOf('.');
            const lastCommaIndex = priceText.lastIndexOf(',');
            
            if (lastDotIndex > lastCommaIndex) {
              priceText = priceText.replace(/,/g, '');
            } else {
              priceText = priceText.replace(/\./g, '').replace(/,([^,]*)$/, '.$1');
            }
          } else if (priceText.includes(',') && !priceText.includes('.')) {
            const parts = priceText.split(',');
            if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
              priceText = priceText.replace(/,/g, '');
            } else if (parts.length === 2 && parts[1].length <= 4) {
              priceText = priceText.replace(',', '.');
            } else {
              priceText = priceText.replace(/,/g, '');
            }
          }
          
          console.log(`Processed price text for ${symbol}: "${priceText}"`);
          const parsedPrice = parseFloat(priceText) || 0;
          
          if (parsedPrice > 0) {
            price = parsedPrice;
            console.log(`Successfully parsed price for ${symbol}: ${price}`);
            break;
          }
        }
        if (price > 0) break;
      }
    }
    
    // Try to extract change and percent change
    if (price > 0 && (percentChange === 0 || absoluteChange === 0)) {
      const changeSelectors = [
        '[data-field="change"]',
        '[data-field="change_percent"]',
        '[class*="change"]',
        '[class*="percent"]',
        '.tv-symbol-price-quote__change'
      ];
      
      for (const selector of changeSelectors) {
        const changeElements = root.querySelectorAll(selector);
        for (const changeElement of changeElements) {
          const changeText = changeElement.text.trim();
          const changeMatch = changeText.match(/([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)/);
          if (changeMatch) {
            absoluteChange = parseFloat(changeMatch[1]) || 0;
            percentChange = parseFloat(changeMatch[2]) || 0;
            break;
          }
        }
        if (percentChange !== 0 || absoluteChange !== 0) break;
      }
    }
    
    // If no price found, search in general content with improved patterns
    if (price === 0) {
      const pricePatterns = [
        /(?:last|price|close)[\s:]*([+-]?\d{1,3}(?:,\d{3})*\.\d{1,4})/i,
        /(?:last|price|close)[\s:]*([+-]?\d+\.\d{1,4})/i,
        /(\d+\.\d{1,4})\s*(?:USD|usd|$)/i,
        /(\d{1,3}(?:,\d{3})*\.\d{1,4})\s*(?:USD|usd|$)/i,
        /(\d{1,3}(?:,\d{3})+)\s*(?:USD|usd|$)/i,
        /(\d+)\s*(?:USD|usd|$)/i,
        /"price":\s*(\d+\.?\d*)/i,
        /"last_price":\s*(\d+\.?\d*)/i,
        /"lastPrice":\s*(\d+\.?\d*)/i
      ];
      
      for (const pattern of pricePatterns) {
        const priceMatch = htmlContent.match(pattern);
        if (priceMatch) {
          let matchedPrice = priceMatch[1];
          
          if (matchedPrice.includes(',') && matchedPrice.includes('.')) {
            const lastDotIndex = matchedPrice.lastIndexOf('.');
            const lastCommaIndex = matchedPrice.lastIndexOf(',');
            
            if (lastDotIndex > lastCommaIndex) {
              matchedPrice = matchedPrice.replace(/,/g, '');
            } else {
              matchedPrice = matchedPrice.replace(/\./g, '').replace(/,([^,]*)$/, '.$1');
            }
          } else if (matchedPrice.includes(',') && !matchedPrice.includes('.')) {
            const parts = matchedPrice.split(',');
            if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
              matchedPrice = matchedPrice.replace(/,/g, '');
            } else if (parts.length === 2 && parts[1].length <= 4) {
              matchedPrice = matchedPrice.replace(',', '.');
            } else {
              matchedPrice = matchedPrice.replace(/,/g, '');
            }
          }
          
          const parsedPrice = parseFloat(matchedPrice) || 0;
          if (parsedPrice > 0) {
            price = parsedPrice;
            console.log(`Found price in content for ${symbol}: ${price}`);
            break;
          }
        }
      }
    }
    
    // Return null if no valid data
    if (price === 0) {
      // Log diagnostic information
      const hasSymbol = htmlContent.includes('symbol') || htmlContent.includes('Symbol');
      const hasPrice = htmlContent.includes('price') || htmlContent.includes('Price');
      const hasTradingView = htmlContent.includes('TradingView') || htmlContent.includes('tradingview');
      const hasChart = htmlContent.includes('chart') || htmlContent.includes('Chart');
      const hasError = htmlContent.includes('error') || htmlContent.includes('Error') || htmlContent.includes('404');
      
      console.warn(`No valid price found for ${symbol}. Diagnostic info:`, {
        htmlLength: htmlContent.length,
        hasSymbol,
        hasPrice,
        hasTradingView,
        hasChart,
        hasError,
        first500Chars: htmlContent.substring(0, 500)
      });
      
      // Try to find any numeric value that might be a price
      const allNumbers = htmlContent.match(/\d+\.\d{2,4}/g);
      if (allNumbers && allNumbers.length > 0) {
        console.log(`Found potential prices in HTML: ${allNumbers.slice(0, 5).join(', ')}`);
      }
      
      return null;
    }
    
    // Infer unit for freight
    const unit = inferUnitFromCommodity(symbol, name, 'freight', type);
    
    return {
      symbol,
      name,
      price,
      percentChange,
      absoluteChange,
      high: high || 0,
      low: low || 0,
      technicalEvaluation: percentChange >= 0 ? 'Positive' : 'Negative',
      type,
      category: 'freight',
      unit: unit || undefined
    };
    
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Retrieves all freight data in parallel
 */
async function fetchFreightData(): Promise<Commodity[]> {
  console.log('Fetching freight data from individual symbol pages...');
  
  // Reduce batch size and increase delays to avoid CAPTCHA
  const batchSize = 2; // Reduced from 5 to 2
  const results: Commodity[] = [];
  
  for (let i = 0; i < FREIGHT_SYMBOLS.length; i += batchSize) {
    const batch = FREIGHT_SYMBOLS.slice(i, i + batchSize);
    
    // Process sequentially within batch to reduce rate limiting
    for (const { symbol, name, type } of batch) {
      try {
        const data = await fetchFreightSymbolData(symbol, name, type);
        if (data) {
          results.push(data);
        }
        // Delay between each symbol to avoid CAPTCHA
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds between symbols
      } catch (error) {
        console.warn(`Failed to fetch ${symbol}:`, error);
      }
    }
    
    // Longer delay between batches to respect API limits and avoid CAPTCHA
    if (i + batchSize < FREIGHT_SYMBOLS.length) {
      console.log(`Waiting 5 seconds before next batch to avoid CAPTCHA...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds between batches
    }
  }
  
  console.log(`Successfully fetched ${results.length} freight commodities`);
  
  // If no data was fetched (all blocked by CAPTCHA), log warning
  if (results.length === 0) {
    console.warn('⚠️ All freight symbols were blocked by CAPTCHA. TradingView is currently blocking automated access.');
    console.warn('💡 Suggestions:');
    console.warn('   1. Wait a few hours and try again');
    console.warn('   2. Use the category page method (if available)');
    console.warn('   3. Consider using an alternative data source for freight rates');
  }
  
  return results;
}

/**
 * Scrapes bunker prices data from shipandbunker.com
 */
async function fetchBunkerData(): Promise<Commodity[]> {
  console.log('Fetching bunker data from shipandbunker.com...');
  
  const bunkerTypes = [
    { type: 'vlsfo', url: 'https://shipandbunker.com/prices#VLSFO', name: 'VLSFO' },
    { type: 'mgo', url: 'https://shipandbunker.com/prices#MGO', name: 'MGO' },
    { type: 'ifo380', url: 'https://shipandbunker.com/prices#IFO380', name: 'IFO380' }
  ];
  
  const allBunkerCommodities: Commodity[] = [];
  
  // First, try to fetch Gibraltar data specifically from EMEA page
  try {
    console.log('Fetching Gibraltar bunker data from EMEA page...');
    
    const gibraltarData = await scrapeShipAndBunkerEMEA();
    
    if (gibraltarData && gibraltarData.data) {
      const gibraltarCommodities = parseGibraltarData(gibraltarData.data);
      allBunkerCommodities.push(...gibraltarCommodities);
      console.log(`Found ${gibraltarCommodities.length} Gibraltar bunker commodities`);
    }
    
    // Add delay before next requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Error fetching Gibraltar data:', error);
  }
  
  // Continue with regular bunker types scraping
  for (const bunkerType of bunkerTypes) {
    try {
      console.log(`Fetching ${bunkerType.name} data...`);
      
      const data = await scrapeShipAndBunker(bunkerType.type);
      
      if (!data || !data.data) {
        console.warn(`No data received for ${bunkerType.name}`);
        continue;
      }

      const htmlContent = data.data;
      const root = parse(htmlContent);
      
      // Parse the bunker data from Ship & Bunker website
      const bunkerCommodities = parseBunkerData(htmlContent, bunkerType.type as 'vlsfo' | 'mgo' | 'ifo380', bunkerType.name);
      allBunkerCommodities.push(...bunkerCommodities);
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error fetching ${bunkerType.name}:`, error);
    }
  }
  
  console.log(`Successfully fetched ${allBunkerCommodities.length} bunker commodities`);
  return allBunkerCommodities;
}

/**
 * Parses bunker prices data from Ship & Bunker HTML
 */
function parseBunkerData(htmlContent: string, bunkerType: 'vlsfo' | 'mgo' | 'ifo380', bunkerTypeName: string): Commodity[] {
  try {
    const root = parse(htmlContent);
    const commodities: Commodity[] = [];
    
    console.log(`Parsing ${bunkerTypeName} data from HTML content (${htmlContent.length} chars)`);
    
    // Find price data in the HTML structure
    let priceRows: any[] = [];
    
    // Try finding the main price table
    const priceTables = root.querySelectorAll('table.price-table, table[class*="price"], table[id*="price"]');
    if (priceTables.length > 0) {
      priceRows = priceTables[0].querySelectorAll('tbody tr, tr');
      console.log(`Found ${priceRows.length} rows in price table for ${bunkerTypeName}`);
    }
    
    // Fallback: look for any table with price data
    if (priceRows.length === 0) {
      const allTables = root.querySelectorAll('table');
      for (const table of allTables) {
        const tableText = table.text.toLowerCase();
        if (tableText.includes('price') || tableText.includes('$/mt') || 
            tableText.includes(bunkerTypeName.toLowerCase())) {
          priceRows = table.querySelectorAll('tbody tr, tr');
          console.log(`Found ${priceRows.length} rows in fallback table for ${bunkerTypeName}`);
          if (priceRows.length > 0) break;
        }
      }
    }
    
    // Final fallback: look for any rows with price-like data
    if (priceRows.length === 0) {
      priceRows = root.querySelectorAll('tr');
      console.log(`Using all ${priceRows.length} rows as final fallback for ${bunkerTypeName}`);
    }
    
    // Process the rows
    if (priceRows.length > 0) {
      priceRows.forEach((row, index) => {
        const commodity = extractBunkerCommodityFromRow(row, bunkerType, bunkerTypeName, index);
        if (commodity) {
          commodities.push(commodity);
        }
      });
    }
    
    console.log(`Parsed ${commodities.length} commodities for ${bunkerTypeName}`);
    return commodities;
    
  } catch (error) {
    console.error(`Error parsing bunker data for ${bunkerTypeName}:`, error);
    return [];
  }
}

/**
 * Extracts commodity data from a table row
 */
function extractBunkerCommodityFromRow(row: any, bunkerType: 'vlsfo' | 'mgo' | 'ifo380', bunkerTypeName: string, index: number): Commodity | null {
  try {
    const cells = row.querySelectorAll('td, th');
    
    if (cells.length < 2) {
      return null; // Not enough data
    }
    
    let portName = '';
    let price = 0;
    let change = 0;
    let changePercent = 0;
    let high = 0;
    let low = 0;
    
    // Extract port/location name (usually first cell)
    const firstCell = cells[0];
    portName = firstCell.text.trim();
    
    if (!portName || portName.toLowerCase().includes('port') && portName.length < 3) {
      portName = `${bunkerTypeName} Port ${index + 1}`;
    }
    
    // Extract price data from cells
    for (let i = 1; i < cells.length; i++) {
      const cellText = cells[i].text.trim();
      
      // Cell 1: Price ($/mt)
      if (i === 1 && /^\d+[\d.,]*$/.test(cellText.replace(/[^\d.,]/g, ''))) {
        const priceText = cellText.replace(/[^\d.,]/g, '').replace(',', '.');
        price = parseFloat(priceText) || 0;
      }
      // Cell 2: Change (can have + or -)
      else if (i === 2 && /[+-]?\d+[\d.,]*/.test(cellText)) {
        const changeText = cellText.replace(/[^\d.,-]/g, '').replace(',', '.');
        change = parseFloat(changeText) || 0;
      }
      // Cell 3: High
      else if (i === 3 && /^\d+[\d.,]*$/.test(cellText.replace(/[^\d.,]/g, ''))) {
        const highText = cellText.replace(/[^\d.,]/g, '').replace(',', '.');
        high = parseFloat(highText) || 0;
      }
      // Cell 4: Low
      else if (i === 4 && /^\d+[\d.,]*$/.test(cellText.replace(/[^\d.,]/g, ''))) {
        const lowText = cellText.replace(/[^\d.,]/g, '').replace(',', '.');
        low = parseFloat(lowText) || 0;
      }
    }
    
    // If we found valid data, create commodity
    if (price > 0 && portName) {
      return createBunkerCommodity(
        `${bunkerType.toUpperCase()}_${portName.replace(/\s+/g, '_')}`,
        `${bunkerTypeName} - ${portName}`,
        bunkerType,
        price,
        change,
        changePercent,
        high,
        low
      );
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting commodity from row:', error);
    return null;
  }
}

/**
 * Parses Gibraltar specific data from EMEA page
 */
function parseGibraltarData(htmlContent: string): Commodity[] {
  try {
    const root = parse(htmlContent);
    const commodities: Commodity[] = [];
    
    console.log('Parsing Gibraltar data from EMEA page...');
    
    // Look for Gibraltar specifically in the HTML
    const gibraltarRows = root.querySelectorAll('tr').filter(row => {
      const text = row.text.toLowerCase();
      return text.includes('gibraltar');
    });
    
    console.log(`Found ${gibraltarRows.length} Gibraltar rows`);
    
    for (const row of gibraltarRows) {
      const cells = row.querySelectorAll('td, th');
      
      if (cells.length >= 4) {
        const portName = cells[0]?.text.trim() || '';
        
        if (portName.toLowerCase().includes('gibraltar')) {
          // Parse VLSFO (cell 1)
          const vlsfoText = cells[1]?.text.trim() || '';
          if (vlsfoText && vlsfoText !== '-' && !vlsfoText.includes('login')) {
            const vlsfoMatch = vlsfoText.match(/(\d+\.?\d*)/);
            if (vlsfoMatch) {
              const price = parseFloat(vlsfoMatch[1]);
              
              commodities.push(createBunkerCommodity(
                'VLSFO_Gibraltar',
                'VLSFO - Gibraltar',
                'vlsfo',
                price,
                0, // No change data for Gibraltar
                0, // No percent change
                0, // No high data for Gibraltar  
                0  // No low data for Gibraltar
              ));
            }
          }
          
          // Parse MGO (cell 2) 
          const mgoText = cells[2]?.text.trim() || '';
          if (mgoText && mgoText !== '-' && !mgoText.includes('login')) {
            const mgoMatch = mgoText.match(/(\d+\.?\d*)/);
            if (mgoMatch) {
              const price = parseFloat(mgoMatch[1]);
              
              commodities.push(createBunkerCommodity(
                'MGO_Gibraltar',
                'MGO - Gibraltar',
                'mgo',
                price,
                0, // No change data for Gibraltar
                0, // No percent change
                0, // No high data for Gibraltar
                0  // No low data for Gibraltar
              ));
            }
          }
          
          // Parse IFO380 (cell 3)
          const ifo380Text = cells[3]?.text.trim() || '';
          if (ifo380Text && ifo380Text !== '-' && !ifo380Text.includes('login')) {
            const ifo380Match = ifo380Text.match(/(\d+\.?\d*)/);
            if (ifo380Match) {
              const price = parseFloat(ifo380Match[1]);
              
              commodities.push(createBunkerCommodity(
                'IFO380_Gibraltar',
                'IFO380 - Gibraltar',
                'ifo380',
                price,
                0, // No change data for Gibraltar
                0, // No percent change
                0, // No high data for Gibraltar
                0  // No low data for Gibraltar
              ));
            }
          }
        }
      }
    }
    
    console.log(`Extracted ${commodities.length} Gibraltar commodities`);
    return commodities;
    
  } catch (error) {
    console.error('Error parsing Gibraltar data:', error);
    return [];
  }
}

/**
 * Creates a bunker commodity object
 */
function createBunkerCommodity(
  symbol: string,
  name: string,
  type: 'vlsfo' | 'mgo' | 'ifo380',
  price: number,
  absoluteChange: number = 0,
  percentChange: number = 0,
  high: number = 0,
  low: number = 0
): Commodity {
  // Bunker commodities are typically in MT (metric tons)
  const unit = inferUnitFromCommodity(symbol, name, 'bunker', type);
  
  return {
    symbol,
    name,
    price,
    percentChange,
    absoluteChange,
    high: high > 0 ? high : (symbol.includes('Gibraltar') ? 0 : price * 1.05),
    low: low > 0 ? low : (symbol.includes('Gibraltar') ? 0 : price * 0.95),
    technicalEvaluation: absoluteChange >= 0 ? 'Positive' : 'Negative',
    type,
    category: 'bunker',
    unit: unit || 'MT' // Default to MT for bunker if not found
  };
}

