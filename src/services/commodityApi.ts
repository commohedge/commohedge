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
// Extracted from TradingView widget - symbols to be scraped
const FREIGHT_SYMBOLS = [
  // Container Freight (CONTAINER group)
  { symbol: 'CS61!', name: 'Container Freight (China/East Asia to Mediterranean) (FBX13) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS31!', name: 'Container Freight (China/East Asia to US East Coast) (FBX03) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS51!', name: 'Container Freight (North Europe to China/East Asia) (FBX12) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS11!', name: 'Container Freight (China/East Asia to US West Coast) (FBX01) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS21!', name: 'Container Freight (US West Coast to China/East Asia) (FBX02) (Baltic) Futures', type: 'container' as const },
  { symbol: 'CS41!', name: 'Container Freight (China/East Asia to North Europe) (FBX11) (Baltic) Futures', type: 'container' as const },
  
  // Freight Routes (FREIGHT group)
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
  
  // LNG Freight (from FREIGHT group)
  { symbol: 'BG11!', name: 'LNG Freight Australia to Japan (BLNG1-174)', type: 'lng_freight' as const },
  { symbol: 'BG31!', name: 'LNG Freight US Gulf to Japan (BLNG3-174)', type: 'lng_freight' as const },
  { symbol: 'BG21!', name: 'LNG Freight US Gulf to Continent (BLNG2-174)', type: 'lng_freight' as const },
  { symbol: 'BL11!', name: 'LNG Freight Route BLNG1g (LNG Fuel) (Baltic) Futures', type: 'lng_freight' as const },
  { symbol: 'BL21!', name: 'LNG Freight Route BLNG2g (LNG Fuel) (Baltic) Futures', type: 'lng_freight' as const },
  { symbol: 'BL31!', name: 'LNG Freight Route BLNG3g (LNG Fuel) (Baltic) Futures', type: 'lng_freight' as const },
  
  // Dirty Freight (from FREIGHT group)
  { symbol: 'USC1!', name: 'USGC to China (Platts) Dirty Freight Futures', type: 'dirty_freight' as const },
  { symbol: 'USE1!', name: 'USGC to UK Continent (Platts) Dirty Freight Futures', type: 'dirty_freight' as const },
  { symbol: 'XUK1!', name: 'Cross North Sea Dirty Freight 80kt (Platts) Futures', type: 'dirty_freight' as const },
  
  // Liquid Petroleum Gas Freight (from FREIGHT group)
  { symbol: 'FLJ1!', name: 'Freight Route Liquid Petroleum Gas (BLPG3) (Baltic) Futures', type: 'lng_freight' as const },
  { symbol: 'FLP1!', name: 'Freight Route Liquid Petroleum Gas (BLPG1) (Baltic) Futures', type: 'lng_freight' as const }
];

// Interfaces for commodity data
export interface Commodity {
  symbol: string;
  name: string;
  price: number;
  currency: string; // Currency code (USD, EUR, GBP, etc.)
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

    // Migrate old cache data to include currency field if missing
    const migratedData = (cacheData.data || []).map((item: any) => {
      if (!item.currency) {
        // Extract currency from existing data or use default
        const currency = extractCurrency(item.symbol || '', item.name || '', category);
        return { ...item, currency };
      }
      return item;
    });

    console.log(`Loading cached data for ${category}: ${migratedData.length} items (${Math.round((now - cacheData.timestamp) / (1000 * 60 * 60))} hours old)`);
    return migratedData;
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
 * Extracts currency from commodity name or symbol
 * Priority: 1. Name text, 2. Symbol, 3. Category default
 */
function extractCurrency(symbol: string, name: string, category: CommodityCategory): string {
  // Comprehensive list of supported currencies (ISO 4217 codes)
  const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD',
    'CNY', 'INR', 'BRL', 'MXN', 'ZAR', 'RUB', 'KRW', 'SGD',
    'HKD', 'TRY', 'PLN', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF',
    'ILS', 'CLP', 'COP', 'ARS', 'PEN', 'PHP', 'THB', 'MYR',
    'IDR', 'VND', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR',
    'JOD', 'LBP', 'EGP', 'NGN', 'KES', 'UGX', 'TZS', 'ETB',
    'GHS', 'XAF', 'XOF', 'ZMW', 'BWP', 'MZN', 'MAD', 'TND',
    'DZD', 'LYD', 'SDG', 'SSP', 'ERN', 'DJF', 'SOS', 'SZL',
    'LSL', 'NAD', 'AOA', 'CDF', 'RWF', 'BIF', 'MWK', 'MGA',
    'KMF', 'SCR', 'MUR', 'MOP', 'PKR', 'BDT', 'LKR', 'NPR',
    'MMK', 'KHR', 'LAK', 'BND', 'FJD', 'PGK', 'SBD', 'VUV',
    'WST', 'TOP', 'XPF', 'NIO', 'GTQ', 'BZD', 'JMD', 'BBD',
    'BSD', 'BMD', 'KYD', 'AWG', 'ANG', 'SRD', 'GYD', 'TTD',
    'XCD', 'DOP', 'HTG', 'CUP', 'BAM', 'RSD', 'MKD', 'ALL',
    'BGN', 'RON', 'MDL', 'UAH', 'BYN', 'GEL', 'AMD', 'AZN',
    'KZT', 'KGS', 'TJS', 'TMT', 'UZS', 'AFN', 'IRR', 'IQD',
    'YER', 'OMR', 'BHD', 'KWD', 'QAR', 'AED', 'SAR'
  ];
  
  // Create regex pattern for currency matching (word boundaries to avoid partial matches)
  const currencyPattern = new RegExp(`\\b(${currencies.join('|')})\\b`, 'i');
  
  // Strategy 1: Extract from name (most reliable)
  // Common patterns: "Silver USD per ounce", "Gold EUR per gram", "Crude Oil USD per barrel"
  if (name) {
    const nameMatch = name.match(currencyPattern);
    if (nameMatch) {
      const foundCurrency = nameMatch[1].toUpperCase();
      console.log(`✅ Currency extracted from name for ${symbol}: ${foundCurrency}`);
      return foundCurrency;
    }
    
    // Also check for currency symbols in name (check longer patterns first to avoid conflicts)
    const currencySymbols: Array<[string, string]> = [
      ['R$', 'BRL'],  // Check longer patterns first
      ['$', 'USD'],
      ['€', 'EUR'],
      ['£', 'GBP'],
      ['¥', 'JPY'],  // Default to JPY for commodities (CNY is less common)
      ['₹', 'INR'],
      ['R', 'ZAR'],  // Check after R$ to avoid false matches
      ['₽', 'RUB'],
      ['₩', 'KRW'],
      ['₪', 'ILS'],
      ['₦', 'NGN'],
      ['₨', 'PKR'],  // PKR is more common than INR for this symbol
      ['₫', 'VND'],
      ['₱', 'PHP'],
      ['฿', 'THB'],
      ['₡', 'CRC']
    ];
    
    for (const [symbol, currency] of currencySymbols) {
      if (name.includes(symbol)) {
        console.log(`✅ Currency extracted from symbol in name for ${symbol}: ${currency}`);
        return currency;
      }
    }
  }
  
  // Strategy 2: Extract from symbol
  // Some symbols contain currency: XAGUSD1!, XAUUSD1!, EURUSD, etc.
  if (symbol) {
    // Check if symbol ends with currency code (e.g., XAGUSD1!, XAUUSD1!)
    const symbolMatch = symbol.match(currencyPattern);
    if (symbolMatch) {
      const foundCurrency = symbolMatch[1].toUpperCase();
      console.log(`✅ Currency extracted from symbol for ${symbol}: ${foundCurrency}`);
      return foundCurrency;
    }
    
    // Check for currency pairs in symbol (e.g., EURUSD, GBPUSD)
    const currencyPairPattern = /([A-Z]{3})(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY)/i;
    const pairMatch = symbol.match(currencyPairPattern);
    if (pairMatch) {
      // For pairs, the quote currency is usually what we want
      const foundCurrency = pairMatch[2].toUpperCase();
      console.log(`✅ Currency extracted from currency pair in symbol for ${symbol}: ${foundCurrency}`);
      return foundCurrency;
    }
  }
  
  // Strategy 3: Geographic and exchange-based detection
  // Check for geographic indicators in name or symbol
  const lowerName = name.toLowerCase();
  const lowerSymbol = symbol.toLowerCase();
  const combinedText = `${lowerName} ${lowerSymbol}`;
  
  // Geographic currency mapping
  const geographicIndicators: Array<[string[], string]> = [
    // UK / London / British
    [['london', 'uk', 'united kingdom', 'british', 'ice futures europe', 'ice europe', 'liffe', 'euronext london'], 'GBP'],
    // European (non-UK)
    [['paris', 'france', 'eurex', 'euronext', 'european', 'frankfurt', 'germany', 'deutsche'], 'EUR'],
    // US / American
    [['new york', 'ny', 'nymex', 'comex', 'cbot', 'cme', 'chicago', 'us', 'usa', 'united states'], 'USD'],
    // Japanese
    [['tokyo', 'japan', 'ose', 'tocom'], 'JPY'],
    // Australian
    [['sydney', 'australia', 'asx'], 'AUD'],
    // Canadian
    [['toronto', 'canada', 'tsx'], 'CAD'],
    // Chinese
    [['shanghai', 'beijing', 'china', 'dce', 'czce', 'shfe'], 'CNY'],
    // Indian
    [['mumbai', 'india', 'nse', 'bse'], 'INR'],
    // Brazilian
    [['sao paulo', 'brazil', 'bm&f'], 'BRL'],
    // Swiss
    [['zurich', 'switzerland', 'swiss'], 'CHF'],
    // South African
    [['johannesburg', 'south africa', 'jse'], 'ZAR'],
    // Russian
    [['moscow', 'russia', 'moex'], 'RUB'],
    // Singapore
    [['singapore', 'sgx'], 'SGD'],
    // Hong Kong
    [['hong kong', 'hkex'], 'HKD']
  ];
  
  for (const [indicators, currency] of geographicIndicators) {
    if (indicators.some(indicator => combinedText.includes(indicator))) {
      console.log(`✅ Currency detected from geographic/exchange indicator for ${symbol}: ${currency}`);
      return currency;
    }
  }
  
  // Strategy 4: Exchange-specific currency mapping
  const exchangeCurrencyMap: Record<string, string> = {
    'ICE Futures Europe': 'GBP',
    'ICE Europe': 'GBP',
    'LIFFE': 'GBP',
    'Euronext': 'EUR',
    'EUREX': 'EUR',
    'NYMEX': 'USD',
    'COMEX': 'USD',
    'CBOT': 'USD',
    'CME': 'USD',
    'TOCOM': 'JPY',
    'OSE': 'JPY',
    'ASX': 'AUD',
    'TSX': 'CAD',
    'DCE': 'CNY',
    'CZCE': 'CNY',
    'SHFE': 'CNY',
    'NSE': 'INR',
    'BSE': 'INR',
    'BM&F': 'BRL',
    'JSE': 'ZAR',
    'MOEX': 'RUB',
    'SGX': 'SGD',
    'HKEX': 'HKD'
  };
  
  for (const [exchange, currency] of Object.entries(exchangeCurrencyMap)) {
    if (combinedText.includes(exchange.toLowerCase())) {
      console.log(`✅ Currency detected from exchange for ${symbol}: ${currency}`);
      return currency;
    }
  }
  
  // Strategy 5: Category-specific defaults with exceptions (fallback)
  const DEFAULT_CURRENCIES: Record<CommodityCategory, string> = {
    'metals': 'USD',        // Most metals are quoted in USD
    'agricultural': 'USD',  // Most agricultural products are in USD (but London/ICE = GBP)
    'energy': 'USD',        // Most energy products are in USD
    'freight': 'USD',       // Freight is typically quoted in USD
    'bunker': 'USD'         // Bunker fuel is typically in USD
  };
  
  const defaultCurrency = DEFAULT_CURRENCIES[category];
  console.log(`⚠️  Using default currency for ${symbol} (${category}): ${defaultCurrency}`);
  return defaultCurrency;
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
          
          // Try to extract exchange information from the cell or row for better currency detection
          // TradingView sometimes includes exchange info in data attributes or nearby elements
          const exchangeElement = firstCell.querySelector('[data-exchange], .exchange-name, [class*="exchange"], [class*="market"]');
          if (exchangeElement) {
            const exchangeText = exchangeElement.text.trim() || exchangeElement.getAttribute('data-exchange') || '';
            if (exchangeText) {
              // Append exchange to name for better currency detection
              name = name ? `${name} ${exchangeText}` : exchangeText;
            }
          }
          
          // Also check parent elements and siblings for exchange info
          const parentCell = firstCell.parentElement;
          if (parentCell) {
            const parentExchange = parentCell.querySelector('[data-exchange], [class*="exchange"]');
            if (parentExchange) {
              const exchangeText = parentExchange.text.trim() || parentExchange.getAttribute('data-exchange') || '';
              if (exchangeText && !name.includes(exchangeText)) {
                name = name ? `${name} ${exchangeText}` : exchangeText;
              }
            }
          }
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
        
        const priceCell = cells[1];
        const price = parseNumber(priceCell?.text.trim());
        
        // Try to extract currency from price cell or nearby cells
        // TradingView often displays currency next to price (e.g., "603 USD")
        let currency = '';
        const priceCellText = priceCell?.text.trim() || '';
        const priceCellHTML = priceCell?.toString() || '';
        
        // Check price cell for currency
        const currencyInPriceCell = priceCellText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
        if (currencyInPriceCell) {
          currency = currencyInPriceCell[1].toUpperCase();
          console.log(`✅ Currency extracted from price cell for ${symbol}: ${currency}`);
        }
        
        // If not found, check parent or sibling elements of price cell
        if (!currency && priceCell) {
          const priceCellParent = priceCell.parentElement;
          if (priceCellParent) {
            const parentText = priceCellParent.text.trim();
            const parentCurrencyMatch = parentText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
            if (parentCurrencyMatch) {
              currency = parentCurrencyMatch[1].toUpperCase();
              console.log(`✅ Currency extracted from price cell parent for ${symbol}: ${currency}`);
            }
          }
          
          // Check next sibling (currency often appears after price)
          if (!currency && priceCell.nextElementSibling) {
            const siblingText = priceCell.nextElementSibling.text.trim();
            const siblingCurrencyMatch = siblingText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
            if (siblingCurrencyMatch) {
              currency = siblingCurrencyMatch[1].toUpperCase();
              console.log(`✅ Currency extracted from price cell sibling for ${symbol}: ${currency}`);
            }
          }
        }
        
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
        
        // Use extracted currency if found, otherwise fallback to extractCurrency function
        if (!currency) {
          currency = extractCurrency(symbol, name, category);
        } else {
          console.log(`✅ Currency extracted from TradingView table for ${symbol}: ${currency}`);
        }
        
        commodities.push({
          symbol,
          name,
          price,
          currency,
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
      // Try to fetch from category page first (MUCH faster - single request vs 33 requests)
      try {
        console.log('🚀 Attempting to fetch freight data from TradingView category page (fast method)...');
        const categoryStartTime = Date.now();
        const categoryData = await scrapeTradingViewCategory('freight');
        const parsedCommodities = normalizeCommoditySymbols(parseCommoditiesData(categoryData, category));
        
        // Filter to only freight-related symbols using our known symbols list
        const knownSymbols = new Set(FREIGHT_SYMBOLS.map(s => s.symbol.replace('!', '')));
        const freightFromCategory = parsedCommodities.filter(c => {
          const symbolBase = c.symbol.replace('!', '').replace('NYMEX:', '');
          return knownSymbols.has(symbolBase) ||
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
                 c.name.toLowerCase().includes('container');
        });
        
        const categoryTime = ((Date.now() - categoryStartTime) / 1000).toFixed(1);
        
        if (freightFromCategory.length > 0) {
          console.log(`✅ Successfully fetched ${freightFromCategory.length} freight commodities from category page in ${categoryTime}s`);
          const estimatedIndividualTime = 33 * 5; // ~5s per symbol average
          const speedup = (estimatedIndividualTime / parseFloat(categoryTime)).toFixed(1);
          console.log(`   ⚡ Estimated ${speedup}x faster than individual requests (would take ~${estimatedIndividualTime}s)`);
          saveToCache(category, freightFromCategory);
          return freightFromCategory;
        } else {
          console.warn(`⚠️  Category page returned ${parsedCommodities.length} commodities but none matched freight symbols`);
        }
      } catch (error) {
        console.warn('⚠️  Failed to fetch freight from category page, falling back to individual symbols:', error);
      }
      
      // Fallback to individual symbol pages (optimized parallel processing)
      console.log('🔄 Falling back to individual symbol scraping (slower but more reliable)...');
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
/**
 * Advanced symbol fetching with optimized parsing and error handling
 */
async function fetchFreightSymbolData(symbol: string, name: string, type: Commodity['type']): Promise<Commodity | null> {
  try {
    // Check for cached valid data first (quick path)
    const cacheKey = `freight_symbol_${symbol}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        const cacheAge = Date.now() - (cachedData.timestamp || 0);
        // Use cache if less than 10 minutes old
        if (cacheAge < 10 * 60 * 1000 && cachedData.price > 0) {
          return cachedData;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    
    // Fetch with timeout
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, 25000);
    });
    
    const fetchPromise = scrapeTradingViewSymbol(symbol);
    const data = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!data || !data.data) {
      return null;
    }

    // Parse the HTML to extract data
    const htmlContent = data.data;
    const root = parse(htmlContent);
    
    // Enhanced CAPTCHA detection with multiple indicators
    const captchaIndicators = [
      htmlContent.includes('Complete the test below'),
      htmlContent.includes('Just one more step'),
      htmlContent.includes('challenge-platform'),
      htmlContent.includes('cloudflare') && htmlContent.length < 20000, // Cloudflare CAPTCHA
      root.querySelector('[class*="captcha"]') !== null,
      root.querySelector('[id*="captcha"]') !== null,
      root.querySelector('[class*="challenge"]') !== null,
      root.querySelector('[id*="challenge"]') !== null,
      root.querySelector('[class*="cf-"]') !== null, // Cloudflare classes
    ];
    
    if (captchaIndicators.some(indicator => indicator === true)) {
      console.warn(`🚫 CAPTCHA or protection page detected for ${symbol}`);
      console.warn(`   HTML length: ${htmlContent.length} chars`);
      console.warn(`   Indicators matched: ${captchaIndicators.filter(i => i).length}/${captchaIndicators.length}`);
      return null;
    }
    
    // Extract price AND currency (optimized for freight)
    let price = 0;
    let currency = '';
    
    // Try to extract from JSON embedded data first (most reliable and fastest)
    try {
      // Look for JSON-LD or script tags with symbol data
      const jsonScripts = root.querySelectorAll('script[type="application/json"], script[id*="__NEXT_DATA__"], script[id*="__TV_DATA__"]');
      for (const script of jsonScripts) {
        try {
          const jsonData = JSON.parse(script.text);
          // Navigate through possible JSON structures - look for price AND currency
          const priceData = jsonData?.props?.pageProps?.symbol || 
                           jsonData?.symbol || 
                           jsonData?.data?.symbol ||
                           jsonData?.quotes?.[0];
          
          if (priceData?.price || priceData?.last_price) {
            price = priceData.price || priceData.last_price || 0;
            
            // Try to extract currency from JSON
            if (priceData?.currency || priceData?.quote_currency || priceData?.currency_code) {
              currency = (priceData.currency || priceData.quote_currency || priceData.currency_code).toUpperCase();
              console.log(`✅ Extracted currency from JSON for ${symbol}: ${currency}`);
            }
            
            if (price > 0) {
              console.log(`✅ Extracted price from JSON for ${symbol}: ${price}`);
              if (currency) break; // If we have both, we're done
            }
          }
        } catch (e) {
          // Continue to next script or fallback
        }
      }
    } catch (e) {
      // Continue to HTML selectors
    }
    
    // Search for price elements in different possible selectors (optimized - price AND currency)
    if (price === 0 || !currency) {
      // Prioritized selectors (most common first for faster parsing)
      const priceSelectors = [
        '.tv-symbol-price-quote__value',
        '[data-field="last_price"]',
        '[data-field="price"]',
        '.js-symbol-last',
        '.tv-symbol-header__price',
        '[class*="price-quote"]',
        '[class*="last-price"]',
        '[class*="symbol-price"]',
        '[class*="tv-symbol-price"]',
        '[class*="price-value"]',
        '[data-field="last"]'
      ];
      
      for (const selector of priceSelectors) {
        const priceElements = root.querySelectorAll(selector);
        for (const priceElement of priceElements) {
          const rawPriceText = priceElement.text.trim();
          if (!rawPriceText || rawPriceText.length === 0) continue;
          
          // Try to extract currency from the same element or nearby
          if (!currency) {
            // Look for currency in the same element text (e.g., "603 USD")
            const currencyMatch = rawPriceText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
            if (currencyMatch) {
              currency = currencyMatch[1].toUpperCase();
              console.log(`✅ Extracted currency from price element for ${symbol}: ${currency}`);
            }
            
            // If not found, check parent or sibling elements
            if (!currency) {
              const parent = priceElement.parentElement;
              if (parent) {
                const parentText = parent.text.trim();
                const parentCurrencyMatch = parentText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
                if (parentCurrencyMatch) {
                  currency = parentCurrencyMatch[1].toUpperCase();
                  console.log(`✅ Extracted currency from parent element for ${symbol}: ${currency}`);
                }
              }
              
              // Check next sibling
              if (!currency && priceElement.nextElementSibling) {
                const siblingText = priceElement.nextElementSibling.text.trim();
                const siblingCurrencyMatch = siblingText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
                if (siblingCurrencyMatch) {
                  currency = siblingCurrencyMatch[1].toUpperCase();
                  console.log(`✅ Extracted currency from sibling element for ${symbol}: ${currency}`);
                }
              }
            }
          }
          
          // Parse prices correctly for TradingView format
          let priceText = rawPriceText;
          
          // Extract currency before removing it (if not already found)
          if (!currency) {
            const currencyInText = priceText.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i);
            if (currencyInText) {
              currency = currencyInText[1].toUpperCase();
            }
          }
          
          // Remove units and spaces (but keep currency info if found)
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
          
          const parsedPrice = parseFloat(priceText) || 0;
          
          if (parsedPrice > 0) {
            price = parsedPrice;
            console.log(`✅ Parsed price for ${symbol}: ${price}`);
            if (currency) break; // If we have both, we're done
          }
        }
        if (price > 0 && currency) break; // Exit if we have both
      }
    }
    
    // If no price found, search in general content with optimized patterns (price AND currency)
    if (price === 0 || !currency) {
      // Patterns that include currency (e.g., "603 USD", "price": 603, "currency": "USD")
      const priceCurrencyPatterns = [
        /(\d+(?:[.,]\d+)?)\s+(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY|INR|BRL|MXN|ZAR|RUB|KRW|SGD|HKD|TRY|PLN|SEK|NOK|DKK|CZK|HUF|ILS|CLP|COP|ARS|PEN|PHP|THB|MYR|IDR|VND)\b/i,
        /"price":\s*(\d+\.?\d*)[^}]*"currency":\s*"([A-Z]{3})"/i,
        /"last_price":\s*(\d+\.?\d*)[^}]*"currency":\s*"([A-Z]{3})"/i,
        /"price":\s*(\d+\.?\d*)[^}]*"quote_currency":\s*"([A-Z]{3})"/i
      ];
      
      for (const pattern of priceCurrencyPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          let matchedPrice = match[1];
          const matchedCurrency = match[2]?.toUpperCase();
          
          // Simple number format handling
          if (matchedPrice.includes(',')) {
            matchedPrice = matchedPrice.replace(/,/g, '');
          }
          
          const parsedPrice = parseFloat(matchedPrice) || 0;
          if (parsedPrice > 0) {
            price = parsedPrice;
            if (matchedCurrency) {
              currency = matchedCurrency;
              console.log(`✅ Found price and currency in content for ${symbol}: ${price} ${currency}`);
            } else {
              console.log(`✅ Found price in content for ${symbol}: ${price}`);
            }
            if (price > 0 && currency) break; // Exit if we have both
          }
        }
      }
      
      // Fallback: patterns for price only (if currency not found yet)
      if (price > 0 && !currency) {
        const pricePatterns = [
          /"price":\s*(\d+\.?\d*)/i,
          /"last_price":\s*(\d+\.?\d*)/i,
          /"lastPrice":\s*(\d+\.?\d*)/i,
          /(?:last|price|close)[\s:]*([+-]?\d{1,3}(?:,\d{3})*\.\d{1,4})/i,
          /(?:last|price|close)[\s:]*([+-]?\d+\.\d{1,4})/i
        ];
        
        for (const pattern of pricePatterns) {
          const priceMatch = htmlContent.match(pattern);
          if (priceMatch) {
            let matchedPrice = priceMatch[1];
            
            // Simple number format handling
            if (matchedPrice.includes(',')) {
              matchedPrice = matchedPrice.replace(/,/g, '');
            }
            
            const parsedPrice = parseFloat(matchedPrice) || 0;
            if (parsedPrice > 0) {
              price = parsedPrice;
              console.log(`✅ Found price in content for ${symbol}: ${price}`);
              break;
            }
          }
        }
      }
    }
    
    // Return null if no valid price found
    if (price === 0) {
      console.warn(`⚠️  No valid price found for ${symbol} (HTML length: ${htmlContent.length} chars)`);
      return null;
    }
    
    // For freight, we only keep the price - other variables are not needed (optimization)
    // Use extracted currency if found, otherwise fallback to extractCurrency function
    if (!currency) {
      currency = extractCurrency(symbol, name, 'freight');
      console.log(`⚠️  Currency not found in HTML for ${symbol}, using fallback: ${currency}`);
    } else {
      console.log(`✅ Currency extracted from TradingView page for ${symbol}: ${currency}`);
    }
    
    const result = {
      symbol,
      name,
      price,
      currency,
      percentChange: 0, // Not needed for freight
      absoluteChange: 0, // Not needed for freight
      high: 0, // Not needed for freight
      low: 0, // Not needed for freight
      technicalEvaluation: 'Positive' as const, // Default value, not needed for freight
      type,
      category: 'freight' as const
    };
    
    // Cache successful results for quick access (10 min TTL)
    if (price > 0) {
      try {
        const cacheKey = `freight_symbol_${symbol}`;
        const cacheData = {
          ...result,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (e) {
        // Ignore cache errors
      }
    }
    
    return result;
    
  } catch (error) {
    return null;
  }
}

/**
 * Retrieves all freight data in parallel
 */
/**
 * Advanced freight data scraping with:
 * - Worker pool with intelligent queue
 * - Exponential backoff retry with jitter
 * - Circuit breaker pattern
 * - Adaptive rate limiting
 * - Smart caching and recovery
 * - Priority-based processing
 * - Advanced metrics and monitoring
 */
async function fetchFreightData(): Promise<Commodity[]> {
  console.log('🚀 Starting ADVANCED optimized freight data scraping...');
  console.log(`📊 Total symbols to fetch: ${FREIGHT_SYMBOLS.length}`);
  
  const startTime = Date.now();
  const results: Commodity[] = [];
  const metrics = {
    success: 0,
    captcha: 0,
    timeout: 0,
    error: 0,
    retries: 0,
    cacheHits: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    responseTimes: [] as number[]
  };
  
  // Advanced configuration with adaptive settings
  const config = {
    // Concurrency settings (adaptive based on success rate)
    initialConcurrency: 8, // Start with 8 parallel workers
    maxConcurrency: 12, // Maximum parallel workers
    minConcurrency: 3, // Minimum if many failures
    
    // Timing settings
    baseDelay: 1500, // Base delay between workers (1.5s)
    minDelay: 800, // Minimum delay
    maxDelay: 5000, // Maximum delay
    batchDelay: 2000, // Delay between batches (2s)
    
    // Timeout settings
    requestTimeout: 25000, // 25s per request
    retryTimeout: 15000, // 15s for retries
    
    // Retry settings
    maxRetries: 3, // Maximum retries per symbol
    retryBackoffBase: 2, // Exponential backoff base
    retryJitter: 0.3, // 30% jitter for retry delays
    
    // Circuit breaker settings
    failureThreshold: 0.5, // Open circuit if >50% failures
    successThreshold: 0.7, // Close circuit if >70% success
    circuitTimeout: 30000, // 30s before attempting to close circuit
    
    // Cache settings
    cacheValidationAge: 2 * 60 * 60 * 1000, // 2 hours for cache validation
    useStaleCache: true, // Use stale cache as fallback
  };
  
  // Circuit breaker state
  let circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  let circuitFailures = 0;
  let circuitSuccesses = 0;
  let circuitOpenTime = 0;
  
  // Adaptive concurrency based on success rate
  let currentConcurrency = config.initialConcurrency;
  let recentSuccessRate = 1.0;
  
  // Priority queue: prioritize symbols that failed before (retry them first)
  const symbolQueue: Array<{ symbol: string; name: string; type: Commodity['type']; priority: number; retries: number }> = [];
  const failedSymbols: Map<string, number> = new Map();
  
  // Initialize queue with all symbols (prioritize by type: container > freight_route > others)
  FREIGHT_SYMBOLS.forEach(({ symbol, name, type }) => {
    let priority = 1;
    if (type === 'container') priority = 3;
    else if (type === 'freight_route') priority = 2;
    
    symbolQueue.push({ symbol, name, type, priority, retries: 0 });
  });
  
  // Sort by priority (higher first)
  symbolQueue.sort((a, b) => b.priority - a.priority);
  
  /**
   * Exponential backoff with jitter
   */
  const getRetryDelay = (attempt: number): number => {
    const baseDelay = 1000 * Math.pow(config.retryBackoffBase, attempt);
    const jitter = baseDelay * config.retryJitter * (Math.random() * 2 - 1);
    return Math.min(baseDelay + jitter, 10000);
  };
  
  /**
   * Fetch symbol with advanced retry logic and circuit breaker
   */
  const fetchSymbolAdvanced = async (
    symbol: string,
    name: string,
    type: Commodity['type'],
    attempt: number = 0
  ): Promise<{ result: Commodity | null; wasTimeout: boolean; wasCaptcha: boolean; error?: any }> => {
    metrics.totalRequests++;
    const requestStart = Date.now();
    
    // Check circuit breaker
    if (circuitState === 'open') {
      if (Date.now() - circuitOpenTime > config.circuitTimeout) {
        circuitState = 'half-open';
        console.log(`🔄 Circuit breaker: Attempting to close (half-open state)`);
      } else {
        return { result: null, wasTimeout: false, wasCaptcha: false, error: new Error('Circuit breaker open') };
      }
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    let wasTimeout = false;
    let wasCaptcha = false;
    
    try {
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          wasTimeout = true;
          resolve(null);
        }, config.requestTimeout);
      });
      
      const fetchPromise = fetchFreightSymbolData(symbol, name, type);
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (timeoutId) clearTimeout(timeoutId);
      
      const responseTime = Date.now() - requestStart;
      metrics.responseTimes.push(responseTime);
      
      if (result) {
        // Success - update circuit breaker
        if (circuitState === 'half-open') {
          circuitSuccesses++;
          if (circuitSuccesses >= 3) {
            circuitState = 'closed';
            circuitSuccesses = 0;
            console.log(`✅ Circuit breaker: Closed (recovered)`);
          }
        }
        return { result, wasTimeout: false, wasCaptcha: false };
      } else {
        // Check if it was CAPTCHA
        wasCaptcha = true;
        return { result: null, wasTimeout: false, wasCaptcha: true };
      }
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Update circuit breaker on failure
      circuitFailures++;
      const totalAttempts = circuitFailures + circuitSuccesses;
      if (totalAttempts > 0) {
        const failureRate = circuitFailures / totalAttempts;
        if (failureRate > config.failureThreshold && circuitState === 'closed') {
          circuitState = 'open';
          circuitOpenTime = Date.now();
          console.warn(`⚠️  Circuit breaker: OPENED (failure rate: ${(failureRate * 100).toFixed(1)}%)`);
        }
      }
      
      return { result: null, wasTimeout: wasTimeout, wasCaptcha: false, error };
    }
  };
  
  /**
   * Worker function with retry logic
   */
  const processSymbol = async (
    item: { symbol: string; name: string; type: Commodity['type']; priority: number; retries: number }
  ): Promise<Commodity | null> => {
    const { symbol, name, type } = item;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      if (attempt > 0) {
        metrics.retries++;
        const delay = getRetryDelay(attempt - 1);
        console.log(`🔄 Retry ${attempt}/${config.maxRetries} for ${symbol} after ${delay.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const { result, wasTimeout, wasCaptcha, error } = await fetchSymbolAdvanced(symbol, name, type, attempt);
      
      if (result) {
        metrics.success++;
        recentSuccessRate = (recentSuccessRate * 0.7) + (1.0 * 0.3); // Exponential moving average
        return result;
      }
      
      if (wasCaptcha) {
        metrics.captcha++;
        failedSymbols.set(symbol, (failedSymbols.get(symbol) || 0) + 1);
        return null;
      }
      
      if (wasTimeout) {
        metrics.timeout++;
        lastError = new Error('Timeout');
      } else if (error) {
        metrics.error++;
        lastError = error;
      }
    }
    
    // All retries failed
    failedSymbols.set(symbol, (failedSymbols.get(symbol) || 0) + 1);
    return null;
  };
  
  /**
   * Worker pool with adaptive concurrency
   */
  const processQueue = async (): Promise<void> => {
    const workers: Promise<void>[] = [];
    let queueIndex = 0;
    
    const worker = async (workerId: number): Promise<void> => {
      while (queueIndex < symbolQueue.length) {
        const index = queueIndex++;
        if (index >= symbolQueue.length) break;
        
        const item = symbolQueue[index];
        const { symbol } = item;
        
        // Adaptive delay based on success rate
        const adaptiveDelay = Math.max(
          config.minDelay,
          Math.min(
            config.maxDelay,
            config.baseDelay * (1 / recentSuccessRate)
          )
        );
        
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
        }
        
        const result = await processSymbol(item);
        
        if (result) {
          results.push(result);
          console.log(`✅ [${results.length}/${FREIGHT_SYMBOLS.length}] ${symbol} - Price: ${result.price.toFixed(2)}`);
        } else {
          console.warn(`❌ Failed ${symbol} after ${item.retries + 1} attempts`);
        }
        
        // Adaptive concurrency adjustment
        if (results.length % 5 === 0) {
          const currentSuccessRate = metrics.success / metrics.totalRequests;
          if (currentSuccessRate > 0.8 && currentConcurrency < config.maxConcurrency) {
            currentConcurrency = Math.min(config.maxConcurrency, currentConcurrency + 1);
            console.log(`📈 Increasing concurrency to ${currentConcurrency} (success rate: ${(currentSuccessRate * 100).toFixed(1)}%)`);
          } else if (currentSuccessRate < 0.3 && currentConcurrency > config.minConcurrency) {
            currentConcurrency = Math.max(config.minConcurrency, currentConcurrency - 1);
            console.log(`📉 Decreasing concurrency to ${currentConcurrency} (success rate: ${(currentSuccessRate * 100).toFixed(1)}%)`);
          }
        }
      }
    };
    
    // Start workers
    const activeWorkers = Math.min(currentConcurrency, symbolQueue.length);
    for (let i = 0; i < activeWorkers; i++) {
      workers.push(worker(i));
    }
    
    await Promise.all(workers);
  };
  
  // Process the queue
  await processQueue();
  
  // Calculate metrics
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
  metrics.avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;
  
  const successRate = (metrics.success / FREIGHT_SYMBOLS.length) * 100;
  
  console.log(`\n📊 ADVANCED Freight Scraping Summary (${elapsedTime}s):`);
  console.log(`   ✅ Success: ${metrics.success}/${FREIGHT_SYMBOLS.length} (${successRate.toFixed(1)}%)`);
  console.log(`   ⚠️  CAPTCHA: ${metrics.captcha}`);
  console.log(`   ⏱️  Timeouts: ${metrics.timeout}`);
  console.log(`   ❌ Errors: ${metrics.error}`);
  console.log(`   🔄 Retries: ${metrics.retries}`);
  console.log(`   ⚡ Avg Response: ${metrics.avgResponseTime.toFixed(0)}ms`);
  console.log(`   📈 Final Concurrency: ${currentConcurrency}`);
  console.log(`   🔌 Circuit State: ${circuitState}`);
  
  // Smart cache merging
  if (results.length < FREIGHT_SYMBOLS.length * 0.5 && config.useStaleCache) {
    console.log(`\n💾 Merging with cached data (${results.length}/${FREIGHT_SYMBOLS.length} fresh)...`);
    
    const staleCache = loadFromCache('freight');
    if (staleCache && Array.isArray(staleCache) && staleCache.length > 0) {
      const cachedSymbols = new Set(results.map(r => r.symbol));
      const additionalFromCache = staleCache.filter((item: any) => 
        item && item.symbol && !cachedSymbols.has(item.symbol)
      );
      
      if (additionalFromCache.length > 0) {
        metrics.cacheHits = additionalFromCache.length;
        console.log(`   ➕ Added ${additionalFromCache.length} symbols from cache`);
        results.push(...additionalFromCache);
      }
    }
  }
  
  // Final fallback
  if (results.length === 0) {
    console.warn('\n⚠️ No freight symbols scraped. Using stale cache as fallback...');
    const staleCache = loadFromCache('freight');
    if (staleCache && Array.isArray(staleCache) && staleCache.length > 0) {
      return staleCache as Commodity[];
    }
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
  const currency = extractCurrency(symbol, name, 'bunker');
  return {
    symbol,
    name,
    price,
    currency,
    percentChange,
    absoluteChange,
    high: high > 0 ? high : (symbol.includes('Gibraltar') ? 0 : price * 1.05),
    low: low > 0 ? low : (symbol.includes('Gibraltar') ? 0 : price * 0.95),
    technicalEvaluation: absoluteChange >= 0 ? 'Positive' : 'Negative',
    type,
    category: 'bunker'
  };
}

