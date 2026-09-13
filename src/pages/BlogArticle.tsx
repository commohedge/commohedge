import React, { useEffect, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/constants/branding";
import { BLOG_ARTICLES, getBlogArticle } from "@/seo/blog-articles";
import { buildFaqJsonLd, SITE_ORIGIN } from "@/seo/site-seo";
import "@/styles/landing-terminal.css";

const BlogArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = getBlogArticle(slug);

  const related = useMemo(() => {
    if (!article) return [];
    return BLOG_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);
  }, [article]);

  useEffect(() => {
    if (!article) return;
    const faqId = "commohedge-blog-faq-jsonld";
    const articleId = "commohedge-blog-article-jsonld";

    const upsert = (id: string, data: unknown) => {
      let el = document.getElementById(id) as HTMLScriptElement | null;
      if (!el) {
        el = document.createElement("script");
        el.id = id;
        el.type = "application/ld+json";
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data);
    };

    upsert(faqId, buildFaqJsonLd(article.faqs));
    upsert(articleId, {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.h1,
      description: article.description,
      datePublished: article.date,
      author: { "@type": "Organization", name: BRAND.name },
      publisher: {
        "@type": "Organization",
        name: BRAND.name,
        logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/commohedge-logo.png` },
      },
      mainEntityOfPage: `${SITE_ORIGIN}${article.path}`,
      keywords: article.keywords.join(", "),
    });

    return () => {
      document.getElementById(faqId)?.remove();
      document.getElementById(articleId)?.remove();
    };
  }, [article]);

  if (!article) return <Navigate to="/blog" replace />;

  return (
    <div className="landing-terminal-root dark min-h-screen overflow-x-hidden bg-[#0c1322] font-sans text-[#dce2f7]">
      <LandingNav />

      <main className="pt-[3.5rem] sm:pt-[4.5rem] md:pt-[5.5rem]">
        <article className="px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-3xl">
            <Link
              to="/blog"
              className="mb-8 inline-flex font-headline text-[11px] font-bold uppercase tracking-widest text-[#aeb5c5] hover:text-[#aef833]"
            >
              ← All insights
            </Link>

            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <time className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b]">{article.date}</time>
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

            <h1 className="mb-6 font-headline text-3xl font-bold uppercase tracking-tighter text-white sm:text-4xl md:text-5xl">
              {article.h1}
            </h1>
            <p className="mb-10 text-base font-light leading-relaxed text-[#c1caaf] sm:text-lg">{article.lead}</p>

            <div className="space-y-10">
              {article.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="mb-4 font-headline text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
                    {section.heading}
                  </h2>
                  <div className="space-y-4">
                    {section.paragraphs.map((p) => (
                      <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-[#c1caaf] sm:text-base">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-12 rounded-sm border border-[#aef833]/20 bg-[#141b2b]/50 p-6 sm:p-8">
              <h2 className="mb-4 font-headline text-lg font-bold uppercase tracking-tight text-white">Key takeaways</h2>
              <ul className="space-y-3">
                {article.takeaways.map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-[#c1caaf]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aef833]" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12">
              <h2 className="mb-6 font-headline text-xl font-bold uppercase tracking-tight text-white">FAQ</h2>
              <div className="space-y-4">
                {article.faqs.map((f) => (
                  <div key={f.q} className="landing-glass-card rounded-sm p-5">
                    <h3 className="mb-2 font-headline text-sm font-bold text-white sm:text-base">{f.q}</h3>
                    <p className="text-sm leading-relaxed text-[#c1caaf]">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-12 flex flex-col gap-3 border-t border-[#424a35]/20 pt-10 sm:flex-row">
              <Link
                to={article.relatedCta.to}
                className="landing-btn-industrial landing-industrial-gradient inline-flex items-center justify-center px-8 py-4 font-headline text-sm font-bold uppercase tracking-widest text-[#213600]"
              >
                {article.relatedCta.label}
              </Link>
              <Link
                to="/blog"
                className="landing-btn-industrial inline-flex items-center justify-center border border-[#424a35]/40 px-8 py-4 font-headline text-sm font-bold uppercase tracking-widest text-white"
              >
                More insights
              </Link>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="border-t border-[#424a35]/15 bg-[#070e1d] px-4 py-14 sm:px-6 md:px-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 font-headline text-lg font-bold uppercase tracking-tight text-white">Related reading</h2>
              <div className="space-y-3">
                {related.map((a) => (
                  <Link
                    key={a.slug}
                    to={a.path}
                    className="block border border-[#424a35]/25 px-4 py-4 font-headline text-sm font-bold uppercase tracking-wide text-[#aeb5c5] transition-colors hover:border-[#aef833]/35 hover:text-white"
                  >
                    {a.h1}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[#424a35]/15 px-4 py-10 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <BrandLogo
              variant="dark"
              decorative
              className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#aef833] to-[#93db04] p-1.5"
            />
            <span className="font-headline text-sm font-bold uppercase tracking-widest text-white">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <a
              href={BRAND.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b] hover:text-[#aef833]"
            >
              LinkedIn
            </a>
            <span className="text-[#424a35]">·</span>
            <a
              href={BRAND.social.x}
              target="_blank"
              rel="noopener noreferrer"
              className="font-headline text-[10px] uppercase tracking-widest text-[#8c947b] hover:text-[#aef833]"
            >
              X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogArticlePage;
