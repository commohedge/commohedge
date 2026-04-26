import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { ChevronDown, ChevronUp, Facebook, Linkedin, Star } from "lucide-react";
import { BRAND } from "@/constants/branding";
import "@/styles/landing-terminal.css";
import { Commodity, CommodityCategory, fetchCommoditiesData, refreshCommoditiesData } from "@/services/commodityApi";

/** Hero & vertical imagery — same AIDA assets as Stitch reference */
const TERMINAL_MEDIA = {
  heroShip:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCuEhC50BEWuEWOPEu1BudGrvrwxoqvYnHL1HtvEDz36nq2XPCXUBbRmTI-EBpqO441jpY5RSAU4wqkDIKi70EUEpd5wC9KtFfGAjS9Dp_9Ic9pFTRMNPEnuNltgI6oQhFnHYQbb9zqMvEOa6vHAWIrERZoNAdD6wVG9nw3l1j-dtOV-Wwow8YZmEDU0IxsHHkohB4BrMiG_RbWRSfPok6ihz-8ouiSd53LLYdwZQRrxpIhBUtVeG0zNzhsywK25PZS2O-8YczYI5w",
  oilEnergy:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCrAQq5e66aCxl8rdzPpHC0hJC0X4P5iEVwr6HXfGIx_Iqo7elg3rNukPHdp88nekfwDbejuZ21lvdJiO1afk2VROAeL4pkWH9ItVPV61NP8uuIsDGUZEqTc6G-JyYWwhzVjt4KwFGfhJN66Ity_SRX4qdvUbNKposso9V_nVo26--aVRLr2qKe6EAbuB3AnR67yuSE-WuRP5LRxrY_2aQYLaqhjJCDxtmttz59qCVvbhdHxuCGVrWLOdze3EdS9rn1xaw2Bd1__f0",
  metals:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDeVagyv05ckksEg4sK3D8EeI074iSx6deq8hWEf_agdj7uQezgnYCSXYhdTZ6BoZPvzdYi6DPBOo-oR_s4Gvhb9-a9W8aC-77zx8w4sLLOidmQ00JL9Kqb6yO5ch2BTvEbsGrLuj1cpycjmHTRaMHhRZgknzA-kzlJ_Z1CuWo3IJyQZTFYbCBVY_qLOPiWz1uayWHtGQBabMG86XsWlBbZTAA3NNmFNvgnJ6V93YM35Meigl9JxdDAKwQ7vldUJDKoIW1G4XSxtdo",
  agriculture:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBTWMBAAzH1ePz3k71pr1G20fga_tUi8hJ25KKlWg7bZRkkzp07YXQ9xeCX2IDkDbPwCkyooI6UbmQxAKehXU72hmNDYZpUMx5TNZzHjvEiUFTH4rpn9FXMH6kEJzO3NDiFCIkbhQKrxDcT0q_PrZlCe2POHL20WgIZQyd_Ahli1wZcidHA3n3qh9XwJzEqnhJkOAs0nXjl2gJ3L1wPEAdS1yf36SGBenLzrpa8wDPLH2E4Qg87O9436KmPajwM0TEa97-nWy1BdNs",
} as const;

const LANDING_SCREENSHOTS = {
  pricers: "/landing-page/{643F46F8-1E4F-42EC-80D5-6F11AFC3C863}.png",
  exposures: "/landing-page/{907F8717-005A-4D82-A8EB-1297751D649D}.png",
  strategyBuilder: "/landing-page/{D85B4F5E-E1E0-46D1-859F-6225E4FEEC9B}.png",
} as const;

type LandingTickerItem = { label: string; value: string; change: string; up: boolean };

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M18.901 2H21.86l-6.46 7.388L23 22h-6.172l-4.83-6.284L6.5 22H1.5l6.91-7.913L1 2h6.33l4.37 5.72L18.901 2Zm-1.08 18.16h1.64L7.21 3.74H5.45l12.37 16.42Z" />
  </svg>
);

const FALLBACK_TICKER_ITEMS: LandingTickerItem[] = [
  { label: "WTI", value: "—", change: "—", up: true },
  { label: "Brent", value: "—", change: "—", up: true },
  { label: "Baltic (freight)", value: "—", change: "—", up: true },
  { label: "VLSFO Singapore", value: "—", change: "—", up: true },
  { label: "Iron ore", value: "—", change: "—", up: true },
];

function formatLandingValue(c: Commodity): string {
  const price = Number.isFinite(c.price) ? c.price : NaN;
  if (!Number.isFinite(price)) return "—";

  const ccy = (c.currency || "").toUpperCase();
  const n = price.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (!ccy || ccy === "USD") return `$${n}`;
  return `${n} ${ccy}`;
}

function formatLandingChange(c: Commodity): { text: string; up: boolean } {
  const pct = Number.isFinite(c.percentChange) ? c.percentChange : NaN;
  if (!Number.isFinite(pct)) return { text: "—", up: true };
  const up = pct >= 0;
  const abs = Math.abs(pct).toFixed(2);
  return { text: `${up ? "+" : "-"}${abs}%`, up };
}

function norm(s: string) {
  return (s || "").toLowerCase();
}

function isRenderableCommodity(c: Commodity, category: CommodityCategory): boolean {
  const price = Number.isFinite(c.price) ? c.price : NaN;
  if (!Number.isFinite(price)) return false;
  if (category === "freight") return price >= 0;
  return price > 0;
}

function scoreCommodityMatch(c: Commodity, tokens: string[]): number {
  const hay = `${norm(c.symbol)} ${norm(c.name)}`;
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (hay.includes(t)) score += 2;
  }
  // small boost for obvious symbol prefixes
  const sym = (c.symbol || "").toUpperCase();
  if (tokens.some((t) => sym.includes(t.toUpperCase()))) score += 1;
  return score;
}

function pickBestCommodity(rows: Commodity[], category: CommodityCategory, tokens: string[]): Commodity | null {
  const usable = rows.filter((r) => isRenderableCommodity(r, category));
  if (usable.length === 0) return null;

  let best: Commodity | null = null;
  let bestScore = -1;
  for (const r of usable) {
    const sc = scoreCommodityMatch(r, tokens);
    if (sc > bestScore) {
      bestScore = sc;
      best = r;
    }
  }

  // If we couldn't match tokens, fall back to first usable row (still real data from Commodity Market feed).
  return bestScore > 0 ? best : usable[0];
}

function pickBestCommodityExcluding(
  rows: Commodity[],
  category: CommodityCategory,
  tokens: string[],
  exclude: Commodity | null
): Commodity | null {
  if (!exclude) return pickBestCommodity(rows, category, tokens);
  const filtered = rows.filter((r) => r.symbol !== exclude.symbol || r.name !== exclude.name);
  return pickBestCommodity(filtered, category, tokens);
}

async function loadCommodityCategoryRows(category: CommodityCategory): Promise<Commodity[]> {
  const first = await fetchCommoditiesData(category, false);
  const usableFirst = first.filter((r) => isRenderableCommodity(r, category));
  if (usableFirst.length > 0) return first;

  // Cache can be empty/invalid; force refresh like the Commodity Market "Refresh" button.
  try {
    return await refreshCommoditiesData(category);
  } catch {
    return first;
  }
}

function TickerRow({ runId, items }: { runId: string; items: LandingTickerItem[] }) {
  return (
    <>
      {items.map((item) => (
        <div key={`${runId}-${item.label}`} className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase text-[#c1caaf]">{item.label}</span>
          <span className="font-headline text-sm font-medium text-white">{item.value}</span>
          <span className={`text-[10px] ${item.up ? "text-[#aef833]" : "text-red-400"}`}>{item.change}</span>
        </div>
      ))}
    </>
  );
}

function useLandingReveal() {
  useEffect(() => {
    const root = document.querySelector(".landing-terminal-root");
    if (!root) return;
    const els = root.querySelectorAll(".landing-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-reveal-active");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useHeroParallax(heroImgRef: React.RefObject<HTMLImageElement | null>) {
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const img = heroImgRef.current;
      if (img) {
        img.style.transform = `scale(1.1) translateY(${scrolled * 0.4}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroImgRef]);
}

function AccuracyCounter() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        let start = 90.0;
        const end = 99.98;
        const duration = 2000;
        const startTime = performance.now();
        const tick = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const currentVal = (start + (end - start) * progress).toFixed(2);
          el.textContent = `${currentVal}%`;
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <p ref={ref} className="font-headline text-3xl font-bold tabular-nums text-[#aef833]">
      90.00%
    </p>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const heroImgRef = useRef<HTMLImageElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tickerItems, setTickerItems] = useState<LandingTickerItem[]>(FALLBACK_TICKER_ITEMS);

  useLandingReveal();
  useHeroParallax(heroImgRef);

  useEffect(() => {
    let cancelled = false;

    const loadTicker = async () => {
      try {
        // Same pipeline as Commodity Market, but resilient to empty localStorage caches.
        const [energy, freight, bunker, metals] = await Promise.all([
          loadCommodityCategoryRows("energy"),
          loadCommodityCategoryRows("freight"),
          loadCommodityCategoryRows("bunker"),
          loadCommodityCategoryRows("metals"),
        ]);

        const wti =
          pickBestCommodity(energy, "energy", ["wti", "crude", "light", "cl"]) ||
          pickBestCommodity(energy, "energy", ["nymex", "oil"]);

        const brent =
          pickBestCommodityExcluding(energy, "energy", ["brent", "brn", "ice", "north sea"], wti) ||
          null;

        const baltic =
          pickBestCommodity(freight, "freight", ["baltic", "bdiy", "dry"]) ||
          pickBestCommodity(freight, "freight", ["freight", "route", "container"]);

        const vlsfoSingapore =
          pickBestCommodity(bunker, "bunker", ["vlsfo", "singapore", "sg"]) ||
          pickBestCommodity(bunker, "bunker", ["vlsfo"]);

        const ironOre =
          pickBestCommodity(metals, "metals", ["iron ore", "62", "fe", "tio", "ore"]) ||
          pickBestCommodity(metals, "metals", ["steel"]);

        const next: LandingTickerItem[] = [
          wti
            ? (() => {
                const chg = formatLandingChange(wti);
                return { label: "WTI", value: formatLandingValue(wti), change: chg.text, up: chg.up };
              })()
            : FALLBACK_TICKER_ITEMS[0],
          brent
            ? (() => {
                const chg = formatLandingChange(brent);
                return { label: "Brent", value: formatLandingValue(brent), change: chg.text, up: chg.up };
              })()
            : FALLBACK_TICKER_ITEMS[1],
          baltic
            ? (() => {
                const chg = formatLandingChange(baltic);
                return { label: "Baltic dry", value: formatLandingValue(baltic), change: chg.text, up: chg.up };
              })()
            : FALLBACK_TICKER_ITEMS[2],
          vlsfoSingapore
            ? (() => {
                const chg = formatLandingChange(vlsfoSingapore);
                return { label: "VLSFO Singapore", value: formatLandingValue(vlsfoSingapore), change: chg.text, up: chg.up };
              })()
            : FALLBACK_TICKER_ITEMS[3],
          ironOre
            ? (() => {
                const chg = formatLandingChange(ironOre);
                return { label: "Iron ore 62%", value: formatLandingValue(ironOre), change: chg.text, up: chg.up };
              })()
            : FALLBACK_TICKER_ITEMS[4],
        ];

        if (!cancelled) setTickerItems(next);
      } catch {
        // keep fallback; Commodity Market page will show details if needed
      }
    };

    void loadTicker();
    const interval = window.setInterval(loadTicker, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleTiltMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleTiltLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  }, []);

  const faqs = [
    {
      q: `What instruments does ${BRAND.name} price?`,
      a: "Forwards, vanilla and exotic options, swaps, barriers, and touch-style structures — using Black-Scholes / Black-76, closed-form barriers, and Monte Carlo where appropriate.",
    },
    {
      q: "How do hedging and exposures work?",
      a: "Track subsidiary exposures, hedge ratios, and instrument lines, then export strategy components from the strategy builder into Hedging Instruments for MTM-aligned monitoring.",
    },
    {
      q: "Can I use live commodity and rates data?",
      a: `Yes. ${BRAND.name} connects to real or curated commodity feeds, Rate Explorer yield curves, and optional Data Terminal symbols — alongside manual inputs where you need them.`,
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Treasury Director",
      text: `${BRAND.name}'s pricing stack and hedge export cut our prep time before the risk committee by more than half.`,
    },
    {
      name: "Marcus Rodriguez",
      role: "CFO, Manufacturing",
      text: "Stress scenarios in the strategy builder finally match how we describe basis and volatility shocks.",
    },
    {
      name: "Emma Thompson",
      role: "Risk Manager",
      text: "The Pricers view with Greeks and the transaction summary is exactly what our desk asked for.",
    },
  ];

  return (
    <div className="landing-terminal-root dark min-h-screen overflow-x-hidden bg-[#0c1322] font-sans text-[#dce2f7] selection:bg-[#aef833] selection:text-[#213600]">
      <LandingNav />

      <main className="pt-[3.5rem] sm:pt-[4.5rem] md:pt-[5.5rem]">
        {/* Hero */}
        <section
          className="hero-glow-container relative flex min-h-[calc(100svh-3.5rem)] w-full items-center overflow-hidden px-4 py-12 sm:min-h-[calc(100svh-4.5rem)] sm:px-6 md:min-h-[calc(100vh-5.5rem)] md:px-12 md:py-0"
          id="top"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              ref={heroImgRef}
              id="landing-hero-img"
              alt="CommoHedge — container ship at sea, global commodity trade lanes"
              className="landing-hero-img landing-floating-vessel h-full w-full scale-110 object-cover opacity-95 md:opacity-125"
              src={TERMINAL_MEDIA.heroShip}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c1322]/35 via-[#0c1322]/18 to-[#0c1322]/85" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1322]/85 via-[#0c1322]/35 to-transparent" />
            <div className="landing-grid absolute inset-0 opacity-18" />
            <div className="landing-spotlight absolute inset-0 opacity-45" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-[1920px] grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="landing-reveal landing-reveal-active lg:col-span-7 xl:col-span-7">
              <div className="mb-5 inline-flex items-center space-x-2 rounded-full border border-[#aef833]/25 bg-[#aef833]/[0.06] px-3 py-1 sm:mb-6 sm:space-x-3 sm:px-4">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#aef833]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#aef833] sm:text-[10px] sm:tracking-[0.2em]">
                  Pricing & hedging terminal · Live
                </span>
              </div>
              <h1 className="mb-6 font-headline text-[2.5rem] font-bold uppercase leading-[0.95] tracking-tighter text-white sm:mb-8 sm:text-7xl sm:leading-[0.88] md:text-8xl lg:text-[7.5rem] xl:text-[9rem]">
                {BRAND.heroLine1} <br /> <span className="bg-gradient-to-br from-[#aef833] to-[#93db04] bg-clip-text text-transparent">{BRAND.heroLine2}</span>
              </h1>
              <p className="mb-8 max-w-2xl text-base font-light leading-relaxed text-[#c1caaf] sm:mb-10 sm:text-lg md:text-xl">
                <span className="font-medium text-[#dce2f7]">{BRAND.name}</span> unifies commodity pricing, exposures and hedging into one institutional-grade terminal — from daily desk monitoring to board-ready risk reviews, with a single consistent pricing spine.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/request-access")}
                  className="group landing-btn-industrial landing-industrial-gradient flex w-full items-center justify-center px-6 py-3.5 font-headline text-sm font-bold uppercase tracking-widest text-[#213600] shadow-[0_10px_40px_-10px_rgba(174,248,51,0.5)] transition-all hover:brightness-110 sm:w-auto sm:px-8 sm:py-4 sm:text-base md:px-10"
                >
                  Request access
                  <span className="material-symbols-outlined ml-2 transition-transform group-hover:translate-x-1">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="landing-btn-industrial w-full border border-[#424a35]/40 bg-[#141b2b]/40 px-6 py-3.5 text-center font-headline text-sm font-bold uppercase tracking-widest text-white backdrop-blur transition-all hover:bg-[#1b2333]/60 sm:w-auto sm:px-8 sm:py-4 sm:text-base md:px-10"
                >
                  Sign in
                </button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#424a35]/20 pt-6 sm:mt-12 sm:gap-x-10 sm:pt-8">
                {[
                  { v: "12+", l: "Instruments priced" },
                  { v: "6+", l: "Modules live" },
                  { v: "<150ms", l: "Pricer latency" },
                  { v: "99.98%", l: "Coverage" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-headline text-2xl font-bold text-white sm:text-3xl">{s.v}</p>
                    <p className="mt-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-[#aef833]">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating live terminal preview */}
            <aside
              className="landing-reveal landing-reveal-active hidden lg:col-span-5 lg:block xl:col-span-5"
              style={{ transitionDelay: "300ms" }}
            >
              <div className="landing-preview relative ml-auto w-full max-w-[420px] overflow-hidden rounded-sm">
                <div className="flex items-center justify-between border-b border-[#424a35]/25 bg-[#070e1d]/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#aef833]" />
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-[#dce2f7]">
                      Live terminal
                    </span>
                  </div>
                  <span className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
                    Real-time
                  </span>
                </div>

                <div className="border-b border-[#424a35]/15 bg-gradient-to-br from-[#0c1322]/80 to-[#070e1d]/40 px-5 py-5">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-[#8c947b]">Total exposure (illustrative)</p>
                      <p className="truncate font-headline text-3xl font-bold text-white">$2.45B</p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-mono text-[#aef833]">↗ +0.83% MTD</span>
                        <span className="text-[#8c947b]">· 78% hedged</span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 120 40"
                      preserveAspectRatio="none"
                      className="h-12 w-28 shrink-0"
                      aria-hidden
                    >
                      <polyline
                        className="landing-spark"
                        points="0,30 12,28 24,22 36,25 48,18 60,20 72,12 84,15 96,8 108,10 120,4"
                      />
                    </svg>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#8c947b]">Live prices</p>
                    <p className="text-[9px] uppercase tracking-widest text-[#8c947b]">Δ 24h</p>
                  </div>
                  <div className="space-y-2.5">
                    {(tickerItems.length ? tickerItems : FALLBACK_TICKER_ITEMS).slice(0, 4).map((it) => (
                      <div key={it.label} className="flex items-center justify-between text-xs">
                        <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-[#dce2f7]">{it.label}</span>
                        <div className="flex items-center gap-3 font-mono tabular-nums">
                          <span className="text-white">{it.value}</span>
                          <span className={`min-w-[3.5rem] text-right ${it.up ? "text-[#aef833]" : "text-red-400"}`}>{it.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-[#424a35]/15 bg-[#070e1d]/60">
                  <div className="border-r border-[#424a35]/15 px-5 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8c947b]">VaR 95</p>
                    <p className="font-headline text-base font-bold text-white">$3.2M</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[9px] uppercase tracking-widest text-[#8c947b]">Open hedges</p>
                    <p className="font-headline text-base font-bold text-white">42</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Ticker */}
        <div className="relative z-20 border-y border-[#424a35]/10 bg-[#070e1d] py-3">
          <div className="landing-ticker-wrap">
            <div className="landing-ticker-content">
              <TickerRow runId="a" items={tickerItems} />
              <TickerRow runId="b" items={tickerItems} />
            </div>
          </div>
        </div>

        {/* Trusted by — proof band */}
        <section className="border-b border-[#424a35]/10 bg-[#070e1d] px-4 py-12 sm:px-6 md:px-12 md:py-14">
          <div className="mx-auto max-w-[1920px]">
            <p className="landing-reveal mb-8 text-center font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#8c947b] sm:mb-10">
              Built for treasurers, traders and risk teams
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-6">
              {[
                "Treasury desks",
                "Trading floors",
                "Risk committees",
                "CFO offices",
                "Mining groups",
                "Energy majors",
              ].map((label, i) => (
                <div
                  key={label}
                  className="landing-reveal group flex items-center justify-center"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <span className="font-headline text-[11px] font-bold uppercase tracking-[0.25em] text-[#424a35] transition-colors group-hover:text-[#aef833] sm:text-xs">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verticals */}
        <section className="bg-[#0c1322] px-4 py-16 sm:px-6 sm:py-20 md:px-12 md:py-32" id="verticals">
          <div className="mx-auto max-w-[1920px]">
            <div className="landing-reveal mb-12 max-w-3xl sm:mb-16 md:mb-20">
              <p className="mb-4 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
                Sector coverage
              </p>
              <h2 className="mb-5 font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:mb-6 sm:text-4xl md:text-6xl lg:text-7xl">
                One terminal,<br /> three core desks.
              </h2>
              <p className="max-w-xl text-sm text-[#c1caaf] md:text-base">
                Oil, metals and agriculture — each module loads the right pricers, curves and strategy templates so your desk gets to work in seconds.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  title: "Oil & energy",
                  desc: "Crude, distillates and refined hedges. Black-76, barriers and Asians wired to your forward curves.",
                  img: TERMINAL_MEDIA.oilEnergy,
                  path: "/pricers",
                  icon: "oil_barrel",
                },
                {
                  title: "Metals & mining",
                  desc: "Base and precious metals — vol surfaces, forwards and group-wide exposure roll-up across subsidiaries.",
                  img: TERMINAL_MEDIA.metals,
                  path: "/commodity-market",
                  delay: "150ms",
                  icon: "diamond",
                },
                {
                  title: "Agriculture",
                  desc: "Grains and softs — strategy builder, stress paths and hedge-ratio views before you press the trade.",
                  img: TERMINAL_MEDIA.agriculture,
                  path: "/strategy-builder",
                  delay: "300ms",
                  icon: "eco",
                },
              ].map((v) => (
                <div
                  key={v.title}
                  className="landing-reveal landing-tilt-card group relative aspect-[4/5] overflow-hidden rounded-sm border border-[#424a35]/20 bg-[#141b2b]"
                  style={{ transitionDelay: v.delay }}
                  onMouseMove={handleTiltMove}
                  onMouseLeave={handleTiltLeave}
                >
                  <img
                    alt={v.title}
                    className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0"
                    src={v.img}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-[#0c1322]/40 to-[#0c1322]/10 transition-opacity group-hover:from-[#0c1322] group-hover:via-[#0c1322]/30 group-hover:to-transparent" />

                  <div className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-sm border border-[#aef833]/25 bg-[#070e1d]/70 backdrop-blur transition-transform group-hover:-translate-y-1">
                    <span className="material-symbols-outlined text-[#aef833]">{v.icon}</span>
                  </div>

                  <div className="pointer-events-none absolute bottom-0 left-0 w-full p-5 sm:p-8 md:p-10">
                    <h3 className="mb-3 font-headline text-2xl font-bold uppercase text-white sm:mb-4 sm:text-3xl md:text-4xl">{v.title}</h3>
                    <p className="mb-5 max-w-xs text-sm leading-relaxed text-[#c1caaf]">{v.desc}</p>
                    <button
                      type="button"
                      onClick={() => navigate(v.path)}
                      className="pointer-events-auto inline-flex items-center font-headline text-xs font-bold uppercase tracking-widest text-white group/link"
                    >
                      Open in {BRAND.name}
                      <span className="material-symbols-outlined ml-2 text-[#aef833] transition-transform group-hover/link:translate-x-2">trending_flat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative overflow-hidden bg-[#0c1322] px-4 py-16 sm:px-6 sm:py-20 md:px-12 md:py-28" id="how-it-works">
          <div className="landing-spotlight absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-[1920px]">
            <div className="landing-reveal mx-auto mb-12 max-w-2xl text-center sm:mb-16">
              <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
                How it works
              </p>
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl">
                From price feed <br className="hidden sm:block" /> to board pack.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm text-[#c1caaf] md:text-base">
                A single workflow your team can run end-to-end — without spreadsheets falling out of sync.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
              {[
                {
                  n: "01",
                  t: "Connect data",
                  d: "Plug in commodity feeds, subsidiary exposures, and reference curves. Manual overrides where you need them, audit trail by default.",
                  icon: "input",
                },
                {
                  n: "02",
                  t: "Price & build",
                  d: "Forwards, vanillas, barriers, swaps, Asians. Strategy builder and scenarios share the same pricing spine — every module agrees.",
                  icon: "construction",
                },
                {
                  n: "03",
                  t: "Monitor & report",
                  d: "MTM, hedge ratios, exposure roll-up, and board-ready exports — kept consistent across desk, treasury and committee.",
                  icon: "monitoring",
                },
              ].map((step, i) => (
                <div
                  key={step.n}
                  className="landing-reveal landing-glass-card landing-hairline relative overflow-hidden rounded-sm p-6 sm:p-8"
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span className="landing-step-num font-headline text-6xl font-black leading-none sm:text-7xl">{step.n}</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-[#aef833]/30 bg-[#070e1d]/60">
                      <span className="material-symbols-outlined text-[#aef833]">{step.icon}</span>
                    </div>
                  </div>
                  <h3 className="mb-3 font-headline text-xl font-bold uppercase text-white sm:text-2xl">{step.t}</h3>
                  <p className="text-sm leading-relaxed text-[#c1caaf]">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento — Risk architect */}
        <section className="bg-[#070e1d] px-4 py-16 sm:px-6 sm:py-20 md:px-12 md:py-32" id="risk-architect">
          <div className="mx-auto max-w-[1920px]">
            <div className="landing-reveal mb-10 flex flex-col items-start justify-between gap-6 sm:mb-12 md:mb-16 md:flex-row md:items-end md:gap-8">
              <div className="max-w-2xl">
                <h2 className="mb-4 font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
                  Your commodity dashboard
                </h2>
                <p className="text-base text-[#c1caaf] sm:text-lg">
                  One place to monitor prices, exposures, and hedges — and answer the simple question: “What happens if the market moves tomorrow?”
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/strategy-builder")}
                className="landing-btn-industrial w-full whitespace-nowrap border border-[#424a35]/30 bg-[#2e3545] px-6 py-3 font-headline text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-[#323949] sm:w-auto sm:px-8"
              >
                Strategy builder
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-4 md:grid-rows-2">
              <div className="landing-reveal landing-glass-card group relative flex flex-col justify-between overflow-hidden p-5 sm:p-6 md:col-span-2 md:row-span-2 md:min-h-[560px] md:p-8">
                <div className="relative z-10">
                  <div className="landing-floating-ui mb-4 flex h-10 w-10 items-center justify-center rounded-sm landing-industrial-gradient sm:mb-5 sm:h-11 sm:w-11">
                    <span className="material-symbols-outlined text-[#213600]">calculate</span>
                  </div>
                  <h4 className="mb-3 font-headline text-xl font-bold uppercase text-white sm:mb-4 sm:text-2xl md:text-4xl">Pricing you can trust</h4>
                  <p className="mb-4 max-w-lg text-sm text-[#c1caaf] sm:mb-5 sm:text-base">
                    Price your deals, see the cost of protection, and keep your hedge book consistent — from analysis to execution and reporting.
                  </p>
                  <ul className="mb-6 grid max-w-lg grid-cols-1 gap-2 text-sm text-[#dce2f7]/90 md:grid-cols-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aef833]" />
                      <span>Clear price, MTM, and what changed.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aef833]" />
                      <span>One hedge book for all positions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aef833]" />
                      <span>Scenario views for quick decisions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aef833]" />
                      <span>Export-ready outputs for reporting.</span>
                    </li>
                  </ul>
                </div>
                <div className="relative z-10 mt-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-sm border border-[#424a35]/10 bg-[#070e1d]/50 p-5 backdrop-blur">
                      <p className="mb-1 text-[10px] font-bold uppercase text-[#c1caaf]">Coverage</p>
                      <AccuracyCounter />
                    </div>
                    <div className="rounded-sm border border-[#424a35]/10 bg-[#070e1d]/50 p-5 backdrop-blur">
                      <p className="mb-1 text-[10px] font-bold uppercase text-[#c1caaf]">Fast workflows</p>
                      <p className="font-headline text-3xl font-bold text-white">Instant</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#8c947b]">low-friction UI</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-20 -right-20 opacity-5 transition-opacity group-hover:opacity-10">
                  <span className="material-symbols-outlined text-[300px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    calculate
                  </span>
                </div>
              </div>

              <div className="landing-reveal landing-glass-card group relative overflow-hidden p-5 sm:p-6 md:col-span-2 md:min-h-[260px]" style={{ transitionDelay: "150ms" }}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="mb-2 font-headline text-lg font-bold uppercase text-white sm:text-xl md:text-2xl">Market data, simplified</h4>
                    <p className="text-sm text-[#c1caaf]">
                      Your key prices and reference curves stay aligned across the app — so every view tells the same story.
                    </p>
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-[#aef833]">sailing</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-sm border border-[#424a35]/15 bg-[#070e1d]/40 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8c947b]">Included</p>
                    <ul className="space-y-2 text-sm text-[#dce2f7]/90">
                      <li className="flex items-center justify-between">
                        <span>Commodity prices</span>
                        <span className="text-[#aef833]">Live</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>News & calendar</span>
                        <span className="text-[#aef833]">In workspace</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Charts</span>
                        <span className="text-[#aef833]">One click</span>
                      </li>
                    </ul>
                  </div>
                  <div className="overflow-hidden rounded-sm border border-[#424a35]/15 bg-[#141b2b]">
                    <img
                      src={LANDING_SCREENSHOTS.exposures}
                      alt="Dashboard preview"
                      className="h-full w-full object-cover object-top opacity-90"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className="landing-reveal landing-glass-card flex flex-col justify-between p-5 sm:p-6 md:min-h-[260px]" style={{ transitionDelay: "300ms" }}>
                <span className="material-symbols-outlined mb-3 text-[#aef833] sm:mb-4">analytics</span>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-[#c1caaf]">Exposures</p>
                  <p className="font-headline text-2xl font-bold text-white sm:text-3xl">Clear</p>
                  <p className="mt-2 text-sm text-[#c1caaf]">See what matters: net, maturity buckets, and top drivers.</p>
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#141b2b]">
                  <div className="landing-progress-bar h-full bg-[#aef833]" />
                </div>
              </div>

              <div
                className="landing-reveal landing-glass-card flex flex-col justify-between border-l-4 border-[#aef833] p-5 sm:p-6 md:min-h-[260px]"
                style={{ transitionDelay: "450ms" }}
              >
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span className="text-[#c1caaf]">Desk feed</span>
                    <span className="text-[#aef833]">Active</span>
                  </div>
                  <p className="border-b border-[#424a35]/10 pb-2 text-xs text-white">Hedges and positions stay consistent across modules.</p>
                  <p className="border-b border-[#424a35]/10 pb-2 text-xs text-white">Key inputs refresh together — no mismatched numbers.</p>
                  <p className="text-xs text-white">Scenario views help you prepare for price moves.</p>
                </div>
                <span className="material-symbols-outlined text-right text-[#c1caaf]">show_chart</span>
              </div>
            </div>
          </div>
        </section>

        {/* In-app screenshots */}
        <section className="bg-[#0c1322] px-4 py-16 sm:px-6 sm:py-20 md:px-12">
          <div className="mx-auto max-w-[1920px]">
            <div className="landing-reveal mb-10 max-w-3xl sm:mb-14">
              <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
                Inside the terminal
              </p>
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Real screens. <br className="hidden sm:block" /> Real workflows.
              </h2>
              <p className="mt-4 max-w-xl text-sm text-[#c1caaf] md:text-base">
                Actual workspace views — pricing, exposures and strategy configuration. No mock-ups.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3">
              {[
                { title: "Pricers", desc: "Forwards, vanillas, exotics — one consistent spine.", src: LANDING_SCREENSHOTS.pricers, path: "/pricers", icon: "calculate" },
                { title: "Dashboard", desc: "Exposures, hedges and MTM in a single view.", src: LANDING_SCREENSHOTS.exposures, path: "/dashboard", icon: "dashboard" },
                { title: "Strategy builder", desc: "Compose multi-leg structures and stress-test before execution.", src: LANDING_SCREENSHOTS.strategyBuilder, path: "/strategy-builder", icon: "construction" },
              ].map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => navigate(s.path)}
                  className="landing-reveal group landing-hairline relative overflow-hidden rounded-sm border border-[#424a35]/20 bg-[#141b2b]/40 text-left"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="relative overflow-hidden">
                    <img src={s.src} alt={s.title} className="aspect-[16/10] w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070e1d] via-[#070e1d]/40 to-transparent opacity-90" />
                    <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-sm border border-[#aef833]/25 bg-[#070e1d]/70 backdrop-blur">
                      <span className="material-symbols-outlined text-[#aef833]">{s.icon}</span>
                    </div>
                  </div>
                  <div className="px-5 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-headline text-sm font-bold uppercase tracking-widest text-white sm:text-base">{s.title}</p>
                      <span className="material-symbols-outlined text-[#aef833] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </div>
                    <p className="mt-2 text-xs text-[#c1caaf] sm:text-sm">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="relative overflow-hidden bg-[#070e1d] px-4 py-16 sm:px-6 sm:py-20 md:px-12 md:py-28" id="testimonials">
          <div className="landing-spotlight absolute inset-0 opacity-40" />
          <div className="relative mx-auto max-w-[1920px]">
            <div className="landing-reveal mb-10 max-w-2xl sm:mb-14">
              <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
                What desks say
              </p>
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:text-4xl md:text-5xl">
                Built around the people <br className="hidden sm:block" /> who run the book.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => {
                const initials = t.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={i}
                    className="landing-reveal landing-glass-card landing-hairline relative overflow-hidden rounded-sm p-6 sm:p-8"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <span className="pointer-events-none absolute right-5 top-2 font-headline text-7xl font-black leading-none text-[#aef833]/10">&ldquo;</span>
                    <div className="relative mb-4 flex">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <Star key={j} className="h-4 w-4 fill-[#aef833] text-[#aef833]" />
                      ))}
                    </div>
                    <p className="relative mb-6 text-sm font-light leading-relaxed text-[#dce2f7] sm:text-base">&ldquo;{t.text}&rdquo;</p>
                    <div className="relative flex items-center gap-3 border-t border-[#424a35]/15 pt-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#aef833] to-[#93db04] font-headline text-xs font-black text-[#213600]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-headline text-sm font-bold text-white">{t.name}</p>
                        <p className="truncate text-[11px] text-[#c1caaf]">{t.role}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#0c1322] px-4 py-16 sm:px-6 sm:py-20 md:px-12 md:py-28" id="faq">
          <div className="mx-auto max-w-3xl">
            <div className="landing-reveal mb-10 text-center sm:mb-14">
              <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
                FAQ
              </p>
              <h2 className="font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:text-4xl md:text-5xl">
                Quick answers <br className="hidden sm:block" /> for the desk.
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="landing-reveal landing-glass-card overflow-hidden rounded-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between p-5 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="pr-4 font-headline text-sm font-bold text-white md:text-base">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="h-5 w-5 shrink-0 text-[#aef833]" /> : <ChevronDown className="h-5 w-5 shrink-0 text-[#c1caaf]" />}
                  </button>
                  {openFaq === i && <p className="border-t border-[#424a35]/10 px-5 pb-5 pt-0 text-sm leading-relaxed text-[#c1caaf]">{faq.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-[#0c1322] px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-32">
          <div className="pointer-events-none absolute inset-0">
            <div className="landing-grid absolute inset-0 opacity-40" />
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#aef833_0%,transparent_60%)] opacity-15" />
          </div>
          <div className="landing-reveal landing-hairline relative z-10 mx-auto max-w-6xl overflow-hidden rounded-sm border border-[#aef833]/10 bg-gradient-to-br from-[#141b2b]/80 via-[#0c1322]/60 to-[#070e1d]/80 px-6 py-12 backdrop-blur-xl sm:px-10 sm:py-16 md:px-16 md:py-20">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
                  Get started
                </p>
                <h2 className="mb-6 font-headline text-3xl font-bold uppercase leading-[0.95] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                  Architect <br /> your <span className="bg-gradient-to-br from-[#aef833] to-[#93db04] bg-clip-text text-transparent">edge.</span>
                </h2>
                <p className="max-w-xl text-sm font-light text-[#c1caaf] sm:text-base md:text-lg">
                  {BRAND.name} ties pricing, hedging and scenarios into one terminal — from desk trial to production risk reviews.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
                <button
                  type="button"
                  onClick={() => navigate("/request-access")}
                  className="landing-btn-industrial landing-industrial-gradient w-full px-6 py-4 font-headline text-sm font-bold uppercase tracking-widest text-[#213600] shadow-[0_15px_50px_-15px_rgba(174,248,51,0.6)] transition-transform hover:scale-[1.02] sm:px-10 sm:py-5 sm:text-base lg:w-auto"
                >
                  Request access
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="landing-btn-industrial w-full border border-[#424a35]/40 bg-[#141b2b]/40 px-6 py-4 font-headline text-sm font-bold uppercase tracking-widest text-white backdrop-blur transition-all hover:bg-[#1b2333]/60 sm:px-10 sm:py-5 sm:text-base lg:w-auto"
                >
                  Sign in
                </button>
                <p className="mt-2 text-[11px] uppercase tracking-widest text-[#8c947b]">
                  No card. No drama. Just access.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative mt-auto overflow-hidden bg-[#070e1d] px-4 py-14 sm:px-6 sm:py-16 md:px-12 md:py-20" id="contact">
        <div className="absolute inset-x-0 top-0 h-px landing-divider" />
        <div className="mx-auto grid w-full max-w-[1920px] grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:grid-cols-12">
          <div className="col-span-2 sm:col-span-4 lg:col-span-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] font-headline text-sm font-black text-[#213600]">
                {BRAND.logoMark}
              </div>
              <span className="font-headline text-base font-bold uppercase tracking-widest text-white">{BRAND.name}</span>
            </div>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-[#aeb5c5] sm:mb-8">
              {BRAND.tagline}. Commodity pricers, hedge books and strategy analytics built for clarity under volatility.
            </p>
            <a
              href="mailto:commohedge@gmail.com"
              className="inline-flex items-center gap-2 font-headline text-xs font-bold uppercase tracking-widest text-[#aef833] hover:text-white"
            >
              <span className="material-symbols-outlined text-base">mail</span>
              commohedge@gmail.com
            </a>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.linkedin.com/company/commohedge"
                target="_blank"
                rel="noreferrer"
                aria-label="CommoHedge on LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#424a35]/30 text-[#8c947b] transition-colors hover:border-[#aef833]/40 hover:text-[#aef833]"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <span
                aria-label="CommoHedge on Facebook (coming soon)"
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-sm border border-[#424a35]/20 text-[#8c947b]/60"
                title="Facebook link pending"
              >
                <Facebook className="h-4 w-4" />
              </span>
              <span
                aria-label="CommoHedge on X (coming soon)"
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-sm border border-[#424a35]/20 text-[#8c947b]/60"
                title="X link pending"
              >
                <XIcon className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-1 lg:col-span-2 lg:col-start-7">
            <h5 className="mb-5 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">Platform</h5>
            <ul className="space-y-3">
              <li>
                <button type="button" onClick={() => navigate("/pricers")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Pricers
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/dashboard")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Dashboard
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/strategy-builder")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Strategy builder
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/commodity-market")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Commodity market
                </button>
              </li>
            </ul>
          </div>

          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <h5 className="mb-5 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">Workflow</h5>
            <ul className="space-y-3">
              <li>
                <button type="button" onClick={() => navigate("/rate-explorer")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Rate explorer
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/hedge-helper")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Hedge assistant
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/intel-workspace")} className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  Intelligence workspace
                </button>
              </li>
              <li>
                <a href="#faq" className="font-headline text-[11px] uppercase tracking-widest text-[#aeb5c5] transition-colors hover:text-white">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-2 lg:col-span-3">
            <h5 className="mb-5 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">Get started</h5>
            <p className="mb-4 text-sm text-[#aeb5c5]">
              Two minutes is enough to see the terminal in action.
            </p>
            <button
              type="button"
              onClick={() => navigate("/request-access")}
              className="landing-btn-industrial landing-industrial-gradient w-full px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#213600] transition-transform hover:scale-[1.02]"
            >
              Request access
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="landing-btn-industrial mt-2 w-full border border-[#424a35]/40 bg-transparent px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/5"
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-4 left-0 right-0 select-none overflow-hidden">
          <p className="break-all text-center font-headline text-[14vw] font-black uppercase leading-none tracking-tighter text-white opacity-[0.04] sm:text-[12vw]">
            {BRAND.nameWatermark}
          </p>
        </div>

        <div className="relative mx-auto mt-12 flex max-w-[1920px] flex-col items-start justify-between gap-3 border-t border-[#424a35]/15 pt-6 sm:mt-16 sm:gap-4 sm:pt-8 md:flex-row md:items-center">
          <p className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">{BRAND.copyrightLine}</p>
          <p className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">Commodity · Risk · Strategy</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
