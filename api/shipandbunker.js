import { getBrowser, setupPage, smartWait, setCorsHeaders } from './utils/puppeteer-config.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;
  let url = 'https://shipandbunker.com/prices';
  if (type) {
    url += `#${type.toUpperCase()}`;
  }

  let browser = null;
  let page = null;

  try {
    browser = await getBrowser();
    page = await browser.newPage();
    await setupPage(page);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await smartWait(page, url);
    const html = await page.content();
    return res.status(200).json({ data: html });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to scrape Ship & Bunker', message: error.message });
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

