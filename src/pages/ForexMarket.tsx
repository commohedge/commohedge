import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, ChevronUp, ChevronDown, Globe, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ExchangeRateService from '@/services/ExchangeRateService';
import FinancialDataService from '@/services/FinancialDataService';
import { useTheme } from '@/hooks/useTheme';
import '@/styles/forex-market.css';

interface CurrencyData {
  code: string;
  name: string;
  rate: number;
}

interface CurrencyPair {
  symbol: string;
  name: string;
  base: string;
  quote: string;
  category: 'majors' | 'crosses' | 'others';
  defaultSpotRate: number;
}

const ForexMarket: React.FC = () => {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [filteredCurrencies, setFilteredCurrencies] = useState<CurrencyData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [sortField, setSortField] = useState<'code' | 'name' | 'rate'>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState('market-data');
  const [widgetKey, setWidgetKey] = useState(0);
  
  // États pour les paires de devises personnalisées
  const [customCurrencyPairs, setCustomCurrencyPairs] = useState<CurrencyPair[]>(() => {
    try {
      const savedPairs = localStorage.getItem('customCurrencyPairs');
      return savedPairs ? JSON.parse(savedPairs) : [];
    } catch (error) {
      console.warn('Error loading custom currency pairs:', error);
      return [];
    }
  });
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState<string>('EUR/USD');
  const [showAddPairDialog, setShowAddPairDialog] = useState(false);
  const [newPairSymbol, setNewPairSymbol] = useState('');
  const [newPairName, setNewPairName] = useState('');
  const [newPairRate, setNewPairRate] = useState('');

  const exchangeRateService = ExchangeRateService.getInstance();
  const financialDataService = new FinancialDataService();
  const { theme } = useTheme();

  // Fonction pour sauvegarder les paires personnalisées
  const saveCustomCurrencyPairs = (pairs: CurrencyPair[]) => {
    try {
      localStorage.setItem('customCurrencyPairs', JSON.stringify(pairs));
      setCustomCurrencyPairs(pairs);
      console.log('✅ Custom currency pairs saved:', pairs);
      console.log('✅ Total pairs now:', [...getDefaultCurrencyPairs(), ...pairs].length);
    } catch (error) {
      console.error('❌ Error saving custom currency pairs:', error);
    }
  };

  // Fonction pour ajouter une paire de devise personnalisée
  const addCustomCurrencyPair = () => {
    if (!newPairSymbol || !newPairName || !newPairRate) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const symbol = newPairSymbol.toUpperCase();
    const rate = parseFloat(newPairRate);
    
    if (isNaN(rate) || rate <= 0) {
      alert('Le taux doit être un nombre positif');
      return;
    }

    // Vérifier si la paire existe déjà
    const allPairs = [...getDefaultCurrencyPairs(), ...customCurrencyPairs];
    if (allPairs.some(pair => pair.symbol === symbol)) {
      alert(`La paire de devises ${symbol} existe déjà`);
      return;
    }

    // Extraire base et quote du symbole
    const [base, quote] = symbol.split('/');
    if (!base || !quote || base.length !== 3 || quote.length !== 3) {
      alert('Le format du symbole doit être XXX/YYY (ex: EUR/USD)');
      return;
    }

    const newPair: CurrencyPair = {
      symbol,
      name: newPairName,
      base,
      quote,
      category: 'others',
      defaultSpotRate: rate
    };

    const updated = [...customCurrencyPairs, newPair];
    saveCustomCurrencyPairs(updated);
    
    // Sélectionner automatiquement la nouvelle paire ajoutée
    setSelectedCurrencyPair(symbol);
    
    // Réinitialiser le formulaire
    setNewPairSymbol('');
    setNewPairName('');
    setNewPairRate('');
    setShowAddPairDialog(false);
    
    // Afficher un message de succès
    alert(`✅ Paire ${symbol} ajoutée avec succès !`);
    
    console.log('✅ New currency pair added:', newPair);
    console.log('✅ Updated custom pairs:', updated);
    console.log('✅ Selected pair set to:', symbol);
  };

  // Fonction pour obtenir les paires de devises par défaut
  const getDefaultCurrencyPairs = (): CurrencyPair[] => {
    return [
      { symbol: "EUR/USD", name: "Euro/US Dollar", base: "EUR", quote: "USD", category: "majors", defaultSpotRate: 1.0850 },
      { symbol: "GBP/USD", name: "British Pound/US Dollar", base: "GBP", quote: "USD", category: "majors", defaultSpotRate: 1.2650 },
      { symbol: "USD/JPY", name: "US Dollar/Japanese Yen", base: "USD", quote: "JPY", category: "majors", defaultSpotRate: 149.50 },
      { symbol: "USD/CHF", name: "US Dollar/Swiss Franc", base: "USD", quote: "CHF", category: "majors", defaultSpotRate: 0.8850 },
      { symbol: "AUD/USD", name: "Australian Dollar/US Dollar", base: "AUD", quote: "USD", category: "majors", defaultSpotRate: 0.6580 },
      { symbol: "USD/CAD", name: "US Dollar/Canadian Dollar", base: "USD", quote: "CAD", category: "majors", defaultSpotRate: 1.3650 },
      { symbol: "NZD/USD", name: "New Zealand Dollar/US Dollar", base: "NZD", quote: "USD", category: "majors", defaultSpotRate: 0.6020 },
      { symbol: "EUR/GBP", name: "Euro/British Pound", base: "EUR", quote: "GBP", category: "crosses", defaultSpotRate: 0.8580 },
      { symbol: "EUR/JPY", name: "Euro/Japanese Yen", base: "EUR", quote: "JPY", category: "crosses", defaultSpotRate: 162.25 },
      { symbol: "GBP/JPY", name: "British Pound/Japanese Yen", base: "GBP", quote: "JPY", category: "crosses", defaultSpotRate: 189.15 },
      { symbol: "EUR/CHF", name: "Euro/Swiss Franc", base: "EUR", quote: "CHF", category: "crosses", defaultSpotRate: 0.9605 },
      { symbol: "EUR/AUD", name: "Euro/Australian Dollar", base: "EUR", quote: "AUD", category: "crosses", defaultSpotRate: 1.6485 },
      { symbol: "GBP/CHF", name: "British Pound/Swiss Franc", base: "GBP", quote: "CHF", category: "crosses", defaultSpotRate: 1.1195 },
      { symbol: "AUD/JPY", name: "Australian Dollar/Japanese Yen", base: "AUD", quote: "JPY", category: "crosses", defaultSpotRate: 98.40 },
      { symbol: "CAD/JPY", name: "Canadian Dollar/Japanese Yen", base: "CAD", quote: "JPY", category: "crosses", defaultSpotRate: 109.52 },
      { symbol: "CHF/JPY", name: "Swiss Franc/Japanese Yen", base: "CHF", quote: "JPY", category: "crosses", defaultSpotRate: 169.01 },
    ];
  };

  // Fonction pour obtenir toutes les paires de devises (défaut + personnalisées)
  const getAllCurrencyPairs = (): CurrencyPair[] => {
    return [...getDefaultCurrencyPairs(), ...customCurrencyPairs];
  };

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [baseCurrency, customCurrencyPairs]); // Ajouter customCurrencyPairs comme dépendance

  // Synchroniser les paires personnalisées avec le localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedPairs = localStorage.getItem('customCurrencyPairs');
        if (savedPairs) {
          const parsed = JSON.parse(savedPairs);
          setCustomCurrencyPairs(parsed);
        }
      } catch (error) {
        console.warn('Error syncing custom currency pairs:', error);
      }
    };

    // Écouter les changements dans le localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier périodiquement les changements (pour les changements dans le même onglet)
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // S'assurer que la liste des paires se met à jour quand customCurrencyPairs change
  useEffect(() => {
    console.log('🔄 Custom pairs updated:', customCurrencyPairs);
    console.log('🔄 All pairs now:', getAllCurrencyPairs().map(p => p.symbol));
  }, [customCurrencyPairs]);

  useEffect(() => {
    const filtered = currencies.filter(currency =>
      currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCurrencies(filtered);
  }, [searchTerm, currencies]);

  useEffect(() => {
    // Force widget reload when theme changes
    if (activeTab === 'advanced-data') {
      setWidgetKey(prev => prev + 1);
    }
  }, [theme]);

  useEffect(() => {
    // Load TradingView widget when advanced-data tab is active
    if (activeTab === 'advanced-data') {
      const loadTradingViewWidget = () => {
        // Remove existing widget if any
        const existingWidget = document.querySelector('.tradingview-widget-container__widget');
        if (existingWidget) {
          existingWidget.innerHTML = '';
        }

        // Remove any existing TradingView scripts
        const existingScripts = document.querySelectorAll('script[src*="tradingview"]');
        existingScripts.forEach(script => script.remove());

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
          "width": "100%",
          "height": "800",
          "defaultColumn": "overview",
          "defaultScreen": "top_gainers",
          "showToolbar": true,
          "locale": "en",
          "market": "forex",
          "colorTheme": theme === 'dark' ? "dark" : "light"
        });

        const widgetContainer = document.querySelector('.tradingview-widget-container__widget');
        if (widgetContainer) {
          widgetContainer.appendChild(script);
        }
      };

      // Wait for the DOM to be ready
      setTimeout(loadTradingViewWidget, 100);
    }
  }, [activeTab, widgetKey]);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      
      // Get exchange rates from ExchangeRateService
      const exchangeData = await exchangeRateService.getExchangeRates(baseCurrency);
      const formattedData = exchangeRateService.formatCurrencyData(exchangeData);
      
      // Transform to CurrencyData format (only code, name, rate)
      const apiCurrencies: CurrencyData[] = formattedData.map(currency => ({
        code: currency.code,
        name: currency.name,
        rate: currency.rate
      }));

      // Ajouter les paires personnalisées aux données de marché
      const customCurrencies: CurrencyData[] = customCurrencyPairs.map(pair => ({
        code: pair.base,
        name: `${pair.base} (from ${pair.symbol})`,
        rate: pair.defaultSpotRate
      }));

      // Combiner les devises API et personnalisées
      const allCurrencies = [...apiCurrencies, ...customCurrencies];
      
      // Supprimer les doublons (priorité aux données API)
      const uniqueCurrencies = allCurrencies.filter((currency, index, self) => 
        index === self.findIndex(c => c.code === currency.code)
      );

      setCurrencies(uniqueCurrencies);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (rate: number): string => {
    if (rate > 100) return rate.toFixed(2);
    if (rate > 10) return rate.toFixed(3);
    return rate.toFixed(4);
  };

  const getMajorPairs = () => {
    const majorPairs = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY'];
    
    // Combiner les devises des API avec nos paires personnalisées
    const allCurrencyCodes = new Set<string>();
    
    // Ajouter les devises des API
    filteredCurrencies.forEach(currency => allCurrencyCodes.add(currency.code));
    
    // Ajouter les devises de nos paires personnalisées
    customCurrencyPairs.forEach(pair => {
      allCurrencyCodes.add(pair.base);
      allCurrencyCodes.add(pair.quote);
    });
    
    // Filtrer pour ne garder que les majors
    return Array.from(allCurrencyCodes)
      .filter(code => majorPairs.includes(code))
      .map(code => ({
        code,
        name: code, // Nom simple pour l'affichage
        rate: 1 // Taux par défaut
      }));
  };

  const handleSort = (field: 'code' | 'name' | 'rate') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedCurrencies = () => {
    return [...filteredCurrencies].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'rate':
          aValue = a.rate;
          bValue = b.rate;
          break;
        default:
          aValue = a.code;
          bValue = b.code;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });
  };

  return (
    <Layout title="Forex Market">
      <div className="space-y-6">
        {/* Status Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forex Market Data</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time currency exchange rates from global markets
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Last updated:</span>
              <span className="font-mono">{lastUpdated.toLocaleTimeString()}</span>
            </div>
            
            <Button
              onClick={loadMarketData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Sync Rapide des Taux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sync Rapide des Taux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paire de Devises Sélectionnée
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {getAllCurrencyPairs().length} total
                  </span>
                  {customCurrencyPairs.length > 0 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      +{customCurrencyPairs.length} personnalisée{customCurrencyPairs.length > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <select
                  key={`currency-select-${customCurrencyPairs.length}`}
                  value={selectedCurrencyPair}
                  onChange={(e) => setSelectedCurrencyPair(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                >
                  {/* Paires par défaut */}
                  {getDefaultCurrencyPairs().map(pair => (
                    <option key={pair.symbol} value={pair.symbol}>
                      {pair.symbol} - {pair.name}
                    </option>
                  ))}
                  
                  {/* Paires personnalisées */}
                  {customCurrencyPairs.length > 0 && (
                    <>
                      <option disabled>--- Paires Personnalisées ---</option>
                      {customCurrencyPairs.map(pair => (
                        <option key={`custom-${pair.symbol}`} value={pair.symbol}>
                          {pair.symbol} - {pair.name} (Personnalisée)
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Taux Actuel
                </label>
                <div className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
                  {(() => {
                    // Chercher d'abord dans les paires par défaut
                    let selectedPair = getDefaultCurrencyPairs().find(pair => pair.symbol === selectedCurrencyPair);
                    
                    // Si pas trouvé, chercher dans les paires personnalisées
                    if (!selectedPair) {
                      selectedPair = customCurrencyPairs.find(pair => pair.symbol === selectedCurrencyPair);
                    }
                    
                    return selectedPair ? selectedPair.defaultSpotRate.toFixed(4) : 'N/A';
                  })()}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddPairDialog(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <span>+</span>
                Ajouter une Paire Personnalisée
              </Button>
              
              {customCurrencyPairs.length > 0 && (
                <Button
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les paires personnalisées ?')) {
                      saveCustomCurrencyPairs([]);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <span>🗑️</span>
                  Supprimer Toutes les Paires Personnalisées
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog pour ajouter une nouvelle paire */}
        {showAddPairDialog && (
          <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Ajouter une Paire de Devises Personnalisée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbole (ex: EUR/USD)</label>
                  <Input
                    value={newPairSymbol}
                    onChange={(e) => setNewPairSymbol(e.target.value.toUpperCase())}
                    placeholder="EUR/USD"
                    maxLength={7}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom Complet</label>
                  <Input
                    value={newPairName}
                    onChange={(e) => setNewPairName(e.target.value)}
                    placeholder="Euro/US Dollar"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Taux de Change</label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={newPairRate}
                    onChange={(e) => setNewPairRate(e.target.value)}
                    placeholder="1.0850"
                  />
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setShowAddPairDialog(false)}
                    variant="outline"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={addCustomCurrencyPair}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market-data">Market Data</TabsTrigger>
            <TabsTrigger value="advanced-data">Advanced Forex Data</TabsTrigger>
          </TabsList>

          {/* Market Data Tab */}
          <TabsContent value="market-data" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search currencies by code or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Base Currency:</span>
                    <select
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                    >
                      {/* Extraire toutes les devises uniques des paires disponibles */}
                      {(() => {
                        const allPairs = [...getDefaultCurrencyPairs(), ...customCurrencyPairs];
                        const allCurrencies = new Set<string>();
                        
                        allPairs.forEach(pair => {
                          allCurrencies.add(pair.base);
                          allCurrencies.add(pair.quote);
                        });
                        
                        return Array.from(allCurrencies).sort().map(currency => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Currencies</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {filteredCurrencies.length}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Major Pairs</p>
                      <p className="text-2xl font-bold text-green-600">
                        {getMajorPairs().length}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Other Pairs</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {filteredCurrencies.length - getMajorPairs().length}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Minus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Currency Rates Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Currency Exchange Rates
                  <Badge variant="secondary" className="text-sm">{filteredCurrencies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead 
                          className="w-[120px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleSort('code')}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            Currency
                            {sortField === 'code' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            Name
                            {sortField === 'name' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleSort('rate')}
                        >
                          <div className="flex items-center justify-end gap-1 font-semibold">
                            Rate ({baseCurrency})
                            {sortField === 'rate' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedCurrencies().map((currency) => (
                        <TableRow key={currency.code} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">{currency.code}</span>
                              {getMajorPairs().some(p => p.code === currency.code) && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Major</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {currency.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                              {formatRate(currency.rate)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading market data...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {!loading && filteredCurrencies.length === 0 && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No currencies found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your search terms or base currency.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Advanced Forex Data Tab */}
          <TabsContent value="advanced-data" className="h-screen">
            <div key={widgetKey} className="tradingview-widget-container" style={{ height: '80vh', width: '100%', minHeight: '600px' }}>
              <div className="tradingview-widget-container__widget"></div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ForexMarket; 