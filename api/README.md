# 📡 API Scraping Endpoints

Ce dossier contient tous les endpoints Vercel Serverless Functions pour le scraping des données commodités.

## 🏗️ Structure

```
api/
├── utils/
│   └── puppeteer-config.js    # Configuration Puppeteer réutilisable
├── health.js                   # Health check endpoint
├── webscraper.js               # Endpoint générique
├── shipandbunker.js            # Ship & Bunker scraping
├── shipandbunker/
│   └── emea.js                 # Ship & Bunker EMEA
└── tradingview/
    ├── [category].js           # TradingView par catégorie
    └── symbol/
        └── [symbol].js         # TradingView par symbole
```

## 🔧 Configuration

### Vercel Settings
- **Max Duration**: 30 secondes
- **Region**: iad1 (US East)
- **Runtime**: Node.js 18+

### Environment Variables (Optional)
```bash
# Pour développement local
AWS_REGION=           # Laissez vide pour dev local
```

## 📚 Endpoints Disponibles

### 1. Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Puppeteer scraping API is running",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

### 2. Generic Web Scraper
```
GET /api/webscraper?url=<encoded_url>
```

**Parameters:**
- `url` (required): URL encodée à scraper

**Response:**
```json
{
  "data": "<html>...</html>"
}
```

### 3. TradingView Category
```
GET /api/tradingview/<category>
```

**Categories disponibles:**
- `metals` - Métaux
- `agricultural` - Produits agricoles
- `energy` - Énergie

**Response:**
```json
{
  "data": "<html>...</html>"
}
```

### 4. TradingView Symbol
```
GET /api/tradingview/symbol/<symbol>
```

**Examples:**
- `/api/tradingview/symbol/GC1!` - Gold Futures
- `/api/tradingview/symbol/CL1!` - Crude Oil Futures

**Response:**
```json
{
  "data": "<html>...</html>"
}
```

### 5. Ship & Bunker
```
GET /api/shipandbunker?type=<type>
```

**Parameters:**
- `type` (optional): vlsfo, mgo, ifo380

**Response:**
```json
{
  "data": "<html>...</html>"
}
```

### 6. Ship & Bunker EMEA
```
GET /api/shipandbunker/emea
```

**Response:**
```json
{
  "data": "<html>...</html>"
}
```

## 🚀 Comment Ajouter un Nouvel Endpoint

### 1. Créer le fichier endpoint

**Exemple: `/api/newexchange.js`**

```javascript
import { getBrowser, setupPage, smartWait, setCorsHeaders } from './utils/puppeteer-config.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = 'https://example.com/data';
  let browser = null;
  let page = null;

  try {
    console.log('Scraping new exchange...');
    
    browser = await getBrowser();
    page = await browser.newPage();
    
    await setupPage(page);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    await smartWait(page, url);
    
    const html = await page.content();
    
    return res.status(200).json({ data: html });
    
  } catch (error) {
    console.error('Error scraping:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape',
      message: error.message 
    });
  } finally {
    if (page) await page.close().catch(console.error);
    if (browser) await browser.close().catch(console.error);
  }
}
```

### 2. Ajouter au service frontend

**Dans `src/services/puppeteerApi.ts`:**

```typescript
export async function scrapeNewExchange(): Promise<ScrapingResult> {
  try {
    const apiUrl = `${SCRAPING_SERVER_URL}/api/newexchange`;
    const response = await fetch(apiUrl, { timeout: 20000 } as any);
    
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Scraping failed:', error);
    throw error;
  }
}
```

### 3. Tester l'endpoint

```bash
# Local
curl http://localhost:3000/api/newexchange

# Production
curl https://your-domain.vercel.app/api/newexchange
```

## 🛠️ Développement Local

### Installation
```bash
npm install
```

### Démarrer le serveur
```bash
npm run dev
```

### Tester les endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# TradingView metals
curl http://localhost:3000/api/tradingview/metals
```

## 🔍 Debugging

### Activer les logs détaillés

Dans chaque endpoint, les logs sont déjà activés:
```javascript
console.log('Step description...');
console.log('Variable value:', value);
```

### Vérifier le contenu HTML

```bash
# Sauvegarder la réponse dans un fichier
curl http://localhost:3000/api/tradingview/metals > output.json

# Extraire le HTML
cat output.json | jq -r '.data' > output.html
```

### Tester Puppeteer localement

Créez un script de test:
```javascript
// test-scraping.js
import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.tradingview.com/markets/futures/quotes-metals/');
  await page.waitForTimeout(5000);
  const html = await page.content();
  console.log('HTML length:', html.length);
  await browser.close();
})();
```

```bash
node test-scraping.js
```

## ⚠️ Limites et Bonnes Pratiques

### Limites Vercel
- **Max Duration**: 30 secondes
- **Memory**: 1024 MB
- **Payload**: 4.5 MB

### Bonnes Pratiques

1. **Toujours fermer les ressources**
   ```javascript
   finally {
     if (page) await page.close().catch(console.error);
     if (browser) await browser.close().catch(console.error);
   }
   ```

2. **Gérer les timeouts**
   ```javascript
   await page.goto(url, { 
     waitUntil: 'domcontentloaded',
     timeout: 20000 
   });
   ```

3. **Bloquer les ressources inutiles**
   ```javascript
   await page.setRequestInterception(true);
   page.on('request', (req) => {
     if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
       req.abort();
     } else {
       req.continue();
     }
   });
   ```

4. **Utiliser smartWait**
   ```javascript
   await smartWait(page, url);
   ```

## 📊 Monitoring

### Logs Vercel
Accéder aux logs:
1. Dashboard Vercel
2. Sélectionner le projet
3. Onglet "Logs"
4. Filtrer par fonction

### Métriques
- Durée d'exécution
- Taux d'erreur
- Utilisation mémoire
- Fréquence d'appel

## 🔐 Sécurité

### CORS
Tous les endpoints ont CORS activé:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

### Rate Limiting
Implémenter si nécessaire:
```javascript
// Exemple simple
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 10) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}
```

## 📞 Support

- **Issues**: Créer une issue GitHub
- **Logs**: Vérifier les logs Vercel
- **Tests**: Tester localement d'abord

---

**Last Updated**: October 21, 2025
**Version**: 1.0.0

