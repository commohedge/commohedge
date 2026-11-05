/**
 * After `vite build`, emit per-route HTML shells with correct meta + noscript
 * body copy so crawlers/social bots that skip JS still see indexable content.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ORIGIN, listIndexableSeoPages, buildFaqJsonLd, type PageSeo } from "../src/seo/site-seo.ts";
import { SOLUTION_PAGES } from "../src/seo/solutions.ts";
import {
  BLOG_ARTICLES,
  BLOG_INDEX_SEO,
  buildBlogArticleJsonLd,
  stripMdLinks,
} from "../src/seo/blog-articles.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../dist");
const indexPath = path.join(dist, "index.html");

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setOrReplace(
  html: string,
  pattern: RegExp,
  replacement: string,
  insertBeforeHeadClose = true,
): string {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  if (insertBeforeHeadClose) {
    return html.replace(/<\/head>/i, `    ${replacement}\n  </head>`);
  }
  return html;
}

function applySeoHead(html: string, seo: PageSeo): string {
  const url = `${SITE_ORIGIN}${seo.path === "/" ? "/" : seo.path}`;
  const title = escapeHtml(seo.title);
  const desc = escapeHtml(seo.description);
  const robots = escapeHtml(seo.robots ?? "index, follow");

  let out = html;
  out = setOrReplace(out, /<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  out = setOrReplace(
    out,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${desc}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${robots}" />`,
  );
  out = setOrReplace(
    out,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${url}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="website" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${url}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${title}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${desc}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${SITE_ORIGIN}/og-image.png" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:card" content="summary_large_image" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${title}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${desc}" />`,
  );
  out = setOrReplace(
    out,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${SITE_ORIGIN}/og-image.png" />`,
  );

  // Drop Lovable leftover if still present in an old artifact
  out = out.replace(
    /\s*<script[^>]*src="https:\/\/cdn\.gpteng\.co\/gptengineer\.js"[^>]*><\/script>\s*/gi,
    "\n",
  );

  return out;
}

function noscriptFor(seo: PageSeo): string {
  const solution = Object.values(SOLUTION_PAGES).find((s) => s.path === seo.path);
  if (solution) {
    const bullets = solution.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
    const why = solution.whyItMatters.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    const faqs = solution.faqs
      .map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`)
      .join("");
    return `<noscript>
  <article>
    <h1>${escapeHtml(solution.h1)}</h1>
    <p>${escapeHtml(solution.lead)}</p>
    <h2>Why it matters for the desk</h2>
    ${why}
    <h2>What you get</h2>
    <ul>${bullets}</ul>
    <h2>FAQ</h2>
    ${faqs}
    <p><a href="${SITE_ORIGIN}/request-access">Request access</a> · <a href="${SITE_ORIGIN}/">Home</a></p>
  </article>
</noscript>`;
  }

  const article = BLOG_ARTICLES.find((a) => a.path === seo.path);
  if (article) {
    const plain = (t: string) => escapeHtml(stripMdLinks(t));
    const sections = article.sections
      .map((s) => {
        const paragraphs = s.paragraphs.map((p) => `<p>${plain(p)}</p>`).join("");
        const list = s.list ? `<ul>${s.list.map((i) => `<li>${plain(i)}</li>`).join("")}</ul>` : "";
        const table = s.table
          ? `<table><caption>${plain(s.table.caption)}</caption><thead><tr>${s.table.headers
              .map((h) => `<th scope="col">${plain(h)}</th>`)
              .join("")}</tr></thead><tbody>${s.table.rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((c, i) => (i === 0 ? `<th scope="row">${plain(c)}</th>` : `<td>${plain(c)}</td>`))
                    .join("")}</tr>`,
              )
              .join("")}</tbody></table>`
          : "";
        const closing = (s.closing ?? []).map((p) => `<p>${plain(p)}</p>`).join("");
        return `<h2>${escapeHtml(s.heading)}</h2>${paragraphs}${list}${table}${closing}`;
      })
      .join("");
    const faqs = article.faqs
      .map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`)
      .join("");
    return `<noscript>
  <article>
    <h1>${escapeHtml(article.h1)}</h1>
    <p>${escapeHtml(stripMdLinks(article.lead))}</p>
    ${sections}
    <h2>FAQ</h2>
    ${faqs}
    <p><a href="${SITE_ORIGIN}/blog">All insights</a> · <a href="${SITE_ORIGIN}/request-access">Request access</a></p>
  </article>
</noscript>`;
  }

  if (seo.path === BLOG_INDEX_SEO.path) {
    const links = BLOG_ARTICLES.map(
      (a) => `<li><a href="${SITE_ORIGIN}${a.path}">${escapeHtml(a.h1)}</a></li>`,
    ).join("");
    return `<noscript>
  <article>
    <h1>Commodity hedging insights</h1>
    <p>${escapeHtml(BLOG_INDEX_SEO.description)}</p>
    <ul>${links}</ul>
  </article>
</noscript>`;
  }

  if (seo.path === "/request-access") {
    return `<noscript>
  <article>
    <h1>Request access to CommoHedge</h1>
    <p>${escapeHtml(seo.description)}</p>
    <p><a href="${SITE_ORIGIN}/">Back to home</a></p>
  </article>
</noscript>`;
  }

  if (seo.path === "/commodity-pricers") {
    return `<noscript>
  <article>
    <h1>Commodity Pricers — monthly World Bank data</h1>
    <p>${escapeHtml(seo.description)}</p>
    <p>Free monthly Pink Sheet (CMO) averages for energy, metals, agriculture and fertilizers.</p>
    <p><a href="${SITE_ORIGIN}/request-access">Request access</a> · <a href="${SITE_ORIGIN}/blog">Insights</a></p>
  </article>
</noscript>`;
  }

  if (seo.path === "/") {
    return `<noscript>
  <article>
    <h1>CommoHedge</h1>
    <p>${escapeHtml(seo.description)}</p>
    <p>Commodity and FX hedging terminal for pricing, exposures, strategy builder and board-ready risk reviews on one pricing spine.</p>
    <h2>Explore</h2>
    <ul>
      <li><a href="${SITE_ORIGIN}/blog/commodity-hedging-definition-meaning">Commodity hedging definition</a></li>
      <li><a href="${SITE_ORIGIN}/blog/commodity-risk-management">Commodity risk management</a></li>
      <li><a href="${SITE_ORIGIN}/blog/bloomberg-refinitiv-alternative-commodity-pricing">Bloomberg and Refinitiv alternative for commodity pricing</a></li>
      <li><a href="${SITE_ORIGIN}/solutions/oil-energy">Oil &amp; energy hedging</a></li>
      <li><a href="${SITE_ORIGIN}/solutions/metals-mining">Metals &amp; mining hedging</a></li>
      <li><a href="${SITE_ORIGIN}/solutions/agriculture">Agriculture hedging</a></li>
      <li><a href="${SITE_ORIGIN}/commodity-pricers">Commodity pricers</a></li>
    </ul>
    <p><a href="${SITE_ORIGIN}/request-access">Request access</a> · <a href="${SITE_ORIGIN}/blog">Insights</a></p>
  </article>
</noscript>`;
  }

  return `<noscript>
  <article>
    <h1>${escapeHtml(seo.title)}</h1>
    <p>${escapeHtml(seo.description)}</p>
    <p><a href="${SITE_ORIGIN}/request-access">Request access</a></p>
  </article>
</noscript>`;
}

function injectNoscript(html: string, block: string): string {
  if (/<noscript>[\s\S]*?<\/noscript>/i.test(html)) {
    return html.replace(/<noscript>[\s\S]*?<\/noscript>/i, block);
  }
  return html.replace(/<\/body>/i, `${block}\n</body>`);
}

function stripExistingJsonLd(html: string): string {
  return html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
}

function injectJsonLd(html: string, payloads: unknown[]): string {
  if (!payloads.length) return html;
  const scripts = payloads
    .map(
      (data) =>
        `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n    ");
  return html.replace(/<\/head>/i, `    ${scripts}\n  </head>`);
}

function organizationWebSiteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: "CommoHedge",
        url: `${SITE_ORIGIN}/`,
        logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/commohedge-logo.png` },
        email: "contact@commohedge.com",
        sameAs: [
          "https://www.linkedin.com/company/commohedge/",
          "https://x.com/CommoHedge",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: "CommoHedge",
        url: `${SITE_ORIGIN}/`,
        description:
          "Pricing, hedging, strategy builder and market data for commodity and FX desks.",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "CommoHedge",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${SITE_ORIGIN}/`,
        description:
          "Institutional-grade commodity and FX hedging terminal for pricing, exposures and risk workflows.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Request access for a guided desk trial",
        },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
}

function jsonLdFor(seo: PageSeo): unknown[] {
  if (seo.path === "/") return [organizationWebSiteGraph()];

  const article = BLOG_ARTICLES.find((a) => a.path === seo.path);
  if (article) {
    return [buildBlogArticleJsonLd(article), buildFaqJsonLd(article.faqs)];
  }
  const solution = Object.values(SOLUTION_PAGES).find((s) => s.path === seo.path);
  if (solution) {
    return [buildFaqJsonLd(solution.faqs)];
  }
  return [];
}

function writeShell(seo: PageSeo, baseHtml: string) {
  let html = applySeoHead(baseHtml, seo);
  // Replace homepage graph with page-specific JSON-LD (or re-emit home graph).
  html = stripExistingJsonLd(html);
  html = injectJsonLd(html, jsonLdFor(seo));
  html = injectNoscript(html, noscriptFor(seo));

  if (seo.path === "/") {
    fs.writeFileSync(indexPath, html, "utf8");
    console.log("updated dist/index.html meta");
    return;
  }

  const rel = seo.path.replace(/^\//, "");
  const dir = path.join(dist, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
  console.log(`wrote dist/${rel}/index.html`);
}

function writeSitemap(pages: PageSeo[]) {
  const urls = pages
    .map((p) => {
      const loc = `${SITE_ORIGIN}${p.path === "/" ? "/" : p.path}`;
      const priority =
        p.path === "/"
          ? "1.0"
          : p.path.startsWith("/solutions/")
            ? "0.9"
            : p.path.startsWith("/blog")
              ? "0.85"
              : "0.8";
      const article = BLOG_ARTICLES.find((a) => a.path === p.path);
      const lastmod = article ? `\n    <lastmod>${article.updated ?? article.date}</lastmod>` : "";
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(dist, "sitemap.xml"), xml, "utf8");
  fs.writeFileSync(path.resolve(__dirname, "../public/sitemap.xml"), xml, "utf8");
  console.log("updated sitemap.xml");
}

function main() {
  if (!fs.existsSync(indexPath)) {
    console.error("dist/index.html missing — run vite build first");
    process.exit(1);
  }
  const base = fs.readFileSync(indexPath, "utf8");
  const pages = listIndexableSeoPages();
  for (const page of pages) writeShell(page, base);
  writeSitemap(pages);
}

main();
