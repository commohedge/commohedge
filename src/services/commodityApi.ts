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
    console.log(`[Freight] Fetching data for ${symbol}...`);
    const data = await scrapeTradingViewSymbol(symbol);
    
    if (!data || !data.data) {
      console.warn(`[Freight] No data received for ${symbol}`);
      return null;
    }

    // Parse the HTML to extract data
    const htmlContent = data.data;
    const root = parse(htmlContent);
    
    // Extract the main price
    let price = 0;
    let percentChange = 0;
    let absoluteChange = 0;
    let high = 0;
    let low = 0;
    
    // Try to extract from JSON embedded in scripts first (more reliable)
    try {
      const scriptTags = root.querySelectorAll('script');
      for (const script of scriptTags) {
        const scriptContent = script.text || '';
        
        // Look for __NEXT_DATA__ or similar JSON structures
        if (scriptContent.includes('__NEXT_DATA__') || scriptContent.includes('"symbol"') || scriptContent.includes('"price"')) {
          try {
            // Try to extract JSON from script
            const jsonMatch = scriptContent.match(/(\{[^}]*"price"[^}]*\})/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[1]);
              if (jsonData.price && typeof jsonData.price === 'number') {
                price = jsonData.price;
                console.log(`[Freight] Found price in JSON for ${symbol}: ${price}`);
                if (jsonData.change) absoluteChange = jsonData.change;
                if (jsonData.changePercent) percentChange = jsonData.changePercent;
                if (jsonData.high) high = jsonData.high;
                if (jsonData.low) low = jsonData.low;
                break;
              }
            }
            
            // Try to find price in window.__TV_DATA__ or similar
            const tvDataMatch = scriptContent.match(/window\.__TV_DATA__\s*=\s*({[^}]+})/);
            if (tvDataMatch) {
              const tvData = JSON.parse(tvDataMatch[1]);
              if (tvData.price) {
                price = parseFloat(tvData.price) || 0;
                console.log(`[Freight] Found price in __TV_DATA__ for ${symbol}: ${price}`);
                break;
              }
            }
          } catch (e) {
            // Continue to other methods if JSON parsing fails
          }
        }
      }
    } catch (e) {
      console.log(`[Freight] JSON extraction failed for ${symbol}, trying HTML selectors...`);
    }
    
    // Search for price elements in different possible selectors (expanded list)
    // Prioritize selectors that are more specific to the symbol page
    if (price === 0) {
      // First, try to find the main symbol container to avoid navigation elements
      const symbolContainer = root.querySelector('.tv-symbol-header, [class*="symbol-header"], main, [role="main"]') || root;
      
      const priceSelectors = [
        // Most specific selectors first
        '.tv-symbol-price-quote__value',
        '.tv-symbol-price-quote__value--last',
        '[data-field="last_price"]',
        '[data-field="price"]',
        '.js-symbol-last',
        '.tv-symbol-header__price',
        '.tv-symbol-price-quote__price',
        // More general but still in symbol context
        '.tv-symbol-price-quote [class*="value"]',
        '.tv-symbol-header [class*="price"]',
        '[class*="price-quote"]',
        // Fallback selectors (but only in symbol container)
        '.last-price',
        '[data-symbol-price]'
      ];
      
      for (const selector of priceSelectors) {
        // Search within symbol container first
        const priceElements = symbolContainer.querySelectorAll(selector);
        
        // If not found in container, try root (but be more careful)
        const elementsToCheck = priceElements.length > 0 ? priceElements : root.querySelectorAll(selector);
        
        for (const priceElement of elementsToCheck) {
          // Skip if element is in navigation or header menu
          const parent = priceElement.parentElement;
          if (parent) {
            const parentClasses = parent.className || '';
            const parentId = parent.id || '';
            if (parentClasses.includes('nav') || parentClasses.includes('menu') || 
                parentId.includes('nav') || parentId.includes('menu') ||
                parentClasses.includes('header') && !parentClasses.includes('symbol-header')) {
              continue;
            }
          }
          
          const rawPriceText = priceElement.text.trim();
          if (!rawPriceText || rawPriceText.length === 0) continue;
          
          // Skip if it looks like a navigation element (common patterns)
          if (rawPriceText === '1.60' || rawPriceText === '1,60' || 
              rawPriceText.match(/^[0-9]\.[0-9]{2}$/) && parseFloat(rawPriceText) === 1.60) {
            console.log(`[Freight] Skipping likely navigation element with value "${rawPriceText}" for ${symbol}`);
            continue;
          }
          
          console.log(`[Freight] Raw price text for ${symbol} (${selector}): "${rawPriceText}"`);
          
          // Parse prices correctly for TradingView format
          let priceText = rawPriceText;
          
          // Remove units and spaces
          priceText = priceText.replace(/\s*(USD|usd|$|€|EUR|eur|MMBtu|mmbtu)\s*/gi, '');
          
          // Remove all non-numeric characters except commas, dots, and minus sign
          priceText = priceText.replace(/[^\d.,-]/g, '');
          
          // Skip if empty after cleaning
          if (!priceText || priceText.length === 0) continue;
          
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
          
          console.log(`[Freight] Processed price text for ${symbol}: "${priceText}"`);
          const parsedPrice = parseFloat(priceText) || 0;
          
          // Validate price is reasonable (not 1.60 which seems to be a common false positive)
          // and is greater than 0
          if (parsedPrice > 0 && parsedPrice !== 1.60) {
            price = parsedPrice;
            console.log(`[Freight] Successfully parsed price for ${symbol}: ${price}`);
            break;
          } else if (parsedPrice > 0 && parsedPrice === 1.60) {
            // If we get 1.60, it might be correct, but log it for debugging
            console.warn(`[Freight] Found price 1.60 for ${symbol} - might be correct or might be navigation element`);
            // Only use it if we can't find anything else
            if (price === 0) {
              price = parsedPrice;
            }
          }
        }
        if (price > 0 && price !== 1.60) break;
      }
    }
    
    // If no price found, search in general content with more patterns
    // But be more careful to avoid navigation elements
    if (price === 0 || price === 1.60) {
      // Try to find price near the symbol name or in main content area
      const mainContent = root.querySelector('main, [role="main"], .tv-symbol-page, [class*="symbol-page"]') || root;
      const mainContentText = mainContent.text || '';
      
      const pricePatterns = [
        // Look for patterns that include the symbol name
        new RegExp(`${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^]*?(\\d+\\.\\d{1,6})`, 'i'),
        // Look for "last price" or "price" followed by number
        /(?:last\s+price|price|quote)[:\s]+([\d.,]+)/i,
        // Look for numbers that look like prices (with decimals)
        /(\d+\.\d{2,6})\s*(?:USD|usd|$|MMBtu|mmbtu)?/i,
        /(\d{1,3}(?:,\d{3})*\.\d{2,6})\s*(?:USD|usd|$|MMBtu|mmbtu)?/i,
        // More general patterns
        /(\d{1,3}(?:,\d{3})+)\s*(?:USD|usd|$|MMBtu|mmbtu)?/i
      ];
      
      for (const pattern of pricePatterns) {
        const priceMatch = mainContentText.match(pattern);
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
          // Accept price if it's > 0 and not the suspicious 1.60 value
          if (parsedPrice > 0 && parsedPrice !== 1.60) {
            price = parsedPrice;
            console.log(`[Freight] Found price in content for ${symbol}: ${price}`);
            break;
          }
        }
      }
    }
    
    // Try to extract change and percent change
    if (price > 0) {
      // Look for change indicators
      const changeSelectors = [
        '.tv-symbol-price-quote__change',
        '[data-field="change"]',
        '[class*="change"]',
        '[class*="percent"]'
      ];
      
      for (const selector of changeSelectors) {
        const changeElement = root.querySelector(selector);
        if (changeElement) {
          const changeText = changeElement.text.trim();
          // Try to extract percentage change: "+0.88%" or "-0.88%"
          const percentMatch = changeText.match(/([+-]?\d+\.?\d*)\s*%/);
          if (percentMatch) {
            percentChange = parseFloat(percentMatch[1]) || 0;
          }
          // Try to extract absolute change: "+0.025" or "-0.025"
          const absMatch = changeText.match(/([+-]?\d+\.?\d*)/);
          if (absMatch && !percentMatch) {
            absoluteChange = parseFloat(absMatch[1]) || 0;
          }
          if (percentChange !== 0 || absoluteChange !== 0) break;
        }
      }
    }
    
    // Return null if no valid data
    if (price === 0) {
      console.warn(`[Freight] No valid price found for ${symbol}. HTML length: ${htmlContent.length}`);
      // Log a sample of the HTML for debugging
      const sample = htmlContent.substring(0, 1000);
      console.log(`[Freight] HTML sample for ${symbol}:`, sample);
      return null;
    }
    
    console.log(`[Freight] Successfully extracted data for ${symbol}: price=${price}, change=${absoluteChange}, change%=${percentChange}`);
    
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
      category: 'freight'
    };
    
  } catch (error) {
    console.error(`[Freight] Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Retrieves all freight data in parallel
 */
async function fetchFreightData(): Promise<Commodity[]> {
  console.log(`[Freight] Fetching freight data from individual symbol pages... (${FREIGHT_SYMBOLS.length} symbols)`);
  
  // Limit to 3 symbols in parallel to avoid API overload and improve reliability
  const batchSize = 3;
  const results: Commodity[] = [];
  const failedSymbols: string[] = [];
  
  for (let i = 0; i < FREIGHT_SYMBOLS.length; i += batchSize) {
    const batch = FREIGHT_SYMBOLS.slice(i, i + batchSize);
    console.log(`[Freight] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(FREIGHT_SYMBOLS.length / batchSize)}: ${batch.map(b => b.symbol).join(', ')}`);
    
    const batchPromises = batch.map(({ symbol, name, type }) => 
      fetchFreightSymbolData(symbol, name, type)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      const symbol = batch[index].symbol;
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
        console.log(`[Freight] ✓ Successfully fetched ${symbol}`);
      } else {
        failedSymbols.push(symbol);
        const errorMsg = result.status === 'rejected' 
          ? result.reason?.message || result.reason 
          : 'No data returned';
        console.warn(`[Freight] ✗ Failed to fetch ${symbol}:`, errorMsg);
      }
    });
    
    // Small delay between batches to respect API limits
    if (i + batchSize < FREIGHT_SYMBOLS.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay to 2 seconds
    }
  }
  
  console.log(`[Freight] Successfully fetched ${results.length}/${FREIGHT_SYMBOLS.length} freight commodities`);
  if (failedSymbols.length > 0) {
    console.warn(`[Freight] Failed symbols: ${failedSymbols.join(', ')}`);
  }
  
  // If we got some results, return them even if some failed
  if (results.length > 0) {
    return results;
  }
  
  // If all failed, throw an error to trigger fallback or user notification
  throw new Error(`Failed to fetch any freight data. All ${FREIGHT_SYMBOLS.length} symbols failed.`);
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
    category: 'bunker'
  };
}


