/**
 * CommoHedge illustrative PDF — anonymized US soft-wheat bakery hedge case.
 * Layout: cover page, KPI strip, sectioned tables, light headers.
 * Run: node scripts/generate-northbridge-wheat-pdf.mjs
 */
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const JSON_PATH = resolve(__dirname, "output/northbridge-wheat-h1-2026-backtest.json");
const OUT_PRIMARY = resolve(
  __dirname,
  "output/CommoHedge_Illustrative_Wheat_Buyer_Hedge_H1_2026.pdf"
);
const OUT_FALLBACK = resolve(
  __dirname,
  "output/CommoHedge_Illustrative_Wheat_Buyer_Hedge_H1_2026_v2.pdf"
);
const LOGO_PATH = resolve(ROOT, "public/commohedge-logo.png");

const C = {
  navy: [12, 19, 34],
  navy2: [22, 32, 52],
  lime: [174, 248, 51],
  text: [30, 41, 59],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  alt: [248, 250, 252],
  line: [226, 232, 240],
  green: [220, 252, 231],
  greenInk: [22, 101, 52],
  red: [254, 226, 226],
  redInk: [153, 27, 27],
  card: [241, 245, 249],
  tip: [255, 251, 235],
  warn: [254, 243, 199],
};

const BRAND = "CommoHedge";
const TAGLINE = "Commodity hedging and intelligence terminal";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const DISCLAIMER_SHORT = "ILLUSTRATIVE ANONYMIZED CASE — not a real company";

const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));
const t = data.totals;
const mkt = data.market;
const profile = data.profile;

const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
const W = pdf.internal.pageSize.width;
const H = pdf.internal.pageSize.height;
const M = 18;
const CW = W - 2 * M;
const FOOTER_H = 14;
let y = M;
let pageHasBanner = false;

const reportId = `NBW-H1-${Date.now().toString(36).toUpperCase().slice(-6)}`;
const generatedDate = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

let logoDataUrl = null;
if (existsSync(LOGO_PATH)) {
  logoDataUrl = `data:image/png;base64,${readFileSync(LOGO_PATH).toString("base64")}`;
}

function money(v) {
  if (v == null || Number.isNaN(v)) return "n/a";
  const neg = v < 0;
  const abs = Math.abs(v);
  let s;
  if (abs >= 1e6) s = `${(abs / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) s = `${(abs / 1e3).toFixed(0)}k`;
  else s = abs.toFixed(0);
  return `${neg ? "-" : ""}$${s}`;
}

function moneyFull(v) {
  if (v == null || Number.isNaN(v)) return "n/a";
  const neg = v < 0;
  const abs = Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${neg ? "-" : ""}$${abs}`;
}

function num(v, d = 2) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function bu(p) {
  return `$${num(p, 4)}/bu`;
}

function addHeader() {
  pdf.setFillColor(...C.navy);
  pdf.rect(0, 0, W, 22, "F");
  pdf.setFillColor(...C.lime);
  pdf.rect(0, 22, W, 1.2, "F");
  let x = M;
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, "PNG", M, 3.5, 14, 14);
      x = M + 18;
    } catch {
      /* skip */
    }
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...C.white);
  pdf.text("COMMOHEDGE", x, 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.lime);
  pdf.text(TAGLINE, x, 16);
  pdf.setTextColor(180, 190, 200);
  pdf.text(`${reportId}  |  ${generatedDate}`, W - M, 13, { align: "right" });
  y = 28;
  pageHasBanner = false;
}

function slimBanner() {
  if (pageHasBanner) return;
  pdf.setFillColor(...C.warn);
  pdf.roundedRect(M, y, CW, 6.5, 1, 1, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.navy);
  pdf.text(DISCLAIMER_SHORT, M + CW / 2, y + 4.3, { align: "center" });
  y += 10;
  pageHasBanner = true;
}

function newPage() {
  pdf.addPage();
  addHeader();
  slimBanner();
}

function need(space) {
  if (y + space > H - FOOTER_H) newPage();
}

function sectionBreak() {
  newPage();
}

function h1(text) {
  need(16);
  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...C.navy);
  pdf.text(text, M, y);
  y += 3.5;
  pdf.setFillColor(...C.lime);
  pdf.rect(M, y, 22, 1.4, "F");
  y += 8;
}

function h2(text) {
  need(12);
  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...C.navy);
  pdf.text(text, M, y);
  y += 6;
}

function p(text, opts = {}) {
  const size = opts.size || 9.5;
  const lh = opts.lh || 4.6;
  pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(...(opts.muted ? C.muted : C.text));
  for (const line of pdf.splitTextToSize(text, CW)) {
    need(lh + 2);
    pdf.text(line, M, y);
    y += lh;
  }
  if (!opts.tight) y += 3;
}

function bullet(items) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...C.text);
  for (const item of items) {
    const lines = pdf.splitTextToSize(item, CW - 7);
    need(lines.length * 4.5 + 3);
    pdf.setFillColor(...C.lime);
    pdf.circle(M + 1.8, y - 1.1, 1.05, "F");
    pdf.text(lines[0], M + 6, y);
    y += 4.5;
    for (let i = 1; i < lines.length; i++) {
      pdf.text(lines[i], M + 6, y);
      y += 4.5;
    }
    y += 1.5;
  }
  y += 2;
}

function tipBox(title, body) {
  const lines = pdf.splitTextToSize(body, CW - 10);
  const boxH = 10 + lines.length * 4;
  need(boxH + 4);
  pdf.setFillColor(...C.tip);
  pdf.roundedRect(M, y, CW, boxH, 2, 2, "F");
  pdf.setFillColor(...C.lime);
  pdf.rect(M, y, 2, boxH, "F");
  let ty = y + 5.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.navy);
  pdf.text(title.toUpperCase(), M + 6, ty);
  ty += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.text);
  for (const line of lines) {
    pdf.text(line, M + 6, ty);
    ty += 4;
  }
  y += boxH + 5;
}

function callout(title, body) {
  const lines = pdf.splitTextToSize(body, CW - 10);
  const boxH = 10 + lines.length * 4;
  need(boxH + 4);
  pdf.setFillColor(...C.card);
  pdf.roundedRect(M, y, CW, boxH, 2, 2, "F");
  pdf.setFillColor(...C.lime);
  pdf.rect(M, y, 2, boxH, "F");
  let ty = y + 5.5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.navy);
  pdf.text(title.toUpperCase(), M + 6, ty);
  ty += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.text);
  for (const line of lines) {
    pdf.text(line, M + 6, ty);
    ty += 4;
  }
  y += boxH + 5;
}

function kpiRow(cards) {
  const gap = 3;
  const n = cards.length;
  const cardW = (CW - gap * (n - 1)) / n;
  const cardH = 22;
  need(cardH + 6);
  cards.forEach((card, i) => {
    const x = M + i * (cardW + gap);
    pdf.setFillColor(...C.card);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    pdf.setFillColor(...C.lime);
    pdf.rect(x, y, cardW, 1.2, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.muted);
    pdf.text(card.label.toUpperCase(), x + 3, y + 7);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(card.value.length > 10 ? 10 : 12);
    const ink =
      card.tone === "pos" ? C.greenInk : card.tone === "neg" ? C.redInk : C.navy;
    pdf.setTextColor(...ink);
    pdf.text(card.value, x + 3, y + 15);
  });
  y += cardH + 8;
}

function metaGrid(rows) {
  // 2-column key/value cards
  const gap = 3;
  const colW = (CW - gap) / 2;
  const rowH = 14;
  for (let i = 0; i < rows.length; i += 2) {
    need(rowH + 3);
    for (let c = 0; c < 2; c++) {
      const item = rows[i + c];
      if (!item) continue;
      const x = M + c * (colW + gap);
      pdf.setFillColor(...C.alt);
      pdf.roundedRect(x, y, colW, rowH, 1.5, 1.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...C.muted);
      pdf.text(item[0].toUpperCase(), x + 3.5, y + 5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.text);
      const valLines = pdf.splitTextToSize(String(item[1]), colW - 7);
      pdf.text(valLines[0], x + 3.5, y + 10.5);
    }
    y += rowH + 3;
  }
  y += 2;
}

function table(opts) {
  need(22);
  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOTER_H },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: { top: 2.6, bottom: 2.6, left: 2.2, right: 2.2 },
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2.2, right: 2.2 },
      textColor: C.text,
      valign: "middle",
    },
    alternateRowStyles: { fillColor: C.alt },
    styles: {
      lineColor: C.line,
      lineWidth: 0.15,
      overflow: "linebreak",
      font: "helvetica",
    },
    ...opts,
  });
  y = pdf.lastAutoTable.finalY + 7;
}

function paintPnL(hook, cols) {
  if (hook.section !== "body" || !cols.includes(hook.column.index)) return;
  const raw = String(hook.cell.raw ?? "");
  if (raw === "$0" || raw === "0") return;
  if (raw.startsWith("-")) hook.cell.styles.fillColor = C.red;
  else if (raw.includes("$")) hook.cell.styles.fillColor = C.green;
}

function strategyCards() {
  const items = [
    {
      title: "Forward strip",
      body: "Lock each month at the June 2025 forward. No option premium. Miss cheaper market on hedged share.",
    },
    {
      title: "Call 105%",
      body: "Same upside strike for all option books. Pay premium; keep downside if wheat falls.",
    },
    {
      title: "Collar 95/105",
      body: "Buy the 105% call, sell a fixed 95% put. Lower net premium; put can pay if prices drop.",
    },
    {
      title: "Zero-cost collar",
      body: "Same 105% call. Put strike solved monthly so premiums cancel. Put usually tighter than 95%.",
    },
  ];
  const gap = 3;
  const colW = (CW - gap) / 2;
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    const bodyL = pdf.splitTextToSize(left.body, colW - 8);
    const bodyR = right ? pdf.splitTextToSize(right.body, colW - 8) : [];
    const boxH = Math.max(16 + bodyL.length * 3.8, 16 + bodyR.length * 3.8);
    need(boxH + 4);
    [left, right].forEach((item, c) => {
      if (!item) return;
      const x = M + c * (colW + gap);
      const lines = c === 0 ? bodyL : bodyR;
      pdf.setFillColor(...C.white);
      pdf.setDrawColor(...C.line);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(x, y, colW, boxH, 2, 2, "FD");
      pdf.setFillColor(...C.lime);
      pdf.rect(x, y, 2, boxH, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.navy);
      pdf.text(item.title, x + 5, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...C.text);
      let ty = y + 11;
      for (const line of lines) {
        pdf.text(line, x + 5, ty);
        ty += 3.8;
      }
    });
    y += boxH + 4;
  }
  y += 2;
}

// ========== COVER ==========
pdf.setFillColor(...C.navy);
pdf.rect(0, 0, W, H, "F");
pdf.setFillColor(...C.lime);
pdf.rect(0, 0, W, 4, "F");
pdf.rect(0, H - 4, W, 4, "F");

if (logoDataUrl) {
  try {
    pdf.addImage(logoDataUrl, "PNG", M, 28, 22, 22);
  } catch {
    /* skip */
  }
}
pdf.setFont("helvetica", "bold");
pdf.setFontSize(18);
pdf.setTextColor(...C.white);
pdf.text("COMMOHEDGE", M + (logoDataUrl ? 28 : 0), 38);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(9);
pdf.setTextColor(...C.lime);
pdf.text(TAGLINE, M + (logoDataUrl ? 28 : 0), 45);

pdf.setFont("helvetica", "bold");
pdf.setFontSize(8);
pdf.setTextColor(160, 175, 190);
pdf.text("TREASURY  /  PROCUREMENT  MEMO", M, 72);

pdf.setFont("helvetica", "bold");
pdf.setFontSize(26);
pdf.setTextColor(...C.white);
const coverTitle = pdf.splitTextToSize("Wheat purchase hedge", CW - 10);
pdf.text(coverTitle, M, 88);
pdf.setFontSize(18);
pdf.setTextColor(...C.lime);
pdf.text("H1 2026  ·  CBOT Soft Red Winter", M, 102);

pdf.setFont("helvetica", "normal");
pdf.setFontSize(11);
pdf.setTextColor(200, 210, 220);
pdf.text("Decision date  30 June 2025", M, 118);
pdf.text("Purchase window  January – June 2026", M, 126);
pdf.text("Case  Northbridge Bakery Group (fictional)", M, 134);

pdf.setFillColor(...C.navy2);
pdf.roundedRect(M, 152, CW, 28, 2, 2, "F");
pdf.setDrawColor(...C.lime);
pdf.setLineWidth(0.6);
pdf.roundedRect(M, 152, CW, 28, 2, 2, "S");
pdf.setFont("helvetica", "bold");
pdf.setFontSize(8);
pdf.setTextColor(...C.lime);
pdf.text("ILLUSTRATIVE ANONYMIZED CASE", M + 6, 162);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(8.5);
pdf.setTextColor(210, 218, 228);
const disc = pdf.splitTextToSize(
  "Not a real company. Volumes are industry-scaled fiction. CBOT prices are public data. Not investment advice.",
  CW - 12
);
pdf.text(disc, M + 6, 170);

pdf.setFontSize(8);
pdf.setTextColor(140, 155, 170);
pdf.text(`${reportId}  ·  Generated ${generatedDate}`, M, H - 18);
pdf.text(BRAND, W - M, H - 18, { align: "right" });

// ========== PAGE 2: EXEC + WHY ==========
newPage();

h1("Executive snapshot");
p(
  "If a mid-size soft-wheat flour buyer had sized H1 2026 hedges on 30 June 2025, how would the purchase bill compare with buying unhedged at CBOT SRW averages?",
  { size: 10 }
);

kpiRow([
  {
    label: "Forward strip 50%",
    value: money(t.deltaPnLSwap),
    tone: t.deltaPnLSwap >= 0 ? "pos" : "neg",
  },
  {
    label: "Call 105% 50%",
    value: money(t.deltaPnLCall),
    tone: t.deltaPnLCall >= 0 ? "pos" : "neg",
  },
  {
    label: "Collar 95/105 50%",
    value: money(t.deltaPnLCollar),
    tone: t.deltaPnLCollar >= 0 ? "pos" : "neg",
  },
  {
    label: "Zero-cost 50%",
    value: money(t.deltaPnLCollarZC),
    tone: t.deltaPnLCollarZC >= 0 ? "pos" : "neg",
  },
]);

p(
  "Hedge benefit = cost with hedge minus unhedged cost. Green = hedge improved the bill. On this path the forward strip edged ahead; long-dated option premiums from June 2025 outweighed sparse call payoffs.",
  { size: 8.5, muted: true }
);

metaGrid([
  ["Benchmark", "CBOT Soft Red Winter (ZW)"],
  ["Monthly volume", `${num(profile.monthlyBushels, 0)} bu`],
  ["Strip average (ref)", bu(mkt.stripAvgUsd)],
  ["Call / Put strikes", `${bu(mkt.strikeCall)} / ${bu(mkt.strikePut95)}`],
  ["Hist. vol (H1 moves)", `${(mkt.histVol * 100).toFixed(1)}%`],
  ["Coverage matrix", "0% · 25% · 50% · 75% · 100%"],
]);

h1("1. Why a flour buyer hedges wheat");
p(
  "A bakery that buys soft-wheat flour carries CBOT SRW risk whenever mill quotes track Chicago. Between budget season and delivery, the curve can move enough to erase a thin manufacturing margin."
);
p(
  "The question on 30 June 2025 was not \"will wheat go up?\" It was: how much of H1 2026 purchases to lock, insure, or leave open — and at what cost?"
);
tipBox(
  "Scope of this memo",
  "Hedging the CBOT SRW leg only. Local flour basis and milling margin are residual risks, stated but not modeled."
);

// ========== PROFILE ==========
sectionBreak();
h1("2. Profile and volumes (fictional)");
p(
  "Northbridge Bakery Group stands in for a Midwest commercial bakery that buys soft-wheat flour. Soft Red Winter is the Chicago contract for cake, cookie and pastry flour — not durum."
);
metaGrid([
  ["Company", "Northbridge Bakery Group (illustrative)"],
  ["Sector", "Commercial bakery / soft-wheat flour"],
  ["Annual wheat-eq.", `${num(profile.annualWheatTonnes, 0)} tonnes`],
  ["Annual bushels", `${num(profile.annualBushels, 0)} bu`],
  ["Monthly purchase", `${num(profile.monthlyBushels, 0)} bu`],
  ["Basis treatment", "Not modeled (residual risk)"],
]);
callout("Volume note", profile.volumeNote);

h1("3. June 2025 decision — forward strip");
p(
  "On 30 June 2025 the front CBOT SRW continuous settle was 528.75 c/bu. Dec'26 settled at 624.50 c/bu (Yahoo Finance). Free feeds lacked clean Mar/May/Jul'26 history, so the H1 strip is a linear interpolation between those anchors — a decision process, not a dealer quote sheet."
);
table({
  head: [["Month", "Forward (Jun-2025)", "Realized H1-2026", "Gap (USD/bu)"]],
  body: data.results.map((r, i) => {
    const gap = r.realPrice - r.forward;
    return [
      MONTHS[i],
      bu(r.forward),
      bu(r.realPrice),
      `${gap >= 0 ? "+" : ""}${num(gap, 4)}`,
    ];
  }),
  columnStyles: {
    0: { halign: "center", cellWidth: 22 },
    1: { halign: "right" },
    2: { halign: "right" },
    3: { halign: "right", fontStyle: "bold" },
  },
  didParseCell: (h) => {
    if (h.section === "body" && h.column.index === 3) {
      const raw = String(h.cell.raw ?? "");
      if (raw.startsWith("-")) h.cell.styles.fillColor = C.green;
      else if (raw.startsWith("+")) h.cell.styles.fillColor = C.red;
    }
  },
});
tipBox(
  "How to read the gap",
  "Positive = market finished above the June forward (buyer swap helped). Negative = market cheaper than the lock (swap opportunity cost)."
);
p(
  `Option reference = strip average ${bu(mkt.stripAvgUsd)}. Call 105% = ${bu(mkt.strikeCall)}. Collar put 95% = ${bu(mkt.strikePut95)}.`,
  { size: 8.5, muted: true }
);

// ========== STRATEGIES ==========
sectionBreak();
h1("4. Strategies compared");
p(
  "All three option structures share the same call strike (105% of the June strip average). Only the put leg changes — so the comparison is fair."
);
strategyCards();

table({
  head: [["Strategy", "Upfront cost", "If prices fall hard"]],
  body: [
    ["Forward strip", "None (futures margin)", "Miss cheaper market on hedged %"],
    ["Call 105%", "Full call premium", "Lose premium only"],
    ["Collar 95%/105%", "Net premium (lower)", "Owe put below 95%"],
    ["Zero-cost collar", "~0 net premium", "Put usually tighter than 95%"],
  ],
  columnStyles: {
    0: { fontStyle: "bold", cellWidth: 40 },
    1: { cellWidth: 45 },
  },
});

// ========== RESULTS ==========
sectionBreak();
h1("5. Results at 50% coverage");
p(
  `Hedged volume each month: ${num(data.results[0].hedgedVolume, 0)} bu (half of ${num(profile.monthlyBushels, 0)}).`
);

kpiRow([
  { label: "Unhedged H1 cost", value: money(t.unhedgedCost), tone: "neu" },
  {
    label: "Best structure (50%)",
    value: "Forward",
    tone: "pos",
  },
  {
    label: "Call premiums paid",
    value: money(t.callPremiumCash),
    tone: "neu",
  },
  {
    label: "Call payoffs recv.",
    value: money(t.callPayoffCash),
    tone: "neu",
  },
]);

table({
  head: [["Metric", "H1 total"]],
  body: [
    ["Unhedged wheat cost", moneyFull(t.unhedgedCost)],
    ["Benefit — Forward strip 50%", moneyFull(t.deltaPnLSwap)],
    ["Benefit — Call 105% 50%", moneyFull(t.deltaPnLCall)],
    ["Benefit — Collar 95/105 50%", moneyFull(t.deltaPnLCollar)],
    ["Benefit — Zero-cost collar 50%", moneyFull(t.deltaPnLCollarZC)],
    ["Call premiums paid", moneyFull(t.callPremiumCash)],
    ["Call payoffs received", moneyFull(t.callPayoffCash)],
    ["Collar 95/105 net premiums", moneyFull(t.collarPremiumCash)],
    ["Collar 95/105 net payoffs", moneyFull(t.collarPayoffCash)],
    ["ZC collar net premiums (~0)", moneyFull(t.collarZCPremiumCash)],
    ["ZC collar net payoffs", moneyFull(t.collarZCPayoffCash)],
  ],
  columnStyles: {
    0: { fontStyle: "bold", cellWidth: 100, halign: "left" },
    1: { halign: "right" },
  },
  didParseCell: (h) => {
    if (h.section === "body" && h.column.index === 1 && [1, 2, 3, 4].includes(h.row.index)) {
      paintPnL(h, [1]);
    }
  },
});

h2("Month-by-month hedge benefit (50%)");
table({
  head: [["Month", "Market", "Forward", "Swap", "Call105", "95/105", "ZC"]],
  body: data.results.map((r, i) => [
    MONTHS[i],
    bu(r.realPrice),
    bu(r.forward),
    money(r.deltaPnLSwap),
    money(r.deltaPnLCall),
    money(r.deltaPnLCollar),
    money(r.deltaPnLCollarZC),
  ]),
  styles: { fontSize: 7.5 },
  didParseCell: (h) => paintPnL(h, [3, 4, 5, 6]),
});

// ========== MATRIX ==========
sectionBreak();
h1("6. Coverage matrix");
p(
  "Same structures; only the share of monthly volume hedged changes. On this path, benefit scales roughly with coverage."
);

h2("Hedge benefit by coverage");
table({
  head: [["Strategy", "0%", "25%", "50%", "75%", "100%"]],
  body: ["swap", "call", "collar95", "collarZC"].map((strat) => {
    const labels = {
      swap: "Forward strip",
      call: "Call 105%",
      collar95: "Collar 95%/105%",
      collarZC: "Zero-cost collar",
    };
    return [
      labels[strat],
      ...["0%", "25%", "50%", "75%", "100%"].map((cov) =>
        money(data.coverageMatrix[strat][cov].hedgeBenefit)
      ),
    ];
  }),
  columnStyles: { 0: { fontStyle: "bold", halign: "left", cellWidth: 38 } },
  didParseCell: (h) => paintPnL(h, [1, 2, 3, 4, 5]),
});

h2("Option premiums paid");
table({
  head: [["Strategy", "0%", "25%", "50%", "75%", "100%"]],
  body: [
    [
      "Call 105%",
      ...["0%", "25%", "50%", "75%", "100%"].map((c) =>
        money(data.coverageMatrix.call[c].premiumCash)
      ),
    ],
    [
      "Collar 95%/105%",
      ...["0%", "25%", "50%", "75%", "100%"].map((c) =>
        money(data.coverageMatrix.collar95[c].premiumCash)
      ),
    ],
    [
      "Zero-cost collar",
      ...["0%", "25%", "50%", "75%", "100%"].map((c) =>
        money(data.coverageMatrix.collarZC[c].premiumCash)
      ),
    ],
  ],
  columnStyles: { 0: { fontStyle: "bold", halign: "left", cellWidth: 38 } },
});

h2("Option payoffs received");
table({
  head: [["Strategy", "0%", "25%", "50%", "75%", "100%"]],
  body: [
    [
      "Call 105%",
      ...["0%", "25%", "50%", "75%", "100%"].map((c) =>
        money(data.coverageMatrix.call[c].payoffCash)
      ),
    ],
    [
      "Collar 95%/105%",
      ...["0%", "25%", "50%", "75%", "100%"].map((c) =>
        money(data.coverageMatrix.collar95[c].payoffCash)
      ),
    ],
    [
      "Zero-cost collar",
      ...["0%", "25%", "50%", "75%", "100%"].map((c) =>
        money(data.coverageMatrix.collarZC[c].payoffCash)
      ),
    ],
  ],
  columnStyles: { 0: { fontStyle: "bold", halign: "left", cellWidth: 38 } },
});

// ========== ZC ==========
sectionBreak();
h1("7. Zero-cost collar — put by month");
p(
  "Call fixed at 105% of the June strip average. For each maturity priced on 30 Jun 2025, the put strike is solved so put premium = call premium. Net ≈ 0. The put moves because time to expiry changes."
);
table({
  head: [["Month", "Market", "Call", "Put ZC", "% ref", "Call prem", "Put prem", "Net"]],
  body: data.monthsDetail.map((row, i) => [
    MONTHS[i],
    bu(row.realPrice),
    bu(row.strikeCall),
    bu(row.strikePutZC),
    `${num(row.strikePutZCPctOfRef, 1)}%`,
    num(row.callPremiumZC, 4),
    num(row.putPremiumZC, 4),
    num(row.collarZCPremium, 6),
  ]),
  styles: { fontSize: 7 },
  columnStyles: {
    0: { halign: "center", cellWidth: 16 },
    4: { halign: "center" },
  },
});
tipBox(
  "Why the put changes",
  "January options had ~7 months left from the decision date; June options had ~12. Different time = different put strike that clears the call premium."
);

// ========== PRODUCT + LIMITS ==========
sectionBreak();
h1("8. CommoHedge workflow");
p("The example is about process, not a single winning trade.");
bullet([
  "Capture exposure — monthly wheat volume, unit, currency, purchase window.",
  "Price the curve — CBOT SRW forwards as of the decision date.",
  "Build structures — swap, call, collar, zero-cost with shared strikes.",
  "Stress coverage — 0–100% matrix for a policy band.",
  "Explain P&L — premium, payoff and hedge benefit, separately.",
]);
callout(
  "Product fit",
  "CommoHedge Strategy Builder and Zero-Cost Strategies use the same Black-76 engine. Treasury can reproduce the collar solve, change coverage, and export a board-ready view without rebuilding spreadsheets each quarter."
);

h1("9. Limits and residual risks");
bullet([
  "Flour vs futures: physical flour includes milling and basis; this memo hedges the CBOT SRW leg only.",
  "Strip construction: H1 deferreds interpolated from front and Dec'26 when free H/K/N26 history was unavailable.",
  "Options priced once on 30 Jun 2025 for each maturity; no dynamic rebalancing.",
  "No credit, margin or liquidity costs modeled.",
  "Volumes are illustrative — not from any company disclosure.",
]);
p(
  "Sources: Yahoo Finance CBOT SRW (ZW=F daily; ZWZ26.CBT 30 Jun 2025 settle). Pricing: CommoHedge Black-76 / Zero-Cost Strategies.",
  { size: 8, muted: true }
);

h1("10. Bottom line");
p(
  `On this path the forward strip at 50% coverage delivered a hedge benefit of ${money(t.deltaPnLSwap)}. Call 105% and the collars share the same upside strike; they differ by premium paid and put obligation. Coverage (25–75%) usually matters as much as structure.`
);

pdf.setFillColor(...C.navy);
pdf.roundedRect(M, y, CW, 20, 2, 2, "F");
pdf.setFont("helvetica", "bold");
pdf.setFontSize(10);
pdf.setTextColor(...C.white);
pdf.text("Use the matrix to set a policy.", M + 6, y + 8);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(9);
pdf.setTextColor(...C.lime);
pdf.text("Use CommoHedge to price and compare before the curve moves again.", M + 6, y + 15);
y += 26;

p(DISCLAIMER_SHORT, { muted: true, size: 7.5, tight: true });

// Footers
const pages = pdf.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  pdf.setPage(i);
  // skip cover (page 1 is full navy — still add subtle footer)
  if (i === 1) {
    continue;
  }
  pdf.setDrawColor(...C.line);
  pdf.setLineWidth(0.3);
  pdf.line(M, H - 10, W - M, H - 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.muted);
  pdf.text("Illustrative anonymized case", M, H - 5.5);
  pdf.text(`${i - 1} / ${pages - 1}`, W / 2, H - 5.5, { align: "center" });
  pdf.text(BRAND, W - M, H - 5.5, { align: "right" });
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
console.log(`Pages: ${pages} (1 cover + ${pages - 1} content)`);
