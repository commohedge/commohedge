import { BRAND } from "@/constants/branding";
import { SOLUTION_PAGES } from "@/seo/solutions";
import { getAllBlogSeoPages, getBlogArticle } from "@/seo/blog-articles";

export const SITE_ORIGIN = "https://www.commohedge.com";

export type PageSeo = {
  title: string;
  description: string;
  /** Path only, e.g. `/request-access` */
  path: string;
  robots?: string;
};

const HOME_DESCRIPTION =
  "CommoHedge — commodity & FX hedging terminal for pricing, exposures, strategy builder and market data. Built for treasury, trading and risk desks.";

const DEFAULT_PUBLIC: PageSeo = {
  title: `${BRAND.name} | Commodity & FX hedging terminal`,
  description: HOME_DESCRIPTION,
  path: "/",
  robots: "index, follow",
};

const NOINDEX: Omit<PageSeo, "path" | "title"> = {
  description: `${BRAND.name} application — sign in required.`,
  robots: "noindex, nofollow",
};

/** Public marketing / auth routes with dedicated SEO */
const PUBLIC_SEO: Record<string, PageSeo> = {
  "/": DEFAULT_PUBLIC,
  "/request-access": {
    title: `Request access | ${BRAND.name}`,
    description: `Request access to ${BRAND.name} — commodity & FX hedging terminal for pricing, exposures and strategy workflows.`,
    path: "/request-access",
    robots: "index, follow",
  },
  "/login": {
    title: `Sign in | ${BRAND.name}`,
    description: `Sign in to the ${BRAND.name} commodity & FX hedging terminal.`,
    path: "/login",
    robots: "noindex, nofollow",
  },
  "/supabase-login": {
    title: `Sign in | ${BRAND.name}`,
    description: `Sign in to the ${BRAND.name} commodity & FX hedging terminal.`,
    path: "/supabase-login",
    robots: "noindex, nofollow",
  },
  ...Object.fromEntries(Object.values(SOLUTION_PAGES).map((s) => [s.path, s.seo])),
  ...Object.fromEntries(getAllBlogSeoPages().map((p) => [p.path, p])),
};

const APP_TITLE_HINTS: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Dashboard" },
  { prefix: "/exposures", label: "Exposures" },
  { prefix: "/hedging", label: "Hedging" },
  { prefix: "/risk-analysis", label: "Risk analysis" },
  { prefix: "/strategy-builder", label: "Strategy builder" },
  { prefix: "/pricers", label: "Pricers" },
  { prefix: "/positions", label: "Positions" },
  { prefix: "/reports", label: "Reports" },
  { prefix: "/commodity-market", label: "Commodity market" },
  { prefix: "/intel-workspace", label: "Intelligence workspace" },
  { prefix: "/world-map", label: "World map" },
  { prefix: "/commodity-news", label: "Commodity news" },
  { prefix: "/market-news", label: "Market news" },
  { prefix: "/economic-calendar", label: "Economic calendar" },
  { prefix: "/advanced-chart", label: "Advanced chart" },
  { prefix: "/users", label: "Users" },
  { prefix: "/database-sync", label: "Database sync" },
  { prefix: "/settings", label: "Settings" },
  { prefix: "/regression-analysis", label: "Regression analysis" },
  { prefix: "/rate-explorer", label: "Rate explorer" },
  { prefix: "/hedge-helper", label: "Hedge assistant" },
  { prefix: "/ticker-peek-pro", label: "Data Terminal" },
  { prefix: "/saved", label: "Saved" },
  { prefix: "/auth", label: "Authentication" },
];

export function resolvePageSeo(pathname: string): PageSeo {
  const exact = PUBLIC_SEO[pathname];
  if (exact) return exact;

  if (pathname.startsWith("/blog/")) {
    const slug = pathname.replace(/^\/blog\//, "").replace(/\/$/, "");
    const article = getBlogArticle(slug);
    if (article) return article.seo;
  }

  if (pathname.startsWith("/auth/")) {
    return {
      title: `Authentication | ${BRAND.name}`,
      path: pathname,
      ...NOINDEX,
    };
  }

  const app = APP_TITLE_HINTS.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (app) {
    return {
      title: `${app.label} | ${BRAND.name}`,
      path: pathname,
      ...NOINDEX,
    };
  }

  return {
    title: `Page not found | ${BRAND.name}`,
    description: `The requested page was not found on ${BRAND.name}.`,
    path: pathname,
    robots: "noindex, nofollow",
  };
}

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Apply document head tags for the current route (CSR). */
export function applyPageSeo(seo: PageSeo) {
  const url = `${SITE_ORIGIN}${seo.path === "/" ? "/" : seo.path}`;
  document.title = seo.title;

  upsertMeta('meta[name="description"]', "name", "description", seo.description);
  upsertMeta('meta[name="robots"]', "name", "robots", seo.robots ?? "index, follow");
  upsertCanonical(url);

  upsertMeta('meta[property="og:title"]', "property", "og:title", seo.title);
  upsertMeta('meta[property="og:description"]', "property", "og:description", seo.description);
  upsertMeta('meta[property="og:url"]', "property", "og:url", url);
  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
  upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
}

export const LANDING_FAQS = [
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
  {
    q: `Who is ${BRAND.name} built for?`,
    a: "Treasury desks, commodity traders, risk managers and CFOs who need one consistent pricing spine across oil, metals, agriculture and FX hedges.",
  },
  {
    q: "Is there a trial or demo?",
    a: "Request access from the website. Approved desks get guided onboarding into the terminal — no credit card required to start the conversation.",
  },
] as const;

export function buildFaqJsonLd(faqs: ReadonlyArray<{ q: string; a: string }> = LANDING_FAQS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

/** All indexable public pages (for sitemap + static HTML shells). */
export function listIndexableSeoPages(): PageSeo[] {
  return Object.values(PUBLIC_SEO).filter((p) => {
    const parts = (p.robots ?? "index, follow")
      .split(",")
      .map((s) => s.trim().toLowerCase());
    return parts.includes("index") && !parts.includes("noindex");
  });
}
