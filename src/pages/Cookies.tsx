import React from "react";
import { Link } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { BrandLogo } from "@/components/BrandLogo";
import { LandingLegalLinks } from "@/components/LandingLegalLinks";
import { BRAND } from "@/constants/branding";
import { openConsentPreferences } from "@/lib/landing-consent";
import "@/styles/landing-terminal.css";

const UPDATED = "21 October 2026";

const Cookies: React.FC = () => {
  return (
    <div className="landing-terminal-root dark min-h-screen overflow-x-hidden bg-[#0c1322] font-sans text-[#dce2f7]">
      <LandingNav />

      <main className="pt-[3.5rem] sm:pt-[4.5rem] md:pt-[5.5rem]">
        <article className="px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
              Legal
            </p>
            <h1 className="mb-4 font-headline text-4xl font-bold uppercase tracking-tighter text-white sm:text-5xl">
              Cookies &amp; storage
            </h1>
            <p className="mb-6 text-sm text-[#8c947b]">Last updated: {UPDATED}</p>
            <p className="mb-10 text-sm font-light leading-relaxed text-[#c1caaf] sm:text-base">
              This notice explains cookies and similar storage used on the {BRAND.name} public website
              (landing, insights, solutions, request access). Authenticated product sessions are covered
              separately when you sign in.
            </p>

            <div className="mb-10">
              <button
                type="button"
                onClick={() => openConsentPreferences()}
                className="landing-btn-industrial landing-industrial-gradient px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#213600] transition-transform hover:scale-[1.02]"
              >
                Manage preferences
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#424a35]/40">
                    <th className="py-3 pr-4 font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]">
                      Name
                    </th>
                    <th className="py-3 pr-4 font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]">
                      Category
                    </th>
                    <th className="py-3 pr-4 font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]">
                      Purpose
                    </th>
                    <th className="py-3 font-headline text-[10px] font-bold uppercase tracking-widest text-[#aef833]">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#c1caaf]">
                  <tr className="border-b border-[#424a35]/20">
                    <td className="py-3 pr-4 font-mono text-xs text-white">ch_consent</td>
                    <td className="py-3 pr-4">Essential</td>
                    <td className="py-3 pr-4">Stores your analytics consent choice (cookie + localStorage).</td>
                    <td className="py-3">12 months</td>
                  </tr>
                  <tr className="border-b border-[#424a35]/20">
                    <td className="py-3 pr-4 font-mono text-xs text-white">theme / UI prefs</td>
                    <td className="py-3 pr-4">Essential</td>
                    <td className="py-3 pr-4">Remembers display preferences so the site renders correctly.</td>
                    <td className="py-3">Local / persistent</td>
                  </tr>
                  <tr className="border-b border-[#424a35]/20">
                    <td className="py-3 pr-4 font-mono text-xs text-white">Vercel Web Analytics</td>
                    <td className="py-3 pr-4">Analytics (optional)</td>
                    <td className="py-3 pr-4">
                      Aggregated page views and referrers. No advertising cookies; visitor hash expires
                      after ~24 hours. Loaded only if you accept analytics.
                    </td>
                    <td className="py-3">Session / 24h hash</td>
                  </tr>
                  <tr className="border-b border-[#424a35]/20">
                    <td className="py-3 pr-4 font-mono text-xs text-white">Google Fonts</td>
                    <td className="py-3 pr-4">Functional</td>
                    <td className="py-3 pr-4">
                      Loads Space Grotesk / Material Symbols from Google&apos;s CDN. May involve a
                      network request to Google when you visit the site.
                    </td>
                    <td className="py-3">CDN cache</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-10 space-y-4 text-sm font-light leading-relaxed text-[#c1caaf] sm:text-base">
              <p>
                We do not currently use Google Analytics, advertising pixels, or third-party marketing
                cookies on the public site. If that changes, this page and the banner will be updated.
              </p>
              <p>
                See also our{" "}
                <Link to="/privacy" className="text-[#aef833] hover:underline">
                  Privacy policy
                </Link>
                .
              </p>
            </div>
          </div>
        </article>
      </main>

      <footer className="border-t border-[#424a35]/15 px-4 py-10 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <BrandLogo
              variant="dark"
              decorative
              className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] p-1.5"
            />
            <span className="font-headline text-sm font-bold uppercase tracking-widest text-white">
              {BRAND.name}
            </span>
          </Link>
          <LandingLegalLinks />
        </div>
      </footer>
    </div>
  );
};

export default Cookies;
