/** Marque produit — landing, auth, exports PDF, réglages par défaut */
export const BRAND = {
  name: "CommoHedge",
  /** Hero display : deux lignes (blanc / lime), comme la maquette terminal */
  heroLine1: "COMMO",
  heroLine2: "HEDGE.",
  /** Aligné sur la sidebar : split sur " - " (primary / secondary) */
  nameWithTagline: "CommoHedge - Commodity hedging & intelligence terminal",
  tagline: "Commodity hedging & intelligence terminal",
  /** @deprecated Prefer BrandLogo / logoSrc — kept for text fallbacks */
  logoMark: "CH",
  /** White mark on transparent — dark UI */
  logoSrc: "/commohedge-logo.png",
  /** Black mark on transparent — light / lime UI */
  logoDarkSrc: "/commohedge-logo-dark.png",
  faviconSrc: "/favicon.ico",
  copyrightLine: "© 2026 CommoHedge. All rights reserved.",
  /** Filigrane footer (caps, style Stitch) */
  nameWatermark: "COMMOHEDGE",
  social: {
    linkedin: "https://www.linkedin.com/company/commohedge/",
    x: "https://x.com/CommoHedge",
  },
} as const;
