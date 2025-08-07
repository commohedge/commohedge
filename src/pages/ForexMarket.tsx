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

  const exchangeRateService = ExchangeRateService.getInstance();
  const financialDataService = new FinancialDataService();
  const { theme } = useTheme();

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [baseCurrency]);

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
      const enhancedCurrencies: CurrencyData[] = formattedData.map(currency => ({
        code: currency.code,
        name: currency.name,
        rate: currency.rate
      }));

      setCurrencies(enhancedCurrencies);
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
    return filteredCurrencies.filter(currency => majorPairs.includes(currency.code));
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
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
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