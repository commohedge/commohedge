import { useState, useEffect, useCallback, useRef } from 'react';
import CommodityDataService, { 
  CommodityMarketData, 
  CommodityExposureData, 
  CommodityHedgingInstrument, 
  CommodityRiskMetrics, 
  AggregatedCommodityExposure 
} from '../services/CommodityDataService';
import StrategyImportService from '../services/StrategyImportService';

interface UseCommodityDataReturn {
  // Data
  marketData: CommodityMarketData;
  exposures: CommodityExposureData[];
  instruments: CommodityHedgingInstrument[];
  riskMetrics: CommodityRiskMetrics;
  commodityExposures: AggregatedCommodityExposure[];
  
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
  const [commodityExposures, setCommodityExposures] = useState<AggregatedCommodityExposure[]>(() => 
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

  const syncWithHedgingInstruments = useCallback(() => {
    try {
      // Get hedging instruments from StrategyImportService
      const hedgingInstruments = strategyImportServiceRef.current.getHedgingInstruments();
      
      // Clear existing instruments in CommodityDataService (keep exposures)
      serviceRef.current.clearInstruments();
      
      // Convert and add hedging instruments to CommodityDataService
      hedgingInstruments.forEach(hedgingInstrument => {
        // Convert StrategyImportService HedgingInstrument to CommodityDataService HedgingInstrument
        const commodityInstrument: Omit<CommodityHedgingInstrument, 'id' | 'mtm'> = {
          type: mapInstrumentType(hedgingInstrument.type),
          commodity: hedgingInstrument.currency, // Mapper currency → commodity
          notional: hedgingInstrument.notional,
          strike: hedgingInstrument.strike,
          premium: hedgingInstrument.premium,
          maturity: new Date(hedgingInstrument.maturity),
          counterparty: hedgingInstrument.counterparty || 'Strategy Import',
          hedgeAccounting: hedgingInstrument.hedge_accounting || false,
          effectivenessRatio: hedgingInstrument.hedgeQuantity || hedgingInstrument.effectiveness_ratio || 95
        };
        
        serviceRef.current.addInstrument(commodityInstrument);
      });
    } catch (error) {
      console.error('Error syncing with hedging instruments:', error);
    }
  }, []);

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
          
          const originalInstrument = originalInstruments.find(orig => 
            orig.currency === instrument.commodity && 
            Math.abs(orig.notional - instrument.notional) < 0.01
          );
          if (originalInstrument) {
            commodityGroups[commodity].originalInstruments.push(originalInstrument);
          }
        });
        
        let expositionsCreated = 0;
        let expositionsUpdated = 0;
        let newCommoditiesDetected = Array.from(newCommodities);
        let newMaturitiesDetected = Array.from(newMaturities);
        
        // Create exposures grouped by commodity and maturity
        Object.entries(commodityGroups).forEach(([commodity, instrumentGroup]) => {
          const instruments = instrumentGroup.commodityInstruments;
          const originalInstruments = instrumentGroup.originalInstruments;
          
          // Group by maturity within each commodity
          const maturityGroups: { [maturity: string]: CommodityHedgingInstrument[] } = {};
          instruments.forEach(instrument => {
            const maturityStr = instrument.maturity.toISOString().split('T')[0];
            if (!maturityGroups[maturityStr]) {
              maturityGroups[maturityStr] = [];
            }
            maturityGroups[maturityStr].push(instrument);
          });
          
          // Create an exposure for each commodity-maturity combination that doesn't exist
          Object.entries(maturityGroups).forEach(([maturityStr, maturityInstruments]) => {
            const existingExposure = currentExposures.find(exp => 
              exp.commodity === commodity && 
              exp.maturity.toISOString().split('T')[0] === maturityStr
            );
            
            const totalNotional = maturityInstruments.reduce((sum, inst) => sum + inst.notional, 0);
            const maturityDate = new Date(maturityStr);
            
            let maxHedgeQuantity = 95;
            
            if (originalInstruments.length > 0) {
              const maturityOriginalInstruments = originalInstruments.filter(orig => {
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
                maxHedgeQuantity = Math.max(...originalInstruments.map(inst => {
                  const quantity = inst.hedgeQuantity !== undefined ? 
                    inst.hedgeQuantity : 
                    (inst.quantity !== undefined ? Math.abs(inst.quantity) : 95);
                  return quantity;
                }));
              }
            }
            
            let underlyingExposureVolume = 0;
            
            if (originalInstruments.length > 0) {
              const maturityOriginalInstruments = originalInstruments.filter(orig => {
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
            
            // Determine if this should be long or short position
            let positionType: 'long' | 'short';
            const explicitTypes = originalInstruments
              .filter(orig => new Date(orig.maturity).toISOString().split('T')[0] === maturityStr)
              .map(orig => orig.volumeType)
              .filter((t): t is 'receivable' | 'payable' => t === 'receivable' || t === 'payable');
            if (explicitTypes.length > 0) {
              // Map receivable → long, payable → short
              const allPayable = explicitTypes.every(t => t === 'payable');
              positionType = allPayable ? 'short' : 'long';
            } else {
              const globalType = originalInstruments
                .map(orig => orig.volumeType)
                .find((t): t is 'receivable' | 'payable' => t === 'receivable' || t === 'payable');
              if (globalType) {
                positionType = globalType === 'payable' ? 'short' : 'long';
              } else {
                const hasLongInstruments = maturityInstruments.some(inst => 
                  inst.type === 'vanilla-call' || inst.type === 'forward' || inst.type === 'collar'
                );
                positionType = hasLongInstruments ? 'long' : 'short';
              }
            }
            
            const totalHedgingNotional = maturityInstruments.reduce((sum, inst) => sum + Math.abs(inst.notional), 0);
            const exposureAmount = positionType === 'long' ? totalHedgingNotional : -totalHedgingNotional;
            
            const hedgedAmount = totalHedgingNotional;
            const finalHedgedAmount = positionType === 'long' ? hedgedAmount : -hedgedAmount;
            
            if (!existingExposure) {
              const autoExposure: Omit<CommodityExposureData, 'id'> = {
                commodity: commodity,
                amount: exposureAmount,
                type: positionType,
                maturity: maturityDate,
                description: `Auto-generated from ${maturityInstruments.length} hedging instrument(s) - Maturity: ${maturityStr} - Total Notional: ${totalHedgingNotional.toLocaleString()}`,
                subsidiary: 'Auto-Generated',
                hedgeRatio: maxHedgeQuantity,
                hedgedAmount: finalHedgedAmount
              };
              
              serviceRef.current.addExposure(autoExposure);
              expositionsCreated++;
              console.log(`Created auto-exposure for ${commodity} (${maturityStr}): ${exposureAmount}`);
            } else {
              const updatedExposure = {
                amount: exposureAmount,
                type: positionType,
                description: `Auto-updated from ${maturityInstruments.length} hedging instrument(s) - Maturity: ${maturityStr} - Total Notional: ${totalHedgingNotional.toLocaleString()}`,
                hedgeRatio: maxHedgeQuantity,
                hedgedAmount: finalHedgedAmount
              };
              
              const updateSuccess = serviceRef.current.updateExposure(existingExposure.id, updatedExposure);
              if (updateSuccess) {
                expositionsUpdated++;
                console.log(`Updated existing exposure for ${commodity} (${maturityStr}): ${exposureAmount} - Hedge Ratio: ${maxHedgeQuantity}%`);
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
    
    // State
    isLoading,
    lastUpdate,
    isLiveMode,
    setLiveMode
  };
};

