import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./hooks/ThemeProvider";
import { useSmoothScroll, useMomentumScroll } from "./hooks/useSmoothScroll";
import { useZoom } from "./hooks/useZoom";
import { useAutoSync } from "./hooks/useAutoSync";
import LocalStorageWatcher from "./services/LocalStorageWatcher";
import "./utils/testSupabaseIntegration";
import "./utils/initSupabaseTables";
import "./utils/testSupabaseFinal";
import "./utils/testSignUp";
import "./utils/cleanupLocalStorage";

// Pages are code-split per route so public SEO pages (landing, blog, solutions)
// do not download the whole terminal bundle.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Exposures = lazy(() => import("./pages/Exposures"));
const HedgingInstruments = lazy(() => import("./pages/HedgingInstruments"));
const HedgingInstrumentDetail = lazy(() => import("./pages/HedgingInstrumentDetail"));
const RiskAnalysis = lazy(() => import("./pages/RiskAnalysis"));
const PositionMonitor = lazy(() => import("./pages/PositionMonitor"));
const StrategyBuilder = lazy(() => import("./pages/StrategyBuilder"));
const Pricers = lazy(() => import("./pages/Pricers"));
const Reports = lazy(() => import("./pages/Reports"));
const CommodityMarket = lazy(() => import("./pages/CommodityMarket"));
const MarketNews = lazy(() => import("./pages/MarketNews"));
const EconomicCalendar = lazy(() => import("./pages/EconomicCalendar"));
const AdvancedChart = lazy(() => import("./pages/AdvancedChart"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const DatabaseSync = lazy(() => import("./pages/DatabaseSync"));
const RegressionAnalysis = lazy(() => import("./pages/RegressionAnalysis"));
const RateExplorer = lazy(() => import("./pages/RateExplorer"));
const HedgeHelper = lazy(() => import("./pages/HedgeHelper"));
const TickerPeekPro = lazy(() => import("./pages/TickerPeekPro"));
const IntelWorkspace = lazy(() => import("./pages/IntelWorkspace"));
const IntelPanelPage = lazy(() => import("./pages/IntelPanelPage"));
const WorldMap = lazy(() => import("./pages/WorldMap"));
const CommodityNews = lazy(() => import("./pages/CommodityNews"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const RequestAccess = lazy(() => import("./pages/RequestAccess"));
const SolutionPage = lazy(() => import("./pages/SolutionPage"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const CommodityPrices = lazy(() => import("./pages/CommodityPrices"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const SupabaseLogin = lazy(() => import("./pages/SupabaseLogin"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
import ProtectedRoute from "./components/ProtectedRoute";
import { SeoManager } from "./components/SeoManager";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { VercelAnalyticsGate } from "./components/VercelAnalyticsGate";

// Theme toggle component
import { ThemeToggle } from "./components/ui/theme-toggle";

const queryClient = new QueryClient();

/** Neutral dark placeholder while a route chunk loads (matches landing/terminal background). */
function RouteFallback() {
  return <div className="min-h-screen bg-[#0c1322]" aria-busy="true" />;
}

function ThemeToggleDock() {
  const location = useLocation();
  if (location.pathname === "/") return null;
  return (
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );
}

const App = () => {
  // Initialiser les hooks de scroll fluide
  useSmoothScroll();
  useMomentumScroll();
  
  // Initialiser le zoom
  useZoom();
  
  // Initialiser la synchronisation automatique
  useAutoSync();
  
  // Initialiser la surveillance du localStorage
  LocalStorageWatcher.getInstance();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router>
          <SeoManager />
          <ThemeToggleDock />
          <CookieConsentBanner />
          <VercelAnalyticsGate />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Landing Page - Page par défaut */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/request-access" element={<RequestAccess />} />
            <Route path="/solutions/:slug" element={<SolutionPage />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/commodity-pricers" element={<CommodityPrices />} />
            <Route path="/commodity-prices" element={<Navigate to="/commodity-pricers" replace />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            
            {/* Authentication */}
            <Route path="/login" element={<SupabaseLogin />} />
            <Route path="/supabase-login" element={<SupabaseLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Commodity Risk Management Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/exposures" element={<ProtectedRoute><Exposures /></ProtectedRoute>} />
            <Route path="/hedging" element={<ProtectedRoute><HedgingInstruments /></ProtectedRoute>} />
            <Route path="/hedging/instrument/:instrumentId" element={<ProtectedRoute><HedgingInstrumentDetail /></ProtectedRoute>} />
            <Route path="/risk-analysis" element={<ProtectedRoute><RiskAnalysis /></ProtectedRoute>} />
            
            {/* Strategy Builder and Advanced Features */}
            <Route path="/strategy-builder" element={<ProtectedRoute><StrategyBuilder /></ProtectedRoute>} />
            <Route path="/pricers" element={<ProtectedRoute><Pricers /></ProtectedRoute>} />
            <Route path="/positions" element={<ProtectedRoute><PositionMonitor /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/commodity-market" element={<ProtectedRoute><CommodityMarket /></ProtectedRoute>} />
            <Route path="/intel-workspace" element={<ProtectedRoute><IntelWorkspace /></ProtectedRoute>} />
            <Route path="/intel-workspace/panel/:panelId" element={<ProtectedRoute><IntelPanelPage /></ProtectedRoute>} />
            <Route path="/world-map" element={<ProtectedRoute><WorldMap /></ProtectedRoute>} />
            <Route path="/commodity-news" element={<ProtectedRoute><CommodityNews /></ProtectedRoute>} />
            <Route path="/market-news" element={<ProtectedRoute><MarketNews /></ProtectedRoute>} />
            <Route path="/economic-calendar" element={<ProtectedRoute><EconomicCalendar /></ProtectedRoute>} />
            <Route path="/advanced-chart" element={<ProtectedRoute><AdvancedChart /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/database-sync" element={<ProtectedRoute><DatabaseSync /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/regression-analysis" element={<ProtectedRoute><RegressionAnalysis /></ProtectedRoute>} />
            <Route path="/rate-explorer" element={<ProtectedRoute><RateExplorer /></ProtectedRoute>} />
            <Route path="/hedge-helper" element={<ProtectedRoute><HedgeHelper /></ProtectedRoute>} />
            <Route path="/ticker-peek-pro" element={<ProtectedRoute><TickerPeekPro /></ProtectedRoute>} />
            
            {/* Legacy routes - redirect /saved to /reports */}
            <Route path="/saved" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
