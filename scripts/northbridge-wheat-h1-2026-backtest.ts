/**
 * Illustrative anonymized case — Northbridge Bakery Group (fictional).
 * Hedge designed 30 Jun 2025 for H1 2026 CBOT SRW wheat purchases.
 *
 * Strategies (buyer):
 * - Swap / forward strip locked at June-2025 CBOT SRW forwards
 * - Call 105% of strip reference
 * - Collar 95% / 105%
 * - Zero-cost collar (call 105%, put solved each month)
 * - Coverage matrix 0 / 25 / 50 / 75 / 100%
 *
 * Run: npx tsx scripts/northbridge-wheat-h1-2026-backtest.ts
 */
import {
  calculateBlack76Price,
  calculateTimeToMaturity,
} from "../src/services/PricingService.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type MonthKey = "2026-01" | "2026-02" | "2026-03" | "2026-04" | "2026-05" | "2026-06";

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

/** Hedge decision / valuation date */
const VALUATION = "2025-06-30";
const R = 0.045;
const B = R;
const COVERAGES = [0, 0.25, 0.5, 0.75, 1] as const;
const CALL_PCT = 1.05;
const COLLAR_PUT_PCT = 0.95;

/**
 * Anchors observed on Yahoo Finance (CBOT SRW), 2025-06-30 settles (cents/bu):
 * - Front continuous ZW=F: 528.75
 * - Dec'26 ZWZ26.CBT: 624.50
 * Deferred H1-2026 months interpolated along that curve (free feeds lack ZWH/K/N26
 * history). Documented as illustrative strip in the PDF.
 */
const FRONT_JUN30_CENTS = 528.75;
const DEC26_JUN30_CENTS = 624.5;
const MONTHS_FRONT_TO_DEC26 = 17;

function centsToUsd(c: number) {
  return c / 100;
}

/** Months after Jul'25 front → mid of purchase month */
const MONTHS_FROM_FRONT: Record<MonthKey, number> = {
  "2026-01": 6.5,
  "2026-02": 7.5,
  "2026-03": 8.5,
  "2026-04": 9.5,
  "2026-05": 10.5,
  "2026-06": 11.5,
};

function forwardCents(m: MonthKey): number {
  const t = MONTHS_FROM_FRONT[m];
  return (
    FRONT_JUN30_CENTS +
    (DEC26_JUN30_CENTS - FRONT_JUN30_CENTS) * (t / MONTHS_FRONT_TO_DEC26)
  );
}

/** H1 2026 monthly averages — Yahoo ZW=F daily closes, cents → USD/bu */
const REALIZED_USD: Record<MonthKey, number> = {
  "2026-01": 5.1849,
  "2026-02": 5.488,
  "2026-03": 5.9512,
  "2026-04": 6.0139,
  "2026-05": 6.3496,
  "2026-06": 5.8961,
};

/** ~50,000 t wheat-eq / year → bushels (1 bu ≈ 27.2155 kg) */
const ANNUAL_TONNES = 50_000;
const KG_PER_BU = 27.2155;
const ANNUAL_BU = (ANNUAL_TONNES * 1000) / KG_PER_BU;
const MONTHLY_BU = ANNUAL_BU / 12;

const FORWARDS_USD = Object.fromEntries(
  MONTHS.map((m) => [m, centsToUsd(forwardCents(m))])
) as Record<MonthKey, number>;

const STRIP_AVG_USD =
  MONTHS.reduce((a, m) => a + FORWARDS_USD[m], 0) / MONTHS.length;

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
  const cost = unhedged - Vh * collarPrem + Vh * collarPayoff;
  return {
    cost,
    benefit: cost - unhedged,
    premiumCash: Vh * collarPrem,
    payoffCash: Vh * collarPayoff,
  };
}

function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
}

const series = MONTHS.map((m) => REALIZED_USD[m]);
const sigma = histVolAnnual(series);
const V = MONTHLY_BU;
const ref = STRIP_AVG_USD;
const K_call = ref * CALL_PCT;
const K_put95 = ref * COLLAR_PUT_PCT;

const months = MONTHS.map((m) => {
  const realPrice = REALIZED_USD[m];
  const fwd = FORWARDS_USD[m];
  const t = Math.max(calculateTimeToMaturity(MATURITY[m], VALUATION), 1 / 365);

  const callPrem = calculateBlack76Price("call", ref, K_call, R, B, t, sigma);
  const putPrem95 = calculateBlack76Price("put", ref, K_put95, R, B, t, sigma);
  const collar95Prem = callPrem - putPrem95;
  const zc = findZeroCostPutStrike(ref, K_call, t, sigma, R, B);

  const callPayoff = Math.max(0, realPrice - K_call);
  const putPayoff95 = Math.max(0, K_put95 - realPrice);
  const collar95Payoff = callPayoff - putPayoff95;
  const putPayoffZC = Math.max(0, zc.putStrike - realPrice);
  const collarZCPayoff = callPayoff - putPayoffZC;

  return {
    date: m,
    realPrice,
    forward: fwd,
    forwardCents: forwardCents(m),
    timeToMaturity: t,
    histVol: sigma,
    monthlyVolume: V,
    strikeCall: K_call,
    strikePut95: K_put95,
    strikePutZC: zc.putStrike,
    strikePutZCPctOfRef: (zc.putStrike / ref) * 100,
    callPremium: callPrem,
    callPremiumZC: zc.callPrem,
    putPremium95: putPrem95,
    collar95Premium: collar95Prem,
    putPremiumZC: zc.putPrem,
    collarZCPremium: zc.netPrem,
    callPayoff,
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
    { hedgeBenefit: number; totalCost: number; premiumCash: number; payoffCash: number }
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
        Kswap: mo.forward,
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
    Kswap: mo.forward,
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
    Kswap: mo.forward,
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
    Kswap: mo.forward,
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
    Kswap: mo.forward,
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
    collarPremium: mo.collar95Premium,
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
  };
});

const sum = (fn: (r: (typeof results50)[0]) => number) =>
  results50.reduce((a, r) => a + fn(r), 0);

const report = {
  meta: {
    company: "Northbridge Bakery Group (illustrative anonymized case)",
    fictional: true,
    disclaimer:
      "ILLUSTRATIVE ANONYMIZED CASE — not a real company. Public CBOT SRW data + industry-scaled volumes. Not investment advice.",
    period: "H1 2026 (Jan-Jun) purchases",
    valuationDate: VALUATION,
    benchmark: "CBOT Soft Red Winter wheat (ZW)",
    coverages: COVERAGES.map((c) => `${Math.round(c * 100)}%`),
    rate: R,
    carryB: B,
    engine:
      "Strategy Builder + Black-76; zero-cost put via bisection (ZeroCostStrategies logic)",
    strategies: [
      "swap / forward strip locked 30 Jun 2025",
      "call 105% of June-2025 strip average",
      "collar 95%/105% (fixed)",
      "zero-cost collar: call 105% + put solved each month",
    ],
    callPct: CALL_PCT,
    collarPutPct: COLLAR_PUT_PCT,
    dataNotes: {
      frontJun30Cents: FRONT_JUN30_CENTS,
      dec26Jun30Cents: DEC26_JUN30_CENTS,
      frontSource: "Yahoo Finance ZW=F settle 2025-06-30",
      dec26Source: "Yahoo Finance ZWZ26.CBT settle 2025-06-30",
      stripMethod:
        "Linear interpolation between front and Dec'26 along month count (illustrative when H/K/N26 history unavailable on free feeds)",
      realizedSource: "Yahoo Finance ZW=F daily closes, monthly average H1 2026",
    },
  },
  profile: {
    name: "Northbridge Bakery Group",
    sector: "Midwest commercial bakery / soft-wheat flour buyer",
    annualWheatTonnes: ANNUAL_TONNES,
    annualBushels: ANNUAL_BU,
    monthlyBushels: MONTHLY_BU,
    volumeNote:
      "Fictional scale (~50 kt wheat-eq/year) consistent with mid-size US commercial bakery flour usage ranges — not from any company filing.",
  },
  market: {
    stripAvgUsd: STRIP_AVG_USD,
    strikeCall: K_call,
    strikePut95: K_put95,
    histVol: sigma,
    forwardsUsd: FORWARDS_USD,
    realizedUsd: REALIZED_USD,
  },
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

console.log("\n=== NORTHBRIDGE (ILLUSTRATIVE) CBOT SRW H1-2026 ===\n");
console.log(`Decision: ${VALUATION} | Strip avg: $${STRIP_AVG_USD.toFixed(4)}/bu`);
console.log(
  `Call 105%: $${K_call.toFixed(4)} | Put 95%: $${K_put95.toFixed(4)} | Vol: ${(sigma * 100).toFixed(1)}%`
);
console.log(`Monthly volume: ${fmt(MONTHLY_BU, 0)} bu (~${ANNUAL_TONNES} t/yr)`);
console.log("\nForwards (Jun-2025 strip) vs realized H1-2026:");
for (const m of MONTHS) {
  console.log(
    `  ${m}: fwd=$${FORWARDS_USD[m].toFixed(4)}  realized=$${REALIZED_USD[m].toFixed(4)}`
  );
}
console.log("\nCoverage matrix — Hedge Benefit H1 (USD):");
console.log("           0%          25%         50%         75%        100%");
for (const strat of ["swap", "call", "collar95", "collarZC"] as const) {
  const row = COVERAGES.map((h) => {
    const v = matrix[strat][`${Math.round(h * 100)}%`].hedgeBenefit;
    return fmt(v, 0).padStart(12);
  }).join("");
  console.log(`  ${strat.padEnd(10)}${row}`);
}

const outDir = resolve("scripts/output");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "northbridge-wheat-h1-2026-backtest.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
