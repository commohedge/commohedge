import React, { useState, useEffect } from 'react';
import { parse } from 'node-html-parser';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus, Layers } from 'lucide-react';

type CommodityCategory = 'metals' | 'agricultural' | 'energy' | 'freight' | 'bunker';

interface ScrapingResult { data: string }

interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  category: CommodityCategory;
  change: number;
  changePercent: number;
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

async function scrapeTradingViewCategory(category: string): Promise<ScrapingResult> {
  const response = await fetch(`${API_BASE}/api/tradingview/${category}`, { method: 'GET' } as any);
  if (!response.ok) throw new Error('Failed to scrape TradingView category');
  return response.json();
}

async function scrapeTradingViewSymbol(symbol: string): Promise<ScrapingResult> {
  const response = await fetch(`${API_BASE}/api/tradingview/symbol/${symbol}`, { method: 'GET' } as any);
  if (!response.ok) throw new Error('Failed to scrape TradingView symbol');
  return response.json();
}

async function scrapeShipAndBunker(type?: string): Promise<ScrapingResult> {
  const url = type ? `${API_BASE}/api/shipandbunker?type=${encodeURIComponent(type)}` : `${API_BASE}/api/shipandbunker`;
  const response = await fetch(url, { method: 'GET' } as any);
  if (!response.ok) throw new Error('Failed to scrape Ship & Bunker');
  return response.json();
}

async function scrapeShipAndBunkerEMEA(): Promise<ScrapingResult> {
  const response = await fetch(`${API_BASE}/api/shipandbunker/emea`, { method: 'GET' } as any);
  if (!response.ok) throw new Error('Failed to scrape Ship & Bunker EMEA');
  return response.json();
}

function parseNumberWithSeparators(text: string): number {
  if (!text) return 0;
  let t = text.replace(/[^\d.,\-+]/g, '');
  if (t.includes(',') && t.includes('.')) {
    const lastDot = t.lastIndexOf('.');
    const lastComma = t.lastIndexOf(',');
    t = lastDot > lastComma ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(/,([^,]*)$/, '.$1');
  } else if (t.includes(',') && !t.includes('.')) {
    const parts = t.split(',');
    if (parts.length === 2 && parts[1].length <= 4) {
      t = t.replace(',', '.');
    } else {
      t = t.replace(/,/g, '');
    }
  }
  return parseFloat(t) || 0;
}

function parseCommoditiesTableHTML(html: string, category: CommodityCategory): CommodityData[] {
  const root = parse(html);
  let rows = root.querySelectorAll('.tv-data-table__row');
  if (!rows || rows.length === 0) rows = root.querySelectorAll('tr[data-rowid]');
  if (!rows || rows.length === 0) rows = root.querySelectorAll('table tr');
  const commodities: CommodityData[] = [];
  rows.forEach((row: any) => {
    const cells = row.querySelectorAll('td');
    if (!cells || cells.length < 6) return;
    const first = cells[0];
    let symbol = '';
    let name = '';
    const symbolEl = first.querySelector('.symbol-name');
    if (symbolEl) {
      symbol = symbolEl.text.trim();
      name = symbolEl.getAttribute('title') || symbol;
    } else {
      const parts = (first.text || '').trim().split(/\s+/);
      symbol = parts[0] || '';
      name = parts.slice(1).join(' ') || symbol;
    }
    if (!symbol) return;
    const price = parseNumberWithSeparators((cells[1]?.text || '').trim());
    const percentCell = cells[2];
    let pct = parseNumberWithSeparators((percentCell?.text || '').trim());
    const negClass = percentCell?.toString().includes('negative') || percentCell?.toString().includes('down') || percentCell?.toString().includes('red');
    if (negClass && pct > 0) pct = -pct;
    const absCell = cells[3];
    let abs = parseNumberWithSeparators((absCell?.text || '').trim());
    const absNegClass = absCell?.toString().includes('negative') || absCell?.toString().includes('down') || absCell?.toString().includes('red');
    if (absNegClass && abs > 0) abs = -abs;
    commodities.push({ symbol, name, price, category, change: abs, changePercent: pct });
  });
  return commodities.filter(c => c.price > 0);
}

async function fetchFreightData(): Promise<CommodityData[]> {
  const symbols = [
    { s: 'CS61!', n: 'Container Freight (FBX13)', c: 'freight' as const },
    { s: 'CS31!', n: 'Container Freight (FBX03)', c: 'freight' as const },
    { s: 'CS51!', n: 'Container Freight (FBX12)', c: 'freight' as const },
    { s: 'CS11!', n: 'Container Freight (FBX01)', c: 'freight' as const },
    { s: 'CS21!', n: 'Container Freight (FBX02)', c: 'freight' as const },
    { s: 'CS41!', n: 'Container Freight (FBX11)', c: 'freight' as const },
    { s: 'TM1!', n: 'Freight Route TC2', c: 'freight' as const },
    { s: 'TD81!', n: 'Freight Route TD8', c: 'freight' as const },
    { s: 'TC71!', n: 'Freight Route TC7', c: 'freight' as const },
    { s: 'TC61!', n: 'Freight Route TC6', c: 'freight' as const },
  ];
  const batchSize = 5;
  const out: CommodityData[] = [];
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(async (it) => {
      const data = await scrapeTradingViewSymbol(it.s);
      const list = parseCommoditiesTableHTML(data.data, 'freight');
      // Find best match by symbol prefix
      if (list.length > 0) {
        const m = list[0];
        return { symbol: it.s, name: it.n, price: m.price, category: 'freight' as const, change: m.change, changePercent: m.changePercent };
      }
      return null;
    }));
    results.forEach(r => { if (r.status === 'fulfilled' && r.value) out.push(r.value); });
    if (i + batchSize < symbols.length) await new Promise(res => setTimeout(res, 800));
  }
  return out;
}

function parseBunkerFromHTML(html: string): CommodityData[] {
  const root = parse(html);
  const rows = root.querySelectorAll('tr');
  const items: CommodityData[] = [];
  rows.forEach((row: any) => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 2) return;
    const port = (cells[0]?.text || '').trim();
    const priceCell = (cells[1]?.text || '').trim();
    const price = parseNumberWithSeparators(priceCell);
    if (port && price > 100) {
      items.push({ symbol: `VLSFO_${port.replace(/\s+/g, '_')}`, name: `VLSFO - ${port}`, price, category: 'bunker', change: 0, changePercent: 0 });
    }
  });
  return items.slice(0, 20);
}

async function fetchBunkerData(): Promise<CommodityData[]> {
  const gibraltar = await scrapeShipAndBunkerEMEA().catch(() => null);
  const vlsfo = await scrapeShipAndBunker('vlsfo').catch(() => null);
  const mgo = await scrapeShipAndBunker('mgo').catch(() => null);
  const ifo = await scrapeShipAndBunker('ifo380').catch(() => null);
  const out: CommodityData[] = [];
  if (gibraltar?.data) out.push(...parseBunkerFromHTML(gibraltar.data));
  if (vlsfo?.data) out.push(...parseBunkerFromHTML(vlsfo.data));
  if (mgo?.data) out.push(...parseBunkerFromHTML(mgo.data));
  if (ifo?.data) out.push(...parseBunkerFromHTML(ifo.data));
  return out;
}

const CommodityMarket: React.FC = () => {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [filteredCommodities, setFilteredCommodities] = useState<CommodityData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<'symbol' | 'name' | 'price' | 'changePercent'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'all' | CommodityCategory>('all');

  useEffect(() => {
    loadCommodityData();
    const interval = setInterval(loadCommodityData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSortCommodities();
  }, [commodities, searchTerm, sortField, sortDirection, activeTab]);

  const loadCommodityData = async () => {
    setLoading(true);
    try {
      const [metals, agri, energy] = await Promise.all([
        scrapeTradingViewCategory('metals').then(r => parseCommoditiesTableHTML(r.data, 'metals')),
        scrapeTradingViewCategory('agricultural').then(r => parseCommoditiesTableHTML(r.data, 'agricultural')),
        scrapeTradingViewCategory('energy').then(r => parseCommoditiesTableHTML(r.data, 'energy')),
      ]);
      const [freight, bunker] = await Promise.all([
        fetchFreightData().catch(() => []),
        fetchBunkerData().catch(() => []),
      ]);
      const list = [...metals, ...agri, ...energy, ...freight, ...bunker];
      setCommodities(list);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading commodity data:', error);
      setCommodities([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCommodities = () => {
    let filtered = [...commodities];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(c => c.category === activeTab);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    setFilteredCommodities(filtered);
  };

  const handleSort = (field: 'symbol' | 'name' | 'price' | 'changePercent') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'energy': return '⚡';
      case 'metals': return '🔩';
      case 'agricultural': return '🌾';
      case 'freight': return '🚢';
      case 'bunker': return '⛽';
      default: return '📦';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'energy': return 'Energy';
      case 'metals': return 'Metals';
      case 'agricultural': return 'Agriculture';
      case 'freight': return 'Freight';
      case 'bunker': return 'Bunker';
      default: return 'Others';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'energy': return 'bg-orange-500';
      case 'metals': return 'bg-gray-500';
      case 'agricultural': return 'bg-green-500';
      case 'freight': return 'bg-sky-600';
      case 'bunker': return 'bg-purple-600';
      default: return 'bg-blue-500';
    }
  };

  const getTrendIcon = (changePercent: number) => {
    if (changePercent > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (changePercent < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="inline h-4 w-4" />
      : <ChevronDown className="inline h-4 w-4" />;
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Commodity Market Data
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time commodity prices and market data
            </p>
          </div>
          <Button onClick={loadCommodityData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Market Overview</CardTitle>
              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as CommodityCategory | 'all')}>
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All ({commodities.length})</TabsTrigger>
                  <TabsTrigger value="metals">🔩 Metals ({commodities.filter(c => c.category === 'metals').length})</TabsTrigger>
                  <TabsTrigger value="agricultural">🌾 Agriculture ({commodities.filter(c => c.category === 'agricultural').length})</TabsTrigger>
                  <TabsTrigger value="energy">⚡ Energy ({commodities.filter(c => c.category === 'energy').length})</TabsTrigger>
                  <TabsTrigger value="freight">🚢 Freight ({commodities.filter(c => c.category === 'freight').length})</TabsTrigger>
                  <TabsTrigger value="bunker">⛽ Bunker ({commodities.filter(c => c.category === 'bunker').length})</TabsTrigger>
                </TabsList>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search commodities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <TabsContent value={activeTab} className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => handleSort('symbol')}
                        >
                          Symbol <SortIcon field="symbol" />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => handleSort('name')}
                        >
                          Name <SortIcon field="name" />
                        </TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-accent"
                          onClick={() => handleSort('price')}
                        >
                          Price <SortIcon field="price" />
                        </TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-accent"
                          onClick={() => handleSort('changePercent')}
                        >
                          Change % <SortIcon field="changePercent" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                            Loading commodity data...
                          </TableCell>
                        </TableRow>
                      ) : filteredCommodities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No commodities found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCommodities.map((commodity) => (
                          <TableRow key={commodity.symbol} className="hover:bg-accent/50">
                            <TableCell className="text-center">
                              {getTrendIcon(commodity.changePercent)}
                            </TableCell>
                            <TableCell className="font-mono font-semibold">
                              {commodity.symbol}
                            </TableCell>
                            <TableCell>{commodity.name}</TableCell>
                            <TableCell>
                              <Badge className={`${getCategoryColor(commodity.category)} text-white`}>
                                {getCategoryIcon(commodity.category)} {getCategoryLabel(commodity.category)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${commodity.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={commodity.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {commodity.change >= 0 ? '+' : ''}{commodity.change.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={`font-semibold ${
                                commodity.changePercent > 0.1 ? 'text-green-600' :
                                commodity.changePercent < -0.1 ? 'text-red-600' :
                                'text-gray-500'
                              }`}>
                                {commodity.changePercent >= 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['metals','agricultural','energy','freight','bunker'] as CommodityCategory[]).map((category) => {
            const categoryCommodities = commodities.filter(c => c.category === category);
            const avgChange = categoryCommodities.length > 0
              ? categoryCommodities.reduce((sum, c) => sum + c.changePercent, 0) / categoryCommodities.length
              : 0;

            return (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    {getCategoryLabel(category)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <span className={avgChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
                    </span>
                    {getTrendIcon(avgChange)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average change ({categoryCommodities.length} commodities)
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default CommodityMarket;

