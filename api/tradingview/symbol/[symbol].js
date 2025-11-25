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

  // We'll try multiple URL formats below, starting with NYMEX

  let browser = null;
  let page = null;

  try {
    console.log(`Scraping TradingView symbol: ${symbol}`);
    
    browser = await getBrowser();
    page = await browser.newPage();
    
    // Configuration de la page
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Try multiple URL formats if the first one fails
    let html = '';
    let lastError = null;
    const urlFormats = [
      `https://www.tradingview.com/symbols/NYMEX-${symbol}/`,
      `https://www.tradingview.com/symbols/ICE-${symbol}/`,
      `https://www.tradingview.com/symbols/${symbol}/`,
      `https://fr.tradingview.com/symbols/NYMEX-${symbol}/`,
      `https://fr.tradingview.com/symbols/ICE-${symbol}/`,
      `https://fr.tradingview.com/symbols/${symbol}/`,
    ];

    for (const tryUrl of urlFormats) {
      try {
        console.log(`Trying URL: ${tryUrl}`);
        await page.goto(tryUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        console.log(`TradingView symbol page loaded successfully from ${tryUrl}`);
        
        // Attendre que le contenu se charge
        console.log('Waiting for TradingView symbol content to render...');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Increased wait time
        console.log('Wait completed');
        
        // Check if page loaded successfully (not a 404 or error page)
        const pageTitle = await page.title();
        const pageUrl = page.url();
        
        // If we got redirected to a different page or got an error, try next format
        if (pageUrl.includes('404') || pageUrl.includes('error') || 
            pageTitle.toLowerCase().includes('not found') || 
            pageTitle.toLowerCase().includes('error')) {
          console.log(`Page appears to be an error page, trying next format...`);
          continue;
        }
        
        // Extraire le HTML
        html = await page.content();
        
        // Check if HTML contains price data or symbol information
        if (html.includes('tv-symbol-price-quote') || 
            html.includes('last_price') || 
            html.includes(symbol.replace(/!$/, '')) ||
            html.length > 50000) { // Reasonable page size
          console.log(`Successfully found data on ${tryUrl}`);
          break;
        } else {
          console.log(`No price data found on ${tryUrl}, trying next format...`);
          continue;
        }
      } catch (err) {
        console.warn(`Error loading ${tryUrl}:`, err.message);
        lastError = err;
        continue;
      }
    }
    
    if (!html || html.length < 1000) {
      throw new Error(`Failed to load symbol ${symbol} from any URL format. Last error: ${lastError?.message || 'Unknown'}`);
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

