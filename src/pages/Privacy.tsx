import React from "react";
import { Link } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { BrandLogo } from "@/components/BrandLogo";
import { LandingLegalLinks } from "@/components/LandingLegalLinks";
import { BRAND } from "@/constants/branding";
import "@/styles/landing-terminal.css";

const UPDATED = "21 October 2026";

const Privacy: React.FC = () => {
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
              Privacy policy
            </h1>
            <p className="mb-10 text-sm text-[#8c947b]">Last updated: {UPDATED}</p>

            <div className="space-y-8 text-sm font-light leading-relaxed text-[#c1caaf] sm:text-base">
              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Who we are
                </h2>
                <p>
                  {BRAND.name} (&quot;we&quot;, &quot;us&quot;) operates{" "}
                  <a href="https://www.commohedge.com" className="text-[#aef833] hover:underline">
                    www.commohedge.com
                  </a>{" "}
                  and related product surfaces. Contact:{" "}
                  <a href="mailto:contact@commohedge.com" className="text-[#aef833] hover:underline">
                    contact@commohedge.com
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  What we collect on the public site
                </h2>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="font-medium text-white">Request access form</strong> — name, work
                    email, company, role, and related fields you submit so we can evaluate access and
                    reply.
                  </li>
                  <li>
                    <strong className="font-medium text-white">Essential technical data</strong> — theme
                    preference, consent choice, and security-related session data needed to run the site.
                  </li>
                  <li>
                    <strong className="font-medium text-white">Audience measurement (optional)</strong> —
                    if you accept analytics, we use Vercel Web Analytics to measure aggregated page views
                    and referrers. It does not use advertising cookies and does not identify you across
                    other websites.
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Why we process data
                </h2>
                <p>
                  To respond to access requests, operate and secure the website, improve the public
                  experience with aggregated analytics (only with your consent where required), and meet
                  legal obligations.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Processors &amp; hosting
                </h2>
                <p>
                  We use trusted providers to host and operate the service, including Vercel (hosting /
                  Web Analytics when enabled), Supabase (backend for authenticated product features and
                  access-request handling), and email tools such as Brevo when we send outreach or
                  transactional messages. These providers process data under their own terms and our
                  instructions.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Retention
                </h2>
                <p>
                  Access requests are kept as long as needed to evaluate and follow up, then deleted or
                  archived according to our internal retention rules. Consent preferences are stored for
                  up to 12 months (or until you change them). Analytics data is retained by Vercel
                  according to their product settings.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Your choices
                </h2>
                <p>
                  You can accept or reject optional analytics via the cookie banner, or{" "}
                  <Link to="/cookies" className="text-[#aef833] hover:underline">
                    manage preferences
                  </Link>
                  . For access to, correction of, or deletion of personal data you sent via the form,
                  email{" "}
                  <a href="mailto:contact@commohedge.com" className="text-[#aef833] hover:underline">
                    contact@commohedge.com
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Cookies &amp; similar technologies
                </h2>
                <p>
                  Details of storage used on this site are described in our{" "}
                  <Link to="/cookies" className="text-[#aef833] hover:underline">
                    Cookies notice
                  </Link>
                  .
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-white">
                  Changes
                </h2>
                <p>
                  We may update this policy from time to time. The &quot;Last updated&quot; date at the
                  top reflects the latest revision.
                </p>
              </section>
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

export default Privacy;
