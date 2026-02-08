import { useMarketData } from "@/hooks/useMarketData";
import { MarketRateCard } from "./MarketRateCard";
import { CommoditySpotCard } from "./CommoditySpotCard";
import { ForwardRatesTable } from "./ForwardRatesTable";
import { Activity, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetClass } from "@/types/chat";
import type { CommodityMarketData } from "@/types/Commodity";

interface MarketDataPanelProps {
  assetClass?: AssetClass;
  commodityMarketData?: CommodityMarketData | null;
  onRefreshCommodity?: () => void;
}

export function MarketDataPanel({ assetClass = "forex", commodityMarketData, onRefreshCommodity }: MarketDataPanelProps) {
  const { rates, forwards, lastUpdate, isLoading, error, refetch } = useMarketData();

  const isCommodities = assetClass === "commodities" && commodityMarketData;
  const spotPrices = commodityMarketData?.spotPrices ?? {};
  const volatilities = commodityMarketData?.volatilities ?? {};
  const commodityLastUpdate = commodityMarketData?.lastUpdated;
  const commodities = Object.keys(spotPrices);

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
              onClick={isCommodities ? onRefreshCommodity : refetch}
              disabled={isCommodities ? false : isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${!isCommodities && isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${!isCommodities && error ? 'bg-destructive' : 'bg-green-500'} animate-pulse`} />
              <span>{!isCommodities && error ? 'Error' : 'Live'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated: {isCommodities && commodityLastUpdate ? new Date(commodityLastUpdate).toLocaleTimeString() : lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isCommodities ? (
          <>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Prix spot (Commodity Market)
              </h3>
              {commodities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée commodity. Utilisez Commodity Market pour charger les prix.</p>
              ) : (
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
