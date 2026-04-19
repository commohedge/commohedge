import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import StrategyImportService, { type HedgingInstrument } from "@/services/StrategyImportService";

/** Passed from the list when navigating so detail view matches on-screen pricing without duplicating hooks. */
export type HedgingInstrumentDetailSnapshot = {
  valuationDate: string;
  todayPrice: number;
  mtmValue: number;
  unitPrice: number;
  initialPrice: number;
  isExportedStrategy: boolean;
  timeToMaturityYears: number;
  dteDays: number;
  pricingModelLabel: string;
  spotDisplay: number;
  spotIsReal: boolean;
  volPct: number | null;
  volSource: string;
  ratePct: number;
  rateSource: string;
  forward: number;
  forwardSource: string;
  exportTtmYears?: number;
  exportDteDays?: number;
};

function formatNum(n: number | undefined | null, decimals = 4): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

const HedgingInstrumentDetail = () => {
  const navigate = useNavigate();
  const { instrumentId } = useParams<{ instrumentId: string }>();
  const location = useLocation();
  const snapshot = (location.state as { snapshot?: HedgingInstrumentDetailSnapshot } | undefined)?.snapshot;

  const id = instrumentId ? decodeURIComponent(instrumentId) : "";
  const instrument: HedgingInstrument | undefined = StrategyImportService.getInstance().getHedgingInstrumentById(id);

  if (!instrument) {
    return (
      <Layout>
        <div className="container mx-auto p-6 max-w-3xl">
          <Button variant="ghost" className="mb-4" onClick={() => navigate("/hedging")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to instruments
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Instrument not found</CardTitle>
              <CardDescription>
                No instrument matches this id. It may have been deleted or the link is invalid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/hedging")}>Return to Commodity Hedging Instruments</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/hedging")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Instrument details</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{instrument.type}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1 break-all">{instrument.id}</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {instrument.currency}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {instrument.strategyName && (
              <Field label="Strategy source">
                <span>{instrument.strategyName}</span>
              </Field>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3">Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Quantity (hedge %)">{formatNum(instrument.quantity, 1)}%</Field>
                <Field label="Maturity">{instrument.maturity}</Field>
                <Field label="Notional">{instrument.notional?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Field>
                <Field label="Status">{instrument.status}</Field>
                {instrument.effectiveness_ratio != null && (
                  <Field label="Hedge effectiveness">{instrument.effectiveness_ratio}%</Field>
                )}
              </div>
            </div>

            <Separator />

            {snapshot && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Valuation (as on main list)</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Valuation date: {snapshot.valuationDate}. Reopen from the list after changing market data to refresh.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Pricing model">{snapshot.pricingModelLabel}</Field>
                  <Field label="Unit price (initial)">{formatNum(snapshot.unitPrice, 6)}</Field>
                  <Field label="Initial price (MTM basis)">{formatNum(snapshot.initialPrice, 6)}</Field>
                  <Field label="Today price">{formatNum(snapshot.todayPrice, 6)}</Field>
                  <Field label="MTM">{formatNum(snapshot.mtmValue, 4)}</Field>
                  <Field label="Time to maturity">{formatNum(snapshot.timeToMaturityYears, 6)} y · {snapshot.dteDays} d</Field>
                  <Field label="Spot (used)">
                    {formatNum(snapshot.spotDisplay, 4)}
                    {snapshot.spotIsReal ? <span className="text-muted-foreground"> (market)</span> : null}
                  </Field>
                  <Field label="Volatility">
                    {snapshot.volPct != null ? `${formatNum(snapshot.volPct, 2)}%` : "—"}{" "}
                    <span className="text-muted-foreground text-xs">({snapshot.volSource})</span>
                  </Field>
                  <Field label="Risk-free rate">
                    {formatNum(snapshot.ratePct, 3)}%{" "}
                    <span className="text-muted-foreground text-xs">({snapshot.rateSource})</span>
                  </Field>
                  <Field label="Forward price">
                    {formatNum(snapshot.forward, 6)}{" "}
                    <span className="text-muted-foreground text-xs">({snapshot.forwardSource})</span>
                  </Field>
                </div>
              </div>
            )}

            {!snapshot && (
              <p className="text-sm text-muted-foreground">
                Open this instrument from the hedging list to see live valuation figures (pricing model, MTM, vol, rates).
              </p>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Strike & barriers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Strike">{instrument.strike != null ? formatNum(instrument.strike, 4) : "N/A"}</Field>
                <Field label="Barrier 1">{instrument.barrier != null ? formatNum(instrument.barrier, 4) : "N/A"}</Field>
                <Field label="Barrier 2">{instrument.secondBarrier != null ? formatNum(instrument.secondBarrier, 4) : "N/A"}</Field>
                <Field label="Rebate (%)">{instrument.rebate != null ? formatNum(instrument.rebate, 2) : "N/A"}</Field>
              </div>
              {instrument.dynamicStrikeInfo && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Dynamic strike: {instrument.dynamicStrikeInfo.calculatedStrikePercent} (calc. strike{" "}
                  {formatNum(instrument.dynamicStrikeInfo.calculatedStrike, 4)})
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Export snapshot (strategy builder)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <Field label="Export spot">{instrument.exportSpotPrice != null ? formatNum(instrument.exportSpotPrice, 6) : "—"}</Field>
                <Field label="Export vol">{instrument.exportVolatility != null ? `${formatNum(instrument.exportVolatility, 2)}%` : "—"}</Field>
                <Field label="Export domestic rate">
                  {instrument.exportDomesticRate != null ? `${formatNum(instrument.exportDomesticRate, 3)}%` : "—"}
                </Field>
                <Field label="Export forward">{instrument.exportForwardPrice != null ? formatNum(instrument.exportForwardPrice, 6) : "—"}</Field>
                <Field label="Export TTM (years)">{instrument.exportTimeToMaturity != null ? formatNum(instrument.exportTimeToMaturity, 6) : "—"}</Field>
                <Field label="Export strike">{instrument.exportStrike != null ? formatNum(instrument.exportStrike, 4) : "—"}</Field>
                <Field label="Strategy start">{instrument.exportStrategyStartDate ?? "—"}</Field>
                <Field label="Hedging start">{instrument.exportHedgingStartDate ?? "—"}</Field>
              </div>
              {snapshot && snapshot.exportTtmYears != null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Export TTM (recalculated): {formatNum(snapshot.exportTtmYears, 6)} y
                  {snapshot.exportDteDays != null ? ` (${snapshot.exportDteDays} d)` : ""}
                </p>
              )}
            </div>

            {instrument.repricingData && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">Repricing data</h3>
                  <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(instrument.repricingData, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {instrument.originalComponent && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">Original component</h3>
                  <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(instrument.originalComponent, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default HedgingInstrumentDetail;
