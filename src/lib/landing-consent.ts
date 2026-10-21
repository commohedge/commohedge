/** Landing-scoped consent for optional analytics (Vercel Web Analytics). */

export const LANDING_CONSENT_KEY = "ch_consent";
export const LANDING_CONSENT_COOKIE = "ch_consent";
export const LANDING_CONSENT_EVENT = "ch:consent-changed";
export const LANDING_CONSENT_OPEN_EVENT = "ch:consent-open";

export type LandingConsent = {
  version: 1;
  /** Always true — theme, session, security. */
  essential: true;
  /** Vercel Web Analytics (no cookies; anonymized page views). */
  analytics: boolean;
  updatedAt: string;
};

const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 12 months

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function readLandingConsent(): LandingConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(LANDING_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LandingConsent>;
    if (parsed?.version !== 1 || typeof parsed.analytics !== "boolean") return null;
    return {
      version: 1,
      essential: true,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeConsentCookie(analytics: boolean) {
  const value = analytics ? "analytics" : "essential";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANDING_CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function writeLandingConsent(analytics: boolean): LandingConsent {
  const next: LandingConsent = {
    version: 1,
    essential: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  if (!isBrowser()) return next;
  localStorage.setItem(LANDING_CONSENT_KEY, JSON.stringify(next));
  writeConsentCookie(analytics);
  window.dispatchEvent(new CustomEvent(LANDING_CONSENT_EVENT, { detail: next }));
  return next;
}

export function hasAnalyticsConsent(): boolean {
  return readLandingConsent()?.analytics === true;
}

export function openConsentPreferences(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(LANDING_CONSENT_OPEN_EVENT));
}

/** Public marketing routes where the cookie banner applies. */
export function isLandingPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/request-access") return true;
  if (pathname === "/privacy" || pathname === "/cookies") return true;
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true;
  if (pathname.startsWith("/solutions/")) return true;
  if (pathname === "/login" || pathname === "/supabase-login") return true;
  return false;
}
