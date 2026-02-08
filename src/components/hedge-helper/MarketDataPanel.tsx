import { useState, useEffect, useCallback, useMemo } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { MarketRateCard } from "./MarketRateCard";
import { CommoditySpotCard } from "./CommoditySpotCard";
import { ForwardRatesTable } from "./ForwardRatesTable";
import { Activity, Clock, RefreshCw, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { AssetClass } from "@/types/chat";
import type { CommodityMarketData } from "@/types/Commodity";
import { fetchCommoditiesData, type Commodity, type CommodityCategory } from "@/services/commodityApi";
import { toast } from "sonner";

interface MarketDataPanelProps {
  assetClass?: AssetClass;
  commodityMarketData?: CommodityMarketData | null;
  onRefreshCommodity?: () => void;
}

const COMMODITY_API_CATEGORIES: CommodityCategory[] = ["energy", "metals", "agricultural", "freight", "bunker"];

const CATEGORY_LABELS: Record<string, string> = {
  energy: "Energy",
  metals: "Metals",
  agricultural: "Agricultural",
  freight: "Freight",
  bunker: "Bunker",
};

type LiveByCategory = Record<string, Commodity[]>;

export function MarketDataPanel({ assetClass = "forex", commodityMarketData, onRefreshCommodity }: MarketDataPanelProps) {
  const { rates, forwards, lastUpdate, isLoading, error, refetch } = useMarketData();

  const [liveByCategory, setLiveByCategory] = useState<LiveByCategory>({});
  const [liveLastUpdated, setLiveLastUpdated] = useState<Date | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchLiveCommodities = useCallback(async (forceRefresh = false) => {
    if (assetClass !== "commodities") return;
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      const results = await Promise.all(
        COMMODITY_API_CATEGORIES.map((cat) => fetchCommoditiesData(cat, forceRefresh))
      );
      const byCategory: LiveByCategory = {};
      COMMODITY_API_CATEGORIES.forEach((cat, i) => {
        const list = (results[i] || []).filter((c) => c?.symbol && typeof c.price === "number" && c.price > 0);
        byCategory[cat] = list;
      });
      setLiveByCategory(byCategory);
      setLiveLastUpdated(new Date());
      const total = results.flat().filter((c) => c?.symbol && c.price > 0).length;
      if (total === 0) setLiveError("Aucune donnée reçue");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur chargement";
      setLiveError(msg);
      toast.error("Données Commodity Market indisponibles");
    } finally {
      setIsLoadingLive(false);
    }
  }, [assetClass]);

  useEffect(() => {
    if (assetClass === "commodities") fetchLiveCommodities(false);
  }, [assetClass, fetchLiveCommodities]);

  const isCommodities = assetClass === "commodities";
  const hasLiveData = Object.values(liveByCategory).some((arr) => arr.length > 0);
  const useLiveData = isCommodities && (hasLiveData || isLoadingLive);
  const commodityLastUpdate = useLiveData ? liveLastUpdated : commodityMarketData?.lastUpdated;
  const volatilities = commodityMarketData?.volatilities ?? {};
  const commodityError = isCommodities ? liveError : null;
  const commodityLoading = isCommodities && isLoadingLive && !hasLiveData;
  const handleCommodityRefresh = useCallback(() => {
    if (isCommodities) fetchLiveCommodities(true);
    else onRefreshCommodity?.();
  }, [isCommodities, fetchLiveCommodities, onRefreshCommodity]);

  const allCommodities = useMemo(() => {
    return COMMODITY_API_CATEGORIES.flatMap((cat) => liveByCategory[cat] ?? []);
  }, [liveByCategory]);

  const filterBySearch = useCallback((list: Commodity[], q: string): Commodity[] => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    const tokens = t.split(/\s+/);
    const score = (c: Commodity) => {
      const s = (c.symbol || "").toLowerCase();
      const n = (c.name || "").toLowerCase();
      const hay = `${s} ${n}`;
      let sc = 0;
      tokens.forEach((tok) => {
        if (!tok) return;
        if (s.startsWith(tok)) sc += 3;
        else if (n.startsWith(tok)) sc += 2;
        else if (hay.includes(tok)) sc += 1;
      });
      return sc;
    };
    return list
      .map((c) => ({ c, sc: score(c) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .map((x) => x.c);
  }, []);

  const suggestions = useMemo(() => {
    return filterBySearch(allCommodities, searchQuery).slice(0, 10);
  }, [allCommodities, searchQuery, filterBySearch]);

  const selectSuggestion = useCallback((item: Commodity) => {
    setSearchQuery(item.symbol);
    setShowSuggestions(false);
  }, []);

  const filteredByCategory = useMemo(() => {
    const q = searchQuery.trim();
    const out: LiveByCategory = {};
    COMMODITY_API_CATEGORIES.forEach((cat) => {
      const list = liveByCategory[cat] ?? [];
      out[cat] = q ? filterBySearch(list, searchQuery) : list;
    });
    return out;
  }, [liveByCategory, searchQuery, filterBySearch]);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Market Data</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={isCommodities ? handleCommodityRefresh : refetch}
              disabled={isCommodities ? isLoadingLive : isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${(isCommodities ? isLoadingLive : isLoading) ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${(isCommodities ? commodityError : error) ? 'bg-destructive' : 'bg-green-500'} animate-pulse`} />
              <span>{(isCommodities ? commodityError : error) ? 'Error' : 'Live'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated: {isCommodities && commodityLastUpdate ? new Date(commodityLastUpdate).toLocaleTimeString() : lastUpdate.toLocaleTimeString()}</span>
        </div>
        {isCommodities && useLiveData && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Source: Commodity Market (temps réel)</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isCommodities ? (
          <>
            {commodityError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{commodityError}</span>
              </div>
            )}
            {commodityLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            )}
            {!commodityLoading && (
              <>
                {hasLiveData && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground sr-only">Recherche</label>
                    <Popover open={showSuggestions && !!searchQuery.trim()} onOpenChange={setShowSuggestions}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Symbole ou nom..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            className="pl-8 h-8 text-sm"
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        {suggestions.length > 0 ? (
                          <ScrollArea className="max-h-56">
                            <ul className="py-1">
                              {suggestions.map((sug) => (
                                <li
                                  key={`${sug.category}-${sug.symbol}`}
                                  className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                  onClick={() => selectSuggestion(sug)}
                                >
                                  <div className="font-mono font-medium truncate">{sug.symbol}</div>
                                  <div className="text-xs text-muted-foreground truncate">{sug.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {CATEGORY_LABELS[sug.category] ?? sug.category} · {sug.price.toFixed(2)} {sug.currency}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        ) : (
                          <div className="p-3 text-sm text-muted-foreground">Aucun résultat</div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                {!hasLiveData ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée reçue. Cliquez sur Rafraîchir pour charger les prix en temps réel.</p>
                ) : (
                  <div className="space-y-4">
                    {COMMODITY_API_CATEGORIES.map((cat) => {
                      const list = filteredByCategory[cat] ?? [];
                      if (list.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {CATEGORY_LABELS[cat] ?? cat}
                          </h3>
                          <div className="grid gap-2">
                            {list.map((c) => (
                              <CommoditySpotCard
                                key={`${cat}-${c.symbol}`}
                                commodity={c.symbol}
                                spotPrice={c.price}
                                volatility={volatilities[c.symbol]}
                                unit={c.currency}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {hasLiveData && COMMODITY_API_CATEGORIES.every((cat) => (filteredByCategory[cat] ?? []).length === 0) && (
                      <p className="text-sm text-muted-foreground">Aucun résultat pour &quot;{searchQuery}&quot;</p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading && rates.length === 0 && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            )}

            {rates.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Spot Rates
                </h3>
                <div className="grid gap-3">
                  {rates.map((rate) => (
                    <MarketRateCard key={rate.pair} rate={rate} />
                  ))}
                </div>
              </div>
            )}

            {rates.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Forward Rates (EUR/USD)
                </h3>
                <ForwardRatesTable forwards={forwards} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
