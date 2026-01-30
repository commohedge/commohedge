import { useState, useEffect, useCallback, useRef } from 'react';
import CommodityDataService from '../services/CommodityDataService';
import StrategyImportService from '../services/StrategyImportService';
import {
  CommodityMarketData, 
  CommodityExposureData, 
  CommodityHedgingInstrument, 
  CommodityRiskMetrics, 
  CommodityExposure,
  CommodityUnit
} from '@/types/Commodity';

interface UseCommodityDataReturn {
  // Data
  marketData: CommodityMarketData;
  exposures: CommodityExposureData[];
  instruments: CommodityHedgingInstrument[];
  riskMetrics: CommodityRiskMetrics;
  commodityExposures: CommodityExposure[];
  
  // Actions
  addExposure: (exposure: Omit<CommodityExposureData, 'id'>) => void;
  updateExposure: (id: string, updates: Partial<Omit<CommodityExposureData, 'id'>>) => boolean;
  deleteExposure: (id: string) => boolean;
  addInstrument: (instrument: Omit<CommodityHedgingInstrument, 'id' | 'mtm'>) => void;
  updateInstrument: (id: string, updates: Partial<Omit<CommodityHedgingInstrument, 'id'>>) => boolean;
  deleteInstrument: (id: string) => boolean;
  updateMarketData: () => void;
  calculateForwardPrice: (commodity: string, tenor: string) => number;
  calculateOptionPrice: (
    optionType: 'call' | 'put',
    commodity: string,
    strike: number,
    timeToMaturity: number,
    volatility?: number
  ) => number;
  generateStressScenarios: () => Array<{
    name: string;
    description: string;
    shocks: { [commodity: string]: number };
    impact: number;
  }>;
  calculateVarContributions: () => { [commodity: string]: number };
  syncWithHedgingInstruments: () => void;
  autoGenerateExposures: () => void;
  clearAllData: () => void;
  
  // State
  isLoading: boolean;
  lastUpdate: Date;
  isLiveMode: boolean;
  setLiveMode: (enabled: boolean) => void;
}

export const useCommodityData = (): UseCommodityDataReturn => {
  const serviceRef = useRef<CommodityDataService>(new CommodityDataService());
  const strategyImportServiceRef = useRef<StrategyImportService>(StrategyImportService.getInstance());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  // State for reactive data
  const [marketData, setMarketData] = useState<CommodityMarketData>(() => 
    serviceRef.current.getMarketData()
  );
  const [exposures, setExposures] = useState<CommodityExposureData[]>(() => 
    serviceRef.current.getExposures()
  );
  const [instruments, setInstruments] = useState<CommodityHedgingInstrument[]>(() => 
    serviceRef.current.getInstruments()
  );
  const [riskMetrics, setRiskMetrics] = useState<CommodityRiskMetrics>(() => 
    serviceRef.current.calculateRiskMetrics()
  );
  const [commodityExposures, setCommodityExposures] = useState<CommodityExposure[]>(() => 
    serviceRef.current.getCommodityExposures()
  );

  // Load data from localStorage and sync with other parts of the application
  useEffect(() => {
    const loadDataFromStorage = () => {
      try {
        // Load exposures from localStorage
        const savedExposures = localStorage.getItem('commodityExposures');
        if (savedExposures) {
          const exposuresData = JSON.parse(savedExposures);
          exposuresData.forEach((exposure: any) => {
            // Convert date strings back to Date objects
            exposure.maturity = new Date(exposure.maturity);
            serviceRef.current.addExposure(exposure);
          });
        }

        // Sync with hedging instruments from StrategyImportService
        syncWithHedgingInstruments();
        
        // Auto-generate exposures if none exist but instruments do
        autoGenerateExposures();
        
        // Update all state
        refreshAllData();
      } catch (error) {
        console.error('Error loading data from storage:', error);
      }
    };

    loadDataFromStorage();

    // Listen for updates from other parts of the application
    const handleHedgingInstrumentsUpdate = () => {
      syncWithHedgingInstruments();
      autoGenerateExposures();
      refreshAllData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hedgingInstruments' || e.key === 'commodityExposures') {
        loadDataFromStorage();
      }
    };

    // Add event listeners
    window.addEventListener('hedgingInstrumentsUpdated', handleHedgingInstrumentsUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('hedgingInstrumentsUpdated', handleHedgingInstrumentsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save exposures to localStorage whenever they change
  useEffect(() => {
    const saveExposuresToStorage = () => {
      try {
        const exposuresData = serviceRef.current.getExposures();
        localStorage.setItem('commodityExposures', JSON.stringify(exposuresData));
      } catch (error) {
        console.error('Error saving exposures to storage:', error);
      }
    };

    saveExposuresToStorage();
  }, [exposures]);

  // Live mode updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      serviceRef.current.updateMarketData();
      refreshAllData();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isLiveMode]);

  // Helper function to get commodity name and unit
  const getCommodityInfo = useCallback((commoditySymbol: string): { name: string; unit: CommodityUnit; contractSize: number } => {
    // Map des unités de CURRENCY_PAIRS vers CommodityUnit
    const unitMapping: { [key: string]: CommodityUnit } = {
      'BBL': 'barrel',
      'bbl': 'barrel',
      'MMBTU': 'MMBtu',
      'MMBtu': 'MMBtu',
      'GAL': 'gallon',
      'gal': 'gallon',
      'OZ': 'troy ounce',
      'oz': 'troy ounce',
      'LB': 'pound',
      'lb': 'pound',
      'MT': 'metric ton',
      'mt': 'metric ton',
      'BU': 'bushel',
      'bu': 'bushel',
    };
    
    // Map des contract sizes standards par unité
    const contractSizeMap: { [key: string]: number } = {
      'barrel': 1000,
      'MMBtu': 10000,
      'gallon': 42000, // 1000 barrels = 42000 gallons
      'troy ounce': 100,
      'pound': 25000,
      'metric ton': 25,
      'bushel': 5000,
    };
    
    // Commodity map avec toutes les commodities et leurs unités correctes
    const commodityMap: { [key: string]: { name: string; unit: CommodityUnit; contractSize: number } } = {
      // Energy
      'WTI': { name: 'WTI Crude Oil', unit: 'barrel', contractSize: 1000 },
      'BRENT': { name: 'Brent Crude Oil', unit: 'barrel', contractSize: 1000 },
      'NATGAS': { name: 'Natural Gas', unit: 'MMBtu', contractSize: 10000 },
      'HEATING': { name: 'Heating Oil', unit: 'gallon', contractSize: 42000 },
      'RBOB': { name: 'Gasoline RBOB', unit: 'gallon', contractSize: 42000 },
      
      // Precious Metals
      'GOLD': { name: 'Gold', unit: 'troy ounce', contractSize: 100 },
      'SILVER': { name: 'Silver', unit: 'troy ounce', contractSize: 5000 },
      'PLATINUM': { name: 'Platinum', unit: 'troy ounce', contractSize: 50 },
      'PALLADIUM': { name: 'Palladium', unit: 'troy ounce', contractSize: 100 },
      
      // Base Metals
      'COPPER': { name: 'Copper', unit: 'pound', contractSize: 25000 },
      'ALUMINUM': { name: 'Aluminum', unit: 'metric ton', contractSize: 25 },
      'ZINC': { name: 'Zinc', unit: 'metric ton', contractSize: 25 },
      'NICKEL': { name: 'Nickel', unit: 'metric ton', contractSize: 6 },
      
      // Agriculture
      'CORN': { name: 'Corn', unit: 'bushel', contractSize: 5000 },
      'WHEAT': { name: 'Wheat', unit: 'bushel', contractSize: 5000 },
      'SOYBEAN': { name: 'Soybean', unit: 'bushel', contractSize: 5000 },
      'COFFEE': { name: 'Coffee', unit: 'pound', contractSize: 37500 },
      'SUGAR': { name: 'Sugar', unit: 'pound', contractSize: 112000 },
      'COTTON': { name: 'Cotton', unit: 'pound', contractSize: 50000 },
      
      // Livestock
      'CATTLE': { name: 'Live Cattle', unit: 'pound', contractSize: 40000 },
      'HOGS': { name: 'Lean Hogs', unit: 'pound', contractSize: 40000 },
    };
    
    // Vérifier d'abord dans le map direct
    if (commodityMap[commoditySymbol]) {
      return commodityMap[commoditySymbol];
    }
    
    // ✅ Vérifier dans les commodities personnalisées depuis localStorage
    try {
      const savedCustomPairs = localStorage.getItem('customCurrencyPairs');
      if (savedCustomPairs) {
        const customPairs: Array<{ symbol: string; name: string; base: string; quote: string }> = JSON.parse(savedCustomPairs);
        const customCommodity = customPairs.find(pair => pair.symbol === commoditySymbol || pair.symbol.toUpperCase() === commoditySymbol.toUpperCase());
        if (customCommodity) {
          // Convertir l'unité depuis le champ 'base' vers CommodityUnit
          const baseUnit = customCommodity.base.toUpperCase();
          const mappedUnit = unitMapping[baseUnit] || 'barrel'; // Fallback sur barrel si unité inconnue
          const contractSize = contractSizeMap[mappedUnit] || 1000;
          
          return {
            name: customCommodity.name,
            unit: mappedUnit as CommodityUnit,
            contractSize: contractSize
          };
        }
      }
    } catch (error) {
      console.warn(`[getCommodityInfo] Error reading custom commodities from localStorage:`, error);
    }
    
    // Fallback: essayer de trouver dans CURRENCY_PAIRS (import dynamique si nécessaire)
    // Pour l'instant, utiliser un fallback intelligent basé sur le symbole
    const symbolUpper = commoditySymbol.toUpperCase();
    
    // Détection basée sur le nom du symbole
    if (symbolUpper.includes('GOLD') || symbolUpper.includes('SILVER') || symbolUpper.includes('PLATINUM') || symbolUpper.includes('PALLADIUM')) {
      return { name: commoditySymbol, unit: 'troy ounce', contractSize: 100 };
    }
    if (symbolUpper.includes('OIL') || symbolUpper.includes('CRUDE') || symbolUpper === 'WTI' || symbolUpper === 'BRENT') {
      return { name: commoditySymbol, unit: 'barrel', contractSize: 1000 };
    }
    if (symbolUpper.includes('GAS') || symbolUpper === 'NATGAS') {
      return { name: commoditySymbol, unit: 'MMBtu', contractSize: 10000 };
    }
    if (symbolUpper.includes('CORN') || symbolUpper.includes('WHEAT') || symbolUpper.includes('SOY') || symbolUpper.includes('BEAN')) {
      return { name: commoditySymbol, unit: 'bushel', contractSize: 5000 };
    }
    if (symbolUpper.includes('COPPER') || symbolUpper.includes('COFFEE') || symbolUpper.includes('SUGAR') || symbolUpper.includes('COTTON')) {
      return { name: commoditySymbol, unit: 'pound', contractSize: 25000 };
    }
    if (symbolUpper.includes('ALUMINUM') || symbolUpper.includes('ZINC') || symbolUpper.includes('NICKEL')) {
      return { name: commoditySymbol, unit: 'metric ton', contractSize: 25 };
    }
    
    // Dernier fallback: utiliser 'barrel' mais avec un warning
    console.warn(`[getCommodityInfo] Unknown commodity symbol: ${commoditySymbol}, using default unit 'barrel'. Please add this commodity manually with its correct unit.`);
    return { 
      name: commoditySymbol, 
      unit: 'barrel', 
      contractSize: 1000 
    };
  }, []);

  const syncWithHedgingInstruments = useCallback(() => {
    try {
      // Get hedging instruments from StrategyImportService
      const hedgingInstruments = strategyImportServiceRef.current.getHedgingInstruments();
      
      // Clear existing instruments in CommodityDataService (keep exposures)
      serviceRef.current.clearInstruments();
      
      // Convert and add hedging instruments to CommodityDataService
      hedgingInstruments.forEach(hedgingInstrument => {
        const commodityInfo = getCommodityInfo(hedgingInstrument.currency);
        
        // Convert StrategyImportService HedgingInstrument to CommodityDataService HedgingInstrument
        const commodityInstrument: Omit<CommodityHedgingInstrument, 'id' | 'mtm'> = {
          type: mapInstrumentType(hedgingInstrument.type),
          commodity: hedgingInstrument.currency, // Mapper currency → commodity
          commodityName: commodityInfo.name,
          notional: hedgingInstrument.notional,
          unit: commodityInfo.unit,
          contractSize: commodityInfo.contractSize,
          strike: hedgingInstrument.strike,
          premium: hedgingInstrument.premium,
          maturity: new Date(hedgingInstrument.maturity),
          counterparty: hedgingInstrument.counterparty || 'Strategy Import',
          hedgeAccounting: hedgingInstrument.hedge_accounting || false,
          effectivenessRatio: hedgingInstrument.hedgeQuantity || hedgingInstrument.effectiveness_ratio || 95,
          physicalDelivery: false, // Default to cash settlement
          settlementCurrency: 'USD', // Default to USD for commodities
          volumeType: hedgingInstrument.volumeType // ✅ Transmettre le volumeType pour distinguer long de short
        };
        
        serviceRef.current.addInstrument(commodityInstrument);
      });
    } catch (error) {
      console.error('Error syncing with hedging instruments:', error);
    }
  }, [getCommodityInfo]);

  // Auto-generate exposures based on hedging instruments
  const autoGenerateExposures = useCallback(() => {
    try {
      const currentExposures = serviceRef.current.getExposures();
      const currentInstruments = serviceRef.current.getInstruments();
      
      if (currentInstruments.length > 0) {
        console.log('Analyzing hedging instruments for new commodities and maturities...');
        
        const originalInstruments = strategyImportServiceRef.current.getHedgingInstruments();
        
        const existingCommodities = new Set(currentExposures.map(exp => exp.commodity));
        const existingMaturities = new Set(currentExposures.map(exp => exp.maturity.toISOString().split('T')[0]));
        
        const newCommodities = new Set<string>();
        const newMaturities = new Set<string>();
        const newCommodityMaturityPairs = new Set<string>();
        
        // Group instruments by commodity
        const commodityGroups: { [commodity: string]: { 
          commodityInstruments: CommodityHedgingInstrument[], 
          originalInstruments: any[],
          maturities: Set<string>
        } } = {};
        
        currentInstruments.forEach((instrument) => {
          const commodity = instrument.commodity;
          const maturityStr = instrument.maturity.toISOString().split('T')[0];
          
          if (!commodityGroups[commodity]) {
            commodityGroups[commodity] = { 
              commodityInstruments: [], 
              originalInstruments: [],
              maturities: new Set()
            };
          }
          commodityGroups[commodity].commodityInstruments.push(instrument);
          commodityGroups[commodity].maturities.add(maturityStr);
          
          if (!existingCommodities.has(commodity)) {
            newCommodities.add(commodity);
          }
          
          if (!existingMaturities.has(maturityStr)) {
            newMaturities.add(maturityStr);
          }
          
          const commodityMaturityPair = `${commodity}-${maturityStr}`;
          const existingPair = currentExposures.find(exp => 
            exp.commodity === commodity && 
            exp.maturity.toISOString().split('T')[0] === maturityStr
          );
          if (!existingPair) {
            newCommodityMaturityPairs.add(commodityMaturityPair);
          }
          
          // Find original instrument matching by commodity, notional, maturity, AND volumeType
          const originalInstrument = originalInstruments.find(orig => {
            const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
            const instMaturity = instrument.maturity.toISOString().split('T')[0];
            return orig.currency === instrument.commodity && 
                   Math.abs(orig.notional - instrument.notional) < 0.01 &&
                   origMaturity === instMaturity &&
                   orig.volumeType === instrument.volumeType; // Match by volumeType to distinguish long from short
          }) || originalInstruments.find(orig => {
            // Fallback: match without volumeType if exact match not found
            const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
            const instMaturity = instrument.maturity.toISOString().split('T')[0];
            return orig.currency === instrument.commodity && 
                   Math.abs(orig.notional - instrument.notional) < 0.01 &&
                   origMaturity === instMaturity;
          });
          if (originalInstrument) {
            // Only add if not already in the array (avoid duplicates)
            const exists = commodityGroups[commodity].originalInstruments.some(
              orig => orig.id === originalInstrument.id
            );
            if (!exists) {
            commodityGroups[commodity].originalInstruments.push(originalInstrument);
            }
          }
        });
        
        let expositionsCreated = 0;
        let expositionsUpdated = 0;
        let newCommoditiesDetected = Array.from(newCommodities);
        let newMaturitiesDetected = Array.from(newMaturities);
        
        // Create exposures grouped by commodity, maturity, AND type
        Object.entries(commodityGroups).forEach(([commodity, instrumentGroup]) => {
          const instruments = instrumentGroup.commodityInstruments;
          const originalInstruments = instrumentGroup.originalInstruments;
          
          // Group by maturity AND volumeType within each commodity
          // This ensures that long and short positions from different strategies are kept separate
          const maturityTypeGroups: { [key: string]: { 
            instruments: CommodityHedgingInstrument[], 
            originalInstruments: any[],
            positionType: 'long' | 'short'
          } } = {};
          
          instruments.forEach(instrument => {
            const maturityStr = instrument.maturity.toISOString().split('T')[0];
            
            // Find the original instrument for additional metadata
            const originalInstrument = originalInstruments.find(orig => {
              const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
              return origMaturity === maturityStr && 
                     Math.abs(orig.notional - instrument.notional) < 0.01 &&
                     orig.volumeType === instrument.volumeType; // Match by volumeType too
            }) || originalInstruments.find(orig => {
              const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
              return origMaturity === maturityStr && 
                     Math.abs(orig.notional - instrument.notional) < 0.01;
            });
            
            // Determine position type from the instrument's volumeType (now directly available)
            let positionType: 'long' | 'short' = 'long'; // default
            
            // ✅ PRIORITÉ 1: Utiliser volumeType directement depuis l'instrument (maintenant disponible)
            if (instrument.volumeType) {
              if (instrument.volumeType === 'long' || instrument.volumeType === 'short') {
                positionType = instrument.volumeType;
              } else if (instrument.volumeType === 'payable') {
                positionType = 'short';
              } else if (instrument.volumeType === 'receivable') {
                positionType = 'long';
              }
            } else if (originalInstrument && originalInstrument.volumeType) {
              // ✅ PRIORITÉ 2: Fallback sur originalInstrument si volumeType manquant dans l'instrument
              if (originalInstrument.volumeType === 'long' || originalInstrument.volumeType === 'short') {
                positionType = originalInstrument.volumeType;
              } else if (originalInstrument.volumeType === 'payable') {
                positionType = 'short';
              } else if (originalInstrument.volumeType === 'receivable') {
                positionType = 'long';
              }
            } else {
              // ✅ PRIORITÉ 3: Fallback sur le type d'instrument
              const hasLongInstruments = instrument.type === 'vanilla-call' || 
                                        instrument.type === 'forward' || 
                                        instrument.type === 'collar';
              positionType = hasLongInstruments ? 'long' : 'short';
            }
            
            console.log(`[GROUPING] ${commodity}-${maturityStr}: Instrument ${instrument.id} -> positionType=${positionType} (volumeType=${instrument.volumeType || 'N/A'})`);
            
            // Create a unique key for commodity-maturity-type combination
            const groupKey = `${maturityStr}-${positionType}`;
            
            if (!maturityTypeGroups[groupKey]) {
              maturityTypeGroups[groupKey] = {
                instruments: [],
                originalInstruments: [],
                positionType: positionType
              };
            }
            
            maturityTypeGroups[groupKey].instruments.push(instrument);
            if (originalInstrument) {
              // Only add if not already in the array (avoid duplicates)
              const exists = maturityTypeGroups[groupKey].originalInstruments.some(
                orig => orig.id === originalInstrument.id
              );
              if (!exists) {
                maturityTypeGroups[groupKey].originalInstruments.push(originalInstrument);
              }
            }
          });
          
          // Create an exposure for each commodity-maturity-type combination that doesn't exist
          Object.entries(maturityTypeGroups).forEach(([groupKey, groupData]) => {
            const maturityInstruments = groupData.instruments;
            const groupOriginalInstruments = groupData.originalInstruments;
            const positionType = groupData.positionType; // Already determined during grouping
            // Extract maturity from key: groupKey is "YYYY-MM-DD-long" or "YYYY-MM-DD-short"
            const maturityStr = groupKey.replace(/-long$|-short$/, '');
            
            console.log(`[COMMODITY EXPOSURE] Processing ${commodity}-${maturityStr}-${positionType} with ${maturityInstruments.length} instrument(s)`);
            console.log(`[COMMODITY EXPOSURE] Instruments volumeTypes: ${maturityInstruments.map(inst => inst.volumeType || 'N/A').join(', ')}`);
            
            // Find existing exposure by commodity, maturity, AND type (to distinguish long from short)
            const existingExposure = currentExposures.find(exp => 
              exp.commodity === commodity && 
              exp.maturity.toISOString().split('T')[0] === maturityStr &&
              exp.type === positionType
            );
            
            const totalNotional = maturityInstruments.reduce((sum, inst) => sum + inst.notional, 0);
            const maturityDate = new Date(maturityStr);
            
            let maxHedgeQuantity = 95;
            
            if (groupOriginalInstruments.length > 0) {
              const maturityOriginalInstruments = groupOriginalInstruments.filter(orig => {
                const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
                return origMaturity === maturityStr;
              });
              
              if (maturityOriginalInstruments.length > 0) {
                maxHedgeQuantity = Math.max(...maturityOriginalInstruments.map(inst => {
                  const quantity = inst.hedgeQuantity !== undefined ? 
                    inst.hedgeQuantity : 
                    (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
                  return quantity;
                }));
              } else {
                maxHedgeQuantity = Math.max(...groupOriginalInstruments.map(inst => {
                  const quantity = inst.hedgeQuantity !== undefined ? 
                    inst.hedgeQuantity : 
                    (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
                  return quantity;
                }));
              }
            }
            
            let underlyingExposureVolume = 0;
            
            if (groupOriginalInstruments.length > 0) {
              const maturityOriginalInstruments = groupOriginalInstruments.filter(orig => {
                const origMaturity = new Date(orig.maturity).toISOString().split('T')[0];
                return origMaturity === maturityStr;
              });
              
              if (maturityOriginalInstruments.length > 0) {
                const firstInstrument = maturityOriginalInstruments[0];
                underlyingExposureVolume = firstInstrument.rawVolume !== undefined ? firstInstrument.rawVolume : 
                                         firstInstrument.exposureVolume !== undefined ? firstInstrument.exposureVolume : 
                                         firstInstrument.baseVolume !== undefined ? firstInstrument.baseVolume :
                                         totalNotional;
                
                console.log(`[COMMODITY EXPOSURE] ${commodity}-${maturityStr}: Using underlying exposure volume ${underlyingExposureVolume} instead of sum of hedging instruments ${totalNotional}`);
              } else {
                underlyingExposureVolume = totalNotional;
              }
            } else {
              underlyingExposureVolume = totalNotional;
            }
            
            // positionType is already determined above (lines 304-356)
            // Now calculate the exposure values using the determined positionType
            const totalHedgingNotional = maturityInstruments.reduce((sum, inst) => sum + Math.abs(inst.notional), 0);
            const exposureAmount = positionType === 'long' ? totalHedgingNotional : -totalHedgingNotional;
            
            const hedgedAmount = totalHedgingNotional;
            const finalHedgedAmount = positionType === 'long' ? hedgedAmount : -hedgedAmount;
            
            // Get market data for price per unit
            const marketData = serviceRef.current.getMarketData();
            const spotPrice = marketData.spotPrices[commodity] || 0;
            const pricePerUnit = spotPrice > 0 ? spotPrice : 0;
            const quantity = pricePerUnit > 0 ? Math.abs(underlyingExposureVolume / pricePerUnit) : Math.abs(underlyingExposureVolume);
            const totalValue = Math.abs(underlyingExposureVolume);
            const hedgedQuantity = pricePerUnit > 0 ? Math.abs(totalHedgingNotional / pricePerUnit) : Math.abs(totalHedgingNotional);
            
            // Get the correct unit for this commodity
            const commodityInfo = getCommodityInfo(commodity);
            
            if (!existingExposure) {
              const autoExposure: Omit<CommodityExposureData, 'id'> = {
                commodity: commodity,
                commodityName: commodity,
                quantity: quantity,
                unit: commodityInfo.unit, // ✅ Use correct unit from getCommodityInfo
                type: positionType,
                pricePerUnit: pricePerUnit,
                totalValue: totalValue,
                maturity: maturityDate,
                description: `Auto-generated from ${maturityInstruments.length} hedging instrument(s) - Maturity: ${maturityStr} - Total Notional: ${totalHedgingNotional.toLocaleString()}`,
                subsidiary: 'Auto-Generated',
                hedgeRatio: maxHedgeQuantity,
                hedgedQuantity: hedgedQuantity
              };
              
              serviceRef.current.addExposure(autoExposure);
              expositionsCreated++;
              console.log(`Created auto-exposure for ${commodity} (${maturityStr}): ${positionType} - Total Value: ${totalValue} - Hedged Quantity: ${hedgedQuantity}`);
            } else {
              // Get the correct unit for this commodity
              const commodityInfo = getCommodityInfo(commodity);
              
              const updatedExposure = {
                commodity: commodity,
                commodityName: commodity,
                quantity: quantity,
                unit: commodityInfo.unit, // ✅ Use correct unit from getCommodityInfo
                type: positionType,
                pricePerUnit: pricePerUnit,
                totalValue: totalValue,
                description: `Auto-updated from ${maturityInstruments.length} hedging instrument(s) - Maturity: ${maturityStr} - Total Notional: ${totalHedgingNotional.toLocaleString()}`,
                hedgeRatio: maxHedgeQuantity,
                hedgedQuantity: hedgedQuantity
              };
              
              const updateSuccess = serviceRef.current.updateExposure(existingExposure.id, updatedExposure);
              if (updateSuccess) {
                expositionsUpdated++;
                console.log(`Updated existing exposure for ${commodity} (${maturityStr}): ${positionType} - Total Value: ${totalValue} - Hedge Ratio: ${maxHedgeQuantity}%`);
              }
            }
          });
        });
        
        if (expositionsCreated > 0 || expositionsUpdated > 0) {
          window.dispatchEvent(new CustomEvent('exposuresAutoGenerated', {
            detail: { 
              count: expositionsCreated,
              updated: expositionsUpdated,
              newCommodities: newCommoditiesDetected,
              newMaturities: newMaturitiesDetected,
              newCommodityMaturityPairs: Array.from(newCommodityMaturityPairs)
            }
          }));
        }
        
        if (newCommoditiesDetected.length > 0) {
          window.dispatchEvent(new CustomEvent('newCommoditiesDetected', {
            detail: { commodities: newCommoditiesDetected }
          }));
        }
        
        if (newMaturitiesDetected.length > 0) {
          window.dispatchEvent(new CustomEvent('newMaturitiesDetected', {
            detail: { maturities: newMaturitiesDetected }
          }));
        }
        
        console.log(`Auto-sync completed: ${expositionsCreated} exposures created, ${expositionsUpdated} exposures updated, ${newCommoditiesDetected.length} new commodities, ${newMaturitiesDetected.length} new maturities`);
      }
    } catch (error) {
      console.error('Error auto-generating exposures:', error);
    }
  }, []);

  // Helper function to map instrument types
  const mapInstrumentType = (type: string): 'forward' | 'vanilla-call' | 'vanilla-put' | 'collar' | 'swap' | 'barrier' => {
    const typeMap: { [key: string]: 'forward' | 'vanilla-call' | 'vanilla-put' | 'collar' | 'swap' | 'barrier' } = {
      'Forward': 'forward',
      'Vanilla Call': 'vanilla-call',
      'Vanilla Put': 'vanilla-put',
      'Swap': 'swap',
      'Knock-Out Call': 'barrier',
      'Knock-Out Put': 'barrier',
      'Knock-In Call': 'barrier',
      'Knock-In Put': 'barrier',
      'Double Knock-Out Call': 'barrier',
      'Double Knock-Out Put': 'barrier',
      'One-Touch': 'barrier',
      'No-Touch': 'barrier',
      'Double-Touch': 'barrier',
      'Double-No-Touch': 'barrier',
      'Range Binary': 'barrier',
      'Outside Binary': 'barrier'
    };
    
    return typeMap[type] || 'barrier';
  };

  const refreshAllData = useCallback(() => {
    setMarketData(serviceRef.current.getMarketData());
    setExposures(serviceRef.current.getExposures());
    setInstruments(serviceRef.current.getInstruments());
    setRiskMetrics(serviceRef.current.calculateRiskMetrics());
    setCommodityExposures(serviceRef.current.getCommodityExposures());
    setLastUpdate(new Date());
  }, []);

  const addExposure = useCallback((exposure: Omit<CommodityExposureData, 'id'>) => {
    setIsLoading(true);
    try {
      serviceRef.current.addExposure(exposure);
      refreshAllData();
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const updateExposure = useCallback((id: string, updates: Partial<Omit<CommodityExposureData, 'id'>>) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.updateExposure(id, updates);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const deleteExposure = useCallback((id: string) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.deleteExposure(id);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const addInstrument = useCallback((instrument: Omit<CommodityHedgingInstrument, 'id' | 'mtm'>) => {
    setIsLoading(true);
    try {
      serviceRef.current.addInstrument(instrument);
      refreshAllData();
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const updateInstrument = useCallback((id: string, updates: Partial<Omit<CommodityHedgingInstrument, 'id'>>) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.updateInstrument(id, updates);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const deleteInstrument = useCallback((id: string) => {
    setIsLoading(true);
    try {
      const result = serviceRef.current.deleteInstrument(id);
      if (result) {
        refreshAllData();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  const updateMarketData = useCallback(() => {
    serviceRef.current.updateMarketData();
    refreshAllData();
  }, [refreshAllData]);

  const calculateForwardPrice = useCallback((commodity: string, tenor: string) => {
    return serviceRef.current.calculateForwardPrice(commodity, tenor);
  }, []);

  const calculateOptionPrice = useCallback((
    optionType: 'call' | 'put',
    commodity: string,
    strike: number,
    timeToMaturity: number,
    volatility?: number
  ) => {
    return serviceRef.current.calculateOptionPrice(optionType, commodity, strike, timeToMaturity, volatility);
  }, []);

  const generateStressScenarios = useCallback(() => {
    return serviceRef.current.generateStressScenarios();
  }, []);

  const setLiveMode = useCallback((enabled: boolean) => {
    setIsLiveMode(enabled);
    if (enabled) {
      updateMarketData();
    }
  }, [updateMarketData]);

  const clearAllData = useCallback(() => {
    setIsLoading(true);
    try {
      serviceRef.current.clearAllData();
      refreshAllData();
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('commodityDataCleared'));
      
      console.log('✅ All commodity data cleared successfully');
    } catch (error) {
      console.error('Error clearing commodity data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);

  return {
    // Data
    marketData,
    exposures,
    instruments,
    riskMetrics,
    commodityExposures,
    
    // Actions
    addExposure,
    updateExposure,
    deleteExposure,
    addInstrument,
    updateInstrument,
    deleteInstrument,
    updateMarketData,
    calculateForwardPrice,
    calculateOptionPrice,
    generateStressScenarios,
    calculateVarContributions: () => serviceRef.current.calculateVarContributions(),
    syncWithHedgingInstruments,
    autoGenerateExposures,
    clearAllData,
    
    // State
    isLoading,
    lastUpdate,
    isLiveMode,
    setLiveMode
  };
};

