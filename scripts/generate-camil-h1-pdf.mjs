/**
 * Camil H1-2026 hedge report PDF — plain-English + premiums & payoffs.
 * Run: node scripts/generate-camil-h1-pdf.mjs
 */
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const JSON_PATH = resolve(__dirname, "output/camil-h1-2026-backtest.json");
const OUT_PRIMARY = resolve(
  __dirname,
  "output/Camil_Alimentos_H1_2026_Hedge_Backtest_CommoHedge.pdf"
);
const OUT_FALLBACK = resolve(
  __dirname,
  "output/Camil_Alimentos_H1_2026_Hedge_Backtest_CommoHedge_v2.pdf"
);
const LOGO_PATH = resolve(ROOT, "public/commohedge-logo.png");

const C = {
  navy: [12, 19, 34],
  lime: [174, 248, 51],
  text: [30, 41, 59],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  alt: [248, 250, 252],
  line: [226, 232, 240],
  green: [220, 252, 231],
  red: [254, 226, 226],
  card: [241, 245, 249],
  tip: [254, 249, 195],
};

const BRAND = "CommoHedge";
const TAGLINE = "Commodity hedging and intelligence terminal";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
const byKey = Object.fromEntries(data.commodities.map((c) => [c.commodity, c]));

const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
const W = pdf.internal.pageSize.width;
const H = pdf.internal.pageSize.height;
const M = 16;
const CW = W - 2 * M;
let y = M;

const reportId = `CAML-H1-${Date.now().toString(36).toUpperCase().slice(-6)}`;
const generatedDate = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

let logoDataUrl = null;
if (existsSync(LOGO_PATH)) {
  logoDataUrl = `data:image/png;base64,${readFileSync(LOGO_PATH).toString("base64")}`;
}

function money(v, ccy) {
  if (v == null || Number.isNaN(v)) return "n/a";
  const neg = v < 0;
  const abs = Math.abs(v);
  let s;
  if (abs >= 1e6) s = `${(abs / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) s = `${(abs / 1e3).toFixed(0)}k`;
  else s = abs.toFixed(0);
  return `${neg ? "-" : ""}${ccy === "BRL" ? "R$" : "$"}${s}`;
}

function moneyFull(v, ccy) {
  if (v == null || Number.isNaN(v)) return "n/a";
  const neg = v < 0;
  const abs = Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${neg ? "-" : ""}${ccy === "BRL" ? "R$" : "$"}${abs}`;
}

function pct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

function num(v, d = 2) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function nameOf(key) {
  return { sugar: "Sugar", coffee: "Coffee", wheat: "Wheat", rice: "Rice" }[key] || key;
}

function marketOf(key) {
  return {
    sugar: "World sugar futures (ICE)",
    coffee: "Arabica coffee futures (ICE New York)",
    wheat: "US wheat market price",
    rice: "Brazil rice indicator (CEPEA)",
  }[key];
}

function unitLabel(key) {
  return {
    sugar: "USD per pound",
    coffee: "USD per pound",
    wheat: "USD per bushel",
    rice: "BRL per 50 kg bag",
  }[key];
}

function priceDisp(key, p) {
  if (key === "sugar" || key === "coffee") return `${num(p * 100, key === "coffee" ? 1 : 2)} c/lb`;
  if (key === "wheat") return `$${num(p, 2)}/bu`;
  return `R$${num(p, 2)}/bag`;
}

function addHeader() {
  pdf.setFillColor(...C.navy);
  pdf.rect(0, 0, W, 26, "F");
  pdf.setFillColor(...C.lime);
  pdf.rect(0, 26, W, 1.5, "F");
  let x = M;
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, "PNG", M, 4, 16, 16);
      x = M + 20;
    } catch {
      /* skip */
    }
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...C.white);
  pdf.text("COMMOHEDGE", x, 11);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.lime);
  pdf.text(TAGLINE, x, 17);
  pdf.setFontSize(7);
  pdf.setTextColor(180, 190, 200);
  pdf.text(`${reportId}  |  ${generatedDate}`, W - M, 15, { align: "right" });
  y = 34;
}

function newPage() {
  pdf.addPage();
  addHeader();
}

function need(space) {
  if (y + space > H - 16) newPage();
}

function h1(text) {
  need(14);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...C.navy);
  pdf.text(text, M, y);
  y += 3;
  pdf.setFillColor(...C.lime);
  pdf.rect(M, y, 28, 1.2, "F");
  y += 7;
}

function h2(text) {
  need(11);
  y += 1;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...C.navy);
  pdf.text(text, M, y);
  y += 5;
}

function p(text, opts = {}) {
  const size = opts.size || 9;
  const lh = opts.lh || 4.3;
  pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(...(opts.muted ? C.muted : C.text));
  for (const line of pdf.splitTextToSize(text, CW)) {
    need(lh + 2);
    pdf.text(line, M, y);
    y += lh;
  }
  if (!opts.tight) y += 2;
}

function bullet(items) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...C.text);
  for (const item of items) {
    const lines = pdf.splitTextToSize(item, CW - 6);
    need(lines.length * 4.3 + 2);
    pdf.setFillColor(...C.lime);
    pdf.circle(M + 1.5, y - 1, 0.9, "F");
    pdf.text(lines[0], M + 5, y);
    y += 4.3;
    for (let i = 1; i < lines.length; i++) {
      pdf.text(lines[i], M + 5, y);
      y += 4.3;
    }
  }
  y += 2;
}

function tipBox(title, body) {
  need(20);
  const lines = pdf.splitTextToSize(body, CW - 8);
  const boxH = 8 + lines.length * 3.9;
  pdf.setFillColor(...C.tip);
  pdf.roundedRect(M, y, CW, boxH, 1.5, 1.5, "F");
  pdf.setFillColor(...C.lime);
  pdf.rect(M, y, 1.5, boxH, "F");
  y += 4.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.navy);
  pdf.text(title.toUpperCase(), M + 5, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.text);
  for (const line of lines) {
    pdf.text(line, M + 5, y);
    y += 3.9;
  }
  y += 4;
}

function callout(title, body) {
  need(20);
  const lines = pdf.splitTextToSize(body, CW - 8);
  const boxH = 8 + lines.length * 3.9;
  pdf.setFillColor(...C.card);
  pdf.roundedRect(M, y, CW, boxH, 1.5, 1.5, "F");
  pdf.setFillColor(...C.lime);
  pdf.rect(M, y, 1.5, boxH, "F");
  y += 4.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.navy);
  pdf.text(title.toUpperCase(), M + 5, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.text);
  for (const line of lines) {
    pdf.text(line, M + 5, y);
    y += 3.9;
  }
  y += 4;
}

function table(opts) {
  need(18);
  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M, bottom: 14 },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: C.text,
      valign: "middle",
    },
    alternateRowStyles: { fillColor: C.alt },
    styles: {
      lineColor: C.line,
      lineWidth: 0.2,
      overflow: "linebreak",
      font: "helvetica",
    },
    ...opts,
  });
  y = pdf.lastAutoTable.finalY + 5;
}

function paintPnL(hook, cols) {
  if (hook.section !== "body" || !cols.includes(hook.column.index)) return;
  const raw = String(hook.cell.raw ?? "");
  if (raw === "$0" || raw === "R$0" || raw === "0") return;
  if (raw.startsWith("-")) hook.cell.styles.fillColor = C.red;
  else if (raw.includes("$") || raw.includes("R$")) hook.cell.styles.fillColor = C.green;
}

// ========== BUILD ==========
addHeader();

pdf.setFont("helvetica", "bold");
pdf.setFontSize(17);
pdf.setTextColor(...C.navy);
pdf.text("Camil Alimentos", M, y);
y += 7;
pdf.setFontSize(12.5);
pdf.text("H1 2026 Purchase Hedge Simulation", M, y);
y += 6;
pdf.setFont("helvetica", "normal");
pdf.setFontSize(9);
pdf.setTextColor(...C.muted);
pdf.text("A plain-English guide  |  Public prices  |  Estimated volumes", M, y);
y += 5;

pdf.setFillColor(...C.card);
pdf.roundedRect(M, y, CW, 12, 1.5, 1.5, "F");
pdf.setFontSize(8);
pdf.setTextColor(...C.text);
pdf.setFont("helvetica", "bold");
pdf.text("Who", M + 4, y + 4.5);
pdf.setFont("helvetica", "normal");
pdf.text("Camil Alimentos S.A. (CAML3)", M + 4, y + 9);
pdf.setFont("helvetica", "bold");
pdf.text("When", M + 72, y + 4.5);
pdf.setFont("helvetica", "normal");
pdf.text("January - June 2026", M + 72, y + 9);
pdf.setFont("helvetica", "bold");
pdf.text("Cover matrix", M + 120, y + 4.5);
pdf.setFont("helvetica", "normal");
pdf.text("0% / 25% / 50% / 75% / 100%", M + 120, y + 9);
y += 16;

// ---- 1 Glossary ----
h1("1. Simple glossary (read this first)");
p(
  "Camil buys agricultural raw materials (rice, sugar, coffee, wheat) to make food products. Those prices move every month. A hedge is a financial contract that helps stabilize the purchase budget when prices jump."
);
tipBox(
  "In everyday terms",
  "Think of a hedge like travel insurance or a fixed-rate loan: you pay something (or accept less upside) to avoid a nasty surprise on cost."
);
p("Words used in this report:", { bold: true, tight: true });
bullet([
  "Market price (spot): the average price Camil would pay that month if it buys on the open market.",
  "Volume: how much product is purchased that month (estimated from Camil's public reports).",
  "No hedge: buy everything at the market price. Simple, but the bill swings with the market.",
  "Swap (fixed price): agree in advance to pay a fixed price on part of the volume. If the market rises, you are protected. If it falls, you miss the cheaper market.",
  "Call option: like an insurance policy against rising prices. You pay a premium up front. If price rises above a strike, you receive a payoff that offsets the extra cost. If price falls, the option expires unused and you only lose the premium.",
  "Put option (sold in a collar): the other side of a call. Selling a put lowers the net premium you pay, but if price falls a lot you may owe a payoff.",
  "Collar: buy a call and sell a put together. Cheaper protection than a call alone, with a floor on how much you benefit if prices crash.",
  "Zero-cost collar: we choose the put strike so the premium you receive for the put equals the premium you pay for the call. Net premium is about zero. Because each month has a different time left until expiry, that put strike is recalculated every month.",
  "Coverage %: share of monthly volume that is hedged (0%, 25%, 50%, 75% or 100%). The rest stays at market.",
  "Premium: the price of the option (what you pay to buy protection).",
  "Payoff: what the option pays you (or what you owe) when the month's price is known.",
  "Hedge benefit: cost with hedge minus cost without hedge. Positive = the hedge saved money. Negative = the market was cheaper than the hedge.",
]);

// ---- 2 What we did ----
h1("2. What we simulated");
p(
  "We ask: if Camil had hedged 50% of its estimated monthly purchases from January to June 2026, how would the bill compare with buying everything at market?"
);
p(
  "Four strategies, applied separately to rice, sugar, coffee and wheat. All option structures share the same call strike (105% of January), so they are directly comparable:",
  { bold: true, tight: true }
);
bullet([
  "No hedge - buy 100% at each month's market average.",
  "Swap - lock part of the volume at the January average price; the rest stays at market.",
  "Call 105% - buy a call at 105% of the January price. Pay a premium; receive a payoff if price finishes above that strike.",
  "Collar 95%/105% - buy the same 105% call and sell a put at 95% of January (fixed). Net premium is smaller than the call alone, but not necessarily zero.",
  "Zero-cost collar - buy the same 105% call, and each month solve the put strike so put premium = call premium (CommoHedge Zero-Cost Strategies). Net premium is ~0; the put strike changes every month (typically closer to spot than 95%).",
]);
callout(
  "Important",
  "Option premiums are calculated on 2 January 2026 using the Black-76 model (same engine as CommoHedge Strategy Builder / Zero-Cost Strategies). Volatility comes from the six monthly price moves in H1. This is an illustration, not Camil's real trades."
);

// ---- 3 Results glance ----
h1("3. Results at a glance");
p(
  "Rice prices rose, so locking part of the purchase helped. Coffee prices fell a lot, so a fixed swap looked expensive; a call option limited the cost of being wrong."
);
table({
  head: [
    [
      "Commodity",
      "Risk*",
      "Unhedged cost",
      "Swap 50%",
      "Call105 50%",
      "Collar95/105 50%",
      "ZC collar 50%",
    ],
  ],
  body: data.commodities.map((c) => [
    nameOf(c.commodity),
    pct(c.histVol),
    money(c.totals.unhedgedCost, c.currency),
    money(c.totals.deltaPnLSwap, c.currency),
    money(c.totals.deltaPnLCall, c.currency),
    money(c.totals.deltaPnLCollar, c.currency),
    money(c.totals.deltaPnLCollarZC ?? 0, c.currency),
  ]),
  styles: { fontSize: 7 },
  columnStyles: {
    0: { halign: "left", cellWidth: 22 },
    1: { halign: "center", cellWidth: 16 },
  },
  didParseCell: (h) => paintPnL(h, [3, 4, 5, 6]),
});
p(
  "* Risk = historical volatility. Hedge Benefit at 50% cover. Call / Collar / ZC all use call strike = 105% of January.",
  { size: 7.5, muted: true }
);

need(28);
const boxW = (CW - 4) / 2;
pdf.setFillColor(...C.green);
pdf.roundedRect(M, y, boxW, 26, 1.5, 1.5, "F");
pdf.setFillColor(...C.red);
pdf.roundedRect(M + boxW + 4, y, boxW, 26, 1.5, 1.5, "F");
pdf.setFont("helvetica", "bold");
pdf.setFontSize(8);
pdf.setTextColor(...C.navy);
pdf.text("RICE - prices went up", M + 4, y + 5);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(7.5);
pdf.text(
  pdf.splitTextToSize(
    `A 50% swap would have improved the purchase bill by about ${money(byKey.rice.totals.deltaPnLSwap, "BRL")}. That is the clearest win in this period.`,
    boxW - 8
  ),
  M + 4,
  y + 10
);
pdf.setFont("helvetica", "bold");
pdf.text("COFFEE - prices went down", M + boxW + 8, y + 5);
pdf.setFont("helvetica", "normal");
pdf.text(
  pdf.splitTextToSize(
    `A swap locked a high January price and cost about ${money(byKey.coffee.totals.deltaPnLSwap, "USD")}. A call option cost only about ${money(byKey.coffee.totals.deltaPnLCall, "USD")} (mostly the premium).`,
    boxW - 8
  ),
  M + boxW + 8,
  y + 10
);
y += 32;

// ---- 4 How options work ----
h1("4. How the option premium and payoff work");
p(
  "For a food buyer, a call option is insurance against higher raw-material prices."
);
bullet([
  "You choose a strike price (here: 105% of the January average). That is the price level you want protection above.",
  "You pay a premium on day one (or at the start of the program). That premium is the cost of insurance.",
  "At the end of the month, if the market price is above the strike, the option payoff = market price minus strike. That cash gain offsets the higher physical purchase.",
  "If the market price is below the strike, the payoff is zero. You still paid the premium, but you enjoy the cheaper market on your physical purchases.",
]);
tipBox(
  "Net effect of a call (on the hedged half)",
  "Net = - Premium + Payoff. If prices rise a lot, Payoff can exceed Premium (insurance pays). If prices fall, Payoff is zero and you only lose the Premium - which is usually much smaller than the loss on a fixed swap."
);
p(
  "A collar 95%/105% reduces the premium: same 105% call, plus you sell a put at 95% of January. The money received for that put lowers what you pay for the call. If price falls below 95%, you owe a put payoff. The zero-cost collar uses the same call but solves a higher put strike so net premium is ~0."
);

h2("Option strikes used in this simulation");
table({
  head: [
    [
      "Commodity",
      "Unit",
      "Call (105%)",
      "Put collar (95%)",
      "Meaning",
    ],
  ],
  body: data.commodities.map((c) => [
    nameOf(c.commodity),
    unitLabel(c.commodity),
    priceDisp(c.commodity, c.strikeCall),
    priceDisp(c.commodity, c.strikePut),
    "Same call for Call / Collar / ZC; ZC put varies by month",
  ]),
  styles: { fontSize: 7 },
});

// ---- 5 Premiums & payoffs by commodity ----
h1("5. Option premiums and payoffs (by commodity)");
p(
  "Premiums are shown in cash on the hedged volume only (50% of monthly volume). Payoff is what the option returns that month. Net for the call = Payoff minus Premium."
);

for (const c of data.commodities) {
  need(70);
  h2(`${nameOf(c.commodity)}  |  ${marketOf(c.commodity)}`);
  p(
    `Hedged volume each month: ${num(c.results[0].hedgedVolume, 0)} units (50% of ${num(c.monthlyVolume, 0)}). Call 105% = ${priceDisp(c.commodity, c.strikeCall)}. Collar put 95% = ${priceDisp(c.commodity, c.strikePut)}.`,
    { size: 8, muted: true }
  );

  // Summary totals
  table({
    head: [["H1 total (6 months)", "Amount"]],
    body: [
      ["Call 105% premiums paid (cash)", moneyFull(c.totals.callPremiumCash, c.currency)],
      ["Call 105% payoffs received (cash)", moneyFull(c.totals.callPayoffCash, c.currency)],
      [
        "Call 105% net (payoffs - premiums)",
        moneyFull(c.totals.callPayoffCash - c.totals.callPremiumCash, c.currency),
      ],
      ["Collar 95/105 net premiums paid", moneyFull(c.totals.collarPremiumCash, c.currency)],
      ["Collar 95/105 net payoffs", moneyFull(c.totals.collarPayoffCash, c.currency)],
      [
        "Collar 95/105 net (payoffs - premiums)",
        moneyFull(c.totals.collarPayoffCash - c.totals.collarPremiumCash, c.currency),
      ],
      ["Overall hedge benefit (Call 105%)", moneyFull(c.totals.deltaPnLCall, c.currency)],
      ["Overall hedge benefit (Collar 95/105)", moneyFull(c.totals.deltaPnLCollar, c.currency)],
      ["Overall hedge benefit (Zero-cost collar)", moneyFull(c.totals.deltaPnLCollarZC, c.currency)],
    ],
    columnStyles: {
      0: { cellWidth: 95, fontStyle: "bold" },
      1: { halign: "right" },
    },
    didParseCell: (h) => {
      if (h.section === "body" && h.column.index === 1 && [2, 5, 6, 7, 8].includes(h.row.index)) {
        paintPnL(h, [1]);
      }
    },
  });

  p("Month-by-month Call 105% (premium paid vs payoff received):", {
    bold: true,
    tight: true,
    size: 8.5,
  });
  table({
    head: [
      [
        "Month",
        "Market price",
        "Premium / unit",
        "Payoff / unit",
        "Premium (cash)",
        "Payoff (cash)",
        "Net (cash)",
      ],
    ],
    body: c.results.map((r, i) => {
      const net = r.callPayoffCash - r.callPremiumCash;
      return [
        MONTHS[i],
        priceDisp(c.commodity, r.realPrice),
        num(r.callPremium, 4),
        num(r.callPayoff, 4),
        money(r.callPremiumCash, c.currency),
        money(r.callPayoffCash, c.currency),
        money(net, c.currency),
      ];
    }),
    styles: { fontSize: 6.5, cellPadding: 1.4 },
    didParseCell: (h) => paintPnL(h, [6]),
  });

  p("Month-by-month Collar 95%/105% (net premium vs net payoff):", {
    bold: true,
    tight: true,
    size: 8.5,
  });
  table({
    head: [
      [
        "Month",
        "Market price",
        "Net premium / unit",
        "Net payoff / unit",
        "Premium (cash)",
        "Payoff (cash)",
        "Net (cash)",
      ],
    ],
    body: c.results.map((r, i) => {
      const net = r.collarPayoffCash - r.collarPremiumCash;
      return [
        MONTHS[i],
        priceDisp(c.commodity, r.realPrice),
        num(r.collarPremium, 4),
        num(r.collarPayoff, 4),
        money(r.collarPremiumCash, c.currency),
        money(r.collarPayoffCash, c.currency),
        money(net, c.currency),
      ];
    }),
    styles: { fontSize: 6.5, cellPadding: 1.4 },
    didParseCell: (h) => paintPnL(h, [6]),
  });

  // Mini explanation per commodity
  const callNet = c.totals.callPayoffCash - c.totals.callPremiumCash;
  if (c.commodity === "coffee") {
    tipBox(
      "Why coffee call looks better than the swap here",
      `Coffee fell from ${priceDisp("coffee", c.results[0].realPrice)} in January to ${priceDisp("coffee", c.results[5].realPrice)} in June. The call payoffs were mostly zero (price stayed below the strike), so you mainly paid premiums (${money(c.totals.callPremiumCash, "USD")}). That is still much smaller than the ${money(c.totals.deltaPnLSwap, "USD")} opportunity cost of a fixed swap locked at the high January price.`
    );
  } else if (c.commodity === "rice") {
    tipBox(
      "Why rice options and swaps both helped",
      `Rice rose from ${priceDisp("rice", c.results[0].realPrice)} to a peak near ${priceDisp("rice", c.results[3].realPrice)}. Call payoffs turned positive in the rising months, so premiums were partly or fully offset. The swap locked the cheap January price on half the volume and delivered the largest cash benefit (${money(c.totals.deltaPnLSwap, "BRL")}).`
    );
  }
}

// ---- 6 Prices ----
h1("6. Monthly market prices used");
p("Average prices each month - the 'bill' if Camil bought on the market.");
table({
  head: [["Commodity", "Unit", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Risk"]],
  body: data.commodities.map((c) => {
    const cents = c.commodity === "sugar" || c.commodity === "coffee";
    const cells = c.results.map((r) =>
      cents ? num(r.realPrice * 100, c.commodity === "coffee" ? 1 : 2) : num(r.realPrice, 2)
    );
    return [
      nameOf(c.commodity),
      cents ? "cents/lb" : c.unit.includes("BRL") ? "BRL/bag" : "USD/bu",
      ...cells,
      pct(c.histVol),
    ];
  }),
  styles: { fontSize: 7 },
});
p("Sources: CEPEA (rice), ICE sugar and coffee, USDA / futures proxies (wheat).", {
  size: 7.5,
  muted: true,
});

// ---- 7 Volumes ----
h1("7. Estimated monthly volumes");
p(
  "Camil publishes total tonnes sold, not exact tonnes of each raw material. We apply the shares from their investor guide to the 2025 total (2.26 million tonnes), then divide by 12 for a monthly figure."
);
table({
  head: [["Commodity", "Tonnes / month", "Trading units / month", "Share assumption"]],
  body: [
    ["Rice", "65,800", `${num(byKey.rice.monthlyVolume, 0)} bags`, "~35% of total volume"],
    ["Sugar", "47,000", `${num(byKey.sugar.monthlyVolume, 0)} lb`, "~25% of total volume"],
    ["Coffee", "3,300", `${num(byKey.coffee.monthlyVolume, 0)} lb`, "~20% of High Growth"],
    ["Wheat", "9,100", `${num(byKey.wheat.monthlyVolume, 0)} bushels`, "~55% of High Growth"],
  ],
});
p(
  "High Growth = Camil's pasta, biscuits, coffee and canned-fish business in Brazil.",
  { size: 7.5, muted: true }
);

// ---- 8 Full monthly P&L ----
h1("8. Full monthly costs (all strategies)");
p(
  "Cost without hedge vs 50% swap, and hedge benefit for swap, Call 105%, Collar 95/105 and Zero-cost collar."
);

for (const c of data.commodities) {
  need(40);
  h2(nameOf(c.commodity));
  table({
    head: [
      [
        "Month",
        "Market",
        "No hedge",
        "Benefit swap",
        "Benefit call105",
        "Benefit 95/105",
        "Benefit ZC",
      ],
    ],
    body: c.results.map((r, i) => [
      MONTHS[i],
      priceDisp(c.commodity, r.realPrice),
      money(r.unhedgedCost, c.currency),
      money(r.deltaPnLSwap, c.currency),
      money(r.deltaPnLCall, c.currency),
      money(r.deltaPnLCollar, c.currency),
      money(r.deltaPnLCollarZC, c.currency),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.4 },
    didParseCell: (h) => paintPnL(h, [3, 4, 5, 6]),
  });
}

// ---- 9 Takeaways ----
h1("9. Zero-cost collar: different put strike each month");
p(
  "Same 105% call as the Call and the Collar 95/105. In CommoHedge Zero-Cost Strategies we solve the put strike so the two premiums cancel. For each month's maturity: call premium = put premium, therefore net premium is about zero. That put is usually closer to spot than the fixed 95% put - so you finance the call more aggressively."
);
tipBox(
  "Why the put strike changes every month",
  "January options have little time left; June options have more time. Option prices depend on time. So the put strike that makes the package free is not the same in February as in June. That is expected - it is not a calculation error."
);

for (const c of data.commodities) {
  need(42);
  h2(`${nameOf(c.commodity)} - zero-cost strikes`);
  const callZc = c.strikeCallZC ?? c.strikeCall * 1.05;
  p(
    `Call strike fixed at ${priceDisp(c.commodity, callZc)} (105% of January). Put strike solved each month:`,
    { size: 8, muted: true }
  );
  table({
    head: [
      [
        "Month",
        "Market",
        "Call strike",
        "Put strike (ZC)",
        "Put % of Jan",
        "Call prem.",
        "Put prem.",
        "Net prem.",
      ],
    ],
    body: (c.monthsDetail || c.results).map((m, i) => [
      MONTHS[i],
      priceDisp(c.commodity, m.realPrice),
      priceDisp(c.commodity, m.strikeCallZC ?? callZc),
      priceDisp(c.commodity, m.strikePutZC),
      `${num(m.strikePutZCPctOfSpot, 1)}%`,
      num(m.callPremiumZC ?? m.callPremium, 4),
      num(m.putPremiumZC, 4),
      num(m.collarZCPremium, 6),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.3 },
  });
}

h1("10. Coverage matrix (0% / 25% / 50% / 75% / 100%)");
p(
  "Same strategies, but we change how much of the monthly volume is hedged. Hedge Benefit for the full H1 period. 0% is always zero (no hedge). Green = hedge helped; red = market was cheaper."
);
p(
  "Strategies: Swap | Call 105% | Collar 95%/105% | Zero-cost collar (same call 105%, put re-solved each month).",
  { size: 8, muted: true }
);

for (const c of data.commodities) {
  need(55);
  h2(`${nameOf(c.commodity)} - Hedge Benefit by coverage`);
  if (!c.coverageMatrix) {
    p("Coverage matrix missing - re-run backtest script.", { muted: true });
    continue;
  }
  const labels = {
    swap: "Swap",
    call: "Call 105%",
    collar95: "Collar 95%/105%",
    collarZC: "Zero-cost collar",
  };
  table({
    head: [["Strategy", "0%", "25%", "50%", "75%", "100%"]],
    body: ["swap", "call", "collar95", "collarZC"].map((strat) => [
      labels[strat],
      ...["0%", "25%", "50%", "75%", "100%"].map((cov) =>
        money(c.coverageMatrix[strat][cov].hedgeBenefit, c.currency)
      ),
    ]),
    styles: { fontSize: 7, cellPadding: 1.6 },
    didParseCell: (h) => paintPnL(h, [1, 2, 3, 4, 5]),
  });

  p("Option premiums paid over H1 (cash on hedged volume only):", {
    bold: true,
    tight: true,
    size: 8,
  });
  table({
    head: [["Strategy", "0%", "25%", "50%", "75%", "100%"]],
    body: ["call", "collar95", "collarZC"].map((strat) => [
      labels[strat],
      ...["0%", "25%", "50%", "75%", "100%"].map((cov) =>
        money(c.coverageMatrix[strat][cov].premiumCash, c.currency)
      ),
    ]),
    styles: { fontSize: 7, cellPadding: 1.6 },
  });
  p("Option payoffs received over H1:", { bold: true, tight: true, size: 8 });
  table({
    head: [["Strategy", "0%", "25%", "50%", "75%", "100%"]],
    body: ["call", "collar95", "collarZC"].map((strat) => [
      labels[strat],
      ...["0%", "25%", "50%", "75%", "100%"].map((cov) =>
        money(c.coverageMatrix[strat][cov].payoffCash, c.currency)
      ),
    ]),
    styles: { fontSize: 7, cellPadding: 1.6 },
  });
}

h1("11. Key takeaways for a non-technical reader");
bullet([
  "Hedging is about budget certainty, not about 'beating' the market every time.",
  "Call 105%, Collar 95/105 and Zero-cost share the same upside (same call). Differences come only from the put: premium saved vs downside obligation.",
  "When prices rise (rice), a swap often wins; options capture only the move above 105%.",
  "When prices fall (coffee), higher swap coverage hurts more; Call 105% caps the loss at the premium; collars can hurt more if the short put is hit.",
  "Zero-cost is not risk-free: the solved put is usually tighter than 95%, so you give up more if prices fall, in exchange for ~0 premium.",
  "Use the coverage matrix to choose 25%, 50% or 75% once the structure is chosen.",
]);

h1("12. Important notes");
p(
  "This document is an illustrative marketing report. It uses public prices and estimated volumes. It is not investment advice, not an offer to trade, and not a description of Camil's real hedge book."
);
p(
  "Volume shares come from Camil investor materials where exact raw-material tonnes are not disclosed. A few monthly prices are approximations when official averages were incomplete."
);
y += 2;
p(`${BRAND}  |  ${TAGLINE}`, { muted: true, size: 8 });

const pages = pdf.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  pdf.setPage(i);
  pdf.setDrawColor(...C.line);
  pdf.setLineWidth(0.3);
  pdf.line(M, H - 11, W - M, H - 11);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text("Camil H1 2026 hedge simulation", M, H - 6);
  pdf.text(`Page ${i} of ${pages}`, W / 2, H - 6, { align: "center" });
  pdf.text(BRAND, W - M, H - 6, { align: "right" });
  pdf.setFillColor(...C.lime);
  pdf.rect(0, H - 2, W, 2, "F");
}

const buf = Buffer.from(pdf.output("arraybuffer"));
let outPath = OUT_PRIMARY;
try {
  writeFileSync(outPath, buf);
} catch (err) {
  if (err && err.code === "EBUSY") {
    outPath = OUT_FALLBACK;
    writeFileSync(outPath, buf);
    console.warn("Primary PDF locked; wrote fallback:", outPath);
  } else {
    throw err;
  }
}
console.log(`PDF written: ${outPath}`);
console.log(`Pages: ${pages}`);
