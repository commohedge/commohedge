import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  Zap,
  AlertTriangle
} from "lucide-react";

const PositionMonitor = () => {
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Sample real-time commodity position data
  const [positions, setPositions] = useState([
    {
      id: "POS-001",
      commodity: "WTI",
      position: 1000, // barrels
      marketPrice: 75.50,
      entryPrice: 74.20,
      unrealizedPnL: 13000,
      dailyPnL: 2500,
      exposure: "Long",
      hedge_status: "Partial",
      hedge_ratio: 70,
      last_trade: "10:34:22",
      unit: "BBL"
    },
    {
      id: "POS-002",
      commodity: "GOLD",
      position: -500, // ounces
      marketPrice: 2045.30,
      entryPrice: 2050.80,
      unrealizedPnL: 2750,
      dailyPnL: -1200,
      exposure: "Short",
      hedge_status: "Full",
      hedge_ratio: 100,
      last_trade: "10:33:45",
      unit: "OZ"
    },
    {
      id: "POS-003",
      commodity: "CORN",
      position: 2000, // bushels
      marketPrice: 4.85,
      entryPrice: 4.75,
      unrealizedPnL: 200,
      dailyPnL: 150,
      exposure: "Long",
      hedge_status: "None",
      hedge_ratio: 0,
      last_trade: "10:32:18",
      unit: "BU"
    },
    {
      id: "POS-004",
      commodity: "NATGAS",
      position: -10000, // MMBtu
      marketPrice: 2.45,
      entryPrice: 2.52,
      unrealizedPnL: 7000,
      dailyPnL: 1200,
      exposure: "Short",
      hedge_status: "Partial",
      hedge_ratio: 60,
      last_trade: "10:31:30",
      unit: "MMBtu"
    }
  ]);

  // Sample commodity market data for charts
  const marketData = [
    { time: "10:00", wti: 74.20, gold: 2050.80, corn: 4.75, natgas: 2.52 },
    { time: "10:15", wti: 74.85, gold: 2048.50, corn: 4.80, natgas: 2.48 },
    { time: "10:30", wti: 75.50, gold: 2045.30, corn: 4.85, natgas: 2.45 },
  ];

  // Simulate real-time updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setPositions(prevPositions =>
        prevPositions.map(pos => ({
          ...pos,
          marketPrice: pos.marketPrice + (Math.random() - 0.5) * 0.1,
          unrealizedPnL: pos.unrealizedPnL + (Math.random() - 0.5) * 1000,
          dailyPnL: pos.dailyPnL + (Math.random() - 0.5) * 500,
          last_trade: new Date().toLocaleTimeString()
        }))
      );
      setLastUpdate(new Date());
    }, parseInt(refreshInterval) * 1000);

    return () => clearInterval(interval);
  }, [isLiveMode, refreshInterval]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPrice = (price: number, commodity: string) => {
    if (commodity === "GOLD") {
      return price.toFixed(2);
    } else if (commodity === "CORN") {
      return price.toFixed(2);
    } else if (commodity === "NATGAS") {
      return price.toFixed(2);
    }
    return price.toFixed(2);
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getHedgeStatusBadge = (status: string) => {
    switch (status) {
      case "Full":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Full</Badge>;
      case "Partial":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
      case "None":
        return <Badge variant="destructive">None</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExposureIcon = (exposure: string) => {
    return exposure === "Long" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalDailyPnL = positions.reduce((sum, pos) => sum + pos.dailyPnL, 0);
  const totalPositions = positions.length;
  const fullyHedgedCount = positions.filter(pos => pos.hedge_status === "Full").length;

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Position Monitor" }
      ]}
    >
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Position Monitor
              </CardTitle>
              <CardDescription>
                Live monitoring of commodity positions and market movements
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="live-mode"
                  checked={isLiveMode}
                  onCheckedChange={setIsLiveMode}
                />
                <Label htmlFor="live-mode" className="flex items-center gap-2">
                  {isLiveMode ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  Live Mode
                </Label>
              </div>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 sec</SelectItem>
                  <SelectItem value="5">5 sec</SelectItem>
                  <SelectItem value="10">10 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-muted-foreground">
                  {isLiveMode ? 'Live' : 'Paused'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Last Update: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Market Hours: 24/7 (Commodity Markets)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalUnrealizedPnL)}`}>
              {formatCurrency(totalUnrealizedPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(totalDailyPnL)}`}>
              {formatCurrency(totalDailyPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              Open positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hedge Coverage</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullyHedgedCount}/{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              Fully hedged
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Position Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Positions</CardTitle>
            <CardDescription>Real-time position updates and P&L</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Market Price</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Unrealized P&L</TableHead>
                  <TableHead>Daily P&L</TableHead>
                  <TableHead>Hedge Status</TableHead>
                  <TableHead>Last Trade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {position.commodity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getExposureIcon(position.exposure)}
                        <span className="font-mono">
                          {Math.abs(position.position).toLocaleString()} {position.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      ${formatPrice(position.marketPrice, position.commodity)}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${formatPrice(position.entryPrice, position.commodity)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${getPnLColor(position.unrealizedPnL)}`}>
                        {formatCurrency(position.unrealizedPnL)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${getPnLColor(position.dailyPnL)}`}>
                        {formatCurrency(position.dailyPnL)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getHedgeStatusBadge(position.hedge_status)}
                        <span className="text-sm text-muted-foreground">
                          {position.hedge_ratio}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {position.last_trade}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Market Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Market Movements</CardTitle>
          <CardDescription>Real-time commodity price movements</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="wti" stroke="#8884d8" strokeWidth={2} name="WTI Crude" />
              <Line type="monotone" dataKey="gold" stroke="#ffd700" strokeWidth={2} name="Gold" />
              <Line type="monotone" dataKey="corn" stroke="#82ca9d" strokeWidth={2} name="Corn" />
              <Line type="monotone" dataKey="natgas" stroke="#ffc658" strokeWidth={2} name="Natural Gas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Active Alerts
          </CardTitle>
          <CardDescription>Real-time position and market alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Position Limit Warning</p>
                <p className="text-xs text-muted-foreground">WTI position approaching daily limit (85% utilized)</p>
              </div>
              <Badge variant="outline" className="text-xs">
                10:34:22
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Hedge Effectiveness Alert</p>
                <p className="text-xs text-muted-foreground">GOLD hedge effectiveness below 80% threshold</p>
              </div>
              <Badge variant="outline" className="text-xs">
                10:32:15
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PositionMonitor; 