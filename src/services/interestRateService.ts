/**
 * Interest Rate Service
 * Provides interest rates for pricing and simulations based on user settings
 * 
 * Modes:
 * - Fixed: Uses the Bank Rate for each currency (stored in settings)
 * - Curve: Uses the bootstrapped yield curve for precise rates at each maturity
 */

// Default fixed rates (Bank Rates)
export const DEFAULT_FIXED_RATES: Record<string, number> = {
  USD: 4.50,  // Federal Reserve rate
  EUR: 3.00,  // ECB rate
  GBP: 4.75,  // Bank of England rate
  CHF: 0.50,  // Swiss National Bank rate
  JPY: 0.25,  // Bank of Japan rate
  CAD: 3.25,  // Bank of Canada rate
  AUD: 4.35,  // Reserve Bank of Australia rate
  NZD: 4.25,  // Reserve Bank of New Zealand rate
};

// Settings storage key - use the same key as Settings.tsx
const SETTINGS_KEY = 'fxRiskManagerSettings';

export type InterestRateMode = 'fixed' | 'curve';

export interface InterestRateSettings {
  mode: InterestRateMode;
  fixedRates: Record<string, number>;
}

/**
 * Get current interest rate settings from localStorage
 */
export function getInterestRateSettings(): InterestRateSettings {
  try {
    const settingsJson = localStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      return {
        mode: settings?.pricing?.interestRateMode || 'fixed',
        fixedRates: settings?.pricing?.fixedRates || DEFAULT_FIXED_RATES,
      };
    }
  } catch (error) {
    console.error('Error reading interest rate settings:', error);
  }
  return {
    mode: 'fixed',
    fixedRates: DEFAULT_FIXED_RATES,
  };
}

/**
 * Get interest rate for a specific currency and maturity
 * 
 * @param currency - The currency code (USD, EUR, etc.)
 * @param maturityYears - The maturity in years (optional, used for curve mode)
 * @param curveData - The bootstrapped curve data (optional, required for curve mode)
 * @returns The interest rate as a decimal (e.g., 0.045 for 4.5%)
 */
export function getInterestRate(
  currency: string,
  maturityYears?: number,
  curveData?: { tenor: number; rate: number }[]
): number {
  const settings = getInterestRateSettings();
  
  if (settings.mode === 'fixed') {
    // Use fixed rate (Bank Rate)
    const rate = settings.fixedRates[currency.toUpperCase()] ?? DEFAULT_FIXED_RATES.USD;
    return rate / 100; // Convert from percentage to decimal
  }
  
  // Curve mode: interpolate from the yield curve
  if (!curveData || curveData.length === 0 || maturityYears === undefined) {
    // Fallback to fixed rate if no curve data available
    console.warn(`No curve data available for ${currency}, falling back to fixed rate`);
    const rate = settings.fixedRates[currency.toUpperCase()] ?? DEFAULT_FIXED_RATES.USD;
    return rate / 100;
  }
  
  return interpolateFromCurve(curveData, maturityYears);
}

/**
 * Interpolate rate from curve data at a specific maturity
 */
function interpolateFromCurve(
  curveData: { tenor: number; rate: number }[],
  targetTenor: number
): number {
  if (curveData.length === 0) return 0;
  
  // Sort by tenor
  const sortedCurve = [...curveData].sort((a, b) => a.tenor - b.tenor);
  
  // Handle edge cases
  if (targetTenor <= sortedCurve[0].tenor) {
    return sortedCurve[0].rate;
  }
  if (targetTenor >= sortedCurve[sortedCurve.length - 1].tenor) {
    return sortedCurve[sortedCurve.length - 1].rate;
  }
  
  // Find surrounding points and interpolate
  for (let i = 0; i < sortedCurve.length - 1; i++) {
    const lower = sortedCurve[i];
    const upper = sortedCurve[i + 1];
    
    if (targetTenor >= lower.tenor && targetTenor <= upper.tenor) {
      // Linear interpolation
      const ratio = (targetTenor - lower.tenor) / (upper.tenor - lower.tenor);
      return lower.rate + (upper.rate - lower.rate) * ratio;
    }
  }
  
  // Fallback
  return sortedCurve[0].rate;
}

/**
 * Get the fixed rate (Bank Rate) for a currency
 * Always returns the fixed rate regardless of mode
 */
export function getFixedRate(currency: string): number {
  const settings = getInterestRateSettings();
  const rate = settings.fixedRates[currency.toUpperCase()] ?? DEFAULT_FIXED_RATES.USD;
  return rate / 100;
}

/**
 * Format interest rate for display
 */
export function formatInterestRate(rate: number, asPercentage = true): string {
  if (asPercentage) {
    return `${(rate * 100).toFixed(2)}%`;
  }
  return rate.toFixed(4);
}

/**
 * Get description of current interest rate mode
 */
export function getInterestRateModeDescription(): string {
  const settings = getInterestRateSettings();
  
  if (settings.mode === 'fixed') {
    return 'Fixed Rate (Bank Rate) - Same rate for all maturities';
  }
  return 'Yield Curve - Rate varies by maturity (bootstrapped from IRS + Futures)';
}

/**
 * Check if curve mode is enabled
 */
export function isCurveModeEnabled(): boolean {
  const settings = getInterestRateSettings();
  return settings.mode === 'curve';
}

