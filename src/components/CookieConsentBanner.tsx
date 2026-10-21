import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  isLandingPublicPath,
  LANDING_CONSENT_OPEN_EVENT,
  readLandingConsent,
  writeLandingConsent,
} from "@/lib/landing-consent";

/**
 * Non-blocking bottom banner for public landing routes.
 * Essential storage always on; Analytics (Vercel) only after Accept.
 */
export function CookieConsentBanner() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLandingPublicPath(location.pathname)) {
      setVisible(false);
      return;
    }
    setVisible(readLandingConsent() === null);
  }, [location.pathname]);

  useEffect(() => {
    const onOpen = () => {
      if (isLandingPublicPath(window.location.pathname)) setVisible(true);
    };
    window.addEventListener(LANDING_CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(LANDING_CONSENT_OPEN_EVENT, onOpen);
  }, []);

  if (!visible || !isLandingPublicPath(location.pathname)) return null;

  const accept = () => {
    writeLandingConsent(true);
    setVisible(false);
  };

  const reject = () => {
    writeLandingConsent(false);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-[#424a35]/40 bg-[#070e1d]/95 px-4 py-4 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6 md:px-12"
    >
      <div className="mx-auto flex max-w-[1920px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-3xl text-sm font-light leading-relaxed text-[#c1caaf]">
          We use essential storage (theme, consent) to run this site. With your OK we also load{" "}
          <strong className="font-medium text-white">Vercel Web Analytics</strong> (no advertising
          cookies) to understand traffic.{" "}
          <Link to="/cookies" className="text-[#aef833] underline-offset-2 hover:underline">
            Cookies
          </Link>
          {" · "}
          <Link to="/privacy" className="text-[#aef833] underline-offset-2 hover:underline">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={reject}
            className="rounded-sm border border-[#424a35]/40 bg-transparent px-5 py-2.5 font-headline text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5"
          >
            Reject optional
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] px-5 py-2.5 font-headline text-[11px] font-bold uppercase tracking-widest text-[#213600] transition-transform hover:scale-[1.02]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
