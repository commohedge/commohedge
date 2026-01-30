import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  RefreshCw, TrendingUp, TrendingDown, Minus, Clock, Calculator, 
  Settings2, Download, Plus, X, Layers, Database,
  ArrowUpIcon, ArrowDownIcon, MinusIcon, Edit2, Save,
  Table as TableIcon, LineChart as LineChartIcon,
  Globe, Landmark, LayoutGrid, FileText, ArrowLeft, Info
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from "recharts";
import { toast } from "sonner";

// Import Rate Explorer services
import { useRateData } from "@/hooks/useRateData";
import { useIRSData } from "@/hooks/useIRSData";
import { RATE_INDICES, FuturesData, RateIndex } from "@/services/rateExplorer/rateIndices";
import { IRS_INDICES, IRSData } from "@/services/rateExplorer/irsIndices";
import { CURRENCY_CONFIGS, CurrencyConfig } from "@/services/rateExplorer/currencyDefaults";
import { getCacheAge, clearAllCache } from "@/services/rateExplorer/dataCache";
import {
  bootstrap,
  bootstrapBonds,
  BootstrapPoint,
  BootstrapMethod,
  BootstrapResult,
  maturityToYears,
  priceToRate,
  exportToCSV,
  getBasisConvention,
  DiscountFactor,
} from "@/services/rateExplorer/bootstrapping";
import { useCountriesBonds, useCountryYields } from "@/hooks/useBondsData";
import { CountryBondData, BondYieldData } from "@/services/rateExplorer/bondsApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Currency flags
const currencyFlags: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  SGD: "🇸🇬",
};

// Bootstrap methods configuration
const BOOTSTRAP_METHODS: { id: BootstrapMethod; name: string; description: string; category: 'standard' | 'bloomberg' | 'quantlib' }[] = [
  { id: "linear", name: "Simple/Linéaire", description: "Interpolation linéaire entre les points", category: 'standard' },
  { id: "cubic_spline", name: "Cubic Spline", description: "Interpolation par splines cubiques naturelles", category: 'standard' },
  { id: "nelson_siegel", name: "Nelson-Siegel", description: "Modèle paramétrique à 4 paramètres (β₀, β₁, β₂, λ)", category: 'standard' },
  { id: "bloomberg", name: "Bloomberg", description: "Log-DF interpolation + forward smoothing + monotonicity", category: 'bloomberg' },
  { id: "quantlib_log_linear", name: "QuantLib Log-Linear", description: "PiecewiseLogLinearDiscount - Interpolation linéaire sur log(DF)", category: 'quantlib' },
  { id: "quantlib_log_cubic", name: "QuantLib Log-Cubic", description: "PiecewiseLogCubicDiscount - Spline cubique sur log(DF)", category: 'quantlib' },
  { id: "quantlib_linear_forward", name: "QuantLib Linear Forward", description: "PiecewiseLinearForward - Interpolation linéaire sur forwards", category: 'quantlib' },
  { id: "quantlib_monotonic_convex", name: "QuantLib Monotonic Convex", description: "Hagan-West monotonic convex - Préserve la monotonie des forwards", category: 'quantlib' },
];

interface CurveConfig {
  id: string;
  currency: string;
  futuresIndex: string;
  irsCurrency: string;
  useFutures: boolean;
  useIRS: boolean;
}

function generateCurveId(): string {
  return `curve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultCurveConfig(currencyConfig: CurrencyConfig): CurveConfig {
  return {
    id: generateCurveId(),
    currency: currencyConfig.currency,
    futuresIndex: currencyConfig.defaultFuturesIndex,
    irsCurrency: currencyConfig.defaultIRSCurrency,
    useFutures: true,
    useIRS: true,
  };
}

// Calculate effective rate: 100 - Latest price
function calculateEffectiveRate(latest: string): string {
  const latestNum = parseFloat(latest.replace(/[^0-9.-]/g, ""));
  if (isNaN(latestNum)) return "N/A";
  const effectiveRate = 100 - latestNum;
  return effectiveRate.toFixed(4);
}

// Bond rating color helper
function getRatingColor(rating: string): string {
  if (rating.startsWith('AAA')) return 'bg-green-500';
  if (rating.startsWith('AA')) return 'bg-green-400';
  if (rating.startsWith('A')) return 'bg-blue-400';
  if (rating.startsWith('BBB')) return 'bg-yellow-400';
  if (rating.startsWith('BB')) return 'bg-orange-400';
  if (rating.startsWith('B')) return 'bg-orange-500';
  if (rating.startsWith('C')) return 'bg-red-500';
  return 'bg-muted';
}

function formatBps(value: number | null): React.ReactNode {
  if (value === null) return '-';
  const color = value > 0 ? 'text-red-500' : value < 0 ? 'text-green-500' : '';
  const sign = value > 0 ? '+' : '';
  return <span className={color}>{sign}{value.toFixed(1)} bp</span>;
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(3)}%`;
}

// Major currencies with IRS/Futures
const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"];

// Rate Card Component
function RateCard({ rate, isSelected, onClick, isLoading }: { 
  rate: RateIndex; 
  isSelected: boolean; 
  onClick: () => void; 
  isLoading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 hover:border-primary/50 hover:bg-secondary/30 ${
        isSelected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{currencyFlags[rate.currency] || "🌍"}</span>
          <div>
            <h3 className="font-semibold text-foreground">{rate.name}</h3>
            <p className="text-xs text-muted-foreground">{rate.description}</p>
          </div>
        </div>
        <div className={`p-2 rounded-full transition-colors ${
          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}>
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          rate.currency === "EUR" ? "bg-blue-500/20 text-blue-400" :
          rate.currency === "USD" ? "bg-green-500/20 text-green-400" :
          rate.currency === "GBP" ? "bg-purple-500/20 text-purple-400" :
          "bg-slate-500/20 text-slate-400"
        }`}>
          {rate.currency}
        </span>
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
        )}
      </div>
    </button>
  );
}

// Editable Rate Table Component
function EditableRateTable({ data, isLoading, onDataChange }: {
  data: FuturesData[];
  isLoading?: boolean;
  onDataChange?: (data: FuturesData[]) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<FuturesData[]>([]);

  const startEditing = useCallback(() => {
    setEditedData([...data]);
    setEditMode(true);
  }, [data]);

  const cancelEditing = useCallback(() => {
    setEditedData([]);
    setEditMode(false);
  }, []);

  const saveChanges = useCallback(() => {
    if (onDataChange) {
      onDataChange(editedData);
    }
    setEditMode(false);
    toast.success("Modifications sauvegardées");
  }, [editedData, onDataChange]);

  const handleCellChange = useCallback((rowIndex: number, field: keyof FuturesData, value: string) => {
    setEditedData((prev) => {
      const newData = [...prev];
      newData[rowIndex] = { ...newData[rowIndex], [field]: value };
      if (field === "change") {
        const numValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
        newData[rowIndex].changeValue = isNaN(numValue) ? 0 : numValue;
      }
      return newData;
    });
  }, []);

  const displayData = editMode ? editedData : data;

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Contract", "Latest", "Taux Effectif", "Change", "Open", "High", "Low", "Previous"].map((header) => (
                <th key={header} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="py-3 px-4">
                    <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!displayData || displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 px-4 pt-4">
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Edit2 className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={cancelEditing}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button size="sm" onClick={saveChanges}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contract</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-primary">Taux Effectif (%)</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Open</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">High</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Low</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Previous</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, index) => (
              <tr key={row.contract} className={`border-b border-border/50 transition-colors hover:bg-secondary/50 ${index % 2 === 0 ? "bg-transparent" : "bg-secondary/20"}`}>
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium text-primary">{row.contract}</span>
                    <span className="text-xs text-muted-foreground">{row.maturity}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  {editMode ? (
                    <Input
                      className="w-24 ml-auto text-right font-mono text-sm h-8"
                      value={row.latest}
                      onChange={(e) => handleCellChange(index, "latest", e.target.value)}
                    />
                  ) : (
                    <span className="font-mono text-sm tabular-nums font-medium">{row.latest}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono text-sm tabular-nums font-semibold text-green-400">
                    {calculateEffectiveRate(row.latest)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {editMode ? (
                    <Input
                      className="w-20 ml-auto text-right font-mono text-sm h-8"
                      value={row.change}
                      onChange={(e) => handleCellChange(index, "change", e.target.value)}
                    />
                  ) : (
                    <ChangeCell value={row.changeValue} display={row.change} />
                  )}
                </td>
                <td className="py-3 px-4 text-right hidden sm:table-cell">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{row.open}</span>
                </td>
                <td className="py-3 px-4 text-right hidden md:table-cell">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{row.high}</span>
                </td>
                <td className="py-3 px-4 text-right hidden md:table-cell">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{row.low}</span>
                </td>
                <td className="py-3 px-4 text-right hidden lg:table-cell">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">{row.previous}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Change Cell Component
function ChangeCell({ value, display }: { value: number; display: string }) {
  const isUnchanged = display.toLowerCase() === "unch" || value === 0;
  const isPositive = value > 0;

  return (
    <div className={`inline-flex items-center gap-1 font-mono text-sm tabular-nums ${
      isUnchanged ? "text-muted-foreground" :
      isPositive ? "text-green-400" : "text-red-400"
    }`}>
      {isUnchanged ? (
        <MinusIcon className="w-3 h-3" />
      ) : isPositive ? (
        <ArrowUpIcon className="w-3 h-3" />
      ) : (
        <ArrowDownIcon className="w-3 h-3" />
      )}
      <span>{isUnchanged ? "unch" : (isPositive ? "+" : "") + display}</span>
    </div>
  );
}

// Rate Curve Chart Component
function RateCurveChart({ data, showEffectiveRate = true }: { data: FuturesData[]; showEffectiveRate?: boolean }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const extractYearMonth = (maturity: string): { year: number; month: number } => {
      const match = maturity.match(/(\w{3})\s*'(\d{2})/);
      if (!match) return { year: 2025, month: 1 };
      
      const monthNames: Record<string, number> = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
      };
      
      return { year: 2000 + parseInt(match[2], 10), month: monthNames[match[1]] || 1 };
    };
    
    return [...data]
      .sort((a, b) => {
        const dateA = extractYearMonth(a.maturity);
        const dateB = extractYearMonth(b.maturity);
        if (dateA.year !== dateB.year) return dateA.year - dateB.year;
        return dateA.month - dateB.month;
      })
      .map((item) => {
        const latestNum = parseFloat(item.latest.replace(/[^0-9.-]/g, ""));
        const effectiveRate = 100 - latestNum;
        return {
          contract: item.contract,
          maturity: item.maturity,
          latest: latestNum,
          effectiveRate: parseFloat(effectiveRate.toFixed(4)),
        };
      });
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available for chart
      </div>
    );
  }

  const values = showEffectiveRate 
    ? chartData.map((d) => d.effectiveRate)
    : chartData.map((d) => d.latest);
  
  const minVal = Math.floor(Math.min(...values) * 10) / 10 - 0.2;
  const maxVal = Math.ceil(Math.max(...values) * 10) / 10 + 0.2;

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.5} />
          <XAxis
            dataKey="maturity"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={Math.floor(chartData.length / 12)}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => `${value.toFixed(2)}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.maturity}</p>
                    <p className="text-sm text-muted-foreground">
                      {showEffectiveRate ? "Taux Effectif" : "Prix"}: 
                      <span className="font-mono text-foreground ml-1">
                        {showEffectiveRate ? data.effectiveRate.toFixed(4) : data.latest.toFixed(4)}%
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey={showEffectiveRate ? "effectiveRate" : "latest"}
            stroke={showEffectiveRate ? "hsl(142, 76%, 36%)" : "hsl(var(--primary))"}
            strokeWidth={2}
            dot={{ r: 3, fill: showEffectiveRate ? "hsl(142, 76%, 36%)" : "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// IRS Table Component
function IRSTable({ data, isLoading }: { data: IRSData[]; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Maturity</TableHead>
              <TableHead className="text-right">Rate (%)</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Prev. Close</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-12 bg-secondary rounded animate-pulse" /></TableCell>
                <TableCell className="text-right"><div className="h-4 w-16 ml-auto bg-secondary rounded animate-pulse" /></TableCell>
                <TableCell className="text-right"><div className="h-4 w-16 ml-auto bg-secondary rounded animate-pulse" /></TableCell>
                <TableCell className="text-right"><div className="h-4 w-14 ml-auto bg-secondary rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available. Click refresh to load IRS rates.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Maturity</TableHead>
            <TableHead className="font-semibold text-right">Rate (%)</TableHead>
            <TableHead className="font-semibold text-right">Change</TableHead>
            <TableHead className="font-semibold text-right">Prev. Close</TableHead>
            <TableHead className="font-semibold text-right">Day Low</TableHead>
            <TableHead className="font-semibold text-right">Day High</TableHead>
            <TableHead className="font-semibold text-right">52W Low</TableHead>
            <TableHead className="font-semibold text-right">52W High</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.maturity}>
              <TableCell className="font-medium">{row.maturity}</TableCell>
              <TableCell className="text-right font-mono">{row.rate}</TableCell>
              <TableCell className="text-right">
                <span className={`flex items-center justify-end gap-1 ${
                  row.changeValue > 0 ? "text-green-600" : 
                  row.changeValue < 0 ? "text-red-600" : "text-muted-foreground"
                }`}>
                  {row.changeValue > 0 ? <TrendingUp className="h-4 w-4" /> : 
                   row.changeValue < 0 ? <TrendingDown className="h-4 w-4" /> : 
                   <Minus className="h-4 w-4" />}
                  {row.change}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">{row.prevClose}</TableCell>
              <TableCell className="text-right font-mono">{row.dayLow}</TableCell>
              <TableCell className="text-right font-mono">{row.dayHigh}</TableCell>
              <TableCell className="text-right font-mono">{row.yearLow}</TableCell>
              <TableCell className="text-right font-mono">{row.yearHigh}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// IRS Curve Chart Component
function IRSCurveChart({ data, currency }: { data: IRSData[]; currency: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No data available for chart
      </div>
    );
  }

  const chartData = [...data]
    .sort((a, b) => a.tenor - b.tenor)
    .map((d) => ({
      maturity: d.maturity,
      tenor: d.tenor,
      rate: d.rateValue,
    }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="maturity" tick={{ fill: 'hsl(var(--foreground))' }} />
          <YAxis 
            tick={{ fill: 'hsl(var(--foreground))' }} 
            domain={['auto', 'auto']}
            tickFormatter={(value) => `${value.toFixed(2)}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-foreground">{data.maturity}</p>
                    <p className="text-sm text-muted-foreground">
                      Rate: <span className="font-mono text-foreground">{data.rate.toFixed(4)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="rate"
            name={`${currency} Swap Rate`}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ GOV BONDS CONTENT ============
interface GovBondsContentProps {
  countriesData: any;
  yieldsData: any;
  isLoadingCountries: boolean;
  isLoadingYields: boolean;
  countriesFetching: boolean;
  refetchCountries: () => void;
  refetchYields: () => void;
  viewMode: "dashboard" | "detail";
  setViewMode: (mode: "dashboard" | "detail") => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  selectedCountry: CountryBondData | null;
  setSelectedCountry: (country: CountryBondData | null) => void;
  activeTab: 'table' | 'chart';
  setActiveTab: (tab: 'table' | 'chart') => void;
}

function GovBondsContent({
  countriesData,
  yieldsData,
  isLoadingCountries,
  isLoadingYields,
  countriesFetching,
  refetchCountries,
  refetchYields,
  viewMode,
  setViewMode,
  selectedCurrency,
  setSelectedCurrency,
  selectedCountry,
  setSelectedCountry,
  activeTab,
  setActiveTab,
}: GovBondsContentProps) {
  const countries = countriesData?.data || [];
  
  // Group countries by currency
  const currencyGroups = useMemo(() => {
    const groups: Record<string, CountryBondData[]> = {};
    countries.forEach((c: CountryBondData) => {
      if (!groups[c.currency]) groups[c.currency] = [];
      groups[c.currency].push(c);
    });
    return Object.entries(groups)
      .map(([currency, ctries]) => {
        const bankRates = ctries.filter(c => c.bankRate !== null).map(c => c.bankRate as number);
        const avgBankRate = bankRates.length > 0 ? bankRates.reduce((a, b) => a + b, 0) / bankRates.length : null;
        return { currency, countries: ctries, avgBankRate };
      })
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [countries]);
  
  const currencies = useMemo(() => [...new Set(countries.map((c: CountryBondData) => c.currency))].sort() as string[], [countries]);
  
  const filteredCountries = useMemo(() => 
    selectedCurrency ? countries.filter((c: CountryBondData) => c.currency === selectedCurrency) : countries,
  [countries, selectedCurrency]);

  const chartData = yieldsData?.data?.map((d: BondYieldData) => ({
    maturity: d.maturity,
    years: d.maturityYears,
    yield: d.yield,
  })) || [];

  const handleSelectCountry = (country: CountryBondData) => {
    setSelectedCountry(country);
    setViewMode("detail");
  };

  const handleBack = () => {
    setSelectedCountry(null);
    setViewMode("dashboard");
  };

  // Dashboard View
  if (viewMode === "dashboard" && !selectedCountry) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🌍 World Government Bonds - Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode("detail")}>
                <FileText className="w-4 h-4 mr-2" />
                Detail View
              </Button>
              <Button onClick={refetchCountries} disabled={countriesFetching} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${countriesFetching ? 'animate-spin' : ''}`} />
                {countries.length ? 'Refresh' : 'Load Data'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Filter by Currency
              </Label>
              <Select value={selectedCurrency || "_all"} onValueChange={(v) => setSelectedCurrency(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All currencies</SelectItem>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isLoadingCountries || countriesFetching ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Scraping bond data...</span>
              </div>
            ) : countries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currencyGroups
                  .filter(g => !selectedCurrency || g.currency === selectedCurrency)
                  .map(({ currency, countries: ctries, avgBankRate }) => (
                    <Card key={currency} className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <Badge variant="default" className="text-lg px-3">{currency}</Badge>
                          <span className="text-sm text-muted-foreground">{ctries.length} countries</span>
                        </CardTitle>
                        {avgBankRate !== null && (
                          <p className="text-sm text-muted-foreground">
                            Bank Rate avg: <span className="font-mono">{avgBankRate.toFixed(2)}%</span>
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {ctries.slice(0, 4).map(c => (
                            <div 
                              key={c.countrySlug}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => handleSelectCountry(c)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate max-w-[100px]">{c.country}</span>
                                {c.rating && (
                                  <Badge className={`${getRatingColor(c.rating)} text-xs`}>{c.rating}</Badge>
                                )}
                              </div>
                              <span className="text-sm font-mono">
                                {c.bankRate !== null ? `${c.bankRate.toFixed(2)}%` : '-'}
                              </span>
                            </div>
                          ))}
                          {ctries.length > 4 && (
                            <div className="text-xs text-muted-foreground text-center pt-2">
                              +{ctries.length - 4} more
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Click "Load Data" to fetch government bond data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail View - List mode
  if (viewMode === "detail" && !selectedCountry) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">🌍 World Government Bonds - Detail View</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode("dashboard")}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button onClick={refetchCountries} disabled={countriesFetching} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${countriesFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={selectedCurrency || "_all"} onValueChange={(v) => setSelectedCurrency(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="All currencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All currencies</SelectItem>
                {currencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoadingCountries || countriesFetching ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCountries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">10Y Yield</TableHead>
                    <TableHead className="text-right">Bank Rate</TableHead>
                    <TableHead className="text-right">Spread vs Bund</TableHead>
                    <TableHead className="text-right">Spread vs T-Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCountries.map((country: CountryBondData) => (
                    <TableRow 
                      key={country.countrySlug}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectCountry(country)}
                    >
                      <TableCell className="font-medium">{country.country}</TableCell>
                      <TableCell><Badge variant="outline">{country.currency}</Badge></TableCell>
                      <TableCell><Badge className={getRatingColor(country.rating)}>{country.rating || 'NR'}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(country.yield10Y)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(country.bankRate)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBps(country.spreadVsBund)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBps(country.spreadVsTNote)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Country Detail View
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <CardTitle className="flex items-center gap-2">
            {selectedCountry?.country} Yield Curve
            <Badge variant="outline">{selectedCountry?.currency}</Badge>
            <Badge className={getRatingColor(selectedCountry?.rating || '')}>{selectedCountry?.rating || 'NR'}</Badge>
          </CardTitle>
        </div>
        <Button onClick={() => refetchYields()} disabled={isLoadingYields} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingYields ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'chart')}>
          <TabsList className="mb-4">
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table">
            {isLoadingYields ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : yieldsData?.data && yieldsData.data.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Maturity</TableHead>
                      <TableHead className="text-right">Yield</TableHead>
                      <TableHead className="text-right">Chg 1M</TableHead>
                      <TableHead className="text-right">Chg 6M</TableHead>
                      <TableHead className="text-right">Chg 12M</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yieldsData.data.map((yieldData: BondYieldData) => (
                      <TableRow key={yieldData.maturity}>
                        <TableCell className="font-medium">{yieldData.maturity}</TableCell>
                        <TableCell className="text-right font-mono">{formatPercent(yieldData.yield)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBps(yieldData.chg1M)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBps(yieldData.chg6M)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBps(yieldData.chg12M)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No yield data available</div>
            )}
          </TabsContent>
          
          <TabsContent value="chart">
            {chartData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="maturity" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
                    <Tooltip formatter={(value: number) => [`${value?.toFixed(3)}%`, 'Yield']} />
                    <Line type="monotone" dataKey="yield" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No chart data available</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============ BONDS CURVE CONTENT ============
interface BondsCurveContentProps {
  countriesData: any;
  yieldsData: any;
  isLoadingCountries: boolean;
  isLoadingYields: boolean;
  countriesFetching: boolean;
  refetchCountries: () => void;
  refetchYields: () => void;
  viewMode: "dashboard" | "detail";
  setViewMode: (mode: "dashboard" | "detail") => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  selectedMethods: BootstrapMethod[];
  setSelectedMethods: (methods: BootstrapMethod[]) => void;
}

function BondsCurveContent({
  countriesData,
  yieldsData,
  isLoadingCountries,
  isLoadingYields,
  countriesFetching,
  refetchCountries,
  refetchYields,
  viewMode,
  setViewMode,
  selectedCurrency,
  setSelectedCurrency,
  selectedCountry,
  setSelectedCountry,
  selectedMethods,
  setSelectedMethods,
}: BondsCurveContentProps) {
  const countries = countriesData?.data || [];
  const yields = yieldsData?.data || [];
  
  const currencies = useMemo(() => {
    const currList = [...new Set(countries.map((c: CountryBondData) => c.currency))].sort() as string[];
    return currList.sort((a, b) => {
      const aIsMajor = MAJOR_CURRENCIES.includes(a);
      const bIsMajor = MAJOR_CURRENCIES.includes(b);
      if (aIsMajor && !bIsMajor) return -1;
      if (!aIsMajor && bIsMajor) return 1;
      return a.localeCompare(b);
    });
  }, [countries]);
  
  const filteredCountries = useMemo(() => 
    selectedCurrency ? countries.filter((c: CountryBondData) => c.currency === selectedCurrency) : countries,
  [countries, selectedCurrency]);
  
  const selectedCountryData = countries.find((c: CountryBondData) => c.countrySlug === selectedCountry);
  const currency = selectedCountryData?.currency || selectedCurrency || "USD";
  const isMajorCurrency = MAJOR_CURRENCIES.includes(currency);
  
  // Build bootstrap points
  const bondPoints: BootstrapPoint[] = useMemo(() => {
    if (!yields.length) return [];
    return yields
      .filter((y: BondYieldData) => y.yield !== null && y.maturityYears > 0)
      .map((y: BondYieldData) => ({
        tenor: y.maturityYears,
        rate: (y.yield as number) / 100,
        source: 'bond' as const,
        priority: 1,
      }));
  }, [yields]);
  
  // Bootstrap results
  const results: BootstrapResult[] = useMemo(() => {
    if (bondPoints.length < 2) return [];
    return selectedMethods.map(method => bootstrapBonds(bondPoints, method, currency));
  }, [bondPoints, selectedMethods, currency]);

  const toggleMethod = (method: BootstrapMethod) => {
    setSelectedMethods(
      selectedMethods.includes(method)
        ? selectedMethods.filter(m => m !== method)
        : [...selectedMethods, method]
    );
  };

  const handleExportCSV = (result: BootstrapResult) => {
    const csv = exportToCSV(result);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bonds_curve_${selectedCountry}_${result.method}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Discount factors exported");
  };

  // Dashboard View
  if (viewMode === "dashboard") {
    const currencyGroups = currencies.map(curr => ({
      currency: curr,
      countries: countries.filter((c: CountryBondData) => c.currency === curr),
    }));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Bonds Curve - Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode("detail")}>
                <FileText className="w-4 h-4 mr-2" />Detail View
              </Button>
              <Button variant="outline" size="sm" onClick={refetchCountries}>
                <RefreshCw className="w-4 h-4 mr-2" />Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select value={selectedCurrency || "_all"} onValueChange={(v) => setSelectedCurrency(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Filter by Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All currencies</SelectItem>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      <div className="flex items-center gap-2">
                        <span>{curr}</span>
                        {MAJOR_CURRENCIES.includes(curr) && <Badge variant="secondary" className="text-xs">IRS/Futures</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {countriesFetching ? (
          <Card><CardContent className="py-12 text-center"><RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" /></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencyGroups
              .filter(g => !selectedCurrency || g.currency === selectedCurrency)
              .map(({ currency: curr, countries: ctries }) => (
                <Card key={curr} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-lg px-3">{curr}</Badge>
                        <span className="text-sm text-muted-foreground">{ctries.length} countries</span>
                      </div>
                      {MAJOR_CURRENCIES.includes(curr) && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Prefer IRS/Futures
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ctries.slice(0, 5).map((c: CountryBondData) => (
                        <div 
                          key={c.countrySlug}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedCountry(c.countrySlug);
                            setViewMode("detail");
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{c.country}</span>
                            {c.rating && <Badge variant="secondary" className="text-xs">{c.rating}</Badge>}
                          </div>
                          <span className="text-sm font-mono">{c.bankRate !== null ? `${c.bankRate.toFixed(2)}%` : '-'}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    );
  }
  
  // Detail View
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Bonds Curve Bootstrapping
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setViewMode("dashboard"); setSelectedCountry(""); }}>
              <LayoutGrid className="w-4 h-4 mr-2" />Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={refetchCountries}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Currency</Label>
              <Select value={selectedCurrency || "_all"} onValueChange={(v) => { setSelectedCurrency(v === "_all" ? "" : v); setSelectedCountry(""); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Filter by currency..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All currencies</SelectItem>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select country..." /></SelectTrigger>
                <SelectContent>
                  {filteredCountries.map((country: CountryBondData) => (
                    <SelectItem key={country.countrySlug} value={country.countrySlug}>
                      <div className="flex items-center gap-2">
                        <span>{country.country}</span>
                        <Badge variant="outline" className="text-xs">{country.currency}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isMajorCurrency && selectedCountry && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                For <strong>{currency}</strong> curves, consider using the <strong>"Bootstrapping"</strong> tab which combines futures and IRS for better precision.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Interpolation Methods</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BOOTSTRAP_METHODS.slice(0, 6).map((method) => (
                <div key={method.id} className="flex items-start space-x-2">
                  <Checkbox id={`bond-${method.id}`} checked={selectedMethods.includes(method.id)} onCheckedChange={() => toggleMethod(method.id)} />
                  <div className="grid gap-0.5">
                    <Label htmlFor={`bond-${method.id}`} className="font-medium text-sm">{method.name}</Label>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedCountry && (
            <div className="flex flex-wrap gap-4 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Curve points:</span>
                <Badge variant="default">{bondPoints.length} maturities</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {isLoadingYields ? (
        <Card><CardContent className="py-12 text-center"><Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" /></CardContent></Card>
      ) : !selectedCountry ? (
        <Card><CardContent className="py-12 text-center"><Landmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Select a country to build its yield curve</p></CardContent></Card>
      ) : bondPoints.length < 2 ? (
        <Card><CardContent className="py-12 text-center"><TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Not enough data for this country</p></CardContent></Card>
      ) : (
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">Yield Curve</TabsTrigger>
            <TabsTrigger value="discount_factors">Discount Factors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart">
            <Card>
              <CardHeader><CardTitle>Yield Curve - {selectedCountryData?.country} ({currency})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="tenor" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}Y`} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(4)}%`, 'Rate']} />
                      <Legend />
                      {results.map((result, idx) => (
                        <Line
                          key={result.method}
                          data={result.curvePoints.map(p => ({ tenor: p.tenor, [result.method]: p.rate * 100 }))}
                          type="monotone"
                          dataKey={result.method}
                          name={result.method.replace(/_/g, ' ')}
                          stroke={`hsl(${idx * 50}, 70%, 50%)`}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="discount_factors">
            <div className="space-y-6">
              {results.map((result) => (
                <Card key={result.method}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg capitalize">{result.method.replace(/_/g, ' ')}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV(result)}>
                      <Download className="w-4 h-4 mr-2" />Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tenor (Y)</TableHead>
                            <TableHead className="text-right">DF</TableHead>
                            <TableHead className="text-right">Zero Rate</TableHead>
                            <TableHead className="text-right">Forward Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.discountFactors.map((df, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{df.tenor.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{df.df.toFixed(8)}</TableCell>
                              <TableCell className="text-right font-mono">{(df.zeroRate * 100).toFixed(4)}%</TableCell>
                              <TableCell className="text-right font-mono">{df.forwardRate ? `${(df.forwardRate * 100).toFixed(4)}%` : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ============ ALL CURVES CONTENT ============
// Mapping currency to futures index
const CURRENCY_TO_FUTURES_INDEX: Record<string, string> = {
  "USD": "sofr",
  "EUR": "estr3m",
  "GBP": "sonia",
  "CHF": "saron3m",
  "JPY": "tona3m",
};

// Mapping currency to IRS index
const CURRENCY_TO_IRS_INDEX: Record<string, string> = {
  "USD": "usd",
  "EUR": "eur",
  "GBP": "gbp",
  "CHF": "chf",
  "JPY": "jpy",
};

interface AllCurvesContentProps {
  countriesData: any;
  isLoadingCountries: boolean;
  countriesFetching: boolean;
  refetchCountries: () => void;
  selectedMethod: BootstrapMethod;
  setSelectedMethod: (method: BootstrapMethod) => void;
  viewMode: "dashboard" | "detail";
  setViewMode: (mode: "dashboard" | "detail") => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
}

function AllCurvesContent({
  countriesData,
  isLoadingCountries,
  countriesFetching,
  refetchCountries,
  selectedMethod,
  setSelectedMethod,
  viewMode,
  setViewMode,
  selectedCurrency,
  setSelectedCurrency,
}: AllCurvesContentProps) {
  const countries = countriesData?.data || [];
  
  // Fetch data for each major currency
  const usdFutures = useRateData(CURRENCY_TO_FUTURES_INDEX["USD"]);
  const eurFutures = useRateData(CURRENCY_TO_FUTURES_INDEX["EUR"]);
  const gbpFutures = useRateData(CURRENCY_TO_FUTURES_INDEX["GBP"]);
  const chfFutures = useRateData(CURRENCY_TO_FUTURES_INDEX["CHF"]);
  const jpyFutures = useRateData(CURRENCY_TO_FUTURES_INDEX["JPY"]);
  
  const usdIRS = useIRSData(CURRENCY_TO_IRS_INDEX["USD"]);
  const eurIRS = useIRSData(CURRENCY_TO_IRS_INDEX["EUR"]);
  const gbpIRS = useIRSData(CURRENCY_TO_IRS_INDEX["GBP"]);
  const chfIRS = useIRSData(CURRENCY_TO_IRS_INDEX["CHF"]);
  const jpyIRS = useIRSData(CURRENCY_TO_IRS_INDEX["JPY"]);
  
  // Map currency to its data
  const currencyDataMap = useMemo(() => ({
    "USD": { futures: usdFutures, irs: usdIRS },
    "EUR": { futures: eurFutures, irs: eurIRS },
    "GBP": { futures: gbpFutures, irs: gbpIRS },
    "CHF": { futures: chfFutures, irs: chfIRS },
    "JPY": { futures: jpyFutures, irs: jpyIRS },
  }), [usdFutures, eurFutures, gbpFutures, chfFutures, jpyFutures, usdIRS, eurIRS, gbpIRS, chfIRS, jpyIRS]);
  
  // Check if any data is loading
  const isAnyLoading = usdFutures.isLoading || eurFutures.isLoading || gbpFutures.isLoading || 
    chfFutures.isLoading || jpyFutures.isLoading || usdIRS.isLoading || eurIRS.isLoading || 
    gbpIRS.isLoading || chfIRS.isLoading || jpyIRS.isLoading;
  
  const isAnyFetching = usdFutures.isFetching || eurFutures.isFetching || gbpFutures.isFetching || 
    chfFutures.isFetching || jpyFutures.isFetching || usdIRS.isFetching || eurIRS.isFetching || 
    gbpIRS.isFetching || chfIRS.isFetching || jpyIRS.isFetching;
  
  // Function to refetch all data for bootstrapping
  const refetchAllData = useCallback(() => {
    // Refetch all futures data
    usdFutures.refetch();
    eurFutures.refetch();
    gbpFutures.refetch();
    chfFutures.refetch();
    jpyFutures.refetch();
    // Refetch all IRS data
    usdIRS.refetch();
    eurIRS.refetch();
    gbpIRS.refetch();
    chfIRS.refetch();
    jpyIRS.refetch();
  }, [usdFutures, eurFutures, gbpFutures, chfFutures, jpyFutures, usdIRS, eurIRS, gbpIRS, chfIRS, jpyIRS]);
  
  // Build IRS/Futures curve for a specific currency
  const buildIRSFuturesCurve = useCallback((currency: string) => {
    const data = currencyDataMap[currency as keyof typeof currencyDataMap];
    if (!data) return null;
    
    const swapPoints: BootstrapPoint[] = [];
    const futuresPoints: BootstrapPoint[] = [];
    
    if (data.futures?.data?.data) {
      data.futures.data.data.forEach((item: FuturesData) => {
        const latestPrice = parseFloat(item.latest.replace(/[^0-9.-]/g, ""));
        if (!isNaN(latestPrice)) {
          const tenor = maturityToYears(item.maturity);
          const rate = priceToRate(latestPrice);
          if (tenor > 0 && rate > 0 && rate < 0.5) {
            futuresPoints.push({ tenor, rate, source: "futures", priority: 2 });
          }
        }
      });
    }
    
    if (data.irs?.data?.data) {
      data.irs.data.data.forEach((item: IRSData) => {
        if (item.rateValue > 0 && item.rateValue < 50) {
          swapPoints.push({ tenor: item.tenor, rate: item.rateValue / 100, source: "swap", priority: 1 });
        }
      });
    }
    
    const totalPoints = swapPoints.length + futuresPoints.length;
    if (totalPoints < 2) return null;
    
    return bootstrap(swapPoints, futuresPoints, selectedMethod, currency);
  }, [currencyDataMap, selectedMethod]);

  // Get currencies available
  const bondCurrencies = useMemo(() => {
    return [...new Set(countries.map((c: CountryBondData) => c.currency))]
      .filter(c => !MAJOR_CURRENCIES.includes(c as string))
      .sort() as string[];
  }, [countries]);
  
  const allCurrencies = [...MAJOR_CURRENCIES, ...bondCurrencies];
  
  // Build curve data
  const curvesData = useMemo(() => {
    const data: { currency: string; source: string; result: BootstrapResult | null; inputPoints: number }[] = [];
    
    // Major currencies - use IRS/Futures
    MAJOR_CURRENCIES.forEach(curr => {
      const result = buildIRSFuturesCurve(curr);
      data.push({
        currency: curr,
        source: "IRS/Futures",
        result,
        inputPoints: result?.inputPoints?.length || 0,
      });
    });
    
    return data;
  }, [buildIRSFuturesCurve]);

  const selectedCurve = selectedCurrency ? curvesData.find(c => c.currency === selectedCurrency) : null;

  // Dashboard View
  if (viewMode === "dashboard") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              All Curves - Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as BootstrapMethod)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOOTSTRAP_METHODS.slice(0, 6).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setViewMode("detail")}>
                <FileText className="w-4 h-4 mr-2" />Detail View
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={refetchAllData}
                disabled={isAnyFetching}
              >
                {isAnyFetching ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4 mr-2" />
                )}
                {isAnyFetching ? "Loading..." : "Bootstrap All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-primary/5 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This view combines <strong>IRS + Futures</strong> for major currencies (USD, EUR, GBP, CHF, JPY).
                {isAnyLoading && <span className="ml-2 text-muted-foreground">(Loading data...)</span>}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {curvesData.map((curve) => (
            <Card 
              key={curve.currency} 
              className="hover:border-primary/50 transition-colors cursor-pointer border-l-4 border-l-primary"
              onClick={() => { setSelectedCurrency(curve.currency); setViewMode("detail"); }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <Badge variant="default" className="text-lg px-3">{curve.currency}</Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {curve.source}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {curve.result ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Points:</span>
                      <span className="font-mono">{curve.inputPoints}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Max tenor:</span>
                      <span className="font-mono">
                        {Math.max(...curve.result.discountFactors.map(d => d.tenor))}Y
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">
                    Insufficient data
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Combined Chart */}
        {(() => {
          const validCurves = curvesData.filter(c => c.result);
          if (validCurves.length === 0) return null;
          
          // Create unified data structure for comparison chart
          // Collect all unique tenors from all curves
          const allTenors = new Set<number>();
          validCurves.forEach(curve => {
            curve.result!.curvePoints.forEach(p => {
              // Round to 0.25 year precision for better alignment
              const roundedTenor = Math.round(p.tenor * 4) / 4;
              allTenors.add(roundedTenor);
            });
          });
          const sortedTenors = Array.from(allTenors).sort((a, b) => a - b);
          
          // Create data points for each tenor with rates from all currencies
          const chartData = sortedTenors.map(tenor => {
            const point: Record<string, number | null | string> = { tenor };
            validCurves.forEach(curve => {
              // Find the rate for this tenor in this curve (interpolate if needed)
              const curvePoints = curve.result!.curvePoints;
              const exactPoint = curvePoints.find(p => Math.abs(p.tenor - tenor) < 0.15);
              if (exactPoint) {
                point[curve.currency] = exactPoint.rate * 100;
              } else {
                // Interpolate between nearest points
                const sortedPoints = [...curvePoints].sort((a, b) => a.tenor - b.tenor);
                const lower = sortedPoints.filter(p => p.tenor < tenor).pop();
                const upper = sortedPoints.filter(p => p.tenor > tenor).shift();
                if (lower && upper) {
                  const ratio = (tenor - lower.tenor) / (upper.tenor - lower.tenor);
                  const interpolatedRate = lower.rate + (upper.rate - lower.rate) * ratio;
                  point[curve.currency] = interpolatedRate * 100;
                } else if (lower) {
                  point[curve.currency] = lower.rate * 100;
                } else if (upper) {
                  point[curve.currency] = upper.rate * 100;
                } else {
                  point[curve.currency] = null;
                }
              }
            });
            return point;
          });
          
          // Define distinct colors for each currency
          const currencyColors: Record<string, string> = {
            'USD': '#ef4444', // red
            'EUR': '#22c55e', // green
            'GBP': '#f59e0b', // amber
            'CHF': '#06b6d4', // cyan
            'JPY': '#8b5cf6', // purple
          };
          
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Curves Comparison ({BOOTSTRAP_METHODS.find(m => m.id === selectedMethod)?.name || selectedMethod})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="tenor" 
                        tick={{ fontSize: 11 }} 
                        tickFormatter={(v) => `${Number(v).toFixed(0)}Y`}
                        type="number"
                        scale="linear"
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }} 
                        tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        formatter={(value: number | null, name: string) => {
                          if (value === null || value === undefined) return ['-', name];
                          return [`${value.toFixed(4)}%`, name];
                        }}
                        labelFormatter={(label) => `Tenor: ${Number(label).toFixed(1)}Y`}
                      />
                      <Legend />
                      {validCurves.map((curve) => (
                        <Line
                          key={curve.currency}
                          type="monotone"
                          dataKey={curve.currency}
                          name={curve.currency}
                          stroke={currencyColors[curve.currency] || '#64748b'}
                          strokeWidth={2}
                          dot={false}
                          connectNulls={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
  }
  
  // Detail View
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            All Curves - Detail View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedCurrency || "_select"} onValueChange={(v) => setSelectedCurrency(v === "_select" ? "" : v)}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Currency..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_select">Select...</SelectItem>
                {allCurrencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    <div className="flex items-center gap-2">
                      <span>{c}</span>
                      <Badge variant="outline" className="text-xs">
                        {MAJOR_CURRENCIES.includes(c) ? "IRS" : "Bonds"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as BootstrapMethod)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOOTSTRAP_METHODS.slice(0, 6).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setViewMode("dashboard")}>
              <LayoutGrid className="w-4 h-4 mr-2" />Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCurve ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="text-lg px-3">{selectedCurve.currency}</Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Source: {selectedCurve.source}
                </Badge>
                <Badge variant="secondary">{selectedCurve.inputPoints} points</Badge>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a currency to view details
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedCurve?.result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Rate Curve - {selectedCurve.currency}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedCurve.result.curvePoints.map(p => ({ tenor: p.tenor, rate: p.rate * 100 }))} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="tenor" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}Y`} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(4)}%`, 'Rate']} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Discount Factors - {selectedCurve.currency}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenor (Y)</TableHead>
                      <TableHead className="text-right">DF</TableHead>
                      <TableHead className="text-right">Zero Rate</TableHead>
                      <TableHead className="text-right">Forward Rate</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCurve.result.discountFactors.map((df, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{df.tenor.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{df.df.toFixed(8)}</TableCell>
                        <TableCell className="text-right font-mono">{(df.zeroRate * 100).toFixed(4)}%</TableCell>
                        <TableCell className="text-right font-mono">{df.forwardRate ? `${(df.forwardRate * 100).toFixed(4)}%` : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={df.source === 'swap' ? 'default' : df.source === 'futures' ? 'secondary' : 'outline'}>
                            {df.source}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Main Rate Explorer Page
export default function RateExplorer() {
  const [activeMainTab, setActiveMainTab] = useState("futures");
  const [selectedFuturesIndex, setSelectedFuturesIndex] = useState("estr3m");
  const [selectedIRSCurrency, setSelectedIRSCurrency] = useState("usd");
  
  // Fetch data
  const { data: futuresData, isLoading: futuresLoading, refetch: refetchFutures, isFetching: futuresFetching } = useRateData(selectedFuturesIndex);
  const { data: irsData, isLoading: irsLoading, refetch: refetchIRS, isFetching: irsFetching } = useIRSData(selectedIRSCurrency);
  
  // Bootstrapping state
  const [curves, setCurves] = useState<CurveConfig[]>([
    getDefaultCurveConfig(CURRENCY_CONFIGS[0]),
  ]);
  const [selectedMethods, setSelectedMethods] = useState<BootstrapMethod[]>(["linear", "cubic_spline"]);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Gov Bonds state
  const [govBondsViewMode, setGovBondsViewMode] = useState<"dashboard" | "detail">("dashboard");
  const [selectedGovBondsCurrency, setSelectedGovBondsCurrency] = useState<string>("");
  const [selectedGovBondsCountry, setSelectedGovBondsCountry] = useState<CountryBondData | null>(null);
  const [govBondsActiveTab, setGovBondsActiveTab] = useState<'table' | 'chart'>('table');
  
  // Bonds Curve state
  const [bondsCurveViewMode, setBondsCurveViewMode] = useState<"dashboard" | "detail">("dashboard");
  const [bondsCurveCurrency, setBondsCurveCurrency] = useState<string>("");
  const [bondsCurveCountry, setBondsCurveCountry] = useState<string>("");
  const [bondsCurveMethods, setBondsCurveMethods] = useState<BootstrapMethod[]>(["linear", "cubic_spline"]);
  
  // All Curves state
  const [allCurvesMethod, setAllCurvesMethod] = useState<BootstrapMethod>("linear");
  const [allCurvesViewMode, setAllCurvesViewMode] = useState<"dashboard" | "detail">("dashboard");
  const [allCurvesSelectedCurrency, setAllCurvesSelectedCurrency] = useState<string>("");
  
  // Bonds data hooks
  const { data: countriesData, isLoading: isLoadingCountries, refetch: refetchCountries, isFetching: countriesFetching } = useCountriesBonds();
  const { data: yieldsData, isLoading: isLoadingYields, refetch: refetchYields } = useCountryYields(selectedGovBondsCountry?.countrySlug || bondsCurveCountry || '');

  const activeCurve = curves[0];

  // Map queries for bootstrapping
  const futuresQuery = useRateData(activeCurve.futuresIndex);
  const irsQuery = useIRSData(activeCurve.irsCurrency);

  // Build bootstrap results
  const curveResults = useMemo(() => {
    return curves.map((curve) => {
      const currentFuturesData = curve.id === curves[0].id ? futuresQuery.data : null;
      const currentIRSData = curve.id === curves[0].id ? irsQuery.data : null;
      const isLoading = curve.id === curves[0].id ? (futuresQuery.isLoading || irsQuery.isLoading) : true;

      const swapPoints: BootstrapPoint[] = [];
      const futuresPoints: BootstrapPoint[] = [];

      if (curve.useFutures && currentFuturesData?.data) {
        currentFuturesData.data.forEach((item) => {
          const latestPrice = parseFloat(item.latest.replace(/[^0-9.-]/g, ""));
          if (!isNaN(latestPrice)) {
            const tenor = maturityToYears(item.maturity);
            const rate = priceToRate(latestPrice);
            if (tenor > 0 && rate > 0 && rate < 0.5) {
              futuresPoints.push({ tenor, rate, source: "futures", priority: 2 });
            }
          }
        });
      }

      if (curve.useIRS && currentIRSData?.data) {
        currentIRSData.data.forEach((item) => {
          if (item.rateValue > 0 && item.rateValue < 50) {
            swapPoints.push({ tenor: item.tenor, rate: item.rateValue / 100, source: "swap", priority: 1 });
          }
        });
      }

      const allInputPoints = [...swapPoints, ...futuresPoints].sort((a, b) => a.tenor - b.tenor);
      const results: BootstrapResult[] = 
        swapPoints.length === 0 && futuresPoints.length === 0 
          ? [] 
          : selectedMethods.map((method) => bootstrap(swapPoints, futuresPoints, method, curve.currency));

      return { curve, swapPoints, futuresPoints, allInputPoints, results, isLoading, basisConvention: getBasisConvention(curve.currency) };
    });
  }, [curves, futuresQuery.data, irsQuery.data, selectedMethods, futuresQuery.isLoading, irsQuery.isLoading]);

  const toggleMethod = (method: BootstrapMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleExportCSV = (result: BootstrapResult) => {
    const csv = exportToCSV(result);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discount_factors_${result.method}_${result.currency}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Discount factors exportés en CSV");
  };

  const handleClearCache = () => {
    clearAllCache();
    toast.success("Cache vidé - les données seront rafraîchies");
    refetchFutures();
    refetchIRS();
  };

  const activeResult = curveResults[0];
  const selectedRateIndex = RATE_INDICES.find(r => r.id === selectedFuturesIndex);
  const selectedIRSIndex = IRS_INDICES.find(i => i.id === selectedIRSCurrency);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-primary">Rate</span> Explorer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Interest rate futures, IRS curves, and yield curve bootstrapping
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <Database className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="futures">
              <TrendingUp className="w-4 h-4 mr-2" />
              Rate Futures
            </TabsTrigger>
            <TabsTrigger value="irs">
              <LineChartIcon className="w-4 h-4 mr-2" />
              IRS Swaps
            </TabsTrigger>
            <TabsTrigger value="bootstrapping">
              <Calculator className="w-4 h-4 mr-2" />
              Bootstrapping
            </TabsTrigger>
            <TabsTrigger value="govbonds">
              <Globe className="w-4 h-4 mr-2" />
              Gov Bonds
            </TabsTrigger>
            <TabsTrigger value="bondscurve">
              <Landmark className="w-4 h-4 mr-2" />
              Bonds Curve
            </TabsTrigger>
            <TabsTrigger value="allcurves">
              <Layers className="w-4 h-4 mr-2" />
              All Curves
            </TabsTrigger>
          </TabsList>

          {/* Rate Futures Tab */}
          <TabsContent value="futures" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Rate Index Selection */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Rate Index
                </h3>
                <div className="space-y-2">
                  {RATE_INDICES.map((rate) => (
                    <RateCard
                      key={rate.id}
                      rate={rate}
                      isSelected={selectedFuturesIndex === rate.id}
                      onClick={() => setSelectedFuturesIndex(rate.id)}
                      isLoading={futuresLoading && selectedFuturesIndex === rate.id}
                    />
                  ))}
                </div>
              </div>

              {/* Data Display */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {currencyFlags[selectedRateIndex?.currency || ""] || "🌍"}
                        {selectedRateIndex?.name}
                      </CardTitle>
                      <CardDescription>{selectedRateIndex?.description}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchFutures()}
                      disabled={futuresFetching}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${futuresFetching ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {futuresData?.lastUpdated && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <Clock className="w-3 h-3" />
                        Last updated: {new Date(futuresData.lastUpdated).toLocaleString()}
                      </div>
                    )}
                    <Tabs defaultValue="table">
                      <TabsList className="mb-4">
                        <TabsTrigger value="table" className="flex items-center gap-2">
                          <TableIcon className="h-4 w-4" />
                          Table
                        </TabsTrigger>
                        <TabsTrigger value="chart" className="flex items-center gap-2">
                          <LineChartIcon className="h-4 w-4" />
                          Curve
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="table">
                        <EditableRateTable 
                          data={futuresData?.data || []} 
                          isLoading={futuresLoading || futuresFetching} 
                        />
                      </TabsContent>
                      <TabsContent value="chart">
                        <RateCurveChart data={futuresData?.data || []} showEffectiveRate={true} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* IRS Swaps Tab */}
          <TabsContent value="irs" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Interest Rate Swaps</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedIRSIndex?.description} - Live rates from Investing.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedIRSCurrency} onValueChange={setSelectedIRSCurrency}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IRS_INDICES.map((index) => (
                        <SelectItem key={index.id} value={index.id}>
                          {currencyFlags[index.currency]} {index.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => refetchIRS()} disabled={irsFetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${irsFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {irsData?.lastUpdated && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Last updated: {new Date(irsData.lastUpdated).toLocaleString()}
                  </p>
                )}
                <Tabs defaultValue="table">
                  <TabsList className="mb-4">
                    <TabsTrigger value="table" className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="chart" className="flex items-center gap-2">
                      <LineChartIcon className="h-4 w-4" />
                      Swap Curve
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="table">
                    <IRSTable data={irsData?.data || []} isLoading={irsLoading || irsFetching} />
                  </TabsContent>
                  <TabsContent value="chart">
                    <IRSCurveChart data={irsData?.data || []} currency={selectedIRSCurrency.toUpperCase()} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bootstrapping Tab */}
          <TabsContent value="bootstrapping" className="space-y-6">
            {/* Configuration */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Configuration du Bootstrapping
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setComparisonMode(!comparisonMode)}>
                    <Layers className="w-4 h-4 mr-2" />
                    {comparisonMode ? "Mode Comparaison" : "Comparer"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearCache}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Vider Cache
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Curve Configuration */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Courbe de Taux
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select 
                        value={activeCurve.currency} 
                        onValueChange={(value) => {
                          const config = CURRENCY_CONFIGS.find(c => c.currency === value);
                          if (config) {
                            setCurves([getDefaultCurveConfig(config)]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_CONFIGS.map((config) => (
                            <SelectItem key={config.currency} value={config.currency}>
                              {currencyFlags[config.currency]} {config.currency} - {config.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Futures Index</Label>
                      <Select 
                        value={activeCurve.futuresIndex}
                        onValueChange={(value) => {
                          setCurves(curves.map(c => c.id === activeCurve.id ? { ...c, futuresIndex: value } : c));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATE_INDICES.map((idx) => (
                            <SelectItem key={idx.id} value={idx.id}>
                              {idx.name} ({idx.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>IRS Currency</Label>
                      <Select 
                        value={activeCurve.irsCurrency}
                        onValueChange={(value) => {
                          setCurves(curves.map(c => c.id === activeCurve.id ? { ...c, irsCurrency: value } : c));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IRS_INDICES.map((idx) => (
                            <SelectItem key={idx.id} value={idx.id}>
                              {idx.name} ({idx.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="useFutures" 
                        checked={activeCurve.useFutures}
                        onCheckedChange={(checked) => {
                          setCurves(curves.map(c => c.id === activeCurve.id ? { ...c, useFutures: checked === true } : c));
                        }}
                      />
                      <Label htmlFor="useFutures">Use Futures</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="useIRS" 
                        checked={activeCurve.useIRS}
                        onCheckedChange={(checked) => {
                          setCurves(curves.map(c => c.id === activeCurve.id ? { ...c, useIRS: checked === true } : c));
                        }}
                      />
                      <Label htmlFor="useIRS">Use IRS Swaps</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Badge variant="default">
                      {activeResult?.swapPoints.length || 0} swaps
                    </Badge>
                    <Badge variant="secondary">
                      {activeResult?.futuresPoints.length || 0} futures
                    </Badge>
                  </div>
                </div>

                {/* Methods Selection */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Méthodes de Bootstrapping
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-primary uppercase">Standard</h4>
                      {BOOTSTRAP_METHODS.filter(m => m.category === 'standard').map((method) => (
                        <div key={method.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={method.id}
                            checked={selectedMethods.includes(method.id)}
                            onCheckedChange={() => toggleMethod(method.id)}
                          />
                          <div className="grid gap-0.5">
                            <Label htmlFor={method.id} className="font-medium text-sm">{method.name}</Label>
                            <p className="text-xs text-muted-foreground leading-tight">{method.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-blue-500 uppercase">Bloomberg</h4>
                      {BOOTSTRAP_METHODS.filter(m => m.category === 'bloomberg').map((method) => (
                        <div key={method.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={method.id}
                            checked={selectedMethods.includes(method.id)}
                            onCheckedChange={() => toggleMethod(method.id)}
                          />
                          <div className="grid gap-0.5">
                            <Label htmlFor={method.id} className="font-medium text-sm">{method.name}</Label>
                            <p className="text-xs text-muted-foreground leading-tight">{method.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-green-500 uppercase">QuantLib</h4>
                      {BOOTSTRAP_METHODS.filter(m => m.category === 'quantlib').map((method) => (
                        <div key={method.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={method.id}
                            checked={selectedMethods.includes(method.id)}
                            onCheckedChange={() => toggleMethod(method.id)}
                          />
                          <div className="grid gap-0.5">
                            <Label htmlFor={method.id} className="font-medium text-sm">{method.name}</Label>
                            <p className="text-xs text-muted-foreground leading-tight">{method.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Convention Display */}
                {activeResult && (
                  <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Convention ({activeCurve.currency}):</span>
                      <Badge variant="outline">{activeResult.basisConvention.dayCount}</Badge>
                      <Badge variant="outline">{activeResult.basisConvention.compounding}</Badge>
                      <Badge variant="outline">{activeResult.basisConvention.paymentFrequency}x/an</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {activeResult && activeResult.allInputPoints.length >= 2 ? (
              <Tabs defaultValue="chart" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="chart">Courbes</TabsTrigger>
                  <TabsTrigger value="discount_factors">Discount Factors</TabsTrigger>
                  <TabsTrigger value="input_data">Données d'entrée</TabsTrigger>
                </TabsList>

                <TabsContent value="chart">
                  <Card>
                    <CardHeader>
                      <CardTitle>Courbes de Taux Bootstrappées ({activeCurve.currency})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="tenor" 
                              type="number"
                              domain={['auto', 'auto']}
                              tick={{ fill: 'hsl(var(--foreground))' }}
                              label={{ value: 'Tenor (Years)', position: 'bottom', fill: 'hsl(var(--foreground))' }}
                            />
                            <YAxis 
                              tick={{ fill: 'hsl(var(--foreground))' }}
                              tickFormatter={(value) => `${(value * 100).toFixed(2)}%`}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover border rounded-lg shadow-lg p-3">
                                      {payload.map((p: any, i: number) => (
                                        <p key={i} className="text-sm">
                                          <span style={{ color: p.color }}>{p.name}</span>: 
                                          <span className="font-mono ml-1">{(p.value * 100).toFixed(4)}%</span>
                                        </p>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                            {activeResult.results.map((result, idx) => {
                              const colors = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(262, 83%, 58%)', 'hsl(24, 95%, 53%)'];
                              return (
                                <Line
                                  key={result.method}
                                  type="monotone"
                                  data={result.curvePoints}
                                  dataKey="rate"
                                  name={BOOTSTRAP_METHODS.find(m => m.id === result.method)?.name || result.method}
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth={2}
                                  dot={false}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="discount_factors" className="space-y-4">
                  {activeResult.results.map((result) => (
                    <Card key={result.method}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {BOOTSTRAP_METHODS.find((m) => m.id === result.method)?.name}
                            <Badge variant="outline" className="ml-2">{result.currency}</Badge>
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              ({result.basisConvention.dayCount}, {result.basisConvention.compounding})
                            </span>
                          </CardTitle>
                          {result.parameters && (
                            <p className="text-xs text-muted-foreground mt-1">
                              β₀={result.parameters.beta0.toFixed(4)}, 
                              β₁={result.parameters.beta1.toFixed(4)}, 
                              β₂={result.parameters.beta2.toFixed(4)}, 
                              λ={result.parameters.lambda.toFixed(4)}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExportCSV(result)}>
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tenor (Y)</TableHead>
                                <TableHead className="text-right">Discount Factor</TableHead>
                                <TableHead className="text-right">Zero Rate (%)</TableHead>
                                <TableHead className="text-right">Forward Rate (%)</TableHead>
                                <TableHead>Source</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.discountFactors.slice(0, 20).map((df, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono">{df.tenor.toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-mono">{df.df.toFixed(8)}</TableCell>
                                  <TableCell className="text-right font-mono">{(df.zeroRate * 100).toFixed(4)}%</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {df.forwardRate ? `${(df.forwardRate * 100).toFixed(4)}%` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={df.source === 'swap' ? 'default' : df.source === 'futures' ? 'secondary' : 'outline'}>
                                      {df.source}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="input_data">
                  <Card>
                    <CardHeader>
                      <CardTitle>Points de Données d'Entrée</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Swaps</strong> = Points de calibration exacts (forcés) | 
                          <strong> Futures</strong> = Guides entre swaps (ajustés si nécessaire)
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tenor (Y)</TableHead>
                              <TableHead className="text-right">Taux (%)</TableHead>
                              <TableHead className="text-center">Source</TableHead>
                              <TableHead className="text-center">Priorité</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeResult.allInputPoints.map((point, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{point.tenor.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">{(point.rate * 100).toFixed(4)}%</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={point.source === "swap" ? "default" : "secondary"}>
                                    {point.source === "swap" ? "Swap" : "Futures"}
                                    {point.adjusted && " (adj)"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={point.priority === 1 ? "font-bold text-primary" : "text-muted-foreground"}>
                                    {point.priority === 1 ? "Calibration" : "Guide"}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {activeResult?.isLoading 
                      ? "Chargement des données..." 
                      : "Sélectionnez au moins une source de données pour effectuer le bootstrapping"
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Gov Bonds Tab */}
          <TabsContent value="govbonds" className="space-y-6">
            <GovBondsContent
              countriesData={countriesData}
              yieldsData={yieldsData}
              isLoadingCountries={isLoadingCountries}
              isLoadingYields={isLoadingYields}
              countriesFetching={countriesFetching}
              refetchCountries={refetchCountries}
              refetchYields={refetchYields}
              viewMode={govBondsViewMode}
              setViewMode={setGovBondsViewMode}
              selectedCurrency={selectedGovBondsCurrency}
              setSelectedCurrency={setSelectedGovBondsCurrency}
              selectedCountry={selectedGovBondsCountry}
              setSelectedCountry={setSelectedGovBondsCountry}
              activeTab={govBondsActiveTab}
              setActiveTab={setGovBondsActiveTab}
            />
          </TabsContent>

          {/* Bonds Curve Tab */}
          <TabsContent value="bondscurve" className="space-y-6">
            <BondsCurveContent
              countriesData={countriesData}
              yieldsData={yieldsData}
              isLoadingCountries={isLoadingCountries}
              isLoadingYields={isLoadingYields}
              countriesFetching={countriesFetching}
              refetchCountries={refetchCountries}
              refetchYields={refetchYields}
              viewMode={bondsCurveViewMode}
              setViewMode={setBondsCurveViewMode}
              selectedCurrency={bondsCurveCurrency}
              setSelectedCurrency={setBondsCurveCurrency}
              selectedCountry={bondsCurveCountry}
              setSelectedCountry={setBondsCurveCountry}
              selectedMethods={bondsCurveMethods}
              setSelectedMethods={setBondsCurveMethods}
            />
          </TabsContent>

          {/* All Curves Tab */}
          <TabsContent value="allcurves" className="space-y-6">
            <AllCurvesContent
              countriesData={countriesData}
              isLoadingCountries={isLoadingCountries}
              countriesFetching={countriesFetching}
              refetchCountries={refetchCountries}
              selectedMethod={allCurvesMethod}
              setSelectedMethod={setAllCurvesMethod}
              viewMode={allCurvesViewMode}
              setViewMode={setAllCurvesViewMode}
              selectedCurrency={allCurvesSelectedCurrency}
              setSelectedCurrency={setAllCurvesSelectedCurrency}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

