import { getBrowser, setupPage, smartWait, setCorsHeaders } from './utils/puppeteer-config.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  let browser = null;
  let page = null;

  try {
    browser = await getBrowser();
    page = await browser.newPage();
    await setupPage(page);
    await page.goto(decodeURIComponent(url), { waitUntil: 'domcontentloaded', timeout: 20000 });
    await smartWait(page, decodeURIComponent(url));
    const html = await page.content();
    return res.status(200).json({ data: html });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to scrape the requested URL', message: error.message });
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

