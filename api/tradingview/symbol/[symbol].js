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

  // Determine the exchange based on symbol type
  // Freight symbols are typically on ICE or other exchanges, not NYMEX
  const isFreightSymbol = symbol.includes('CS') || symbol.includes('TM') || symbol.includes('TD') || 
      symbol.includes('TC') || symbol.includes('TH') || symbol.includes('TK') ||
      symbol.includes('TL') || symbol.includes('AEB') || symbol.includes('T2D') ||
      symbol.includes('T7C') || symbol.includes('TDM') || symbol.includes('FRS') ||
      symbol.includes('T5C') || symbol.includes('ACB') || symbol.includes('FRC') ||
      symbol.includes('T8C') || symbol.includes('TC11') || symbol.includes('TF21') ||
      symbol.includes('BG') || symbol.includes('BL') || symbol.includes('USC') ||
      symbol.includes('USE') || symbol.includes('XUK') || symbol.includes('FLJ') ||
      symbol.includes('FLP');
  
  // For freight symbols, try ICE first (most freight futures are on ICE)
  // Otherwise try NYMEX
  const exchangesToTry = isFreightSymbol ? ['ICE', 'NYMEX'] : ['NYMEX', 'ICE'];
  let url = `https://www.tradingview.com/symbols/${exchangesToTry[0]}-${symbol}/`;
  console.log(`Trying exchange ${exchangesToTry[0]} for symbol: ${symbol}`);

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
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('TradingView symbol page loaded successfully');
    
    // Attendre que le contenu se charge - augmenter le temps d'attente pour les données dynamiques
    console.log('Waiting for TradingView symbol content to render...');
    await new Promise(resolve => setTimeout(resolve, 8000)); // Augmenté à 8 secondes pour les données dynamiques
    console.log('Wait completed');
    
    // Attendre spécifiquement que les éléments de prix soient chargés
    try {
      await page.waitForSelector('.tv-symbol-price-quote__value, [data-field="last_price"], .js-symbol-last, [class*="price"]', { 
        timeout: 5000 
      }).catch(() => {
        console.log('Price selector not found, continuing anyway...');
      });
    } catch (e) {
      console.log('Timeout waiting for price selector, continuing...');
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

