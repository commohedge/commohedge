import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TradingViewAdvancedChart from "@/components/TradingViewAdvancedChart";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdvancedChart() {
  const [symbol, setSymbol] = useState("TVC:GOLD");
  const [interval, setInterval] = useState("D");
  const [height, setHeight] = useState(600);

  return (
    <Layout
      title="Advanced Chart"
      breadcrumbs={[
        { label: "Commodity Market", href: "/commodity-market" },
        { label: "Advanced Chart" }
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Advanced Chart
          </h1>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl font-bold text-primary">Trading Chart</CardTitle>
            <CardDescription>
              Real-time chart with technical indicators, drawing tools, and market analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Configuration Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="TVC:GOLD"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: EXCHANGE:SYMBOL (e.g., TVC:GOLD, NYMEX:CL1!)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Interval</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="D">Daily</SelectItem>
                    <SelectItem value="W">Weekly</SelectItem>
                    <SelectItem value="M">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Chart Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 600)}
                  min={400}
                  max={1000}
                  step={50}
                />
              </div>
            </div>

            {/* Chart Widget */}
            <div className="w-full overflow-hidden" style={{ height: `${height}px` }}>
              <TradingViewAdvancedChart 
                symbol={symbol}
                interval={interval}
                height={height}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

