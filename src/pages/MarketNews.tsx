import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TradingViewWidget from "@/components/TradingViewWidget";
import { Newspaper } from "lucide-react";

export default function MarketNews() {
  return (
    <Layout
      title="Market News"
      breadcrumbs={[
        { label: "Commodity Market", href: "/commodity-market" },
        { label: "Market News" }
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-8 w-8 text-primary" />
            Market News
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay informed with the latest commodity market news and insights from TradingView
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl font-bold text-primary">Commodity Market News</CardTitle>
            <CardDescription>
              Real-time news feed covering energy, metals, agriculture, and other commodity markets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 w-full overflow-hidden">
            <TradingViewWidget />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

