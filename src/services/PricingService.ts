// PricingService centralisé - Utilise les fonctions de Index.tsx
// Ce service fait le pont entre les autres composants et les fonctions de pricing de Index.tsx

export class PricingService {
  // Référence aux fonctions de pricing de Index.tsx
  private static pricingFunctions: any = null;

  // Initialiser les fonctions de pricing depuis Index.tsx
  static initializePricingFunctions(functions: any) {
    this.pricingFunctions = functions;
  }

  // Vérifier que les fonctions sont initialisées
  private static checkInitialization() {
    if (!this.pricingFunctions) {
      console.warn('PricingService: Functions not initialized. Please call initializePricingFunctions first.');
      return false;
    }
    return true;
  }

  // Wrapper pour calculateGarmanKohlhagenPrice
  static calculateGarmanKohlhagenPrice(
    type: string, 
    S: number, 
    K: number, 
    r_d: number, 
    r_f: number, 
    t: number, 
    sigma: number
  ): number {
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateGarmanKohlhagenPrice(type, S, K, r_d, r_f, t, sigma);
  }

  // Wrapper pour calculateVanillaOptionMonteCarlo
  static calculateVanillaOptionMonteCarlo(
    optionType: string,
    S: number,
    K: number,
    r_d: number,
    r_f: number,
    t: number,
    sigma: number,
    numSimulations: number = 1000
  ): number {
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateVanillaOptionMonteCarlo(optionType, S, K, r_d, r_f, t, sigma, numSimulations);
  }

  // Wrapper pour calculateBarrierOptionPrice
  static calculateBarrierOptionPrice(
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
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateBarrierOptionPrice(optionType, S, K, r, t, sigma, barrier, secondBarrier, numSimulations);
  }

  // Wrapper pour calculateDigitalOptionPrice
  static calculateDigitalOptionPrice(
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
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateDigitalOptionPrice(optionType, S, K, r, t, sigma, barrier, secondBarrier, numSimulations, rebate);
  }

  // Wrapper pour calculateBarrierOptionClosedForm
  static calculateBarrierOptionClosedForm(
    optionType: string,
    S: number,
    K: number,
    r_d: number,
    t: number,
    sigma: number,
    barrier: number,
    secondBarrier?: number,
    r_f: number = 0
  ): number {
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateBarrierOptionClosedForm(optionType, S, K, r_d, t, sigma, barrier, secondBarrier, r_f);
  }

  // Wrapper pour calculateFXForwardPrice
  static calculateFXForwardPrice(S: number, r_d: number, r_f: number, t: number): number {
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateFXForwardPrice(S, r_d, r_f, t);
  }

  // Wrapper pour calculateOptionPrice (fonction générique)
  static calculateOptionPrice(
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
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.calculateOptionPrice(type, S, K, r_d, r_f, t, sigma, barrier, secondBarrier, rebate, numSimulations);
  }

  // Wrapper pour erf
  static erf(x: number): number {
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.erf(x);
  }

  // Wrapper pour CND
  static CND(x: number): number {
    if (!this.checkInitialization()) return 0;
    return this.pricingFunctions.CND ? this.pricingFunctions.CND(x) : (1 + this.erf(x / Math.sqrt(2))) / 2;
  }
} 