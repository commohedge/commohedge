interface CommoditySpotCardProps {
  commodity: string;
  spotPrice: number;
  volatility?: number;
  unit?: string;
}

export function CommoditySpotCard({ commodity, spotPrice, volatility, unit = "USD" }: CommoditySpotCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-foreground">{commodity}</span>
      </div>
      <div className="font-mono text-xl font-bold text-foreground mb-2">
        {spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {volatility != null && (
          <div>
            <span className="text-muted-foreground">Vol (ann.)</span>
            <span className="font-mono text-foreground ml-2">{((volatility ?? 0) * 100).toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
