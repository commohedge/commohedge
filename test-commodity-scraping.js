/**
 * Test Script - Commodity Market Scraping
 * 
 * Ce script teste les endpoints de scraping localement
 * Usage: node test-commodity-scraping.js
 */

const BASE_URL = 'http://localhost:3000';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url) {
  log(`\n━━━ Testing: ${name} ━━━`, 'cyan');
  log(`URL: ${url}`, 'blue');
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red');
    log(`Duration: ${duration}ms`, 'yellow');
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.data) {
        const htmlLength = data.data.length;
        log(`HTML Length: ${htmlLength} characters`, 'green');
        
        // Vérifier si c'est du HTML valide
        if (data.data.includes('<html') || data.data.includes('<!DOCTYPE')) {
          log('✅ Valid HTML detected', 'green');
        } else {
          log('⚠️ No HTML tags detected', 'yellow');
        }
        
        // Afficher un échantillon
        const sample = data.data.substring(0, 200);
        log(`Sample: ${sample}...`, 'blue');
      } else if (data.status) {
        log(`Response: ${JSON.stringify(data, null, 2)}`, 'green');
      }
      
      log('✅ TEST PASSED', 'green');
      return true;
    } else {
      const error = await response.text();
      log(`Error: ${error}`, 'red');
      log('❌ TEST FAILED', 'red');
      return false;
    }
  } catch (error) {
    log(`Exception: ${error.message}`, 'red');
    log('❌ TEST FAILED', 'red');
    return false;
  }
}

async function runTests() {
  log('\n╔══════════════════════════════════════════════════════╗', 'cyan');
  log('║  COMMODITY MARKET SCRAPING - TEST SUITE            ║', 'cyan');
  log('╚══════════════════════════════════════════════════════╝\n', 'cyan');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/api/health`,
    },
    {
      name: 'TradingView Metals',
      url: `${BASE_URL}/api/tradingview/metals`,
    },
    {
      name: 'TradingView Agricultural',
      url: `${BASE_URL}/api/tradingview/agricultural`,
    },
    {
      name: 'TradingView Energy',
      url: `${BASE_URL}/api/tradingview/energy`,
    },
    {
      name: 'Generic Webscraper',
      url: `${BASE_URL}/api/webscraper?url=${encodeURIComponent('https://www.tradingview.com/markets/futures/quotes-metals/')}`,
    },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const passed = await testEndpoint(test.name, test.url);
    results.push({ name: test.name, passed });
  }
  
  // Afficher le résumé
  log('\n╔══════════════════════════════════════════════════════╗', 'cyan');
  log('║  TEST SUMMARY                                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════╝\n', 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });
  
  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 ALL TESTS PASSED! 🎉\n', 'green');
  } else {
    log(`\n⚠️ ${total - passed} test(s) failed\n`, 'yellow');
  }
  
  // Tips
  log('\n━━━ TIPS ━━━', 'cyan');
  log('• Make sure the dev server is running: npm run dev', 'blue');
  log('• Check the console for detailed logs', 'blue');
  log('• First run may take longer (Puppeteer initialization)', 'blue');
  log('• Subsequent runs should use cached data\n', 'blue');
  
  return passed === total;
}

// Fonction principale
async function main() {
  const allPassed = await runTests();
  process.exit(allPassed ? 0 : 1);
}

// Vérifier si le serveur est accessible
async function checkServer() {
  log('Checking if server is running...', 'yellow');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      log('✅ Server is running\n', 'green');
      return true;
    }
  } catch (error) {
    log('❌ Server is not running', 'red');
    log('Please start the dev server: npm run dev\n', 'yellow');
    return false;
  }
}

// Exécuter les tests
(async () => {
  const serverReady = await checkServer();
  if (serverReady) {
    await main();
  } else {
    process.exit(1);
  }
})();

