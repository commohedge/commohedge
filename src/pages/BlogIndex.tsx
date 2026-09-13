import React from "react";
import { Link } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/constants/branding";
import { BLOG_ARTICLES } from "@/seo/blog-articles";
import "@/styles/landing-terminal.css";

const BlogIndex: React.FC = () => {
  return (
    <div className="landing-terminal-root dark min-h-screen overflow-x-hidden bg-[#0c1322] font-sans text-[#dce2f7]">
      <LandingNav />

      <main className="pt-[3.5rem] sm:pt-[4.5rem] md:pt-[5.5rem]">
        <section className="px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 font-headline text-[10px] font-bold uppercase tracking-[0.3em] text-[#aef833]">
              Insights
            </p>
            <h1 className="mb-6 font-headline text-4xl font-bold uppercase tracking-tighter text-white sm:text-5xl md:text-6xl">
              Commodity hedging insights
            </h1>
            <p className="max-w-3xl text-base font-light leading-relaxed text-[#c1caaf] sm:text-lg">
              Practical guides on why commodity hedging matters — oil, metals, agriculture, FX overlap and how institutional desks run hedge books with discipline.
            </p>
          </div>
        </section>

        <section className="border-t border-[#424a35]/15 px-4 pb-20 sm:px-6 md:px-12">
          <div className="mx-auto grid max-w-5xl gap-4 sm:gap-5">
            {BLOG_ARTICLES.map((article) => (
              <Link
                key={article.slug}
                to={article.path}
                className="landing-glass-card group block rounded-sm p-5 transition-colors hover:border-[#aef833]/30 sm:p-7"
              >
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <time className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
                    {article.date}
                  </time>
                  <span className="text-[#424a35]">·</span>
                  <span className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">
                    {article.readMinutes} min read
                  </span>
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-[#424a35]/30 px-2 py-1 font-headline text-[9px] font-bold uppercase tracking-widest text-[#aef833]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mb-3 font-headline text-xl font-bold uppercase tracking-tight text-white transition-colors group-hover:text-[#aef833] sm:text-2xl">
                  {article.h1}
                </h2>
                <p className="max-w-3xl text-sm leading-relaxed text-[#c1caaf] sm:text-base">{article.description}</p>
                <p className="mt-4 inline-flex items-center font-headline text-[11px] font-bold uppercase tracking-widest text-white">
                  Read article
                  <span className="material-symbols-outlined ml-2 text-[#aef833] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </p>
              </Link>
            ))}
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

export default BlogIndex;
