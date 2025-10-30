import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft, 
  RefreshCw, 
  BarChart3, 
  Shield, 
  TrendingUp, 
  Calendar, 
  FileText, 
  Plus,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { SavedScenario } from '../types/Scenario';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import ScenariosPdfExport from '../components/ScenariosPdfExport';

// Add this interface for yearly results
interface YearlyResult {
  hedgedCost: number;
  unhedgedCost: number;
  deltaPnL: number;
  strategyPremium: number;
  volume: number;
}

// Ajouter la fonction generateCommodityHedgingData depuis PayoffChart.tsx
const generateCommodityHedgingData = (strategy: any[], spot: number, includePremium: boolean = false) => {
  const data = [];
  const minSpot = spot * 0.7;  // -30% du spot
  const maxSpot = spot * 1.3;  // +30% du spot
  const step = (maxSpot - minSpot) / 100; // 100 points

  for (let currentSpot = minSpot; currentSpot <= maxSpot; currentSpot += step) {
    const unhedgedPrice = currentSpot;
    let hedgedPrice = currentSpot;
    let totalPremium = 0;

    // Process each option in the strategy
    strategy.forEach(option => {
      const strike = option.strikeType === 'percent' 
        ? spot * (option.strike / 100) 
        : option.strike;
      
      // Utilise la quantité avec son signe (+ pour achat, - pour vente)
      const quantity = option.quantity / 100;
      
      // Calculate option premium (simplified)
      const premium = 0.01 * Math.abs(quantity); // Prime simplifiée, toujours positive
      
      if (option.type === 'put') {
        // PUT: La logique change selon achat ou vente
        if (currentSpot < strike) {
          // Dans la monnaie
          if (quantity > 0) {
            // ACHAT PUT: Protection contre la baisse
            hedgedPrice = currentSpot - ((strike - currentSpot) * Math.abs(quantity));
          } else if (quantity < 0) {
            // VENTE PUT: Obligation d'achat à un prix élevé
            hedgedPrice = currentSpot + ((strike - currentSpot) * Math.abs(quantity));
          }
        }
        // Hors de la monnaie: pas d'effet sur le prix (sauf prime)
      } 
      else if (option.type === 'call') {
        // CALL: La logique change selon achat ou vente
        if (currentSpot > strike) {
          // Dans la monnaie
          if (quantity > 0) {
            // ACHAT CALL: Protection contre la hausse
            hedgedPrice = currentSpot - ((currentSpot - strike) * Math.abs(quantity));
          } else if (quantity < 0) {
            // VENTE CALL: Obligation de vente à un prix bas
            hedgedPrice = currentSpot + ((currentSpot - strike) * Math.abs(quantity));
          }
        }
        // Hors de la monnaie: pas d'effet sur le prix (sauf prime)
      }
      else if (option.type === 'forward') {
        // FORWARD: Prix fixe peu importe le spot
        hedgedPrice = strike * Math.abs(quantity) + currentSpot * (1 - Math.abs(quantity));
      }
      else if (option.type === 'swap') {
        // SWAP: Échange à prix fixe
        hedgedPrice = strike;
      }
      
      // Barrier options (simplified logic)
      else if (option.type.includes('knockout') || option.type.includes('knockin')) {
        const barrier = option.barrierType === 'percent' 
          ? spot * (option.barrier / 100) 
          : option.barrier;
        
        let isBarrierBroken = false;
        
        if (option.type.includes('knockout')) {
          if (option.type.includes('call')) {
            isBarrierBroken = currentSpot >= barrier;
          } else if (option.type.includes('put')) {
            isBarrierBroken = currentSpot <= barrier;
          }
        } else if (option.type.includes('knockin')) {
          if (option.type.includes('call')) {
            isBarrierBroken = currentSpot >= barrier;
          } else if (option.type.includes('put')) {
            isBarrierBroken = currentSpot <= barrier;
          }
        }
        
        if (option.type.includes('knockout')) {
          // Option knocked out = pas de protection
          if (!isBarrierBroken) {
            if (option.type.includes('call') && currentSpot > strike) {
              if (quantity > 0) {
                hedgedPrice = currentSpot - ((currentSpot - strike) * Math.abs(quantity));
              } else if (quantity < 0) {
                hedgedPrice = currentSpot + ((currentSpot - strike) * Math.abs(quantity));
              }
            } else if (option.type.includes('put') && currentSpot < strike) {
              if (quantity > 0) {
                hedgedPrice = currentSpot - ((strike - currentSpot) * Math.abs(quantity));
              } else if (quantity < 0) {
                hedgedPrice = currentSpot + ((strike - currentSpot) * Math.abs(quantity));
              }
            }
          }
        } else { // knockin
          // Option knocked in = protection active
          if (isBarrierBroken) {
            if (option.type.includes('call') && currentSpot > strike) {
              if (quantity > 0) {
                hedgedPrice = currentSpot - ((currentSpot - strike) * Math.abs(quantity));
              } else if (quantity < 0) {
                hedgedPrice = currentSpot + ((currentSpot - strike) * Math.abs(quantity));
              }
            } else if (option.type.includes('put') && currentSpot < strike) {
              if (quantity > 0) {
                hedgedPrice = currentSpot - ((strike - currentSpot) * Math.abs(quantity));
              } else if (quantity < 0) {
                hedgedPrice = currentSpot + ((strike - currentSpot) * Math.abs(quantity));
              }
            }
          }
        }
      }
      
      // Ajuster pour la prime avec le signe correct selon achat/vente
      if (quantity > 0) {
        // Pour les achats d'options, on paie la prime (coût négatif)
        totalPremium += premium;
      } else if (quantity < 0) {
        // Pour les ventes d'options, on reçoit la prime (gain positif)
        totalPremium -= premium;
      }
    });

    // Ajuster pour la prime si incluse
    if (includePremium && strategy.length > 0) {
      hedgedPrice -= totalPremium;
    }

    data.push({
      spot: parseFloat(currentSpot.toFixed(4)),
      unhedgedPrice: parseFloat(unhedgedPrice.toFixed(4)),
      hedgedPrice: parseFloat(hedgedPrice.toFixed(4))
    });
  }

  return data;
};

// Custom tooltip for commodity hedging profile
const CustomCommodityTooltip = ({ 
  active, 
  payload, 
  label, 
  commodity
}: any) => {
  
  if (active && payload && payload.length) {
    const hedgedValue = payload.find((p: any) => p.dataKey === 'hedgedPrice')?.value;
    const unhedgedValue = payload.find((p: any) => p.dataKey === 'unhedgedPrice')?.value;
    const protection = hedgedValue && unhedgedValue ? (hedgedValue - unhedgedValue) : 0;
    
    return (
      <div className="p-3 rounded-lg shadow-lg bg-background border border-border">
        <p className="font-semibold">
          {commodity?.symbol || 'Commodity'} Price: {Number(label).toFixed(4)}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {entry.name}: {Number(entry.value).toFixed(4)}
          </p>
        ))}
        <hr className="my-2 border-border" />
        <p className="text-sm font-medium">
          Protection: {protection > 0 ? '+' : ''}{protection.toFixed(4)}
          {protection > 0 ? ' ✅' : protection < 0 ? ' ❌' : ' ⚪'}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Commodity:</span> {commodity?.symbol || 'COMMODITY'}
          {' | '}
          <span className="font-medium">Unit:</span> {commodity?.unit || 'UNIT'}
        </p>
      </div>
    );
  }

  return null;
};

const SavedScenarios = () => {
  const [scenarios, setScenarios] = React.useState<SavedScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = React.useState<string[]>([]);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, Record<string, boolean>>>({});
  const navigate = useNavigate();

  // Initialize expanded state for each scenario
  const initializeExpandedState = (scenarioId: string) => ({
    strategy: false,
    detailedResults: false,
    yearlyStats: false,
    totalStats: false,
    monthlyPnL: false
  });

  // Toggle section visibility
  const toggleSection = (scenarioId: string, section: string) => {
    console.log('Toggle section:', scenarioId, section);
    setExpandedSections(prev => {
      const newState = {
        ...prev,
        [scenarioId]: {
          ...(prev[scenarioId] || initializeExpandedState(scenarioId)),
          [section]: !(prev[scenarioId]?.[section] ?? false)
        }
      };
      console.log('New expanded state:', newState[scenarioId]);
      return newState;
    });
  };

  React.useEffect(() => {
    const savedScenarios = localStorage.getItem('optionScenarios');
    if (savedScenarios) {
      const parsedScenarios = JSON.parse(savedScenarios);
      setScenarios(parsedScenarios);
      
      // Initialize expanded state for each scenario
      const initialExpandedState: Record<string, Record<string, boolean>> = {};
      parsedScenarios.forEach((scenario: SavedScenario) => {
        initialExpandedState[scenario.id] = initializeExpandedState(scenario.id);
      });
      setExpandedSections(initialExpandedState);
    }
  }, []);

  const deleteScenario = (id: string) => {
    const updatedScenarios = scenarios.filter(scenario => scenario.id !== id);
    setScenarios(updatedScenarios);
    localStorage.setItem('optionScenarios', JSON.stringify(updatedScenarios));
    
    // Remove expanded state for deleted scenario
    setExpandedSections(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getScenarioTypeName = (scenario: SavedScenario) => {
    if (!scenario.stressTest) return 'Base Calculation';
    return scenario.stressTest.name;
  };

  // Add the calculateYearlyResults function
  const calculateYearlyResults = (results: SavedScenario['results']): Record<string, YearlyResult> => {
    // Vérifier le format des dates dans les résultats
    if (results.length > 0) {
      console.log('Sample date:', results[0].date, 'Type:', typeof results[0].date);
      console.log('Date parsed:', new Date(results[0].date));
    }
    
    return results.reduce((acc: Record<string, YearlyResult>, row) => {
      // Extraire l'année depuis la date correctement
      let year: string;
      
      try {
        // Essayer d'abord avec Date
        const date = new Date(row.date);
        if (!isNaN(date.getTime())) {
          year = date.getFullYear().toString();
        } else {
          // Si la date n'est pas valide, essayer de l'extraire du format de chaîne
          // Format possible: "Jan 2023" ou similaire
          const parts = row.date.split(' ');
          if (parts.length > 1) {
            year = parts[1]; // Prendre la deuxième partie qui devrait être l'année
          } else {
            // Dernier recours, utiliser la chaîne complète
            year = row.date;
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'extraction de l\'année:', error);
        year = 'undefined';
      }
      
      if (!acc[year]) {
        acc[year] = {
          hedgedCost: 0,
          unhedgedCost: 0,
          deltaPnL: 0,
          strategyPremium: 0,
          volume: 0
        };
      }
      
      acc[year].hedgedCost += row.hedgedCost;
      acc[year].unhedgedCost += row.unhedgedCost;
      acc[year].deltaPnL += row.deltaPnL;
      acc[year].strategyPremium += (row.strategyPrice * row.monthlyVolume);
      acc[year].volume += row.monthlyVolume;
      
      return acc;
    }, {});
  };

  return (
    <Layout 
      title="Saved Scenarios"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Saved Scenarios" }
      ]}
    >
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Scenarios</h1>
            <p className="text-gray-600 mt-1">Manage and analyze your saved commodity hedging scenarios</p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Dashboard
              </Button>
            </Link>
            {scenarios.length > 0 && (
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {scenarios.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Scenarios</p>
                    <p className="text-2xl font-bold text-blue-900">{scenarios.length}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Base Cases</p>
                    <p className="text-2xl font-bold text-green-900">
                      {scenarios.filter(s => !s.stressTest).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Stress Tests</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {scenarios.filter(s => s.stressTest).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Latest Scenario</p>
                    <p className="text-sm font-bold text-purple-900">
                      {scenarios.length > 0 ? new Date(Math.max(...scenarios.map(s => s.timestamp))).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PDF Export Section */}
        {scenarios.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <FileText className="h-5 w-5" />
                Export Scenarios
              </CardTitle>
              <CardDescription className="text-blue-700">
                Select scenarios to export as PDF reports with detailed analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScenariosPdfExport
                scenarios={scenarios}
                selectedScenarios={selectedScenarios}
                setSelectedScenarios={setSelectedScenarios}
              />
            </CardContent>
          </Card>
        )}

        {/* Scenarios List */}
        {scenarios.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Scenarios</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven't saved any scenarios yet. Run a simulation in Strategy Builder to create your first scenario.
              </p>
              <Link to="/dashboard">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Scenario
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {scenarios.map((scenario, index) => (
              <Card key={scenario.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{scenario.name}</CardTitle>
                        <div className="flex gap-2">
                          {scenario.stressTest ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Stress Test
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Base Case
                            </Badge>
                          )}
                          <Badge variant="outline">
                            #{scenarios.length - index}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(scenario.timestamp)}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          {scenario.strategy.length} components
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {scenario.params.monthsToHedge} months
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteScenario(scenario.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Quick Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-3 w-3 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-blue-900">Strategy Period</h4>
                      </div>
                      <p className="text-sm text-blue-700">
                        {scenario.params.monthsToHedge} months from {scenario.params.startDate}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-green-900">Commodity Price</h4>
                      </div>
                      <p className="text-sm text-green-700">
                        {scenario.params.spotPrice?.toFixed(4)} {scenario.params.commodity?.unit || 'USD'}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="h-3 w-3 text-purple-600" />
                        </div>
                        <h4 className="font-semibold text-purple-900">Volume</h4>
                      </div>
                      <p className="text-sm text-purple-700">
                        {scenario.params.totalVolume?.toLocaleString() || scenario.params.baseVolume?.toLocaleString()} units
                      </p>
                    </div>
                  </div>

                  {/* Detailed Parameters */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          Basic Parameters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Start Date</span>
                          <span className="text-sm font-semibold">{scenario.params.startDate}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Months to Hedge</span>
                          <span className="text-sm font-semibold">{scenario.params.monthsToHedge}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Interest Rate</span>
                          <span className="text-sm font-semibold">{scenario.params.interestRate}%</span>
                        </div>
                        {scenario.params.baseVolume && scenario.params.quoteVolume ? (
                          <>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Base Volume</span>
                              <span className="text-sm font-semibold">{scenario.params.baseVolume.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Quote Volume</span>
                              <span className="text-sm font-semibold">{Math.round(scenario.params.quoteVolume).toLocaleString()}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Total Volume</span>
                            <span className="text-sm font-semibold">{scenario.params.totalVolume?.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-medium text-gray-600">Spot Price</span>
                          <span className="text-sm font-semibold">{scenario.params.spotPrice?.toFixed(4)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {scenario.stressTest && (
                      <Card className="border border-orange-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            Stress Test Parameters
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Volatility</span>
                            <span className="text-sm font-semibold">{(scenario.stressTest.volatility * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Drift</span>
                            <span className="text-sm font-semibold">{(scenario.stressTest.drift * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Price Shock</span>
                            <span className="text-sm font-semibold">{(scenario.stressTest.priceShock * 100).toFixed(1)}%</span>
                          </div>
                          {scenario.stressTest.forwardBasis && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm font-medium text-gray-600">Forward Basis</span>
                              <span className="text-sm font-semibold">{(scenario.stressTest.forwardBasis * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Strategy Components Section */}
                  <div className="mb-6">
                    <Button
                      variant="outline"
                      onClick={() => toggleSection(scenario.id, 'strategy')}
                      className="flex items-center gap-2 mb-3 w-full justify-between bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">Strategy Components</span>
                        <span className="text-sm text-gray-500">({scenario.strategy.length} options)</span>
                      </div>
                      {expandedSections[scenario.id]?.strategy ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    
                    {expandedSections[scenario.id]?.strategy && (
                      <Card className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {scenario.strategy.map((option, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg border">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Type</span>
                                  <span className="font-semibold text-sm">{option.type}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Strike</span>
                                  <span className="font-semibold text-sm">{option.strike} ({option.strikeType})</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Volatility</span>
                                  <span className="font-semibold text-sm">{option.volatility}%</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Quantity</span>
                                  <span className="font-semibold text-sm">{option.quantity}%</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Barrier</span>
                                  <span className="font-semibold text-sm">{option.barrier || 'N/A'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Charts Section */}
                  <div className="space-y-6">
                    <div className="h-64" id={`pnl-chart-${scenario.id}`}>
                      <h3 className="font-semibold mb-2">P&L Evolution</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scenario.results}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="deltaPnL" name="Delta P&L" stroke="#8884d8" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="h-80" id={`commodity-hedging-chart-${scenario.id}`}>
                      <h3 className="font-semibold mb-2">Commodity Hedging Profile</h3>
                      <div className="text-sm text-muted-foreground mb-2">
                        Hedged vs Unhedged {scenario.params.commodity?.symbol || 'Commodity'} prices across market scenarios
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={generateCommodityHedgingData(scenario.strategy, scenario.params.spotPrice, false)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis
                            dataKey="spot"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={(value) => value.toFixed(3)}
                            label={{
                              value: `${scenario.params.commodity?.symbol || 'Commodity'} Price`,
                              position: "insideBottom",
                              offset: -10,
                            }}
                          />
                          <YAxis
                            tickFormatter={(value) => value.toFixed(3)}
                            label={{
                              value: `Effective Price (${scenario.params.commodity?.unit || 'Unit'})`,
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <Tooltip content={
                            <CustomCommodityTooltip commodity={scenario.params.commodity} />
                          } />
                          <Legend 
                            verticalAlign="top" 
                            height={36}
                          />
                          
                          {/* Unhedged price line (reference) */}
                          <Line
                            type="monotone"
                            dataKey="unhedgedPrice"
                            stroke="#9CA3AF"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Unhedged Price"
                          />
                          
                          {/* Hedged price line */}
                          <Line
                            type="monotone"
                            dataKey="hedgedPrice"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: "#3B82F6" }}
                            name="Hedged Price"
                          />
                          
                          {/* Reference line for current spot */}
                          <ReferenceLine
                            x={scenario.params.spotPrice}
                            stroke="#059669"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{
                              value: "Current Spot",
                              position: "top",
                              fill: "#059669",
                              fontSize: 11,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Detailed Results Section */}
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => toggleSection(scenario.id, 'detailedResults')}
                      className="flex items-center gap-2 mb-3 w-full justify-between bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">Detailed Results</span>
                        <span className="text-sm text-gray-500">({scenario.results.length} maturities)</span>
                      </div>
                      {expandedSections[scenario.id]?.detailedResults ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    
                    {expandedSections[scenario.id]?.detailedResults && (
                      <Card className="border border-gray-200">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Maturity</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Time to Maturity</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Forward Price</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Real Price</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">IV (%)</th>
                                  {scenario.results[0]?.optionPrices?.map((option, idx) => (
                                    <th key={idx} className="border p-3 text-left font-semibold text-gray-700">{option.label || `${option.type.charAt(0).toUpperCase() + option.type.slice(1)} Price ${idx + 1}`}</th>
                                  ))}
                                  <th className="border p-3 text-left font-semibold text-gray-700">Strategy Price</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Payoff</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Volume</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Hedged Cost</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Unhedged Cost</th>
                                  <th className="border p-3 text-left font-semibold text-gray-700">Delta P&L</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scenario.results.map((row, i) => {
                                  // Récupération de la volatilité implicite pour cette date
                                  const date = row.date;
                                  let impliedVol = null;
                                  
                                  // 1. Vérifier si l'utilisateur a entré des valeurs manuelles d'IV
                                  if (scenario.useImpliedVol && scenario.impliedVolatilities && scenario.impliedVolatilities[date]) {
                                    impliedVol = scenario.impliedVolatilities[date];
                                  }
                                  // 2. Utiliser la volatilité de la stratégie comme dernier recours
                                  else if (scenario.strategy && scenario.strategy.length > 0) {
                                    impliedVol = scenario.strategy[0].volatility / 100;
                                  }
                                  
                                  return (
                                    <tr key={i} className="hover:bg-gray-50">
                                      <td className="border p-3">{row.date}</td>
                                      <td className="border p-3">{row.timeToMaturity.toFixed(4)}</td>
                                      <td className="border p-3">{row.forward.toFixed(4)}</td>
                                      <td className="border p-3">{row.realPrice.toFixed(4)}</td>
                                      <td className="border p-3">
                                        {impliedVol !== null 
                                          ? (impliedVol * 100).toFixed(0) 
                                          : ""}
                                      </td>
                                      {/* S'assurer que toutes les options sont affichées */}
                                      {row.optionPrices && Array.isArray(row.optionPrices) 
                                        ? row.optionPrices.map((option, idx) => (
                                            <td key={idx} className="border p-3">{option.price.toFixed(2)}</td>
                                          ))
                                        : scenario.strategy.map((_, idx) => (
                                            <td key={idx} className="border p-3">-</td>
                                          ))
                                      }
                                      <td className="border p-3">{row.strategyPrice.toFixed(2)}</td>
                                      <td className="border p-3">{row.totalPayoff.toFixed(2)}</td>
                                      <td className="border p-3">{row.monthlyVolume.toFixed(0)}</td>
                                      <td className="border p-3">{row.hedgedCost.toFixed(2)}</td>
                                      <td className="border p-3">{row.unhedgedCost.toFixed(2)}</td>
                                      <td className="border p-3">{row.deltaPnL.toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => toggleSection(scenario.id, 'yearlyStats')}
                    className="flex items-center gap-2 mb-2"
                  >
                    {expandedSections[scenario.id]?.yearlyStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Summary Statistics by Year
                  </Button>
                  
                  {expandedSections[scenario.id]?.yearlyStats && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="border p-2">Year</th>
                            <th className="border p-2">Hedged Cost</th>
                            <th className="border p-2">Unhedged Cost</th>
                            <th className="border p-2">Delta P&L</th>
                            <th className="border p-2">Strategy Premium</th>
                            <th className="border p-2">Strike Target</th>
                            <th className="border p-2">Cost Reduction (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(calculateYearlyResults(scenario.results)).map(([year, data]) => {
                            // Ajouter un log pour débogage
                            console.log('Year:', year, 'Data:', data);
                            return (
                              <tr key={year}>
                                <td className="border p-2">{year}</td>
                                <td className="border p-2">{data.hedgedCost.toFixed(2)}</td>
                                <td className="border p-2">{data.unhedgedCost.toFixed(2)}</td>
                                <td className="border p-2">{data.deltaPnL.toFixed(2)}</td>
                                <td className="border p-2">{data.strategyPremium.toFixed(2)}</td>
                                <td className="border p-2">
                                  {data.volume > 0 ? (Math.abs(data.hedgedCost) / data.volume).toFixed(2) : 'N/A'}
                                </td>
                                <td className="border p-2">
                                  {((data.deltaPnL / Math.abs(data.unhedgedCost)) * 100).toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => toggleSection(scenario.id, 'totalStats')}
                    className="flex items-center gap-2 mb-2"
                  >
                    {expandedSections[scenario.id]?.totalStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Total Summary Statistics
                  </Button>
                  
                  {expandedSections[scenario.id]?.totalStats && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="border p-2 font-medium">Total Cost with Hedging</td>
                            <td className="border p-2 text-right">
                              {scenario.results.reduce((sum, row) => sum + row.hedgedCost, 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-medium">Total Cost without Hedging</td>
                            <td className="border p-2 text-right">
                              {scenario.results.reduce((sum, row) => sum + row.unhedgedCost, 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-medium">Total P&L</td>
                            <td className="border p-2 text-right">
                              {scenario.results.reduce((sum, row) => sum + row.deltaPnL, 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-medium">Total Strategy Premium</td>
                            <td className="border p-2 text-right">
                              {scenario.results.reduce((sum, row) => sum + (row.strategyPrice * row.monthlyVolume), 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-medium">Cost Reduction (%)</td>
                            <td className="border p-2 text-right">
                              {(() => {
                                const totalPnL = scenario.results.reduce((sum, row) => sum + row.deltaPnL, 0);
                                const totalUnhedgedCost = scenario.results.reduce((sum, row) => sum + row.unhedgedCost, 0);
                                return ((totalPnL / Math.abs(totalUnhedgedCost)) * 100).toFixed(2);
                              })()}%
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2 font-medium">Strike Target</td>
                            <td className="border p-2 text-right">
                              {(() => {
                                const totalHedgedCost = scenario.results.reduce((sum, row) => sum + row.hedgedCost, 0);
                                const totalVolume = scenario.results.reduce((sum, row) => sum + row.monthlyVolume, 0);
                                return totalVolume > 0 
                                  ? Number(Math.abs(totalHedgedCost) / totalVolume).toFixed(2)
                                  : 'N/A';
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => toggleSection(scenario.id, 'monthlyPnL')}
                    className="flex items-center gap-2 mb-2"
                  >
                    {expandedSections[scenario.id]?.monthlyPnL ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Monthly & Yearly P&L Breakdown
                  </Button>
                  
                  {expandedSections[scenario.id]?.monthlyPnL && (
                    <div className="overflow-x-auto">
                      {(() => {
                        // Organiser les données par année et par mois
                        const pnlByYearMonth: Record<string, Record<string, number>> = {};
                        const yearTotals: Record<string, number> = {};
                        const monthTotals: Record<string, number> = {};
                        let grandTotal = 0;
                        
                        // Collecter toutes les années et tous les mois uniques
                        const years: Set<string> = new Set();
                        const months: string[] = [
                          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                        ];
                        
                        // Initialiser la structure de données
                        scenario.results.forEach(result => {
                          const date = new Date(result.date);
                          const year = date.getFullYear().toString();
                          const month = date.getMonth();
                          const monthKey = months[month];
                          
                          years.add(year);
                          
                          if (!pnlByYearMonth[year]) {
                            pnlByYearMonth[year] = {};
                            yearTotals[year] = 0;
                          }
                          
                          if (!pnlByYearMonth[year][monthKey]) {
                            pnlByYearMonth[year][monthKey] = 0;
                          }
                          
                          // Ajouter le P&L au mois correspondant
                          pnlByYearMonth[year][monthKey] += result.deltaPnL;
                          
                          // Mettre à jour les totaux
                          yearTotals[year] += result.deltaPnL;
                          if (!monthTotals[monthKey]) monthTotals[monthKey] = 0;
                          monthTotals[monthKey] += result.deltaPnL;
                          grandTotal += result.deltaPnL;
                        });
                        
                        // Convertir l'ensemble des années en tableau trié
                        const sortedYears = Array.from(years).sort();
                        
                        // Fonction pour appliquer une couleur en fonction de la valeur
                        const getPnLColor = (value: number) => {
                          if (value > 0) return 'bg-green-100';
                          if (value < 0) return 'bg-red-100';
                          return '';
                        };
                        
                        // Fonction pour formater les valeurs de P&L
                        const formatPnL = (value: number) => {
                          if (Math.abs(value) < 0.01) return '0';
                          // Formater en milliers avec un point de séparation de milliers
                          return (value / 1000).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3
                          });
                        };
                        
                        return (
                          <table className="min-w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-2 font-semibold text-left"></th>
                                {months.map(month => (
                                  <th key={month} className="border p-2 font-semibold text-center w-20">{month}</th>
                                ))}
                                <th className="border p-2 font-semibold text-center w-20">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedYears.map(year => (
                                <tr key={year}>
                                  <td className="border p-2 font-semibold">{year}</td>
                                  {months.map(month => {
                                    const value = pnlByYearMonth[year][month] || 0;
                                    return (
                                      <td 
                                        key={`${year}-${month}`} 
                                        className={`border p-2 text-right ${getPnLColor(value)}`}
                                      >
                                        {value ? formatPnL(value) : '-'}
                                      </td>
                                    );
                                  })}
                                  <td className={`border p-2 text-right font-semibold ${getPnLColor(yearTotals[year])}`}>
                                    {formatPnL(yearTotals[year])}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50">
                                <td className="border p-2 font-semibold">Total</td>
                                {months.map(month => (
                                  <td 
                                    key={`total-${month}`} 
                                    className={`border p-2 text-right font-semibold ${getPnLColor(monthTotals[month] || 0)}`}
                                  >
                                    {monthTotals[month] ? formatPnL(monthTotals[month]) : '-'}
                                  </td>
                                ))}
                                <td className={`border p-2 text-right font-semibold ${getPnLColor(grandTotal)}`}>
                                  {formatPnL(grandTotal)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  )}
                </div>

                  {/* Load Scenario Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        localStorage.setItem('calculatorState', JSON.stringify({
                          params: scenario.params,
                          strategy: scenario.strategy,
                          results: scenario.results,
                          payoffData: scenario.payoffData,
                          // Récupérer les paramètres personnalisés du scénario sauvegardé ou utiliser des valeurs par défaut
                          manualForwards: scenario.manualForwards || {},
                          realPrices: scenario.realPrices || {},
                          realPriceParams: {
                            useSimulation: false,
                            volatility: 0.3,
                            drift: 0.01,
                            numSimulations: 1000
                          },
                          barrierOptionSimulations: 1000,
                          useClosedFormBarrier: false,
                          activeTab: 'parameters',
                          customScenario: scenario.stressTest,
                          stressTestScenarios: {}, // You might want to save this too
                          // Récupérer les paramètres de volatilité implicite
                          useImpliedVol: scenario.useImpliedVol || false,
                          impliedVolatilities: scenario.impliedVolatilities || {},
                          // Récupérer les prix personnalisés des options
                          customOptionPrices: scenario.customOptionPrices || {}
                        }));
                        navigate('/strategy-builder');
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Loader2 className="h-4 w-4" />
                      Load This Scenario in Strategy Builder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SavedScenarios; 