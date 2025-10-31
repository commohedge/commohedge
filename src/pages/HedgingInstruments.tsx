import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Shield, 
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ArrowUpDown,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  Calculator,
  RefreshCw
} from "lucide-react";
import StrategyImportService, { HedgingInstrument } from "@/services/StrategyImportService";
import { PricingService } from "@/services/PricingService";
// ✅ IMPORT EXACT DES FONCTIONS EXPORTÉES D'INDEX.TSX UTILISÉES PAR STRATEGY BUILDER
// ✅ STRICTEMENT : Black-Scholes et Monte Carlo pour put/call simples
// ✅ STRICTEMENT : Closed-form pour les options avec barrières
// ✅ SUPPRESSION : Toutes les implémentations liées au Forex
import {
  calculateBarrierOptionClosedForm,
  calculateDigitalOptionPrice,
  calculateVanillaOptionMonteCarlo,
  calculateTimeToMaturity, // ✅ AJOUT : Même fonction de calcul de maturité que Strategy Builder
  calculateOptionPrice, // ✅ Fonction principale de pricing de Strategy Builder
  erf
} from "@/pages/Index";

// Interface pour les paramètres de marché par commodity
interface CommodityMarketData {
  spot: number;
  volatility: number;
  riskFreeRate: number;
}

/**
 * HedgingInstruments.tsx - Commodity Hedging Instruments Management
 * 
 * ✅ MODIFICATIONS APPORTÉES :
 * - Utilisation STRICTE des fonctions de pricing de Strategy Builder
 * - Black-Scholes et Monte Carlo pour les options call/put simples
 * - Closed-form pour les options avec barrières (SIMPLE ET DOUBLE)
 * - Suppression de TOUTES les implémentations liées au Forex
 * - Utilisation de calculateOptionPrice() comme fonction principale
 * - Cohérence parfaite avec Strategy Builder
 * 
 * ✅ OPTIONS DOUBLE BARRIÈRE :
 * - Logique de détermination des barrières inférieure/supérieure identique à Strategy Builder
 * - L = Math.min(barrier, secondBarrier) = barrière inférieure
 * - U = Math.max(barrier, secondBarrier) = barrière supérieure
 * - Utilise calculateBarrierOptionClosedForm avec formules analytiques complètes
 * - Gestion correcte des types : call-double-knockout, put-double-knockout, etc.
 * - PRIORITÉ ABSOLUE dans le mapping des types pour éviter la confusion avec les barrières simples
 * - Détection et logs spécifiques pour les options double barrière
 * - Affichage distinctif "closed-form (double)" dans l'interface utilisateur
 * 
 * ✅ OPTIONS VANILLES (call/put) :
 * - Utilise calculateOptionPriceStrategyBuilder() - MÊME LOGIQUE EXACTE QUE STRATEGY BUILDER
 * - Black-Scholes : d1, d2, Nd1, Nd2 avec formule exacte de Strategy Builder
 * - Monte Carlo : calculateVanillaOptionMonteCarlo avec mêmes paramètres
 * - Gestion du modèle de pricing (black-scholes/monte-carlo) identique à Strategy Builder
 * - Cohérence parfaite des calculs entre Strategy Builder et HedgingInstruments
 */
const HedgingInstruments = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showExportColumns, setShowExportColumns] = useState(false);
  const [instruments, setInstruments] = useState<HedgingInstrument[]>(() => {
    try {
      const saved = localStorage.getItem('hedgingInstruments');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading instruments from localStorage:', error);
      return [];
    }
  });
  const [importService] = useState(() => StrategyImportService.getInstance());
  
  // ✅ MTM Calculation states - maintenant par devise avec logique Strategy Builder
  const [strategyStartDate, setStrategyStartDate] = useState(() => {
    // Récupérer depuis Strategy Builder si disponible
    try {
      const savedState = localStorage.getItem('calculatorState');
      if (savedState) {
        const state = JSON.parse(savedState);
        return state.strategyStartDate || new Date().toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Error loading strategy start date from Strategy Builder:', error);
    }
    return new Date().toISOString().split('T')[0];
  });
  
  const [hedgingStartDate, setHedgingStartDate] = useState(() => {
    // Récupérer depuis Strategy Builder si disponible
    try {
      const savedState = localStorage.getItem('calculatorState');
      if (savedState) {
        const state = JSON.parse(savedState);
        return state.startDate || new Date().toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Error loading hedging start date from Strategy Builder:', error);
    }
    return new Date().toISOString().split('T')[0];
  });

  // ✅ Fonction pour récupérer les dates depuis les instruments exportés
  const getExportDatesFromInstruments = () => {
    if (instruments.length === 0) return null;
    
    // Chercher un instrument avec des dates d'export
    const instrumentWithDates = instruments.find(inst => 
      inst.exportStrategyStartDate && inst.exportHedgingStartDate
    );
    
    if (instrumentWithDates) {
      return {
        strategyStartDate: instrumentWithDates.exportStrategyStartDate,
        hedgingStartDate: instrumentWithDates.exportHedgingStartDate
      };
    }
    
    return null;
  };
  
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [commodityMarketData, setCommodityMarketData] = useState<{ [commodity: string]: CommodityMarketData }>(() => {
    // Charger les données de marché depuis localStorage
    try {
      const saved = localStorage.getItem('commodityMarketData');
      if (saved) return JSON.parse(saved);
      
      return {};
    } catch (error) {
      console.error('Error loading commodity market data:', error);
      return {};
    }
  });
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Dialog states for view and edit actions
  const [selectedInstrument, setSelectedInstrument] = useState<HedgingInstrument | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Pricing model states - récupérer depuis le localStorage pour utiliser les mêmes paramètres que Strategy Builder
  const [optionPricingModel, setOptionPricingModel] = useState<'black-76' | 'black-scholes' | 'garman-kohlhagen' | 'monte-carlo'>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      // Chercher optionPricingModel dans les paramètres sauvegardés
      return state.optionPricingModel || 'black-scholes';
    }
    return 'black-scholes';
  });
  
  const [barrierPricingModel, setBarrierPricingModel] = useState<'monte-carlo' | 'closed-form'>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.barrierPricingModel || 'closed-form';
    }
    return 'closed-form';
  });
  
  const [barrierOptionSimulations, setBarrierOptionSimulations] = useState<number>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.barrierOptionSimulations || 1000;
    }
    return 1000;
  });
  
  const [useImpliedVol, setUseImpliedVol] = useState<boolean>(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.useImpliedVol || false;
    }
    return false;
  });
  
  const [impliedVolatilities, setImpliedVolatilities] = useState(() => {
    const savedState = localStorage.getItem('calculatorState');
    if (savedState) {
      const state = JSON.parse(savedState);
      return state.impliedVolatilities || {};
    }
    return {};
  });

  // Fonction pour extraire les commodities uniques des instruments
  const getUniqueCommodities = (instruments: HedgingInstrument[]): string[] => {
    const commodities = new Set<string>();
    instruments.forEach(instrument => {
      if (instrument.currency) {
        commodities.add(instrument.currency);
      }
    });
    return Array.from(commodities).sort();
  };

  // Fonction pour extraire les données de marché depuis les instruments exportés du Strategy Builder
  const getMarketDataFromInstruments = (commodity: string): CommodityMarketData | null => {
    const commodityInstruments = instruments.filter(inst => inst.currency === commodity);
    if (commodityInstruments.length === 0) return null;
    
    // Prendre les données du premier instrument de cette commodity
    const firstInstrument = commodityInstruments[0];
    
    return {
      spot: firstInstrument.exportSpotPrice || 1.0000,
      volatility: firstInstrument.exportVolatility || 20,
      riskFreeRate: firstInstrument.exportDomesticRate || 1.0
    };
  };

  // Charger les instruments depuis le service
  useEffect(() => {
    const loadInstruments = () => {
      const service = StrategyImportService.getInstance();
      const loadedInstruments = service.getHedgingInstruments();
      
      // LOG DE DIAGNOSTIC : Vérifier les données d'export
      console.log('[DEBUG] Instruments chargés depuis le service:', loadedInstruments);
      if (loadedInstruments.length > 0) {
        const firstInstrument = loadedInstruments[0];
        console.log('[DEBUG] Premier instrument - Données d\'export:');
        console.log('  - exportSpotPrice:', firstInstrument.exportSpotPrice);
        console.log('  - exportDomesticRate:', firstInstrument.exportDomesticRate);
        console.log('  - exportForeignRate:', firstInstrument.exportForeignRate);
        console.log('  - exportVolatility:', firstInstrument.exportVolatility);
        console.log('  - exportTimeToMaturity:', firstInstrument.exportTimeToMaturity);
        console.log('  - exportForwardPrice:', firstInstrument.exportForwardPrice);
      }
      
      setInstruments(loadedInstruments);
      
      // Initialiser les données de marché pour les nouvelles commodities depuis les instruments exportés
      const uniqueCommodities = getUniqueCommodities(loadedInstruments);
      setCommodityMarketData(prevData => {
        const newData = { ...prevData };
        let hasUpdates = false;
        
        uniqueCommodities.forEach(commodity => {
          const exportData = getMarketDataFromInstruments(commodity);
          if (exportData) {
            // TOUJOURS mettre à jour avec les données d'export (pas seulement si absent)
            const currentData = newData[commodity];
            if (!currentData || 
                currentData.spot !== exportData.spot ||
                currentData.riskFreeRate !== exportData.riskFreeRate) {
              
              console.log(`[DEBUG] Updating market data for ${commodity} with export data:`, exportData);
              newData[commodity] = exportData;
              hasUpdates = true;
            }
          }
        });
        
        // Sauvegarder dans localStorage seulement si des mises à jour
        if (hasUpdates) {
          try {
            localStorage.setItem('commodityMarketData', JSON.stringify(newData));
          } catch (error) {
            console.error('Error saving commodity market data:', error);
          }
        }
        
        return newData;
      });
    };

    loadInstruments();
    
    // Listen for updates from Strategy Builder
    const handleUpdate = () => {
        loadInstruments();
    };

    window.addEventListener('hedgingInstrumentsUpdated', handleUpdate);
    return () => window.removeEventListener('hedgingInstrumentsUpdated', handleUpdate);
  }, []);

  // Force re-calculation when valuation date changes
  useEffect(() => {
    if (instruments.length > 0) {
      console.log(`[🔄 VALUATION DATE CHANGE] New date: ${valuationDate} - Forcing recalculation of ${instruments.length} instruments`);
      
      // Force re-render to recalculate all Today Prices with new valuation date
      const updatedInstruments = instruments.map(instrument => ({ ...instrument }));
      setInstruments(updatedInstruments);
      
      // Force update of currency market data state to trigger re-renders
      setCommodityMarketData(prev => ({ ...prev }));
      
      // Show toast to confirm recalculation
      toast({
        title: "Valuation Date Updated",
        description: `Recalculating prices and MTM for ${instruments.length} instruments as of ${valuationDate}`,
      });
    } else {
      console.log(`[🔄 VALUATION DATE CHANGE] New date: ${valuationDate} - No instruments to recalculate`);
    }
  }, [valuationDate, toast]);

  // Force re-calculation when market parameters change (spot, volatility, rates)
  useEffect(() => {
    if (instruments.length > 0) {
      console.log(`[DEBUG] Market parameters changed, forcing recalculation of Today Prices and MTM`);
      // Force re-render to recalculate all Today Prices and MTM with new market parameters
      const updatedInstruments = instruments.map(instrument => ({ ...instrument }));
      setInstruments(updatedInstruments);
    }
  }, [commodityMarketData]);

  // ✅ Synchroniser les dates avec Strategy Builder et instruments exportés
  useEffect(() => {
    const handleStrategyBuilderUpdate = () => {
      try {
        const savedState = localStorage.getItem('calculatorState');
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state.strategyStartDate) {
            setStrategyStartDate(state.strategyStartDate);
          }
          if (state.startDate) {
            setHedgingStartDate(state.startDate);
          }
        }
      } catch (error) {
        console.warn('Error syncing dates with Strategy Builder:', error);
      }
    };

    // ✅ Synchroniser avec les dates d'export des instruments
    const handleExportDatesSync = () => {
      const exportDates = getExportDatesFromInstruments();
      if (exportDates) {
        console.log('[HEDGING] Syncing with export dates:', exportDates);
        setStrategyStartDate(exportDates.strategyStartDate);
        setHedgingStartDate(exportDates.hedgingStartDate);
      }
    };

    // Écouter les changements dans Strategy Builder
    window.addEventListener('storage', handleStrategyBuilderUpdate);
    
    // Vérifier au chargement
    handleStrategyBuilderUpdate();
    handleExportDatesSync();

    return () => {
      window.removeEventListener('storage', handleStrategyBuilderUpdate);
    };
  }, [instruments]); // ✅ Ajouter instruments comme dépendance

  // ✅ Recalculer automatiquement quand les dates changent
  useEffect(() => {
    if (instruments.length > 0) {
      console.log('[HEDGING] Dates changed - Strategy Start:', strategyStartDate, 'Hedging Start:', hedgingStartDate);
      // Force re-render pour recalculer les MTM
      setInstruments([...instruments]);
    }
  }, [strategyStartDate, hedgingStartDate]);

  // ✅ Utiliser exactement la même logique de pricing que Strategy Builder

  // ✅ FONCTION DE PRICING UNIFIÉE - MÊME LOGIQUE EXACTE QUE STRATEGY BUILDER
  const calculateOptionPriceStrategyBuilder = (
    type: string,
    S: number,
    K: number,
    r: number, // Risk-free rate (domestic rate for commodities)
    t: number,
    sigma: number,
    optionPricingModel: 'black-scholes' | 'monte-carlo' = 'black-scholes'
  ): number => {
    // ✅ MÊME LOGIQUE QUE STRATEGY BUILDER (lignes 2097-2128)
    let price = 0;
    
    if (optionPricingModel === 'monte-carlo') {
      // Use Monte Carlo for vanilla options - MÊME LOGIQUE QUE STRATEGY BUILDER
      price = calculateVanillaOptionMonteCarlo(
        type, 
        S, 
        K, 
        r, // Domestic rate
        r, // Foreign rate (same for commodities)
        t, 
        sigma,
        1000 // Number of simulations for vanilla options
      );
    } else {
      // Use traditional Black-Scholes (default) - MÊME LOGIQUE EXACTE QUE STRATEGY BUILDER
      const d1 = (Math.log(S/K) + (r + sigma**2/2)*t) / (sigma*Math.sqrt(t));
      const d2 = d1 - sigma*Math.sqrt(t);
      
      const Nd1 = (1 + erf(d1/Math.sqrt(2)))/2;
      const Nd2 = (1 + erf(d2/Math.sqrt(2)))/2;
      
      if (type === 'call') {
        price = S*Nd1 - K*Math.exp(-r*t)*Nd2;
      } else { // put
        price = K*Math.exp(-r*t)*(1-Nd2) - S*(1-Nd1);
      }
    }
    
    // S'assurer que le prix de l'option n'est jamais négatif - MÊME LOGIQUE QUE STRATEGY BUILDER
    return Math.max(0, price);
  };

  // ✅ Calcul de maturité avec logique Strategy Builder - UTILISER LA MÊME FONCTION
  const calculateTimeToMaturityHedging = (maturityDate: string, valuationDate: string): number => {
    const result = calculateTimeToMaturity(maturityDate, valuationDate); // ✅ Utiliser la fonction exportée d'Index.tsx
    console.log('[HEDGING] maturity:', maturityDate, 'valuation:', valuationDate, 'result:', result.toFixed(6), 'years');
    return result;
  };

  // ✅ Calcul de maturité depuis Strategy Start Date (comme Strategy Builder)
  const calculateTimeToMaturityFromStrategyStart = (maturityDate: string): number => {
    return calculateTimeToMaturity(maturityDate, strategyStartDate); // ✅ Utiliser la fonction exportée d'Index.tsx
  };

  // ✅ Calcul de maturité depuis Hedging Start Date (pour affichage)
  const calculateTimeToMaturityFromHedgingStart = (maturityDate: string): number => {
    return calculateTimeToMaturity(maturityDate, hedgingStartDate); // ✅ Utiliser la fonction exportée d'Index.tsx
  };

  // Utiliser le PricingService centralisé au lieu de redéfinir erf
  // const erf = (x: number): number => { ... } - SUPPRIMÉ, utilise PricingService.erf()

  // Function to get implied volatility - identique à Index.tsx
  const getImpliedVolatility = (monthKey: string, optionKey?: string) => {
    if (!useImpliedVol) return null;
    
    if (optionKey && impliedVolatilities[monthKey] && impliedVolatilities[monthKey][optionKey] !== undefined) {
      return impliedVolatilities[monthKey][optionKey];
    }
    
    if (impliedVolatilities[monthKey] && impliedVolatilities[monthKey].global !== undefined) {
      return impliedVolatilities[monthKey].global;
    }
    
    return null;
  };


  // Fonction calculateTodayPrice améliorée pour utiliser les données enrichies d'export
  // Note: La fonction calculateBarrierOptionClosedForm a été déplacée vers PricingService
  // avec une implémentation complète pour les options à double barrière

  const calculateTodayPrice = (instrument: HedgingInstrument): number => {
    // ✅ STRATÉGIE : Utiliser les valeurs CURRENT affichées dans le tableau (modifiables par l'utilisateur)
    
    // ✅ 1. TIME TO MATURITY : Utiliser la Valuation Date pour le calcul MTM
    // La fonction calculateTimeToMaturity gère déjà l'expiration (retourne 0 si expirée)
    
    // ✅ CORRECTION : Pour le calcul du Today Price, TOUJOURS utiliser la Valuation Date
    // Le Today Price doit refléter la valeur actuelle basée sur la valuationDate
    const calculationTimeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
    console.log(`[DEBUG] ${instrument.id}: TODAY PRICE - Using Valuation Date ${valuationDate}: ${calculationTimeToMaturity.toFixed(4)}y`);
    
    // Si l'option est expirée (TTM = 0), retourner la valeur intrinsèque
    if (calculationTimeToMaturity <= 0) {
      console.log(`[DEBUG] ${instrument.id}: Option expired - TTM = ${calculationTimeToMaturity.toFixed(4)}`);
      const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { spot: 1.0000, volatility: 20, riskFreeRate: 1.0 };
      const spotRate = instrument.impliedSpotPrice || marketData.spot;
      const K = instrument.strike || spotRate;
      
      if (instrument.type.toLowerCase().includes('call')) {
        return Math.max(0, spotRate - K);
      } else if (instrument.type.toLowerCase().includes('put')) {
        return Math.max(0, K - spotRate);
      } else if (instrument.type.toLowerCase() === 'forward') {
        return spotRate - K;
      }
      return 0;
    }
    
    // Utiliser la même base de calcul pour l'affichage et le pricing
    const displayTimeToMaturity = calculationTimeToMaturity;
    
    // 2. PARAMÈTRES DE MARCHÉ : Utiliser les valeurs CURRENT des données de marché (Commodity)
    const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { 
      spot: 1.0000, 
      volatility: 20, 
      riskFreeRate: 5.0
    };
    
    // ✅ CORRECTION CRITIQUE : Pour les stratégies exportées, utiliser les paramètres d'export comme base
    // Si aucun paramètre n'a été modifié par l'utilisateur, le prix doit rester identique
    const isExportedStrategy = instrument.exportSpotPrice && instrument.exportTimeToMaturity;
    
    // Utiliser les paramètres d'export comme base, puis appliquer les modifications utilisateur
    const baseSpotRate = isExportedStrategy ? instrument.exportSpotPrice : marketData.spot;
    const baseRiskFreeRate = isExportedStrategy ? (instrument.exportDomesticRate || marketData.riskFreeRate) : marketData.riskFreeRate;
    
    // ✅ CORRECTION : Détecter les modifications en comparant avec les valeurs d'export
    const exportRiskFreeRate = instrument.exportDomesticRate || marketData.riskFreeRate;
    const exportSpotPrice = instrument.exportSpotPrice || marketData.spot;
    const exportVolatility = instrument.exportVolatility || marketData.volatility;
    
    const useCurrentParams = Math.abs(marketData.riskFreeRate - exportRiskFreeRate) > 0.001 || 
                           Math.abs(marketData.spot - exportSpotPrice) > 0.0001 ||
                           Math.abs(marketData.volatility - exportVolatility) > 0.1;
    
    // Hiérarchie pour le spot price : individuel > global (si modifié) > export
    const spotRate = instrument.impliedSpotPrice || (useCurrentParams ? marketData.spot : baseSpotRate);
    
    const r_d = useCurrentParams ? marketData.riskFreeRate / 100 : baseRiskFreeRate / 100;
    
    console.log(`[DEBUG] ${instrument.id}: Using ${useCurrentParams ? 'CURRENT' : 'EXPORT'} parameters - spot=${spotRate}, r_d=${(r_d*100).toFixed(3)}%, t=${calculationTimeToMaturity.toFixed(6)} (valuationDate=${valuationDate})`);
    console.log(`[DEBUG] ${instrument.id}: Export vs Current - Export spot: ${exportSpotPrice}, Current: ${marketData.spot}, Diff: ${Math.abs(marketData.spot - exportSpotPrice).toFixed(6)}`);
    console.log(`[DEBUG] ${instrument.id}: Export vs Current - Export risk-free: ${exportRiskFreeRate}, Current: ${marketData.riskFreeRate}, Diff: ${Math.abs(marketData.riskFreeRate - exportRiskFreeRate).toFixed(3)}`);
    console.log(`[DEBUG] ${instrument.id}: Export vs Current - Export volatility: ${exportVolatility}, Current: ${marketData.volatility}, Diff: ${Math.abs(marketData.volatility - exportVolatility).toFixed(1)}`);
    console.log(`[DEBUG] ${instrument.id}: PARAMETER CONSISTENCY CHECK - isExportedStrategy: ${isExportedStrategy}, useCurrentParams: ${useCurrentParams}, baseSpotRate: ${baseSpotRate}, baseRiskFreeRate: ${baseRiskFreeRate}`);
    
    // 3. VOLATILITÉ : Utiliser la volatilité d'export comme base pour les stratégies exportées
    let sigma;
    if (instrument.impliedVolatility) {
      // 1. Priorité : Volatilité implicite spécifique (éditable par l'utilisateur)
      sigma = instrument.impliedVolatility / 100;
      console.log(`[DEBUG] ${instrument.id}: Using CURRENT IMPLIED volatility: ${(sigma*100).toFixed(3)}%`);
    } else if (instrument.volatility) {
      // 2. Priorité : Volatilité spécifique de l'instrument (éditable par l'utilisateur)
      sigma = instrument.volatility / 100;
      console.log(`[DEBUG] ${instrument.id}: Using CURRENT instrument volatility: ${(sigma*100).toFixed(3)}%`);
    } else if (isExportedStrategy && instrument.exportVolatility && !useCurrentParams) {
      // 3. Priorité : Volatilité d'export pour les stratégies exportées (cohérence avec Strategy Builder)
      // Seulement si les paramètres globaux n'ont pas été modifiés
      sigma = instrument.exportVolatility / 100;
      console.log(`[DEBUG] ${instrument.id}: Using EXPORT volatility: ${(sigma*100).toFixed(3)}%`);
    } else if (useCurrentParams && marketData.volatility) {
      // 4. Priorité : Volatilité globale actuelle (si les paramètres ont été modifiés)
      sigma = marketData.volatility / 100;
      console.log(`[DEBUG] ${instrument.id}: Using CURRENT market volatility (modified): ${(sigma*100).toFixed(3)}%`);
         } else if (marketData.volatility) {
      // 4. Priorité : Volatilité globale de la devise (éditable par l'utilisateur)
       sigma = marketData.volatility / 100;
       console.log(`[DEBUG] ${instrument.id}: Using CURRENT market volatility: ${(sigma*100).toFixed(3)}%`);
    } else {
      // 5. Fallback : Volatilité des données de marché
      const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { spot: 1.0000, volatility: 20, riskFreeRate: 1.0 };
      sigma = marketData.volatility / 100;
      console.log(`[DEBUG] ${instrument.id}: Using CURRENT market volatility: ${(sigma*100).toFixed(3)}%`);
    }
    
    // 4. FORWARD CALCULATION : Utiliser les paramètres d'export pour la cohérence, mais permettre les modifications
    // Pour les stratégies exportées, utiliser le forward d'export si les paramètres n'ont pas été modifiés
    let S;
    if (isExportedStrategy && instrument.exportForwardPrice && 
        Math.abs(calculationTimeToMaturity - (instrument.exportTimeToMaturity || 0)) < 0.0001 && 
        !useCurrentParams) {
      // Si c'est la même échéance que l'export ET que les paramètres globaux n'ont pas été modifiés
      S = instrument.exportForwardPrice;
      console.log(`[DEBUG] ${instrument.id}: Using EXPORT forward price: ${S.toFixed(6)}`);
    } else {
      // Sinon, calculer avec les paramètres actuels
      S = spotRate * Math.exp(r_d * calculationTimeToMaturity);  // Simple forward: S * e^(r*t)
      console.log(`[DEBUG] ${instrument.id}: Calculating forward with ${useCurrentParams ? 'CURRENT' : 'EXPORT'} parameters: ${S.toFixed(6)} (spot=${spotRate.toFixed(6)}, r=${(r_d*100).toFixed(3)}%, t=${calculationTimeToMaturity.toFixed(6)})`);
    }
    
    console.log(`[DEBUG] ${instrument.id}: Forward calculation - Current: ${S.toFixed(6)}, Export: ${instrument.exportForwardPrice || 'N/A'}`);
    console.log(`[DEBUG] ${instrument.id}: PRICING PARAMETERS - Spot: ${spotRate.toFixed(6)}, Forward: ${S.toFixed(6)} - Using SPOT for vanilla options (Strategy Builder logic)`);
    
    // 5. STRIKE ANALYSIS : Vérifier la cohérence du strike
    console.log(`[DEBUG] ${instrument.id}: Strike analysis - Strike: ${instrument.strike}, Type: ${instrument.originalComponent?.strikeType || 'unknown'}, Original Strike: ${instrument.originalComponent?.strike || 'N/A'}, Spot: ${spotRate}`);
    
         console.log(`[DEBUG] ${instrument.id}: Time to maturity - Valuation Date: ${valuationDate}, TTM: ${calculationTimeToMaturity.toFixed(4)} years (Maturity: ${instrument.maturity})`);
     console.log(`[DEBUG] ${instrument.id}: Using current spot ${spotRate.toFixed(4)} -> forward ${S.toFixed(4)} (r=${(r_d*100).toFixed(1)}%, t=${calculationTimeToMaturity.toFixed(4)})`);
    
    // Vérifier l'expiration
     if (calculationTimeToMaturity <= 0) {
      return 0;
    }

    // Utiliser le strike en valeur absolue de l'instrument
    const K = instrument.strike || S;
    
    // Map instrument type to option type pour pricing
    const optionType = instrument.type.toLowerCase();
     
     // Pour les options à barrière, vérifier si le spot actuel a franchi les barrières
     if (optionType.includes('knock') || optionType.includes('barrier')) {
       const barrier = instrument.barrier;
       const secondBarrier = instrument.secondBarrier;
       
       if (barrier) {
         console.log(`[DEBUG] ${instrument.id}: Barrier analysis - spot=${spotRate.toFixed(4)}, barrier=${barrier.toFixed(4)}`);
         
         if (secondBarrier) {
           const lowerBarrier = Math.min(barrier, secondBarrier);
           const upperBarrier = Math.max(barrier, secondBarrier);
           const spotOutsideRange = spotRate <= lowerBarrier || spotRate >= upperBarrier;
           console.log(`[DEBUG] ${instrument.id}: Double barrier analysis - spot=${spotRate.toFixed(4)}, lower=${lowerBarrier.toFixed(4)}, upper=${upperBarrier.toFixed(4)}, outside=${spotOutsideRange}`);
           
           // Pour les double knock-out: si le spot est en dehors des barrières, l'option est déjà knockée
           if (optionType.includes('knock-out') && spotOutsideRange) {
             console.log(`[DEBUG] ${instrument.id}: Double knock-out option already knocked out (spot outside barriers)`);
             return 0;
           }
           
           // Pour les double knock-in: si le spot est en dehors des barrières, l'option est activée
           if (optionType.includes('knock-in') && spotOutsideRange) {
             console.log(`[DEBUG] ${instrument.id}: Double knock-in option activated (spot outside barriers)`);
             // Continuer avec le pricing normal d'une option vanille
           }
         } else {
           // Barrière simple
           let barrierCrossed = false;
           
           if (optionType.includes('reverse')) {
             // Pour les reverse barriers, la logique est inversée
             if (optionType.includes('call')) {
               barrierCrossed = spotRate <= barrier; // Call reverse: knocked si spot en dessous
             } else {
               barrierCrossed = spotRate >= barrier; // Put reverse: knocked si spot au dessus
             }
           } else {
             // Barrières normales
             if (optionType.includes('call')) {
               barrierCrossed = spotRate >= barrier; // Call: knocked si spot au dessus
             } else {
               barrierCrossed = spotRate <= barrier; // Put: knocked si spot en dessous
             }
           }
           
           console.log(`[DEBUG] ${instrument.id}: Single barrier analysis - barrierCrossed=${barrierCrossed}`);
           
           // Pour les knock-out: si barrière franchie, option knockée
           if (optionType.includes('knock-out') && barrierCrossed) {
             console.log(`[DEBUG] ${instrument.id}: Knock-out option already knocked out`);
             return 0;
           }
           
           // Pour les knock-in: si barrière franchie, option activée
           if (optionType.includes('knock-in') && barrierCrossed) {
             console.log(`[DEBUG] ${instrument.id}: Knock-in option activated`);
             // Continuer avec le pricing normal d'une option vanille
           }
         }
       }
     }
    // DEBUG: Log des paramètres pour diagnostiquer les écarts de pricing
    console.log(`[DEBUG] Instrument ${instrument.id}: ==================== PRICING COMPARISON ====================`);
    console.log(`[DEBUG] Instrument ${instrument.id}: Type: ${instrument.type}`);
    console.log(`[DEBUG] Instrument ${instrument.id}: Original/Export Price: ${instrument.realOptionPrice || instrument.premium || 'N/A'}`);
         console.log(`[DEBUG] Instrument ${instrument.id}: Current Spot: ${spotRate.toFixed(6)}, Forward: ${S.toFixed(6)}`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Strike: ${K.toFixed(6)}`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Barrier: ${instrument.barrier?.toFixed(6) || 'N/A'}, SecondBarrier: ${instrument.secondBarrier?.toFixed(6) || 'N/A'}`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Rebate: ${instrument.rebate || 'N/A'}%`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Rates - Risk-Free: ${(r_d*100).toFixed(3)}%`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Time to Maturity - Strategy: ${instrument.timeToMaturity?.toFixed(6) || 'N/A'}, Calculated: ${calculationTimeToMaturity.toFixed(6)}`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Volatility - Implied: ${instrument.impliedVolatility || 'N/A'}%, Component: ${instrument.originalComponent?.volatility || 'N/A'}%, Instrument: ${instrument.volatility || 'N/A'}%, Market: ${marketData.volatility}%, Used: ${(sigma*100).toFixed(3)}%`);
     console.log(`[DEBUG] Instrument ${instrument.id}: Using timeToMaturity for calculation: ${calculationTimeToMaturity.toFixed(6)} (source: ${instrument.timeToMaturity ? 'Strategy' : 'Calculated'})`);
    
    // ✅ UTILISER EXACTEMENT LA MÊME FONCTION DE PRICING QUE STRATEGY BUILDER
    console.log(`[DEBUG] ${instrument.id}: Using Strategy Builder pricing function with parameters: S=${spotRate.toFixed(6)}, K=${K.toFixed(6)}, r=${r_d.toFixed(6)}, t=${calculationTimeToMaturity.toFixed(6)}, sigma=${sigma.toFixed(6)}`);
    
    // ✅ UTILISATION DIRECTE DE LA FONCTION STRATEGY BUILDER - MÊME LOGIQUE EXACTE
    // Mapper le type d'instrument vers le type reconnu par calculateOptionPrice
    let mappedType = instrument.type.toLowerCase();
    
    // ✅ MAPPING COMPLET DES TYPES D'OPTIONS - MÊME LOGIQUE QUE STRATEGY BUILDER
    // ✅ PRIORITÉ ABSOLUE : Options double barrière (avant les simples)
    if (mappedType.includes('double')) {
      // Options à double barrière - PRIORITÉ ABSOLUE
      if (mappedType.includes('call') && (mappedType.includes('knockout') || mappedType.includes('knock-out'))) {
        mappedType = 'call-double-knockout';
      } else if (mappedType.includes('put') && (mappedType.includes('knockout') || mappedType.includes('knock-out'))) {
        mappedType = 'put-double-knockout';
      } else if (mappedType.includes('call') && (mappedType.includes('knockin') || mappedType.includes('knock-in'))) {
        mappedType = 'call-double-knockin';
      } else if (mappedType.includes('put') && (mappedType.includes('knockin') || mappedType.includes('knock-in'))) {
        mappedType = 'put-double-knockin';
      }
    } else if (mappedType === 'vanilla call') {
      mappedType = 'call';
    } else if (mappedType === 'vanilla put') {
      mappedType = 'put';
    } else if (mappedType.includes('knock-out') || mappedType.includes('knockout')) {
      // Options à barrière knock-out SIMPLE
      if (mappedType.includes('call')) {
        mappedType = 'call-knockout';
      } else if (mappedType.includes('put')) {
        mappedType = 'put-knockout';
      }
    } else if (mappedType.includes('knock-in') || mappedType.includes('knockin')) {
      // Options à barrière knock-in SIMPLE
      if (mappedType.includes('call')) {
        mappedType = 'call-knockin';
      } else if (mappedType.includes('put')) {
        mappedType = 'put-knockin';
      }
    } else if (mappedType.includes('reverse')) {
      // Options à barrière reverse
      if (mappedType.includes('call') && mappedType.includes('knockout')) {
        mappedType = 'call-reverse-knockout';
      } else if (mappedType.includes('put') && mappedType.includes('knockout')) {
        mappedType = 'put-reverse-knockout';
      } else if (mappedType.includes('call') && mappedType.includes('knockin')) {
        mappedType = 'call-reverse-knockin';
      } else if (mappedType.includes('put') && mappedType.includes('knockin')) {
        mappedType = 'put-reverse-knockin';
      }
    } else if (mappedType.includes('one-touch') || mappedType.includes('no-touch')) {
      // Options digitales
      mappedType = mappedType; // Garder le type original pour les options digitales
    } else if (mappedType.includes('double-touch') || mappedType.includes('double-no-touch')) {
      // Options digitales double
      mappedType = mappedType; // Garder le type original pour les options digitales
    }
    
    console.log(`[DEBUG] ${instrument.id}: TYPE MAPPING - Original: ${instrument.type}, Mapped: ${mappedType}`);
    
    // ✅ CORRECTION CRITIQUE : Utiliser les barrières calculées lors de l'export
    let calculatedBarrier = instrument.barrier || 0;
    let calculatedSecondBarrier = instrument.secondBarrier;
    
    // Si l'instrument a des données d'export et que le spot price a changé, recalculer les barrières
    if (instrument.originalComponent?.barrierType === 'percent' && instrument.exportSpotPrice) {
      const exportSpotPrice = instrument.exportSpotPrice;
      const currentSpotPrice = spotRate;
      
      // Si le spot price a changé, recalculer les barrières proportionnellement
      if (Math.abs(exportSpotPrice - currentSpotPrice) > 0.0001) {
        const spotRatio = currentSpotPrice / exportSpotPrice;
        calculatedBarrier = (instrument.barrier || 0) * spotRatio;
        if (instrument.secondBarrier) {
          calculatedSecondBarrier = instrument.secondBarrier * spotRatio;
        }
        console.log(`[DEBUG] ${instrument.id}: SPOT PRICE CHANGE - Export: ${exportSpotPrice}, Current: ${currentSpotPrice}, Ratio: ${spotRatio.toFixed(6)}`);
      }
    }
    
    // ✅ LOGIQUE DOUBLE BARRIÈRE : Détermination correcte des barrières inférieure et supérieure
    // Même logique que Strategy Builder pour les options double barrière
    // Strategy Builder utilise : L = Math.min(barrier, secondBarrier), U = Math.max(barrier, secondBarrier)
    if (mappedType.includes('double') && calculatedSecondBarrier) {
      const lowerBarrier = Math.min(calculatedBarrier, calculatedSecondBarrier);
      const upperBarrier = Math.max(calculatedBarrier, calculatedSecondBarrier);
      
      // Mettre à jour les barrières calculées avec la logique correcte
      // calculatedBarrier devient la barrière inférieure (L)
      // calculatedSecondBarrier devient la barrière supérieure (U)
      calculatedBarrier = lowerBarrier;
      calculatedSecondBarrier = upperBarrier;
      
      console.log(`[DEBUG] ${instrument.id}: DOUBLE BARRIER LOGIC - Strategy Builder compatible`);
      console.log(`[DEBUG] ${instrument.id}: Original barriers - Barrier1: ${instrument.barrier?.toFixed(6)}, Barrier2: ${instrument.secondBarrier?.toFixed(6)}`);
      console.log(`[DEBUG] ${instrument.id}: Calculated barriers - L (lower): ${lowerBarrier.toFixed(6)}, U (upper): ${upperBarrier.toFixed(6)}`);
      console.log(`[DEBUG] ${instrument.id}: Final mapping - barrier=${calculatedBarrier.toFixed(6)}, secondBarrier=${calculatedSecondBarrier.toFixed(6)}`);
      console.log(`[DEBUG] ${instrument.id}: ✅ DOUBLE BARRIER DETECTED - Using closed-form with L=${lowerBarrier.toFixed(6)}, U=${upperBarrier.toFixed(6)}`);
    } else if (mappedType.includes('double') && !calculatedSecondBarrier) {
      console.log(`[DEBUG] ${instrument.id}: ⚠️ DOUBLE BARRIER MISSING SECOND BARRIER - Type: ${mappedType}, SecondBarrier: ${calculatedSecondBarrier}`);
      console.log(`[DEBUG] ${instrument.id}: ⚠️ WARNING - Double barrier option detected but secondBarrier is missing or undefined`);
      console.log(`[DEBUG] ${instrument.id}: ⚠️ WARNING - This may cause incorrect pricing. Check export data.`);
    }
    
    console.log(`[DEBUG] ${instrument.id}: BARRIER CALCULATION - Final - Barrier: ${calculatedBarrier.toFixed(6)}, SecondBarrier: ${calculatedSecondBarrier?.toFixed(6) || 'N/A'}`);
    
    // ✅ UTILISATION STRICTE DE LA FONCTION PRINCIPALE DE STRATEGY BUILDER
    // Cette fonction gère automatiquement le choix du modèle selon le type d'option :
    // - Black-Scholes pour les options call/put simples
    // - Monte Carlo pour les options call/put avec Monte Carlo
    // - Closed-form pour les options avec barrières (SIMPLE ET DOUBLE)
    // - Monte Carlo pour les options digitales
    // 
    // ✅ OPTIONS DOUBLE BARRIÈRE : Utilise calculateBarrierOptionClosedForm avec :
    // - L = Math.min(barrier, secondBarrier) = barrière inférieure
    // - U = Math.max(barrier, secondBarrier) = barrière supérieure
    // - Formules analytiques complètes pour les options double barrière
    
    let price = 0;
    
    // ✅ OPTIONS VANILLES (call/put) - UTILISER LA MÊME LOGIQUE EXACTE QUE STRATEGY BUILDER
    if (mappedType === 'call' || mappedType === 'put') {
      console.log(`[DEBUG] ${instrument.id}: VANILLA OPTION - Using Strategy Builder pricing logic`);
      console.log(`[DEBUG] ${instrument.id}: Parameters - S: ${spotRate.toFixed(6)}, K: ${K.toFixed(6)}, r: ${r_d.toFixed(6)}, t: ${calculationTimeToMaturity.toFixed(6)}, sigma: ${sigma.toFixed(6)}`);
      
      // Utiliser la fonction unifiée qui correspond exactement à Strategy Builder
      price = calculateOptionPriceStrategyBuilder(
        mappedType,
        spotRate,
        K,
        r_d, // Risk-free rate (domestic rate for commodities)
        calculationTimeToMaturity,
        sigma,
        optionPricingModel === 'monte-carlo' ? 'monte-carlo' : 'black-scholes'
      );
      
      console.log(`[DEBUG] ${instrument.id}: VANILLA PRICING RESULT - Model: ${optionPricingModel}, Price: ${price.toFixed(6)}`);
    } else {
      // ✅ OPTIONS AVEC BARRIÈRES ET DIGITALES - UTILISER LA FONCTION EXPORTÉE
      price = calculateOptionPrice(
        mappedType,
        spotRate,
        K,
        r_d, // Risk-free rate domestique
        r_d, // Risk-free rate étranger (même valeur pour les commodités)
        calculationTimeToMaturity,
        sigma,
        calculatedBarrier,    // Barrière inférieure (L) pour double barrière
        calculatedSecondBarrier, // Barrière supérieure (U) pour double barrière
        instrument.rebate || 1,
        barrierOptionSimulations || 1000
      );
      
      console.log(`[DEBUG] ${instrument.id}: BARRIER/DIGITAL PRICING RESULT - Type: ${mappedType}, Price: ${price.toFixed(6)}`);
    }
    
    console.log(`[DEBUG] ${instrument.id}: STRATEGY BUILDER PRICING RESULT - Calculated: ${price.toFixed(6)}, Export: ${instrument.realOptionPrice || instrument.premium || 'N/A'}, Difference: ${price - (instrument.realOptionPrice || instrument.premium || 0)}`);
    console.log(`[DEBUG] ${instrument.id}: MTM CONSISTENCY CHECK - If no parameters changed, price should equal export price for MTM=0`);
        return price;
  };

  // Fonction pour mettre à jour les données de marché d'une commodity spécifique
  const updateCommodityMarketData = (commodity: string, field: keyof CommodityMarketData, value: number) => {
      setCommodityMarketData(prev => {
      const newData = {
      ...prev,
      [commodity]: {
        ...prev[commodity],
        [field]: value
      }
      };
      
      // Sauvegarder dans localStorage
      try {
        localStorage.setItem('commodityMarketData', JSON.stringify(newData));
      } catch (error) {
        console.error('Error saving commodity market data:', error);
      }
      
      return newData;
    });
    
    // Si c'est la volatilité, le spot rate ou le risk-free rate qui change, recalculer automatiquement les prix
    if (field === 'volatility' || field === 'spot' || field === 'riskFreeRate') {
      // Force re-render pour recalculer les Today Price
      setInstruments(prevInstruments => [...prevInstruments]);
      
      let fieldName = field;
      let unit = '';
      if (field === 'volatility') {
        fieldName = 'volatility';
        unit = '%';
      } else if (field === 'spot') {
        fieldName = 'spot';
        unit = '';
      } else if (field === 'riskFreeRate') {
        fieldName = 'riskFreeRate';
        unit = '%';
      }
      
      toast({
        title: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} Updated`,
        description: `Updated ${fieldName} to ${value}${unit} for ${commodity}. Today Prices recalculated.`,
      });
    }
  };

  // Fonction pour mettre à jour la volatilité d'un instrument spécifique
  const updateInstrumentVolatility = (instrumentId: string, volatility: number) => {
    setInstruments(prevInstruments => 
      prevInstruments.map(instrument => 
        instrument.id === instrumentId 
          ? { ...instrument, impliedVolatility: volatility }
          : instrument
      )
    );
    
    toast({
      title: "Individual Volatility Updated",
      description: `Updated volatility to ${volatility}% for instrument ${instrumentId}`,
    });
  };

  // Fonction pour réinitialiser la volatilité individuelle (utiliser la volatilité globale)
  const resetInstrumentVolatility = (instrumentId: string) => {
    setInstruments(prevInstruments => 
      prevInstruments.map(instrument => 
        instrument.id === instrumentId 
          ? { ...instrument, impliedVolatility: undefined }
          : instrument
      )
    );
    
    toast({
      title: "Individual Volatility Reset",
      description: `Reset to global volatility for instrument ${instrumentId}`,
    });
  };

  // Fonction pour mettre à jour le spot price d'un instrument spécifique
  const updateInstrumentSpotPrice = (instrumentId: string, spotPrice: number) => {
    setInstruments(prevInstruments => {
      const updated = prevInstruments.map(instrument =>
        instrument.id === instrumentId
          ? { ...instrument, impliedSpotPrice: spotPrice }
          : instrument
      );
      // Sauvegarde dans le localStorage
      try {
        localStorage.setItem('hedgingInstruments', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving instruments:', error);
      }
      return updated;
    });

    toast({
      title: "Individual Spot Price Updated",
      description: `Updated spot price to ${spotPrice.toFixed(6)} for instrument ${instrumentId}`,
    });
  };

  // Fonction pour réinitialiser le spot price individuel (utiliser le spot price global)
  const resetInstrumentSpotPrice = (instrumentId: string) => {
    setInstruments(prevInstruments => {
      const updated = prevInstruments.map(instrument =>
        instrument.id === instrumentId
          ? { ...instrument, impliedSpotPrice: undefined }
          : instrument
      );
      try {
        localStorage.setItem('hedgingInstruments', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving instruments:', error);
      }
      return updated;
    });

    toast({
      title: "Individual Spot Price Reset",
      description: `Reset to global spot price for instrument ${instrumentId}`,
    });
  };

  // Fonction pour appliquer les données par défaut d'une commodity
  const applyDefaultDataForCommodity = (commodity: string) => {
    const defaultData = getMarketDataFromInstruments(commodity) || { 
      spot: 1.0000, 
      volatility: 20, 
      riskFreeRate: 1.0
    };
    
    console.log(`[DEBUG] Applying default data for ${commodity}:`, defaultData);
    console.log(`[DEBUG] Source instrument exportSpotPrice:`, instruments.find(inst => inst.currency === commodity)?.exportSpotPrice);
    
      setCommodityMarketData(prev => {
      const newData = {
      ...prev,
      [commodity]: defaultData
      };
      
      // Sauvegarder dans localStorage
      try {
        localStorage.setItem('commodityMarketData', JSON.stringify(newData));
      } catch (error) {
        console.error('Error saving commodity market data:', error);
      }
      
      return newData;
    });
    
    toast({
      title: "Market Data Updated",
      description: `Applied export parameters for ${commodity}: Spot ${defaultData.spot.toFixed(6)}`,
    });
  };

  // NOUVELLE FONCTION : Forcer la mise à jour depuis les données d'export
  const refreshMarketDataFromExport = () => {
    const uniqueCommodities = getUniqueCommodities(instruments);
    
    setCommodityMarketData(prevData => {
      const newData = { ...prevData };
      let updatedCount = 0;
      
      uniqueCommodities.forEach(commodity => {
        const exportData = getMarketDataFromInstruments(commodity);
        if (exportData) {
          console.log(`[DEBUG] Refreshing ${commodity} with export data:`, exportData);
          newData[commodity] = exportData;
          updatedCount++;
        }
      });
      
      // Sauvegarder dans localStorage
      try {
        localStorage.setItem('commodityMarketData', JSON.stringify(newData));
      } catch (error) {
        console.error('Error saving commodity market data:', error);
      }
      
      if (updatedCount > 0) {
        toast({
          title: "Market Data Refreshed",
          description: `Updated ${updatedCount} commodities with export parameters`,
        });
      }
      
      return newData;
    });
  };

  const recalculateAllMTM = async () => {
    setIsRecalculating(true);
    
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force re-render by updating state
      setInstruments([...instruments]);
      
      toast({
        title: "MTM Recalculated",
        description: `Updated prices for ${instruments.length} instruments using Strategy Start Date ${strategyStartDate} and Hedging Start Date ${hedgingStartDate}`,
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Failed to recalculate MTM. Please check your parameters.",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "matured":
        return <Badge variant="secondary">Matured</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInstrumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "forward":
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      case "vanilla call":
      case "vanilla put":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "swap":
        return <BarChart3 className="h-4 w-4 text-purple-600" />;
      case "collar":
        return <Shield className="h-4 w-4 text-orange-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMTMColor = (mtm: number) => {
    return mtm >= 0 ? "text-green-600" : "text-red-600";
  };

  // Delete instrument function
  const deleteInstrument = (id: string) => {
    importService.deleteInstrument(id);
    const updatedInstruments = importService.getHedgingInstruments();
    setInstruments(updatedInstruments);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('hedgingInstrumentsUpdated'));
    
    toast({
      title: "Instrument Deleted",
      description: "The hedging instrument has been removed successfully.",
    });
  };

  const deleteAllInstruments = () => {
    // Delete all instruments using the same service method
    instruments.forEach(instrument => {
      importService.deleteInstrument(instrument.id);
    });
    
    const updatedInstruments = importService.getHedgingInstruments();
    setInstruments(updatedInstruments);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('hedgingInstrumentsUpdated'));
    
    toast({
      title: "All Instruments Deleted",
      description: "All hedging instruments have been removed successfully.",
    });
  };

  // View instrument function
  const viewInstrument = (instrument: HedgingInstrument) => {
    setSelectedInstrument(instrument);
    setIsViewDialogOpen(true);
  };

  // Edit instrument function
  const editInstrument = (instrument: HedgingInstrument) => {
    setSelectedInstrument(instrument);
    setIsEditDialogOpen(true);
  };

  // Save instrument changes function
  const saveInstrumentChanges = (updatedInstrument: HedgingInstrument) => {
    importService.updateInstrument(updatedInstrument.id, updatedInstrument);
    const updatedInstruments = importService.getHedgingInstruments();
    setInstruments(updatedInstruments);
    setIsEditDialogOpen(false);
    setSelectedInstrument(null);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('hedgingInstrumentsUpdated'));
    
    toast({
      title: "Instrument Updated",
      description: "The hedging instrument has been updated successfully.",
    });
  };

  const filteredInstruments = instruments.filter(instrument => {
    const isOption = instrument.type.includes("Call") || 
                    instrument.type.includes("Put") || 
                    instrument.type === "Collar" ||
                    instrument.type.includes("Touch") ||
                    instrument.type.includes("Binary") ||
                    instrument.type.includes("Digital") ||
                    instrument.type.includes("Knock");
    
    const matchesTab = selectedTab === "all" || 
                      (selectedTab === "forwards" && instrument.type === "Forward") ||
                      (selectedTab === "options" && isOption) ||
                      (selectedTab === "swaps" && instrument.type === "Swap") ||
                      (selectedTab === "hedge-accounting" && instrument.hedge_accounting);
    
    return matchesTab;
  });

  // Summary calculations
  const totalNotional = instruments.reduce((sum, inst) => {
    // Calculate the same way as displayed in the table
    const quantityToHedge = inst.quantity || 0;
    const unitPrice = inst.realOptionPrice || inst.premium || 0;
    const volumeToHedge = inst.notional;
    const calculatedNotional = unitPrice * volumeToHedge;
    
    // Use the same logic as in the table display
    const displayedNotional = calculatedNotional > 0 ? calculatedNotional : inst.notional;
    return sum + displayedNotional;
  }, 0);
  
  // Calculate total MTM using our pricing functions with currency-specific data
  const totalMTM = instruments.reduce((sum, inst) => {
    const marketData = commodityMarketData[inst.currency];
    if (!marketData) {
      console.warn(`No market data for currency ${inst.currency}, skipping MTM calculation`);
      return sum;
    }
    
    // ✅ CORRECTION : Utiliser le prix d'export comme prix initial pour MTM = 0 à l'export
    // Pour les stratégies exportées, le prix initial doit être le prix d'export
    const originalPrice = inst.realOptionPrice || inst.premium || 0;
    
    // ✅ CORRECTION : Logique correcte pour initialPrice
    const isExportedStrategy = inst.exportSpotPrice && inst.exportTimeToMaturity;
    // Pour les stratégies exportées : initialPrice = prix d'export (pour MTM=0 à l'export)
    // Pour les stratégies manuelles : initialPrice = premium saisi par l'utilisateur
    const initialPrice = isExportedStrategy ? originalPrice : (inst.premium || 0);
    
    // Calculate today's theoretical price using the same logic as Strategy Builder
    const todayPrice = calculateTodayPrice(inst);
    
    // ✅ MTM = (Today's Price - Initial Price) * Notional
    // Pour les stratégies exportées : Initial Price = Export Price → MTM = 0 à l'export
    // Pour les stratégies manuelles : Initial Price = Premium → MTM basé sur le premium
    const quantity = inst.quantity || 1;
    const isShort = quantity < 0;
    
    let mtmValue;
    if (isShort) {
      // For short positions: MTM = Initial Price - Today's Price
      mtmValue = initialPrice - todayPrice;
    } else {
      // For long positions: MTM = Today's Price - Initial Price  
      mtmValue = todayPrice - initialPrice;
    }
    
    console.log(`[DEBUG] ${inst.id}: MTM Calculation - Initial: ${initialPrice.toFixed(6)}, Today: ${todayPrice.toFixed(6)}, MTM: ${mtmValue.toFixed(6)}, Exported: ${isExportedStrategy}`);
    
    return sum + (mtmValue * Math.abs(inst.notional));
  }, 0);
  
  const hedgeAccountingCount = instruments.filter(inst => inst.hedge_accounting).length;

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Hedging Instruments" }
      ]}
    >
      {/* MTM Calculation Controls */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            MTM Valuation Parameters
          </CardTitle>
          <CardDescription>
            Configure market parameters for Mark-to-Market calculations using Strategy Builder date logic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* ✅ Strategy Builder Date Logic */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="strategy-start-date">Strategy Start Date</Label>
                <div className="flex items-center gap-2">
                <Input
                  id="strategy-start-date"
                  type="date"
                  value={strategyStartDate}
                    disabled
                    className="font-mono bg-gray-50 dark:bg-gray-800"
                />
                  <Badge variant="outline" className="text-xs">Fixed</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Fixed from Strategy Builder</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedging-start-date">Hedging Start Date</Label>
                <div className="flex items-center gap-2">
                <Input
                  id="hedging-start-date"
                  type="date"
                  value={hedgingStartDate}
                    disabled
                    className="font-mono bg-gray-50 dark:bg-gray-800"
                />
                  <Badge variant="outline" className="text-xs">Fixed</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Fixed from Strategy Builder</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valuation-date">Valuation Date</Label>
                <Input
                  id="valuation-date"
                  type="date"
                  value={valuationDate}
                  onChange={(e) => setValuationDate(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Track strategies over time</p>
              </div>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button 
                  onClick={recalculateAllMTM}
                  disabled={isRecalculating}
                  className="flex-1"
                >
                  {isRecalculating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  {isRecalculating ? "Calculating..." : "Recalculate All MTM"}
                </Button>
                

                
                {/* BOUTON DE TEST POUR DIAGNOSTIC */}
                <Button 
                  onClick={() => {
                    console.log('[DEBUG TEST] localStorage hedgingInstruments:', 
                      JSON.parse(localStorage.getItem('hedgingInstruments') || '[]'));
                    console.log('[DEBUG TEST] instruments state:', instruments);
                  }} 
                  variant="outline" 
                  size="sm"
                  className="px-3"
                >
                  🔍
                </Button>
              </div>
            </div>

            {/* Market Data per Commodity */}
            {getUniqueCommodities(instruments).length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Market Parameters by Commodity ({getUniqueCommodities(instruments).length} commodities found)
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshMarketDataFromExport}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh from Export
                  </Button>
                </div>
                {getUniqueCommodities(instruments).map((commodity) => {
                  const data = commodityMarketData[commodity] || getMarketDataFromInstruments(commodity) || { spot: 1.0000, volatility: 20, riskFreeRate: 1.0 };
                  return (
                    <div key={commodity} className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono font-semibold">
                            {commodity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {instruments.filter(inst => inst.currency === commodity).length} instrument(s)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => applyDefaultDataForCommodity(commodity)}
                          className="text-xs"
                        >
                          Reset to Default
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor={`spot-${commodity}`} className="text-xs">Spot Price</Label>
                          <Input
                            id={`spot-${commodity}`}
                            type="number"
                            step="0.0001"
                            value={data.spot}
                            onChange={(e) => updateCommodityMarketData(commodity, 'spot', parseFloat(e.target.value) || data.spot)}
                            className="font-mono text-sm"
                            placeholder="75.50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`vol-${commodity}`} className="text-xs">Volatility (%)</Label>
                          <Input
                            id={`vol-${commodity}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={data.volatility}
                            onChange={(e) => updateCommodityMarketData(commodity, 'volatility', parseFloat(e.target.value) || data.volatility)}
                            className="font-mono text-sm"
                            placeholder="25"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`risk-${commodity}`} className="text-xs">Risk-Free Rate (%)</Label>
                          <Input
                            id={`risk-${commodity}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max="20"
                            value={data.riskFreeRate}
                            onChange={(e) => updateCommodityMarketData(commodity, 'riskFreeRate', parseFloat(e.target.value) || data.riskFreeRate)}
                            className="font-mono text-sm"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No instruments found. Import strategies from Strategy Builder to see market parameters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Volatility Overrides Summary */}
      {instruments.some(inst => inst.impliedVolatility) && (
        <Card className="mb-4 border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Individual Volatility Overrides
            </CardTitle>
            <CardDescription className="text-xs">
              Instruments using custom volatility instead of global market parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {instruments
                .filter(inst => inst.impliedVolatility)
                .map(inst => (
                  <Badge key={inst.id} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    {inst.id}: {inst.impliedVolatility?.toFixed(1)}%
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 ml-1 text-purple-500 hover:text-red-500"
                      onClick={() => resetInstrumentVolatility(inst.id)}
                      title="Reset to global volatility"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Spot Price Overrides Summary */}
      {instruments.some(inst => inst.impliedSpotPrice) && (
        <Card className="mb-4 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Individual Spot Price Overrides
            </CardTitle>
            <CardDescription className="text-xs">
              Instruments using custom spot price instead of global market parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {instruments
                .filter(inst => inst.impliedSpotPrice)
                .map(inst => (
                  <Badge key={inst.id} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {inst.id}: {inst.impliedSpotPrice?.toFixed(6)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 ml-1 text-blue-500 hover:text-red-500"
                      onClick={() => resetInstrumentSpotPrice(inst.id)}
                      title="Reset to global spot price"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notional</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalNotional)}</div>
            <p className="text-xs text-muted-foreground">
              Across {instruments.length} instruments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mark-to-Market</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMTMColor(totalMTM)}`}>
              {formatCurrency(totalMTM)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unrealized P&L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Accounting</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hedgeAccountingCount}</div>
            <p className="text-xs text-muted-foreground">
              Qualifying instruments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Near Maturity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Commodity Hedging Instruments</CardTitle>
              <CardDescription>
                Manage forwards, options, swaps and other commodity hedging instruments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Toggle Export Columns */}
              <Button 
                onClick={() => setShowExportColumns(!showExportColumns)}
                variant={showExportColumns ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
              >
                {showExportColumns ? "Hide Export" : "Show Export"}
              </Button>
              
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instrument
                </Button>
              </DialogTrigger>
              <Button
                variant="destructive"
                onClick={deleteAllInstruments}
                disabled={instruments.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Commodity Hedging Instrument</DialogTitle>
                  <DialogDescription>
                    Create a new commodity hedging instrument entry.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="instrument-type" className="text-right">
                      Type
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select instrument type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forward">Forward Contract</SelectItem>
                        <SelectItem value="vanilla-call">Vanilla Call</SelectItem>
                        <SelectItem value="vanilla-put">Vanilla Put</SelectItem>
                        <SelectItem value="collar">Collar</SelectItem>
                        <SelectItem value="swap">Commodity Swap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="commodity" className="text-right">
                      Commodity
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select commodity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WTI">WTI Crude Oil</SelectItem>
                        <SelectItem value="BRENT">Brent Crude Oil</SelectItem>
                        <SelectItem value="NATGAS">Natural Gas</SelectItem>
                        <SelectItem value="GOLD">Gold</SelectItem>
                        <SelectItem value="SILVER">Silver</SelectItem>
                        <SelectItem value="COPPER">Copper</SelectItem>
                        <SelectItem value="CORN">Corn</SelectItem>
                        <SelectItem value="WHEAT">Wheat</SelectItem>
                        <SelectItem value="SOYBEAN">Soybeans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notional" className="text-right">
                      Notional
                    </Label>
                    <Input
                      id="notional"
                      type="number"
                      placeholder="1000000"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rate" className="text-right">
                      Rate/Strike
                    </Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.0001"
                      placeholder="1.0850"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="maturity" className="text-right">
                      Maturity
                    </Label>
                    <Input
                      id="maturity"
                      type="date"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="counterparty" className="text-right">
                      Counterparty
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select counterparty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deutsche-bank">Deutsche Bank</SelectItem>
                        <SelectItem value="hsbc">HSBC</SelectItem>
                        <SelectItem value="jpmorgan">JPMorgan</SelectItem>
                        <SelectItem value="bnp-paribas">BNP Paribas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Instrument</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="forwards">Forwards</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="swaps">Swaps</TabsTrigger>
              <TabsTrigger value="hedge-accounting">Hedge Accounting</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-4">
              {filteredInstruments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Commodity Hedging Instruments</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't imported any strategies yet. Create and import strategies from the Strategy Builder.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <a href="/strategy-builder">
                        <Target className="h-4 w-4 mr-2" />
                        Go to Strategy Builder
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manual Instrument
                    </Button>
                  </div>
                </div>
              ) : (
                                 <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 280px)' }}>
                   <Table className="min-w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                     <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                       <TableRow className="border-b-2 border-slate-200">
                         {/* Fixed columns */}
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[60px] sticky left-0 z-[5]">ID</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">Type</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">Commodity</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[80px]">Quantity (%)</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">Unit Price (Initial)</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">Today Price</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">MTM</TableHead>
                         
                         {/* Dynamic columns with conditional Export */}
                         <TableHead colSpan={showExportColumns ? 2 : 1} className="text-center border-b border-r border-slate-200 bg-blue-50 font-semibold min-w-[120px]">Time to Maturity</TableHead>
                         <TableHead colSpan={showExportColumns ? 2 : 1} className="text-center border-b border-r border-slate-200 bg-green-50 font-semibold min-w-[100px]">Spot Price</TableHead>
                         <TableHead colSpan={showExportColumns ? 2 : 1} className="text-center border-b border-r border-slate-200 bg-yellow-50 font-semibold min-w-[100px]">Volatility (%)</TableHead>
                         <TableHead colSpan={showExportColumns ? 2 : 1} className="text-center border-b border-r border-slate-200 bg-purple-50 font-semibold min-w-[120px]">Risk-Free Rate (%)</TableHead>
                         <TableHead colSpan={showExportColumns ? 2 : 1} className="text-center border-b border-r border-slate-200 bg-indigo-50 font-semibold min-w-[120px]">Forward Price</TableHead>
                         <TableHead colSpan={showExportColumns ? 2 : 1} className="text-center border-b border-r border-slate-200 bg-orange-50 font-semibold min-w-[120px]">Strike Analysis</TableHead>
                         
                         {/* Fixed end columns */}
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[80px]">Barrier 1</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[80px]">Barrier 2</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[80px]">Rebate (%)</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[80px]">Volume</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">Notional</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[100px]">Maturity</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center border-r border-slate-200 min-w-[80px]">Status</TableHead>
                         <TableHead rowSpan={2} className="bg-slate-50 font-semibold text-center min-w-[120px]">Actions</TableHead>
                    </TableRow>
                       <TableRow className="border-b border-slate-200">
                         {/* Sub-headers for dynamic columns */}
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-blue-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-blue-50 border-r border-slate-200 font-medium">Current</TableHead>
                         
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-green-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-green-50 border-r border-slate-200 font-medium">Current</TableHead>
                         
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-yellow-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-yellow-50 border-r border-slate-200 font-medium">Current</TableHead>
                         
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-purple-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-purple-50 border-r border-slate-200 font-medium">Current</TableHead>
                         
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-pink-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-pink-50 border-r border-slate-200 font-medium">Current</TableHead>
                         
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-indigo-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-indigo-50 border-r border-slate-200 font-medium">Current</TableHead>
                         
                         {showExportColumns && <TableHead className="text-xs text-blue-600 bg-orange-50 border-r border-slate-200 font-medium">Export</TableHead>}
                         <TableHead className="text-xs text-green-600 bg-orange-50 font-medium">Current</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstruments.map((instrument) => {
                      // Calculate derived values
                      const quantityToHedge = instrument.quantity || 0;
                      // Use real option price from Detailed Results if available, otherwise use premium
                      const unitPrice = instrument.realOptionPrice || instrument.premium || 0;
                      // Calculate today's price using current market parameters
                      const todayPrice = calculateTodayPrice(instrument);
                      
                      // ✅ Calculate MTM with proper long/short logic (same as total MTM calculation)
                      // ✅ CORRECTION : Logique correcte pour initialPrice dans le tableau
                      const isExportedStrategy = instrument.exportSpotPrice && instrument.exportTimeToMaturity;
                      // Pour les stratégies exportées : initialPrice = prix d'export (pour MTM=0 à l'export)
                      // Pour les stratégies manuelles : initialPrice = premium saisi par l'utilisateur
                      const initialPrice = isExportedStrategy ? unitPrice : (instrument.premium || 0);
                      
                      const isShort = quantityToHedge < 0;
                      let mtmValue;
                      if (isShort) {
                        // For short positions: MTM = Initial Price - Today's Price
                        mtmValue = initialPrice - todayPrice;
                      } else {
                        // For long positions: MTM = Today's Price - Initial Price  
                        mtmValue = todayPrice - initialPrice;
                      }
                      
                      console.log(`[DEBUG] ${instrument.id}: Table MTM - Initial: ${initialPrice.toFixed(6)}, Today: ${todayPrice.toFixed(6)}, MTM: ${mtmValue.toFixed(6)}, Exported: ${isExportedStrategy}`);
                                              // Calculate time to maturity - Utiliser la même logique que Strategy Builder
                        let timeToMaturity = 0;
                        if (instrument.maturity) {
                          // ✅ Utiliser la fonction calculateTimeToMaturity qui gère déjà l'expiration
                          timeToMaturity = calculateTimeToMaturity(instrument.maturity, valuationDate);
                          console.log(`[DEBUG] ${instrument.id}: CURRENT DISPLAY - Using Valuation Date ${valuationDate}: ${timeToMaturity.toFixed(4)}y`);
                          console.log(`[DEBUG] ${instrument.id}: Time to Maturity - Current: ${timeToMaturity.toFixed(4)}y, Export: ${instrument.exportTimeToMaturity ? instrument.exportTimeToMaturity.toFixed(4) + 'y' : 'N/A'}`);
                        } else {
                          console.warn(`No maturity date available for instrument ${instrument.id}`);
                          timeToMaturity = 0;
                        }
                      // Use implied volatility from Detailed Results if available, otherwise use component volatility
                      const volatility = instrument.impliedVolatility || instrument.volatility || 0;
                      // FIX: Le notional contient déjà la quantité appliquée, donc volumeToHedge = notional
                      const volumeToHedge = instrument.notional; // Plus de double multiplication
                      const calculatedNotional = unitPrice * volumeToHedge;
                      
                      return (
                         <TableRow key={instrument.id} className="hover:bg-slate-50/80 border-b border-slate-100 transition-all duration-200 group">
                           <TableCell className="font-semibold bg-slate-50/90 border-r border-slate-200 text-center sticky left-0 z-[5] text-slate-700">
                             <div className="px-2 py-1 rounded-md bg-white shadow-sm">
                               {instrument.id}
                             </div>
                           </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-slate-100/50 group-hover:bg-slate-200/50 transition-colors">
                              {getInstrumentIcon(instrument.type)}
                              </div>
                              <div className="space-y-1">
                                <div className="font-medium text-slate-900">{instrument.type}</div>
                                {instrument.strategyName && (
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                    From: {instrument.strategyName}
                                  </div>
                                )}
                                {instrument.repricingData && (
                                  <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                    Period Data ✓
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono font-semibold px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">
                              {instrument.currency}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-50 text-green-700 font-mono font-semibold text-sm">
                            {quantityToHedge.toFixed(1)}%
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono text-slate-700 font-semibold">
                              {unitPrice > 0 ? unitPrice.toFixed(4) : 
                                <span className="text-slate-400 italic">N/A</span>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <div className={`font-mono font-semibold ${todayPrice !== 0 ? "text-blue-600" : "text-slate-400"}`}>
                              {todayPrice !== 0 ? todayPrice.toFixed(4) : 'N/A'}
                              </div>
                            {(() => {
                              // Détecter le modèle de pricing utilisé (EXACTEMENT la même logique que calculateTodayPrice)
                              const optionType = instrument.type.toLowerCase();
                              let modelName = "unknown";
                              let modelColor = "bg-gray-50 text-gray-600";
                              
                              // 1. OPTIONS DOUBLE BARRIÈRE - PRIORITÉ ABSOLUE (avant toutes les autres)
                              if (optionType.includes('double')) {
                                modelName = "closed-form (double)";
                                modelColor = "bg-purple-50 text-purple-700";
                              }
                              // 2. OPTIONS BARRIÈRES SIMPLES - DEUXIÈME PRIORITÉ
                              else if (optionType.includes('knock-out') || optionType.includes('knock-in') || 
                                  optionType.includes('barrier') || optionType.includes('ko ') || optionType.includes('ki ') ||
                                  optionType.includes('knockout') || optionType.includes('knockin') || optionType.includes('reverse')) {
                                modelName = "closed-form";
                                modelColor = "bg-blue-50 text-blue-700";
                              }
                              // 3. OPTIONS DIGITALES - TROISIÈME PRIORITÉ
                              else if (optionType.includes('touch') || optionType.includes('binary') || 
                                       optionType.includes('digital')) {
                                modelName = "monte-carlo";
                                modelColor = "bg-orange-50 text-orange-700";
                              }
                              // 4. OPTIONS VANILLES EXPLICITES
                              else if (optionType === 'vanilla call' || optionType === 'vanilla put') {
                                modelName = optionPricingModel === 'monte-carlo' ? "monte-carlo" : "black-scholes";
                                modelColor = optionPricingModel === 'monte-carlo' ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700";
                              }
                              // 5. FORWARDS
                              else if (optionType === 'forward') {
                                modelName = "commodity-forward";
                                modelColor = "bg-cyan-50 text-cyan-700";
                              }
                              // 6. SWAPS
                              else if (optionType === 'swap') {
                                modelName = "commodity-swap";
                                modelColor = "bg-indigo-50 text-indigo-700";
                              }
                              // 7. OPTIONS VANILLES GÉNÉRIQUES - SEULEMENT si pas déjà traité
                              else if (optionType.includes('call') && !optionType.includes('knock')) {
                                modelName = optionPricingModel === 'monte-carlo' ? "monte-carlo" : "black-scholes";
                                modelColor = optionPricingModel === 'monte-carlo' ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700";
                              } else if (optionType.includes('put') && !optionType.includes('knock')) {
                                modelName = optionPricingModel === 'monte-carlo' ? "monte-carlo" : "black-scholes";
                                modelColor = optionPricingModel === 'monte-carlo' ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700";
                              }
                              
                              return (
                                <div className={`text-xs px-2 py-1 rounded-md font-medium ${modelColor}`}>
                                  {modelName}
                                </div>
                              );
                            })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-mono font-semibold ${
                              mtmValue >= 0 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {Math.abs(mtmValue) > 0.0001 ? (mtmValue >= 0 ? '+' : '') + mtmValue.toFixed(4) : '0.0000'}
                            </div>
                          </TableCell>
                                                     {/* Time to Maturity - Export (conditional) */}
                           {showExportColumns && (
                             <TableCell className="font-mono text-center bg-blue-50 border-r border-slate-200">
                              <div className="text-xs text-blue-600">
                              {instrument.exportTimeToMaturity ? 
                                `${instrument.exportTimeToMaturity.toFixed(4)}y` : 
                                'N/A'
                              }
                            </div>
                            {instrument.exportTimeToMaturity && (
                              <div className="text-xs text-gray-500">
                                {(instrument.exportTimeToMaturity * 365).toFixed(0)}d
                              </div>
                            )}
                          </TableCell>
                           )}
                          
                          {/* Time to Maturity - Current */}
                           <TableCell className="text-center bg-green-50/80 border-r border-slate-200">
                            <div className="space-y-1">
                              <div className={`text-sm font-mono font-semibold ${timeToMaturity === 0 ? 'text-red-600' : 'text-green-700'}`}>
                              {timeToMaturity.toFixed(4)}y
                            </div>
                              <div className={`text-xs px-2 py-1 rounded-md ${timeToMaturity === 0 ? 'text-red-600 bg-red-100/50' : 'text-green-600 bg-green-100/50'}`}>
                              {timeToMaturity === 0 ? 'EXPIRED' : `${(timeToMaturity * 365).toFixed(0)}d`}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-md ${timeToMaturity === 0 ? 'text-red-500 bg-red-50' : 'text-green-500 bg-green-50'}`}>
                                {timeToMaturity === 0 ? `Expired on ${instrument.maturity}` : `From ${valuationDate} to ${instrument.maturity}`}
                              </div>
                            </div>
                          </TableCell>
                          
                                                     {/* Spot Price - Export (conditional) */}
                           {showExportColumns && (
                             <TableCell className="text-center bg-blue-50/80 border-r border-slate-200">
                               <div className="text-sm font-mono font-semibold text-blue-700">
                              {instrument.exportSpotPrice ? 
                                instrument.exportSpotPrice.toFixed(6) : 
                                   <span className="text-blue-400 italic">N/A</span>
                              }
                            </div>
                          </TableCell>
                           )}
                          
                          {/* Spot Price - Current */}
                           <TableCell className="text-center bg-green-50/80 border-r border-slate-200">
                            {(() => {
                              const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { spot: 1.0000, volatility: 20, domesticRate: 1.0, foreignRate: 1.0 };
                              const currentSpot = instrument.impliedSpotPrice || marketData.spot;
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={instrument.impliedSpotPrice ?? currentSpot}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value) && value > 0) {
                                          updateInstrumentSpotPrice(instrument.id, value);
                                        }
                                      }}
                                      placeholder={currentSpot.toFixed(6)}
                                      className="w-20 h-6 text-xs text-center bg-white border-green-200 focus:border-green-400 focus:ring-green-400/20"
                                      step="0.0001"
                                      min="0"
                                    />
                                    {instrument.impliedSpotPrice && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                        onClick={() => resetInstrumentSpotPrice(instrument.id)}
                                        title="Reset to global spot price"
                                      >
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                <div className="text-xs text-green-600 bg-green-100/50 px-2 py-1 rounded-md">
                                    Using: {currentSpot.toFixed(6)}
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                          
                                                     {/* Volatility - Export (conditional) */}
                           {showExportColumns && (
                             <TableCell className="text-center bg-blue-50/80 border-r border-slate-200">
                               <div className="text-sm font-mono font-semibold text-blue-700">
                              {instrument.exportVolatility ? 
                                `${instrument.exportVolatility.toFixed(2)}%` : 
                                   <span className="text-blue-400 italic">N/A</span>
                              }
                            </div>
                          </TableCell>
                           )}
                          
                          {/* Volatility - Current */}
                           <TableCell className="text-center bg-green-50/80 border-r border-slate-200">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={instrument.impliedVolatility || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 100) {
                                      updateInstrumentVolatility(instrument.id, value);
                                    }
                                  }}
                                  placeholder={volatility.toFixed(1)}
                                  className="w-16 h-6 text-xs text-center bg-white border-green-200 focus:border-green-400 focus:ring-green-400/20"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                />
                                <span className="text-xs">%</span>
                                {instrument.impliedVolatility && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                    onClick={() => resetInstrumentVolatility(instrument.id)}
                                    title="Reset to global volatility"
                                  >
                                    ×
                                  </Button>
                                )}
                              </div>
                                                              <div className="text-xs text-green-600 bg-green-100/50 px-2 py-1 rounded-md">
                                Using: {instrument.impliedVolatility || volatility}%
                              </div>
                            </div>
                          </TableCell>
                          
                                                     {/* Risk-Free Rate - Export (conditional) */}
                           {showExportColumns && (
                             <TableCell className="font-mono text-center bg-blue-50 border-r border-slate-200">
                            <div className="text-xs text-blue-600">
                              {instrument.exportDomesticRate ? 
                                `${instrument.exportDomesticRate.toFixed(3)}%` : 
                                'N/A'
                              }
                                </div>
                          </TableCell>
                           )}
                          
                          {/* Risk-Free Rate - Current */}
                          <TableCell className="font-mono text-center bg-green-50">
                            {(() => {
                              const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { 
                                spot: 1.0000, 
                                volatility: 20, 
                                riskFreeRate: 1.0
                              };
                              return (
                                <div className="text-xs text-green-600">
                                  {marketData.riskFreeRate.toFixed(3)}%
                                </div>
                              );
                            })()}
                          </TableCell>
                          
                          
                                                     {/* Forward Price - Export (conditional) */}
                           {showExportColumns && (
                             <TableCell className="font-mono text-center bg-blue-50 border-r border-slate-200">
                            <div className="text-xs text-blue-600">
                              {instrument.exportForwardPrice ? 
                                instrument.exportForwardPrice.toFixed(6) : 
                                'N/A'
                              }
                            </div>
                          </TableCell>
                           )}
                          
                          {/* Forward Price - Current */}
                          <TableCell className="font-mono text-center bg-green-50">
                            {(() => {
                              const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { 
                                spot: 1.0000, 
                                volatility: 20, 
                                riskFreeRate: 1.0
                              };
                              // ✅ CORRECTION : Utiliser la même formule que Strategy Builder pour les commodités
                              const r_d = marketData.riskFreeRate / 100;
                              const currentSpot = instrument.impliedSpotPrice || marketData.spot;
                              const currentTimeToMat = calculateTimeToMaturity(instrument.maturity, valuationDate);
                              // Utiliser la même formule que Strategy Builder : S * exp(r * t) pour les commodités
                              const currentForward = currentSpot * Math.exp(r_d * currentTimeToMat);
                              console.log(`[DEBUG] ${instrument.id}: Forward Price - Current using Simple Logic, TTM: ${currentTimeToMat.toFixed(4)}y, Forward: ${currentForward.toFixed(6)}`);
                              return (
                                <div className="text-xs text-green-600">
                                  {currentForward.toFixed(6)}
                                </div>
                              );
                            })()}
                          </TableCell>
                          
                                                     {/* Strike - Export (conditional) */}
                           {showExportColumns && (
                             <TableCell className="font-mono text-center bg-blue-50 border-r border-slate-200">
                            <div className="text-xs text-blue-600">
                              {(() => {
                                // Calculer le strike d'export basé sur les paramètres d'export
                                if (instrument.originalComponent && instrument.exportSpotPrice) {
                                  const exportStrike = instrument.originalComponent.strikeType === 'percent' 
                                    ? instrument.exportSpotPrice * (instrument.originalComponent.strike / 100)
                                    : instrument.originalComponent.strike;
                                  return exportStrike.toFixed(4);
                                }
                                return 'N/A';
                              })()}
                            </div>
                            {instrument.originalComponent && (
                              <div className="text-xs text-gray-500">
                                {instrument.originalComponent.strikeType}: {instrument.originalComponent.strike}
                              </div>
                            )}
                          </TableCell>
                           )}
                          
                          {/* Strike - Current */}
                          <TableCell className="font-mono text-center bg-green-50">
                            <div className="text-xs text-green-600">
                            {instrument.strike ? instrument.strike.toFixed(4) : 'N/A'}
                            </div>
                            {instrument.originalComponent && (
                              <div className="text-xs text-gray-500">
                                Current calculation
                              </div>
                            )}
                            {instrument.dynamicStrikeInfo && (
                              <div className="text-xs text-orange-600">
                                Dyn: {instrument.dynamicStrikeInfo.calculatedStrikePercent}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.barrier ? instrument.barrier.toFixed(4) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.secondBarrier ? instrument.secondBarrier.toFixed(4) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {instrument.rebate ? instrument.rebate.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {formatCurrency(volumeToHedge)}
                          </TableCell>
                          <TableCell className="font-mono text-right">
                            {calculatedNotional > 0 ? formatCurrency(calculatedNotional) : formatCurrency(instrument.notional)}
                          </TableCell>
                          <TableCell>{instrument.maturity}</TableCell>
                        <TableCell>
                          {instrument.effectiveness_ratio ? (
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={instrument.effectiveness_ratio} 
                                className="w-16 h-2" 
                              />
                              <span className="text-sm font-medium">
                                {instrument.effectiveness_ratio}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(instrument.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Details"
                              onClick={() => viewInstrument(instrument)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Edit"
                              onClick={() => editInstrument(instrument)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Delete"
                              onClick={() => deleteInstrument(instrument.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Hedge Effectiveness Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Hedge Effectiveness Summary</CardTitle>
          <CardDescription>
            Overview of hedge accounting qualifying instruments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instruments.filter(inst => inst.hedge_accounting).map((instrument) => (
              <div key={instrument.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getInstrumentIcon(instrument.type)}
                  <div>
                    <div className="font-medium">{instrument.id} - {instrument.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {instrument.currency} • {formatCurrency(instrument.notional)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">Effectiveness Ratio</div>
                    <div className="text-lg font-bold">
                      {instrument.effectiveness_ratio}%
                    </div>
                  </div>
                  <Progress 
                    value={instrument.effectiveness_ratio || 0} 
                    className="w-24 h-3" 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Instrument Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Instrument Details</DialogTitle>
            <DialogDescription>
              View detailed information about this hedging instrument
            </DialogDescription>
          </DialogHeader>
          {selectedInstrument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Currency Pair</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.currency}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.quantity?.toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Strike</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.strike?.toFixed(4) || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Maturity</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.maturity}</p>
                </div>
                {selectedInstrument.barrier && (
                  <div>
                    <Label className="text-sm font-medium">Barrier 1</Label>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.barrier.toFixed(4)}</p>
                  </div>
                )}
                {selectedInstrument.secondBarrier && (
                  <div>
                    <Label className="text-sm font-medium">Barrier 2</Label>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.secondBarrier.toFixed(4)}</p>
                  </div>
                )}
                {selectedInstrument.rebate && (
                  <div>
                    <Label className="text-sm font-medium">Rebate (%)</Label>
                    <p className="text-sm text-muted-foreground">{selectedInstrument.rebate.toFixed(2)}%</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Notional</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedInstrument.notional)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.status}</p>
                </div>
              </div>
              {selectedInstrument.strategyName && (
                <div>
                  <Label className="text-sm font-medium">Strategy Source</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstrument.strategyName}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instrument Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Instrument</DialogTitle>
            <DialogDescription>
              Modify the parameters of this hedging instrument
            </DialogDescription>
          </DialogHeader>
          {selectedInstrument && (
            <InstrumentEditForm 
              instrument={selectedInstrument}
              onSave={saveInstrumentChanges}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// Component for editing instrument details
const InstrumentEditForm: React.FC<{
  instrument: HedgingInstrument;
  onSave: (instrument: HedgingInstrument) => void;
  onCancel: () => void;
}> = ({ instrument, onSave, onCancel }) => {
  const [editedInstrument, setEditedInstrument] = useState<HedgingInstrument>({ ...instrument });

  const handleSave = () => {
    onSave(editedInstrument);
  };

  const updateField = (field: keyof HedgingInstrument, value: any) => {
    setEditedInstrument(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-quantity">Quantity (%)</Label>
          <Input
            id="edit-quantity"
            type="number"
            step="0.1"
            value={editedInstrument.quantity || 0}
            onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="edit-strike">Strike</Label>
          <Input
            id="edit-strike"
            type="number"
            step="0.0001"
            value={editedInstrument.strike || 0}
            onChange={(e) => updateField('strike', parseFloat(e.target.value) || 0)}
          />
        </div>
        {editedInstrument.barrier !== undefined && (
          <div>
            <Label htmlFor="edit-barrier">Barrier 1</Label>
            <Input
              id="edit-barrier"
              type="number"
              step="0.0001"
              value={editedInstrument.barrier || 0}
              onChange={(e) => updateField('barrier', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        {editedInstrument.secondBarrier !== undefined && (
          <div>
            <Label htmlFor="edit-second-barrier">Barrier 2</Label>
            <Input
              id="edit-second-barrier"
              type="number"
              step="0.0001"
              value={editedInstrument.secondBarrier || 0}
              onChange={(e) => updateField('secondBarrier', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        {editedInstrument.rebate !== undefined && (
          <div>
            <Label htmlFor="edit-rebate">Rebate (%)</Label>
            <Input
              id="edit-rebate"
              type="number"
              step="0.01"
              value={editedInstrument.rebate || 0}
              onChange={(e) => updateField('rebate', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        <div>
          <Label htmlFor="edit-notional">Notional</Label>
          <Input
            id="edit-notional"
            type="number"
            step="1000"
            value={editedInstrument.notional || 0}
            onChange={(e) => updateField('notional', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="edit-maturity">Maturity Date</Label>
          <Input
            id="edit-maturity"
            type="date"
            value={editedInstrument.maturity}
            onChange={(e) => updateField('maturity', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <Select value={editedInstrument.status} onValueChange={(value) => updateField('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Settled">Settled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
};

export default HedgingInstruments; 