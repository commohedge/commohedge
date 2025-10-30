/**
 * PricingService - Pont vers les modèles de pricing commodity
 * 
 * Ce service fait le lien entre l'ancien système FX (Index.tsx) et les nouveaux
 * modèles de pricing commodity (Black-76)
 */

// Import des modèles de pricing commodity (Black-76)
import {
  erf,
  CND,
  calculateBlack76Price as calculateBlack76PriceFromModels,
  calculateCommodityForwardPrice as calculateCommodityForwardPriceFromModels,
  calculateVanillaOptionMonteCarlo as calculateVanillaMonteCarloFromModels,
  calculateBarrierOptionPrice as calculateBarrierPriceFromModels,
  calculateDigitalOptionPrice as calculateDigitalPriceFromModels,
  calculateImpliedVolatility as calculateImpliedVolFromModels,
  calculateTimeToMaturity,
  calculateVanillaGreeks as calculateGreeksFromModels
} from './CommodityPricingModels';

// Import temporaire depuis Index.tsx pour compatibilité
import {
  calculateStrategyPayoffAtPrice as calculateStrategyPayoffAtPriceFromIndex,
  calculatePricesFromPaths as calculatePricesFromPathsFromIndex,
  calculateSwapPrice as calculateSwapPriceFromIndex
} from '@/pages/Index';

// ===== COMMODITY PRICING FUNCTIONS (BLACK-76) =====

/**
 * Calcule le prix d'une option sur commodity avec Black-76
 * 
 * @param type - 'call' ou 'put'
 * @param S - Prix spot de la commodity
 * @param K - Strike price
 * @param r - Taux sans risque
 * @param b - Cost of carry (r + storage - convenience)
 * @param t - Time to maturity
 * @param sigma - Volatilité
 */
export function calculateBlack76Price(
  type: string,
  S: number,
  K: number,
  r: number,
  b: number,
  t: number,
  sigma: number
): number {
  return calculateBlack76PriceFromModels(type, S, K, r, b, t, sigma);
}

/**
 * Wrapper pour compatibilité FX → Commodity
 * Convertit les paramètres FX (r_d, r_f) en commodity (r, b)
 * 
 * @deprecated Utiliser calculateBlack76Price avec cost of carry
 */
export function calculateGarmanKohlhagenPrice(
  type: string, 
  S: number, 
  K: number, 
  r_d: number, 
  r_f: number, 
  t: number, 
  sigma: number
): number {
  // Pour commodity: r = r_d, b = r_d - r_f
  const r = r_d;
  const b = r_d - r_f;
  return calculateBlack76PriceFromModels(type, S, K, r, b, t, sigma);
}

/**
 * Monte Carlo pour options vanilles sur commodities
 */
export function calculateVanillaOptionMonteCarlo(
  optionType: string,
  S: number,
  K: number,
  r_d: number,
  r_f: number,
  t: number,
  sigma: number,
  numSimulations: number = 1000
): number {
  const r = r_d;
  const b = r_d - r_f;
  return calculateVanillaMonteCarloFromModels(optionType, S, K, r, b, t, sigma, numSimulations);
}

/**
 * Monte Carlo pour options à barrière sur commodities
 */
export function calculateBarrierOptionPrice(
  optionType: string,
  S: number,
  K: number,
  r: number,
  t: number,
  sigma: number,
  barrier: number,
  secondBarrier?: number,
  numSimulations: number = 1000
): number {
  const b = r; // Pour barrières simples, b = r
  return calculateBarrierPriceFromModels(optionType, S, K, r, b, t, sigma, barrier, secondBarrier, numSimulations);
}

/**
 * Monte Carlo pour options digitales sur commodities
 */
export function calculateDigitalOptionPrice(
  optionType: string,
  S: number,
  K: number,
  r: number,
  t: number,
  sigma: number,
  barrier?: number,
  secondBarrier?: number,
  numSimulations: number = 10000,
  rebate: number = 1
): number {
  const b = r;
  return calculateDigitalPriceFromModels(optionType, S, K, r, b, t, sigma, barrier, secondBarrier, numSimulations, rebate);
}

/**
 * ✅ CLOSED-FORM COMPLÈTE POUR OPTIONS À BARRIÈRE (SIMPLE ET DOUBLE)
 * Implémentation exacte de Strategy Builder (Index.tsx lignes 371-637)
 * Supporte:
 * - Single barrier: call/put knock-out/knock-in (normal et reverse)
 * - Double barrier: call/put double knock-out/knock-in
 */
export function calculateBarrierOptionClosedForm(
  optionType: string,
  S: number,
  K: number,
  r_d: number,
  t: number,
  sigma: number,
  barrier: number,
  secondBarrier?: number,
  r_f: number = 0,
  barrierOptionSimulations: number = 1000 // Pour fallback Monte Carlo si nécessaire
): number {
  const r = r_d;
  const b = r; // Pour commodities: cost of carry = risk-free rate
  const v = sigma;
  const T = t;
  
  // Helper function: Cumulative Normal Distribution
  const CND = (x: number) => (1 + erf(x / Math.sqrt(2))) / 2;
  
  // PARTIE 1: Options à barrière SIMPLE (comme Strategy Builder ligne 390)
  if (!optionType.includes('double')) {
    // Calcul des paramètres de base selon Strategy Builder
    const mu = (b - v ** 2 / 2) / (v ** 2);
    const lambda = Math.sqrt(mu ** 2 + 2 * r / (v ** 2));
    
    const X = K; // Strike price
    const H = barrier; // Barrière
    
    const X1 = Math.log(S / X) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
    const X2 = Math.log(S / H) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
    const y1 = Math.log(H ** 2 / (S * X)) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
    const y2 = Math.log(H / S) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
    const Z = Math.log(H / S) / (v * Math.sqrt(T)) + lambda * v * Math.sqrt(T);
    
    // Variables binaires eta et phi selon le type d'option
    let eta = 0, phi = 0;
    let TypeFlag = "";
    
    // Déterminer le TypeFlag basé sur le type d'option (EXACTEMENT comme Strategy Builder ligne 409-462)
    // Normaliser le type pour gérer les variations (knockout/knock-out, knockin/knock-in)
    const normalizedType = optionType.toLowerCase().replace(/-/g, '').replace(/_/g, '').replace(/\s/g, '');
    const isCall = normalizedType.includes('call');
    const isPut = normalizedType.includes('put');
    const isKnockout = normalizedType.includes('knockout');
    const isKnockin = normalizedType.includes('knockin');
    const isReverse = normalizedType.includes('reverse');
    
    // Détection EXACTE selon Strategy Builder (lignes 410-462)
    // Note: Strategy Builder utilise H < S et H > S (strict), donc si H === S, TypeFlag reste vide -> Monte Carlo
    if (isReverse) {
      // Options reverse (lignes 442-461)
      if (isCall && isKnockin) {
        TypeFlag = "pui"; eta = -1; phi = -1;
      } else if (isCall && isKnockout) {
        TypeFlag = "puo"; eta = -1; phi = -1;
      } else if (isPut && isKnockin) {
        TypeFlag = "cui"; eta = -1; phi = 1;
      } else if (isPut && isKnockout) {
        TypeFlag = "cuo"; eta = -1; phi = 1;
      }
    } else {
      // Options normales (non-reverse): déterminer selon H vs S (strict < et > comme Strategy Builder)
      if (isCall && isKnockin && H < S) {
        TypeFlag = "cdi"; eta = 1; phi = 1;
      } else if (isCall && isKnockin && H > S) {
        TypeFlag = "cui"; eta = -1; phi = 1;
      } else if (isPut && isKnockin && H < S) {
        TypeFlag = "pdi"; eta = 1; phi = -1;
      } else if (isPut && isKnockin && H > S) {
        TypeFlag = "pui"; eta = -1; phi = -1;
      } else if (isCall && isKnockout && H < S) {
        TypeFlag = "cdo"; eta = 1; phi = 1;
      } else if (isCall && isKnockout && H > S) {
        TypeFlag = "cuo"; eta = -1; phi = 1;
      } else if (isPut && isKnockout && H < S) {
        TypeFlag = "pdo"; eta = 1; phi = -1;
      } else if (isPut && isKnockout && H > S) {
        TypeFlag = "puo"; eta = -1; phi = -1;
      }
    }
    
    // Si le type d'option n'est pas reconnu, utiliser Monte Carlo
    if (TypeFlag === "") {
      return calculateBarrierPriceFromModels(optionType, S, K, r, b, t, sigma, barrier, secondBarrier, barrierOptionSimulations);
    }
    
    // Calculer les termes f1-f6 selon Strategy Builder
    const f1 = phi * S * Math.exp((b - r) * T) * CND(phi * X1) - 
              phi * X * Math.exp(-r * T) * CND(phi * X1 - phi * v * Math.sqrt(T));
              
    const f2 = phi * S * Math.exp((b - r) * T) * CND(phi * X2) - 
              phi * X * Math.exp(-r * T) * CND(phi * X2 - phi * v * Math.sqrt(T));
              
    const f3 = phi * S * Math.exp((b - r) * T) * (H / S) ** (2 * (mu + 1)) * CND(eta * y1) - 
              phi * X * Math.exp(-r * T) * (H / S) ** (2 * mu) * CND(eta * y1 - eta * v * Math.sqrt(T));
              
    const f4 = phi * S * Math.exp((b - r) * T) * (H / S) ** (2 * (mu + 1)) * CND(eta * y2) - 
              phi * X * Math.exp(-r * T) * (H / S) ** (2 * mu) * CND(eta * y2 - eta * v * Math.sqrt(T));
    
    const cashRebate = 0; // Généralement 0 pour les options standards
    
    const f5 = cashRebate * Math.exp(-r * T) * (CND(eta * X2 - eta * v * Math.sqrt(T)) - 
            (H / S) ** (2 * mu) * CND(eta * y2 - eta * v * Math.sqrt(T)));
            
    const f6 = cashRebate * ((H / S) ** (mu + lambda) * CND(eta * Z) + 
            (H / S) ** (mu - lambda) * CND(eta * Z - 2 * eta * lambda * v * Math.sqrt(T)));
    
    // Calculer le prix selon le TypeFlag et la relation entre X et H (comme Strategy Builder ligne 494-516)
    let optionPrice = 0;
    
    if (X > H) {
      switch (TypeFlag) {
        case "cdi": optionPrice = f3 + f5; break;
        case "cui": optionPrice = f1 + f5; break;
        case "pdi": optionPrice = f2 - f3 + f4 + f5; break;
        case "pui": optionPrice = f1 - f2 + f4 + f5; break;
        case "cdo": optionPrice = f1 - f3 + f6; break;
        case "cuo": optionPrice = f6; break;
        case "pdo": optionPrice = f1 - f2 + f3 - f4 + f6; break;
        case "puo": optionPrice = f2 - f4 + f6; break;
        default: break;
      }
    } else if (X < H) {
      switch (TypeFlag) {
        case "cdi": optionPrice = f1 - f2 + f4 + f5; break;
        case "cui": optionPrice = f2 - f3 + f4 + f5; break;
        case "pdi": optionPrice = f1 + f5; break;
        case "pui": optionPrice = f3 + f5; break;
        case "cdo": optionPrice = f2 - f4 + f6; break;
        case "cuo": optionPrice = f1 - f2 + f3 - f4 + f6; break;
        case "pdo": optionPrice = f6; break;
        case "puo": optionPrice = f1 - f3 + f6; break;
        default: break;
      }
    } else {
      // Cas X === H (strike égal à la barrière) - utiliser le même traitement que X < H
      switch (TypeFlag) {
        case "cdi": optionPrice = f1 - f2 + f4 + f5; break;
        case "cui": optionPrice = f2 - f3 + f4 + f5; break;
        case "pdi": optionPrice = f1 + f5; break;
        case "pui": optionPrice = f3 + f5; break;
        case "cdo": optionPrice = f2 - f4 + f6; break;
        case "cuo": optionPrice = f1 - f2 + f3 - f4 + f6; break;
        case "pdo": optionPrice = f6; break;
        case "puo": optionPrice = f1 - f3 + f6; break;
        default: break;
      }
    }
    
    return Math.max(0, optionPrice);
  }
  
  // PARTIE 2: Options à DOUBLE BARRIÈRE
  else if (secondBarrier !== undefined || optionType.includes('double')) {
    const X = K;
    const L = Math.min(barrier, secondBarrier || barrier); // Barrière inférieure
    const U = Math.max(barrier, secondBarrier || barrier); // Barrière supérieure
    
    const delta1 = 0; // Taux de croissance des barrières
    const delta2 = 0; // Taux de dividende
    
    // Déterminer le TypeFlag
    let TypeFlag = "";
    if (optionType.includes('call-double-knockout')) {
      TypeFlag = "co";
    } else if (optionType.includes('call-double-knockin')) {
      TypeFlag = "ci";
    } else if (optionType.includes('put-double-knockout')) {
      TypeFlag = "po";
    } else if (optionType.includes('put-double-knockin')) {
      TypeFlag = "pi";
    }
    
    // Si le type n'est pas reconnu, utiliser Monte Carlo
    if (TypeFlag === "") {
      return calculateBarrierPriceFromModels(optionType, S, K, r, b, t, sigma, barrier, secondBarrier, barrierOptionSimulations);
    }
    
    const F = U * Math.exp(delta1 * T);
    const E = L * Math.exp(delta1 * T);
    
    let Sum1 = 0;
    let Sum2 = 0;
    
    // Pour les options call double-barrière
    if (TypeFlag === "co" || TypeFlag === "ci") {
      for (let n = -5; n <= 5; n++) {
        const d1 = (Math.log(S * U ** (2 * n) / (X * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d2 = (Math.log(S * U ** (2 * n) / (F * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d3 = (Math.log(L ** (2 * n + 2) / (X * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d4 = (Math.log(L ** (2 * n + 2) / (F * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        
        const mu1 = 2 * (b - delta2 - n * (delta1 - delta2)) / v ** 2 + 1;
        const mu2 = 2 * n * (delta1 - delta2) / v ** 2;
        const mu3 = 2 * (b - delta2 + n * (delta1 - delta2)) / v ** 2 + 1;
        
        Sum1 += (U ** n / L ** n) ** mu1 * (L / S) ** mu2 * (CND(d1) - CND(d2)) - 
              (L ** (n + 1) / (U ** n * S)) ** mu3 * (CND(d3) - CND(d4));
              
        Sum2 += (U ** n / L ** n) ** (mu1 - 2) * (L / S) ** mu2 * (CND(d1 - v * Math.sqrt(T)) - CND(d2 - v * Math.sqrt(T))) - 
              (L ** (n + 1) / (U ** n * S)) ** (mu3 - 2) * (CND(d3 - v * Math.sqrt(T)) - CND(d4 - v * Math.sqrt(T)));
      }
    }
    // Pour les options put double-barrière
    else if (TypeFlag === "po" || TypeFlag === "pi") {
      for (let n = -5; n <= 5; n++) {
        const d1 = (Math.log(S * U ** (2 * n) / (E * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d2 = (Math.log(S * U ** (2 * n) / (X * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d3 = (Math.log(L ** (2 * n + 2) / (E * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d4 = (Math.log(L ** (2 * n + 2) / (X * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        
        const mu1 = 2 * (b - delta2 - n * (delta1 - delta2)) / v ** 2 + 1;
        const mu2 = 2 * n * (delta1 - delta2) / v ** 2;
        const mu3 = 2 * (b - delta2 + n * (delta1 - delta2)) / v ** 2 + 1;
        
        Sum1 += (U ** n / L ** n) ** mu1 * (L / S) ** mu2 * (CND(d1) - CND(d2)) - 
              (L ** (n + 1) / (U ** n * S)) ** mu3 * (CND(d3) - CND(d4));
              
        Sum2 += (U ** n / L ** n) ** (mu1 - 2) * (L / S) ** mu2 * (CND(d1 - v * Math.sqrt(T)) - CND(d2 - v * Math.sqrt(T))) - 
              (L ** (n + 1) / (U ** n * S)) ** (mu3 - 2) * (CND(d3 - v * Math.sqrt(T)) - CND(d4 - v * Math.sqrt(T)));
      }
    }
    
    // Calculer OutValue selon le type d'option
    let OutValue = 0;
    if (TypeFlag === "co" || TypeFlag === "ci") {
      OutValue = S * Math.exp((b - r) * T) * Sum1 - X * Math.exp(-r * T) * Sum2;
    } else if (TypeFlag === "po" || TypeFlag === "pi") {
      OutValue = X * Math.exp(-r * T) * Sum2 - S * Math.exp((b - r) * T) * Sum1;
    }
    
    // Fonction Black-Scholes standard pour les knockin
    const GBlackScholes = (type: string, S: number, X: number, T: number, r: number, b: number, v: number) => {
      const d1 = (Math.log(S / X) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
      const d2 = d1 - v * Math.sqrt(T);
      
      if (type === "c") {
        return S * Math.exp((b - r) * T) * CND(d1) - X * Math.exp(-r * T) * CND(d2);
      } else {
        return X * Math.exp(-r * T) * CND(-d2) - S * Math.exp((b - r) * T) * CND(-d1);
      }
    };
    
    // Calculer le prix final selon le TypeFlag
    let optionPrice = 0;
    if (TypeFlag === "co" || TypeFlag === "po") {
      optionPrice = OutValue;
    } else if (TypeFlag === "ci") {
      // Relation de parité: knockin + knockout = vanille
      optionPrice = GBlackScholes("c", S, X, T, r, b, v) - OutValue;
    } else if (TypeFlag === "pi") {
      // Relation de parité: knockin + knockout = vanille
      optionPrice = GBlackScholes("p", S, X, T, r, b, v) - OutValue;
    }
    
    return Math.max(0, optionPrice);
  }
  
  // Fallback: utiliser Monte Carlo si le type n'est pas supporté
  return calculateBarrierPriceFromModels(optionType, S, K, r, b, t, sigma, barrier, secondBarrier, barrierOptionSimulations);
}

/**
 * Calcule le prix forward d'une commodity
 * F = S * e^(b*t) où b = r + storage - convenience
 */
export function calculateCommodityForwardPrice(
  S: number,
  r: number,
  storage: number,
  convenience: number,
  t: number
): number {
  const b = r + storage - convenience;
  return calculateCommodityForwardPriceFromModels(S, b, t);
}

/**
 * Wrapper FX → Commodity pour compatibilité
 * @deprecated Utiliser calculateCommodityForwardPrice
 */
export function calculateFXForwardPrice(S: number, r_d: number, r_f: number, t: number): number {
  const b = r_d - r_f;
  return calculateCommodityForwardPriceFromModels(S, b, t);
}

export function calculateOptionPrice(
  type: string,
  S: number,
  K: number,
  r_d: number,
  r_f: number,
  t: number,
  sigma: number,
  barrier?: number,
  secondBarrier?: number,
  rebate?: number,
  numSimulations: number = 1000
): number {
  return calculateOptionPriceFromIndex(type, S, K, r_d, r_f, t, sigma, barrier, secondBarrier, rebate, numSimulations);
}

/**
 * Calcule la volatilité implicite (Black-76)
 */
export function calculateImpliedVolatility(
  optionType: string,
  S: number,
  K: number,
  r_d: number,
  r_f: number,
  t: number,
  marketPrice: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  const r = r_d;
  const b = r_d - r_f;
  return calculateImpliedVolFromModels(optionType, S, K, r, b, t, marketPrice, tolerance, maxIterations);
}

export function calculateSwapPrice(
  forwards: number[],
  times: number[],
  r: number
): number {
  return calculateSwapPriceFromIndex(forwards, times, r);
}

// Export des fonctions utilitaires
export { erf, CND };

export function calculatePricesFromPaths(
  optionType: string,
  S: number,
  K: number,
  r: number,
  maturityIndex: number,
  paths: number[][],
  barrier?: number,
  secondBarrier?: number
): number {
  return calculatePricesFromPathsFromIndex(optionType, S, K, r, maturityIndex, paths, barrier, secondBarrier);
}

// Export depuis CommodityPricingModels
export { calculateTimeToMaturity };

export function calculateStrategyPayoffAtPrice(components: any[], price: number, spotPrice: number): number {
  return calculateStrategyPayoffAtPriceFromIndex(components, price, spotPrice);
}

// ===== GREEKS CALCULATIONS =====

// Interface pour les grecques
export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

/**
 * Calcul des grecques pour options vanilles (Black-76 pour commodities)
 */
export function calculateVanillaGreeks(
  type: 'call' | 'put',
  S: number,      // Spot price
  K: number,      // Strike price
  r_d: number,    // Domestic rate (or risk-free for commodity)
  r_f: number,    // Foreign rate (or 0 for commodity)
  t: number,      // Time to maturity
  sigma: number   // Volatility
): Greeks {
  const r = r_d;
  const b = r_d - r_f;
  return calculateGreeksFromModels(type, S, K, r, b, t, sigma);
}

// Calcul des grecques pour options barrières (approximation analytique)
export function calculateBarrierGreeks(
  type: string,
  S: number,      // Spot price
  K: number,      // Strike price
  r_d: number,    // Domestic rate
  t: number,      // Time to maturity
  sigma: number,  // Volatility
  barrier: number, // Barrier level
  secondBarrier?: number // Second barrier for double barriers
): Greeks {
  // Pour les options barrières, on utilise une approximation
  // basée sur les grecques vanilles avec ajustements
  
  // Déterminer le type d'option vanille sous-jacente
  let vanillaType: 'call' | 'put' = 'call';
  if (type.includes('put')) {
    vanillaType = 'put';
  }
  
  // Calculer les grecques vanilles de base
  const vanillaGreeks = calculateVanillaGreeks(vanillaType, S, K, r_d, 0, t, sigma);
  
  // Facteurs d'ajustement pour les barrières
  let barrierFactor = 1.0;
  let gammaFactor = 1.0;
  let vegaFactor = 1.0;
  
  // Ajustements selon le type de barrière
  if (type.includes('knockout')) {
    // Knock-out: les grecques sont réduites près de la barrière
    const distanceToBarrier = Math.abs(S - barrier) / S;
    barrierFactor = Math.min(1.0, distanceToBarrier * 2);
    gammaFactor = Math.min(1.0, distanceToBarrier * 1.5);
    vegaFactor = Math.min(1.0, distanceToBarrier * 1.8);
  } else if (type.includes('knockin')) {
    // Knock-in: les grecques sont augmentées près de la barrière
    const distanceToBarrier = Math.abs(S - barrier) / S;
    barrierFactor = Math.max(0.1, 1.0 - distanceToBarrier * 0.5);
    gammaFactor = Math.max(0.2, 1.0 - distanceToBarrier * 0.3);
    vegaFactor = Math.max(0.15, 1.0 - distanceToBarrier * 0.4);
  }
  
  // Ajustements pour les barrières doubles
  if (secondBarrier && type.includes('double')) {
    const distanceToSecondBarrier = Math.abs(S - secondBarrier) / S;
    barrierFactor *= Math.min(1.0, distanceToSecondBarrier * 1.5);
    gammaFactor *= Math.min(1.0, distanceToSecondBarrier * 1.2);
    vegaFactor *= Math.min(1.0, distanceToSecondBarrier * 1.3);
  }
  
  return {
    delta: vanillaGreeks.delta * barrierFactor,
    gamma: vanillaGreeks.gamma * gammaFactor,
    theta: vanillaGreeks.theta * barrierFactor,
    vega: vanillaGreeks.vega * vegaFactor,
    rho: vanillaGreeks.rho * barrierFactor
  };
}

// Calcul des grecques pour options digitales (approximation)
export function calculateDigitalGreeks(
  type: string,
  S: number,      // Spot price
  K: number,      // Strike/Barrier level
  r_d: number,    // Domestic rate
  t: number,      // Time to maturity
  sigma: number,  // Volatility
  barrier?: number,
  secondBarrier?: number,
  rebate: number = 1
): Greeks {
  // Pour les options digitales, les grecques sont très sensibles
  // On utilise une approximation basée sur des spreads de vanilles
  
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(S / K) + (r_d + 0.5 * sigma * sigma) * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  
  const N = (x: number) => (1 + erf(x / Math.sqrt(2))) / 2;
  const NPrime = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  
  // Approximation: option digitale ≈ spread de vanilles
  const epsilon = 0.001; // Petit écart pour l'approximation
  const K1 = K - epsilon;
  const K2 = K + epsilon;
  
  const call1 = calculateVanillaGreeks('call', S, K1, r_d, 0, t, sigma);
  const call2 = calculateVanillaGreeks('call', S, K2, r_d, 0, t, sigma);
  
  // Grecques digitales approximées
  const delta = (call1.delta - call2.delta) / (2 * epsilon) * rebate;
  const gamma = (call1.gamma - call2.gamma) / (2 * epsilon) * rebate;
  const theta = (call1.theta - call2.theta) / (2 * epsilon) * rebate;
  const vega = (call1.vega - call2.vega) / (2 * epsilon) * rebate;
  const rho = (call1.rho - call2.rho) / (2 * epsilon) * rebate;
  
  return {
    delta: delta,
    gamma: gamma,
    theta: theta,
    vega: vega,
    rho: rho
  };
}

// Fonction principale pour calculer les grecques selon le type d'option
export function calculateGreeks(
  type: string,
  S: number,
  K: number,
  r_d: number,
  r_f: number,
  t: number,
  sigma: number,
  barrier?: number,
  secondBarrier?: number,
  rebate: number = 1
): Greeks {
  // Options vanilles
  if (type === 'call' || type === 'put') {
    return calculateVanillaGreeks(type as 'call' | 'put', S, K, r_d, r_f, t, sigma);
  }
  
  // Options barrières
  if (type.includes('knockout') || type.includes('knockin')) {
    return calculateBarrierGreeks(type, S, K, r_d, t, sigma, barrier || 0, secondBarrier);
  }
  
  // Options digitales
  if (type.includes('touch') || type.includes('binary')) {
    return calculateDigitalGreeks(type, S, K, r_d, t, sigma, barrier, secondBarrier, rebate);
  }
  
  // Par défaut, retourner des grecques nulles
  return {
    delta: 0,
    gamma: 0,
    theta: 0,
    vega: 0,
    rho: 0
  };
}

// Function to get pricing settings from localStorage
export function getPricingSettings() {
  try {
    const savedSettings = localStorage.getItem('fxRiskManagerSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return settings.pricing || {};
    }
  } catch (error) {
    console.error('Error loading pricing settings:', error);
  }
  
  // Default pricing settings
  return {
    defaultModel: "garman-kohlhagen",
    useRealTimeData: true,
    volatilityModel: "garch",
    interestRateSource: "bloomberg",
    pricingFrequency: "real-time",
    underlyingPriceType: "spot",
    backtestExerciseType: "monthly-average"
  };
}

// Function to get the underlying price type setting
export function getUnderlyingPriceType(): 'spot' | 'forward' {
  const pricingSettings = getPricingSettings();
  return pricingSettings.underlyingPriceType || 'spot';
}

// Function to get the backtest exercise type setting
export function getBacktestExerciseType(): 'monthly-average' | 'third-friday' {
  const pricingSettings = getPricingSettings();
  return pricingSettings.backtestExerciseType || 'monthly-average';
}

// Smart calendar system for accurate date calculations

// Function to check if a year is a leap year
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Function to get the number of days in a month
export function getDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1];
}

// Function to get all Fridays in a given month
export function getFridaysInMonth(year: number, month: number): Date[] {
  const fridays: Date[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  
  // Check each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 5) { // 5 = Friday
      fridays.push(new Date(date));
    }
  }
  
  return fridays;
}

// Function to calculate the third Friday of a given month and year
export function getThirdFridayOfMonth(year: number, month: number): Date | null {
  const fridays = getFridaysInMonth(year, month);
  
  // Return the third Friday if it exists
  if (fridays.length >= 3) {
    const thirdFriday = fridays[2]; // Index 2 = third Friday
    console.log(`[CALENDAR] ${year}-${String(month).padStart(2, '0')}: Found 3rd Friday on ${thirdFriday.toISOString().split('T')[0]} (${fridays.length} Fridays total)`);
    return thirdFriday;
  }
  
  // Handle edge case: months with less than 3 Fridays (very rare)
  console.warn(`[CALENDAR] ${year}-${String(month).padStart(2, '0')}: Only ${fridays.length} Fridays found, using last Friday`);
  return fridays.length > 0 ? fridays[fridays.length - 1] : null;
}

// Function to find the closest date in data to a target date
export function findClosestDateInData(targetDate: Date, dates: string[]): { index: number; date: string; diffDays: number } | null {
  if (dates.length === 0) {
    return null;
  }
  
  let closestIndex = 0;
  let closestDiff = Infinity;
  
  dates.forEach((dateStr, index) => {
    const dataDate = new Date(dateStr);
    const diffMs = Math.abs(dataDate.getTime() - targetDate.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMs < closestDiff) {
      closestDiff = diffMs;
      closestIndex = index;
    }
  });
  
  const diffDays = Math.floor(closestDiff / (1000 * 60 * 60 * 24));
  
  return {
    index: closestIndex,
    date: dates[closestIndex],
    diffDays: diffDays
  };
}

// Function to validate if a date string is valid
export function isValidDateString(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Function to get month range from data
export function getDataDateRange(dates: string[]): { start: Date; end: Date; months: string[] } | null {
  if (dates.length === 0) {
    return null;
  }
  
  const validDates = dates.filter(isValidDateString).map(d => new Date(d));
  if (validDates.length === 0) {
    return null;
  }
  
  const start = new Date(Math.min(...validDates.map(d => d.getTime())));
  const end = new Date(Math.max(...validDates.map(d => d.getTime())));
  
  // Generate list of months in the range
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endMonth) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    months.push(monthKey);
    current.setMonth(current.getMonth() + 1);
  }
  
  return { start, end, months };
}

// Function to calculate the appropriate underlying price based on settings
export function calculateUnderlyingPrice(
  spotPrice: number,
  domesticRate: number,
  foreignRate: number,
  timeToMaturity: number
): { price: number; type: 'spot' | 'forward' } {
  const priceType = getUnderlyingPriceType();
  
  if (priceType === 'forward') {
    return {
      price: calculateFXForwardPrice(spotPrice, domesticRate, foreignRate, timeToMaturity),
      type: 'forward'
    };
  } else {
    return {
      price: spotPrice,
      type: 'spot'
    };
  }
}

// Classe PricingService pour la compatibilité
export class PricingService {
  static calculateBlack76Price = calculateBlack76Price;
  static calculateGarmanKohlhagenPrice = calculateGarmanKohlhagenPrice;
  static calculateVanillaOptionMonteCarlo = calculateVanillaOptionMonteCarlo;
  static calculateBarrierOptionPrice = calculateBarrierOptionPrice;
  static calculateDigitalOptionPrice = calculateDigitalOptionPrice;
  static calculateBarrierOptionClosedForm = calculateBarrierOptionClosedForm;
  static calculateFXForwardPrice = calculateFXForwardPrice;
  static calculateOptionPrice = calculateOptionPrice;
  static calculateImpliedVolatility = calculateImpliedVolatility;
  static calculateSwapPrice = calculateSwapPrice;
  static calculatePricesFromPaths = calculatePricesFromPaths;
  static calculateTimeToMaturity = calculateTimeToMaturity;
  static calculateStrategyPayoffAtPrice = calculateStrategyPayoffAtPrice;
  
  // Greeks calculations
  static calculateGreeks = calculateGreeks;
  static calculateVanillaGreeks = calculateVanillaGreeks;
  static calculateBarrierGreeks = calculateBarrierGreeks;
  static calculateDigitalGreeks = calculateDigitalGreeks;
  
  static erf = erf;
  static CND = CND;
  static getPricingSettings = getPricingSettings;
  static getUnderlyingPriceType = getUnderlyingPriceType;
  static calculateUnderlyingPrice = calculateUnderlyingPrice;
  static getBacktestExerciseType = getBacktestExerciseType;
  static getThirdFridayOfMonth = getThirdFridayOfMonth;
  // Smart calendar functions
  static isLeapYear = isLeapYear;
  static getDaysInMonth = getDaysInMonth;
  static getFridaysInMonth = getFridaysInMonth;
  static findClosestDateInData = findClosestDateInData;
  static isValidDateString = isValidDateString;
  static getDataDateRange = getDataDateRange;
} 