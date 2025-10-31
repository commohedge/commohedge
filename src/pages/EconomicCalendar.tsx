import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TradingViewEconomicCalendar from "@/components/TradingViewEconomicCalendar";
import { Calendar } from "lucide-react";

export default function EconomicCalendar() {
  return (
    <Layout
      title="Economic Calendar"
      breadcrumbs={[
        { label: "Commodity Market", href: "/commodity-market" },
        { label: "Economic Calendar" }
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Economic Calendar
          </h1>
          <p className="text-muted-foreground mt-2">
            Track important economic events and indicators that impact commodity markets
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl font-bold text-primary">Global Economic Calendar</CardTitle>
            <CardDescription>
              Real-time economic events, indicators, and announcements from major economies worldwide
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 w-full overflow-hidden">
            <TradingViewEconomicCalendar />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

