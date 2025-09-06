/**
 * Emergency Recovery Utilities
 * 
 * This module provides utilities to recover from corrupted localStorage data
 * that might cause the Strategy Builder to crash or display a blank page.
 */

export interface RecoveryOptions {
  clearCalculatorState?: boolean;
  clearAllStrategyData?: boolean;
  resetToDefaults?: boolean;
}

/**
 * Clear corrupted calculator state from localStorage
 */
export const clearCorruptedCalculatorState = (): void => {
  try {
    localStorage.removeItem('calculatorState');
    console.log('✅ Cleared corrupted calculator state');
  } catch (error) {
    console.error('❌ Failed to clear calculator state:', error);
  }
};

/**
 * Clear all strategy-related data from localStorage
 */
export const clearAllStrategyData = (): void => {
  try {
    const keysToRemove = [
      'calculatorState',
      'savedScenarios',
      'riskMatrixData',
      'backtestResults',
      'customCurrencyPairs'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ Cleared all strategy data');
  } catch (error) {
    console.error('❌ Failed to clear strategy data:', error);
  }
};

/**
 * Validate and repair localStorage data
 */
export const validateAndRepairLocalStorage = (): boolean => {
  try {
    const calculatorState = localStorage.getItem('calculatorState');
    
    if (!calculatorState) {
      return true; // No data to validate
    }
    
    // Try to parse the data
    const parsed = JSON.parse(calculatorState);
    
    // Check if essential properties exist
    const hasParams = parsed.params && typeof parsed.params === 'object';
    const hasStrategy = Array.isArray(parsed.strategy);
    
    if (!hasParams || !hasStrategy) {
      console.warn('⚠️ Invalid calculator state structure detected');
      clearCorruptedCalculatorState();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Corrupted calculator state detected:', error);
    clearCorruptedCalculatorState();
    return false;
  }
};

/**
 * Emergency recovery function
 */
export const performEmergencyRecovery = (options: RecoveryOptions = {}): void => {
  console.log('🚨 Performing emergency recovery...');
  
  if (options.clearAllStrategyData) {
    clearAllStrategyData();
  } else if (options.clearCalculatorState) {
    clearCorruptedCalculatorState();
  }
  
  if (options.resetToDefaults) {
    // Clear all application data
    try {
      localStorage.clear();
      console.log('✅ Reset all application data to defaults');
    } catch (error) {
      console.error('❌ Failed to reset application data:', error);
    }
  }
  
  // Reload the page to apply changes
  window.location.reload();
};

/**
 * Check if localStorage is available and working
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('❌ localStorage is not available:', error);
    return false;
  }
};

/**
 * Get localStorage usage statistics
 */
export const getLocalStorageStats = (): {
  totalSize: number;
  itemCount: number;
  items: Array<{ key: string; size: number }>;
} => {
  const items: Array<{ key: string; size: number }> = [];
  let totalSize = 0;
  let itemCount = 0;
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        const size = value ? new Blob([value]).size : 0;
        items.push({ key, size });
        totalSize += size;
        itemCount++;
      }
    }
  } catch (error) {
    console.error('❌ Failed to get localStorage stats:', error);
  }
  
  return {
    totalSize,
    itemCount,
    items: items.sort((a, b) => b.size - a.size)
  };
};
