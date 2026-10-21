import React, { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { useLocation } from "react-router-dom";
import {
  hasAnalyticsConsent,
  isLandingPublicPath,
  LANDING_CONSENT_EVENT,
  type LandingConsent,
} from "@/lib/landing-consent";

/**
 * Mounts Vercel Web Analytics only after analytics consent on public routes.
 * Passes route/path so SPA navigations are counted.
 */
export function VercelAnalyticsGate() {
  const location = useLocation();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasAnalyticsConsent());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<LandingConsent>).detail;
      setAllowed(detail?.analytics === true);
    };
    window.addEventListener(LANDING_CONSENT_EVENT, onChange);
    return () => window.removeEventListener(LANDING_CONSENT_EVENT, onChange);
  }, []);

  if (!allowed || !isLandingPublicPath(location.pathname)) return null;

  return (
    <Analytics
      route={location.pathname}
      path={location.pathname + location.search}
      beforeSend={(event) => {
        if (event.url.includes("/auth/")) return null;
        try {
          const u = new URL(event.url, window.location.origin);
          u.searchParams.delete("token");
          u.searchParams.delete("code");
          u.searchParams.delete("access_token");
          return { ...event, url: u.toString() };
        } catch {
          return event;
        }
      }}
    />
  );
}
