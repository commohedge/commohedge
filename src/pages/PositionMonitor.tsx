import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Activity, 
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  Zap,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Filter,
  Search,
  Calendar,
  Layers
} from "lucide-react";
import { useCommodityData } from "@/hooks/useCommodityData";
import { Commodity, fetchCommoditiesData } from "@/services/commodityApi";
import { toast } from "sonner";

// Mapping des symboles de commodity aux symboles TradingView pour récupérer les prix depuis Commodity Market
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

interface Position {
  id: string;
  commodity: string;
  position: number; // Quantité (positive = long, negative = short)
  marketPrice: number;
  entryPrice: number;
  unrealizedPnL: number;
  dailyPnL: number;
  exposure: "Long" | "Short";
  hedge_status: "Full" | "Partial" | "None";
  hedge_ratio: number;
  last_trade: string;
  unit: string;
  maturity: Date; // Date d'échéance
  manualPrice?: boolean; // Indique si le prix est manuel
}

const PositionMonitor = () => {
  const { exposures, marketData } = useCommodityData();
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>("");
  const [allCommodities, setAllCommodities] = useState<Commodity[]>([]);
  
  // Filtres
  const [selectedCommodity, setSelectedCommodity] = useState<string>("all");
  const [selectedMaturity, setSelectedMaturity] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [enableNetting, setEnableNetting] = useState<boolean>(false);

  // Charger toutes les commodities depuis CommodityMarket
  useEffect(() => {
    const loadCommodities = async () => {
      try {
        const [metals, agricultural, energy] = await Promise.all([
          fetchCommoditiesData('metals'),
          fetchCommoditiesData('agricultural'),
          fetchCommoditiesData('energy')
        ]);
        setAllCommodities([...metals, ...agricultural, ...energy]);
      } catch (error) {
        console.error('Error loading commodities:', error);
      }
    };
    loadCommodities();
  }, []);

  // Fonction pour récupérer le prix depuis CommodityMarket (cache ou données chargées)
  const getMarketPrice = useCallback((commoditySymbol: string): number | null => {
      const symbolMap = COMMODITY_SYMBOL_MAP[commoditySymbol];
      
      // 1. Chercher dans les commodities chargées en mémoire
      if (symbolMap) {
        // Chercher par symbole TradingView exact
        let commodity = allCommodities.find(c => c.symbol === symbolMap.tradingViewSymbol);
        
        // Si pas trouvé, chercher par symbole sans le '!'
        if (!commodity) {
          const symbolWithoutExcl = symbolMap.tradingViewSymbol.replace('!', '');
          commodity = allCommodities.find(c => 
            c.symbol === symbolWithoutExcl || 
            c.symbol.replace('!', '') === symbolWithoutExcl
          );
        }
        
        // Chercher aussi par nom de commodity
        if (!commodity) {
          commodity = allCommodities.find(c => {
            const name = c.name.toLowerCase();
            return name.includes(commoditySymbol.toLowerCase()) || 
                   name.includes(commoditySymbol.toLowerCase().replace('natgas', 'natural gas'));
          });
        }
        
        if (commodity && commodity.price > 0) {
          return commodity.price;
        }

        // 2. Chercher dans le cache localStorage
        try {
          const cacheKey = `fx_commodities_cache_${symbolMap.category}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const cacheData = JSON.parse(cached);
            if (cacheData.data && Array.isArray(cacheData.data)) {
              const cachedCommodity = cacheData.data.find((c: Commodity) => 
                c.symbol === symbolMap.tradingViewSymbol ||
                c.symbol.replace('!', '') === symbolMap.tradingViewSymbol.replace('!', '')
              );
              if (cachedCommodity && cachedCommodity.price > 0) {
                return cachedCommodity.price;
              }
            }
          }
        } catch (error) {
          console.error('Error reading from cache:', error);
        }
      }

      // 3. Fallback: utiliser les prix du marketData
      const spotPrice = marketData.spotPrices[commoditySymbol];
      if (spotPrice && spotPrice > 0) {
        return spotPrice;
      }

      return null;
  }, [allCommodities, marketData]);

  // Convertir exposures en positions (détaillé par maturité)
  const positionsFromExposures = useMemo((): Position[] => {
    return exposures.map((exposure) => {
      const marketPrice = getMarketPrice(exposure.commodity) || exposure.pricePerUnit || 0;
      
      // Position = Volume brut (exactement comme dans Commodity Exposures, sans division)
      // Dans useCommodityData.ts ligne 400: totalValue = Math.abs(underlyingExposureVolume)
      // Donc totalValue est le volume brut (underlyingExposureVolume) depuis Strategy Builder
      // C'est le même champ utilisé dans Exposures.tsx ligne 214: const volume = totalValue;
      // 
      // IMPORTANT: quantity est calculé comme volume / pricePerUnit (ligne 399 de useCommodityData)
      // Donc si totalValue est 0 ou undefined, on ne peut PAS utiliser quantity car c'est déjà divisé
      // On doit utiliser totalValue directement comme volume brut
      let volume = Math.abs(exposure.totalValue || 0);
      
      // Si totalValue est 0 ou très petit, vérifier si on peut le reconstruire
      // Mais normalement, totalValue devrait toujours être défini comme le volume brut
      if (volume === 0 && exposure.quantity > 0 && exposure.pricePerUnit > 0) {
        // Ce cas ne devrait normalement pas arriver, mais si totalValue est manquant,
        // on ne peut pas utiliser quantity car c'est déjà divisé par pricePerUnit
        // On laisse volume à 0 dans ce cas
        console.warn(`[PositionMonitor] totalValue is 0 for exposure ${exposure.id}, cannot calculate position`);
      }
      
      const position = exposure.type === 'long' ? volume : -volume;
      const entryPrice = exposure.pricePerUnit || marketPrice;
      
      // Calculer P&L
      // Si position est en volume (BBL), alors P&L = volume * (prix_marché - prix_entrée)
      // Ce qui donne: BBL * (USD/BBL - USD/BBL) = USD
      const priceDiff = marketPrice - entryPrice;
      const unrealizedPnL = position * priceDiff;
      
      // Pour le daily P&L, on simule une variation (peut être amélioré avec historique)
      const dailyPnL = unrealizedPnL * 0.1; // Approximation

      // Déterminer le statut de hedge
      let hedge_status: "Full" | "Partial" | "None";
      if (exposure.hedgeRatio >= 95) {
        hedge_status = "Full";
      } else if (exposure.hedgeRatio > 0) {
        hedge_status = "Partial";
      } else {
        hedge_status = "None";
      }

      // Déterminer l'unité (mapping vers abréviations standards)
      const unitMap: { [key: string]: string } = {
        'barrel': 'BBL',
        'bbl': 'BBL',
        'troy ounce': 'OZ',  // ✅ Gérer "troy ounce" (avec espace)
        'troy_ounce': 'OZ',  // ✅ Gérer "troy_ounce" (avec underscore)
        'oz': 'OZ',
        'bushel': 'BU',
        'bu': 'BU',
        'pound': 'LB',
        'lb': 'LB',
        'metric ton': 'MT',  // ✅ Gérer "metric ton" (avec espace)
        'metric_ton': 'MT',  // ✅ Gérer "metric_ton" (avec underscore)
        'MT': 'MT',
        'ton': 'MT',
        'mmbtu': 'MMBtu',
        'MMBtu': 'MMBtu',
        'gallon': 'GAL',
        'gal': 'GAL'
      };
      const unit = unitMap[exposure.unit] || exposure.unit.toUpperCase();

      return {
        id: exposure.id,
        commodity: exposure.commodity,
        position: position,
        marketPrice: marketPrice,
        entryPrice: entryPrice,
        unrealizedPnL: unrealizedPnL,
        dailyPnL: dailyPnL,
        exposure: exposure.type === 'long' ? "Long" : "Short",
        hedge_status: hedge_status,
        hedge_ratio: exposure.hedgeRatio,
        last_trade: new Date().toLocaleTimeString(),
        unit: unit,
        maturity: exposure.maturity,
        manualPrice: false
      };
    });
  }, [exposures, getMarketPrice]);

  // Liste unique des commodities et maturités pour les filtres
  const uniqueCommodities = useMemo(() => {
    const commodities = new Set(exposures.map(exp => exp.commodity));
    return Array.from(commodities).sort();
  }, [exposures]);

  const uniqueMaturities = useMemo(() => {
    const maturities = new Set(
      exposures.map(exp => exp.maturity.toISOString().split('T')[0])
    );
    return Array.from(maturities).sort();
  }, [exposures]);

  // Filtrer et netter les positions
  const filteredAndNettedPositions = useMemo((): Position[] => {
    let filtered = positionsFromExposures;

    // Filtrer par commodity
    if (selectedCommodity !== "all") {
      filtered = filtered.filter(pos => pos.commodity === selectedCommodity);
    }

    // Filtrer par maturité
    if (selectedMaturity !== "all") {
      filtered = filtered.filter(pos => 
        pos.maturity.toISOString().split('T')[0] === selectedMaturity
      );
    }

    // Filtrer par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pos =>
        pos.commodity.toLowerCase().includes(searchLower) ||
        pos.unit.toLowerCase().includes(searchLower)
      );
    }

    // Netting si activé
    if (enableNetting) {
      const nettedMap = new Map<string, Position>();
      
      filtered.forEach(pos => {
        const key = `${pos.commodity}-${pos.maturity.toISOString().split('T')[0]}`;
        const existing = nettedMap.get(key);
        
        if (existing) {
          // Agréger les positions
          existing.position += pos.position;
          existing.unrealizedPnL += pos.unrealizedPnL;
          existing.dailyPnL += pos.dailyPnL;
          // Moyenne pondérée pour les prix
          const totalQuantity = Math.abs(existing.position) + Math.abs(pos.position);
          if (totalQuantity > 0) {
            existing.entryPrice = (
              (existing.entryPrice * Math.abs(existing.position) + 
               pos.entryPrice * Math.abs(pos.position)) / totalQuantity
            );
            existing.marketPrice = (
              (existing.marketPrice * Math.abs(existing.position) + 
               pos.marketPrice * Math.abs(pos.position)) / totalQuantity
            );
          }
          // Mettre à jour le statut de hedge (prendre le minimum)
          existing.hedge_ratio = Math.min(existing.hedge_ratio, pos.hedge_ratio);
          existing.hedge_status = existing.hedge_ratio >= 95 ? "Full" :
                                  existing.hedge_ratio > 0 ? "Partial" : "None";
          existing.exposure = existing.position >= 0 ? "Long" : "Short";
        } else {
          nettedMap.set(key, { ...pos });
        }
      });
      
      return Array.from(nettedMap.values());
    }

    return filtered;
  }, [positionsFromExposures, selectedCommodity, selectedMaturity, searchTerm, enableNetting]);

  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  // Synchroniser les positions avec les expositions
  useEffect(() => {
    const positionsMap = new Map<string, Position>();
    positionsFromExposures.forEach(pos => {
      positionsMap.set(pos.id, pos);
    });
    setPositions(positionsMap);
  }, [positionsFromExposures]);

  // Obtenir les positions avec les prix manuels préservés
  const getPositionsWithManualPrices = useCallback((): Position[] => {
    return filteredAndNettedPositions.map(pos => {
      const stored = positions.get(pos.id);
      if (stored && stored.manualPrice) {
        return {
          ...pos,
          marketPrice: stored.marketPrice,
          manualPrice: true,
          unrealizedPnL: pos.position * (stored.marketPrice - pos.entryPrice),
          dailyPnL: pos.position * (stored.marketPrice - pos.entryPrice) * 0.1
        };
      }
      return pos;
    });
  }, [filteredAndNettedPositions, positions]);

  const displayPositions = getPositionsWithManualPrices();

  // Mettre à jour les prix depuis CommodityMarket en temps réel
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setPositions(prevPositions => {
        const updated = new Map(prevPositions);
        positionsFromExposures.forEach(pos => {
          const stored = updated.get(pos.id);
          // Ne pas mettre à jour si le prix est manuel
          if (stored && stored.manualPrice) return;

          const newMarketPrice = getMarketPrice(pos.commodity) || pos.marketPrice;
          const priceDiff = newMarketPrice - pos.entryPrice;
          const newUnrealizedPnL = pos.position * priceDiff;
          const newDailyPnL = newUnrealizedPnL * 0.1;

          updated.set(pos.id, {
          ...pos,
            marketPrice: newMarketPrice,
            unrealizedPnL: newUnrealizedPnL,
            dailyPnL: newDailyPnL,
            last_trade: new Date().toLocaleTimeString(),
            manualPrice: stored?.manualPrice || false
          });
        });
        return updated;
      });
      setLastUpdate(new Date());
    }, parseInt(refreshInterval) * 1000);

    return () => clearInterval(interval);
  }, [isLiveMode, refreshInterval, getMarketPrice, positionsFromExposures]);

  // Gérer l'édition manuelle des prix
  const handleEditPrice = (positionId: string, currentPrice: number) => {
    setEditingPrice(positionId);
    setEditPriceValue(currentPrice.toFixed(2));
  };

  const handleSavePrice = (positionId: string) => {
    const newPrice = parseFloat(editPriceValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error("Prix invalide");
      return;
    }

    setPositions(prevPositions => {
      const updated = new Map(prevPositions);
      const pos = updated.get(positionId);
      if (pos) {
        const priceDiff = newPrice - pos.entryPrice;
        const newUnrealizedPnL = pos.position * priceDiff;
        const newDailyPnL = newUnrealizedPnL * 0.1;

        updated.set(positionId, {
          ...pos,
          marketPrice: newPrice,
          unrealizedPnL: newUnrealizedPnL,
          dailyPnL: newDailyPnL,
          manualPrice: true,
          last_trade: new Date().toLocaleTimeString()
        });
      }
      return updated;
    });

    setEditingPrice(null);
    setEditPriceValue("");
    toast.success("Prix mis à jour manuellement");
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setEditPriceValue("");
  };

  const handleRefreshPrices = async () => {
    try {
      toast.info("Actualisation des prix...");
      const [metals, agricultural, energy] = await Promise.all([
        fetchCommoditiesData('metals', true),
        fetchCommoditiesData('agricultural', true),
        fetchCommoditiesData('energy', true)
      ]);
      setAllCommodities([...metals, ...agricultural, ...energy]);
      
      // Mettre à jour les prix (sauf ceux manuels)
      setPositions(prevPositions => {
        const updated = new Map(prevPositions);
        positionsFromExposures.forEach(pos => {
          const stored = updated.get(pos.id);
          if (stored && stored.manualPrice) return;

          const newMarketPrice = getMarketPrice(pos.commodity) || pos.marketPrice;
          const priceDiff = newMarketPrice - pos.entryPrice;
          const newUnrealizedPnL = pos.position * priceDiff;
          const newDailyPnL = newUnrealizedPnL * 0.1;

          updated.set(pos.id, {
            ...pos,
            marketPrice: newMarketPrice,
            unrealizedPnL: newUnrealizedPnL,
            dailyPnL: newDailyPnL,
            last_trade: new Date().toLocaleTimeString(),
            manualPrice: stored?.manualPrice || false
          });
        });
        return updated;
      });
      
      setLastUpdate(new Date());
      toast.success("Prix actualisés");
    } catch (error) {
      console.error('Error refreshing prices:', error);
      toast.error("Erreur lors de l'actualisation des prix");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPrice = (price: number, commodity: string) => {
    if (commodity === "GOLD") {
      return price.toFixed(2);
    } else if (commodity === "CORN") {
      return price.toFixed(2);
    } else if (commodity === "NATGAS") {
      return price.toFixed(2);
    }
    return price.toFixed(2);
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getHedgeStatusBadge = (status: string, ratio: number) => {
    switch (status) {
      case "Full":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Full {ratio}%</Badge>;
      case "Partial":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial {ratio}%</Badge>;
      case "None":
        return <Badge variant="destructive">None {ratio}%</Badge>;
      default:
        return <Badge variant="outline">{status} {ratio}%</Badge>;
    }
  };

  const getExposureIcon = (exposure: string) => {
    return exposure === "Long" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const totalUnrealizedPnL = displayPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalDailyPnL = displayPositions.reduce((sum, pos) => sum + pos.dailyPnL, 0);
  const totalPositions = displayPositions.length;
  const fullyHedgedCount = displayPositions.filter(pos => pos.hedge_status === "Full").length;

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Position Monitor" }
      ]}
    >
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Position Monitor
              </CardTitle>
              <CardDescription>
                Live monitoring of commodity positions and market movements
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="live-mode"
                  checked={isLiveMode}
                  onCheckedChange={setIsLiveMode}
                />
                <Label htmlFor="live-mode" className="flex items-center gap-2">
                  {isLiveMode ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  Live Mode
                </Label>
              </div>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 sec</SelectItem>
                  <SelectItem value="5">5 sec</SelectItem>
                  <SelectItem value="10">10 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefreshPrices}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-muted-foreground">
                  {isLiveMode ? 'Live' : 'Paused'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Last Update: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Market Hours: 24/7 (Commodity Markets)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalUnrealizedPnL)}`}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalDailyPnL)}`}>
              {formatCurrency(totalDailyPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              Open positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Coverage</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullyHedgedCount}/{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              Fully hedged
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Position Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
            <CardTitle>Live Positions</CardTitle>
                <CardDescription>Real-time position updates and P&L - Detailed by Maturity - Synchronized with Commodity Exposures</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtres */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Filtre Commodity */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Commodity:</Label>
                  <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Commodities</SelectItem>
                      {uniqueCommodities.map(commodity => (
                        <SelectItem key={commodity} value={commodity}>{commodity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtre Maturity */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Maturity:</Label>
                  <Select value={selectedMaturity} onValueChange={setSelectedMaturity}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Maturities</SelectItem>
                      {uniqueMaturities.map(maturity => (
                        <SelectItem key={maturity} value={maturity}>
                          {new Date(maturity).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recherche */}
                <div className="flex items-center gap-2 flex-1">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                {/* Netting Toggle */}
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="netting" className="text-sm">Netting:</Label>
                  <Switch
                    id="netting"
                    checked={enableNetting}
                    onCheckedChange={setEnableNetting}
                  />
                  <Label htmlFor="netting" className="text-sm text-muted-foreground">
                    {enableNetting ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>

            {displayPositions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No positions found. {exposures.length === 0 ? "Add commodity exposures to see positions here." : "Try adjusting your filters."}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commodity</TableHead>
                    <TableHead>Maturity</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Market Price</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Unrealized P&L</TableHead>
                  <TableHead>Daily P&L</TableHead>
                  <TableHead>Hedge Status</TableHead>
                  <TableHead>Last Trade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {displayPositions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {position.commodity}
                      </Badge>
                    </TableCell>
                      <TableCell className="font-mono text-sm">
                        {position.maturity.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getExposureIcon(position.exposure)}
                        <span className="font-mono">
                          {Math.abs(position.position).toLocaleString()} {position.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                        {editingPrice === position.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              className="w-24 h-8"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSavePrice(position.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>${formatPrice(position.marketPrice, position.commodity)}</span>
                            {position.manualPrice && (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditPrice(position.id, position.marketPrice)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${formatPrice(position.entryPrice, position.commodity)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${getPnLColor(position.unrealizedPnL)}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${getPnLColor(position.dailyPnL)}`}>
                        {formatCurrency(position.dailyPnL)}
                      </span>
                    </TableCell>
                    <TableCell>
                        {getHedgeStatusBadge(position.hedge_status, position.hedge_ratio)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {position.last_trade}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Active Alerts
          </CardTitle>
          <CardDescription>Real-time position and market alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayPositions.filter(pos => pos.hedge_status === "None").length > 0 && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                  <p className="text-sm font-medium">Unhedged Positions Warning</p>
                  <p className="text-xs text-muted-foreground">
                    {displayPositions.filter(pos => pos.hedge_status === "None").length} position(s) without hedge coverage
                  </p>
              </div>
              <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleTimeString()}
              </Badge>
            </div>
            )}
            
            {displayPositions.filter(pos => pos.hedge_status === "Partial").length > 0 && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                  <p className="text-sm font-medium">Partial Hedge Coverage</p>
                  <p className="text-xs text-muted-foreground">
                    {displayPositions.filter(pos => pos.hedge_status === "Partial").length} position(s) with partial hedge coverage
                  </p>
              </div>
              <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleTimeString()}
              </Badge>
            </div>
            )}

            {displayPositions.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No active alerts
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PositionMonitor; 
