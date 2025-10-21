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
}

// Function to get cache key for a category
function getCacheKey(category: CommodityCategory): string {
  return `${CACHE_PREFIX}${category}`;
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
          category
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
        console.log(`Returning cached data for ${category}: ${cachedData.length} items`);
        return cachedData;
      }
    } else {
      console.log(`Force refresh requested for ${category}, ignoring cache`);
    }

    // For other categories, use Puppeteer scraping
    const data = await scrapeTradingViewCategory(category);
    console.log("Raw scraping response:", data);
    
    // Parse the HTML retrieved to extract commodity data
    const commodities = parseCommoditiesData(data, category);
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

