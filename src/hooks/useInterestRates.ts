/**
 * Hook for accessing interest rates in React components
 * Supports both fixed rates (Bank Rate) and curve-based rates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getInterestRateSettings,
  getInterestRate,
  getFixedRate,
  isCurveModeEnabled,
  DEFAULT_FIXED_RATES,
  InterestRateMode,
} from '@/services/interestRateService';

// Storage key for cached curve data
const CURVE_DATA_CACHE_KEY = 'interest_rate_curves_cache';

interface CurvePoint {
  tenor: number;
  rate: number;
}

interface CachedCurveData {
  [currency: string]: CurvePoint[];
}

export interface UseInterestRatesReturn {
  // Current mode
  mode: InterestRateMode;
  isCurveMode: boolean;
  
  // Get rate for a specific currency and maturity
  getRate: (currency: string, maturityYears?: number) => number;
  
  // Get fixed rate (Bank Rate) regardless of mode
  getFixedRateForCurrency: (currency: string) => number;
  
  // All fixed rates
  fixedRates: Record<string, number>;
  
  // Curve data (if available)
  curveData: CachedCurveData;
  
  // Cache curve data from Rate Explorer
  cacheCurveData: (currency: string, data: CurvePoint[]) => void;
  
  // Clear cached curve data
  clearCurveCache: () => void;
  
  // Check if curve data is available for a currency
  hasCurveData: (currency: string) => boolean;
}

/**
 * Hook to access and manage interest rates for pricing and simulations
 */
export function useInterestRates(): UseInterestRatesReturn {
  const [settings, setSettings] = useState(getInterestRateSettings());
  const [curveData, setCurveData] = useState<CachedCurveData>({});
  
  // Load cached curve data from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CURVE_DATA_CACHE_KEY);
      if (cached) {
        setCurveData(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Error loading cached curve data:', error);
    }
  }, []);
  
  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Listen to both keys (for backward compatibility)
      if (e.key === 'fxRiskManagerSettings' || e.key === 'app_settings') {
        setSettings(getInterestRateSettings());
      }
    };
    
    // Custom event listener for same-window updates
    const handleCustomStorageChange = () => {
      setSettings(getInterestRateSettings());
    };
    
    // Also refresh periodically to catch any changes
    const interval = setInterval(() => {
      setSettings(getInterestRateSettings());
    }, 2000); // Check every 2 seconds for updates
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settingsUpdated', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdated', handleCustomStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  // Get rate for a specific currency and maturity
  const getRate = useCallback((currency: string, maturityYears?: number): number => {
    const currencyUpper = currency.toUpperCase();
    const currencyCurveData = curveData[currencyUpper];
    
    return getInterestRate(currencyUpper, maturityYears, currencyCurveData);
  }, [curveData]);
  
  // Get fixed rate regardless of mode
  const getFixedRateForCurrency = useCallback((currency: string): number => {
    return getFixedRate(currency);
  }, []);
  
  // Cache curve data from Rate Explorer
  const cacheCurveData = useCallback((currency: string, data: CurvePoint[]) => {
    const currencyUpper = currency.toUpperCase();
    
    setCurveData(prev => {
      const updated = { ...prev, [currencyUpper]: data };
      
      // Save to localStorage
      try {
        localStorage.setItem(CURVE_DATA_CACHE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error caching curve data:', error);
      }
      
      return updated;
    });
  }, []);
  
  // Clear cached curve data
  const clearCurveCache = useCallback(() => {
    setCurveData({});
    try {
      localStorage.removeItem(CURVE_DATA_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing curve cache:', error);
    }
  }, []);
  
  // Check if curve data is available for a currency
  const hasCurveData = useCallback((currency: string): boolean => {
    const currencyUpper = currency.toUpperCase();
    return Boolean(curveData[currencyUpper] && curveData[currencyUpper].length > 0);
  }, [curveData]);
  
  return useMemo(() => ({
    mode: settings.mode,
    isCurveMode: settings.mode === 'curve',
    getRate,
    getFixedRateForCurrency,
    fixedRates: settings.fixedRates,
    curveData,
    cacheCurveData,
    clearCurveCache,
    hasCurveData,
  }), [
    settings.mode,
    settings.fixedRates,
    getRate,
    getFixedRateForCurrency,
    curveData,
    cacheCurveData,
    clearCurveCache,
    hasCurveData,
  ]);
}

/**
 * Get interest rate for a single calculation (non-reactive)
 * Use this for one-off calculations outside React components
 */
export function getInterestRateForPricing(
  currency: string,
  maturityYears?: number
): number {
  // Try to get cached curve data
  try {
    const cached = localStorage.getItem(CURVE_DATA_CACHE_KEY);
    if (cached && isCurveModeEnabled()) {
      const curveData = JSON.parse(cached);
      const currencyUpper = currency.toUpperCase();
      if (curveData[currencyUpper]) {
        return getInterestRate(currencyUpper, maturityYears, curveData[currencyUpper]);
      }
    }
  } catch (error) {
    console.error('Error getting curve data:', error);
  }
  
  // Fallback to fixed rate
  return getInterestRate(currency, maturityYears);
}

export default useInterestRates;

