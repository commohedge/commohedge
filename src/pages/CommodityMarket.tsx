import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Commodity, fetchCommoditiesData, refreshCommoditiesData, CommodityCategory } from "@/services/commodityApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, BarChart3, Factory, Wheat, Zap, Ship, Fuel, Globe, Building2, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorldBankDashboard from "./WorldBankDashboard";

export default function CommodityMarket() {
  // État pour stocker les commodités par catégorie
  const [metalsCommodities, setMetalsCommodities] = useState<Commodity[]>([]);
  const [agriculturalCommodities, setAgriculturalCommodities] = useState<Commodity[]>([]);
  const [energyCommodities, setEnergyCommodities] = useState<Commodity[]>([]);
  const [freightCommodities, setFreightCommodities] = useState<Commodity[]>([]);
  const [bunkerCommodities, setBunkerCommodities] = useState<Commodity[]>([]);
  
  // État pour le chargement et les erreurs par catégorie
  const [loading, setLoading] = useState({
    metals: true,
    agricultural: true,
    energy: true,
    freight: true,
    bunker: true,
  });
  const [error, setError] = useState<{[key in 'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker']?: string | null}>({});
  const [lastUpdated, setLastUpdated] = useState<{[key in 'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker']?: Date | null}>({});

  // État pour la catégorie active
  const [activeCategory, setActiveCategory] = useState<'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker'>('metals');
  const [searchQuery, setSearchQuery] = useState("");

  // Charger les données pour une catégorie spécifique
  const loadCategoryData = async (category: CommodityCategory, forceRefresh: boolean = false) => {
    setLoading(prev => ({ ...prev, [category]: true }));
    setError(prev => ({ ...prev, [category]: null }));
    
    try {
      const data = forceRefresh 
        ? await refreshCommoditiesData(category)
        : await fetchCommoditiesData(category);
      
      // Mettre à jour l'état approprié selon la catégorie
      if (category === 'metals') {
        setMetalsCommodities(data);
      } else if (category === 'agricultural') {
        setAgriculturalCommodities(data);
      } else if (category === 'energy') {
        setEnergyCommodities(data);
      } else if (category === 'freight') {
        setFreightCommodities(data);
      } else if (category === 'bunker') {
        setBunkerCommodities(data);
      }
      
      setLastUpdated(prev => ({ ...prev, [category]: new Date() }));
      
      if (data.length === 0) {
        setError(prev => ({ ...prev, [category]: "No data found" }));
      }
    } catch (error) {
      console.error(`Error loading ${category} data:`, error);
      setError(prev => ({ ...prev, [category]: `Error loading ${category} data. Please try again later.` }));
      
      // Réinitialiser les données en cas d'erreur
      if (category === 'metals') {
        setMetalsCommodities([]);
      } else if (category === 'agricultural') {
        setAgriculturalCommodities([]);
      } else if (category === 'energy') {
        setEnergyCommodities([]);
      } else if (category === 'freight') {
        setFreightCommodities([]);
      } else if (category === 'bunker') {
        setBunkerCommodities([]);
      }
    } finally {
      setLoading(prev => ({ ...prev, [category]: false }));
    }
  };

  // Charger toutes les données en parallèle
  const loadAllData = async (forceRefresh: boolean = false) => {
    console.log('🚀 Starting parallel data loading...');
    const startTime = Date.now();
    
    await Promise.all([
      loadCategoryData('metals', forceRefresh),
      loadCategoryData('agricultural', forceRefresh), 
      loadCategoryData('energy', forceRefresh),
      loadCategoryData('freight', forceRefresh),
      loadCategoryData('bunker', forceRefresh),
    ]);
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    console.log(`✅ All data loaded in ${loadTime}ms (${(loadTime/1000).toFixed(1)}s)`);
    
    if (loadTime < 10000) {
      toast.success(`Data loaded in ${(loadTime/1000).toFixed(1)}s`);
    }
  };

  // Charger les données initiales
  useEffect(() => {
    loadAllData();
    
    // Rafraîchir les données toutes les 5 minutes
    const interval = setInterval(() => {
      loadAllData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Obtenir les commodités actives en fonction de la catégorie sélectionnée
  const getActiveCommodities = (): Commodity[] => {
    switch(activeCategory) {
      case 'metals':
        return metalsCommodities;
      case 'agricultural':
        return agriculturalCommodities;
      case 'energy':
        return energyCommodities;
      case 'freight':
        return freightCommodities;
      case 'bunker':
        return bunkerCommodities;
      default:
        return metalsCommodities;
    }
  };

  const commodities = getActiveCommodities();
  const isLoading = loading[activeCategory];
  const currentError = error[activeCategory];
  const currentLastUpdated = lastUpdated[activeCategory];

  // Intelligent search on symbol or name (accent/case insensitive)
  const normalize = (text: string) => (text || "")
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const filteredCommodities = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return commodities;
    const words = q.split(' ');
    const scored = commodities
      .map(c => {
        const s = normalize(c.symbol);
        const n = normalize(c.name);
        const hay = `${s} ${n}`;
        // Score: startsWith > includes; all query words must be present
        const allPresent = words.every(w => hay.includes(w));
        if (!allPresent) return { c, score: -1 };
        const starts = (s.startsWith(q) ? 3 : 0) + (n.startsWith(q) ? 2 : 0);
        const includes = (s.includes(q) ? 1 : 0) + (n.includes(q) ? 1 : 0);
        return { c, score: starts + includes };
      })
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c);
    return scored;
  }, [commodities, searchQuery]);

  // Calculate market statistics
  const marketStats = useMemo(() => {
    const allCommodities = [...metalsCommodities, ...agriculturalCommodities, ...energyCommodities, ...freightCommodities, ...bunkerCommodities];
    const positive = allCommodities.filter(c => c.percentChange > 0).length;
    const negative = allCommodities.filter(c => c.percentChange < 0).length;
    const avgChange = allCommodities.length > 0 
      ? allCommodities.reduce((sum, c) => sum + c.percentChange, 0) / allCommodities.length 
      : 0;
    
    return { total: allCommodities.length, positive, negative, avgChange };
  }, [metalsCommodities, agriculturalCommodities, energyCommodities, freightCommodities, bunkerCommodities]);

  // Render price change badge
  const PriceChangeBadge = ({ value, isPercent = false }: { value: number, isPercent?: boolean }) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        <Icon className="w-3 h-3" />
        {isPositive ? '+' : ''}{value.toFixed(2)}{isPercent ? '%' : ''}
      </span>
    );
  };

  // Loading skeleton
  const LoadingTable = () => (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );

  return (
    <Layout title="Commodity Market" breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Commodity Market" }
    ]}>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-indigo-900/5 to-purple-900/5 rounded-2xl" />
        
        <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-900 to-indigo-700 rounded-xl text-white shadow-lg">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-indigo-600 bg-clip-text text-transparent">
                    Commodity Market
                  </h1>
                  <p className="text-slate-600 font-medium">
                    Real-time commodity prices from global markets
                  </p>
                </div>
              </div>
              
              {currentLastUpdated && (
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                    Last Updated: {currentLastUpdated.toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-slate-500">
                    {marketStats.total} commodities tracked
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by symbol or name..."
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
              onClick={() => loadCategoryData(activeCategory, true)}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin mr-2" : "mr-2"} />
              Refresh
            </Button>
            </div>
          </div>

          {/* Market Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Tracked</p>
                    <p className="text-2xl font-bold text-slate-900">{marketStats.total}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Gainers</p>
                    <p className="text-2xl font-bold text-green-600">{marketStats.positive}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Losers</p>
                    <p className="text-2xl font-bold text-red-600">{marketStats.negative}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Avg Change</p>
                    <p className={`text-2xl font-bold ${marketStats.avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {currentError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={20} />
          <p>{currentError}</p>
        </div>
      )}

      {/* Main Tabs */}
      <Card className="border-0 shadow-xl bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Tabs 
            defaultValue="metals" 
            className="w-full"
            value={activeCategory}
            onValueChange={(value) => setActiveCategory(value as any)}
          >
            <div className="border-b border-slate-100 bg-slate-50/80 rounded-t-xl">
              <TabsList className="h-auto p-2 bg-transparent w-full justify-start gap-2">
                <TabsTrigger 
                  value="metals" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg px-4 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Factory size={16} />
                  <span>Metals</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="agricultural" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg px-4 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Wheat size={16} />
                  <span>Agricultural</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="energy" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg px-4 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Zap size={16} />
                  <span>Energy</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="freight" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg px-4 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Ship size={16} />
                  <span>Freight</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="bunker" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg px-4 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Fuel size={16} />
                  <span>Bunker</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="worldbank" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg px-4 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Building2 size={16} />
                  <span>World Bank</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="metals" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Metal Commodities</CardTitle>
                    <CardDescription>Precious and industrial metals futures</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <LoadingTable />
                    ) : filteredCommodities.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Change %</TableHead>
                            <TableHead className="text-right">High</TableHead>
                            <TableHead className="text-right">Low</TableHead>
                            <TableHead>Technical</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCommodities.map((commodity) => (
                            <TableRow key={commodity.symbol}>
                              <TableCell className="font-medium">{commodity.symbol}</TableCell>
                              <TableCell className="max-w-xs truncate">{commodity.name}</TableCell>
                              <TableCell className="text-right font-mono">{commodity.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.absoluteChange} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.percentChange} isPercent />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.high.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.low.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  commodity.technicalEvaluation.toLowerCase().includes('buy') ? 'bg-green-100 text-green-700' :
                                  commodity.technicalEvaluation.toLowerCase().includes('sell') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {commodity.technicalEvaluation}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="agricultural" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Agricultural Commodities</CardTitle>
                    <CardDescription>Grains, softs, and livestock futures</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <LoadingTable />
                    ) : filteredCommodities.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Change %</TableHead>
                            <TableHead className="text-right">High</TableHead>
                            <TableHead className="text-right">Low</TableHead>
                            <TableHead>Technical</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCommodities.map((commodity) => (
                            <TableRow key={commodity.symbol}>
                              <TableCell className="font-medium">{commodity.symbol}</TableCell>
                              <TableCell className="max-w-xs truncate">{commodity.name}</TableCell>
                              <TableCell className="text-right font-mono">{commodity.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.absoluteChange} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.percentChange} isPercent />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.high.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.low.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  commodity.technicalEvaluation.toLowerCase().includes('buy') ? 'bg-green-100 text-green-700' :
                                  commodity.technicalEvaluation.toLowerCase().includes('sell') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {commodity.technicalEvaluation}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="energy" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Energy Commodities</CardTitle>
                    <CardDescription>Oil, gas, and renewable energy futures</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <LoadingTable />
                    ) : filteredCommodities.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Change %</TableHead>
                            <TableHead className="text-right">High</TableHead>
                            <TableHead className="text-right">Low</TableHead>
                            <TableHead>Technical</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCommodities.map((commodity) => (
                            <TableRow key={commodity.symbol}>
                              <TableCell className="font-medium">{commodity.symbol}</TableCell>
                              <TableCell className="max-w-xs truncate">{commodity.name}</TableCell>
                              <TableCell className="text-right font-mono">{commodity.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.absoluteChange} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.percentChange} isPercent />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.high.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.low.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  commodity.technicalEvaluation.toLowerCase().includes('buy') ? 'bg-green-100 text-green-700' :
                                  commodity.technicalEvaluation.toLowerCase().includes('sell') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {commodity.technicalEvaluation}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="freight" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Freight Commodities</CardTitle>
                    <CardDescription>Container shipping and freight rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <LoadingTable />
                    ) : commodities.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Change %</TableHead>
                            <TableHead className="text-right">High</TableHead>
                            <TableHead className="text-right">Low</TableHead>
                            <TableHead>Technical</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commodities.map((commodity) => (
                            <TableRow key={commodity.symbol}>
                              <TableCell className="font-medium">{commodity.symbol}</TableCell>
                              <TableCell className="max-w-xs truncate">{commodity.name}</TableCell>
                              <TableCell className="text-right font-mono">{commodity.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.absoluteChange} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.percentChange} isPercent />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.high.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.low.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  commodity.technicalEvaluation.toLowerCase().includes('buy') ? 'bg-green-100 text-green-700' :
                                  commodity.technicalEvaluation.toLowerCase().includes('sell') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {commodity.technicalEvaluation}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bunker" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Bunker Fuel Prices</CardTitle>
                    <CardDescription>Marine fuel prices and bunker rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <LoadingTable />
                    ) : commodities.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Change %</TableHead>
                            <TableHead className="text-right">High</TableHead>
                            <TableHead className="text-right">Low</TableHead>
                            <TableHead>Technical</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commodities.map((commodity) => (
                            <TableRow key={commodity.symbol}>
                              <TableCell className="font-medium">{commodity.symbol}</TableCell>
                              <TableCell className="max-w-xs truncate">{commodity.name}</TableCell>
                              <TableCell className="text-right font-mono">{commodity.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.absoluteChange} />
                              </TableCell>
                              <TableCell className="text-right">
                                <PriceChangeBadge value={commodity.percentChange} isPercent />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.high.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-slate-600">{commodity.low.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  commodity.technicalEvaluation.toLowerCase().includes('buy') ? 'bg-green-100 text-green-700' :
                                  commodity.technicalEvaluation.toLowerCase().includes('sell') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {commodity.technicalEvaluation}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="worldbank" className="space-y-4 mt-0">
                <WorldBankDashboard />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}
