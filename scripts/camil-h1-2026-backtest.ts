/**
 * Camil H1-2026 agri backtest — comparable strikes:
 * - Swap (fix = Jan spot)
 * - Call 105% of Jan spot
 * - Collar 95% / 105% (put 95%, call 105%, fixed)
 * - Zero-cost collar (call 105%, put solved each month so callPrem = putPrem)
 * - Coverage matrix: 0% / 25% / 50% / 75% / 100%
 *
 * Run: npx tsx scripts/camil-h1-2026-backtest.ts
 */
import {
  calculateBlack76Price,
  calculateTimeToMaturity,
} from "../src/services/PricingService.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type MonthKey = "2026-01" | "2026-02" | "2026-03" | "2026-04" | "2026-05" | "2026-06";
type CommodityKey = "sugar" | "coffee" | "wheat" | "rice";

const MONTHS: MonthKey[] = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
];

const MATURITY: Record<MonthKey, string> = {
  "2026-01": "2026-01-31",
  "2026-02": "2026-02-28",
  "2026-03": "2026-03-31",
  "2026-04": "2026-04-30",
  "2026-05": "2026-05-31",
  "2026-06": "2026-06-30",
};

const VALUATION = "2026-01-02";
const R = 0.045;
/** Align with ZeroCostStrategies / Strategy Builder commodity carry: b = r */
const B = R;
const COVERAGES = [0, 0.25, 0.5, 0.75, 1] as const;

const VOL_KT_YEAR: Record<CommodityKey, number> = {
  rice: 2256.8 * 0.35,
  sugar: 2256.8 * 0.25,
  coffee: 198.6 * 0.2,
  wheat: 198.6 * 0.55,
};

const PRICES: Record<
  CommodityKey,
  { unit: string; currency: string; series: Record<MonthKey, number>; notes: string }
> = {
  sugar: {
    unit: "USD/lb",
    currency: "USD",
    series: {
      "2026-01": 0.145,
      "2026-02": 0.142,
      "2026-03": 0.148,
      "2026-04": 0.1409,
      "2026-05": 0.1477,
      "2026-06": 0.1391,
    },
    notes: "ICE Sugar #11 monthly averages",
  },
  coffee: {
    unit: "USD/lb",
    currency: "USD",
    series: {
      "2026-01": 3.3499,
      "2026-02": 2.8876,
      "2026-03": 2.9018,
      "2026-04": 2.8463,
      "2026-05": 2.6818,
      "2026-06": 2.5675,
    },
    notes: "ICE NY Arabica monthly averages (ICO)",
  },
  wheat: {
    unit: "USD/bu",
    currency: "USD",
    series: {
      "2026-01": 5.01,
      "2026-02": 5.12,
      "2026-03": 5.52,
      "2026-04": 5.4,
      "2026-05": 5.55,
      "2026-06": 5.45,
    },
    notes: "USDA / CBOT wheat proxies",
  },
  rice: {
    unit: "BRL/sc50kg",
    currency: "BRL",
    series: {
      "2026-01": 53.38,
      "2026-02": 54.8,
      "2026-03": 58.83,
      "2026-04": 62.67,
      "2026-05": 61.02,
      "2026-06": 59.49,
    },
    notes: "CEPEA/IRGA-RS paddy rice",
  },
};

function monthlyVolume(commodity: CommodityKey): number {
  const kt = VOL_KT_YEAR[commodity] / 12;
  switch (commodity) {
    case "sugar":
    case "coffee":
      return kt * 1_000_000 * 2.20462;
    case "wheat":
      return (kt * 1_000_000) / 27.216;
    case "rice":
      return (kt * 1_000_000) / 50;
  }
}

function histVolAnnual(prices: number[]): number {
  const rets: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    rets.push(Math.log(prices[i] / prices[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance =
    rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(rets.length - 1, 1);
  return Math.sqrt(variance) * Math.sqrt(12);
}

/**
 * Same idea as ZeroCostStrategies.findEquilibriumStrike (collar with fixed call):
 * fix call strike, solve put strike so put premium = call premium (net premium ~ 0).
 * Search band: 50% .. 150% of spot (same as app).
 */
function findZeroCostPutStrike(
  spot: number,
  callStrike: number,
  t: number,
  sigma: number,
  r: number,
  b: number
): { putStrike: number; callPrem: number; putPrem: number; netPrem: number } {
  const callPrem = calculateBlack76Price("call", spot, callStrike, r, b, t, sigma);
  let low = spot * 0.5;
  let high = spot * 1.5;
  let mid = spot * 0.95;
  const tol = Math.max(callPrem * 1e-6, 1e-12);

  for (let i = 0; i < 80; i++) {
    mid = (low + high) / 2;
    const putPrem = calculateBlack76Price("put", spot, mid, r, b, t, sigma);
    if (Math.abs(putPrem - callPrem) < tol) break;
    // Higher put strike → higher put premium
    if (putPrem < callPrem) low = mid;
    else high = mid;
  }

  const putPrem = calculateBlack76Price("put", spot, mid, r, b, t, sigma);
  return {
    putStrike: mid,
    callPrem,
    putPrem,
    netPrem: callPrem - putPrem,
  };
}

/** Shared call strike for Call 105%, Collar 95/105, and Zero-cost collar. */
const CALL_PCT = 1.05;
/** Fixed put strike for Collar 95% / 105%. */
const COLLAR_PUT_PCT = 0.95;

function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
}

type StrategyId = "none" | "swap" | "call" | "collar95" | "collarZC";

function monthPnL(params: {
  V: number;
  h: number;
  spot: number;
  Kswap: number;
  callPrem: number;
  callPayoff: number;
  collarPrem: number;
  collarPayoff: number;
  strategy: StrategyId;
}): { cost: number; benefit: number; premiumCash: number; payoffCash: number } {
  const { V, h, spot, Kswap, callPrem, callPayoff, collarPrem, collarPayoff, strategy } =
    params;
  const unhedged = -(V * spot);
  const Vh = V * h;

  if (strategy === "none" || h === 0) {
    return { cost: unhedged, benefit: 0, premiumCash: 0, payoffCash: 0 };
  }
  if (strategy === "swap") {
    const hedgedPrice = h * Kswap + (1 - h) * spot;
    const cost = -(V * hedgedPrice);
    return { cost, benefit: cost - unhedged, premiumCash: 0, payoffCash: 0 };
  }
  if (strategy === "call") {
    const cost = unhedged - Vh * callPrem + Vh * callPayoff;
    return {
      cost,
      benefit: cost - unhedged,
      premiumCash: Vh * callPrem,
      payoffCash: Vh * callPayoff,
    };
  }
  // collar95 or collarZC
  const cost = unhedged - Vh * collarPrem + Vh * collarPayoff;
  return {
    cost,
    benefit: cost - unhedged,
    premiumCash: Vh * collarPrem,
    payoffCash: Vh * collarPayoff,
  };
}

function backtestCommodity(key: CommodityKey) {
  const meta = PRICES[key];
  const series = MONTHS.map((m) => meta.series[m]);
  const sigma = histVolAnnual(series);
  const V = monthlyVolume(key);
  const spot0 = series[0];
  const K_call = spot0 * CALL_PCT; // 105% — shared by call, collar95, ZC
  const K_put95 = spot0 * COLLAR_PUT_PCT; // 95%
  const K_swap = spot0;

  const months = MONTHS.map((m) => {
    const realPrice = meta.series[m];
    const t = Math.max(calculateTimeToMaturity(MATURITY[m], VALUATION), 1 / 365);
    const forward = spot0 * Math.exp(B * t);

    // Call 105% (same leg for Call, Collar 95/105, Zero-cost)
    const callPrem = calculateBlack76Price("call", spot0, K_call, R, B, t, sigma);
    const putPrem95 = calculateBlack76Price("put", spot0, K_put95, R, B, t, sigma);
    const collar95Prem = callPrem - putPrem95;

    // Zero-cost: same call 105%, put solved each month
    const zc = findZeroCostPutStrike(spot0, K_call, t, sigma, R, B);

    const callPayoff = Math.max(0, realPrice - K_call);
    const putPayoff95 = Math.max(0, K_put95 - realPrice);
    const collar95Payoff = callPayoff - putPayoff95;

    const putPayoffZC = Math.max(0, zc.putStrike - realPrice);
    const collarZCPayoff = callPayoff - putPayoffZC;

    return {
      date: m,
      realPrice,
      forward,
      timeToMaturity: t,
      histVol: sigma,
      monthlyVolume: V,
      strikeCall: K_call,
      strikeCallZC: K_call,
      strikePut95: K_put95,
      strikePutZC: zc.putStrike,
      strikePutZCPctOfSpot: (zc.putStrike / spot0) * 100,
      callPremium: callPrem,
      callPremiumZC: zc.callPrem,
      putPremium95: putPrem95,
      collar95Premium: collar95Prem,
      putPremiumZC: zc.putPrem,
      collarZCPremium: zc.netPrem,
      callPayoff,
      callPayoffZC: callPayoff,
      putPayoff95,
      collar95Payoff,
      putPayoffZC,
      collarZCPayoff,
    };
  });

  const strategies: StrategyId[] = ["none", "swap", "call", "collar95", "collarZC"];
  const matrix: Record<
    string,
    Record<
      string,
      {
        hedgeBenefit: number;
        totalCost: number;
        premiumCash: number;
        payoffCash: number;
      }
    >
  > = {};

  for (const strat of strategies) {
    matrix[strat] = {};
    for (const h of COVERAGES) {
      let benefit = 0;
      let cost = 0;
      let premiumCash = 0;
      let payoffCash = 0;
      for (const mo of months) {
        const r = monthPnL({
          V,
          h,
          spot: mo.realPrice,
          Kswap: K_swap,
          callPrem: mo.callPremium,
          callPayoff: mo.callPayoff,
          collarPrem: strat === "collarZC" ? mo.collarZCPremium : mo.collar95Premium,
          collarPayoff: strat === "collarZC" ? mo.collarZCPayoff : mo.collar95Payoff,
          strategy: strat,
        });
        benefit += r.benefit;
        cost += r.cost;
        premiumCash += r.premiumCash;
        payoffCash += r.payoffCash;
      }
      matrix[strat][`${Math.round(h * 100)}%`] = {
        hedgeBenefit: benefit,
        totalCost: cost,
        premiumCash,
        payoffCash,
      };
    }
  }

  const h50 = 0.5;
  const results50 = months.map((mo) => {
    const swap = monthPnL({
      V,
      h: h50,
      spot: mo.realPrice,
      Kswap: K_swap,
      callPrem: mo.callPremium,
      callPayoff: mo.callPayoff,
      collarPrem: mo.collar95Premium,
      collarPayoff: mo.collar95Payoff,
      strategy: "swap",
    });
    const call = monthPnL({
      V,
      h: h50,
      spot: mo.realPrice,
      Kswap: K_swap,
      callPrem: mo.callPremium,
      callPayoff: mo.callPayoff,
      collarPrem: mo.collar95Premium,
      collarPayoff: mo.collar95Payoff,
      strategy: "call",
    });
    const c95 = monthPnL({
      V,
      h: h50,
      spot: mo.realPrice,
      Kswap: K_swap,
      callPrem: mo.callPremium,
      callPayoff: mo.callPayoff,
      collarPrem: mo.collar95Premium,
      collarPayoff: mo.collar95Payoff,
      strategy: "collar95",
    });
    const czc = monthPnL({
      V,
      h: h50,
      spot: mo.realPrice,
      Kswap: K_swap,
      callPrem: mo.callPremium,
      callPayoff: mo.callPayoff,
      collarPrem: mo.collarZCPremium,
      collarPayoff: mo.collarZCPayoff,
      strategy: "collarZC",
    });
    const unhedgedCost = -(V * mo.realPrice);
    return {
      ...mo,
      hedgedVolume: V * h50,
      strategyPrice: mo.callPremium,
      putPremium: mo.putPremium95,
      collarPremium: mo.collar95Premium,
      putPayoffShort: mo.putPayoff95,
      collarPayoff: mo.collar95Payoff,
      callPremiumCash: call.premiumCash,
      callPayoffCash: call.payoffCash,
      collarPremiumCash: c95.premiumCash,
      collarPayoffCash: c95.payoffCash,
      collarZCPremiumCash: czc.premiumCash,
      collarZCPayoffCash: czc.payoffCash,
      unhedgedCost,
      hedgedCostSwap: swap.cost,
      hedgedCostCall: call.cost,
      hedgedCostCollar: c95.cost,
      hedgedCostCollarZC: czc.cost,
      deltaPnLSwap: swap.benefit,
      deltaPnLCall: call.benefit,
      deltaPnLCollar: c95.benefit,
      deltaPnLCollarZC: czc.benefit,
      strikePut: mo.strikePut95,
    };
  });

  const sum = (fn: (r: (typeof results50)[0]) => number) =>
    results50.reduce((a, r) => a + fn(r), 0);

  return {
    commodity: key,
    unit: meta.unit,
    currency: meta.currency,
    notes: meta.notes,
    histVol: sigma,
    monthlyVolume: V,
    strikeCall: K_call,
    strikeCallZC: K_call,
    strikePut: K_put95,
    callPct: CALL_PCT,
    collarPutPct: COLLAR_PUT_PCT,
    zcCallPct: CALL_PCT,
    results: results50,
    monthsDetail: months,
    coverageMatrix: matrix,
    totals: {
      unhedgedCost: sum((r) => r.unhedgedCost),
      hedgedCostSwap: sum((r) => r.hedgedCostSwap),
      hedgedCostCall: sum((r) => r.hedgedCostCall),
      hedgedCostCollar: sum((r) => r.hedgedCostCollar),
      hedgedCostCollarZC: sum((r) => r.hedgedCostCollarZC),
      deltaPnLSwap: sum((r) => r.deltaPnLSwap),
      deltaPnLCall: sum((r) => r.deltaPnLCall),
      deltaPnLCollar: sum((r) => r.deltaPnLCollar),
      deltaPnLCollarZC: sum((r) => r.deltaPnLCollarZC),
      callPremiumCash: sum((r) => r.callPremiumCash),
      callPayoffCash: sum((r) => r.callPayoffCash),
      collarPremiumCash: sum((r) => r.collarPremiumCash),
      collarPayoffCash: sum((r) => r.collarPayoffCash),
      collarZCPremiumCash: sum((r) => r.collarZCPremiumCash),
      collarZCPayoffCash: sum((r) => r.collarZCPayoffCash),
    },
  };
}

const commodities: CommodityKey[] = ["sugar", "coffee", "wheat", "rice"];
const report = {
  meta: {
    company: "Camil Alimentos (CAML3)",
    period: "H1 2026 (Jan-Jun)",
    valuationDate: VALUATION,
    coverages: COVERAGES.map((c) => `${Math.round(c * 100)}%`),
    rate: R,
    carryB: B,
    engine:
      "Strategy Builder + Black-76; zero-cost put strike via bisection (ZeroCostStrategies logic)",
    strategies: [
      "none (0% cover)",
      "swap (fix = Jan spot)",
      "call 105% of January spot",
      "collar 95%/105%: call 105% + put 95% Jan (fixed)",
      "zero-cost collar: call 105% Jan + put strike solved each month for net premium ~ 0",
    ],
    callPct: CALL_PCT,
    collarPutPct: COLLAR_PUT_PCT,
    zeroCostCallPct: CALL_PCT,
    disclaimer:
      "Illustrative public-data backtest. Volumes from Camil FY2025 mix guidance. Not investment advice.",
  },
  commodities: commodities.map(backtestCommodity),
};

console.log("\n=== CAMIL H1-2026 BACKTEST (Call 105% | Collar 95/105 | ZC | Swap) ===\n");

for (const c of report.commodities) {
  console.log(`--- ${c.commodity.toUpperCase()} (${c.unit}) vol=${(c.histVol * 100).toFixed(1)}% ---`);
  console.log(
    `  Strikes: call=${c.strikeCall.toFixed(4)} (105%) | collar put=${c.strikePut.toFixed(4)} (95%)`
  );
  console.log("  Zero-cost put strikes by month (% of Jan spot):");
  for (const m of c.monthsDetail) {
    console.log(
      `    ${m.date}: put=${m.strikePutZC.toFixed(4)} (${m.strikePutZCPctOfSpot.toFixed(1)}% spot) | callPrem=${m.callPremiumZC.toFixed(5)} putPrem=${m.putPremiumZC.toFixed(5)} net=${m.collarZCPremium.toExponential(2)}`
    );
  }
  console.log("  Coverage matrix - Hedge Benefit H1:");
  console.log("           0%          25%         50%         75%        100%");
  for (const strat of ["swap", "call", "collar95", "collarZC"] as const) {
    const row = COVERAGES.map((h) => {
      const v = c.coverageMatrix[strat][`${Math.round(h * 100)}%`].hedgeBenefit;
      return fmt(v, 0).padStart(12);
    }).join("");
    console.log(`  ${strat.padEnd(10)}${row}`);
  }
  console.log("");
}

const outDir = resolve("scripts/output");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "camil-h1-2026-backtest.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
