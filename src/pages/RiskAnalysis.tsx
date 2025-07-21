import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  Play,
  Download,
  Settings,
  RefreshCw,
  Activity
} from "lucide-react";

const RiskAnalysis = () => {
  // États pour la configuration des analyses
  const [selectedScenario, setSelectedScenario] = useState("stress-test");
  const [volatilityShock, setVolatilityShock] = useState([20]);
  const [currencyShock, setCurrencyShock] = useState([10]);
  const [timeHorizon, setTimeHorizon] = useState([30]);
  const [confidenceLevel, setConfidenceLevel] = useState("95");
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);

  // Données financières en temps réel
  const {
    marketData,
    exposures,
    instruments,
    riskMetrics,
    currencyExposures,
    generateStressScenarios,
    updateMarketData,
    isLiveMode,
    setLiveMode
  } = useFinancialData();

  // Calculs dérivés pour les graphiques
  const portfolioBreakdown = useMemo(() => {
    return currencyExposures.map((exp, index) => ({
      currency: exp.currency,
      exposure: Math.abs(exp.netExposure),
      hedged: Math.abs(exp.hedgedAmount),
      unhedged: Math.abs(exp.netExposure - exp.hedgedAmount),
      var_contribution: Math.abs(exp.netExposure) * 0.05, // Estimation VaR contribution
      color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
    }));
  }, [currencyExposures]);

  const timeSeriesData = useMemo(() => {
    // Génération de données historiques simulées basées sur les expositions actuelles
    const data = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Simulation de P&L basée sur les vraies expositions
      const randomFactor = (Math.random() - 0.5) * 0.02; // ±2% de variation
      const baseValue = riskMetrics.totalExposure * randomFactor;
      const mtmChange = riskMetrics.mtmImpact * (Math.random() - 0.5) * 0.1;
      
      data.push({
        date: date.toISOString().split('T')[0],
        pnl: baseValue + mtmChange,
        cumulative: data.length > 0 ? data[data.length - 1].cumulative + baseValue + mtmChange : baseValue + mtmChange,
        var_95: riskMetrics.var95 * (0.8 + Math.random() * 0.4), // VaR with some variation
        exposure: riskMetrics.totalExposure * (0.9 + Math.random() * 0.2)
      });
    }
    
    return data;
  }, [riskMetrics]);

  const stressTestResults = useMemo(() => {
    if (!generateStressScenarios) return [];
    
    try {
      const scenarios = generateStressScenarios();
      return scenarios.map(scenario => ({
        factor: scenario.name,
        description: scenario.description,
        unhedged_impact: scenario.impact,
        hedged_impact: scenario.impact * (1 - riskMetrics.hedgeRatio / 100),
        probability: Math.random() * 20 + 5, // 5-25% probability
        severity: Math.abs(scenario.impact) > riskMetrics.var95 ? 'High' : 
                 Math.abs(scenario.impact) > riskMetrics.var95 * 0.5 ? 'Medium' : 'Low'
      }));
    } catch (error) {
      console.error('Error generating stress scenarios:', error);
      return [];
    }
  }, [generateStressScenarios, riskMetrics]);

  const correlationMatrix = useMemo(() => {
    // Matrice de corrélation entre les devises
    const currencies = portfolioBreakdown.map(p => p.currency);
    const matrix = [];
    
    currencies.forEach((curr1, i) => {
      currencies.forEach((curr2, j) => {
        // Simulation de corrélations réalistes
        let correlation = 1;
        if (i !== j) {
          if ((curr1 === 'EUR' && curr2 === 'GBP') || (curr1 === 'GBP' && curr2 === 'EUR')) {
            correlation = 0.75;
          } else if ((curr1 === 'USD' && curr2 === 'CAD') || (curr1 === 'CAD' && curr2 === 'USD')) {
            correlation = 0.82;
          } else {
            correlation = 0.3 + Math.random() * 0.4; // 0.3 à 0.7
          }
        }
        
        matrix.push({
          currency1: curr1,
          currency2: curr2,
          correlation: correlation,
          x: i,
          y: j
        });
      });
    });
    
    return matrix;
  }, [portfolioBreakdown]);

  // Fonction pour exécuter l'analyse de scénarios
  const runScenarioAnalysis = async () => {
    setIsAnalysisRunning(true);
    try {
      // Simulation d'analyse
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mise à jour des données de marché
      updateMarketData();
      
      console.log("Analyse de scénarios complétée:", {
        scenario: selectedScenario,
        volatilityShock: volatilityShock[0],
        currencyShock: currencyShock[0],
        timeHorizon: timeHorizon[0],
        confidenceLevel
      });
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
    } finally {
      setIsAnalysisRunning(false);
    }
  };

  // Fonctions utilitaires
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getRiskColor = (risk: number, threshold: number) => {
    if (risk > threshold * 1.5) return "text-red-600";
    if (risk > threshold) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Analyse des Risques" }
      ]}
    >
      {/* En-tête avec contrôles */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analyse des Risques</h1>
          <p className="text-muted-foreground">
            Surveillance en temps réel du risque de change
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isLiveMode ? "default" : "outline"}
            onClick={() => setLiveMode(!isLiveMode)}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            {isLiveMode ? "Live" : "Statique"}
          </Button>
          <Button
            variant="outline"
            onClick={updateMarketData}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Métriques de risque principales */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VaR (95%)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.var95, riskMetrics.totalExposure * 0.05)}`}>
              {formatCurrency(riskMetrics.var95)}
            </div>
            <p className="text-xs text-muted-foreground">
              Value at Risk 1 jour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Shortfall</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.expectedShortfall95, riskMetrics.var95)}`}>
              {formatCurrency(riskMetrics.expectedShortfall95)}
            </div>
            <p className="text-xs text-muted-foreground">
              CVaR (95%) conditionnel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risque Non Couvert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(riskMetrics.unhedgedRisk, riskMetrics.totalExposure * 0.3)}`}>
              {formatCurrency(riskMetrics.unhedgedRisk)}
            </div>
            <p className="text-xs text-muted-foreground">
              Exposition non protégée
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ratio de Couverture</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskMetrics.hedgeRatio > 70 ? 'text-green-600' : riskMetrics.hedgeRatio > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {formatPercentage(riskMetrics.hedgeRatio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Taux de couverture global
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section de configuration des analyses */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuration des Analyses</CardTitle>
            <CardDescription>Paramètres de stress test et de simulation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div>
              <Label>Type de Scénario</Label>
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="stress-test">Test de Stress</SelectItem>
                    <SelectItem value="monte-carlo">Monte Carlo</SelectItem>
                  <SelectItem value="historical">Historique</SelectItem>
                  <SelectItem value="correlation">Analyse de Corrélation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Niveau de Confiance</Label>
              <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="95">95%</SelectItem>
                  <SelectItem value="99">99%</SelectItem>
                  <SelectItem value="99.9">99.9%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
              <Label>Choc de Volatilité: {volatilityShock[0]}%</Label>
                <Slider
                  value={volatilityShock}
                  onValueChange={setVolatilityShock}
                  max={100}
                min={5}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
              <Label>Choc de Change: {currencyShock[0]}%</Label>
                <Slider
                  value={currencyShock}
                  onValueChange={setCurrencyShock}
                  max={50}
                min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
              <Label>Horizon Temporel: {timeHorizon[0]} jours</Label>
                <Slider
                  value={timeHorizon}
                  onValueChange={setTimeHorizon}
                  max={365}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
              <Button 
                onClick={runScenarioAnalysis} 
                className="flex-1"
                disabled={isAnalysisRunning}
              >
                {isAnalysisRunning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isAnalysisRunning ? "Analyse..." : "Lancer l'Analyse"}
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Répartition VaR par Niveau de Confiance */}
        <Card>
          <CardHeader>
            <CardTitle>VaR par Niveau de Confiance</CardTitle>
            <CardDescription>Distribution des risques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { confidence: "95%", var: riskMetrics.var95, expected_shortfall: riskMetrics.expectedShortfall95 },
                { confidence: "99%", var: riskMetrics.var99, expected_shortfall: riskMetrics.expectedShortfall99 },
                { confidence: "99.9%", var: riskMetrics.var99 * 1.5, expected_shortfall: riskMetrics.expectedShortfall99 * 1.2 }
              ].map((item) => (
                <div key={item.confidence} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Confiance {item.confidence}</div>
                    <div className="text-sm text-muted-foreground">Horizon 1 jour</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(item.var)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ES: {formatCurrency(item.expected_shortfall)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Métriques de Performance du Portefeuille */}
        <Card>
          <CardHeader>
            <CardTitle>Performance du Portefeuille</CardTitle>
            <CardDescription>Métriques clés en temps réel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Exposition Totale</span>
                <span className="font-bold">{formatCurrency(riskMetrics.totalExposure)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Montant Couvert</span>
                <span className="font-bold text-green-600">{formatCurrency(riskMetrics.hedgedAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Impact MTM</span>
                <span className={`font-bold ${getPnLColor(riskMetrics.mtmImpact)}`}>
                  {riskMetrics.mtmImpact >= 0 ? '+' : ''}{formatCurrency(riskMetrics.mtmImpact)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Nb. Expositions</span>
                <span className="font-bold">{exposures.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Nb. Instruments</span>
                <span className="font-bold">{instruments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Dernière MAJ</span>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString('fr-FR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques de l'analyse de risque */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Série temporelle P&L et VaR */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Historique des Risques</CardTitle>
            <CardDescription>P&L historique et VaR sur 30 jours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'pnl' ? 'P&L Quotidien' : 
                    name === 'cumulative' ? 'P&L Cumulé' : 
                    name === 'var_95' ? 'VaR 95%' : 'Exposition'
                  ]}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('fr-FR')}`}
                />
                <Line type="monotone" dataKey="pnl" stroke="#8884d8" strokeWidth={2} name="P&L Quotidien" />
                <Line type="monotone" dataKey="cumulative" stroke="#82ca9d" strokeWidth={2} name="P&L Cumulé" />
                <Line type="monotone" dataKey="var_95" stroke="#ff7300" strokeWidth={2} strokeDasharray="5 5" name="VaR 95%" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition des Risques par Devise */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des Risques par Devise</CardTitle>
            <CardDescription>Contribution VaR par paire de devises</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={portfolioBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="var_contribution"
                >
                  {portfolioBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Graphique de Corrélation et Analyse de Stress */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Graphique de Corrélation */}
        <Card>
          <CardHeader>
            <CardTitle>Matrice de Corrélation</CardTitle>
            <CardDescription>Corrélations entre paires de devises</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={[0, Math.max(1, portfolioBreakdown.length - 1)]}
                  tickFormatter={(value) => portfolioBreakdown[value]?.currency || ''}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  domain={[0, Math.max(1, portfolioBreakdown.length - 1)]}
                  tickFormatter={(value) => portfolioBreakdown[value]?.currency || ''}
                />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${(props.payload.correlation * 100).toFixed(1)}%`,
                    `Corrélation ${props.payload.currency1}/${props.payload.currency2}`
                  ]}
                />
                <Scatter 
                  name="Corrélation" 
                  data={correlationMatrix} 
                  fill="#8884d8"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique de Couverture par Devise */}
        <Card>
          <CardHeader>
            <CardTitle>Efficacité de Couverture</CardTitle>
            <CardDescription>Exposition vs Couverture par devise</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={portfolioBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="currency" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="exposure" fill="#8884d8" name="Exposition Totale" />
                <Bar dataKey="hedged" fill="#82ca9d" name="Montant Couvert" />
                <Bar dataKey="unhedged" fill="#ff7300" name="Non Couvert" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Résultats des Tests de Stress */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Résultats des Tests de Stress</CardTitle>
              <CardDescription>Impact potentiel des scénarios de marché</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scenarios">
            <TabsList>
              <TabsTrigger value="scenarios">Scénarios de Marché</TabsTrigger>
              <TabsTrigger value="stress-tests">Tests de Stress</TabsTrigger>
              <TabsTrigger value="sensitivity">Analyse de Sensibilité</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scenarios" className="mt-4">
              <div className="space-y-3">
                {stressTestResults.length > 0 ? (
                  stressTestResults.map((scenario, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                        <Badge 
                          variant={scenario.severity === 'High' ? 'destructive' : 
                                   scenario.severity === 'Medium' ? 'secondary' : 'outline'}
                        >
                          {scenario.severity}
                        </Badge>
                      <div>
                          <div className="font-medium">{scenario.factor}</div>
                          <div className="text-sm text-muted-foreground">
                            {scenario.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${getPnLColor(scenario.unhedged_impact)}`}>
                          {formatCurrency(scenario.unhedged_impact)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Après couverture: {formatCurrency(scenario.hedged_impact)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun scénario de stress disponible</p>
                    <p className="text-sm">Ajoutez des expositions pour générer des tests de stress</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="stress-tests" className="mt-4">
              <div className="space-y-3">
                {/* Tests de stress configurés */}
                {[
                  { 
                    name: `Choc EUR/USD -${currencyShock[0]}%`, 
                    impact: -riskMetrics.totalExposure * (currencyShock[0] / 100) * 0.6,
                    hedged_impact: -riskMetrics.totalExposure * (currencyShock[0] / 100) * 0.6 * (1 - riskMetrics.hedgeRatio / 100)
                  },
                  { 
                    name: `Choc de Volatilité +${volatilityShock[0]}%`, 
                    impact: -riskMetrics.var95 * (volatilityShock[0] / 20),
                    hedged_impact: -riskMetrics.var95 * (volatilityShock[0] / 20) * 0.5
                  },
                  { 
                    name: "Crise de Liquidité", 
                    impact: -riskMetrics.totalExposure * 0.15,
                    hedged_impact: -riskMetrics.totalExposure * 0.15 * 0.3
                  }
                ].map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Scénario de stress configuré
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getPnLColor(test.impact)}`}>
                        {formatCurrency(test.impact)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Après couverture: {formatCurrency(test.hedged_impact)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sensitivity" className="mt-4">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Sensibilité aux Taux de Change</h4>
                    <div className="space-y-2">
                      {portfolioBreakdown.slice(0, 4).map((curr, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm">{curr.currency} +1%</span>
                          <span className={`text-sm font-medium ${getPnLColor(curr.exposure * 0.01)}`}>
                            {formatCurrency(curr.exposure * 0.01)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Sensibilité à la Volatilité</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Volatilité +10%</span>
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(-riskMetrics.var95 * 0.1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Volatilité -10%</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(riskMetrics.var95 * 0.05)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RiskAnalysis; 