import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import LandingNav from "@/components/LandingNav";
import { BrandLogo } from "@/components/BrandLogo";
import { LandingLegalLinks } from "@/components/LandingLegalLinks";
import { LandingWorldBankTable } from "@/components/landing/LandingWorldBankTable";
import WorldBankChart from "@/components/WorldBankChart";
import WorldBankHistoricalData from "@/components/WorldBankHistoricalData";
import { BRAND } from "@/constants/branding";
import {
  fetchWorldBankData,
  refreshWorldBankData,
  WORLD_BANK_CATEGORIES,
  type WorldBankCommodity,
  type WorldBankData,
} from "@/services/worldBankApi";
import "@/styles/landing-terminal.css";

type TabId = "table" | "chart" | "historical";

const CommodityPrices: React.FC = () => {
  const [commodities, setCommodities] = useState<WorldBankCommodity[]>([]);
  const [meta, setMeta] = useState<WorldBankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [tab, setTab] = useState<TabId>("table");

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = force ? await refreshWorldBankData() : await fetchWorldBankData();
      if (data?.commodities?.length && !data.isDefault) {
        setCommodities(data.commodities);
        setMeta(data);
      } else {
        setCommodities([]);
        setMeta(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prices");
      setCommodities([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  const categories = useMemo(() => {
    const order = [
      WORLD_BANK_CATEGORIES.ENERGY,
      WORLD_BANK_CATEGORIES.AGRICULTURAL,
      WORLD_BANK_CATEGORIES.METALS,
      WORLD_BANK_CATEGORIES.FERTILIZERS,
    ];
    return order.filter((cat) => commodities.some((c) => c.category === cat));
  }, [commodities]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return commodities;
    return commodities.filter((c) => c.category === activeCategory);
  }, [commodities, activeCategory]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "table", label: "Data table" },
    { id: "chart", label: "Chart" },
    { id: "historical", label: "Historical" },
  ];

  return (
    <div className="landing-terminal-root dark min-h-screen overflow-x-hidden bg-[#0c1322] font-sans text-[#dce2f7]">
      <LandingNav />

      <main className="pt-[3.5rem] sm:pt-[4.5rem] md:pt-[5.5rem]">
        <section className="px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
              Market data
            </p>
            <h1 className="mb-4 font-headline text-4xl font-bold uppercase tracking-tighter text-white sm:text-5xl md:text-6xl">
              Commodity prices
            </h1>
            <p className="mb-6 max-w-3xl text-base font-light leading-relaxed text-[#c1caaf] sm:text-lg">
              Monthly World Bank Pink Sheet (CMO) prices for energy, metals, agriculture and
              fertilizers — shared free snapshot for desks that need a clean historical reference
              before building hedges.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-[#aef833]/35 bg-[#aef833]/10 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]">
                Monthly data
              </span>
              {meta?.periodLabel ? (
                <span className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
                  CMO period · {meta.periodLabel}
                </span>
              ) : null}
              {meta?.lastUpdated ? (
                <span className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
                  Updated{" "}
                  {meta.lastUpdated.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={loading}
                className="ml-auto inline-flex items-center gap-2 border border-[#424a35]/40 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-[#aef833]/40 hover:text-[#aef833] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="border-t border-[#424a35]/15 px-4 pb-20 sm:px-6 md:px-12">
          <div className="mx-auto max-w-5xl space-y-8">
            {error ? (
              <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {!loading && !error && commodities.length === 0 ? (
              <div className="landing-glass-card rounded-sm p-8 text-center sm:p-12">
                <h2 className="mb-3 font-headline text-xl font-bold uppercase tracking-tight text-white">
                  Monthly snapshot not loaded yet
                </h2>
                <p className="mb-6 text-sm text-[#c1caaf]">
                  The shared World Bank CMO cache is empty. Try refresh, or check back after the
                  monthly sync.
                </p>
                <button
                  type="button"
                  onClick={() => void load(true)}
                  className="landing-btn-industrial landing-industrial-gradient px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#213600]"
                >
                  Refresh from database
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={
                      activeCategory === "all"
                        ? "bg-[#aef833] px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-[#213600]"
                        : "border border-[#424a35]/40 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-[#c1caaf] hover:border-[#aef833]/40 hover:text-white"
                    }
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={
                        activeCategory === cat
                          ? "bg-[#aef833] px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-[#213600]"
                          : "border border-[#424a35]/40 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest text-[#c1caaf] hover:border-[#aef833]/40 hover:text-white"
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div
                  role="tablist"
                  aria-label="Commodity price views"
                  className="flex flex-wrap gap-1 border-b border-[#424a35]/25"
                >
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={
                        tab === t.id
                          ? "-mb-px border-b-2 border-[#aef833] px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-white"
                          : "px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#8c947b] hover:text-white"
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div role="tabpanel" className="min-h-[20rem]">
                  {tab === "table" ? (
                    <LandingWorldBankTable commodities={filtered} loading={loading} />
                  ) : null}
                  {tab === "chart" ? (
                    <div className="landing-glass-card overflow-hidden rounded-sm bg-white/95 p-2 text-slate-900 sm:p-4">
                      <WorldBankChart commodities={filtered} loading={loading} />
                    </div>
                  ) : null}
                  {tab === "historical" ? (
                    <div className="landing-glass-card overflow-hidden rounded-sm bg-white/95 p-2 text-slate-900 sm:p-4">
                      <WorldBankHistoricalData commodities={filtered} loading={loading} />
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 border-t border-[#424a35]/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-sm font-light text-[#8c947b]">
                    Source: World Bank Commodity Markets Outlook — Historical Data Monthly (Pink
                    Sheet). Figures are monthly averages, not live ticks. Use CommoHedge to price
                    hedges on top of this context.
                  </p>
                  <Link
                    to="/request-access"
                    className="landing-btn-industrial landing-industrial-gradient inline-flex shrink-0 items-center justify-center px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#213600] transition-transform hover:scale-[1.02]"
                  >
                    Request access
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#424a35]/15 px-4 py-10 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <BrandLogo
              variant="dark"
              decorative
              className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] p-1.5"
            />
            <span className="font-headline text-sm font-bold uppercase tracking-widest text-white">
              {BRAND.name}
            </span>
          </Link>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <LandingLegalLinks />
            <p className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
              {BRAND.copyrightLine}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CommodityPrices;
