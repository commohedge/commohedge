import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl font-bold text-primary">Market News</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 w-full overflow-hidden">
            <TradingViewWidget />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

