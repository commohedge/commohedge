import { BRAND } from "@/constants/branding";
import type { PageSeo } from "@/seo/site-seo";

export type SolutionSlug = "oil-energy" | "metals-mining" | "agriculture";

export type SolutionPageContent = {
  slug: SolutionSlug;
  path: `/${string}`;
  navLabel: string;
  eyebrow: string;
  h1: string;
  lead: string;
  seo: PageSeo;
  bullets: string[];
  instruments: string[];
  workflows: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  ctaLabel: string;
};

export const SOLUTION_PAGES: Record<SolutionSlug, SolutionPageContent> = {
  "oil-energy": {
    slug: "oil-energy",
    path: "/solutions/oil-energy",
    navLabel: "Oil & energy",
    eyebrow: "Oil & energy desk",
    h1: "Oil & energy hedging terminal",
    lead: `${BRAND.name} prices crude, distillates and refined structures on one consistent spine — Black-76, barriers and Asians wired to your forward curves for desk and board reporting.`,
    seo: {
      title: `Oil & energy hedging software | ${BRAND.name}`,
      description:
        "Price and hedge crude, distillates and refined products with Black-76, barriers and Asians. Forward curves, exposures and strategy workflows in one terminal.",
      path: "/solutions/oil-energy",
      robots: "index, follow",
    },
    bullets: [
      "Forward curves and vol inputs aligned across pricers and strategy builder",
      "Vanilla, barrier and Asian structures with clear MTM and Greeks",
      "Exposure roll-up by subsidiary, tenor and product",
      "Board-ready exports for risk committee packs",
    ],
    instruments: ["Forwards", "Swaps", "Vanilla options", "Barriers", "Asians", "Touch structures"],
    workflows: [
      {
        title: "Curve → price",
        text: "Load reference forwards, stress bumps, and price protection in the same session your book uses for monitoring.",
      },
      {
        title: "Hedge → monitor",
        text: "Push strategy legs into Hedging Instruments for MTM-aligned tracking against physical exposure.",
      },
      {
        title: "Report → decide",
        text: "Export consistent numbers for treasury, trading and risk — one pricing spine, fewer spreadsheet fights.",
      },
    ],
    faqs: [
      {
        q: "Which oil products can I hedge in CommoHedge?",
        a: "Crude and refined workflows are supported via forwards, swaps and options (including barriers and Asians) linked to your desk curves.",
      },
      {
        q: "Do oil hedges share pricing with FX and metals?",
        a: "Yes. Modules share the same pricing spine so MTM and scenario views stay consistent across desks.",
      },
    ],
    ctaLabel: "Request oil desk access",
  },
  "metals-mining": {
    slug: "metals-mining",
    path: "/solutions/metals-mining",
    navLabel: "Metals & mining",
    eyebrow: "Metals & mining desk",
    h1: "Metals & mining risk terminal",
    lead: `Base and precious metals desks use ${BRAND.name} for vol surfaces, forwards and group-wide exposure roll-up — from mine to treasury hedge book.`,
    seo: {
      title: `Metals & mining hedging software | ${BRAND.name}`,
      description:
        "Hedge base and precious metals with forwards, vol surfaces and subsidiary exposure roll-up. One terminal for pricing, strategy and risk reviews.",
      path: "/solutions/metals-mining",
      robots: "index, follow",
    },
    bullets: [
      "Vol surface and forward views for metals books",
      "Group exposure aggregation across subsidiaries",
      "Strategy builder for layered hedge windows",
      "Consistent Greeks and MTM across instruments",
    ],
    instruments: ["Forwards", "Vanilla options", "Barriers", "Swaps", "Vol surface reads"],
    workflows: [
      {
        title: "Surface → structure",
        text: "Inspect implied vol context, then size vanillas or barriers without leaving the terminal.",
      },
      {
        title: "Entity → roll-up",
        text: "See net metal exposure by entity and maturity before you execute the hedge.",
      },
      {
        title: "Book → board",
        text: "Keep hedge ratios and scenario packs aligned for mining treasury and risk committees.",
      },
    ],
    faqs: [
      {
        q: "Can I roll up metals exposures across subsidiaries?",
        a: "Yes. Exposures dashboard views are built for group roll-up by currency, maturity and entity.",
      },
      {
        q: "Is the vol surface used in pricing?",
        a: "Data Terminal vol views support desk reads; pricers and strategy builder share consistent market inputs where configured.",
      },
    ],
    ctaLabel: "Request metals desk access",
  },
  agriculture: {
    slug: "agriculture",
    path: "/solutions/agriculture",
    navLabel: "Agriculture",
    eyebrow: "Agriculture desk",
    h1: "Agriculture hedging & strategy terminal",
    lead: `Grains and softs teams use ${BRAND.name} to build hedge windows, stress paths and hedge-ratio views before they press the trade.`,
    seo: {
      title: `Agriculture hedging software | ${BRAND.name}`,
      description:
        "Hedge grains and softs with strategy builder, stress scenarios and exposure monitoring. Pricing and risk workflows for agricultural desks.",
      path: "/solutions/agriculture",
      robots: "index, follow",
    },
    bullets: [
      "Strategy builder tailored to seasonal hedge windows",
      "Stress paths for basis and volatility shocks",
      "Hedge-ratio monitoring against physical exposure",
      "Export-ready outputs for procurement and treasury",
    ],
    instruments: ["Forwards", "Options", "Swaps", "Scenario strategies"],
    workflows: [
      {
        title: "Window → strategy",
        text: "Define hedge periods and instruments, then compare cost of protection before execution.",
      },
      {
        title: "Stress → decide",
        text: "Run scenario views that match how agri desks talk about basis and vol shocks.",
      },
      {
        title: "Monitor → adjust",
        text: "Keep hedge ratios visible as the crop calendar and market move.",
      },
    ],
    faqs: [
      {
        q: "Does CommoHedge support seasonal agri hedges?",
        a: "Strategy builder is designed for hedge windows and layered structures typical of agricultural programs.",
      },
      {
        q: "Can procurement and treasury share the same numbers?",
        a: "Yes — pricing, exposures and exports share one spine so teams stop reconciling conflicting spreadsheets.",
      },
    ],
    ctaLabel: "Request agriculture desk access",
  },
};

export const SOLUTION_LIST = Object.values(SOLUTION_PAGES);

/** Flat list of indexable marketing URLs for sitemap / static shells */
export function getMarketingPaths(): string[] {
  return ["/", "/request-access", ...SOLUTION_LIST.map((s) => s.path)];
}
