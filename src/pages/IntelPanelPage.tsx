import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout as AppLayout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PinOff } from "lucide-react";
import { COMMODITY_NEWS_SECTIONS, CommodityNewsCategoryPanel } from "@/pages/CommodityNews";
import { WorldMapContent } from "@/pages/WorldMap";
import { MarketNewsContent } from "@/pages/MarketNews";
import { EconomicCalendarContent } from "@/pages/EconomicCalendar";
import { AdvancedChartContent } from "@/pages/AdvancedChart";
import { CommodityMarketPricesPanel } from "@/components/CommodityMarketPricesPanel";
import { getEffectivePanelConfig } from "@/config/panels";
import { removeIntelPin, readIntelPins } from "@/intel/pins";

function resolvePanelTitle(panelId: string): string {
  const stored = readIntelPins().find((p) => p.id === panelId)?.title;
  if (stored) return stored;

  const commodity = COMMODITY_NEWS_SECTIONS.find((s) => s.gridId === panelId);
  if (commodity) return getEffectivePanelConfig(commodity.panelKey, "commodity").name;

  const staticTitles: Record<string, string> = {
    "world-map": "Situation mondiale",
    "market-news": "Market News",
    "economic-calendar": "Economic Calendar",
    "advanced-chart": "Advanced Chart",
    "commodity-prices": "Commodity prices",
  };
  return staticTitles[panelId] || "Panel";
}

export default function IntelPanelPage() {
  const navigate = useNavigate();
  const { panelId } = useParams<{ panelId: string }>();

  const title = useMemo(() => resolvePanelTitle(panelId || ""), [panelId]);

  if (!panelId) {
    return (
      <AppLayout title="Panel" breadcrumbs={[{ label: "Intelligence workspace", href: "/intel-workspace" }, { label: "Panel" }]}>
        <div className="p-6">
          <p className="text-muted-foreground">Missing panel id.</p>
        </div>
      </AppLayout>
    );
  }

  const commoditySection = COMMODITY_NEWS_SECTIONS.find((s) => s.gridId === panelId);

  return (
    <AppLayout
      title={title}
      breadcrumbs={[{ label: "Intelligence workspace", href: "/intel-workspace" }, { label: title }]}
    >
      <div className="space-y-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/intel-workspace")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeIntelPin(panelId)}
            className="gap-2"
            title="Remove from sidebar"
          >
            <PinOff className="h-4 w-4" />
            Unpin
          </Button>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-2 shadow-sm">
          {panelId === "world-map" ? <WorldMapContent embedded={false} /> : null}
          {panelId === "market-news" ? <MarketNewsContent compact={false} /> : null}
          {panelId === "economic-calendar" ? <EconomicCalendarContent compact={false} /> : null}
          {panelId === "advanced-chart" ? <AdvancedChartContent compact={false} /> : null}
          {panelId === "commodity-prices" ? <CommodityMarketPricesPanel /> : null}
          {commoditySection ? <CommodityNewsCategoryPanel section={commoditySection} /> : null}
          {!commoditySection &&
          panelId !== "world-map" &&
          panelId !== "market-news" &&
          panelId !== "economic-calendar" &&
          panelId !== "advanced-chart" &&
          panelId !== "commodity-prices" ? (
            <div className="p-6 text-muted-foreground">This panel is not available as a full page.</div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

