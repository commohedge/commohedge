import React, { Suspense } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { performEmergencyRecovery, validateAndRepairLocalStorage } from "@/utils/emergencyRecovery";

// Lazy load the Index component to prevent blocking
const Index = React.lazy(() => import("./Index"));

// Error boundary component
class StrategyBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Strategy Builder Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Erreur de chargement
            </CardTitle>
            <CardDescription>
              Une erreur s'est produite lors du chargement du Strategy Builder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {this.state.error?.message || "Erreur inconnue lors du chargement du composant"}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  // Validate and repair localStorage
                  validateAndRepairLocalStorage();
                }}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
              <Button 
                onClick={() => {
                  performEmergencyRecovery({ clearCalculatorState: true });
                }}
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Nettoyer les données
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="default"
              >
                Recharger la page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Loading component
const StrategyBuilderLoading = () => (
  <Card className="w-full">
    <CardContent className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Chargement du Strategy Builder</h3>
          <p className="text-muted-foreground">
            Initialisation des composants et des données...
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const StrategyBuilder = () => {
  // Validate localStorage on component mount
  React.useEffect(() => {
    const isValid = validateAndRepairLocalStorage();
    if (!isValid) {
      console.log('🔧 Repaired corrupted localStorage data');
    }
  }, []);

  return (
    <Layout 
      title="Strategy Builder"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Strategy Builder" }
      ]}
    >
      <StrategyBuilderErrorBoundary>
        <Suspense fallback={<StrategyBuilderLoading />}>
          <Index />
        </Suspense>
      </StrategyBuilderErrorBoundary>
    </Layout>
  );
};

export default StrategyBuilder; 