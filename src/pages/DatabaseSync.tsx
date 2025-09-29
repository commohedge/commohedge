import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { SupabaseSync } from '../components/SupabaseSync'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import { 
  Database, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'
import { useToast } from '../hooks/use-toast'

const DatabaseSync: React.FC = () => {
  const { toast } = useToast()
  const { 
    isConnected, 
    loading, 
    error,
    getStrategies,
    getScenarios,
    getRiskMatrices,
    getHedgingInstruments,
    clearError
  } = useSupabase()

  const [stats, setStats] = useState({
    strategies: 0,
    scenarios: 0,
    riskMatrices: 0,
    hedgingInstruments: 0
  })

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Charger les statistiques
  const loadStats = async () => {
    if (!isConnected) return

    try {
      const [strategies, scenarios, riskMatrices, instruments] = await Promise.all([
        getStrategies(),
        getScenarios(),
        getRiskMatrices(),
        getHedgingInstruments()
      ])

      setStats({
        strategies: strategies?.length || 0,
        scenarios: scenarios?.length || 0,
        riskMatrices: riskMatrices?.length || 0,
        hedgingInstruments: instruments?.length || 0
      })

      setLastRefresh(new Date())
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }

  useEffect(() => {
    if (isConnected) {
      loadStats()
    }
  }, [isConnected])

  const handleDataLoaded = () => {
    loadStats()
    toast({
      title: "Données chargées",
      description: "Les données ont été chargées depuis Supabase",
    })
  }

  const handleDataSaved = () => {
    loadStats()
    toast({
      title: "Données sauvegardées",
      description: "Les données ont été sauvegardées sur Supabase",
    })
  }

  return (
    <Layout 
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Database Sync" }
      ]}
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Synchronisation Base de Données</h1>
            <p className="text-muted-foreground">
              Gérez la synchronisation de vos données avec Supabase
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connecté
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Déconnecté
              </Badge>
            )}
            
            <Button
              onClick={loadStats}
              disabled={!isConnected || loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statut de connexion */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossible de se connecter à Supabase. Vérifiez votre connexion internet et la configuration.
            </AlertDescription>
          </Alert>
        )}

        {/* Statistiques */}
        {isConnected && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stratégies</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.strategies}</div>
                <p className="text-xs text-muted-foreground">
                  Stratégies sauvegardées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scénarios</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.scenarios}</div>
                <p className="text-xs text-muted-foreground">
                  Scénarios sauvegardés
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matrices de Risque</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.riskMatrices}</div>
                <p className="text-xs text-muted-foreground">
                  Matrices sauvegardées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Instruments</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.hedgingInstruments}</div>
                <p className="text-xs text-muted-foreground">
                  Instruments de couverture
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Onglets */}
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync">Synchronisation</TabsTrigger>
            <TabsTrigger value="info">Informations</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <SupabaseSync 
              onDataLoaded={handleDataLoaded}
              onDataSaved={handleDataSaved}
            />
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Configuration Supabase
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <strong>URL:</strong> https://xxetyvwjawnhnowdunsw.supabase.co
                  </div>
                  <div className="text-sm">
                    <strong>Statut:</strong> {isConnected ? 'Connecté' : 'Déconnecté'}
                  </div>
                  <div className="text-sm">
                    <strong>Dernière actualisation:</strong> {lastRefresh ? lastRefresh.toLocaleString() : 'Jamais'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Tables Disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">• forex_strategies</div>
                  <div className="text-sm">• saved_scenarios</div>
                  <div className="text-sm">• risk_matrices</div>
                  <div className="text-sm">• hedging_instruments</div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> La synchronisation sauvegarde automatiquement toutes vos données locales 
                (stratégies, scénarios, matrices de risque, instruments de couverture) vers Supabase. 
                Vous pouvez également charger les données depuis la base de données cloud.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default DatabaseSync
