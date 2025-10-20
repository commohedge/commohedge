/**
 * Commodity Pricing Models
 * 
 * Implémentation des modèles de pricing pour options sur commodities :
 * - Black-76 (modèle principal pour options sur commodities)
 * - Monte Carlo pour options exotiques
 * - Closed-form pour options à barrière
 * - Implied Volatility
 */

import { CostOfCarryParams, ForwardPriceComponents } from '@/types/Commodity';

// ===== FONCTIONS UTILITAIRES =====

/**
 * Error Function (Fonction d'erreur)
 * Utilisée pour la distribution normale cumulative
 */
export function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Cumulative Normal Distribution (Distribution normale cumulative)
 */
export function CND(x: number): number {
  return (1 + erf(x / Math.sqrt(2))) / 2;
}

/**
 * Standard Normal Probability Density Function
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ===== COST OF CARRY =====

/**
 * Calcule le cost of carry pour une commodity
 * b = r + storage_cost - convenience_yield
 * 
 * @param params - Paramètres du cost of carry
 * @returns Cost of carry annualisé
 */
export function calculateCostOfCarry(params: CostOfCarryParams): number {
  return params.riskFreeRate + params.storageCost - params.convenienceYield;
}

/**
 * Calcule le prix forward d'une commodity
 * F = S * e^(b * t)
 * 
 * @param S - Prix spot
 * @param b - Cost of carry
 * @param t - Time to maturity (en années)
 * @returns Forward price
 */
export function calculateCommodityForwardPrice(
  S: number,
  b: number,
  t: number
): number {
  return S * Math.exp(b * t);
}

/**
 * Calcule les composants du prix forward avec détails
 */
export function calculateForwardPriceComponents(
  spotPrice: number,
  riskFreeRate: number,
  storageCost: number,
  convenienceYield: number,
  timeToMaturity: number
): ForwardPriceComponents {
  const costOfCarry = riskFreeRate + storageCost - convenienceYield;
  const forwardPrice = spotPrice * Math.exp(costOfCarry * timeToMaturity);
  const contangoBackwardation = forwardPrice - spotPrice;

  return {
    spotPrice,
    forwardPrice,
    costOfCarry,
    timeToMaturity,
    impliedStorageCost: storageCost,
    impliedConvenienceYield: convenienceYield,
    contangoBackwardation
  };
}

// ===== BLACK-76 MODEL =====

/**
 * Modèle Black-76 pour options sur commodities
 * 
 * Ce modèle est le standard pour les options sur futures/forwards de commodities
 * 
 * Formule:
 * d1 = [ln(F/K) + 0.5 * σ² * t] / (σ * √t)
 * d2 = d1 - σ * √t
 * 
 * Call = e^(-r*t) * [F * N(d1) - K * N(d2)]
 * Put  = e^(-r*t) * [K * N(-d2) - F * N(-d1)]
 * 
 * où F = S * e^(b*t) est le prix forward
 * 
 * @param type - 'call' ou 'put'
 * @param S - Prix spot de la commodity
 * @param K - Strike price
 * @param r - Taux sans risque
 * @param b - Cost of carry (r + storage - convenience)
 * @param t - Time to maturity (en années)
 * @param sigma - Volatilité annualisée
 * @returns Prix de l'option
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
  if (t <= 0) return 0;
  if (sigma <= 0) return 0;

  // Calcul du prix forward
  const F = S * Math.exp(b * t);

  // Calcul de d1 et d2 selon Black-76
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  // Discount factor
  const discountFactor = Math.exp(-r * t);

  let price = 0;

  if (type.toLowerCase() === 'call') {
    // Call option: e^(-r*t) * [F * N(d1) - K * N(d2)]
    price = discountFactor * (F * CND(d1) - K * CND(d2));
  } else if (type.toLowerCase() === 'put') {
    // Put option: e^(-r*t) * [K * N(-d2) - F * N(-d1)]
    price = discountFactor * (K * CND(-d2) - F * CND(-d1));
  }

  return Math.max(0, price);
}

/**
 * Wrapper pour compatibilité avec l'ancien système FX
 * Convertit les paramètres FX (r_d, r_f) vers commodity (r, b)
 * 
 * @deprecated Utilisez calculateBlack76Price directement
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
  // Pour commodities: b = r_d - r_f (équivalent au cost of carry en FX)
  const r = r_d;
  const b = r_d - r_f;
  return calculateBlack76Price(type, S, K, r, b, t, sigma);
}

// ===== GREEKS FOR BLACK-76 =====

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

/**
 * Calcule les grecques pour options vanilles (Black-76)
 * 
 * @param type - 'call' ou 'put'
 * @param S - Prix spot
 * @param K - Strike
 * @param r - Taux sans risque
 * @param b - Cost of carry
 * @param t - Time to maturity
 * @param sigma - Volatilité
 * @returns Greeks
 */
export function calculateVanillaGreeks(
  type: 'call' | 'put',
  S: number,
  K: number,
  r: number,
  b: number,
  t: number,
  sigma: number
): Greeks {
  if (t <= 0 || sigma <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  // Calcul du forward
  const F = S * Math.exp(b * t);

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = CND(d1);
  const Nd2 = CND(d2);
  const NPrimeD1 = normalPDF(d1);
  const discountFactor = Math.exp(-r * t);

  let delta: number;
  let gamma: number;
  let theta: number;
  let vega: number;
  let rho: number;

  if (type === 'call') {
    // Delta = e^(-r*t) * e^(b*t) * N(d1) = e^((b-r)*t) * N(d1)
    delta = Math.exp((b - r) * t) * Nd1;

    // Gamma = e^(-r*t) * N'(d1) / (S * σ * √t)
    gamma = discountFactor * NPrimeD1 / (S * sigma * sqrtT);

    // Theta (per year, divide by 252 for daily)
    const term1 = -discountFactor * F * NPrimeD1 * sigma / (2 * sqrtT);
    const term2 = r * discountFactor * K * Nd2;
    const term3 = -r * discountFactor * F * Nd1;
    theta = term1 + term2 + term3;

    // Vega (per 1% change in volatility)
    vega = discountFactor * F * NPrimeD1 * sqrtT / 100;

    // Rho (per 1% change in interest rate)
    rho = discountFactor * K * t * Nd2 / 100;

  } else {
    // Put
    delta = Math.exp((b - r) * t) * (Nd1 - 1);
    gamma = discountFactor * NPrimeD1 / (S * sigma * sqrtT);

    const term1 = -discountFactor * F * NPrimeD1 * sigma / (2 * sqrtT);
    const term2 = -r * discountFactor * K * CND(-d2);
    const term3 = r * discountFactor * F * CND(-d1);
    theta = term1 + term2 + term3;

    vega = discountFactor * F * NPrimeD1 * sqrtT / 100;
    rho = -discountFactor * K * t * CND(-d2) / 100;
  }

  return { delta, gamma, theta, vega, rho };
}

// ===== MONTE CARLO SIMULATIONS =====

/**
 * Génère un nombre aléatoire selon une distribution normale (0, 1)
 */
function normalRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Pricing d'option vanille par Monte Carlo (Black-76)
 * 
 * @param optionType - 'call' ou 'put'
 * @param S - Prix spot
 * @param K - Strike
 * @param r - Taux sans risque
 * @param b - Cost of carry
 * @param t - Time to maturity
 * @param sigma - Volatilité
 * @param numSimulations - Nombre de simulations
 * @returns Prix de l'option
 */
export function calculateVanillaOptionMonteCarlo(
  optionType: string,
  S: number,
  K: number,
  r: number,
  b: number,
  t: number,
  sigma: number,
  numSimulations: number = 1000
): number {
  let sumPayoff = 0;

  // Forward price
  const F = S * Math.exp(b * t);

  for (let i = 0; i < numSimulations; i++) {
    // Simulate final forward price using geometric Brownian motion
    const Z = normalRandom();
    const F_T = F * Math.exp(-0.5 * sigma * sigma * t + sigma * Math.sqrt(t) * Z);

    // Calculate payoff
    let payoff = 0;
    if (optionType.toLowerCase() === 'call') {
      payoff = Math.max(F_T - K, 0);
    } else if (optionType.toLowerCase() === 'put') {
      payoff = Math.max(K - F_T, 0);
    }

    sumPayoff += payoff;
  }

  // Average payoff discounted to present value
  const averagePayoff = sumPayoff / numSimulations;
  const price = Math.exp(-r * t) * averagePayoff;

  return price;
}

/**
 * Pricing d'option à barrière par Monte Carlo
 * 
 * @param optionType - Type d'option ('knock-out-call', 'knock-in-put', etc.)
 * @param S - Prix spot
 * @param K - Strike
 * @param r - Taux sans risque
 * @param b - Cost of carry
 * @param t - Time to maturity
 * @param sigma - Volatilité
 * @param barrier - Niveau de barrière
 * @param secondBarrier - Deuxième barrière (pour double barriers)
 * @param numSimulations - Nombre de simulations
 * @returns Prix de l'option
 */
export function calculateBarrierOptionPrice(
  optionType: string,
  S: number,
  K: number,
  r: number,
  b: number,
  t: number,
  sigma: number,
  barrier: number,
  secondBarrier?: number,
  numSimulations: number = 1000
): number {
  const numSteps = 100; // Nombre de pas pour surveiller la barrière
  const dt = t / numSteps;
  const F0 = S * Math.exp(b * t); // Forward initial

  let sumPayoff = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    let F_t = S; // Commence au spot
    let barrierHit = false;

    // Simuler le chemin
    for (let step = 0; step < numSteps; step++) {
      const Z = normalRandom();
      const drift = (b - 0.5 * sigma * sigma) * dt;
      const diffusion = sigma * Math.sqrt(dt) * Z;
      F_t = F_t * Math.exp(drift + diffusion);

      // Vérifier les barrières
      if (secondBarrier !== undefined) {
        // Double barrier
        if (F_t <= Math.min(barrier, secondBarrier) || F_t >= Math.max(barrier, secondBarrier)) {
          barrierHit = true;
          break;
        }
      } else {
        // Single barrier
        if (optionType.includes('down') && F_t <= barrier) {
          barrierHit = true;
          break;
        } else if (optionType.includes('up') && F_t >= barrier) {
          barrierHit = true;
          break;
        }
      }
    }

    // Calculer le payoff selon le type d'option
    let payoff = 0;
    const isKnockOut = optionType.includes('knock-out') || optionType.includes('knockout');
    const isCall = optionType.includes('call');

    if (isKnockOut) {
      // Knock-out: payoff seulement si barrière NON touchée
      if (!barrierHit) {
        payoff = isCall ? Math.max(F_t - K, 0) : Math.max(K - F_t, 0);
      }
    } else {
      // Knock-in: payoff seulement si barrière touchée
      if (barrierHit) {
        payoff = isCall ? Math.max(F_t - K, 0) : Math.max(K - F_t, 0);
      }
    }

    sumPayoff += payoff;
  }

  const averagePayoff = sumPayoff / numSimulations;
  return Math.exp(-r * t) * averagePayoff;
}

// ===== IMPLIED VOLATILITY =====

/**
 * Calcule la volatilité implicite par méthode de Newton-Raphson
 * 
 * @param optionType - 'call' ou 'put'
 * @param S - Prix spot
 * @param K - Strike
 * @param r - Taux sans risque
 * @param b - Cost of carry
 * @param t - Time to maturity
 * @param marketPrice - Prix de marché observé
 * @param tolerance - Tolérance pour convergence
 * @param maxIterations - Nombre maximum d'itérations
 * @returns Volatilité implicite
 */
export function calculateImpliedVolatility(
  optionType: string,
  S: number,
  K: number,
  r: number,
  b: number,
  t: number,
  marketPrice: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  let sigma = 0.3; // Initial guess: 30%

  for (let i = 0; i < maxIterations; i++) {
    const price = calculateBlack76Price(optionType, S, K, r, b, t, sigma);
    const diff = price - marketPrice;

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    // Vega pour Newton-Raphson
    const greeks = calculateVanillaGreeks(
      optionType as 'call' | 'put',
      S, K, r, b, t, sigma
    );
    const vega = greeks.vega * 100; // Convertir en vega pour 100% change

    if (vega === 0) {
      break;
    }

    // Mise à jour Newton-Raphson
    sigma = sigma - diff / vega;

    // Contraintes: volatilité entre 1% et 500%
    sigma = Math.max(0.01, Math.min(5.0, sigma));
  }

  return sigma;
}

// ===== DIGITAL/BINARY OPTIONS =====

/**
 * Pricing d'option digitale/binaire
 * 
 * @param optionType - Type d'option digitale
 * @param S - Prix spot
 * @param K - Strike/Barrier
 * @param r - Taux sans risque
 * @param b - Cost of carry
 * @param t - Time to maturity
 * @param sigma - Volatilité
 * @param barrier - Niveau de barrière
 * @param secondBarrier - Deuxième barrière
 * @param numSimulations - Nombre de simulations
 * @param rebate - Payout en cas de succès
 * @returns Prix de l'option
 */
export function calculateDigitalOptionPrice(
  optionType: string,
  S: number,
  K: number,
  r: number,
  b: number,
  t: number,
  sigma: number,
  barrier?: number,
  secondBarrier?: number,
  numSimulations: number = 10000,
  rebate: number = 1
): number {
  // Utiliser Monte Carlo pour les digitales complexes
  const numSteps = 100;
  const dt = t / numSteps;
  let successCount = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    let F_t = S;
    let barrierTouched = false;

    for (let step = 0; step < numSteps; step++) {
      const Z = normalRandom();
      const drift = (b - 0.5 * sigma * sigma) * dt;
      const diffusion = sigma * Math.sqrt(dt) * Z;
      F_t = F_t * Math.exp(drift + diffusion);

      if (barrier !== undefined) {
        if (F_t >= barrier) {
          barrierTouched = true;
          if (optionType.includes('one-touch')) {
            break; // Pour one-touch, on peut sortir dès que touché
          }
        }
      }
    }

    // Déterminer le succès selon le type d'option
    let success = false;
    if (optionType.includes('one-touch')) {
      success = barrierTouched;
    } else if (optionType.includes('no-touch')) {
      success = !barrierTouched;
    } else if (optionType.includes('range')) {
      // Range binary: rester entre deux barrières
      success = barrier !== undefined && secondBarrier !== undefined &&
                F_t >= Math.min(barrier, secondBarrier) &&
                F_t <= Math.max(barrier, secondBarrier);
    }

    if (success) {
      successCount++;
    }
  }

  const probability = successCount / numSimulations;
  return Math.exp(-r * t) * probability * rebate;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Calcule le temps jusqu'à maturité en années
 */
export function calculateTimeToMaturity(maturityDate: string, valuationDate: string): number {
  const maturity = new Date(maturityDate);
  const valuation = new Date(valuationDate);
  const diffTime = maturity.getTime() - valuation.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  return diffDays / 365.25;
}

