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

  // Determine the correct exchange for the symbol
  // Freight symbols are typically on ICE, not NYMEX
  let exchange = 'NYMEX';
  if (symbol.startsWith('CS') || symbol.startsWith('T') || symbol.startsWith('TD') || 
      symbol.startsWith('TC') || symbol.startsWith('TF') || symbol.startsWith('FR') || 
      symbol.startsWith('AE') || symbol.startsWith('BG') || symbol.startsWith('BL') ||
      symbol.startsWith('USC') || symbol.startsWith('USE') || symbol.startsWith('XUK') ||
      symbol.startsWith('FLJ') || symbol.startsWith('FLP')) {
    exchange = 'ICE';
  }

  const url = `https://www.tradingview.com/symbols/${exchange}-${symbol}/`;

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
    console.log(`Navigating to: ${url} (exchange: ${exchange}, symbol: ${symbol})`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    console.log('TradingView symbol page loaded successfully');
    
    // Attendre que le contenu se charge (augmenté pour les pages freight qui peuvent être plus lentes)
    console.log('Waiting for TradingView symbol content to render...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    console.log('Wait completed');
    
    // Vérifier si la page contient une erreur ou un message "symbol not found"
    const html = await page.content();
    if (html.includes('Symbol not found') || html.includes('404') || 
        html.includes('Page not found') || html.includes('symbol does not exist') ||
        html.includes('This symbol is not available')) {
      console.warn(`Symbol ${symbol} not found on ${exchange}`);
      return res.status(404).json({ 
        error: 'Symbol not found',
        message: `Symbol ${symbol} not found on ${exchange}`,
        data: null
      });
    }
    
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

