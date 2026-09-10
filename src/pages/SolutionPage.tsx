import React, { useEffect, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/constants/branding";
import { SOLUTION_PAGES, SOLUTION_LIST, type SolutionSlug } from "@/seo/solutions";
import { buildFaqJsonLd } from "@/seo/site-seo";
import "@/styles/landing-terminal.css";

const isSlug = (v: string | undefined): v is SolutionSlug =>
  !!v && Object.prototype.hasOwnProperty.call(SOLUTION_PAGES, v);

const SolutionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const valid = isSlug(slug);
  const page = valid ? SOLUTION_PAGES[slug] : null;

  const others = useMemo(
    () => (page ? SOLUTION_LIST.filter((s) => s.slug !== page.slug) : []),
    [page],
  );

  useEffect(() => {
    if (!page) return;
    const scriptId = "commohedge-solution-faq-jsonld";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(buildFaqJsonLd(page.faqs));
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [page]);

  if (!page) return <Navigate to="/" replace />;

  return (
    <div className="landing-terminal-root dark min-h-screen overflow-x-hidden bg-[#0c1322] font-sans text-[#dce2f7]">
      <LandingNav />

      <main className="pt-[3.5rem] sm:pt-[4.5rem] md:pt-[5.5rem]">
        <section className="px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
              {page.eyebrow}
            </p>
            <h1 className="mb-6 font-headline text-4xl font-bold uppercase tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {page.h1}
            </h1>
            <p className="mb-10 max-w-3xl text-base font-light leading-relaxed text-[#c1caaf] sm:text-lg">
              {page.lead}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/request-access"
                className="landing-btn-industrial landing-industrial-gradient inline-flex items-center justify-center px-8 py-4 font-headline text-sm font-bold uppercase tracking-widest text-[#213600]"
              >
                {page.ctaLabel}
              </Link>
              <Link
                to="/#verticals"
                className="landing-btn-industrial inline-flex items-center justify-center border border-[#424a35]/40 px-8 py-4 font-headline text-sm font-bold uppercase tracking-widest text-white"
              >
                All sectors
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-[#424a35]/15 bg-[#070e1d] px-4 py-14 sm:px-6 md:px-12 md:py-20">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
            <div>
              <h2 className="mb-5 font-headline text-2xl font-bold uppercase tracking-tighter text-white sm:text-3xl">
                What you get
              </h2>
              <ul className="space-y-3">
                {page.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-sm leading-relaxed text-[#c1caaf] sm:text-base">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aef833]" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-5 font-headline text-2xl font-bold uppercase tracking-tighter text-white sm:text-3xl">
                Instruments
              </h2>
              <div className="flex flex-wrap gap-2">
                {page.instruments.map((i) => (
                  <span
                    key={i}
                    className="border border-[#424a35]/30 bg-[#141b2b]/60 px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-widest text-[#dce2f7]"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 md:px-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 font-headline text-2xl font-bold uppercase tracking-tighter text-white sm:text-3xl md:text-4xl">
              Desk workflow
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {page.workflows.map((w, idx) => (
                <div key={w.title} className="landing-glass-card rounded-sm p-5 sm:p-6">
                  <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-[#aef833]">
                    {String(idx + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mb-3 font-headline text-lg font-bold uppercase text-white">{w.title}</h3>
                  <p className="text-sm leading-relaxed text-[#c1caaf]">{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#424a35]/15 bg-[#070e1d] px-4 py-14 sm:px-6 md:px-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center font-headline text-2xl font-bold uppercase tracking-tighter text-white sm:text-3xl">
              FAQ
            </h2>
            <div className="space-y-3">
              {page.faqs.map((f) => (
                <div key={f.q} className="landing-glass-card rounded-sm p-5">
                  <h3 className="mb-2 font-headline text-sm font-bold text-white sm:text-base">{f.q}</h3>
                  <p className="text-sm leading-relaxed text-[#c1caaf]">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 md:px-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 font-headline text-xl font-bold uppercase tracking-tighter text-white sm:text-2xl">
              Other desks
            </h2>
            <div className="flex flex-wrap gap-3">
              {others.map((s) => (
                <Link
                  key={s.path}
                  to={s.path}
                  className="border border-[#424a35]/30 px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#aeb5c5] transition-colors hover:border-[#aef833]/40 hover:text-white"
                >
                  {s.navLabel}
                </Link>
              ))}
              <Link
                to="/request-access"
                className="landing-industrial-gradient px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-[#213600]"
              >
                Request access
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#424a35]/15 px-4 py-10 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <BrandLogo
              variant="dark"
              decorative
              className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] p-1.5"
            />
            <span className="font-headline text-sm font-bold uppercase tracking-widest text-white">{BRAND.name}</span>
          </Link>
          <p className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">{BRAND.copyrightLine}</p>
        </div>
      </footer>
    </div>
  );
};

export default SolutionPage;
