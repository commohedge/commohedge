import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Configuration pour l'environnement serverless
const isDev = !process.env.AWS_REGION;

async function getBrowser() {
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: isDev 
      ? undefined // Utilise l'installation locale en développement
      : await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

export default async function handler(req, res) {
  // Configurer CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  // Construct URL - handle symbols with or without exclamation mark
  const cleanSymbol = symbol.replace(/^NYMEX-/, ''); // Remove NYMEX- prefix if present
  const url = `https://www.tradingview.com/symbols/NYMEX-${cleanSymbol}/`;

  let browser = null;
  let page = null;

  try {
    console.log(`Scraping TradingView symbol: ${symbol}`);
    
    browser = await getBrowser();
    page = await browser.newPage();
    
    // Configuration de la page
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Naviguer vers la page
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    });
    console.log('TradingView symbol page loaded successfully');
    
    // Attendre que le contenu se charge (augmenté pour les symboles freight)
    console.log('Waiting for TradingView symbol content to render...');
    
    // Attendre que les éléments de prix soient présents
    try {
      await page.waitForSelector('.tv-symbol-price-quote__value, [data-field="last_price"], .js-symbol-last, [class*="price"]', {
        timeout: 10000
      }).catch(() => {
        console.log('Price selector not found, continuing anyway...');
      });
    } catch (e) {
      console.log('Waiting for price selectors timed out, continuing...');
    }
    
    // Attendre un peu plus pour que les données JSON se chargent
    await new Promise(resolve => setTimeout(resolve, 8000));
    console.log('Wait completed');
    
    // Vérifier si on a un CAPTCHA
    const hasCaptcha = await page.evaluate(() => {
      return document.body.textContent.includes('Complete the test below') || 
             document.body.textContent.includes('Just one more step') ||
             document.querySelector('[class*="captcha"], [id*="captcha"]') !== null;
    });
    
    if (hasCaptcha) {
      console.warn('CAPTCHA detected on TradingView page');
      return res.status(403).json({ 
        error: 'CAPTCHA detected',
        message: 'TradingView is showing a CAPTCHA. Please try again later.'
      });
    }
    
    // Extraire le HTML
    const html = await page.content();
    
    console.log(`Successfully scraped TradingView symbol ${symbol}: ${html.length} characters`);
    
    return res.status(200).json({
      data: html
    });
    
  } catch (error) {
    console.error(`Error scraping TradingView symbol ${symbol}:`, error);
    return res.status(500).json({ 
      error: 'Failed to scrape TradingView symbol',
      message: error.message 
    });
  } finally {
    if (page) {
      await page.close().catch(console.error);
    }
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

