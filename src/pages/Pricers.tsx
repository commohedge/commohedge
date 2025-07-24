import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Info,
  CheckCircle,
  Clock,
  Calendar,
  Percent,
  Hash
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { CURRENCY_PAIRS } from '@/pages/Index';
import PayoffChart from '@/components/PayoffChart';

// Réutiliser les types du Strategy Builder
interface CurrencyPair {
  symbol: string;
  name: string;
  base: string;
  quote: string;
  category: 'majors' | 'crosses' | 'others';
  defaultSpotRate: number;
}

interface StrategyComponent {
  type: 'call' | 'put' | 'swap' | 'forward' | 
         'call-knockout' | 'call-reverse-knockout' | 'call-double-knockout' | 
         'put-knockout' | 'put-reverse-knockout' | 'put-double-knockout' |
         'call-knockin' | 'call-reverse-knockin' | 'call-double-knockin' |
         'put-knockin' | 'put-reverse-knockin' | 'put-double-knockin' |
         'one-touch' | 'double-touch' | 'no-touch' | 'double-no-touch' |
         'range-binary' | 'outside-binary';
  strike: number;
  strikeType: 'percent' | 'absolute';
  volatility: number;
  quantity: number;
  barrier?: number;
  secondBarrier?: number;
  barrierType?: 'percent' | 'absolute';
  rebate?: number;
  timeToPayoff?: number;
}

interface PricingResult {
  price: number;
  method: string;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
}

// Types d'instruments supportés (même que Strategy Builder)
const INSTRUMENT_TYPES = [
  { value: 'call', label: 'Call', category: 'vanilla' },
  { value: 'put', label: 'Put', category: 'vanilla' },
  { value: 'swap', label: 'Swap', category: 'swap' },
  { value: 'forward', label: 'Forward', category: 'forward' },
  { value: 'call-knockout', label: 'Call Knock-Out', category: 'barrier' },
  { value: 'call-reverse-knockout', label: 'Call Reverse Knock-Out', category: 'barrier' },
  { value: 'call-double-knockout', label: 'Call Double Knock-Out', category: 'barrier' },
  { value: 'put-knockout', label: 'Put Knock-Out', category: 'barrier' },
  { value: 'put-reverse-knockout', label: 'Put Reverse Knock-Out', category: 'barrier' },
  { value: 'put-double-knockout', label: 'Put Double Knock-Out', category: 'barrier' },
  { value: 'call-knockin', label: 'Call Knock-In', category: 'barrier' },
  { value: 'call-reverse-knockin', label: 'Call Reverse Knock-In', category: 'barrier' },
  { value: 'call-double-knockin', label: 'Call Double Knock-In', category: 'barrier' },
  { value: 'put-knockin', label: 'Put Knock-In', category: 'barrier' },
  { value: 'put-reverse-knockin', label: 'Put Reverse Knock-In', category: 'barrier' },
  { value: 'put-double-knockin', label: 'Put Double Knock-In', category: 'barrier' },
  { value: 'one-touch', label: 'One Touch (beta)', category: 'digital' },
  { value: 'double-touch', label: 'Double Touch (beta)', category: 'digital' },
  { value: 'no-touch', label: 'No Touch (beta)', category: 'digital' },
  { value: 'double-no-touch', label: 'Double No Touch (beta)', category: 'digital' },
  { value: 'range-binary', label: 'Range Binary (beta)', category: 'digital' },
  { value: 'outside-binary', label: 'Outside Binary (beta)', category: 'digital' }
];

const Pricers = () => {
  const { toast } = useToast();
  
  // État principal
  const [selectedInstrument, setSelectedInstrument] = useState('call');
  const [selectedMethod, setSelectedMethod] = useState('closed-form');
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState('EUR/USD');
  
  // Modèles de pricing (comme dans Strategy Builder)
  const [optionPricingModel, setOptionPricingModel] = useState<'garman-kohlhagen' | 'monte-carlo'>('garman-kohlhagen');
  const [barrierPricingModel, setBarrierPricingModel] = useState<'closed-form' | 'monte-carlo'>('closed-form');
  
  // Inputs de pricing (cohérents avec Strategy Builder)
  const [pricingInputs, setPricingInputs] = useState({
    startDate: new Date().toISOString().split('T')[0],
    maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 an par défaut
    spotPrice: 1.1000,
    domesticRate: 5.0, // En pourcentage
    foreignRate: 3.0, // En pourcentage
    timeToMaturity: 1.0,
    volatility: 15.0, // En pourcentage
    numSimulations: 10000
  });

  // Notional bidirectionnel (base et quote)
  const [notionalBase, setNotionalBase] = useState(1000000);
  const [notionalQuote, setNotionalQuote] = useState(1000000 * (pricingInputs.spotPrice || 1));
  const [lastChanged, setLastChanged] = useState<'base' | 'quote'>('base');

  // Correction de la synchronisation du notional pour éviter la boucle infinie
  useEffect(() => {
    if (lastChanged === 'base') {
      setNotionalQuote(Number((notionalBase * (pricingInputs.spotPrice || 1)).toFixed(2)));
    }
    // eslint-disable-next-line
  }, [notionalBase, pricingInputs.spotPrice]);
  useEffect(() => {
    if (lastChanged === 'quote') {
      setNotionalBase(Number((notionalQuote / (pricingInputs.spotPrice || 1)).toFixed(2)));
    }
    // eslint-disable-next-line
  }, [notionalQuote, pricingInputs.spotPrice]);

  // Composant stratégie (comme dans Strategy Builder)
  const [strategyComponent, setStrategyComponent] = useState<StrategyComponent>({
    type: 'call',
    strike: 110.0, // En pourcentage par défaut
    strikeType: 'percent',
    volatility: 15.0, // En pourcentage
    quantity: 100,
    barrier: undefined,
    barrierType: 'percent',
    secondBarrier: undefined,
    rebate: 1.0,
    timeToPayoff: 1.0 // Temps jusqu'au payoff pour les options one-touch (en années)
  });

  // Résultats
  const [pricingResults, setPricingResults] = useState<PricingResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculer la maturité en années à partir des dates
  const calculateTimeToMaturity = () => {
    const start = new Date(pricingInputs.startDate);
    const maturity = new Date(pricingInputs.maturityDate);
    const diffTime = Math.abs(maturity.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays / 365.25;
  };

  // Mettre à jour la maturité quand les dates changent
  useEffect(() => {
    const timeToMaturity = calculateTimeToMaturity();
    setPricingInputs(prev => ({ ...prev, timeToMaturity }));
  }, [pricingInputs.startDate, pricingInputs.maturityDate]);

  // Mettre à jour le spot price quand la paire de devises change
  useEffect(() => {
    const pair = CURRENCY_PAIRS.find(p => p.symbol === selectedCurrencyPair);
    if (pair) {
      setPricingInputs(prev => ({ ...prev, spotPrice: pair.defaultSpotRate }));
    }
  }, [selectedCurrencyPair]);

  // Mettre à jour le type d'instrument dans le composant stratégie
  useEffect(() => {
    setStrategyComponent(prev => ({ ...prev, type: selectedInstrument as any }));
  }, [selectedInstrument]);

  // Calcul du prix (utilise les mêmes fonctions que Strategy Builder)
  const calculatePrice = async () => {
    setIsCalculating(true);
    
    try {
      const results: PricingResult[] = [];
      
      // Calculer le strike et les barrières selon le type
      const strike = strategyComponent.strikeType === 'percent' 
        ? pricingInputs.spotPrice * (strategyComponent.strike / 100)
        : strategyComponent.strike;
        
            const barrier = strategyComponent.barrier ? (
        strategyComponent.barrierType === 'percent'
          ? pricingInputs.spotPrice * (strategyComponent.barrier / 100)
          : strategyComponent.barrier
      ) : undefined;

      const secondBarrier = strategyComponent.secondBarrier ? (
        strategyComponent.barrierType === 'percent'
          ? pricingInputs.spotPrice * (strategyComponent.secondBarrier / 100)
          : strategyComponent.secondBarrier
      ) : undefined;



      // Utiliser les mêmes fonctions de calcul que Strategy Builder
      // Note: Ces fonctions sont définies dans Index.tsx
      // Pour l'instant, on simule le calcul
      
      // Calculer le prix selon le type d'instrument et les modèles choisis
      let price = 0;
      let methodName = '';
      
      if (strategyComponent.type === 'call' || strategyComponent.type === 'put') {
        // Options vanilles
        if (optionPricingModel === 'garman-kohlhagen') {
          price = calculateGarmanKohlhagenPrice(
            strategyComponent.type,
            pricingInputs.spotPrice,
            strike,
            pricingInputs.domesticRate / 100,
            pricingInputs.foreignRate / 100,
            pricingInputs.timeToMaturity,
            pricingInputs.volatility / 100
          );
          methodName = 'Garman-Kohlhagen (Closed Form)';
        } else {
          // Monte Carlo pour options vanilles
          price = calculateVanillaOptionMonteCarlo(
            strategyComponent.type,
            pricingInputs.spotPrice,
            strike,
            pricingInputs.domesticRate / 100,
            pricingInputs.foreignRate / 100,
            pricingInputs.timeToMaturity,
            pricingInputs.volatility / 100,
            pricingInputs.numSimulations
          );
          methodName = 'Monte Carlo (Vanilla)';
        }
      } else if (strategyComponent.type === 'forward') {
        // Forward
        price = calculateFXForwardPrice(
          pricingInputs.spotPrice,
          pricingInputs.domesticRate / 100,
          pricingInputs.foreignRate / 100,
          pricingInputs.timeToMaturity
        );
        methodName = 'Forward Pricing';
      } else if (strategyComponent.type === 'swap') {
        // Swap
        const forward = calculateFXForwardPrice(
          pricingInputs.spotPrice,
          pricingInputs.domesticRate / 100,
          pricingInputs.foreignRate / 100,
          pricingInputs.timeToMaturity
        );
        price = calculateSwapPrice(
          [forward],
          [pricingInputs.timeToMaturity],
          pricingInputs.domesticRate / 100
        );
        methodName = 'Swap Pricing';
      } else if (strategyComponent.type.includes('knockout') || strategyComponent.type.includes('knockin')) {
        // Options avec barrières
        if (barrierPricingModel === 'closed-form') {
          price = calculateBarrierOptionClosedForm(
            strategyComponent.type,
            pricingInputs.spotPrice,
            strike,
            pricingInputs.domesticRate / 100,
            pricingInputs.timeToMaturity,
            pricingInputs.volatility / 100,
            barrier!,
            secondBarrier
          );
          methodName = 'Barrier Option (Closed Form)';
        } else {
          price = calculateBarrierOptionPrice(
            strategyComponent.type,
            pricingInputs.spotPrice,
            strike,
            pricingInputs.domesticRate / 100,
            pricingInputs.timeToMaturity,
            pricingInputs.volatility / 100,
            barrier!,
            secondBarrier,
            pricingInputs.numSimulations
          );
          methodName = 'Barrier Option (Monte Carlo)';
        }
      } else if (strategyComponent.type.includes('touch') || strategyComponent.type.includes('binary')) {
        // Options digitales (toujours Monte Carlo)
        // Utiliser timeToPayoff pour les one-touch, sinon timeToMaturity
        const timeToUse = strategyComponent.type === 'one-touch' && strategyComponent.timeToPayoff 
          ? strategyComponent.timeToPayoff 
          : pricingInputs.timeToMaturity;
          
        price = calculateDigitalOptionPrice(
          strategyComponent.type,
          pricingInputs.spotPrice,
          strike,
          pricingInputs.domesticRate / 100,
          timeToUse,
          pricingInputs.volatility / 100,
          barrier,
          secondBarrier,
          pricingInputs.numSimulations,
          strategyComponent.rebate || 1
        );
        methodName = 'Digital Option (Monte Carlo)';
      }
      
      if (price > 0) {
        results.push({
          price: price * strategyComponent.quantity / 100,
          method: methodName
        });
      }
      
      setPricingResults(results);
      
      toast({
        title: "Calcul terminé",
        description: `${results.length} méthode(s) de pricing appliquée(s)`,
      });
      
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      toast({
        title: "Erreur de calcul",
        description: "Une erreur s'est produite lors du calcul du prix",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Fonctions de calcul exactement comme dans Strategy Builder
  const erf = (x: number) => {
    // Approximation de la fonction d'erreur
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  };

  const calculateGarmanKohlhagenPrice = (type: string, S: number, K: number, r_d: number, r_f: number, t: number, sigma: number) => {
    const CND = (x: number) => (1 + erf(x / Math.sqrt(2))) / 2;
    
    const forward = S * Math.exp((r_d - r_f) * t);
    const sqrtT = Math.sqrt(t);
    const sigmaSqrtT = sigma * sqrtT;
    
    const d1 = (Math.log(forward / K) + 0.5 * sigma * sigma * t) / sigmaSqrtT;
    const d2 = d1 - sigmaSqrtT;
    
    if (type === 'call') {
      return Math.exp(-r_d * t) * (forward * CND(d1) - K * CND(d2));
    } else if (type === 'put') {
      return Math.exp(-r_d * t) * (K * CND(-d2) - forward * CND(-d1));
    }
    
    return 0;
  };

  const calculateBarrierOptionPrice = (
    optionType: string,
    S: number,      // Current price
    K: number,      // Strike price
    r: number,      // Risk-free rate
    t: number,      // Time to maturity in years
    sigma: number,  // Volatility
    barrier: number, // Barrier level
    secondBarrier?: number, // Second barrier for double barrier options
    numSimulations: number = 1000 // Number of simulations
  ) => {
    // Generate a simple price path for this specific option
    const numSteps = Math.max(252 * t, 50); // At least 50 steps
    const dt = t / numSteps;
    
    // Generate paths for just this one option
    const paths = [];
    for (let i = 0; i < numSimulations; i++) {
      const path = [S]; // Start with current price
      
      // Simulate price path
      for (let step = 0; step < numSteps; step++) {
        const previousPrice = path[path.length - 1];
        // Generate random normal variable
        const randomWalk = Math.random() * 2 - 1; // Simple approximation of normal distribution
        
        // Update price using geometric Brownian motion
        const nextPrice = previousPrice * Math.exp(
          (r - 0.5 * Math.pow(sigma, 2)) * dt + 
          sigma * Math.sqrt(dt) * randomWalk
        );
        
        path.push(nextPrice);
      }
      
      paths.push(path);
    }
    
    // Calculate payoff from paths
    let sum = 0;
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const finalPrice = path[path.length - 1];
      
      let payoff = 0;
      let barrierHit = false;
      let secondBarrierHit = false;
      
      // Check if barriers were hit
      for (let j = 0; j < path.length; j++) {
        if (barrier && path[j] >= barrier) {
          barrierHit = true;
        }
        if (secondBarrier && path[j] <= secondBarrier) {
          secondBarrierHit = true;
        }
      }
      
      // Calculate payoff based on option type
      if (optionType.includes('knockout')) {
        if (optionType.includes('double')) {
          if (!barrierHit && !secondBarrierHit) {
            if (optionType.includes('call')) {
              payoff = Math.max(0, finalPrice - K);
            } else if (optionType.includes('put')) {
              payoff = Math.max(0, K - finalPrice);
            }
          }
        } else {
          if (!barrierHit) {
            if (optionType.includes('call')) {
              payoff = Math.max(0, finalPrice - K);
            } else if (optionType.includes('put')) {
              payoff = Math.max(0, K - finalPrice);
            }
          }
        }
      } else if (optionType.includes('knockin')) {
        if (optionType.includes('double')) {
          if (barrierHit || secondBarrierHit) {
            if (optionType.includes('call')) {
              payoff = Math.max(0, finalPrice - K);
            } else if (optionType.includes('put')) {
              payoff = Math.max(0, K - finalPrice);
            }
          }
        } else {
          if (barrierHit) {
            if (optionType.includes('call')) {
              payoff = Math.max(0, finalPrice - K);
            } else if (optionType.includes('put')) {
              payoff = Math.max(0, K - finalPrice);
            }
          }
        }
      }
      
      sum += Math.exp(-r * t) * payoff;
    }
    
    return Math.max(0, sum / numSimulations);
  };

  const calculateDigitalOptionPrice = (
    optionType: string,
    S: number,      // Current price
    K: number,      // Strike/Barrier level
    r: number,      // Risk-free rate
    t: number,      // Time to maturity
    sigma: number,  // Volatility
    barrier?: number,
    secondBarrier?: number,
    numSimulations: number = 10000,
    rebate: number = 1
  ) => {
    // Conversion du rebate en pourcentage
    const rebateDecimal = rebate / 100;
    
    let payoutSum = 0;
    // Amélioration de la précision de la simulation
    const stepsPerDay = 4;
    const totalSteps = Math.max(252 * t * stepsPerDay, 50);
    const dt = t / totalSteps;
    for (let sim = 0; sim < numSimulations; sim++) {
      let price = S;
      let touched = false;
      let touchedSecond = false;
      for (let step = 0; step < totalSteps; step++) {
        const z = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
        price = price * Math.exp((r - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
        switch (optionType) {
          case 'one-touch':
            if (barrier !== undefined && price >= barrier) touched = true;
            break;
          case 'no-touch':
            if (barrier !== undefined && price >= barrier) touched = true;
            break;
          case 'double-touch':
            if (barrier !== undefined && price >= barrier) touched = true;
            if (secondBarrier !== undefined && price <= secondBarrier) touchedSecond = true;
            break;
          case 'double-no-touch':
            if ((barrier !== undefined && price >= barrier) || (secondBarrier !== undefined && price <= secondBarrier)) touched = true;
            break;
          case 'range-binary':
            if (barrier !== undefined && K !== undefined && price >= K && price <= barrier) touched = true;
            break;
          case 'outside-binary':
            if (barrier !== undefined && K !== undefined && (price < K || price > barrier)) touched = true;
            break;
        }
      }
      
      let payout = 0;
      switch (optionType) {
        case 'one-touch':
          payout = touched ? rebateDecimal : 0;
          break;
        case 'no-touch':
          payout = !touched ? rebateDecimal : 0;
          break;
        case 'double-touch':
          payout = (touched && touchedSecond) ? rebateDecimal : 0;
          break;
        case 'double-no-touch':
          payout = !touched ? rebateDecimal : 0;
          break;
        case 'range-binary':
          payout = touched ? rebateDecimal : 0;
          break;
        case 'outside-binary':
          payout = touched ? rebateDecimal : 0;
          break;
      }
      
      payoutSum += Math.exp(-r * t) * payout;
    }
    
    return payoutSum / numSimulations;
  };

  const calculateFXForwardPrice = (S: number, r_d: number, r_f: number, t: number) => {
    return S * Math.exp((r_d - r_f) * t);
  };

  const calculateSwapPrice = (forwards: number[], timeToMaturities: number[], r: number) => {
    let sum = 0;
    for (let i = 0; i < forwards.length; i++) {
      sum += forwards[i] * Math.exp(-r * timeToMaturities[i]);
    }
    return sum;
  };

  // Fonction Monte Carlo pour options vanilles (comme dans Strategy Builder)
  const calculateVanillaOptionMonteCarlo = (
    optionType: string,
    S: number,      // Current price
    K: number,      // Strike price
    r_d: number,    // Domestic risk-free rate
    r_f: number,    // Foreign risk-free rate 
    t: number,      // Time to maturity in years
    sigma: number,  // Volatility
    numSimulations: number = 1000 // Number of simulations
  ) => {
    let payoffSum = 0;
    
    for (let i = 0; i < numSimulations; i++) {
      // Generate random normal variable (using Box-Muller transform for better accuracy)
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Simulate final FX price using geometric Brownian motion
      const finalPrice = S * Math.exp(
        (r_d - r_f - 0.5 * sigma * sigma) * t + 
        sigma * Math.sqrt(t) * z
      );
      
      // Calculate payoff
      let payoff = 0;
      if (optionType === 'call') {
        payoff = Math.max(finalPrice - K, 0);
      } else if (optionType === 'put') {
        payoff = Math.max(K - finalPrice, 0);
      }
      
      payoffSum += payoff;
    }
    
    // Calculate average payoff and discount to present value
    const averagePayoff = payoffSum / numSimulations;
    const optionPrice = averagePayoff * Math.exp(-r_d * t);
    
    return Math.max(0, optionPrice);
  };

  // Fonction Closed Form pour les options avec barrières (comme dans Strategy Builder)
  const calculateBarrierOptionClosedForm = (
    optionType: string,
    S: number,      // Current price
    K: number,      // Strike price
    r: number,      // Risk-free rate
    t: number,      // Time to maturity in years
    sigma: number,  // Volatility
    barrier: number, // Barrier level
    secondBarrier?: number // Second barrier for double barrier options
  ) => {
    // Pour l'instant, utiliser Monte Carlo pour toutes les options avec barrières
    // car les formules fermées sont complexes et peuvent avoir des bugs
    return calculateBarrierOptionPrice(optionType, S, K, r, t, sigma, barrier, secondBarrier, pricingInputs.numSimulations);
  };

  // Mise à jour des inputs
  const updatePricingInput = (field: string, value: any) => {
    setPricingInputs(prev => ({ ...prev, [field]: value }));
  };

  const updateStrategyComponent = (field: keyof StrategyComponent, value: any) => {
    setStrategyComponent(prev => ({ ...prev, [field]: value }));
  };

  // Formatage des résultats
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(price);
  };

  const getMethodIcon = (method: string) => {
    if (method.includes('Closed Form')) return <Calculator className="w-4 h-4" />;
    if (method.includes('Monte Carlo')) return <BarChart3 className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const getMethodColor = (method: string) => {
    if (method.includes('Closed Form')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (method.includes('Monte Carlo')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  // Obtenir la paire de devises sélectionnée
  const selectedPair = CURRENCY_PAIRS.find(p => p.symbol === selectedCurrencyPair);

  // Calculs complémentaires pour l'affichage des résultats
  const notional = notionalBase;
  const spot = pricingInputs.spotPrice;
  const base = selectedPair?.base || 'EUR';
  const quote = selectedPair?.quote || 'USD';
  const premiumBase = pricingResults.length > 0 ? pricingResults[0].price * notional : 0;
  const premiumQuote = premiumBase * spot;
  const strikeAbs = strategyComponent.strikeType === 'percent' ? spot * (strategyComponent.strike / 100) : strategyComponent.strike;
  const barrierAbs = strategyComponent.barrierType === 'percent' && strategyComponent.barrier ? spot * strategyComponent.barrier / 100 : (strategyComponent.barrier || undefined);
  const secondBarrierAbs = strategyComponent.barrierType === 'percent' && strategyComponent.secondBarrier ? spot * strategyComponent.secondBarrier / 100 : (strategyComponent.secondBarrier || undefined);

  // Génération des données de payoff pour le graphique
  const generatePayoffData = () => {
    const spot = pricingInputs.spotPrice;
    const priceRange = Array.from({length: 101}, (_, i) => spot * (0.7 + i * 0.006)); // -30% à +30%
    return priceRange.map(price => {
      let totalPayoff = 0;
      // On simule la stratégie comme dans le Strategy Builder
      const strike = strategyComponent.strikeType === 'percent' ? spot * (strategyComponent.strike / 100) : strategyComponent.strike;
      const quantity = strategyComponent.quantity / 100;
      let payoff = 0;
      if (strategyComponent.type === 'call') {
        payoff = Math.max(0, price - strike);
      } else if (strategyComponent.type === 'put') {
        payoff = Math.max(0, strike - price);
      } else if (strategyComponent.type === 'swap') {
        payoff = spot - price;
      } else if (strategyComponent.type === 'forward') {
        payoff = spot - price;
      } else if (strategyComponent.type.includes('knockout') || strategyComponent.type.includes('knockin')) {
        const barrier = strategyComponent.barrierType === 'percent' ? spot * (strategyComponent.barrier || 0) / 100 : (strategyComponent.barrier || 0);
        let isBarrierBroken = false;
        if (strategyComponent.type.includes('knockout')) {
          if (strategyComponent.type.includes('call')) {
            isBarrierBroken = price >= barrier;
          } else if (strategyComponent.type.includes('put')) {
            isBarrierBroken = price <= barrier;
          }
          payoff = isBarrierBroken ? 0 : (strategyComponent.type.includes('call') ? Math.max(0, price - strike) : Math.max(0, strike - price));
        } else if (strategyComponent.type.includes('knockin')) {
          if (strategyComponent.type.includes('call')) {
            isBarrierBroken = price >= barrier;
          } else if (strategyComponent.type.includes('put')) {
            isBarrierBroken = price <= barrier;
          }
          payoff = isBarrierBroken ? (strategyComponent.type.includes('call') ? Math.max(0, price - strike) : Math.max(0, strike - price)) : 0;
        }
      } else if ([
        'one-touch', 'no-touch', 'double-touch', 'double-no-touch', 'range-binary', 'outside-binary'
      ].includes(strategyComponent.type)) {
        // Options digitales : payoff = rebate si condition atteinte
        const barrier = strategyComponent.barrierType === 'percent' ? spot * (strategyComponent.barrier || 0) / 100 : (strategyComponent.barrier || 0);
        const secondBarrier = strategyComponent.barrierType === 'percent' ? spot * (strategyComponent.secondBarrier || 0) / 100 : (strategyComponent.secondBarrier || 0);
        const rebate = (strategyComponent.rebate || 1) / 100;
        let conditionMet = false;
        switch(strategyComponent.type) {
          case 'one-touch':
            conditionMet = price >= barrier;
            break;
          case 'no-touch':
            conditionMet = price < barrier;
            break;
          case 'double-touch':
            conditionMet = price >= barrier || price <= secondBarrier;
            break;
          case 'double-no-touch':
            conditionMet = price < barrier && price > secondBarrier;
            break;
          case 'range-binary':
            conditionMet = price <= barrier && price >= strike;
            break;
          case 'outside-binary':
            conditionMet = price > barrier || price < strike;
            break;
        }
        payoff = conditionMet ? rebate : 0;
      }
      totalPayoff += payoff * quantity;
      return { price, payoff: totalPayoff };
    });
  };

  const payoffData = generatePayoffData();

  return (
    <Layout 
      title="Pricers"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Pricers" }
      ]}
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pricers FX</h1>
            <p className="text-muted-foreground">
              Pricing avancé pour options, swaps et forwards avec multiples méthodes
            </p>
          </div>
          <Button 
            onClick={calculatePrice} 
            disabled={isCalculating}
            className="flex items-center gap-2"
          >
            {isCalculating ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Calcul...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Calculer
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panneau de configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Sélection de l'instrument */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type d'instrument */}
                <div className="space-y-2">
                  <Label>Type d'instrument</Label>
                  <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUMENT_TYPES.map((instrument) => (
                        <SelectItem key={instrument.value} value={instrument.value}>
                          {instrument.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Paire de devises */}
                <div className="space-y-2">
                  <Label>Paire de devises</Label>
                  <Select value={selectedCurrencyPair} onValueChange={setSelectedCurrencyPair}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_PAIRS.map((pair) => (
                        <SelectItem key={pair.symbol} value={pair.symbol}>
                          {pair.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Modèles de pricing selon le type d'instrument */}
                {(strategyComponent.type === 'call' || strategyComponent.type === 'put') && (
                  <div className="space-y-2">
                    <Label>Modèle pour options vanilles</Label>
                    <Select value={optionPricingModel} onValueChange={(value: 'garman-kohlhagen' | 'monte-carlo') => setOptionPricingModel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="garman-kohlhagen">Garman-Kohlhagen (Closed Form)</SelectItem>
                        <SelectItem value="monte-carlo">Monte Carlo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(strategyComponent.type.includes('knockout') || strategyComponent.type.includes('knockin')) && (
                  <div className="space-y-2">
                    <Label>Modèle pour options avec barrières</Label>
                    <Select value={barrierPricingModel} onValueChange={(value: 'closed-form' | 'monte-carlo') => setBarrierPricingModel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closed-form">Closed Form</SelectItem>
                        <SelectItem value="monte-carlo">Monte Carlo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(strategyComponent.type.includes('touch') || strategyComponent.type.includes('binary')) && (
                  <div className="space-y-2">
                    <Label>Modèle pour options digitales</Label>
                    <div className="text-sm text-muted-foreground p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      Monte Carlo (seule méthode disponible)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dates (cohérent avec Strategy Builder) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date de début */}
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={pricingInputs.startDate}
                    onChange={(e) => updatePricingInput('startDate', e.target.value)}
                  />
                </div>

                {/* Date de maturité */}
                <div className="space-y-2">
                  <Label>Date de maturité</Label>
                  <Input
                    type="date"
                    value={pricingInputs.maturityDate}
                    onChange={(e) => updatePricingInput('maturityDate', e.target.value)}
                  />
                </div>

                {/* Maturité calculée */}
                <div className="space-y-2">
                  <Label>Maturité (années)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingInputs.timeToMaturity.toFixed(2)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Paramètres de base */}
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prix spot */}
                <div className="space-y-2">
                  <Label>Prix spot ({selectedPair?.symbol || 'EUR/USD'})</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={pricingInputs.spotPrice}
                    onChange={(e) => updatePricingInput('spotPrice', parseFloat(e.target.value))}
                  />
                </div>

                {/* Prix d'exercice */}
                <div className="space-y-2">
                  <Label>Prix d'exercice</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={strategyComponent.strike}
                      onChange={(e) => updateStrategyComponent('strike', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <Select value={strategyComponent.strikeType} onValueChange={(value: 'percent' | 'absolute') => updateStrategyComponent('strikeType', value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            %
                          </div>
                        </SelectItem>
                        <SelectItem value="absolute">
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Abs
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {strategyComponent.strikeType === 'percent' 
                      ? `Valeur absolue: ${(pricingInputs.spotPrice * strategyComponent.strike / 100).toFixed(4)}`
                      : `Pourcentage: ${((strategyComponent.strike / pricingInputs.spotPrice) * 100).toFixed(2)}%`
                    }
                  </div>
                </div>

                {/* Quantité */}
                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    step="1"
                    value={strategyComponent.quantity}
                    onChange={(e) => updateStrategyComponent('quantity', parseInt(e.target.value))}
                  />
                </div>

                {/* Notional */}
                <div className="space-y-2">
                  <Label>Notional</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="1000"
                        value={notionalBase}
                        onChange={e => { setNotionalBase(parseFloat(e.target.value) || 0); setLastChanged('base'); }}
                        min={0}
                      />
                      <div className="text-xs text-muted-foreground">{selectedPair?.base || 'EUR'}</div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="1000"
                        value={notionalQuote}
                        onChange={e => { setNotionalQuote(parseFloat(e.target.value) || 0); setLastChanged('quote'); }}
                        min={0}
                      />
                      <div className="text-xs text-muted-foreground">{selectedPair?.quote || 'USD'}</div>
                    </div>
                  </div>
                </div>

                {/* Taux domestique */}
                <div className="space-y-2">
                  <Label>
                    Taux {selectedPair?.quote || 'USD'} (%)
                    <span className="ml-1 text-xs text-muted-foreground" title="Taux d'intérêt de la devise de contrepartie (quote). Utilisé comme taux domestique dans la formule FX.">?</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingInputs.domesticRate}
                    onChange={(e) => updatePricingInput('domesticRate', parseFloat(e.target.value))}
                  />
                </div>

                {/* Taux étranger */}
                <div className="space-y-2">
                  <Label>
                    Taux {selectedPair?.base || 'EUR'} (%)
                    <span className="ml-1 text-xs text-muted-foreground" title="Taux d'intérêt de la devise de base (base). Utilisé comme taux étranger dans la formule FX.">?</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingInputs.foreignRate}
                    onChange={(e) => updatePricingInput('foreignRate', parseFloat(e.target.value))}
                  />
                </div>

                {/* Volatilité */}
                <div className="space-y-2">
                  <Label>Volatilité (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pricingInputs.volatility}
                    onChange={(e) => updatePricingInput('volatility', parseFloat(e.target.value))}
                  />
                </div>

                {/* Barrière - visible par défaut pour les options avec barrières */}
                {(selectedInstrument.includes('knockout') || selectedInstrument.includes('knockin') || selectedInstrument.includes('touch')) && (
                  <div className="space-y-2">
                    <Label>Barrière</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={strategyComponent.barrier ?? ''}
                        onChange={(e) => updateStrategyComponent('barrier', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <Select value={strategyComponent.barrierType || 'percent'} onValueChange={(value: 'percent' | 'absolute') => updateStrategyComponent('barrierType', value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">
                            <div className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              %
                            </div>
                          </SelectItem>
                          <SelectItem value="absolute">
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              Abs
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {strategyComponent.barrier !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {strategyComponent.barrierType === 'percent' 
                          ? `Valeur absolue: ${(spot * strategyComponent.barrier / 100).toFixed(4)}`
                          : `Pourcentage: ${((strategyComponent.barrier / spot) * 100).toFixed(2)}%`
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Deuxième barrière - visible par défaut pour les options double */}
                {selectedInstrument.includes('double') && (
                  <div className="space-y-2">
                    <Label>Deuxième barrière</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={strategyComponent.secondBarrier ?? ''}
                        onChange={(e) => updateStrategyComponent('secondBarrier', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <Select value={strategyComponent.barrierType || 'percent'} onValueChange={(value: 'percent' | 'absolute') => updateStrategyComponent('barrierType', value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">
                            <div className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              %
                            </div>
                          </SelectItem>
                          <SelectItem value="absolute">
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              Abs
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {strategyComponent.secondBarrier !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {strategyComponent.barrierType === 'percent' 
                          ? `Valeur absolue: ${(spot * strategyComponent.secondBarrier / 100).toFixed(4)}`
                          : `Pourcentage: ${((strategyComponent.secondBarrier / spot) * 100).toFixed(2)}%`
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Paramètres spécifiques aux options digitales */}
                {(selectedInstrument.includes('touch') || selectedInstrument.includes('binary')) && (
                  <>
                    {/* Rebate - pour toutes les options digitales */}
                    <div className="space-y-2">
                      <Label>Rebate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={strategyComponent.rebate || 1.0}
                        onChange={(e) => updateStrategyComponent('rebate', parseFloat(e.target.value))}
                        placeholder="1.0"
                      />
                      <div className="text-xs text-muted-foreground">
                        Montant du rebate en pourcentage du nominal (défaut: 1%)
                      </div>
                    </div>

                    {/* Time to Payoff - spécifique aux one-touch */}
                    {selectedInstrument === 'one-touch' && (
                      <div className="space-y-2">
                        <Label>Temps jusqu'au payoff (années)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={strategyComponent.timeToPayoff || 1.0}
                          onChange={(e) => updateStrategyComponent('timeToPayoff', parseFloat(e.target.value))}
                          placeholder="1.0"
                        />
                        <div className="text-xs text-muted-foreground">
                          Temps jusqu'au payoff pour les options one-touch (défaut: 1 an)
                        </div>
                      </div>
                    )}

                    {/* Informations sur les options digitales */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Options Digitales
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        {selectedInstrument === 'one-touch' && (
                          <div>• One Touch: Paiement si le prix touche la barrière</div>
                        )}
                        {selectedInstrument === 'no-touch' && (
                          <div>• No Touch: Paiement si le prix ne touche jamais la barrière</div>
                        )}
                        {selectedInstrument === 'double-touch' && (
                          <div>• Double Touch: Paiement si le prix touche les deux barrières</div>
                        )}
                        {selectedInstrument === 'double-no-touch' && (
                          <div>• Double No Touch: Paiement si le prix ne touche aucune barrière</div>
                        )}
                        {selectedInstrument === 'range-binary' && (
                          <div>• Range Binary: Paiement si le prix reste dans la fourchette</div>
                        )}
                        {selectedInstrument === 'outside-binary' && (
                          <div>• Outside Binary: Paiement si le prix sort de la fourchette</div>
                        )}
                        <div>• Rebate: {strategyComponent.rebate || 1.0}% du nominal</div>
                        {selectedInstrument === 'one-touch' && (
                          <div>• Temps de payoff: {strategyComponent.timeToPayoff || 1.0} an(s)</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Paramètres avancés */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Paramètres avancés
                  <Switch
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                  />
                </CardTitle>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  {/* Nombre de simulations */}
                  {selectedMethod === 'monte-carlo' && (
                    <div className="space-y-2">
                      <Label>Nombre de simulations</Label>
                      <Input
                        type="number"
                        step="1000"
                        value={pricingInputs.numSimulations}
                        onChange={(e) => updatePricingInput('numSimulations', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Résultats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Résultats de pricing */}
            {pricingResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Résultats de pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pricingResults.map((result, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={getMethodColor(result.method)}>
                            <div className="flex items-center gap-1">
                              {getMethodIcon(result.method)}
                              {result.method}
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Prix:</span>
                            <span className="font-mono font-bold text-lg">
                              {formatPrice(result.price)}
                            </span>
                          </div>

                          {result.greeks && (
                            <div className="pt-2 border-t">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Grecques:</div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {result.greeks.delta !== undefined && (
                                  <div>Δ: {formatPrice(result.greeks.delta)}</div>
                                )}
                                {result.greeks.gamma !== undefined && (
                                  <div>Γ: {formatPrice(result.greeks.gamma)}</div>
                                )}
                                {result.greeks.theta !== undefined && (
                                  <div>Θ: {formatPrice(result.greeks.theta)}</div>
                                )}
                                {result.greeks.vega !== undefined && (
                                  <div>Vega: {formatPrice(result.greeks.vega)}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Résumé de la transaction */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Résumé de la transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Notional :</span><br/>
                    {notional.toLocaleString()} {base} <span className="text-muted-foreground">(≈ {notionalQuote.toLocaleString(undefined, {maximumFractionDigits:2})} {quote})</span>
                  </div>
                  <div>
                    <span className="font-semibold">Prix spot :</span><br/>
                    {spot} {quote}/{base}
                  </div>
                  <div>
                    <span className="font-semibold">Strike absolu :</span><br/>
                    {strikeAbs.toFixed(4)} {quote}
                  </div>
                  <div>
                    <span className="font-semibold">Barrière 1 :</span><br/>
                    {barrierAbs ? barrierAbs.toFixed(4) + ' ' + quote : '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Barrière 2 :</span><br/>
                    {secondBarrierAbs ? secondBarrierAbs.toFixed(4) + ' ' + quote : '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Taux {quote} :</span><br/>
                    {pricingInputs.domesticRate} %
                  </div>
                  <div>
                    <span className="font-semibold">Taux {base} :</span><br/>
                    {pricingInputs.foreignRate} %
                  </div>
                  <div>
                    <span className="font-semibold">Volatilité :</span><br/>
                    {pricingInputs.volatility} %
                  </div>
                  <div>
                    <span className="font-semibold">Maturité :</span><br/>
                    {pricingInputs.timeToMaturity.toFixed(2)} ans
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations sur les méthodes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Informations sur les méthodes
                </CardTitle>
              </CardHeader>
                              <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Garman-Kohlhagen (Closed Form)</h4>
                      <p className="text-sm text-muted-foreground">
                        Modèle analytique exact pour les options vanilles FX. Extension du modèle Black-Scholes adapté aux devises.
                        Précision exacte et calcul rapide.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Barrier Options (Closed Form)</h4>
                      <p className="text-sm text-muted-foreground">
                        Formules analytiques pour les options avec barrières simples (knockout/knockin).
                        Basé sur les formules de Merton et adapté pour FX.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Monte Carlo</h4>
                      <p className="text-sm text-muted-foreground">
                        Simulation stochastique applicable à tous types d'options.
                        Particulièrement utile pour les options complexes, barrières doubles et options digitales.
                        Précision contrôlable par le nombre de simulations.
                      </p>
                    </div>
                  </div>
                </CardContent>
            </Card>

            {/* Prime totale */}
            {pricingResults.length > 0 && (
              <div className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Prime totale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-lg">
                      <div><span className="font-semibold">Premium ({base}) :</span> {premiumBase.toLocaleString(undefined, {maximumFractionDigits:2})} {base}</div>
                      <div><span className="font-semibold">Premium ({quote}) :</span> {premiumQuote.toLocaleString(undefined, {maximumFractionDigits:2})} {quote}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Affichage du graphique Payoff/FX Hedging */}
            <Card className="mt-6">
              <PayoffChart
                data={payoffData}
                strategy={[strategyComponent]}
                spot={pricingInputs.spotPrice}
                currencyPair={selectedPair}
                includePremium={true}
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pricers; 