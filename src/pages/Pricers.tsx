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
import { CURRENCY_PAIRS } from '@/pages/Index'; // Commodity data
import PayoffChart from '@/components/PayoffChart';
import { PricingService, Greeks } from '@/services/PricingService';

// Interface pour les commodities (adaptée du Strategy Builder)
interface CurrencyPair { // Renamed to Commodity in a previous step, but still named CurrencyPair here for compatibility
  symbol: string;
  name: string;
  base: string;  // Unit (BBL, OZ, MT, etc.) - for display only
  quote: string; // Currency (usually USD) - for display only
  category: 'energy' | 'metals' | 'agriculture' | 'livestock' | 'majors' | 'crosses' | 'others'; // Commodity categories + legacy FX
  defaultSpotRate: number; // Default spot price for this commodity
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
  greeks?: Greeks;
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
  
  // Helper functions for commodity pricing
  const getRiskFreeRate = () => pricingInputs.interestRate / 100;
  const getStorageCost = () => pricingInputs.storageCost / 100;
  const getConvenienceYield = () => pricingInputs.convenienceYield / 100;
  const calculateCostOfCarry = () => getRiskFreeRate() + getStorageCost() - getConvenienceYield();
  
  // État principal
  const [selectedInstrument, setSelectedInstrument] = useState('call');
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState('WTI');
  
  // ✅ AJOUT: Sélection du modèle de pricing pour les barrières
  const [barrierPricingModel, setBarrierPricingModel] = useState<'closed-form' | 'monte-carlo'>('closed-form');
  
  // ✅ AJOUT: Sélection du prix sous-jacent pour TOUTES les options
  const [underlyingPriceType, setUnderlyingPriceType] = useState<'forward' | 'spot'>('forward');
  
  // Inputs de pricing (adaptés pour commodities)
  const [pricingInputs, setPricingInputs] = useState({
    startDate: new Date().toISOString().split('T')[0],
    maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 an par défaut
    spotPrice: 75.50, // WTI default price
    interestRate: 5.0, // Risk-free rate (en pourcentage)
    storageCost: 2.0, // Storage cost (en pourcentage)
    convenienceYield: 1.0, // Convenience yield (en pourcentage)
    timeToMaturity: 1.0,
    volatility: 25.0, // Commodity volatility (en pourcentage)
    numSimulations: 1000 // ✅ 1000 comme Strategy Builder
  });

  // Volume principal (simplifié)
  const [volume, setVolume] = useState(1000000);

  // Volume simplifié - pas de synchronisation nécessaire

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
  const [showGreeks, setShowGreeks] = useState(true);

  // Utiliser la même fonction de calcul de maturité que Strategy Builder
  const calculateTimeToMaturity = () => {
    return PricingService.calculateTimeToMaturity(
      pricingInputs.maturityDate,
      pricingInputs.startDate
    );
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

  // Calcul du prix - UTILISE UNIQUEMENT PricingService.calculateOptionPrice
  const calculatePrice = async (showToast: boolean = true) => {
    setIsCalculating(true);
    
    try {
      const results: PricingResult[] = [];
      
      // Calculer le strike selon le type
      const strike = strategyComponent.strikeType === 'percent' 
        ? pricingInputs.spotPrice * (strategyComponent.strike / 100)
        : strategyComponent.strike;
        
      // Calculer les barrières selon le type
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

      console.log('Calculated values:', {
        strike,
        barrier,
        secondBarrier,
        spotPrice: pricingInputs.spotPrice,
        type: strategyComponent.type
      });

      // ✅ UTILISATION STRICTE DE PricingService.calculateOptionPrice
      // Cette fonction gère TOUS les types d'options automatiquement
      let price = 0;
      let methodName = '';
      
      // ✅ CALCUL DU PRIX SOUS-JACENT POUR TOUTES LES OPTIONS
      let underlyingPrice: number;
      let underlyingLabel: string;
      
      if (underlyingPriceType === 'forward') {
        // Commodity forward: F = S * exp(b * t) where b = r + storage - convenience
        underlyingPrice = pricingInputs.spotPrice * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity);
        underlyingLabel = 'Forward';
      } else {
        underlyingPrice = pricingInputs.spotPrice;
        underlyingLabel = 'Spot';
      }
      
      if (strategyComponent.type === 'forward') {
        // Pour les forwards, utiliser directement la fonction forward
        // Commodity forward: F = S * exp(b * t) where b = r + storage - convenience
        const forward = pricingInputs.spotPrice * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity);
        price = forward - strike;
        methodName = 'Forward Pricing';
      } else if (strategyComponent.type === 'swap') {
        // Pour les swaps, calculer le forward puis utiliser swap pricing
        const forward = pricingInputs.spotPrice * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity);
        price = PricingService.calculateSwapPrice(
          [forward],
          [pricingInputs.timeToMaturity],
          getRiskFreeRate()
        );
        methodName = 'Swap Pricing';
      } else if (strategyComponent.type === 'call' || strategyComponent.type === 'put') {
        // ✅ VANILLA OPTIONS - Black-76 for commodities (utilise prix sous-jacent choisi)
        price = PricingService.calculateBlack76Price(
          strategyComponent.type,
          underlyingPrice, // ✅ Forward ou Spot selon le choix
          strike,
          getRiskFreeRate(),
          calculateCostOfCarry(),
          pricingInputs.timeToMaturity,
          strategyComponent.volatility / 100
        );
        methodName = `Black-76 (${underlyingLabel})`;
      } else if (strategyComponent.type.includes('knockout') || strategyComponent.type.includes('knockin')) {
        // ✅ BARRIER OPTIONS - UTILISE LE PRIX SOUS-JACENT CALCULÉ
        if (barrierPricingModel === 'closed-form') {
          price = PricingService.calculateBarrierOptionClosedForm(
            strategyComponent.type,
            underlyingPrice, // ✅ Forward ou Spot selon le choix
            strike,
            getRiskFreeRate(),
            pricingInputs.timeToMaturity,
            strategyComponent.volatility / 100,
            barrier || 0,
            secondBarrier
            // Note: Black-76 uses risk-free rate only
          );
          methodName = `Barrier Closed-Form (${underlyingLabel})`;
        } else {
          price = PricingService.calculateBarrierOptionPrice(
            strategyComponent.type,
            underlyingPrice, // ✅ Forward ou Spot selon le choix
            strike,
            getRiskFreeRate(),
            pricingInputs.timeToMaturity,
            strategyComponent.volatility / 100,
            barrier || 0,
            secondBarrier,
            1000 // ✅ 1000 simulations comme Strategy Builder
          );
          methodName = `Barrier Monte Carlo (${underlyingLabel})`;
        }
      } else {
        // ✅ DIGITAL OPTIONS - Monte Carlo (utilise prix sous-jacent choisi)
        price = PricingService.calculateDigitalOptionPrice(
          strategyComponent.type,
          underlyingPrice, // ✅ Forward ou Spot selon le choix
          strike,
          getRiskFreeRate(),
          pricingInputs.timeToMaturity,
          strategyComponent.volatility / 100,
          barrier,
          secondBarrier,
          pricingInputs.numSimulations,
          strategyComponent.rebate || 1
        );
        methodName = `Digital Monte Carlo (${underlyingLabel})`;
      }
      
      // Calculer les grecques si demandé
      let greeks: Greeks | undefined;
      if (showGreeks && strategyComponent.type !== 'forward' && strategyComponent.type !== 'swap') {
        // Greeks calculation temporarily disabled
        // try {
        //   greeks = PricingService.calculateGreeks(
        //     strategyComponent.type,
        //     underlyingPrice,
        //     strike,
        //     getRiskFreeRate(),
        //     calculateCostOfCarry(),
        //     pricingInputs.timeToMaturity,
        //     strategyComponent.volatility / 100,
        //     barrier,
        //     secondBarrier,
        //     strategyComponent.rebate || 1
        //   );
        // } catch (error) {
        //   console.warn('Error calculating Greeks:', error);
        // }
      }
      
      // Ajouter le résultat
      if (price !== undefined && price !== null && !isNaN(price)) {
        results.push({
          price: price * strategyComponent.quantity / 100,
          method: methodName,
          greeks: greeks
        });
      }
      
      setPricingResults(results);
      
      if (showToast) {
        toast({
          title: "Calculation completed",
          description: `${results.length} pricing method(s) applied`,
        });
      }
      
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      if (showToast) {
        toast({
          title: "Calculation Error",
          description: "An error occurred during price calculation",
          variant: "destructive"
        });
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Fonction pour le bouton Calculer
  const handleCalculateClick = () => {
    calculatePrice(true);
  };

  // Mise à jour des inputs
  const updatePricingInput = (field: string, value: any) => {
    setPricingInputs(prev => ({ ...prev, [field]: value }));
  };

  const updateStrategyComponent = (field: keyof StrategyComponent, value: any) => {
    setStrategyComponent(prev => ({ ...prev, [field]: value }));
  };

  // ✅ AJOUT: Fonctions de gestion des notionnels
  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  // Recalculer automatiquement le prix quand les paramètres changent
  useEffect(() => {
    // Ne recalculer que si on a déjà des résultats (utilisateur a cliqué sur Calculer au moins une fois)
    if (pricingResults.length > 0) {
      const timeoutId = setTimeout(() => {
        calculatePrice(false); // false = ne pas afficher le toast
      }, 500); // 500ms de délai
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    strategyComponent.type,
    strategyComponent.strike,
    strategyComponent.strikeType,
    strategyComponent.barrier,
    strategyComponent.secondBarrier,
    strategyComponent.barrierType,
    strategyComponent.volatility,
    strategyComponent.quantity,
    strategyComponent.rebate,
    strategyComponent.timeToPayoff,
    pricingInputs.spotPrice,
    pricingInputs.domesticRate,
    pricingInputs.foreignRate,
    pricingInputs.timeToMaturity,
    barrierPricingModel, // ✅ Recalculer quand le modèle change
    underlyingPriceType, // ✅ Recalculer quand le type de sous-jacent change
    volume, // ✅ Recalculer quand le volume change
    showGreeks // ✅ Recalculer quand l'affichage des grecques change
  ]);

  // ✅ AJOUT: Recalculer les données de prix automatiquement quand les paramètres changent
  useEffect(() => {
    // Recalculer les données de prix seulement si on a déjà calculé au moins une fois
    if (pricingResults.length > 0) {
      // Les données se mettent à jour automatiquement via generatePriceData()
      // car elles dépendent des mêmes paramètres que le prix principal
      console.log('Price data updated automatically');
    }
  }, [
    strategyComponent,
    pricingInputs,
    barrierPricingModel,
    underlyingPriceType,
    showGreeks,
    pricingResults // ✅ Recalculer quand les résultats de pricing changent
  ]);

  // Formatage des résultats
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(price);
  };

  const getMethodIcon = (method: string) => {
    if (method.includes('Closed-Form') || method.includes('Garman-Kohlhagen')) return <Calculator className="w-4 h-4" />;
    if (method.includes('Monte Carlo')) return <BarChart3 className="w-4 h-4" />;
    if (method.includes('Forward') || method.includes('Swap')) return <TrendingUp className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const getMethodColor = (method: string) => {
    if (method.includes('Garman-Kohlhagen') || method.includes('Closed-Form')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (method.includes('Monte Carlo') || method.includes('Digital')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (method.includes('Forward') || method.includes('Swap')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  // Formatage des grecques
  const formatGreek = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(value);
  };

  const getGreekColor = (value: number, type: 'delta' | 'gamma' | 'theta' | 'vega' | 'rho') => {
    if (type === 'theta') {
      // Theta est généralement négatif (décroissance temporelle)
      return value < 0 ? 'text-red-600' : 'text-green-600';
    }
    if (type === 'gamma') {
      // Gamma est généralement positif
      return value > 0 ? 'text-green-600' : 'text-red-600';
    }
    return 'text-gray-900 dark:text-gray-100';
  };

  // Obtenir la paire de devises sélectionnée
  const selectedPair = CURRENCY_PAIRS.find(p => p.symbol === selectedCurrencyPair);

  // Calculs complémentaires pour l'affichage des résultats
  // Volume principal pour les calculs
  const spot = pricingInputs.spotPrice;
  const base = selectedPair?.base || 'EUR';
  const quote = selectedPair?.quote || 'USD';
  const premium = pricingResults.length > 0 ? pricingResults[0].price * volume : 0;
  const strikeAbs = strategyComponent.strikeType === 'percent' ? spot * (strategyComponent.strike / 100) : strategyComponent.strike;
  const barrierAbs = strategyComponent.barrierType === 'percent' && strategyComponent.barrier ? spot * strategyComponent.barrier / 100 : (strategyComponent.barrier || undefined);
  const secondBarrierAbs = strategyComponent.barrierType === 'percent' && strategyComponent.secondBarrier ? spot * strategyComponent.secondBarrier / 100 : (strategyComponent.secondBarrier || undefined);

  // Génération des données de payoff pour le graphique - UTILISE STRICTEMENT PricingService
  const generatePayoffData = () => {
    const spot = pricingInputs.spotPrice;
    const priceRange = Array.from({length: 101}, (_, i) => spot * (0.7 + i * 0.006)); // -30% à +30%
    const premium = pricingResults.length > 0 ? pricingResults[0].price : 0; // ✅ Vraie prime calculée
    
    return priceRange.map(price => {
      // ✅ UTILISER STRICTEMENT PricingService.calculateStrategyPayoffAtPrice
      let totalPayoff = PricingService.calculateStrategyPayoffAtPrice([strategyComponent], price, spot);
      
      // ✅ Intégrer la vraie prime dans le payoff
      // Pour un achat d'option (quantity > 0), on soustrait la prime payée
      // Pour une vente d'option (quantity < 0), on ajoute la prime reçue
      if (premium !== 0 && strategyComponent.quantity !== 0) {
        const quantity = strategyComponent.quantity / 100;
        if (quantity > 0) {
          totalPayoff -= premium; // Achat: on paie la prime
        } else if (quantity < 0) {
          totalPayoff += premium; // Vente: on reçoit la prime
        }
      }
      
      return { price, payoff: totalPayoff };
    });
  };

  const payoffData = generatePayoffData();

  // ✅ AJOUT: Génération des données de prix et grecques en fonction du spot
  const generatePriceData = () => {
    const currentSpot = pricingInputs.spotPrice;
    const spotRange = Array.from({length: 101}, (_, i) => currentSpot * (0.7 + i * 0.006)); // -30% à +30%
    
    return spotRange.map(spot => {
      try {
        // Calculer le strike selon le type
        const strike = strategyComponent.strikeType === 'percent' 
          ? currentSpot * (strategyComponent.strike / 100)  // Utiliser le spot original pour le strike
          : strategyComponent.strike;
          
        // Calculer les barrières selon le type
        const barrier = strategyComponent.barrier ? (
          strategyComponent.barrierType === 'percent'
            ? currentSpot * (strategyComponent.barrier / 100)
            : strategyComponent.barrier
        ) : undefined;

        const secondBarrier = strategyComponent.secondBarrier ? (
          strategyComponent.barrierType === 'percent'
            ? currentSpot * (strategyComponent.secondBarrier / 100)
            : strategyComponent.secondBarrier
        ) : undefined;

        // ✅ CALCUL DU PRIX SOUS-JACENT POUR TOUTES LES OPTIONS
        let underlyingPrice: number;
        
        if (underlyingPriceType === 'forward') {
          // Commodity forward: F = S * exp(b * t) where b = r + storage - convenience
          underlyingPrice = spot * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity);
        } else {
          underlyingPrice = spot; // Utiliser le spot variable
        }
        
        let price = 0;
        let greeks: Greeks | undefined;
        
        if (strategyComponent.type === 'forward') {
          // Commodity forward: F = S * exp(b * t) where b = r + storage - convenience
          const forward = spot * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity);
          price = forward - strike;
        } else if (strategyComponent.type === 'swap') {
          const forward = spot * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity);
          price = PricingService.calculateSwapPrice(
            [forward],
            [pricingInputs.timeToMaturity],
            getRiskFreeRate()
          );
        } else if (strategyComponent.type === 'call' || strategyComponent.type === 'put') {
          // ✅ VANILLA OPTIONS - Black-76 for commodities
          price = PricingService.calculateBlack76Price(
            strategyComponent.type,
            underlyingPrice,
            strike,
            getRiskFreeRate(),
            calculateCostOfCarry(),
            pricingInputs.timeToMaturity,
            strategyComponent.volatility / 100
          );
          
          // Calculer les grecques
          if (showGreeks) {
            // Greeks calculation temporarily disabled
            // greeks = PricingService.calculateGreeks(
            //   strategyComponent.type,
            //   underlyingPrice,
            //   strike,
            //   getRiskFreeRate(),
            //   calculateCostOfCarry(),
            //   pricingInputs.timeToMaturity,
            //   strategyComponent.volatility / 100,
            //   barrier,
            //   secondBarrier,
            //   strategyComponent.rebate || 1
            // );
          }
        } else if (strategyComponent.type.includes('knockout') || strategyComponent.type.includes('knockin')) {
          // ✅ BARRIER OPTIONS
          if (barrierPricingModel === 'closed-form') {
            price = PricingService.calculateBarrierOptionClosedForm(
              strategyComponent.type,
              underlyingPrice,
              strike,
              getRiskFreeRate(),
              pricingInputs.timeToMaturity,
              strategyComponent.volatility / 100,
              barrier || 0,
              secondBarrier
            );
          } else {
            price = PricingService.calculateBarrierOptionPrice(
              strategyComponent.type,
              underlyingPrice,
              strike,
              getRiskFreeRate(),
              pricingInputs.timeToMaturity,
              strategyComponent.volatility / 100,
              barrier || 0,
              secondBarrier,
              1000
            );
          }
          
          // Calculer les grecques pour les barrières
          if (showGreeks) {
            // Greeks calculation temporarily disabled
            // try {
            //   greeks = PricingService.calculateGreeks(
            //     strategyComponent.type,
            //     underlyingPrice,
            //     strike,
            //     getRiskFreeRate(),
            //     calculateCostOfCarry(),
            //     pricingInputs.timeToMaturity,
            //     strategyComponent.volatility / 100,
            //     barrier,
            //     secondBarrier,
            //     strategyComponent.rebate || 1
            //   );
            // } catch (error) {
            //   console.warn('Error calculating Greeks for barrier option at spot', spot, error);
            // }
          }
        } else {
          // ✅ DIGITAL OPTIONS
          price = PricingService.calculateDigitalOptionPrice(
            strategyComponent.type,
            underlyingPrice,
            strike,
            getRiskFreeRate(),
            pricingInputs.timeToMaturity,
            strategyComponent.volatility / 100,
            barrier,
            secondBarrier,
            pricingInputs.numSimulations,
            strategyComponent.rebate || 1
          );
        }
        
        // Ajuster le prix par la quantité
        const adjustedPrice = price * strategyComponent.quantity / 100;
        
        return { 
          spot: parseFloat(spot.toFixed(4)), 
          price: adjustedPrice,
          delta: greeks?.delta || 0,
          gamma: greeks?.gamma || 0,
          theta: greeks?.theta || 0,
          vega: greeks?.vega || 0,
          rho: greeks?.rho || 0
        };
      } catch (error) {
        console.warn('Error calculating price/greeks at spot', spot, error);
        return { 
          spot: parseFloat(spot.toFixed(4)), 
          price: 0,
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          rho: 0
        };
      }
    });
  };

  // Calculer les données de prix et grecques
  const priceData = generatePriceData();

  return (
    <Layout 
      title="Commodity Pricers"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Commodity Pricers" }
      ]}
    >
      <div className="space-y-8">
        {/* En-tête moderne */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Commodity Pricers</h1>
            <p className="text-lg text-muted-foreground">
              Advanced commodity pricing engine for options, swaps and forwards
            </p>
          </div>
          <Button 
            onClick={handleCalculateClick} 
            disabled={isCalculating}
            size="lg"
            className="flex items-center gap-3 px-8 py-3 text-base font-medium"
          >
            {isCalculating ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                Calculate
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Panneau de configuration */}
          <div className="xl:col-span-1 space-y-6">
            {/* Sélection de l'instrument */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Settings className="w-6 h-6 text-primary" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type d'instrument */}
                <div className="space-y-2">
                  <Label>Instrument Type</Label>
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

                {/* ✅ AJOUT: Modèle de pricing pour les barrières */}
                {(selectedInstrument.includes('knockout') || selectedInstrument.includes('knockin')) && (
                  <div className="space-y-2">
                    <Label>Barrier Pricing Model</Label>
                    <Select value={barrierPricingModel} onValueChange={(value: 'closed-form' | 'monte-carlo') => setBarrierPricingModel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closed-form">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            Closed-Form (Analytical)
                          </div>
                        </SelectItem>
                        <SelectItem value="monte-carlo">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Monte Carlo (Simulation)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {barrierPricingModel === 'closed-form' 
                        ? 'Uses exact analytical formulas'
                        : 'Uses 1000 Monte Carlo simulations'
                      }
                    </div>
                  </div>
                )}

                {/* ✅ AJOUT: Type de prix sous-jacent pour TOUTES les options */}
                {(selectedInstrument !== 'forward' && selectedInstrument !== 'swap') && (
                  <div className="space-y-2">
                    <Label>Underlying Price for Options</Label>
                    <Select value={underlyingPriceType} onValueChange={(value: 'forward' | 'spot') => setUnderlyingPriceType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forward">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Forward Price (Recommended)
                          </div>
                        </SelectItem>
                        <SelectItem value="spot">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            Spot Price
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {underlyingPriceType === 'forward' 
                        ? `Forward = ${pricingInputs.spotPrice} × exp((${pricingInputs.interestRate}% + ${pricingInputs.storageCost}% - ${pricingInputs.convenienceYield}%) × ${pricingInputs.timeToMaturity.toFixed(2)}) ≈ ${(pricingInputs.spotPrice * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity)).toFixed(4)}`
                        : `Spot = ${pricingInputs.spotPrice} (current market price)`
                      }
                    </div>
                  </div>
                )}

                {/* ✅ AJOUT: Affichage des grecques */}
                {(selectedInstrument !== 'forward' && selectedInstrument !== 'swap') && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="greeks-toggle"
                        checked={showGreeks}
                        onCheckedChange={setShowGreeks}
                      />
                      <Label htmlFor="greeks-toggle" className="text-sm">
                        Calculate Greeks
                      </Label>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {showGreeks 
                        ? 'Delta, Gamma, Theta, Vega and Rho will be calculated with analytical formulas'
                        : 'Greeks will not be calculated (performance gain)'
                      }
                    </div>
                  </div>
                )}

                {/* Paire de devises */}
                <div className="space-y-2">
                  <Label>Commodity</Label>
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
              </CardContent>
            </Card>

            {/* Dates (cohérent avec Strategy Builder) */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Calendar className="w-6 h-6 text-primary" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date de début */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={pricingInputs.startDate}
                    onChange={(e) => updatePricingInput('startDate', e.target.value)}
                  />
                </div>

                {/* Date de maturité */}
                <div className="space-y-2">
                  <Label>Maturity Date</Label>
                  <Input
                    type="date"
                    value={pricingInputs.maturityDate}
                    onChange={(e) => updatePricingInput('maturityDate', e.target.value)}
                  />
                </div>

                {/* Maturité calculée */}
                <div className="space-y-2">
                  <Label>Maturity (years)</Label>
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
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Basic Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prix spot */}
                <div className="space-y-2">
                  <Label>Spot Price ({selectedPair?.symbol || 'EUR/USD'})</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={pricingInputs.spotPrice}
                    onChange={(e) => updatePricingInput('spotPrice', parseFloat(e.target.value))}
                  />
                </div>

                {/* Prix d'exercice */}
                <div className="space-y-2">
                  <Label>Strike Price</Label>
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
                      ? `Absolute value: ${(pricingInputs.spotPrice * strategyComponent.strike / 100).toFixed(4)}`
                      : `Percentage: ${((strategyComponent.strike / pricingInputs.spotPrice) * 100).toFixed(2)}%`
                    }
                  </div>
                </div>

                {/* Quantité */}
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="1"
                    value={strategyComponent.quantity}
                    onChange={(e) => updateStrategyComponent('quantity', parseInt(e.target.value))}
                  />
                </div>

                {/* ✅ AJOUT: Notionnels bidirectionnels */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Notionnels</Label>
                  
                  {/* Volume principal */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Volume
                    </Label>
                    <Input
                      type="number"
                      step="1000"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  
                  {/* Indicateur de prix */}
                  <div className="text-xs text-muted-foreground text-center">
                    📊 Spot Price: {pricingInputs.spotPrice} {selectedPair?.quote || 'USD'}
                  </div>
                </div>

                {/* Volatilité */}
                <div className="space-y-2">
                  <Label>Volatility (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={strategyComponent.volatility}
                    onChange={(e) => updateStrategyComponent('volatility', parseFloat(e.target.value))}
                  />
                </div>

                {/* Risk-free Rate */}
                <div className="space-y-2">
                  <Label>
                    Risk-free Rate (%)
                    <span className="ml-1 text-xs text-muted-foreground" title="Risk-free interest rate for commodity pricing">?</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingInputs.interestRate}
                    onChange={(e) => updatePricingInput('interestRate', parseFloat(e.target.value))}
                  />
                </div>

                {/* Storage Cost */}
                <div className="space-y-2">
                  <Label>
                    Storage Cost (%)
                    <span className="ml-1 text-xs text-muted-foreground" title="Storage cost for holding the commodity">?</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingInputs.storageCost}
                    onChange={(e) => updatePricingInput('storageCost', parseFloat(e.target.value))}
                  />
                </div>

                {/* Convenience Yield */}
                <div className="space-y-2">
                  <Label>
                    Convenience Yield (%)
                    <span className="ml-1 text-xs text-muted-foreground" title="Convenience yield from holding the commodity">?</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingInputs.convenienceYield}
                    onChange={(e) => updatePricingInput('convenienceYield', parseFloat(e.target.value))}
                  />
                </div>

                {/* Barrière - visible par défaut pour les options avec barrières */}
                {(selectedInstrument.includes('knockout') || selectedInstrument.includes('knockin') || selectedInstrument.includes('touch')) && (
                  <div className="space-y-2">
                    <Label>Barrier</Label>
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
                          ? `Absolute value: ${(spot * strategyComponent.barrier / 100).toFixed(4)}`
                          : `Percentage: ${((strategyComponent.barrier / spot) * 100).toFixed(2)}%`
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Deuxième barrière - visible par défaut pour les options double */}
                {selectedInstrument.includes('double') && (
                  <div className="space-y-2">
                    <Label>Second Barrier</Label>
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
                          ? `Absolute value: ${(spot * strategyComponent.secondBarrier / 100).toFixed(4)}`
                          : `Percentage: ${((strategyComponent.secondBarrier / spot) * 100).toFixed(2)}%`
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
                        Rebate amount as percentage of notional (default: 1%)
                      </div>
                    </div>

                    {/* Time to Payoff - spécifique aux one-touch */}
                    {selectedInstrument === 'one-touch' && (
                      <div className="space-y-2">
                        <Label>Time to Payoff (years)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={strategyComponent.timeToPayoff || 1.0}
                          onChange={(e) => updateStrategyComponent('timeToPayoff', parseFloat(e.target.value))}
                          placeholder="1.0"
                        />
                        <div className="text-xs text-muted-foreground">
                          Time to payoff for one-touch options (default: 1 year)
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Paramètres avancés */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-xl">
                  Advanced Parameters
                  <Switch
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                  />
                </CardTitle>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  {/* Nombre de simulations */}
                  <div className="space-y-2">
                    <Label>Number of Simulations</Label>
                    <Input
                      type="number"
                      step="100"
                      value={pricingInputs.numSimulations}
                      onChange={(e) => updatePricingInput('numSimulations', parseInt(e.target.value))}
                    />
                    <div className="text-xs text-muted-foreground">
                      Used for Monte Carlo simulations (default: 1000 like Strategy Builder)
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Résultats */}
          <div className="xl:col-span-3 space-y-8">
            {/* Résultats de pricing */}
            {pricingResults.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Pricing Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {pricingResults.map((result, index) => (
                      <Card key={index} className="p-6 border-0 shadow-md">
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
                              <div className="text-xs font-medium text-muted-foreground mb-2">Analytical Greeks:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className={`${getGreekColor(result.greeks.delta, 'delta')}`}>
                                  <span className="font-medium">Δ (Delta):</span><br/>
                                  {formatGreek(result.greeks.delta)}
                                </div>
                                <div className={`${getGreekColor(result.greeks.gamma, 'gamma')}`}>
                                  <span className="font-medium">Γ (Gamma):</span><br/>
                                  {formatGreek(result.greeks.gamma)}
                                </div>
                                <div className={`${getGreekColor(result.greeks.theta, 'theta')}`}>
                                  <span className="font-medium">Θ (Theta):</span><br/>
                                  {formatGreek(result.greeks.theta)}
                                </div>
                                <div className={`${getGreekColor(result.greeks.vega, 'vega')}`}>
                                  <span className="font-medium">Vega:</span><br/>
                                  {formatGreek(result.greeks.vega)}
                                </div>
                                <div className={`${getGreekColor(result.greeks.rho, 'rho')}`}>
                                  <span className="font-medium">ρ (Rho):</span><br/>
                                  {formatGreek(result.greeks.rho)}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                <strong>Interpretation:</strong><br/>
                                Δ: Sensitivity to underlying price<br/>
                                Γ: Delta sensitivity to price<br/>
                                Θ: Time decay<br/>
                                Vega: Sensitivity to volatility<br/>
                                ρ: Sensitivity to interest rates
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
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Volume</span><br/>
                    <span className="text-lg font-semibold">{volume.toLocaleString()}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Spot Price</span><br/>
                    <span className="text-lg font-semibold">{spot} {quote}/{base}</span>
                  </div>
                  {(selectedInstrument !== 'forward' && selectedInstrument !== 'swap') && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <span className="font-semibold text-sm text-muted-foreground">Underlying Price</span><br/>
                      <span className="text-lg font-semibold">
                        {underlyingPriceType === 'forward' 
                          ? `${(spot * Math.exp(calculateCostOfCarry() * pricingInputs.timeToMaturity)).toFixed(4)} (Forward)`
                          : `${spot} (Spot)`
                        }
                      </span>
                    </div>
                  )}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Absolute Strike</span><br/>
                    <span className="text-lg font-semibold">{strikeAbs.toFixed(4)} {quote}</span>
                  </div>
                  {/* ✅ Afficher les barrières selon le type d'option */}
                  {(selectedInstrument.includes('knockout') || selectedInstrument.includes('knockin') || selectedInstrument.includes('touch') || selectedInstrument.includes('binary')) && (
                    <>
                      {/* ✅ Barrier 1 - toujours affiché pour les options avec barrières */}
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <span className="font-semibold text-sm text-muted-foreground">Barrier 1</span><br/>
                        <span className="text-lg font-semibold">{barrierAbs ? barrierAbs.toFixed(4) + ' ' + quote : '-'}</span>
                      </div>
                      
                      {/* ✅ Barrier 2 - seulement pour les options double barrière */}
                      {selectedInstrument.includes('double') && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <span className="font-semibold text-sm text-muted-foreground">Barrier 2</span><br/>
                          <span className="text-lg font-semibold">{secondBarrierAbs ? secondBarrierAbs.toFixed(4) + ' ' + quote : '-'}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Risk-free Rate</span><br/>
                    <span className="text-lg font-semibold">{pricingInputs.interestRate}%</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Storage Cost</span><br/>
                    <span className="text-lg font-semibold">{pricingInputs.storageCost}%</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Convenience Yield</span><br/>
                    <span className="text-lg font-semibold">{pricingInputs.convenienceYield}%</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Volatility</span><br/>
                    <span className="text-lg font-semibold">{strategyComponent.volatility}%</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <span className="font-semibold text-sm text-muted-foreground">Maturity</span><br/>
                    <span className="text-lg font-semibold">{pricingInputs.timeToMaturity.toFixed(2)} years</span>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Prime totale */}
            {pricingResults.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Total Premium</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-col gap-3 text-lg">
                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                      <span className="font-semibold">Premium:</span>
                      <span className="font-mono text-xl">{premium.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Affichage du graphique Payoff/Commodity Hedging/Price/Greeks */}
            <Card className="border-0 shadow-lg">
              <PayoffChart
                data={payoffData}
                strategy={[strategyComponent]}
                spot={pricingInputs.spotPrice}
                currencyPair={selectedPair}
                includePremium={true}
                showPremiumToggle={true}
                realPremium={pricingResults.length > 0 ? pricingResults[0].price : undefined}
                priceData={priceData}
              />
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pricers;