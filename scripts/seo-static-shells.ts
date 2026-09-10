/**
 * After `vite build`, emit per-route HTML shells with correct meta + noscript
 * body copy so crawlers/social bots that skip JS still see indexable content.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ORIGIN, listIndexableSeoPages, type PageSeo } from "../src/seo/site-seo.ts";
import { SOLUTION_PAGES } from "../src/seo/solutions.ts";

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
    const faqs = solution.faqs
      .map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`)
      .join("");
    return `<noscript>
  <article>
    <h1>${escapeHtml(solution.h1)}</h1>
    <p>${escapeHtml(solution.lead)}</p>
    <h2>What you get</h2>
    <ul>${bullets}</ul>
    <h2>FAQ</h2>
    ${faqs}
    <p><a href="${SITE_ORIGIN}/request-access">Request access</a> · <a href="${SITE_ORIGIN}/">Home</a></p>
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

function writeShell(seo: PageSeo, baseHtml: string) {
  let html = applySeoHead(baseHtml, seo);
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
      const priority = p.path === "/" ? "1.0" : p.path.startsWith("/solutions/") ? "0.9" : "0.8";
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
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
