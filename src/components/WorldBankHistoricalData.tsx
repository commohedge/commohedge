import { useState, useMemo } from 'react';
import { WorldBankCommodity } from '@/services/worldBankApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from 'lucide-react';

interface WorldBankHistoricalDataProps {
  commodities: WorldBankCommodity[];
  loading: boolean;
}

type SortField = 'date' | 'value' | 'change';
type SortDirection = 'asc' | 'desc';

export default function WorldBankHistoricalData({ commodities, loading }: WorldBankHistoricalDataProps) {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showChange, setShowChange] = useState(true);

  // Obtenir la commodité sélectionnée
  const selectedCommodityData = useMemo(() => {
    if (!selectedCommodity) return null;
    return commodities.find(c => c.id === selectedCommodity);
  }, [selectedCommodity, commodities]);

  // Calculer les données historiques avec changements
  const historicalData = useMemo(() => {
    if (!selectedCommodityData) return [];

    const data = selectedCommodityData.data.map((point, index) => {
      const previousPoint = index > 0 ? selectedCommodityData.data[index - 1] : null;
      const change = previousPoint ? point.value - previousPoint.value : 0;
      const changePercent = previousPoint && previousPoint.value !== 0 
        ? (change / previousPoint.value) * 100 
        : 0;

      return {
        ...point,
        change,
        changePercent,
        isFirst: index === 0
      };
    });

    return data;
  }, [selectedCommodityData]);

  // Trier les données
  const sortedData = useMemo(() => {
    return [...historicalData].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [historicalData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatValue = (value: number) => {
    return value.toFixed(2);
  };

  const formatChange = (change: number, changePercent: number, isFirst: boolean) => {
    if (isFirst) return 'N/A';
    
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}`}>
        {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
        <span>
          {change > 0 ? '+' : ''}{change.toFixed(2)} ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      </div>
    );
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (historicalData.length === 0) return null;

    const values = historicalData.map(d => d.value);
    const changes = historicalData.filter(d => !d.isFirst).map(d => d.change);
    
    return {
      totalDataPoints: historicalData.length,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      avgValue: values.reduce((sum, val) => sum + val, 0) / values.length,
      totalChange: values[values.length - 1] - values[0],
      avgChange: changes.length > 0 ? changes.reduce((sum, val) => sum + val, 0) / changes.length : 0,
      positiveChanges: changes.filter(c => c > 0).length,
      negativeChanges: changes.filter(c => c < 0).length
    };
  }, [historicalData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Data Analysis</CardTitle>
          <CardDescription>Loading historical data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commodities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Data Analysis</CardTitle>
          <CardDescription>No commodity data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No commodities found. Please import World Bank Pink Sheet data.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Data Analysis</CardTitle>
        <CardDescription>
          Detailed historical data and trends for selected commodities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Commodity Selection */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Commodity:</label>
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select commodity" />
              </SelectTrigger>
              <SelectContent>
                {commodities.map((commodity) => (
                  <SelectItem key={commodity.id} value={commodity.id}>
                    {commodity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={showChange ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowChange(!showChange)}
          >
            <BarChart3 size={16} className="mr-1" />
            {showChange ? 'Hide Changes' : 'Show Changes'}
          </Button>
        </div>

        {selectedCommodityData ? (
          <div className="space-y-4">
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalDataPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">Data Points</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.maxValue.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Value</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.minValue.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Min Value</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.avgValue.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average</div>
                </div>
              </div>
            )}

            {/* Historical Data Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Date
                        {sortField === 'date' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('value')}
                    >
                      Value ({selectedCommodityData.unit})
                      {sortField === 'value' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    {showChange && (
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('change')}
                      >
                        Change
                        {sortField === 'change' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((point, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {point.date}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatValue(point.value)}
                      </TableCell>
                      {showChange && (
                        <TableCell>
                          {formatChange(point.change, point.changePercent, point.isFirst)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            {stats && (
              <div className="text-sm text-muted-foreground">
                <p>
                  Showing {historicalData.length} data points from {historicalData[0]?.date} to {historicalData[historicalData.length - 1]?.date}
                </p>
                <p>
                  Total change: {stats.totalChange > 0 ? '+' : ''}{stats.totalChange.toFixed(2)} ({stats.totalChange > 0 ? '+' : ''}{((stats.totalChange / stats.minValue) * 100).toFixed(2)}%)
                </p>
                <p>
                  Positive periods: {stats.positiveChanges} | Negative periods: {stats.negativeChanges}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Please select a commodity to view its historical data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
