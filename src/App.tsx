import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/ThemeProvider";
import { useSmoothScroll, useMomentumScroll } from "./hooks/useSmoothScroll";
import { useZoom } from "./hooks/useZoom";
import { useAutoSync } from "./hooks/useAutoSync";
import LocalStorageWatcher from "./services/LocalStorageWatcher";

// Import pages
import Dashboard from "./pages/Dashboard";
import Exposures from "./pages/Exposures";
import HedgingInstruments from "./pages/HedgingInstruments";
import RiskAnalysis from "./pages/RiskAnalysis";
import PositionMonitor from "./pages/PositionMonitor";
import Index from "./pages/Index";
import StrategyBuilder from "./pages/StrategyBuilder";
import Pricers from "./pages/Pricers";
import Reports from "./pages/Reports";
import ForexMarket from "./pages/ForexMarket";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import DatabaseSync from "./pages/DatabaseSync";
import SavedScenarios from "./pages/SavedScenarios";
import RegressionAnalysis from "./pages/RegressionAnalysis";
import OptionsMarketData from "./pages/OptionsMarketData";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserProfile from "./pages/UserProfile";
import ConfirmEmail from "./pages/ConfirmEmail";
import EmailConfirmationPending from "./pages/EmailConfirmationPending";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLocation } from "react-router-dom";

// Theme toggle component
import { ThemeToggle } from "./components/ui/theme-toggle";

const queryClient = new QueryClient();

// Wrapper pour EmailConfirmationPending
const EmailConfirmationPendingWrapper = () => {
  const location = useLocation();
  const email = location.state?.email || '';
  
  if (!email) {
    // Rediriger vers la page d'inscription si pas d'email
    window.location.href = '/signup';
    return null;
  }
  
  return <EmailConfirmationPending email={email} />;
};

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
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <Router>
          <Routes>
            {/* Landing Page - Page par défaut */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/email-confirmation-pending" element={<EmailConfirmationPendingWrapper />} />
            
            {/* FX Risk Management Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/exposures" element={<ProtectedRoute><Exposures /></ProtectedRoute>} />
            <Route path="/hedging" element={<ProtectedRoute><HedgingInstruments /></ProtectedRoute>} />
            <Route path="/risk-analysis" element={<ProtectedRoute><RiskAnalysis /></ProtectedRoute>} />
            
            {/* Strategy Builder and Advanced Features */}
            <Route path="/strategy-builder" element={<ProtectedRoute><StrategyBuilder /></ProtectedRoute>} />
            <Route path="/pricers" element={<ProtectedRoute><Pricers /></ProtectedRoute>} />
            <Route path="/positions" element={<ProtectedRoute><PositionMonitor /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/forex-market" element={<ProtectedRoute><ForexMarket /></ProtectedRoute>} />
            <Route path="/options-market-data" element={<ProtectedRoute><OptionsMarketData /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/database-sync" element={<ProtectedRoute><DatabaseSync /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/regression-analysis" element={<ProtectedRoute><RegressionAnalysis /></ProtectedRoute>} />
            
            {/* Legacy routes */}
            <Route path="/saved" element={<ProtectedRoute><SavedScenarios /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
