import { useState } from 'react';
import { WorldBankCommodity } from '@/services/worldBankApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WorldBankTableProps {
  commodities: WorldBankCommodity[];
  loading: boolean;
}

export default function WorldBankTable({ commodities, loading }: WorldBankTableProps) {
  const [sortField, setSortField] = useState<keyof WorldBankCommodity>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof WorldBankCommodity) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCommodities = [...commodities].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'currentValue' || sortField === 'change' || sortField === 'changePercent') {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatValue = (value: number | undefined, unit: string = '') => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`;
  };

  const formatChange = (change: number | undefined, changePercent: number | undefined) => {
    if (change === undefined || changePercent === undefined) return 'N/A';
    
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>World Bank Commodity Data</CardTitle>
          <CardDescription>Loading commodity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commodities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>World Bank Commodity Data</CardTitle>
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
        <CardTitle>World Bank Commodity Data</CardTitle>
        <CardDescription>
          {commodities.length} commodities from World Bank Pink Sheet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Commodity
                  {sortField === 'name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('category')}
                >
                  Category
                  {sortField === 'category' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('currentValue')}
                >
                  Current Value
                  {sortField === 'currentValue' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('change')}
                >
                  Change
                  {sortField === 'change' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Data Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCommodities.map((commodity) => (
                <TableRow key={commodity.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{commodity.name}</div>
                      <div className="text-sm text-muted-foreground">{commodity.symbol}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {commodity.category}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatValue(commodity.currentValue, commodity.unit)}
                  </TableCell>
                  <TableCell>
                    {formatChange(commodity.change, commodity.changePercent)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {commodity.unit}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {commodity.data.length} points
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
