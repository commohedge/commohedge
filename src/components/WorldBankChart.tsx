import { useState, useMemo } from 'react';
import { WorldBankCommodity } from '@/services/worldBankApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart3, LineChart } from 'lucide-react';

interface WorldBankChartProps {
  commodities: WorldBankCommodity[];
  loading: boolean;
}

type ChartType = 'line' | 'bar';
type TimeRange = '1Y' | '2Y' | '5Y' | 'ALL';

export default function WorldBankChart({ commodities, loading }: WorldBankChartProps) {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  // Filtrer les données selon la période sélectionnée
  const filteredData = useMemo(() => {
    if (!selectedCommodity) return [];

    const commodity = commodities.find(c => c.id === selectedCommodity);
    if (!commodity) return [];

    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case '1Y':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '2Y':
        cutoffDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
        break;
      case '5Y':
        cutoffDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        break;
      default:
        return commodity.data;
    }

    return commodity.data.filter(point => {
      const pointDate = new Date(point.date);
      return pointDate >= cutoffDate;
    });
  }, [selectedCommodity, commodities, timeRange]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const values = filteredData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const totalChange = lastValue - firstValue;
    const totalChangePercent = firstValue !== 0 ? (totalChange / firstValue) * 100 : 0;

    return {
      min,
      max,
      avg,
      totalChange,
      totalChangePercent,
      firstValue,
      lastValue
    };
  }, [filteredData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commodity Price Chart</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (commodities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commodity Price Chart</CardTitle>
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
        <CardTitle>Commodity Price Chart</CardTitle>
        <CardDescription>
          Interactive chart showing commodity price trends over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Commodity:</label>
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-[200px]">
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

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time Range:</label>
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1Y">1 Year</SelectItem>
                <SelectItem value="2Y">2 Years</SelectItem>
                <SelectItem value="5Y">5 Years</SelectItem>
                <SelectItem value="ALL">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChart size={16} className="mr-1" />
              Line
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 size={16} className="mr-1" />
              Bar
            </Button>
          </div>
        </div>

        {/* Chart Area */}
        {selectedCommodity && filteredData.length > 0 ? (
          <div className="space-y-4">
            {/* Simple Chart Visualization */}
            <div className="h-[400px] border rounded-lg p-4 bg-muted/20">
              <div className="h-full flex items-end justify-between gap-1">
                {filteredData.map((point, index) => {
                  const maxValue = Math.max(...filteredData.map(d => d.value));
                  const minValue = Math.min(...filteredData.map(d => d.value));
                  const height = ((point.value - minValue) / (maxValue - minValue)) * 100;
                  
                  return (
                    <div
                      key={index}
                      className={`flex-1 bg-blue-500 rounded-t ${
                        chartType === 'bar' ? 'min-w-[4px]' : 'w-[2px]'
                      }`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${point.date}: ${point.value.toFixed(2)}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.lastValue.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Value</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold ${stats.totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.totalChange >= 0 ? '+' : ''}{stats.totalChange.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Change</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className={`text-2xl font-bold ${stats.totalChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.totalChangePercent >= 0 ? '+' : ''}{stats.totalChangePercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Change %</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.avg.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average</div>
                </div>
              </div>
            )}

            {/* Data Points */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} data points from {filteredData[0]?.date} to {filteredData[filteredData.length - 1]?.date}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {!selectedCommodity 
              ? 'Please select a commodity to view its price chart'
              : 'No data available for the selected time range'
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
