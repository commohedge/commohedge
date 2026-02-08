import { useState, useEffect, useCallback } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { MarketRateCard } from "./MarketRateCard";
import { CommoditySpotCard } from "./CommoditySpotCard";
import { ForwardRatesTable } from "./ForwardRatesTable";
import { Activity, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetClass } from "@/types/chat";
import type { CommodityMarketData } from "@/types/Commodity";
import { fetchCommoditiesData, type CommodityCategory } from "@/services/commodityApi";
import { toast } from "sonner";

interface MarketDataPanelProps {
  assetClass?: AssetClass;
  commodityMarketData?: CommodityMarketData | null;
  onRefreshCommodity?: () => void;
}

const COMMODITY_API_CATEGORIES: CommodityCategory[] = ["energy", "metals", "agricultural"];

export function MarketDataPanel({ assetClass = "forex", commodityMarketData, onRefreshCommodity }: MarketDataPanelProps) {
  const { rates, forwards, lastUpdate, isLoading, error, refetch } = useMarketData();

  const [liveSpotPrices, setLiveSpotPrices] = useState<Record<string, number>>({});
  const [liveLastUpdated, setLiveLastUpdated] = useState<Date | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const fetchLiveCommodities = useCallback(async (forceRefresh = false) => {
    if (assetClass !== "commodities") return;
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      const results = await Promise.all(
        COMMODITY_API_CATEGORIES.map((cat) => fetchCommoditiesData(cat, forceRefresh))
      );
      const bySymbol: Record<string, number> = {};
      results.flat().forEach((c) => {
        if (c?.symbol && typeof c.price === "number" && c.price > 0) {
          bySymbol[c.symbol] = c.price;
        }
      });
      setLiveSpotPrices(bySymbol);
      setLiveLastUpdated(new Date());
      if (Object.keys(bySymbol).length === 0) setLiveError("Aucune donnée reçue");
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
  const useLiveData = isCommodities && (Object.keys(liveSpotPrices).length > 0 || isLoadingLive);
  const spotPrices = useLiveData ? liveSpotPrices : (commodityMarketData?.spotPrices ?? {});
  const volatilities = commodityMarketData?.volatilities ?? {};
  const commodityLastUpdate = useLiveData ? liveLastUpdated : commodityMarketData?.lastUpdated;
  const commodities = Object.keys(spotPrices);
  const commodityError = isCommodities ? liveError : null;
  const commodityLoading = isCommodities && isLoadingLive && Object.keys(liveSpotPrices).length === 0;
  const handleCommodityRefresh = useCallback(() => {
    if (isCommodities) fetchLiveCommodities(true);
    else onRefreshCommodity?.();
  }, [isCommodities, fetchLiveCommodities, onRefreshCommodity]);

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
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Prix spot (Commodity Market)
              </h3>
              {!commodityLoading && commodities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée reçue. Cliquez sur Rafraîchir pour charger les prix en temps réel.</p>
              ) : (
                !commodityLoading && (
                  <div className="grid gap-3">
                    {commodities.map((commodity) => (
                      <CommoditySpotCard
                        key={commodity}
                        commodity={commodity}
                        spotPrice={spotPrices[commodity]}
                        volatility={volatilities[commodity]}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
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
