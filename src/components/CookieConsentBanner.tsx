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
      className="fixed inset-x-0 bottom-0 z-[100] border-t-2 border-[#aef833]/35 bg-[#070e1d]/98 px-4 py-6 shadow-[0_-20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-6 sm:py-7 md:px-12 md:py-8"
    >
      <div className="mx-auto flex max-w-[1920px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="max-w-3xl space-y-2">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.25em] text-[#aef833] sm:text-sm">
            Cookie preferences
          </p>
          <p className="text-base font-light leading-relaxed text-[#c1caaf] sm:text-lg">
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
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={reject}
            className="min-h-[3rem] rounded-sm border border-[#424a35]/50 bg-transparent px-7 py-3.5 font-headline text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5 sm:min-w-[10rem]"
          >
            Reject optional
          </button>
          <button
            type="button"
            onClick={accept}
            className="min-h-[3rem] rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] px-8 py-3.5 font-headline text-xs font-bold uppercase tracking-widest text-[#213600] shadow-[0_0_24px_rgba(174,248,51,0.25)] transition-transform hover:scale-[1.02] sm:min-w-[10rem]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
