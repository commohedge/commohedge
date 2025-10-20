import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const isDev = !process.env.AWS_REGION;

export async function getBrowser() {
  return puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: isDev ? undefined : await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

export async function setupPage(page) {
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'other' || resourceType === 'media') {
      req.abort();
    } else {
      req.continue();
    }
  });
}

export async function smartWait(page, url) {
  if (url.includes('tradingview.com')) {
    try {
      await page.waitForSelector('table, tr, .tv-data-table, [data-rowid]', { timeout: 8000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } else if (url.includes('shipandbunker.com')) {
    try {
      await page.waitForSelector('table, .price-table, tr', { timeout: 6000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}


