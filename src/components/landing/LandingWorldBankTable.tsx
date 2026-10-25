import { useMemo, useState } from "react";
import { Search, SortAsc, SortDesc, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorldBankCommodity } from "@/services/worldBankApi";

type SortField = "name" | "currentValue" | "changePercent" | "category";
type SortDirection = "asc" | "desc";

interface LandingWorldBankTableProps {
  commodities: WorldBankCommodity[];
  loading?: boolean;
}

function formatValue(value: number, unit: string) {
  if (unit.includes("$") || unit.toLowerCase().includes("usd")) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (unit.includes("%")) return `${value.toFixed(2)}%`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function LandingWorldBankTable({
  commodities,
  loading = false,
}: LandingWorldBankTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return commodities
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av: string | number = a[sortField] as string | number;
        let bv: string | number = b[sortField] as string | number;
        if (sortField === "currentValue") {
          av = a.currentValue ?? 0;
          bv = b.currentValue ?? 0;
        } else if (sortField === "changePercent") {
          av = a.changePercent ?? 0;
          bv = b.changePercent ?? 0;
        } else if (typeof av === "string") {
          av = av.toLowerCase();
          bv = String(bv).toLowerCase();
        }
        if (av < bv) return sortDirection === "asc" ? -1 : 1;
        if (av > bv) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [commodities, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <SortAsc className="h-3.5 w-3.5 text-[#8c947b]" />;
    }
    return sortDirection === "asc" ? (
      <SortAsc className="h-3.5 w-3.5 text-[#aef833]" />
    ) : (
      <SortDesc className="h-3.5 w-3.5 text-[#aef833]" />
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border border-[#424a35]/25 bg-[#070e1d]/40">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#aef833] border-t-transparent" />
          <p className="font-headline text-xs uppercase tracking-widest text-[#8c947b]">
            Loading monthly prices…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c947b]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search commodity, symbol, category…"
            className="w-full border border-[#424a35]/35 bg-[#070e1d]/60 py-2.5 pl-10 pr-3 font-sans text-sm text-white placeholder:text-[#8c947b] outline-none focus:border-[#aef833]/40"
          />
        </div>
        <p className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
          Showing {rows.length} of {commodities.length}
        </p>
      </div>

      <div className="overflow-x-auto border border-[#424a35]/25">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#424a35]/40 bg-[#070e1d]/80">
              {(
                [
                  ["name", "Commodity"],
                  ["category", "Category"],
                  ["currentValue", "Monthly price"],
                  ["changePercent", "MoM change"],
                ] as const
              ).map(([field, label]) => (
                <th key={field} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort(field)}
                    className="inline-flex items-center gap-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]"
                  >
                    {label}
                    <SortIcon field={field} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]">
                History
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#8c947b]">
                  No commodities match your search.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const up = (c.changePercent ?? 0) > 0;
                const down = (c.changePercent ?? 0) < 0;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[#424a35]/15 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="font-mono text-[11px] text-[#8c947b]">{c.symbol}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-[#424a35]/40 px-2 py-0.5 font-headline text-[9px] font-bold uppercase tracking-widest text-[#c1caaf]">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">
                        {c.currentValue != null
                          ? formatValue(c.currentValue, c.unit)
                          : "—"}
                      </div>
                      {c.unit ? (
                        <div className="text-[11px] text-[#8c947b]">{c.unit}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {c.changePercent != null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 font-medium",
                            up && "text-[#aef833]",
                            down && "text-red-400",
                            !up && !down && "text-[#8c947b]",
                          )}
                        >
                          {up ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : down ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          {up ? "+" : ""}
                          {c.changePercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-[#8c947b]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#8c947b]">
                      {c.data.length.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
