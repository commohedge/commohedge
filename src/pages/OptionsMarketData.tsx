import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Globe, Activity, RefreshCw } from 'lucide-react';

const OptionsMarketData: React.FC = () => {
  return (
    <Layout 
      title="Options Market Data" 
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Options Market Data" }
      ]}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Options Market Data</h1>
              <p className="text-muted-foreground">
                Real-time options market data and analytics powered by Sentryd
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Activity className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
            <Badge variant="outline">
              <Globe className="h-3 w-3 mr-1" />
              Global Markets
            </Badge>
          </div>
        </div>

        {/* Widget Container */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Options Market Dashboard
                </CardTitle>
                <CardDescription>
                  Comprehensive options market data with real-time pricing, volatility surfaces, and risk metrics
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Auto-refresh
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-900 rounded-b-lg overflow-hidden">
              <iframe 
                width="100%" 
                height="100%" 
                src="//widget2.sentryd.com/widget/#/9aebc539-0d14-4c11-bab0-19363c87996e"
                title="Options Market Data Widget"
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Data Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Global</div>
              <p className="text-xs text-muted-foreground mt-1">
                Major exchanges and OTC markets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Update Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Real-time</div>
              <p className="text-xs text-muted-foreground mt-1">
                Live market data feeds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Asset Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Forex</div>
              <p className="text-xs text-muted-foreground mt-1">
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              Advanced options market data and analytics capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Real-time Pricing</h4>
                    <p className="text-sm text-muted-foreground">
                      Live option prices with bid/ask spreads and volume data
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                    <Activity className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Volatility Surfaces</h4>
                    <p className="text-sm text-muted-foreground">
                      Implied volatility surfaces across strikes and maturities
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <Globe className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Global Markets</h4>
                    <p className="text-sm text-muted-foreground">
                      Coverage of major exchanges and OTC markets worldwide
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                    <RefreshCw className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Risk Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      Greeks, VaR, and other risk metrics for options portfolios
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OptionsMarketData;
