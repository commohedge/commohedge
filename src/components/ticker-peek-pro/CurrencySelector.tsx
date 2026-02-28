import { useEffect, useState } from "react";
import { RefreshCw, BarChart3, Activity, Boxes, Table2 } from "lucide-react";
import { fetchCurrencies, COMMODITY_CATEGORIES, type CurrencyData, type CommodityCategory } from "@/lib/ticker-peek-pro/barchart";

interface CurrencySelectorProps {
  selectedCurrency: CurrencyData | null;
  onSelect: (currency: CurrencyData) => void;
  onLoadFutures: () => void;
  onLoadVolatility: () => void;
  onLoadVolSurface: () => void;
  onLoadIvMatrix: () => void;
}

export function CurrencySelector({ selectedCurrency, onSelect, onLoadFutures, onLoadVolatility, onLoadVolSurface, onLoadIvMatrix }: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommodityCategory>("currencies");

  const loadData = async (category: CommodityCategory, force = false) => {
    setLoading(true);
    setError(null);
    const result = await fetchCurrencies(category, force);
    if (result.success && result.data) {
      setCurrencies(result.data);
    } else {
      setError(result.error || "Failed to fetch data");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (cat: CommodityCategory) => {
    setActiveCategory(cat);
    setCurrencies([]);
  };

  const uniqueCurrencies = currencies.reduce<CurrencyData[]>((acc, c) => {
    if (!acc.find((x) => x.name === c.name)) acc.push(c);
    return acc;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const symbol = e.target.value;
    const currency = currencies.find((c) => c.symbol === symbol);
    if (currency) onSelect(currency);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {COMMODITY_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeCategory === cat.value
                ? "bg-primary/15 text-primary glow-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Instrument:</span>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">{error}</span>
              <button
                onClick={() => loadData(activeCategory, true)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <select
              value={selectedCurrency?.symbol || ""}
              onChange={handleChange}
              className="bg-muted/50 border border-border rounded-md px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent min-w-[260px]"
            >
              <option value="" disabled>
                Select an instrument...
              </option>
              {uniqueCurrencies.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCurrency && (
          <>
            <button
              onClick={onLoadFutures}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 text-sm font-medium transition-colors border border-accent/20"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Futures
            </button>
            <button
              onClick={onLoadVolatility}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 text-sm font-medium transition-colors border border-warning/20"
            >
              <Activity className="w-3.5 h-3.5" />
              Vol & Greeks
            </button>
            <button
              onClick={onLoadVolSurface}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-info/10 text-info hover:bg-info/20 text-sm font-medium transition-colors border border-info/20"
            >
              <Boxes className="w-3.5 h-3.5" />
              Vol Surface 3D
            </button>
            <button
              onClick={onLoadIvMatrix}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 text-sm font-medium transition-colors border border-warning/20"
            >
              <Table2 className="w-3.5 h-3.5" />
              Matrice IV
            </button>
          </>
        )}

        {!loading && !error && (
          <button
            onClick={() => loadData(activeCategory, true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh Data
          </button>
        )}
      </div>
    </div>
  );
}
