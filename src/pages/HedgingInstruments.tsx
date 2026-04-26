import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTickerPeekPro, type TppCurrencyData } from "@/hooks/useTickerPeekPro";
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
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import PayoffChart from "@/components/PayoffChart";
import StrategyImportService, { HedgingInstrument } from "@/services/StrategyImportService";
import type { StrategyComponent } from "@/pages/Index";
import type { HedgingInstrumentDetailSnapshot } from "@/pages/HedgingInstrumentDetail";
import {
  barrierMonteCarloNumSteps,
  calculateBarrierOptionClosedForm,
  calculateBlack76Price,
  calculateCommodityForwardPrice,
  calculateDigitalOptionPrice,
  calculateOptionPrice,
  calculatePricesFromPaths,
  calculateTimeToMaturity,
  calculateUnderlyingPrice,
  calculateVanillaOptionMonteCarlo,
  clampOptionPriceNonNegative,
  commodityExpiredSettlementValue,
  commodityUndiscountedForwardValue,
  daysToMaturityFromYearsAct36525,
  dteClampedForVolatilitySurface,
  generateBarrierMonteCarloPathsForPricing,
  getDte,
  impliedVolSurfacePointToDecimal,
  orderedDoubleBarrierLevels,
  readStrategyBuilderPricingFromStorage,
  roundPrice4,
  roundPrice6,
  strategyBuilderAnnualPercentToDecimal,
  calculateStrategyPayoffAtPrice,
  calculateBlackScholesSpotPrice,
  calculateGarmanKohlhagenPrice,
  generateStrategyBuilderPayoffDiagramPaths,
  discountFactorContinuous,
} from "@/services/PricingService";
import { Commodity } from "@/services/commodityApi";
import { CURRENCY_PAIRS } from "@/pages/Index";
import { useInterestRates } from '@/hooks/useInterestRates';
import { getOrBuildCurve, interpolatePrice } from '@/lib/ticker-peek-pro/futuresCurve';
import {
  fetchFutures,
  fetchVolSurface,
  fetchVolSurfaceStrikes,
  type SurfacePoint,
  type FuturesContract,
} from "@/lib/ticker-peek-pro/barchart";
import { interpolateSurface } from "@/lib/ticker-peek-pro/volSurfaceInterpolation";
// ✅ Types d'instruments alignés avec Strategy Builder / Pricers (mêmes libellés que StrategyImportService)
const HEDGING_INSTRUMENT_TYPES = [
  { value: "Vanilla Call", label: "Vanilla Call" },
  { value: "Vanilla Put", label: "Vanilla Put" },
  { value: "Forward", label: "Forward" },
  { value: "Swap", label: "Swap" },
  { value: "Knock-Out Call", label: "Knock-Out Call" },
  { value: "Reverse Knock-Out Call", label: "Reverse Knock-Out Call" },
  { value: "Double Knock-Out Call", label: "Double Knock-Out Call" },
  { value: "Knock-Out Put", label: "Knock-Out Put" },
  { value: "Reverse Knock-Out Put", label: "Reverse Knock-Out Put" },
  { value: "Double Knock-Out Put", label: "Double Knock-Out Put" },
  { value: "Knock-In Call", label: "Knock-In Call" },
  { value: "Reverse Knock-In Call", label: "Reverse Knock-In Call" },
  { value: "Double Knock-In Call", label: "Double Knock-In Call" },
  { value: "Knock-In Put", label: "Knock-In Put" },
  { value: "Reverse Knock-In Put", label: "Reverse Knock-In Put" },
  { value: "Double Knock-In Put", label: "Double Knock-In Put" },
  { value: "One-Touch", label: "One-Touch (beta)" },
  { value: "Double-Touch", label: "Double-Touch (beta)" },
  { value: "No-Touch", label: "No-Touch (beta)" },
  { value: "Double-No-Touch", label: "Double-No-Touch (beta)" },
  { value: "Range Binary", label: "Range Binary (beta)" },
  { value: "Outside Binary", label: "Outside Binary (beta)" },
];
// ✅ Mapping des symboles de commodity aux symboles TradingView pour récupérer les prix réels
const COMMODITY_SYMBOL_MAP: { [key: string]: { tradingViewSymbol: string; category: 'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker' } } = {
  // Energy
  'WTI': { tradingViewSymbol: 'CL1!', category: 'energy' },
  'BRENT': { tradingViewSymbol: 'BRN1!', category: 'energy' },
  'NATGAS': { tradingViewSymbol: 'NG1!', category: 'energy' },
  'HEATING': { tradingViewSymbol: 'HO1!', category: 'energy' },
  'RBOB': { tradingViewSymbol: 'RB1!', category: 'energy' },
  
  // Precious Metals
  'GOLD': { tradingViewSymbol: 'GC1!', category: 'metals' },
  'SILVER': { tradingViewSymbol: 'SI1!', category: 'metals' },
  'PLATINUM': { tradingViewSymbol: 'PL1!', category: 'metals' },
  'PALLADIUM': { tradingViewSymbol: 'PA1!', category: 'metals' },
  
  // Base Metals
  'COPPER': { tradingViewSymbol: 'HG1!', category: 'metals' },
  'ALUMINUM': { tradingViewSymbol: 'ALI1!', category: 'metals' },
  'ZINC': { tradingViewSymbol: 'ZN1!', category: 'metals' },
  'NICKEL': { tradingViewSymbol: 'NI1!', category: 'metals' },
  
  // Agriculture
  'CORN': { tradingViewSymbol: 'ZC1!', category: 'agricultural' },
  'WHEAT': { tradingViewSymbol: 'ZW1!', category: 'agricultural' },
  'SOYBEAN': { tradingViewSymbol: 'ZS1!', category: 'agricultural' },
  'COTTON': { tradingViewSymbol: 'CT1!', category: 'agricultural' },
  'SUGAR': { tradingViewSymbol: 'SB1!', category: 'agricultural' },
  'COFFEE': { tradingViewSymbol: 'KC1!', category: 'agricultural' },
  
  // Livestock
  'CATTLE': { tradingViewSymbol: 'LE1!', category: 'agricultural' },
  'HOGS': { tradingViewSymbol: 'HE1!', category: 'agricultural' },
};

/** Map HedgingInstruments commodity (e.g. WTI or TPP symbol CL) to Ticker Peek Pro futures symbol (e.g. CL). */
function getTppSymbolForCommodity(currency: string): string | null {
  if (!currency || typeof currency !== "string") return null;
  const m = COMMODITY_SYMBOL_MAP[currency];
  if (m?.tradingViewSymbol) {
    const s = m.tradingViewSymbol;
    return s.replace(/\d+!?$/g, "").replace("!", "").trim() || s.slice(0, 3);
  }
  // Instrument may store TPP symbol directly (e.g. "CL", "NG") when added via Ticker Peek Pro
  const trimmed = currency.trim().toUpperCase();
  if (trimmed.length >= 1 && trimmed.length <= 5) return trimmed;
  return null;
}

function parseValuationDateToLocal(valuationDate: string): Date {
  const [y, m, d] = valuationDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Human-readable pricing model for detail view / navigation snapshot (matches table logic). */
function getPricingModelLabel(
  instrument: HedgingInstrument,
  optionPricingModel: "black-76" | "black-scholes" | "garman-kohlhagen" | "monte-carlo"
): string {
  const optionType = instrument.type.toLowerCase();
  if (optionType.includes("double")) return "closed-form (double)";
  if (
    optionType.includes("knock-out") ||
    optionType.includes("knock-in") ||
    optionType.includes("barrier") ||
    optionType.includes("ko ") ||
    optionType.includes("ki ") ||
    optionType.includes("knockout") ||
    optionType.includes("knockin") ||
    optionType.includes("reverse")
  ) {
    return "closed-form";
  }
  if (optionType.includes("touch") || optionType.includes("binary") || optionType.includes("digital")) {
    return "monte-carlo";
  }
  if (optionType === "vanilla call" || optionType === "vanilla put") {
    return optionPricingModel === "monte-carlo" ? "monte-carlo" : "black-scholes";
  }
  if (optionType === "forward") return "commodity-forward";
  if (optionType === "swap") return "commodity-swap";
  if (optionType.includes("call") && !optionType.includes("knock")) {
    return optionPricingModel === "monte-carlo" ? "monte-carlo" : "black-scholes";
  }
  if (optionType.includes("put") && !optionType.includes("knock")) {
    return optionPricingModel === "monte-carlo" ? "monte-carlo" : "black-scholes";
  }
  return "unknown";
}

/** Receivable / payable / long / short for exposure grouping (matches Exposures / Strategy Builder). */
function formatExposureDirection(v?: HedgingInstrument["volumeType"] | string): string {
  if (v == null || v === "" || v === "__none__") return "—";
  const map: Record<string, string> = {
    receivable: "RECEIVABLE",
    payable: "PAYABLE",
    long: "LONG",
    short: "SHORT",
  };
  return map[String(v)] || String(v).toUpperCase();
}

function formatExposureAmountFr(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

/** Pair label for exposure header (e.g. WTI/USD, EUR/USD). */
function formatExposurePairLabel(currency: string): string {
  const c = currency?.trim() || "";
  if (!c) return "—";
  const p = CURRENCY_PAIRS.find((x) => x.symbol === c);
  if (p) return `${p.symbol}/${p.quote}`;
  return c.includes("/") ? c : c;
}

function averageFinite(nums: (number | undefined | null)[]): number | null {
  const v = nums.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Map hedging table type labels to Strategy Builder component types (same as imported strategies). */
function mapHedgingInstrumentLabelToStrategyType(typeLabel: string): StrategyComponent["type"] {
  const t = typeLabel.trim().toLowerCase();
  const direct: Partial<Record<string, StrategyComponent["type"]>> = {
    "vanilla call": "call",
    "vanilla put": "put",
    forward: "forward",
    swap: "swap",
    "knock-out call": "call-knockout",
    "reverse knock-out call": "call-reverse-knockout",
    "double knock-out call": "call-double-knockout",
    "knock-out put": "put-knockout",
    "reverse knock-out put": "put-reverse-knockout",
    "double knock-out put": "put-double-knockout",
    "knock-in call": "call-knockin",
    "reverse knock-in call": "call-reverse-knockin",
    "double knock-in call": "call-double-knockin",
    "knock-in put": "put-knockin",
    "reverse knock-in put": "put-reverse-knockin",
    "double knock-in put": "put-double-knockin",
    "one-touch (beta)": "one-touch",
    "double-touch (beta)": "double-touch",
    "no-touch (beta)": "no-touch",
    "double-no-touch (beta)": "double-no-touch",
    "range binary (beta)": "range-binary",
    "outside binary (beta)": "outside-binary",
  };
  if (direct[t]) return direct[t]!;
  return "call";
}

function hedgingLegsToStrategyComponents(legs: HedgingInstrument[]): StrategyComponent[] {
  return legs.map((inst) => {
    if (inst.originalComponent) {
      const oc = inst.originalComponent;
      return {
        ...oc,
        barrierType: oc.barrierType ?? "percent",
      };
    }
    const st = mapHedgingInstrumentLabelToStrategyType(inst.type);
    const vol = inst.volatility ?? inst.exportVolatility ?? inst.impliedVolatility ?? 20;
    const qty = inst.quantity ?? 100;
    const strike = inst.strike ?? inst.exportStrike ?? 0;
    const o: StrategyComponent = {
      type: st,
      strike,
      strikeType: "absolute",
      volatility: vol,
      quantity: qty,
      barrierType: "absolute",
    };
    if (inst.barrier != null) o.barrier = inst.barrier;
    if (inst.secondBarrier != null) o.secondBarrier = inst.secondBarrier;
    if (inst.rebate != null) o.rebate = inst.rebate;
    return o;
  });
}

/** Same payoff diagram logic as Strategy Builder `calculatePayoff` (Index.tsx). */
function buildPayoffDiagramDataLikeStrategyBuilder(
  strategy: StrategyComponent[],
  ctx: {
    spotPrice: number;
    domesticRatePercent: number;
    foreignRatePercent: number;
    interestRatePercent: number;
    sigmaDecimal: number;
    optionPricingModel: "black-76" | "black-scholes" | "garman-kohlhagen" | "monte-carlo";
  }
): Array<{ price: number; payoff: number }> {
  if (strategy.length === 0) return [];
  const {
    spotPrice,
    domesticRatePercent,
    foreignRatePercent,
    interestRatePercent,
    sigmaDecimal,
    optionPricingModel,
  } = ctx;
  const priceRange = Array.from({ length: 101 }, (_, i) => spotPrice * (0.5 + i * 0.01));
  const numSteps = 252;
  const paths = generateStrategyBuilderPayoffDiagramPaths({
    spotPrice,
    domesticRatePercent,
    foreignRatePercent,
    sigmaDecimal,
    numSteps,
    numSimulations: 500,
  });

  return priceRange.map((price) => {
    let totalPayoff = 0;
    strategy.forEach((option) => {
      const strike =
        option.strikeType === "percent" ? spotPrice * (option.strike / 100) : option.strike;
      const quantity = option.quantity / 100;
      let optionPremium: number;

      if (option.type === "call" || option.type === "put") {
        if (optionPricingModel === "garman-kohlhagen") {
          optionPremium = calculateGarmanKohlhagenPrice(
            option.type,
            spotPrice,
            strike,
            strategyBuilderAnnualPercentToDecimal(interestRatePercent),
            strategyBuilderAnnualPercentToDecimal(interestRatePercent),
            1,
            option.volatility / 100
          );
        } else {
          optionPremium = calculateBlackScholesSpotPrice(
            option.type,
            spotPrice,
            strike,
            domesticRatePercent / 100,
            1,
            option.volatility / 100
          );
        }
      } else if (option.type.includes("knockout") || option.type.includes("knockin")) {
        const barrier =
          option.barrierType === "percent"
            ? spotPrice * ((option.barrier ?? 0) / 100)
            : option.barrier ?? 0;
        const secondBarrier = option.type.includes("double")
          ? option.barrierType === "percent"
            ? spotPrice * ((option.secondBarrier ?? 0) / 100)
            : option.secondBarrier
          : undefined;
        optionPremium = calculatePricesFromPaths(
          option.type,
          spotPrice,
          strike,
          strategyBuilderAnnualPercentToDecimal(interestRatePercent),
          numSteps,
          paths,
          barrier,
          secondBarrier
        );
      } else if (option.type === "swap" || option.type === "forward") {
        optionPremium = 0;
      } else if (
        ["one-touch", "no-touch", "double-touch", "double-no-touch", "range-binary", "outside-binary"].includes(
          option.type
        )
      ) {
        const rebateDecimal = (option.rebate || 5) / 100;
        optionPremium = 0.5 * rebateDecimal * discountFactorContinuous(domesticRatePercent / 100, 1);
      } else {
        optionPremium = 0;
      }

      const payoff = calculateStrategyPayoffAtPrice([option], price, spotPrice);
      const netPayoff = payoff - optionPremium;
      totalPayoff += netPayoff * quantity;
    });
    return { price, payoff: totalPayoff };
  });
}

// Note: keep all pricing-related helpers centralized in PricingService.

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
 * ✅ OPTIONS VANILLES (call/put) : calculateBlack76Price / calculateVanillaOptionMonteCarlo (PricingService)
 */
const HedgingInstruments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showExportColumns, setShowExportColumns] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("hedgingInstruments_showExportColumns");
      return v ? JSON.parse(v) === true : false;
    } catch {
      return false;
    }
  });
  
  // ── Interest Rates from Rate Explorer ──
  const {
    mode: interestRateMode,
    isCurveMode,
    getRate,
    fixedRates,
    hasCurveData
  } = useInterestRates();

  /** Reference display only: 1Y USD rate from Rate Explorer settings (curve or fixed). Per-row pricing uses getRate(USD, TTM). */
  const usdRate1YDisplayPct = useMemo(() => getRate("USD", 1) * 100, [getRate]);
  
  // ── Ticker Peek Pro Integration ──
  const tpp = useTickerPeekPro();
  const [useTppData, setUseTppData] = useState(() => {
    try {
      const saved = localStorage.getItem('hedgingUseTickerPeekPro');
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });
  const [tppSearchQuery, setTppSearchQuery] = useState('');
  
  // Helper pour parser les nombres en tenant compte des virgules (ex: "1,0850")
  const parseInputNumber = (value: string | number | undefined, defaultValue = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const str = value.toString().replace(',', '.');
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : defaultValue;
  };

  // Add Instrument form state (tous les inputs comme dans Pricers)
  const [addFormType, setAddFormType] = useState("");
  const [addFormCommodity, setAddFormCommodity] = useState("");
  const [addFormNotional, setAddFormNotional] = useState("1000000");
  const [addFormRate, setAddFormRate] = useState("75.50"); // default strike = spot
  const [addFormStrikeType, setAddFormStrikeType] = useState<"percent" | "absolute">("absolute");
  const [addFormStartDate, setAddFormStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [addFormMaturity, setAddFormMaturity] = useState("");
  const [addFormSpotPrice, setAddFormSpotPrice] = useState("75.50");
  const [addFormQuantity, setAddFormQuantity] = useState("100");
  const [addFormVolatility, setAddFormVolatility] = useState("25");
  const [addFormInterestRate, setAddFormInterestRate] = useState("4.5");
  const [addFormBarrier, setAddFormBarrier] = useState("");
  const [addFormSecondBarrier, setAddFormSecondBarrier] = useState("");
  const [addFormBarrierType, setAddFormBarrierType] = useState<"percent" | "absolute">("percent");
  const [addFormRebate, setAddFormRebate] = useState("1");
  const [addFormTimeToPayoff, setAddFormTimeToPayoff] = useState("1");
  const [addFormStorageCost, setAddFormStorageCost] = useState("0");
  const [addFormConvenienceYield, setAddFormConvenienceYield] = useState("0");
  const [addFormCounterparty, setAddFormCounterparty] = useState("");
  const [addFormPortfolio, setAddFormPortfolio] = useState("");
  const [addFormRealPrice, setAddFormRealPrice] = useState("");

  // Portfolios and counterparties (persisted in localStorage)
  type PortfolioOrCounterparty = { id: string; name: string };
  const DEFAULT_COUNTERPARTIES: PortfolioOrCounterparty[] = [
    { id: "deutsche-bank", name: "Deutsche Bank" },
    { id: "hsbc", name: "HSBC" },
    { id: "jpmorgan", name: "JPMorgan" },
    { id: "bnp-paribas", name: "BNP Paribas" },
  ];
  const loadList = <T,>(key: string, defaultVal: T): T => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : defaultVal;
    } catch { return defaultVal; }
  };
  const [portfolios, setPortfolios] = useState<PortfolioOrCounterparty[]>(() =>
    loadList("hedgingPortfolios", [])
  );
  const [counterparties, setCounterparties] = useState<PortfolioOrCounterparty[]>(() =>
    loadList("hedgingCounterparties", DEFAULT_COUNTERPARTIES)
  );
  const [filterByPortfolio, setFilterByPortfolio] = useState<string>("");
  const [filterByCounterparty, setFilterByCounterparty] = useState<string>("");
  const [filterByStrategy, setFilterByStrategy] = useState<string>("");
  const [instrumentSearchQuery, setInstrumentSearchQuery] = useState("");
  /** Primary table layout: flat by instrument, grouped by strategy, or by commodity exposure */
  const [displayView, setDisplayView] = useState<"instrument" | "strategy" | "exposure">("instrument");
  /** Secondary row when displayView === "strategy" (All = no extra filter) */
  const [strategyViewSegment, setStrategyViewSegment] = useState<string>("all");
  /** Secondary row when displayView === "exposure" */
  const [exposureViewSegment, setExposureViewSegment] = useState<string>("all");
  /** Strategy card view: expanded legs table */
  const [strategyExpandedKey, setStrategyExpandedKey] = useState<string | null>(null);
  const [strategyPayoffDialogKey, setStrategyPayoffDialogKey] = useState<string | null>(null);
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false);

  useEffect(() => {
    if (displayView !== "strategy") {
      setStrategyPayoffDialogKey(null);
      setStrategyExpandedKey(null);
    }
  }, [displayView]);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [isAddCounterpartyOpen, setIsAddCounterpartyOpen] = useState(false);
  const [newCounterpartyName, setNewCounterpartyName] = useState("");

  const savePortfolios = useCallback((list: PortfolioOrCounterparty[]) => {
    setPortfolios(list);
    localStorage.setItem("hedgingPortfolios", JSON.stringify(list));
  }, []);
  const saveCounterparties = useCallback((list: PortfolioOrCounterparty[]) => {
    setCounterparties(list);
    localStorage.setItem("hedgingCounterparties", JSON.stringify(list));
  }, []);

  const addPortfolio = useCallback(() => {
    const name = newPortfolioName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `portfolio-${Date.now()}`;
    if (portfolios.some((p) => p.id === id)) {
      toast({ title: "Portfolio exists", description: "A portfolio with this name already exists.", variant: "destructive" });
      return;
    }
    savePortfolios([...portfolios, { id, name }]);
    setNewPortfolioName("");
    setIsAddPortfolioOpen(false);
    setAddFormPortfolio(id);
    toast({ title: "Portfolio added", description: `"${name}" has been added.` });
  }, [newPortfolioName, portfolios, savePortfolios, toast]);

  const addCounterparty = useCallback(() => {
    const name = newCounterpartyName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `counterparty-${Date.now()}`;
    if (counterparties.some((c) => c.id === id)) {
      toast({ title: "Counterparty exists", description: "A counterparty with this name already exists.", variant: "destructive" });
      return;
    }
    saveCounterparties([...counterparties, { id, name }]);
    setNewCounterpartyName("");
    setIsAddCounterpartyOpen(false);
    setAddFormCounterparty(id);
    toast({ title: "Counterparty added", description: `"${name}" has been added.` });
  }, [newCounterpartyName, counterparties, saveCounterparties, toast]);

  const addFormTimeToMaturity = useMemo(() => {
    if (!addFormStartDate || !addFormMaturity) return 1;
    return calculateTimeToMaturity(addFormMaturity, addFormStartDate);
  }, [addFormStartDate, addFormMaturity]);
  const addFormDte = useMemo(() => {
    return daysToMaturityFromYearsAct36525(addFormTimeToMaturity);
  }, [addFormTimeToMaturity]);

  // Load TPP currencies when enabled
  useEffect(() => {
    if (useTppData) {
      tpp.loadAllTppCurrencies();
    }
  }, [useTppData, tpp.loadAllTppCurrencies]);

  // Default strike = spot when opening Add Instrument dialog
  useEffect(() => {
    if (isAddDialogOpen && addFormSpotPrice) {
      setAddFormRate(addFormSpotPrice);
    }
  }, [isAddDialogOpen]); // only when dialog opens; addFormSpotPrice may update after

  // Helper to get TPP symbol - when TPP is enabled, addFormCommodity IS the TPP symbol (e.g. "CL")
  // When TPP is disabled, we need to convert CURRENCY_PAIRS symbol (e.g. "WTI") to TPP symbol (e.g. "CL")
  const getEffectiveTppSymbol = useCallback((commodity: string): string | null => {
    if (useTppData) {
      // When TPP is enabled, the commodity IS the TPP symbol
      return commodity;
    }
    // When TPP is disabled, convert from CURRENCY_PAIRS symbol
    return getTppSymbolForCommodity(commodity);
  }, [useTppData]);

  // Load TPP data (futures + IV surface) when commodity changes
  useEffect(() => {
    if (useTppData && addFormCommodity && isAddDialogOpen) {
      // When TPP is enabled, addFormCommodity is already the TPP symbol (e.g. "CL")
      tpp.loadTppData(addFormCommodity).then(result => {
        if (result.spotPrice != null) {
          const spot = String(result.spotPrice.toFixed(4));
          setAddFormSpotPrice(spot);
          setAddFormRate(spot); // default strike = spot
          toast({
            title: "Data Terminal",
            description: `Spot price loaded: ${result.spotPrice.toFixed(2)} (${result.futuresCount} contracts)`,
          });
        }
        if (result.surfacePointsCount > 0) {
          toast({
            title: "IV Surface Loaded",
            description: `${result.surfacePointsCount} data points for vol interpolation`,
          });
        }
      });
    }
  }, [useTppData, addFormCommodity, isAddDialogOpen, tpp.loadTppData, toast]);

  // Auto-interpolate IV from TPP surface when strike/maturity changes
  useEffect(() => {
    if (!useTppData || tpp.tppSurfacePoints.length === 0 || !addFormCommodity || !isAddDialogOpen) return;
    const spotPrice = parseFloat(addFormSpotPrice) || 0;
    const strikeValue = parseFloat(addFormRate) || 0;
    const absoluteStrike = addFormStrikeType === 'percent' ? spotPrice * (strikeValue / 100) : strikeValue;
    const dte = dteClampedForVolatilitySurface(addFormDte);
    const type: 'call' | 'put' = addFormType.toLowerCase().includes('put') ? 'put' : 'call';
    const iv = tpp.interpolateTppIV(absoluteStrike, dte, type);
    if (iv !== null && iv > 0) {
      const ivPct = iv * 100;
      setAddFormVolatility(ivPct.toFixed(2));
    }
  }, [useTppData, tpp.tppSurfacePoints, addFormRate, addFormStrikeType, addFormSpotPrice, addFormDte, addFormType, isAddDialogOpen, addFormCommodity, tpp.interpolateTppIV]);

  // Manual refresh IV from TPP surface
  const handleRefreshTppIV = useCallback(() => {
    if (!useTppData || tpp.tppSurfacePoints.length === 0) {
      toast({ title: "IV Refresh", description: "No TPP surface data available.", variant: "destructive" });
      return;
    }
    const spotPrice = parseFloat(addFormSpotPrice) || 0;
    const strikeValue = parseFloat(addFormRate) || 0;
    const absoluteStrike = addFormStrikeType === 'percent' ? spotPrice * (strikeValue / 100) : strikeValue;
    const dte = dteClampedForVolatilitySurface(addFormDte);
    const type: 'call' | 'put' = addFormType.toLowerCase().includes('put') ? 'put' : 'call';
    const iv = tpp.interpolateTppIV(absoluteStrike, dte, type);
    if (iv !== null && iv > 0) {
      const ivPct = iv * 100;
      setAddFormVolatility(ivPct.toFixed(2));
      toast({ title: "IV Updated", description: `Volatility set to ${ivPct.toFixed(2)}% from TPP surface (Strike: ${absoluteStrike.toFixed(2)}, DTE: ${dte})` });
    } else {
      toast({ title: "IV Refresh", description: "Could not interpolate IV for current strike/maturity.", variant: "destructive" });
    }
  }, [useTppData, tpp.tppSurfacePoints, addFormRate, addFormStrikeType, addFormSpotPrice, addFormDte, addFormType, tpp.interpolateTppIV, toast]);

  useEffect(() => {
    if (addFormCommodity && isAddDialogOpen && !useTppData) {
      const pair = CURRENCY_PAIRS.find((p) => p.symbol === addFormCommodity);
      if (pair) {
        const spot = String(pair.defaultSpotRate);
        setAddFormSpotPrice(spot);
        setAddFormRate(spot); // default strike = spot
      }
    }
  }, [addFormCommodity, isAddDialogOpen, useTppData]);

  // ✅ Fonction pour récupérer le prix réel depuis Commodity Market (déclarée avant les hooks qui l'utilisent)
  const getRealMarketPrice = useCallback((commoditySymbol: string): number | null => {
    const symbolMap = COMMODITY_SYMBOL_MAP[commoditySymbol];
    if (!symbolMap) return null;
    try {
      const cacheKey = `fx_commodities_cache_${symbolMap.category}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        if (cacheData.data && Array.isArray(cacheData.data)) {
          let commodity = cacheData.data.find((c: Commodity) =>
            c.symbol === symbolMap.tradingViewSymbol ||
            c.symbol.replace('!', '') === symbolMap.tradingViewSymbol.replace('!', '')
          );
          if (!commodity) {
            const symbolWithoutExcl = symbolMap.tradingViewSymbol.replace('!', '');
            commodity = cacheData.data.find((c: Commodity) =>
              c.symbol === symbolWithoutExcl ||
              c.symbol.replace('!', '') === symbolWithoutExcl
            );
          }
          if (commodity && commodity.price > 0) {
            return commodity.price;
          }
        }
      }
    } catch (error) {
      console.error(`[REAL MARKET PRICE] Error reading cache for ${commoditySymbol}:`, error);
    }
    return null;
  }, []);

  // ── Auto-update Spot Price from real market price (brut, non bootstrapé) ──
  useEffect(() => {
    if (!useTppData || !addFormCommodity || !isAddDialogOpen) return;
    const realSpot = getRealMarketPrice(addFormCommodity);
    if (realSpot != null && realSpot > 0) {
      const currentSpot = parseFloat(addFormSpotPrice) || 0;
      if (Math.abs(realSpot - currentSpot) > 0.01) {
        const spotStr = realSpot.toFixed(4);
        setAddFormSpotPrice(spotStr);
        setAddFormRate(spotStr);
      }
    }
  }, [useTppData, addFormCommodity, isAddDialogOpen, getRealMarketPrice]);

  // ── Taux sans risque interpolé à la maturité (même logique que Rate Explorer "Rates at custom date") ──
  const getInterestRateForPricing = useMemo(() => {
    const maturityYears = addFormTimeToMaturity ?? 0;
    const rate = getRate('USD', maturityYears); // Interpolation sur la courbe bootstrapée (ou Bank Rate si mode fixed)
    return rate * 100; // Convert to percentage
  }, [getRate, addFormTimeToMaturity]);

  useEffect(() => {
    if (!isAddDialogOpen) return;
    const newRate = getInterestRateForPricing;
    const currentRate = parseFloat(addFormInterestRate) || 0;
    if (Math.abs(newRate - currentRate) > 0.01) {
      setAddFormInterestRate(newRate.toFixed(2));
    }
  }, [getInterestRateForPricing, isAddDialogOpen]);

  // ── Manual refresh Interest Rate (interpolation à la maturité du formulaire) ──
  const handleRefreshInterestRate = useCallback(() => {
    const newRate = getInterestRateForPricing;
    setAddFormInterestRate(newRate.toFixed(2));
    toast({
      title: "Rate Updated",
      description: `Taux interpolé à la maturité: ${newRate.toFixed(2)}% (${isCurveMode ? 'courbe bootstrapée' : 'Bank Rate'} - USD)`,
    });
  }, [getInterestRateForPricing, isCurveMode, toast]);

  // ── Manual refresh Spot Price from real market data ──
  const handleRefreshTppSpot = useCallback(() => {
    if (!useTppData || !addFormCommodity) {
      toast({ title: "Spot Refresh", description: "No real market data available.", variant: "destructive" });
      return;
    }
    const realSpot = getRealMarketPrice(addFormCommodity);
    if (realSpot != null && realSpot > 0) {
      const spotStr = realSpot.toFixed(4);
      setAddFormSpotPrice(spotStr);
      setAddFormRate(spotStr);
      toast({
        title: "Spot Updated",
        description: `Spot price set to ${realSpot.toFixed(4)} (raw market price)`,
      });
    } else {
      toast({ title: "Spot Refresh", description: "Could not find real market price for this commodity.", variant: "destructive" });
    }
  }, [useTppData, addFormCommodity, getRealMarketPrice, toast]);

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
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0]);
  
  // ✅ État pour utiliser les prix réels du Commodity Market
  const [useRealMarketPrices, setUseRealMarketPrices] = useState<boolean>(() => {
    const saved = localStorage.getItem('hedgingInstruments_useRealMarketPrices');
    return saved === 'true';
  });

  // Volatility from Pricers (calculatorState) – same as "Risk-free Rate" / volatility in Pricers
  const getRealVolatility = useCallback((): number | null => {
    try {
      const saved = localStorage.getItem('calculatorState');
      if (!saved) return null;
      const state = JSON.parse(saved);
      const vol = state?.strategyComponent?.volatility;
      return typeof vol === 'number' && vol > 0 ? vol : null;
    } catch {
      return null;
    }
  }, []);

  // Interpolate IV from TPP surface at (strike, dte). Returns IV in percentage (e.g. 25 for 25%).
  // Surface points can have iv as percentage (e.g. 69.69) or decimal (0.30); normalize to decimal before interpolating.
  const interpolateIVFromSurface = useCallback((
    surface: SurfacePoint[],
    absoluteStrike: number,
    dteDays: number,
    type: "call" | "put"
  ): number | null => {
    const filtered = surface.filter((p) => p.type === type);
    if (filtered.length === 0) return null;
    const strikes = [...new Set(filtered.map((p) => p.strike))].sort((a, b) => a - b);
    const dtes = [...new Set(filtered.map((p) => p.dte))].sort((a, b) => a - b);
    if (strikes.length < 2 || dtes.length < 2) return null;
    let z: (number | null)[][] = dtes.map((d) =>
      strikes.map((s) => {
        const point = filtered.find((p) => p.dte === d && p.strike === s);
        const iv = point?.iv;
        if (iv == null || iv <= 0) return null;
        return impliedVolSurfacePointToDecimal(iv);
      })
    );
    z = interpolateSurface(z, strikes, dtes);
    let si = strikes.findIndex((s) => s >= absoluteStrike);
    let di = dtes.findIndex((d) => d >= dteDays);
    if (si <= 0) si = 1;
    if (si >= strikes.length) si = strikes.length - 1;
    if (di <= 0) di = 1;
    if (di >= dtes.length) di = dtes.length - 1;
    const s0 = strikes[si - 1],
      s1 = strikes[si];
    const d0 = dtes[di - 1],
      d1 = dtes[di];
    const z00 = z[di - 1]?.[si - 1],
      z01 = z[di - 1]?.[si];
    const z10 = z[di]?.[si - 1],
      z11 = z[di]?.[si];
    const vals = [z00, z01, z10, z11].filter((v) => v !== null) as number[];
    if (vals.length === 0) return null;
    if (vals.length < 4) return (vals.reduce((a, b) => a + b, 0) / vals.length) * 100;
    const ts = s1 !== s0 ? (absoluteStrike - s0) / (s1 - s0) : 0.5;
    const td = d1 !== d0 ? (dteDays - d0) / (d1 - d0) : 0.5;
    const ivDecimal =
      z00! * (1 - ts) * (1 - td) + z01! * ts * (1 - td) + z10! * (1 - ts) * td + z11! * ts * td;
    return ivDecimal * 100;
  }, []);

  // Per-strike real-time IV from Ticker Peek Pro vol surface when "Use real-time data" is on
  const [realTimeVolByInstrumentId, setRealTimeVolByInstrumentId] = useState<Record<string, number>>({});
  const [tppSurfaceByCommodity, setTppSurfaceByCommodity] = useState<Record<string, SurfacePoint[]>>({});
  const [tppFuturesByCommodity, setTppFuturesByCommodity] = useState<Record<string, FuturesContract[]>>({});
  const [loadingRealTimeVol, setLoadingRealTimeVol] = useState(false);

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
  const [refreshingFuturesFromCurve, setRefreshingFuturesFromCurve] = useState(false);

  // Dialog states for view and edit actions
  const [selectedInstrument, setSelectedInstrument] = useState<HedgingInstrument | null>(null);
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

  // ✅ OPTIMISATION : Force re-calculation when valuation date changes
  useEffect(() => {
    if (instruments.length > 0) {
      // Force re-render to recalculate all Today Prices with new valuation date
      const updatedInstruments = instruments.map(instrument => ({ ...instrument }));
      setInstruments(updatedInstruments);
      
      // Show toast to confirm recalculation
      toast({
        title: "Valuation Date Updated",
        description: `Recalculating prices and MTM for ${instruments.length} instruments as of ${valuationDate}`,
      });
    }
  }, [valuationDate, toast, instruments.length]);

  // ✅ OPTIMISATION : Force re-calculation when market parameters change
  useEffect(() => {
    if (instruments.length > 0) {
      // Force re-render to recalculate all Today Prices and MTM with new market parameters
      const updatedInstruments = instruments.map(instrument => ({ ...instrument }));
      setInstruments(updatedInstruments);
    }
  }, [commodityMarketData, instruments.length]);

  // ✅ Force re-calculation when useRealMarketPrices changes
  useEffect(() => {
    if (instruments.length > 0) {
      console.log(`[🔄 REAL MARKET PRICES] Toggled to ${useRealMarketPrices} - Forcing recalculation of ${instruments.length} instruments`);
      // Force re-render to recalculate all Today Prices with real market prices
      const updatedInstruments = instruments.map(instrument => ({ ...instrument }));
      setInstruments(updatedInstruments);
    }
  }, [useRealMarketPrices, instruments.length]);

  // Load per-strike IV from Ticker Peek Pro vol surface + futures curves when "Use real-time data" is on
  useEffect(() => {
    if (!useRealMarketPrices || instruments.length === 0) {
      setRealTimeVolByInstrumentId({});
      setTppFuturesByCommodity({});
      return;
    }
    let cancelled = false;
    setLoadingRealTimeVol(true);
    const commodities = [...new Set(instruments.map((i) => i.currency).filter(Boolean))];
    const loadSurfacesFuturesAndFillVol = async () => {
      const nextSurfaces: Record<string, SurfacePoint[]> = {};
      const nextFutures: Record<string, FuturesContract[]> = {};
      for (const commodity of commodities) {
        const tppSym = getTppSymbolForCommodity(commodity);
        if (!tppSym || cancelled) continue;
        if (tppSurfaceByCommodity[commodity]?.length) {
          nextSurfaces[commodity] = tppSurfaceByCommodity[commodity];
        } else {
          try {
            const strikesRes = await fetchVolSurfaceStrikes(tppSym, tppSym, 50);
            if (cancelled || !strikesRes.success || !strikesRes.strikes?.length) { /* skip surface */ } else {
              const surfaceRes = await fetchVolSurface(
                tppSym,
                tppSym,
                50,
                false,
                strikesRes.strikes[0],
                strikesRes.strikes[strikesRes.strikes.length - 1]
              );
              if (!cancelled && surfaceRes.success && surfaceRes.surfacePoints?.length)
                nextSurfaces[commodity] = surfaceRes.surfacePoints;
            }
          } catch {
            // skip
          }
        }
        if (tppFuturesByCommodity[commodity]?.length) {
          nextFutures[commodity] = tppFuturesByCommodity[commodity];
        } else {
          try {
            const futuresRes = await fetchFutures(tppSym);
            if (!cancelled && futuresRes.success && futuresRes.data?.length)
              nextFutures[commodity] = futuresRes.data;
          } catch {
            // skip
          }
        }
      }
      if (cancelled) return;
      setTppSurfaceByCommodity((prev) => ({ ...prev, ...nextSurfaces }));
      setTppFuturesByCommodity((prev) => ({ ...prev, ...nextFutures }));
      const byId: Record<string, number> = {};
      for (const inst of instruments) {
        const surface = nextSurfaces[inst.currency] || tppSurfaceByCommodity[inst.currency];
        if (!surface?.length || !inst.maturity) continue;
    const dteDays = getDte(inst.maturity, valuationDate);
        if (dteDays <= 0) continue;
        const curveFwd = getCurrentForwardFromTppCurveInternal(
          nextFutures[inst.currency] || tppFuturesByCommodity[inst.currency],
          getTppSymbolForCommodity(inst.currency),
          inst.maturity,
          valuationDate
        );
        const spot = curveFwd ?? getRealMarketPrice(inst.currency) ?? commodityMarketData[inst.currency]?.spot ?? 75;
        const strike = inst.strike ?? spot;
        const type = inst.type.toLowerCase().includes("put") ? "put" : "call";
        const ivPct = interpolateIVFromSurface(surface, strike, dteDays, type);
        if (ivPct != null) byId[inst.id] = ivPct;
      }
      if (!cancelled) setRealTimeVolByInstrumentId(byId);
      setLoadingRealTimeVol(false);
    };
    loadSurfacesFuturesAndFillVol();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tppSurfaceByCommodity/tppFuturesByCommodity excluded to avoid infinite loop (effect updates them)
  }, [
    useRealMarketPrices,
    instruments,
    valuationDate,
    commodityMarketData,
    getRealMarketPrice,
    interpolateIVFromSurface,
  ]);

  // Courbe construite avec valuation date pour que le forward interpolé corresponde au bon tenor (valuation → maturité)
  function getCurrentForwardFromTppCurveInternal(
    futures: FuturesContract[] | undefined,
    tppSymbol: string | null,
    maturityDate: string,
    valuationDateStr: string
  ): number | null {
    if (!tppSymbol || !futures?.length) return null;
    const refDate = parseValuationDateToLocal(valuationDateStr);
    const curvePoints = getOrBuildCurve(tppSymbol, futures, refDate);
    if (curvePoints.length < 2) return null;
    const dte = getDte(maturityDate, valuationDateStr);
    if (dte < 0) return null;
    return interpolatePrice(curvePoints, dte);
  }

  const getCurrentForwardFromTppCurve = useCallback((
    commodity: string,
    maturityDate: string
  ): number | null => {
    const tppSym = getTppSymbolForCommodity(commodity);
    const futures = tppFuturesByCommodity[commodity];
    return getCurrentForwardFromTppCurveInternal(
      futures,
      tppSym,
      maturityDate,
      valuationDate
    );
  }, [tppFuturesByCommodity, valuationDate]);

  // Forward price affiché dans le formulaire Add Instrument (même logique que colonne Forward Price - Current et calculateTodayPrice)
  const addFormForwardPrice = useMemo((): number | null => {
    if (!addFormSpotPrice || addFormTimeToMaturity <= 0) return null;
    const spot = parseInputNumber(addFormSpotPrice);
    if (spot <= 0) return null;
    if (useTppData && addFormCommodity && tpp.tppFutures.length >= 2) {
      const refDate = new Date();
      const curvePoints = getOrBuildCurve(addFormCommodity, tpp.tppFutures, refDate);
      if (curvePoints.length >= 2) {
        const fromCurve = interpolatePrice(curvePoints, addFormDte);
        if (fromCurve != null && fromCurve > 0) return fromCurve;
      }
    }
    const r = parseInputNumber(addFormInterestRate) / 100;
    return calculateCommodityForwardPrice(spot, r, 0, 0, addFormTimeToMaturity);
  }, [addFormSpotPrice, addFormInterestRate, addFormTimeToMaturity, addFormDte, useTppData, addFormCommodity, tpp.tppFutures]);

  // Theo price / Unit Price (Initial) from Add form – utilise le forward price pour le pricing (même logique que calculateTodayPrice)
  const addFormTheoPrice = useMemo((): number | null => {
    if (!addFormType || !addFormSpotPrice || addFormTimeToMaturity <= 0) return null;
    const spot = parseInputNumber(addFormSpotPrice);
    const r = parseInputNumber(addFormInterestRate) / 100;
    const t = addFormTimeToMaturity; // raw ACT/365.25 TTM
    const sigma = parseInputNumber(addFormVolatility) / 100;
    const strikeVal = parseInputNumber(addFormRate);
    const strike = addFormStrikeType === "percent" ? (spot * strikeVal) / 100 : strikeVal;
    const S = addFormForwardPrice ?? calculateCommodityForwardPrice(spot, r, 0, 0, t);
    const K = strike;
    let mappedType = addFormType.toLowerCase();
    if (mappedType === "forward") return commodityUndiscountedForwardValue(S, K);
    if (mappedType === "vanilla call") mappedType = "call";
    if (mappedType === "vanilla put") mappedType = "put";
    if (mappedType === "call" || mappedType === "put") {
      if (optionPricingModel === "monte-carlo") {
        return clampOptionPriceNonNegative(
          calculateVanillaOptionMonteCarlo(mappedType, S, K, r, r, t, sigma, 1000)
        );
      }
      return clampOptionPriceNonNegative(calculateBlack76Price(mappedType, S, K, r, 0, t, sigma));
    }
    if (mappedType.includes("double")) {
      if (mappedType.includes("call") && (mappedType.includes("knockout") || mappedType.includes("knock-out"))) mappedType = "call-double-knockout";
      else if (mappedType.includes("put") && (mappedType.includes("knockout") || mappedType.includes("knock-out"))) mappedType = "put-double-knockout";
      else if (mappedType.includes("call") && (mappedType.includes("knockin") || mappedType.includes("knock-in"))) mappedType = "call-double-knockin";
      else if (mappedType.includes("put") && (mappedType.includes("knockin") || mappedType.includes("knock-in"))) mappedType = "put-double-knockin";
    } else if (mappedType.includes("knock-out") || mappedType.includes("knockout")) {
      mappedType = mappedType.includes("call") ? "call-knockout" : "put-knockout";
    } else if (mappedType.includes("knock-in") || mappedType.includes("knockin")) {
      mappedType = mappedType.includes("call") ? "call-knockin" : "put-knockin";
    } else if (mappedType.includes("reverse")) {
      if (mappedType.includes("call") && mappedType.includes("knockout")) mappedType = "call-reverse-knockout";
      else if (mappedType.includes("put") && mappedType.includes("knockout")) mappedType = "put-reverse-knockout";
      else if (mappedType.includes("call") && mappedType.includes("knockin")) mappedType = "call-reverse-knockin";
      else if (mappedType.includes("put") && mappedType.includes("knockin")) mappedType = "put-reverse-knockin";
    }
    const bar = addFormBarrier ? parseInputNumber(addFormBarrier) : 0;
    const bar2 = addFormSecondBarrier ? parseInputNumber(addFormSecondBarrier) : undefined;
    const rebate = addFormRebate ? parseInputNumber(addFormRebate, 1) : 1;
    return calculateOptionPrice(mappedType, S, K, r, r, t, sigma, bar, bar2, rebate, barrierOptionSimulations || 1000);
  }, [
    addFormType, addFormSpotPrice, addFormRate, addFormStrikeType, addFormVolatility, addFormInterestRate,
    addFormTimeToMaturity, addFormForwardPrice, addFormBarrier, addFormSecondBarrier, addFormRebate,
    optionPricingModel, barrierOptionSimulations,
  ]);



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
    // ── 1. TTM & DTE ──
    // Raw TTM (ACT/365.25) for pricing, rate, forward — ensures exact match with export
    // DTE (integer days) for IV surface & forward curve interpolation only
    const t = calculateTimeToMaturity(instrument.maturity, valuationDate);
    const dte = getDte(instrument.maturity, valuationDate);
    console.log(`[DEBUG] ${instrument.id}: TODAY PRICE - valuationDate=${valuationDate}, TTM=${t.toFixed(6)}y, DTE=${dte}`);
    
    if (t <= 0) {
      const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { spot: 1.0000, volatility: 20, riskFreeRate: 1.0 };
      
      // ✅ PRIORITÉ : Prix réel du marché si activé > individuel > global
      let spotRate: number;
      if (useRealMarketPrices) {
        const realPrice = getRealMarketPrice(instrument.currency);
        if (realPrice !== null && realPrice > 0) {
          spotRate = realPrice;
          console.log(`[DEBUG] ${instrument.id}: EXPIRED OPTION - Using REAL MARKET PRICE: ${spotRate.toFixed(6)} for ${instrument.currency}`);
        } else {
          spotRate = instrument.impliedSpotPrice || marketData.spot;
        }
      } else {
        spotRate = instrument.impliedSpotPrice || marketData.spot;
      }
      
      const K = instrument.strike || spotRate;
      const ty = instrument.type.toLowerCase();
      return roundPrice6(commodityExpiredSettlementValue(ty, spotRate, K));
    }
    
    // 2. PARAMÈTRES DE MARCHÉ : Utiliser les valeurs CURRENT des données de marché (Commodity)
    const marketData = commodityMarketData[instrument.currency] || getMarketDataFromInstruments(instrument.currency) || { 
      spot: 1.0000, 
      volatility: 20, 
      riskFreeRate: 5.0
    };
    
    const isExportedStrategy = !!(instrument.exportSpotPrice && instrument.exportTimeToMaturity);

    // ── 2a. SPOT ──
    // Priority: real-time market > user individual override > export > market panel
    let spotRate: number;
    if (useRealMarketPrices) {
      const realPrice = getRealMarketPrice(instrument.currency);
      spotRate = (realPrice != null && realPrice > 0)
        ? realPrice
        : (instrument.impliedSpotPrice || (isExportedStrategy ? instrument.exportSpotPrice! : marketData.spot));
    } else {
      spotRate = instrument.impliedSpotPrice
        || (isExportedStrategy ? instrument.exportSpotPrice! : marketData.spot);
    }

    // ── 2b. RATE ──
    // Priority: real-time > export > Strategy Builder storage / Rate Explorer
    const sbRates = readStrategyBuilderPricingFromStorage();
    const getRateForMaturityLikeIndex = (ttmYears: number): number =>
      sbRates.useRealInterestRate && sbRates.pricingCurrencyQuote
        ? getRate(sbRates.pricingCurrencyQuote, ttmYears)
        : strategyBuilderAnnualPercentToDecimal(sbRates.interestRatePercent);

    // Real-time mode: interpolate USD rate at this instrument's TTM (same as Rate Explorer / Strategy Builder curve)
    const r_d = useRealMarketPrices
      ? getRate('USD', t)
      : (isExportedStrategy && instrument.exportDomesticRate != null)
        ? instrument.exportDomesticRate / 100
        : getRateForMaturityLikeIndex(t);

    console.log(`[DEBUG] ${instrument.id}: spot=${spotRate.toFixed(4)}, r_d=${(r_d*100).toFixed(3)}%, DTE=${dte}, TTM=${t.toFixed(6)}y (valuationDate=${valuationDate})`);

    // ── 3. VOLATILITÉ ──
    // Priority: real-time TPP surface > user individual override > export > Pricers / instrument / market
    let sigma: number;
    if (useRealMarketPrices) {
      const surfaceIV = realTimeVolByInstrumentId[instrument.id];
      if (surfaceIV != null && surfaceIV > 0) {
        sigma = surfaceIV / 100;
      } else if (instrument.impliedVolatility != null && instrument.impliedVolatility > 0) {
        sigma = instrument.impliedVolatility / 100;
      } else if (isExportedStrategy && instrument.exportVolatility != null && instrument.exportVolatility > 0) {
        sigma = instrument.exportVolatility / 100;
      } else if (instrument.volatility != null && instrument.volatility > 0) {
        sigma = instrument.volatility / 100;
      } else {
        sigma = (marketData.volatility || 20) / 100;
      }
    } else {
      if (instrument.impliedVolatility != null) {
        sigma = instrument.impliedVolatility / 100;
      } else if (isExportedStrategy && instrument.exportVolatility != null) {
        sigma = instrument.exportVolatility / 100;
      } else {
        const realVol = getRealVolatility();
        if (realVol != null && realVol > 0) sigma = realVol / 100;
        else if (instrument.volatility != null) sigma = instrument.volatility / 100;
        else sigma = (marketData.volatility || 20) / 100;
      }
    }

    // ── 4. FORWARD ──
    // Priority: real-time TPP curve > export (if user hasn't changed spot) > theoretical
    let S: number;
    if (useRealMarketPrices) {
      const fromCurve = getCurrentForwardFromTppCurve(instrument.currency, instrument.maturity);
      if (fromCurve != null && fromCurve > 0) {
        S = fromCurve;
      } else {
        S = calculateCommodityForwardPrice(spotRate, r_d, 0, 0, t);
      }
    } else {
      if (isExportedStrategy && !instrument.impliedSpotPrice && instrument.exportForwardPrice != null && instrument.exportForwardPrice > 0) {
        S = instrument.exportForwardPrice;
      } else {
        S = calculateCommodityForwardPrice(spotRate, r_d, 0, 0, t);
      }
    }

    if (t <= 0) return 0;

    const K = instrument.strike || S;
    
    // Map instrument type to option type pour pricing
    const optionType = instrument.type.toLowerCase();
     
     // Pour les options à barrière, vérifier si le spot actuel a franchi les barrières
     if (optionType.includes('knock') || optionType.includes('barrier')) {
       const barrier = instrument.barrier;
       const secondBarrier = instrument.secondBarrier;
       
       if (barrier) {
         if (secondBarrier) {
           const { lower: lowerBarrier, upper: upperBarrier } = orderedDoubleBarrierLevels(barrier, secondBarrier);
           const spotOutsideRange = spotRate <= lowerBarrier || spotRate >= upperBarrier;
           
           // Pour les double knock-out: si le spot est en dehors des barrières, l'option est déjà knockée
           if (optionType.includes('knock-out') && spotOutsideRange) {
             return 0;
           }
           
           // Pour les double knock-in: si le spot est en dehors des barrières, l'option est activée
           if (optionType.includes('knock-in') && spotOutsideRange) {
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
           
           // Pour les knock-out: si barrière franchie, option knockée
           if (optionType.includes('knock-out') && barrierCrossed) {
             return 0;
           }
           
           // Pour les knock-in: si barrière franchie, option activée
           if (optionType.includes('knock-in') && barrierCrossed) {
             // Continuer avec le pricing normal d'une option vanille
           }
         }
       }
     }
    // ✅ OPTIMISATION : Logs réduits pour améliorer les performances
    
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
      }
    }
    
    // ✅ LOGIQUE DOUBLE BARRIÈRE : Détermination correcte des barrières inférieure et supérieure
    // Même logique que Strategy Builder pour les options double barrière
    // Strategy Builder utilise : L = Math.min(barrier, secondBarrier), U = Math.max(barrier, secondBarrier)
    if (mappedType.includes('double') && calculatedSecondBarrier) {
      const { lower: lowerBarrier, upper: upperBarrier } = orderedDoubleBarrierLevels(
        calculatedBarrier,
        calculatedSecondBarrier
      );
      calculatedBarrier = lowerBarrier;
      calculatedSecondBarrier = upperBarrier;
      
    } else if (mappedType.includes('double') && !calculatedSecondBarrier) {
      console.warn(`[WARNING] ${instrument.id}: Double barrier option detected but secondBarrier is missing`);
    }
    
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
    const bMc = strategyBuilderAnnualPercentToDecimal(sbRates.interestRatePercent);

    // Aligné sur Index.tsx detailedResults : vanille = Black-76 (hors MC) ou MC avec (r, b comme params.interestRate)
    if (mappedType === 'call' || mappedType === 'put') {
      console.log(`[DEBUG] ${instrument.id}: VANILLA OPTION - Black-76 / MC comme Strategy Builder`);
      console.log(`[DEBUG] ${instrument.id}: Parameters - S=${S.toFixed(6)}, K=${K.toFixed(6)}, r=${r_d.toFixed(6)}, bMc=${bMc.toFixed(6)}, t=${t.toFixed(6)}, sigma=${sigma.toFixed(6)}, DTE=${dte}`);
      if (optionPricingModel === 'monte-carlo') {
        price = calculateVanillaOptionMonteCarlo(
          mappedType,
          S,
          K,
          r_d,
          bMc,
          t,
          sigma,
          1000
        );
      } else {
        price = calculateBlack76Price(mappedType, S, K, r_d, 0, t, sigma);
      }
      console.log(`[DEBUG] ${instrument.id}: VANILLA PRICING - Model: ${optionPricingModel}, Price: ${price.toFixed(6)}`);
    } else if (mappedType.includes('knockout') || mappedType.includes('knockin')) {
      if (barrierPricingModel === 'closed-form') {
        price = calculateBarrierOptionClosedForm(
          mappedType,
          S,
          K,
          r_d,
          t,
          sigma,
          calculatedBarrier,
          calculatedSecondBarrier
        );
      } else {
        const mcSteps = barrierMonteCarloNumSteps(t);
        const paths = generateBarrierMonteCarloPathsForPricing({
          initialPrice: S,
          domesticRateDecimal: sbRates.domesticRatePercent / 100,
          foreignRateDecimal: sbRates.foreignRatePercent / 100,
          sigma,
          timeToMaturity: t,
          numSteps: mcSteps,
          numSimulations: 300,
        });
        price = calculatePricesFromPaths(
          mappedType,
          S,
          K,
          r_d,
          mcSteps,
          paths,
          calculatedBarrier,
          calculatedSecondBarrier
        );
      }
      console.log(`[DEBUG] ${instrument.id}: BARRIER PRICING - Type: ${mappedType}, Price: ${price.toFixed(6)}`);
    } else {
      const digitalType = (() => {
        const m = mappedType;
        if (m.includes('double-no-touch')) return 'double-no-touch';
        if (m.includes('double-touch')) return 'double-touch';
        if (m.includes('one-touch')) return 'one-touch';
        if (m.includes('no-touch')) return 'no-touch';
        if (m.includes('range-binary')) return 'range-binary';
        if (m.includes('outside-binary')) return 'outside-binary';
        return m;
      })();
      const underlyingDigital = calculateUnderlyingPrice(
        spotRate,
        r_d,
        sbRates.foreignRatePercent / 100,
        t
      );
      const sigmaDigital =
        (instrument.volatility != null ? instrument.volatility : marketData.volatility) / 100;
      price = calculateDigitalOptionPrice(
        digitalType,
        underlyingDigital.price,
        K,
        r_d,
        t,
        sigmaDigital,
        calculatedBarrier,
        calculatedSecondBarrier,
        10000,
        instrument.rebate || 1
      );
      console.log(`[DEBUG] ${instrument.id}: DIGITAL PRICING - Type: ${digitalType}, Price: ${price.toFixed(6)}`);
    }
    
    console.log(`[DEBUG] ${instrument.id}: STRATEGY BUILDER PRICING RESULT - Calculated: ${price.toFixed(6)}, Export: ${instrument.realOptionPrice || instrument.premium || 'N/A'}, Difference: ${price - (instrument.realOptionPrice || instrument.premium || 0)}`);
    console.log(`[DEBUG] ${instrument.id}: MTM CONSISTENCY CHECK - If no parameters changed, price should equal export price for MTM=0`);
        return roundPrice6(price);
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

  // Refresh TPP futures curve data only. Forward Price - Current is interpolated from this curve (at TTM from valuation date). Spot stays raw.
  const handleRefreshFuturesFromCurve = useCallback(async () => {
    if (instruments.length === 0) {
      toast({ title: "No instruments", description: "Add instruments first.", variant: "destructive" });
      return;
    }
    setRefreshingFuturesFromCurve(true);
    const commodities = [...new Set(instruments.map((i) => i.currency).filter(Boolean))];
    const nextFutures: Record<string, FuturesContract[]> = {};
    try {
      for (const commodity of commodities) {
        const tppSym = getTppSymbolForCommodity(commodity) || commodity.trim();
        if (!tppSym) continue;
        const res = await fetchFutures(tppSym, true);
        if (res.success && res.data?.length) nextFutures[commodity] = res.data;
        else if (res.error) console.warn("[Refresh futures] fetchFutures failed for", tppSym, res.error);
      }
      const count = Object.keys(nextFutures).length;
      if (count > 0) {
        setTppFuturesByCommodity((prev) => ({ ...prev, ...nextFutures }));
        toast({
          title: "Futures curve refresh",
          description: `Curve data refreshed for ${count} commodity(ies). Forward Price - Current is interpolated from this curve (valuation date = ${valuationDate}).`,
        });
      } else {
        const tried = commodities.map((c) => getTppSymbolForCommodity(c) || c).join(", ");
        toast({
          title: "Futures curve refresh",
          description: `No curve data for symbols (${tried}). Open Data Terminal and load data for these commodities, then try again.`,
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Refresh futures from curve:", e);
      toast({ title: "Refresh failed", description: String(e), variant: "destructive" });
    } finally {
      setRefreshingFuturesFromCurve(false);
    }
  }, [instruments, valuationDate]);

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
        description: `Updated prices for ${instruments.length} instruments using Valuation Date ${valuationDate}`,
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

  const handleAddInstrument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormType || !addFormCommodity) {
      toast({
        title: "Missing fields",
        description: "Please select Type and Commodity.",
        variant: "destructive",
      });
      return;
    }
    const pair = CURRENCY_PAIRS.find(p => p.symbol === addFormCommodity);
    const spot = parseInputNumber(addFormSpotPrice, 75.5);
    const strikeVal = parseInputNumber(addFormRate);
    const strike = addFormStrikeType === "percent" ? (spot * strikeVal) / 100 : strikeVal;
    const maturityDate = addFormMaturity || new Date(Date.now() + 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const theo = addFormTheoPrice ?? 0;
    const realPriceVal = addFormRealPrice.trim() !== "" ? parseInputNumber(addFormRealPrice) : null;
    const priceToStore = realPriceVal != null && !Number.isNaN(realPriceVal) ? realPriceVal : theo;
    const newInstrument: HedgingInstrument = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: addFormType,
      currency: addFormCommodity,
      notional: parseInputNumber(addFormNotional, 1000000),
      strike,
      maturity: maturityDate,
      status: "active",
      mtm: 0,
      hedge_accounting: false,
      counterparty: addFormCounterparty || "",
      portfolio: addFormPortfolio || undefined,
      quantity: parseInputNumber(addFormQuantity, 100),
      volatility: addFormVolatility ? parseInputNumber(addFormVolatility) : undefined,
      barrier: addFormBarrier ? parseInputNumber(addFormBarrier) : undefined,
      secondBarrier: addFormSecondBarrier ? parseInputNumber(addFormSecondBarrier) : undefined,
      rebate: addFormRebate ? parseInputNumber(addFormRebate) : undefined,
      premium: priceToStore,
      ...(realPriceVal != null && !Number.isNaN(realPriceVal) ? { realOptionPrice: realPriceVal } : {}),
      impliedSpotPrice: spot,
      exportSpotPrice: spot,
      exportStrike: strike,
      exportForwardPrice: (() => {
        const r = getRate('USD', addFormTimeToMaturity);
        return addFormForwardPrice ?? calculateCommodityForwardPrice(spot, r, 0, 0, addFormTimeToMaturity);
      })(),
      exportDomesticRate: getRate('USD', addFormTimeToMaturity) * 100,
      exportHedgingStartDate: addFormStartDate,
      exportStrategyStartDate: addFormStartDate,
      exportVolatility: addFormVolatility ? parseInputNumber(addFormVolatility) : undefined,
      exportTimeToMaturity: addFormTimeToMaturity,
    };
    importService.addInstrument(newInstrument);
    setInstruments(importService.getHedgingInstruments());
    window.dispatchEvent(new CustomEvent("hedgingInstrumentsUpdated"));
    setIsAddDialogOpen(false);
    setAddFormType("");
    setAddFormCommodity("");
    setAddFormNotional("1000000");
    setAddFormSpotPrice("75.50");
    setAddFormRate("75.50"); // default strike = spot
    setAddFormStrikeType("absolute");
    setAddFormStartDate(new Date().toISOString().split("T")[0]);
    setAddFormMaturity("");
    setAddFormQuantity("100");
    setAddFormVolatility("25");
    setAddFormInterestRate("4.5");
    setAddFormBarrier("");
    setAddFormSecondBarrier("");
    setAddFormBarrierType("percent");
    setAddFormRebate("1");
    setAddFormTimeToPayoff("1");
    setAddFormStorageCost("0");
    setAddFormConvenienceYield("0");
    setAddFormCounterparty("");
    setAddFormPortfolio("");
    setAddFormRealPrice("");
    toast({
      title: "Instrument added",
      description: `${addFormType} on ${pair?.name ?? addFormCommodity} has been added.`,
    });
  };

  const goToInstrumentDetail = (instrument: HedgingInstrument, snapshot: HedgingInstrumentDetailSnapshot) => {
    navigate(`/hedging/instrument/${encodeURIComponent(instrument.id)}`, { state: { snapshot } });
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

  const strategyNameOptions = useMemo(() => {
    const names = instruments
      .map((i) => i.strategyName)
      .filter((s): s is string => typeof s === "string" && s.trim() !== "");
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [instruments]);

  const commodityExposureOptions = useMemo(
    () => [...new Set(instruments.map((i) => i.currency).filter(Boolean))].sort() as string[],
    [instruments]
  );

  // ✅ OPTIMISATION : Memoization des calculs coûteux (tab + portfolio + counterparty + search + strategy + view mode)
  const filteredInstruments = useMemo(() => {
    const q = instrumentSearchQuery.trim().toLowerCase();
    return instruments.filter((instrument) => {
    const isOption = instrument.type.includes("Call") || 
                    instrument.type.includes("Put") || 
                    instrument.type === "Collar" ||
                    instrument.type.includes("Touch") ||
                    instrument.type.includes("Binary") ||
                    instrument.type.includes("Digital") ||
                    instrument.type.includes("Knock");
    
    const matchesInstrumentTypeTab =
      displayView !== "instrument" ||
      (selectedTab === "all" || 
                      (selectedTab === "forwards" && instrument.type === "Forward") ||
                      (selectedTab === "options" && isOption) ||
                      (selectedTab === "swaps" && instrument.type === "Swap") ||
                      (selectedTab === "hedge-accounting" && instrument.hedge_accounting));

    const matchesStrategyViewSegment =
      displayView !== "strategy" ||
      strategyViewSegment === "all" ||
      (instrument.strategyName || "") === strategyViewSegment;

    const matchesExposureViewSegment =
      displayView !== "exposure" ||
      exposureViewSegment === "all" ||
      (instrument.currency || "") === exposureViewSegment;
    
    const matchesPortfolio = !filterByPortfolio || (instrument.portfolio || "") === filterByPortfolio;
    const matchesCounterparty = !filterByCounterparty || (instrument.counterparty || "") === filterByCounterparty;
    const matchesStrategy =
      !filterByStrategy || (instrument.strategyName || "") === filterByStrategy;

    const cpLabel =
      counterparties.find((c) => c.id === instrument.counterparty)?.name || instrument.counterparty || "";
    const pfLabel =
      portfolios.find((p) => p.id === instrument.portfolio)?.name || instrument.portfolio || "";
    const matchesSearch =
      !q ||
      [
        instrument.id,
        instrument.type,
        instrument.currency,
        instrument.counterparty,
        cpLabel,
        instrument.portfolio,
        pfLabel,
        instrument.strategyName,
        instrument.status,
        instrument.maturity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    
    return (
      matchesInstrumentTypeTab &&
      matchesStrategyViewSegment &&
      matchesExposureViewSegment &&
      matchesPortfolio &&
      matchesCounterparty &&
      matchesStrategy &&
      matchesSearch
    );
  });
  }, [
    instruments,
    displayView,
    selectedTab,
    strategyViewSegment,
    exposureViewSegment,
    filterByPortfolio,
    filterByCounterparty,
    filterByStrategy,
    instrumentSearchQuery,
    counterparties,
    portfolios,
  ]);

  // When export columns are shown, we double these groups: TTM, Spot, Vol, Rate, Forward, Strike.
  // Base table has 21 columns; export view adds +6 columns.
  const HEDGING_TABLE_COL_COUNT = showExportColumns ? 27 : 21;

  type HedgingTableDisplayItem =
    | { kind: "group"; key: string; title: string }
    | { kind: "data"; instrument: HedgingInstrument };

  const hedgingTableDisplayItems = useMemo((): HedgingTableDisplayItem[] => {
    if (displayView === "instrument") {
      return filteredInstruments.map((instrument) => ({ kind: "data" as const, instrument }));
    }
    return [];
  }, [displayView, filteredInstruments]);

  type StrategyViewSummary = {
    key: string;
    name: string;
    legs: HedgingInstrument[];
    legCount: number;
    notionalSum: number;
    mtmDollarSum: number;
    payoffGlobal: number;
    exposureLabel: string;
    maturityRange: string;
    legPayoffPoints: { id: string; label: string; mtmDollar: number }[];
  };

  const strategyViewSummaries = useMemo((): StrategyViewSummary[] => {
    if (displayView !== "strategy") return [];
    const map = new Map<string, HedgingInstrument[]>();
    for (const i of filteredInstruments) {
      const label = i.strategyName?.trim() || "(No strategy)";
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(i);
    }
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
    return keys.map((name) => {
      const legs = map.get(name)!;
      let notionalSum = 0;
      let mtmDollarSum = 0;
      let minM: string | null = null;
      let maxM: string | null = null;
      const comms = new Set<string>();
      const legPayoffPoints: { id: string; label: string; mtmDollar: number }[] = [];
      for (const inst of legs) {
        if (inst.currency) comms.add(inst.currency);
        const unitPrice = inst.realOptionPrice || inst.premium || 0;
        const todayPrice = calculateTodayPrice(inst);
        const isExportedStrategy = inst.exportSpotPrice && inst.exportTimeToMaturity;
        const initialPrice = isExportedStrategy ? unitPrice : (inst.premium || 0);
        const quantity = inst.quantity ?? 1;
        const isShort = quantity < 0;
        const mtmValue = isShort ? initialPrice - todayPrice : todayPrice - initialPrice;
        const mtmDollar = mtmValue * Math.abs(inst.notional);
        mtmDollarSum += mtmDollar;
        const volumeToHedge = inst.notional;
        const calculatedNotional = unitPrice * volumeToHedge;
        const displayedNotional = calculatedNotional > 0 ? calculatedNotional : inst.notional;
        notionalSum += displayedNotional;
        const shortLabel =
          inst.id.length > 14 ? `${inst.id.slice(0, 10)}…` : inst.id;
        legPayoffPoints.push({ id: inst.id, label: shortLabel, mtmDollar });
        const m = inst.maturity;
        if (m) {
          if (!minM || m < minM) minM = m;
          if (!maxM || m > maxM) maxM = m;
        }
      }
      const exposureLabel = [...comms].sort().join(", ") || "—";
      const maturityRange =
        minM && maxM ? `Maturity ${minM} → ${maxM}` : minM || maxM ? `Maturity ${minM || maxM}` : "Maturity —";
      return {
        key: name,
        name,
        legs,
        legCount: legs.length,
        notionalSum,
        mtmDollarSum,
        payoffGlobal: mtmDollarSum,
        exposureLabel,
        maturityRange,
        legPayoffPoints,
      };
    });
  }, [displayView, filteredInstruments, valuationDate, commodityMarketData, instruments, useRealMarketPrices, realTimeVolByInstrumentId]);

  type ExposureViewGroup = {
    key: string;
    pairLabel: string;
    currency: string;
    maturity: string;
    directionLabel: string;
    legs: HedgingInstrument[];
    amountSum: number;
    amountUnit: string;
    hedgeRequests: number;
    strategyCount: number;
    legacyNoLink: boolean;
    notionalSum: number;
    targetRate: number | null;
    plRate: number | null;
  };

  const exposureViewGroups = useMemo((): ExposureViewGroup[] => {
    if (displayView !== "exposure") return [];
    const map = new Map<string, HedgingInstrument[]>();
    for (const i of filteredInstruments) {
      const cur = i.currency?.trim() || "—";
      const mat = i.maturity?.trim() || "—";
      const vt = i.volumeType ?? "__none__";
      const groupKey = `${cur}::${mat}::${vt}`;
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push(i);
    }
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
    const out: ExposureViewGroup[] = [];
    for (const groupKey of keys) {
      const legs = map.get(groupKey)!;
      const first = legs[0];
      const cur = first.currency?.trim() || "—";
      const mat = first.maturity?.trim() || "—";
      const pairLabel = formatExposurePairLabel(cur);
      const pairMeta = CURRENCY_PAIRS.find((x) => x.symbol === cur);
      const amountUnit = pairMeta?.base || cur;
      const directionLabel = formatExposureDirection(first.volumeType);
      let amountSum = 0;
      let notionalSum = 0;
      const stratNames = new Set<string>();
      let legacyNoLink = false;
      for (const inst of legs) {
        const ev = inst.exposureVolume ?? inst.rawVolume;
        if (ev != null && Number.isFinite(ev)) amountSum += ev;
        else if (inst.notional != null && Number.isFinite(inst.notional)) amountSum += inst.notional;
        if (inst.strategyName?.trim()) stratNames.add(inst.strategyName.trim());
        if (!inst.periodDate?.trim()) legacyNoLink = true;
        // Same as main table "Notional" column: volume (not premium × volume).
        notionalSum += inst.notional ?? 0;
      }
      const forwards = averageFinite(
        legs.map((l) => (l.exportForwardPrice != null && l.exportForwardPrice > 0 ? l.exportForwardPrice : l.forwardPrice))
      );
      const spots = averageFinite(legs.map((l) => l.impliedSpotPrice ?? l.exportSpotPrice));
      const targetRate = forwards;
      const plRate = spots;
      out.push({
        key: groupKey,
        pairLabel,
        currency: cur,
        maturity: mat,
        directionLabel,
        legs: [...legs].sort((a, b) => {
          const s = (a.strategyName || "").localeCompare(b.strategyName || "");
          if (s !== 0) return s;
          return a.id.localeCompare(b.id);
        }),
        amountSum,
        amountUnit,
        hedgeRequests: 0,
        strategyCount: stratNames.size,
        legacyNoLink,
        notionalSum,
        targetRate,
        plRate,
      });
    }
    out.sort((a, b) => {
      const p = a.pairLabel.localeCompare(b.pairLabel);
      if (p !== 0) return p;
      const m = a.maturity.localeCompare(b.maturity);
      if (m !== 0) return m;
      return a.directionLabel.localeCompare(b.directionLabel);
    });
    return out;
  }, [displayView, filteredInstruments]);

  /** Strategy Builder–style payoff diagram when "Show payoff" is opened (same pipeline as Index `calculatePayoff`). */
  const strategyPayoffChartModel = useMemo(() => {
    if (strategyPayoffDialogKey == null) return null;
    const summary = strategyViewSummaries.find((s) => s.key === strategyPayoffDialogKey);
    if (!summary || summary.legs.length === 0) return null;
    const strategy = hedgingLegsToStrategyComponents(summary.legs);
    const sb = readStrategyBuilderPricingFromStorage();
    const sigmaFromStrategy =
      strategy.reduce((s, o) => s + o.volatility, 0) / Math.max(strategy.length, 1) / 100;

    const impliedSpots = summary.legs
      .map((l) => l.impliedSpotPrice)
      .filter((x): x is number => x != null && Number.isFinite(x) && x > 0);
    const exportSpots = summary.legs
      .map((l) => l.exportSpotPrice)
      .filter((x): x is number => x != null && Number.isFinite(x) && x > 0);
    const spotPriceValuation =
      impliedSpots.length > 0
        ? impliedSpots.reduce((a, b) => a + b, 0) / impliedSpots.length
        : exportSpots.length > 0
          ? exportSpots.reduce((a, b) => a + b, 0) / exportSpots.length
          : summary.legs[0].impliedSpotPrice ?? summary.legs[0].exportSpotPrice ?? 1;

    const payoffData = buildPayoffDiagramDataLikeStrategyBuilder(strategy, {
      spotPrice: spotPriceValuation,
      domesticRatePercent: sb.domesticRatePercent,
      foreignRatePercent: sb.foreignRatePercent,
      interestRatePercent: sb.interestRatePercent,
      sigmaDecimal: sigmaFromStrategy,
      optionPricingModel,
    });

    const exportDomestics = summary.legs
      .map((l) => l.exportDomesticRate)
      .filter((x): x is number => x != null && Number.isFinite(x));
    const exportForeigns = summary.legs
      .map((l) => l.exportForeignRate)
      .filter((x): x is number => x != null && Number.isFinite(x));
    const exportVols = summary.legs
      .map((l) => l.exportVolatility)
      .filter((x): x is number => x != null && Number.isFinite(x) && x > 0);

    const spotExportAvg =
      exportSpots.length > 0
        ? exportSpots.reduce((a, b) => a + b, 0) / exportSpots.length
        : spotPriceValuation;

    const exportPayoffData = buildPayoffDiagramDataLikeStrategyBuilder(strategy, {
      spotPrice: spotExportAvg,
      domesticRatePercent:
        exportDomestics.length > 0
          ? exportDomestics.reduce((a, b) => a + b, 0) / exportDomestics.length
          : sb.domesticRatePercent,
      foreignRatePercent:
        exportForeigns.length > 0
          ? exportForeigns.reduce((a, b) => a + b, 0) / exportForeigns.length
          : sb.foreignRatePercent,
      interestRatePercent: sb.interestRatePercent,
      sigmaDecimal:
        exportVols.length > 0
          ? exportVols.reduce((a, b) => a + b, 0) / exportVols.length / 100
          : sigmaFromStrategy,
      optionPricingModel,
    });

    const firstSym = summary.legs[0]?.currency ?? "—";
    const currencyPair =
      CURRENCY_PAIRS.find((p) => p.symbol === firstSym) ?? {
        symbol: firstSym,
        name: firstSym,
        base: "",
        quote: "USD",
        category: "energy" as const,
        defaultSpotRate: spotPriceValuation,
      };
    return {
      payoffData,
      exportPayoffData,
      spot: spotPriceValuation,
      spotExport: exportSpots.length > 0 ? spotExportAvg : spotPriceValuation,
      strategy,
      currencyPair,
      title: summary.name,
    };
  }, [strategyPayoffDialogKey, strategyViewSummaries, optionPricingModel]);

  // ✅ OPTIMISATION : Memoization des calculs de résumé
  const totalNotional = useMemo(() => {
    return instruments.reduce((sum, inst) => {
    const quantityToHedge = inst.quantity || 0;
    const unitPrice = inst.realOptionPrice || inst.premium || 0;
    const volumeToHedge = inst.notional;
    const calculatedNotional = unitPrice * volumeToHedge;
    const displayedNotional = calculatedNotional > 0 ? calculatedNotional : inst.notional;
    return sum + displayedNotional;
  }, 0);
  }, [instruments]);
  
  // ✅ OPTIMISATION : Memoization du calcul MTM total
  const totalMTM = useMemo(() => {
    return instruments.reduce((sum, inst) => {
    // Important: avoid transient MTM=0 right after import while commodityMarketData is still initializing.
    // We intentionally do NOT early-return when market data is missing; calculateTodayPrice already
    // falls back to export-derived parameters via getMarketDataFromInstruments().
    const _marketData = commodityMarketData[inst.currency] ?? getMarketDataFromInstruments(inst.currency);
    
    const originalPrice = inst.realOptionPrice || inst.premium || 0;
    const isExportedStrategy = inst.exportSpotPrice && inst.exportTimeToMaturity;
    const initialPrice = isExportedStrategy ? originalPrice : (inst.premium || 0);
    const todayPrice = calculateTodayPrice(inst);
    const quantity = inst.quantity || 1;
    const isShort = quantity < 0;
    
      const mtmValue = isShort 
        ? initialPrice - todayPrice 
        : todayPrice - initialPrice;
    
    return sum + (mtmValue * Math.abs(inst.notional));
  }, 0);
  }, [instruments, commodityMarketData, valuationDate]);
  
  const hedgeAccountingCount = useMemo(() => {
    return instruments.filter(inst => inst.hedge_accounting).length;
  }, [instruments]);
  
  // ✅ OPTIMISATION : Memoization des commodities uniques
  const uniqueCommodities = useMemo(() => {
    return getUniqueCommodities(instruments);
  }, [instruments]);

  const renderHedgingInstrumentTableRow = (instrument: HedgingInstrument) => {
    const quantityToHedge = instrument.quantity || 0;
    const unitPrice = instrument.realOptionPrice || instrument.premium || 0;
    const todayPrice = calculateTodayPrice(instrument);
    const isExportedStrategy = instrument.exportSpotPrice && instrument.exportTimeToMaturity;
    const initialPrice = isExportedStrategy ? unitPrice : (instrument.premium || 0);
    const isShort = quantityToHedge < 0;
    let mtmValue: number;
    if (isShort) {
      mtmValue = initialPrice - todayPrice;
    } else {
      mtmValue = todayPrice - initialPrice;
    }
    const dteDisplay = instrument.maturity ? getDte(instrument.maturity, valuationDate) : 0;
    const timeToMaturity = instrument.maturity ? calculateTimeToMaturity(instrument.maturity, valuationDate) : 0;
    const volumeToHedge = instrument.notional;
    const calculatedNotional = unitPrice * volumeToHedge;
    const pricingModelLabel = getPricingModelLabel(instrument, optionPricingModel);
    const mdRow =
      commodityMarketData[instrument.currency] ||
      getMarketDataFromInstruments(instrument.currency) || { spot: 1, volatility: 20, riskFreeRate: 1 };
    const isExpRow = !!(instrument.exportSpotPrice && instrument.exportTimeToMaturity);
    let spotDisplay = 0;
    let spotIsReal = false;
    if (useRealMarketPrices) {
      const realPrice = getRealMarketPrice(instrument.currency);
      if (realPrice !== null && realPrice > 0) {
        spotDisplay = realPrice;
        spotIsReal = true;
      } else {
        spotDisplay = instrument.impliedSpotPrice ?? mdRow.spot;
      }
    } else {
      spotDisplay = instrument.impliedSpotPrice ?? mdRow.spot;
    }
    let volPctRow: number | null = null;
    let volSourceRow = "";
    if (useRealMarketPrices) {
      const surfaceIV = realTimeVolByInstrumentId[instrument.id];
      if (surfaceIV != null && surfaceIV > 0) {
        volPctRow = surfaceIV;
        volSourceRow = "TPP surface";
      } else if (instrument.impliedVolatility != null && instrument.impliedVolatility > 0) {
        volPctRow = instrument.impliedVolatility;
        volSourceRow = "Individual";
      } else if (isExpRow && instrument.exportVolatility != null && instrument.exportVolatility > 0) {
        volPctRow = instrument.exportVolatility;
        volSourceRow = "Export";
      } else if (instrument.volatility != null && instrument.volatility > 0) {
        volPctRow = instrument.volatility;
        volSourceRow = "Instrument";
      } else {
        volPctRow = mdRow.volatility || 20;
        volSourceRow = "Market";
      }
    } else {
      if (instrument.impliedVolatility != null) {
        volPctRow = instrument.impliedVolatility;
        volSourceRow = "Individual";
      } else if (isExpRow && instrument.exportVolatility != null) {
        volPctRow = instrument.exportVolatility;
        volSourceRow = "Export";
      } else {
        const realVol = getRealVolatility();
        if (realVol != null && realVol > 0) {
          volPctRow = realVol;
          volSourceRow = "Pricers";
        } else if (instrument.volatility != null) {
          volPctRow = instrument.volatility;
          volSourceRow = "Instrument";
        } else {
          volPctRow = mdRow.volatility || 20;
          volSourceRow = "Market";
        }
      }
    }
    const rawTtmRow = timeToMaturity;
    let ratePctRow = 0;
    let rateSourceRow = "";
    if (useRealMarketPrices) {
      const rd = getRate("USD", rawTtmRow);
      ratePctRow = rd * 100;
      rateSourceRow = isCurveMode ? "Rate Explorer" : "Fixed (USD)";
    } else if (isExpRow && instrument.exportDomesticRate != null) {
      ratePctRow = instrument.exportDomesticRate;
      rateSourceRow = "Export";
    } else {
      const sbR = readStrategyBuilderPricingFromStorage();
      const rd =
        sbR.useRealInterestRate && sbR.pricingCurrencyQuote
          ? getRate(sbR.pricingCurrencyQuote, rawTtmRow)
          : strategyBuilderAnnualPercentToDecimal(sbR.interestRatePercent);
      ratePctRow = rd * 100;
      rateSourceRow = sbR.useRealInterestRate ? "Rate Explorer" : "SB param";
    }
    const mdFwd =
      commodityMarketData[instrument.currency] ||
      getMarketDataFromInstruments(instrument.currency) || { spot: 1, volatility: 20, riskFreeRate: 2 };
    const sbRFwd = readStrategyBuilderPricingFromStorage();
    const rdFwd = useRealMarketPrices
      ? getRate("USD", rawTtmRow)
      : isExpRow && instrument.exportDomesticRate != null
        ? instrument.exportDomesticRate / 100
        : sbRFwd.useRealInterestRate && sbRFwd.pricingCurrencyQuote
          ? getRate(sbRFwd.pricingCurrencyQuote, rawTtmRow)
          : strategyBuilderAnnualPercentToDecimal(sbRFwd.interestRatePercent);
    const currentSpotFwd = useRealMarketPrices
      ? (() => {
          const rp = getRealMarketPrice(instrument.currency);
          return rp != null && rp > 0
            ? rp
            : instrument.impliedSpotPrice || (isExpRow ? instrument.exportSpotPrice! : mdFwd.spot);
        })()
      : instrument.impliedSpotPrice || (isExpRow ? instrument.exportSpotPrice! : mdFwd.spot);
    let forwardVal = 0;
    let forwardSourceRow = "";
    if (useRealMarketPrices) {
      const fromCurve = getCurrentForwardFromTppCurve(instrument.currency, instrument.maturity);
      if (fromCurve != null && fromCurve > 0) {
        forwardVal = fromCurve;
        forwardSourceRow = "TPP curve";
      } else {
        forwardVal = calculateCommodityForwardPrice(currentSpotFwd, rdFwd, 0, 0, rawTtmRow);
        forwardSourceRow = "Theoretical";
      }
    } else if (
      isExpRow &&
      !instrument.impliedSpotPrice &&
      instrument.exportForwardPrice != null &&
      instrument.exportForwardPrice > 0
    ) {
      forwardVal = instrument.exportForwardPrice;
      forwardSourceRow = "Export";
    } else {
      forwardVal = calculateCommodityForwardPrice(currentSpotFwd, rdFwd, 0, 0, rawTtmRow);
      forwardSourceRow = "Theoretical";
    }
    const exportStartSnap = instrument.exportHedgingStartDate || instrument.exportStrategyStartDate;
    const exportTtmSnap = exportStartSnap
      ? calculateTimeToMaturity(instrument.maturity, exportStartSnap)
      : instrument.exportTimeToMaturity ?? 0;
    const exportDteSnap = daysToMaturityFromYearsAct36525(exportTtmSnap);
    const exportSpotSnap =
      instrument.exportSpotPrice != null && Number.isFinite(instrument.exportSpotPrice) ? instrument.exportSpotPrice : null;
    const exportVolSnap =
      instrument.exportVolatility != null && Number.isFinite(instrument.exportVolatility) ? instrument.exportVolatility : null;
    const exportRateSnap =
      instrument.exportDomesticRate != null && Number.isFinite(instrument.exportDomesticRate) ? instrument.exportDomesticRate : null;
    const exportForwardSnap =
      instrument.exportForwardPrice != null && Number.isFinite(instrument.exportForwardPrice) ? instrument.exportForwardPrice : null;
    const exportStrikeSnap =
      instrument.exportStrike != null && Number.isFinite(instrument.exportStrike)
        ? instrument.exportStrike
        : instrument.originalComponent && exportSpotSnap != null
          ? (instrument.originalComponent.strikeType === "percent"
              ? exportSpotSnap * (instrument.originalComponent.strike / 100)
              : instrument.originalComponent.strike)
          : null;
    const detailSnapshot: HedgingInstrumentDetailSnapshot = {
      valuationDate,
      todayPrice,
      mtmValue,
      unitPrice,
      initialPrice,
      isExportedStrategy: !!isExportedStrategy,
      timeToMaturityYears: timeToMaturity,
      dteDays: dteDisplay,
      pricingModelLabel,
      spotDisplay,
      spotIsReal,
      volPct: volPctRow,
      volSource: volSourceRow,
      ratePct: ratePctRow,
      rateSource: rateSourceRow,
      forward: forwardVal,
      forwardSource: forwardSourceRow,
      exportTtmYears: exportTtmSnap > 0 || instrument.exportTimeToMaturity != null ? exportTtmSnap : undefined,
      exportDteDays: exportDteSnap,
    };
    const displayMtm = roundPrice4(mtmValue);
    const mtmStr = displayMtm === 0 ? "0.0000" : (displayMtm >= 0 ? "+" : "") + displayMtm.toFixed(4);
    return (
      <TableRow
        key={instrument.id}
        className="hover:bg-muted/50 dark:hover:bg-muted/30 border-b border-border transition-colors cursor-pointer"
        onClick={() => goToInstrumentDetail(instrument, detailSnapshot)}
      >
        <TableCell
          className="font-mono text-xs bg-muted/30 border-r text-center sticky left-0 z-[1] shadow-sm max-w-[92px] truncate"
          title={instrument.id}
        >
          {instrument.id.length > 14 ? `${instrument.id.slice(0, 12)}…` : instrument.id}
        </TableCell>
        <TableCell className="border-r">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted/50">{getInstrumentIcon(instrument.type)}</div>
            <span className="font-medium text-sm">{instrument.type}</span>
          </div>
        </TableCell>
        <TableCell className="text-center border-r">
          <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
            {instrument.currency}
          </Badge>
        </TableCell>
        <TableCell className="text-center font-mono text-sm border-r">{quantityToHedge.toFixed(1)}%</TableCell>
        <TableCell className="text-right font-mono text-sm border-r">
          {unitPrice > 0 ? unitPrice.toFixed(4) : <span className="text-muted-foreground">N/A</span>}
        </TableCell>
        <TableCell className="text-right font-mono text-sm border-r text-blue-600">
          {todayPrice !== 0 ? todayPrice.toFixed(4) : "N/A"}
        </TableCell>
        <TableCell
          className={`text-right font-mono text-sm border-r ${
            mtmValue >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {mtmStr}
        </TableCell>
        {showExportColumns ? (
          <>
            {/* TTM - Export */}
            <TableCell className="text-center font-mono text-xs border-r text-blue-600">
              {exportTtmSnap > 0 || instrument.exportTimeToMaturity != null ? (
                <span>
                  {exportTtmSnap.toFixed(2)}y · {exportDteSnap.toFixed(0)}d
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            {/* TTM - Current */}
            <TableCell className="text-center font-mono text-xs border-r text-green-700 dark:text-green-400">
              {timeToMaturity === 0 ? (
                <span className="text-destructive">Expired</span>
              ) : (
                <span>
                  {timeToMaturity.toFixed(2)}y · {dteDisplay}d
                </span>
              )}
            </TableCell>

            {/* Spot - Export */}
            <TableCell className="text-right font-mono text-xs border-r text-blue-600">
              {exportSpotSnap != null ? exportSpotSnap.toFixed(4) : "—"}
            </TableCell>
            {/* Spot - Current */}
            <TableCell className="text-right font-mono text-xs border-r text-green-700 dark:text-green-400">
              {spotDisplay.toFixed(4)}
            </TableCell>

            {/* Vol - Export */}
            <TableCell className="text-right font-mono text-xs border-r text-blue-600">
              {exportVolSnap != null ? `${exportVolSnap.toFixed(1)}%` : "—"}
            </TableCell>
            {/* Vol - Current */}
            <TableCell className="text-right font-mono text-xs border-r text-green-700 dark:text-green-400">
              {volPctRow != null ? `${volPctRow.toFixed(1)}%` : "—"}
            </TableCell>

            {/* Rate - Export */}
            <TableCell className="text-right font-mono text-xs border-r text-blue-600">
              {exportRateSnap != null ? `${exportRateSnap.toFixed(2)}%` : "—"}
            </TableCell>
            {/* Rate - Current */}
            <TableCell className="text-right font-mono text-xs border-r text-green-700 dark:text-green-400">
              {ratePctRow.toFixed(2)}%
            </TableCell>

            {/* Forward - Export */}
            <TableCell className="text-right font-mono text-xs border-r text-blue-600">
              {exportForwardSnap != null ? exportForwardSnap.toFixed(4) : "—"}
            </TableCell>
            {/* Forward - Current */}
            <TableCell className="text-right font-mono text-xs border-r text-green-700 dark:text-green-400">
              {forwardVal.toFixed(4)}
            </TableCell>

            {/* Strike - Export */}
            <TableCell className="text-right font-mono text-xs border-r text-blue-600">
              {exportStrikeSnap != null ? exportStrikeSnap.toFixed(4) : "—"}
            </TableCell>
            {/* Strike - Current */}
            <TableCell className="text-right font-mono text-xs border-r text-green-700 dark:text-green-400">
              {instrument.strike != null ? instrument.strike.toFixed(4) : "N/A"}
            </TableCell>
          </>
        ) : (
          <>
            <TableCell className="text-center font-mono text-xs border-r">
              {timeToMaturity === 0 ? (
                <span className="text-destructive">Expired</span>
              ) : (
                <span>
                  {timeToMaturity.toFixed(2)}y · {dteDisplay}d
                </span>
              )}
            </TableCell>
            <TableCell className="text-right font-mono text-xs border-r">{spotDisplay.toFixed(4)}</TableCell>
            <TableCell className="text-right font-mono text-xs border-r">
              {volPctRow != null ? `${volPctRow.toFixed(1)}%` : "—"}
            </TableCell>
            <TableCell className="text-right font-mono text-xs border-r">{ratePctRow.toFixed(2)}%</TableCell>
            <TableCell className="text-right font-mono text-xs border-r">{forwardVal.toFixed(4)}</TableCell>
            <TableCell className="text-right font-mono text-xs border-r">
              {instrument.strike != null ? instrument.strike.toFixed(4) : "N/A"}
            </TableCell>
          </>
        )}
        <TableCell className="text-right font-mono text-xs border-r">
          {instrument.barrier != null ? instrument.barrier.toFixed(2) : "—"}
        </TableCell>
        <TableCell className="text-right font-mono text-xs border-r">
          {instrument.secondBarrier != null ? instrument.secondBarrier.toFixed(2) : "—"}
        </TableCell>
        <TableCell className="text-right font-mono text-xs border-r">
          {instrument.rebate != null ? instrument.rebate.toFixed(1) : "—"}
        </TableCell>
        <TableCell className="text-right font-mono text-xs border-r">{formatCurrency(volumeToHedge)}</TableCell>
        <TableCell className="text-right font-mono text-xs border-r">
          {calculatedNotional > 0 ? formatCurrency(calculatedNotional) : formatCurrency(instrument.notional)}
        </TableCell>
        <TableCell className="font-mono text-xs border-r whitespace-nowrap">{instrument.maturity}</TableCell>
        <TableCell className="border-r">{getStatusBadge(timeToMaturity === 0 ? "matured" : (instrument.status || "active").toLowerCase())}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Details"
              onClick={() => goToInstrumentDetail(instrument, detailSnapshot)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Edit"
              onClick={() => editInstrument(instrument)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Delete"
              onClick={() => deleteInstrument(instrument.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

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
            Configure market parameters for Mark-to-Market calculations using Valuation Date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* ✅ Valuation Date - Unique date for pricing */}
            <div className="grid gap-4 md:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="valuation-date">Valuation Date</Label>
                <Input
                  id="valuation-date"
                  type="date"
                  value={valuationDate}
                  onChange={(e) => setValuationDate(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Date used for pricing and MTM calculations</p>
              </div>
            </div>
            
            {/* ✅ Use Real Market Data (Spot, Vol, Risk-Free Rate) – same as Pricers */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="use-real-prices" className="text-sm font-medium">
                  Use real-time data (Spot, Vol, Risk-free rate)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Spot from Commodity Market · Volatility from Pricers · Risk-free rate from Rate Explorer (Bank Rate USD). Same sources as Pricers.
                </p>
              </div>
              <Switch
                id="use-real-prices"
                checked={useRealMarketPrices}
                onCheckedChange={(checked) => {
                  setUseRealMarketPrices(checked);
                  localStorage.setItem('hedgingInstruments_useRealMarketPrices', checked.toString());
                  // Force recalculation when toggled
                  if (instruments.length > 0) {
                    setInstruments([...instruments]);
                  }
                  toast({
                    title: checked ? "Real Market Prices Enabled" : "Real Market Prices Disabled",
                    description: checked 
                      ? "Using live prices from Commodity Market for pricing"
                      : "Using manual prices for pricing",
                  });
                }}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>&nbsp;</Label>
              <div className="flex flex-wrap gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  disabled={refreshingFuturesFromCurve || instruments.length === 0}
                  onClick={handleRefreshFuturesFromCurve}
                  title="For each instrument, fetch the futures curve for its commodity and set Current price to the interpolated futures price at the instrument's time to maturity."
                >
                  {refreshingFuturesFromCurve ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh futures from futures curve
                </Button>
              </div>
            </div>

            {/* Market Data per Commodity */}
            {uniqueCommodities.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Market Parameters by Commodity ({uniqueCommodities.length} commodities found)
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
                {uniqueCommodities.map((commodity) => {
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
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applyDefaultDataForCommodity(commodity)}
                            className="text-xs"
                          >
                            Reset to Default
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                          <Label htmlFor={`spot-${commodity}`} className="text-xs">Spot Price</Label>
                            {useRealMarketPrices && getRealMarketPrice(commodity) !== null && (
                              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                Real Market
                              </Badge>
                            )}
                          </div>
                          <Input
                            id={`spot-${commodity}`}
                            type="number"
                            step="0.0001"
                            value={useRealMarketPrices && getRealMarketPrice(commodity) !== null 
                              ? (getRealMarketPrice(commodity) || data.spot)
                              : data.spot}
                            onChange={(e) => {
                              if (!useRealMarketPrices) {
                                updateCommodityMarketData(commodity, 'spot', parseFloat(e.target.value) || data.spot);
                              }
                            }}
                            disabled={useRealMarketPrices && getRealMarketPrice(commodity) !== null}
                            className={`font-mono text-sm ${useRealMarketPrices && getRealMarketPrice(commodity) !== null ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : ''}`}
                            placeholder="75.50"
                          />
                          {useRealMarketPrices && getRealMarketPrice(commodity) !== null && (
                            <p className="text-xs text-green-600">Using live price from Commodity Market</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`vol-${commodity}`} className="text-xs">Volatility (%)</Label>
                            {useRealMarketPrices && getRealVolatility() !== null && (
                              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                From Pricers
                              </Badge>
                            )}
                          </div>
                          <Input
                            id={`vol-${commodity}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={useRealMarketPrices && getRealVolatility() !== null ? getRealVolatility()! : data.volatility}
                            onChange={(e) => {
                              if (!useRealMarketPrices || getRealVolatility() === null)
                                updateCommodityMarketData(commodity, 'volatility', parseFloat(e.target.value) || data.volatility);
                            }}
                            disabled={useRealMarketPrices && getRealVolatility() !== null}
                            className={`font-mono text-sm ${useRealMarketPrices && getRealVolatility() !== null ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : ''}`}
                            placeholder="25"
                          />
                          {useRealMarketPrices && getRealVolatility() !== null && (
                            <p className="text-xs text-green-600 dark:text-green-400">Using volatility from Pricers (calculatorState)</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`risk-${commodity}`} className="text-xs">Risk-Free Rate (%)</Label>
                            {useRealMarketPrices && (
                              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                {isCurveMode ? "Curve (Rate Explorer)" : "Fixed (USD)"}
                              </Badge>
                            )}
                          </div>
                          <Input
                            id={`risk-${commodity}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max="20"
                            value={useRealMarketPrices ? usdRate1YDisplayPct : data.riskFreeRate}
                            onChange={(e) => {
                              if (!useRealMarketPrices)
                                updateCommodityMarketData(commodity, 'riskFreeRate', parseFloat(e.target.value) || data.riskFreeRate);
                            }}
                            disabled={useRealMarketPrices}
                            className={`font-mono text-sm ${useRealMarketPrices ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : ''}`}
                            placeholder="5.0"
                          />
                          {useRealMarketPrices && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              1Y USD reference from Rate Explorer settings; each row uses the rate at its own TTM.
                            </p>
                          )}
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

      {/* Individual Spot Price Overrides Summary */}
      {instruments.some(inst => inst.impliedSpotPrice) && (
        <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowExportColumns((p) => {
                    const next = !p;
                    try {
                      localStorage.setItem("hedgingInstruments_showExportColumns", JSON.stringify(next));
                    } catch {}
                    return next;
                  });
                }}
                title="Toggle export vs current columns"
              >
                <Download className="h-4 w-4 mr-2" />
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
              <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Commodity Hedging Instrument</DialogTitle>
                  <DialogDescription>
                    Create a new commodity hedging instrument entry. Same inputs as Pricers.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddInstrument} className="flex flex-col min-h-0">
                  <div className="grid gap-4 py-4 overflow-y-auto pr-1 space-y-4">
                    {/* Ticker Peek Pro Toggle */}
                    <div className={`p-2.5 rounded-lg border ${useTppData ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' : 'bg-muted/30 border-border'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={useTppData}
                            onCheckedChange={(checked) => {
                              setUseTppData(checked);
                              localStorage.setItem('hedgingUseTickerPeekPro', JSON.stringify(checked));
                            }}
                          />
                          <label className="text-sm font-medium text-foreground cursor-pointer" onClick={() => {
                            const next = !useTppData;
                            setUseTppData(next);
                            localStorage.setItem('hedgingUseTickerPeekPro', JSON.stringify(next));
                          }}>
                            Use Data from Data Terminal
                          </label>
                        </div>
                        {useTppData && (
                          <span className="text-xs text-muted-foreground">
                            {tpp.tppLoadingCurrencies ? 'Loading...' : `${tpp.tppCurrencies.length} instruments`}
                          </span>
                        )}
                      </div>
                      {useTppData && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Spot = interpolated futures price at maturity, Vol = interpolated from IV Matrix, Rate = {isCurveMode ? 'Yield Curve (Bootstrapped)' : 'Bank Rate'}.
                          </p>
                          {tpp.tppLoadingFutures && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Loading futures curve...
                            </p>
                          )}
                          {!tpp.tppLoadingFutures && tpp.tppFutures.length > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Futures curve ready ({tpp.tppFutures.length} contracts)
                            </p>
                          )}
                          {tpp.tppLoadingSurface && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Building IV surface...
                            </p>
                          )}
                          {!tpp.tppLoadingSurface && tpp.tppSurfacePoints.length > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              IV Surface ready ({tpp.tppSurfacePoints.length} pts)
                            </p>
                          )}
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Risk-free rate from {isCurveMode ? 'Rate Explorer (Yield Curve)' : 'Bank Rate USD'}: {getInterestRateForPricing.toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Type</Label>
                      <Select value={addFormType} onValueChange={setAddFormType}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select instrument type" />
                        </SelectTrigger>
                        <SelectContent>
                          {HEDGING_INSTRUMENT_TYPES.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Commodity</Label>
                      <Select 
                        value={addFormCommodity} 
                        onValueChange={setAddFormCommodity}
                        disabled={useTppData && tpp.tppLoadingCurrencies}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder={
                            useTppData && tpp.tppLoadingCurrencies ? "Loading TPP instruments..." : "Select commodity"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {useTppData ? (
                            <>
                              <div className="p-2 border-b sticky top-0 bg-background z-10">
                                <Input
                                  placeholder="Search commodities..."
                                  value={tppSearchQuery}
                                  onChange={(e) => setTppSearchQuery(e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              {(() => {
                                const searchLower = tppSearchQuery.toLowerCase().trim();
                                const categoryConfig = [
                                  { key: 'energies', label: 'Energies' },
                                  { key: 'metals', label: 'Metals' },
                                  { key: 'grains', label: 'Grains' },
                                  { key: 'livestock', label: 'Livestock' },
                                ];
                                const groups = categoryConfig.map(cat => {
                                  const items = tpp.tppCurrenciesByCategory[cat.key] || [];
                                  const filtered = searchLower
                                    ? items.filter(c =>
                                        c.symbol.toLowerCase().includes(searchLower) ||
                                        c.name.toLowerCase().includes(searchLower)
                                      )
                                    : items;
                                  return { ...cat, items: filtered };
                                }).filter(g => g.items.length > 0);
                                return groups.map(group => (
                                  <SelectGroup key={group.key}>
                                    <SelectLabel className="text-xs text-muted-foreground">{group.label}</SelectLabel>
                                    {group.items.map(c => (
                                      <SelectItem key={c.symbol} value={c.symbol}>
                                        {c.symbol} — {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ));
                              })()}
                            </>
                          ) : (
                            CURRENCY_PAIRS.map((pair) => (
                              <SelectItem key={pair.symbol} value={pair.symbol}>{pair.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t pt-3 mt-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Dates</p>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Start Date</Label>
                          <Input type="date" className="col-span-3" value={addFormStartDate} onChange={(e) => setAddFormStartDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Maturity Date</Label>
                          <Input type="date" className="col-span-3" value={addFormMaturity} onChange={(e) => setAddFormMaturity(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Maturity (years)</Label>
                          <Input type="number" step="0.01" className="col-span-3 bg-muted" readOnly value={addFormTimeToMaturity.toFixed(2)} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Basic Parameters</p>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Spot Price</Label>
                          <div className="col-span-3 flex gap-2">
                            <Input type="number" step="0.0001" className="flex-1" value={addFormSpotPrice} onChange={(e) => setAddFormSpotPrice(e.target.value)} />
                            {useTppData && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleRefreshTppSpot}
                                disabled={tpp.tppLoadingFutures || tpp.tppFutures.length === 0}
                                title="Refresh Spot Price (raw market price)"
                              >
                                <RefreshCw className={`h-4 w-4 ${tpp.tppLoadingFutures ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-muted-foreground" title="Forward = Spot × exp(r × t). C'est ce prix qui est utilisé pour le pricing (Black-76).">Forward Price</Label>
                          <Input type="number" step="0.0001" className="col-span-3 bg-muted font-mono" readOnly value={addFormForwardPrice != null ? addFormForwardPrice.toFixed(4) : ''} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Strike Price</Label>
                          <div className="col-span-3 flex gap-2">
                            <Input type="number" step="0.01" className="flex-1" value={addFormRate} onChange={(e) => setAddFormRate(e.target.value)} />
                            <Select value={addFormStrikeType} onValueChange={(v: "percent" | "absolute") => setAddFormStrikeType(v)}>
                              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="absolute">Abs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Quantity</Label>
                          <Input type="number" step="1" className="col-span-3" value={addFormQuantity} onChange={(e) => setAddFormQuantity(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Notional (Volume)</Label>
                          <Input type="number" step="1000" className="col-span-3" value={addFormNotional} onChange={(e) => setAddFormNotional(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Volatility (%)</Label>
                          <div className="col-span-3 flex gap-2">
                            <Input 
                              type="number" 
                              step="0.1" 
                              className="flex-1" 
                              value={addFormVolatility} 
                              onChange={(e) => setAddFormVolatility(e.target.value)} 
                            />
                            {useTppData && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleRefreshTppIV}
                                disabled={tpp.tppLoadingSurface || tpp.tppSurfacePoints.length === 0}
                                title="Refresh IV from TPP surface"
                              >
                                <RefreshCw className={`h-4 w-4 ${tpp.tppLoadingSurface ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right" title="Taux interpolé à la maturité (même logique que Rate Explorer « Rates at custom date »)">Risk-free Rate (%)</Label>
                          <div className="col-span-3 flex gap-2">
                            <Input type="number" step="0.01" className="flex-1" value={addFormInterestRate} onChange={(e) => setAddFormInterestRate(e.target.value)} />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleRefreshInterestRate}
                              title={isCurveMode ? "Interpoler le taux à la maturité (courbe bootstrapée)" : "Utiliser le Bank Rate USD"}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(addFormType.includes("Knock") || addFormType.includes("Touch")) && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Barrier</p>
                        <div className="grid gap-3">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Barrier</Label>
                            <div className="col-span-3 flex gap-2">
                              <Input type="number" step="0.01" className="flex-1" placeholder="e.g. 110" value={addFormBarrier} onChange={(e) => setAddFormBarrier(e.target.value)} />
                              <Select value={addFormBarrierType} onValueChange={(v: "percent" | "absolute") => setAddFormBarrierType(v)}>
                                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percent">%</SelectItem>
                                  <SelectItem value="absolute">Abs</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {addFormType.includes("Double") && (
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Second Barrier</Label>
                              <div className="col-span-3 flex gap-2">
                                <Input type="number" step="0.01" className="flex-1" value={addFormSecondBarrier} onChange={(e) => setAddFormSecondBarrier(e.target.value)} />
                                <Select value={addFormBarrierType} onValueChange={(v: "percent" | "absolute") => setAddFormBarrierType(v)}>
                                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percent">%</SelectItem>
                                    <SelectItem value="absolute">Abs</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(addFormType.includes("Touch") || addFormType.includes("Binary")) && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Digital options</p>
                        <div className="grid gap-3">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Rebate (%)</Label>
                            <Input type="number" step="0.1" className="col-span-3" value={addFormRebate} onChange={(e) => setAddFormRebate(e.target.value)} />
                          </div>
                          {addFormType === "One-Touch" && (
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Time to Payoff (years)</Label>
                              <Input type="number" step="0.01" className="col-span-3" value={addFormTimeToPayoff} onChange={(e) => setAddFormTimeToPayoff(e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Storage Cost (%)</Label>
                        <Input type="number" step="0.01" className="col-span-3" value={addFormStorageCost} onChange={(e) => setAddFormStorageCost(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4 mt-3">
                        <Label className="text-right">Convenience Yield (%)</Label>
                        <Input type="number" step="0.01" className="col-span-3" value={addFormConvenienceYield} onChange={(e) => setAddFormConvenienceYield(e.target.value)} />
                      </div>
                    </div>

                    {/* Theo price (from inputs) + Real price (optional); stored price = real if set, else theo */}
                    <div className="border-t pt-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Pricing</p>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Theo price</Label>
                        <div className="col-span-3 font-mono text-sm bg-muted/50 px-3 py-2 rounded border">
                          {addFormTheoPrice != null ? addFormTheoPrice.toFixed(4) : "—"}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Real price (optional)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="Market price to store"
                          className="col-span-3"
                          value={addFormRealPrice}
                          onChange={(e) => setAddFormRealPrice(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Unit price saved: Real price if filled, otherwise Theo price.</p>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 border-t pt-3">
                      <Label className="text-right">Portfolio</Label>
                      <div className="col-span-3 flex gap-2">
                        <Select value={addFormPortfolio || "__none__"} onValueChange={(v) => setAddFormPortfolio(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select portfolio (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {portfolios.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddPortfolioOpen(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Counterparty</Label>
                      <div className="col-span-3 flex gap-2">
                        <Select value={addFormCounterparty} onValueChange={setAddFormCounterparty}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select counterparty" />
                          </SelectTrigger>
                          <SelectContent>
                            {counterparties.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCounterpartyOpen(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="border-t pt-4 mt-2 shrink-0">
                    <Button type="submit">Add Instrument</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog Add portfolio */}
            <Dialog open={isAddPortfolioOpen} onOpenChange={setIsAddPortfolioOpen}>
              <DialogContent className="sm:max-w-[360px]">
                <DialogHeader>
                  <DialogTitle>Add portfolio</DialogTitle>
                  <DialogDescription>Create a new portfolio to assign to instruments.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-portfolio-name">Name</Label>
                    <Input
                      id="new-portfolio-name"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      placeholder="e.g. Trading Book"
                      onKeyDown={(e) => e.key === "Enter" && addPortfolio()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddPortfolioOpen(false)}>Cancel</Button>
                  <Button onClick={addPortfolio}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog Add counterparty */}
            <Dialog open={isAddCounterpartyOpen} onOpenChange={setIsAddCounterpartyOpen}>
              <DialogContent className="sm:max-w-[360px]">
                <DialogHeader>
                  <DialogTitle>Add counterparty</DialogTitle>
                  <DialogDescription>Create a new counterparty to assign to instruments.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-counterparty-name">Name</Label>
                    <Input
                      id="new-counterparty-name"
                      value={newCounterpartyName}
                      onChange={(e) => setNewCounterpartyName(e.target.value)}
                      placeholder="e.g. Goldman Sachs"
                      onKeyDown={(e) => e.key === "Enter" && addCounterparty()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddCounterpartyOpen(false)}>Cancel</Button>
                  <Button onClick={addCounterparty}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search & filters */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="space-y-1.5 min-w-[220px] flex-1 max-w-lg">
              <Label htmlFor="hedging-instrument-search" className="text-muted-foreground text-sm">
                Search
              </Label>
              <Input
                id="hedging-instrument-search"
                value={instrumentSearchQuery}
                onChange={(e) => setInstrumentSearchQuery(e.target.value)}
                placeholder="ID, type, pair, counterparty..."
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Display by portfolio</Label>
              <Select value={filterByPortfolio || "all"} onValueChange={(v) => setFilterByPortfolio(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px] bg-muted/50">
                  <SelectValue placeholder="All instruments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instruments</SelectItem>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Display by counterparty</Label>
              <Select value={filterByCounterparty || "all"} onValueChange={(v) => setFilterByCounterparty(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px] bg-muted/50">
                  <SelectValue placeholder="All instruments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instruments</SelectItem>
                  {counterparties.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Display by strategy</Label>
              <Select value={filterByStrategy || "all"} onValueChange={(v) => setFilterByStrategy(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px] bg-muted/50">
                  <SelectValue placeholder="All strategies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All strategies</SelectItem>
                  {strategyNameOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          </div>
          {/* By instrument / strategy / exposure + secondary filters */}
          <div className="space-y-3">
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-1 gap-1">
              {(
                [
                  { id: "instrument" as const, label: "By instrument" },
                  { id: "strategy" as const, label: "By strategy" },
                  { id: "exposure" as const, label: "By exposure" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setDisplayView(id);
                    setStrategyViewSegment("all");
                    setExposureViewSegment("all");
                    setStrategyExpandedKey(null);
                    setStrategyPayoffDialogKey(null);
                  }}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    displayView === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {displayView === "instrument" && (
              <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-1 gap-1 max-w-full">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "forwards", label: "Forwards" },
                    { id: "options", label: "Options" },
                    { id: "swaps", label: "Swaps" },
                    { id: "hedge-accounting", label: "Hedge Accounting" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedTab(id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedTab === id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {displayView === "strategy" && (
              <div className="inline-flex flex-wrap max-w-full overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setStrategyViewSegment("all")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                    strategyViewSegment === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                {strategyNameOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setStrategyViewSegment(name)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap max-w-[220px] truncate",
                      strategyViewSegment === name
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={name}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {displayView === "exposure" && (
              <div className="inline-flex flex-wrap max-w-full overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setExposureViewSegment("all")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    exposureViewSegment === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                {commodityExposureOptions.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setExposureViewSegment(sym)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-mono font-medium",
                      exposureViewSegment === sym
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>

            <div className="mt-4">
              {filteredInstruments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  {instruments.length > 0 ? (
                    <>
                      <h3 className="text-lg font-semibold mb-2">No instruments match</h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        Try adjusting the search text or filters (portfolio, counterparty, strategy, tab).
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setInstrumentSearchQuery("");
                          setFilterByPortfolio("");
                          setFilterByCounterparty("");
                          setFilterByStrategy("");
                          setSelectedTab("all");
                          setDisplayView("instrument");
                          setStrategyViewSegment("all");
                          setExposureViewSegment("all");
                          setStrategyExpandedKey(null);
                          setStrategyPayoffDialogKey(null);
                        }}
                      >
                        Clear search & filters
                      </Button>
                    </>
                  ) : (
                    <>
                  <h3 className="text-lg font-semibold mb-2">No Commodity Hedging Instruments</h3>
                  <p className="text-muted-foreground mb-4">
                        You haven&apos;t imported any strategies yet. Create and import strategies from the Strategy Builder.
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
                    </>
                  )}
                </div>
              ) : displayView === "strategy" ? (
                <div className="w-full rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="border-b bg-muted/20 px-6 py-4">
                    <h2 className="text-lg font-semibold tracking-tight">Strategies</h2>
                    <p className="text-sm text-muted-foreground">Group instruments by hedging strategy.</p>
                             </div>
                  <div className="p-4 space-y-3 max-h-[min(85vh,900px)] overflow-y-auto">
                    {strategyViewSummaries.map((s) => (
                      <div
                        key={s.key}
                        className="rounded-lg border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            className="text-left flex-1 min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() =>
                              setStrategyExpandedKey((k) => (k === s.key ? null : s.key))
                            }
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {strategyExpandedKey === s.key ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="font-semibold text-base">{s.name}</span>
                              <Badge variant="secondary" className="text-xs font-normal shrink-0">
                                Exposure — {s.exposureLabel}
                              </Badge>
                                  </div>
                            <p className="text-sm text-muted-foreground mt-1.5 pl-6">
                              {s.legCount} instrument(s) • {s.maturityRange}
                            </p>
                          </button>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap lg:justify-end">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium font-mono">
                                Notional {formatCurrency(s.notionalSum)}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium font-mono">
                                MTM {formatCurrency(s.mtmDollarSum)}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium font-mono",
                                  s.payoffGlobal >= 0
                                    ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                                    : "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                                )}
                              >
                                Payoff global {formatCurrency(s.payoffGlobal)}
                              </span>
                              </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStrategyPayoffDialogKey(s.key);
                                }}
                              >
                                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                                Show payoff
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStrategyExpandedKey((k) => (k === s.key ? null : s.key));
                                }}
                              >
                                <Layers className="h-3.5 w-3.5 mr-1.5" />
                                Show legs
                              </Button>
                            </div>
                            </div>
                            </div>
                        {strategyExpandedKey === s.key && (
                          <div className="mt-4 border-t pt-4 space-y-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Click a row for full instrument details (same as main table).
                            </p>
                            <div
                              className="w-full border rounded-lg overflow-hidden bg-background"
                            >
                              <div
                                className="overflow-x-auto"
                                style={{ maxHeight: "min(55vh,480px)", minHeight: "200px", overflowY: "auto" }}
                              >
                                <Table className="min-w-full border-collapse">
                                  <TableHeader className="bg-muted/50 dark:bg-muted/80 sticky top-0 z-10">
                                    <TableRow className="border-b-2 border-border">
                                      <TableHead className="bg-muted/50 dark:bg-muted/80 font-semibold text-center border-r w-[88px] sticky left-0 z-[1] shadow-sm">
                                        ID
                                      </TableHead>
                                      <TableHead className="font-semibold text-center border-r min-w-[100px]">Type</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[96px]">Commodity</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[72px]">Qty %</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">Unit</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">Today</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">MTM</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[100px]">TTM</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">Spot</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[72px]">Vol</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[72px]">Rate</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">Forward</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">Strike</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[72px]">Bar 1</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[72px]">Bar 2</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[64px]">Rebate</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[88px]">Notional</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[96px]">Premium</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[96px]">Maturity</TableHead>
                                      <TableHead className="font-semibold text-center border-r w-[80px]">Status</TableHead>
                                      <TableHead className="font-semibold text-center w-[100px]">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>{s.legs.map((leg) => renderHedgingInstrumentTableRow(leg))}</TableBody>
                                </Table>
                              </div>
                                </div>
                            </div>
                        )}
                            </div>
                    ))}
                              </div>
                              </div>
              ) : displayView === "exposure" ? (
                <div className="w-full rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="border-b bg-muted/20 px-6 py-4">
                    <h2 className="text-lg font-semibold tracking-tight">Exposures</h2>
                    <p className="text-sm text-muted-foreground">
                      Show hedging strategies and instruments grouped by FX exposure (currency, hedge currency, maturity).
                    </p>
                            </div>
                  <div className="p-4 space-y-4 max-h-[min(85vh,900px)] overflow-y-auto">
                    {exposureViewGroups.map((g) => (
                      <div
                        key={g.key}
                        className="rounded-lg border bg-background p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-base">
                              Exposure {g.pairLabel} • {g.maturity} • {g.directionLabel}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1.5">
                              Amount {formatExposureAmountFr(g.amountSum)} {g.amountUnit} • Hedge requests {g.hedgeRequests}{" "}
                              • Strategies {g.strategyCount}
                              {g.legacyNoLink && (
                                <span className="text-orange-600 dark:text-orange-400"> • Legacy match (no link)</span>
                              )}
                            </p>
                                  </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end shrink-0">
                            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium font-mono">
                              Notional {formatCurrency(g.notionalSum)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium font-mono">
                              Target {g.targetRate != null ? g.targetRate.toFixed(4) : "—"} • P&L-rate{" "}
                              {g.plRate != null ? g.plRate.toFixed(4) : "—"}
                            </span>
                                  </div>
                                </div>
                        <div className="mt-4 border rounded-lg overflow-hidden bg-muted/10">
                          <div className="overflow-x-auto" style={{ maxHeight: "min(55vh,420px)", minHeight: "120px", overflowY: "auto" }}>
                            <Table className="min-w-[720px] border-collapse text-sm">
                              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                  <TableHead className="font-semibold border-r w-[100px]">Hedge Request</TableHead>
                                  <TableHead className="font-semibold border-r min-w-[120px]">Strategy</TableHead>
                                  <TableHead className="font-semibold border-r font-mono w-[160px]">ID</TableHead>
                                  <TableHead className="font-semibold border-r">Type</TableHead>
                                  <TableHead className="font-semibold border-r whitespace-nowrap w-[110px]">Maturity</TableHead>
                                  <TableHead className="font-semibold border-r text-right w-[120px]">Notional</TableHead>
                                  <TableHead className="font-semibold min-w-[120px]">Counterparty</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {g.legs.map((leg) => {
                                  const cpLabel =
                                    counterparties.find((c) => c.id === leg.counterparty)?.name ||
                                    leg.counterparty ||
                                    "—";
                                return (
                                    <TableRow
                                      key={leg.id}
                                      className="cursor-pointer hover:bg-muted/40"
                                      onClick={() =>
                                        navigate(`/hedging/instrument/${encodeURIComponent(leg.id)}`)
                                      }
                                    >
                                      <TableCell className="border-r text-muted-foreground">—</TableCell>
                                      <TableCell className="border-r font-medium">
                                        {leg.strategyName?.trim() || "—"}
                          </TableCell>
                                      <TableCell className="border-r font-mono text-xs" title={leg.id}>
                                        {leg.id.length > 22 ? `${leg.id.slice(0, 20)}…` : leg.id}
                          </TableCell>
                                      <TableCell className="border-r">{leg.type}</TableCell>
                                      <TableCell className="border-r font-mono text-xs whitespace-nowrap">
                                        {leg.maturity}
                          </TableCell>
                                      <TableCell className="border-r text-right font-mono">
                                        {formatCurrency(leg.notional)}
                          </TableCell>
                                      <TableCell className="text-muted-foreground">{cpLabel}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                            </div>
                              </div>
                            </div>
                    ))}
                              </div>
                            </div>
                          ) : (
                <div className="w-full border rounded-lg overflow-hidden bg-background">
                  <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 250px)', minHeight: '600px', overflowY: 'auto' }}>
                    <Table className="min-w-full border-collapse">
                     <TableHeader className="bg-muted/50 dark:bg-muted/80 sticky top-0 z-10">
                       {showExportColumns ? (
                         <>
                           <TableRow className="border-b-2 border-border">
                             <TableHead rowSpan={2} className="bg-muted/50 dark:bg-muted/80 font-semibold text-center border-r w-[88px] sticky left-0 z-[1] shadow-sm">
                               ID
                             </TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r min-w-[100px]">Type</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[96px]">Commodity</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[72px]">Qty %</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[88px]">Unit</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[88px]">Today</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[88px]">MTM</TableHead>
                             <TableHead colSpan={2} className="font-semibold text-center border-r border-b">TTM</TableHead>
                             <TableHead colSpan={2} className="font-semibold text-center border-r border-b">Spot</TableHead>
                             <TableHead colSpan={2} className="font-semibold text-center border-r border-b">Vol</TableHead>
                             <TableHead colSpan={2} className="font-semibold text-center border-r border-b">Rate</TableHead>
                             <TableHead colSpan={2} className="font-semibold text-center border-r border-b">Forward</TableHead>
                             <TableHead colSpan={2} className="font-semibold text-center border-r border-b">Strike</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[72px]">Bar 1</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[72px]">Bar 2</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[64px]">Rebate</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[88px]">Notional</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[96px]">Premium</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[96px]">Maturity</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center border-r w-[80px]">Status</TableHead>
                             <TableHead rowSpan={2} className="font-semibold text-center w-[100px]">Actions</TableHead>
                           </TableRow>
                           <TableRow className="border-b-2 border-border">
                             <TableHead className="text-xs text-blue-600 text-center border-r">Export</TableHead>
                             <TableHead className="text-xs text-green-700 dark:text-green-400 text-center border-r">Current</TableHead>
                             <TableHead className="text-xs text-blue-600 text-center border-r">Export</TableHead>
                             <TableHead className="text-xs text-green-700 dark:text-green-400 text-center border-r">Current</TableHead>
                             <TableHead className="text-xs text-blue-600 text-center border-r">Export</TableHead>
                             <TableHead className="text-xs text-green-700 dark:text-green-400 text-center border-r">Current</TableHead>
                             <TableHead className="text-xs text-blue-600 text-center border-r">Export</TableHead>
                             <TableHead className="text-xs text-green-700 dark:text-green-400 text-center border-r">Current</TableHead>
                             <TableHead className="text-xs text-blue-600 text-center border-r">Export</TableHead>
                             <TableHead className="text-xs text-green-700 dark:text-green-400 text-center border-r">Current</TableHead>
                             <TableHead className="text-xs text-blue-600 text-center border-r">Export</TableHead>
                             <TableHead className="text-xs text-green-700 dark:text-green-400 text-center border-r">Current</TableHead>
                           </TableRow>
                         </>
                       ) : (
                         <TableRow className="border-b-2 border-border">
                           <TableHead className="bg-muted/50 dark:bg-muted/80 font-semibold text-center border-r w-[88px] sticky left-0 z-[1] shadow-sm">ID</TableHead>
                           <TableHead className="font-semibold text-center border-r min-w-[100px]">Type</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[96px]">Commodity</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[72px]">Qty %</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">Unit</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">Today</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">MTM</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[100px]">TTM</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">Spot</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[72px]">Vol</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[72px]">Rate</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">Forward</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">Strike</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[72px]">Bar 1</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[72px]">Bar 2</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[64px]">Rebate</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[88px]">Notional</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[96px]">Premium</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[96px]">Maturity</TableHead>
                           <TableHead className="font-semibold text-center border-r w-[80px]">Status</TableHead>
                           <TableHead className="font-semibold text-center w-[100px]">Actions</TableHead>
                         </TableRow>
                       )}
                  </TableHeader>
                  <TableBody>
                    {hedgingTableDisplayItems.map((row) => {
                      if (row.kind === "group") {
                        return (
                          <TableRow key={row.key}>
                            <TableCell
                              colSpan={HEDGING_TABLE_COL_COUNT}
                              className="bg-muted/70 font-semibold text-sm py-2.5 border-b border-border"
                            >
                              <>Exposure: {row.title}</>
                        </TableCell>
                      </TableRow>
                      );
                      }
                      return renderHedgingInstrumentTableRow(row.instrument);
                    })}
                  </TableBody>
                </Table>
                  </div>
                </div>
              )}
            </div>
        </CardContent>
      </Card>

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

      <Dialog
        open={strategyPayoffDialogKey !== null}
        onOpenChange={(open) => {
          if (!open) setStrategyPayoffDialogKey(null);
        }}
      >
        <DialogContent className="sm:max-w-[960px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payoff analysis</DialogTitle>
            <DialogDescription>
              Same Payoff Chart as Strategy Builder. Switch between Valuation date and Export parameters. Strategy:{" "}
              {strategyPayoffChartModel?.title ?? "—"}
            </DialogDescription>
          </DialogHeader>
          {strategyPayoffChartModel &&
          (strategyPayoffChartModel.payoffData.length > 0 || strategyPayoffChartModel.exportPayoffData.length > 0) ? (
            <PayoffChart
              data={strategyPayoffChartModel.payoffData}
              exportPayoffData={strategyPayoffChartModel.exportPayoffData}
              spot={strategyPayoffChartModel.spot}
              spotExport={strategyPayoffChartModel.spotExport}
              showPayoffSourceTabs
              strategy={strategyPayoffChartModel.strategy}
              currencyPair={strategyPayoffChartModel.currencyPair}
              includePremium={true}
              showPremiumToggle={true}
              className="border-0 shadow-none"
            />
          ) : (
            <p className="text-sm text-muted-foreground py-6">
              Unable to build payoff diagram for this strategy (missing legs or parameters).
            </p>
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