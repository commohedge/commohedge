import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { useToast } from '../hooks/use-toast'
import { 
  Settings, 
  Palette, 
  Globe, 
  Bell, 
  Monitor, 
  Shield, 
  Save, 
  RotateCcw,
  Sync,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const UserPreferencesPanel: React.FC = () => {
  const { toast } = useToast()
  const {
    preferences,
    isLoading,
    error,
    savePreferences,
    updatePreference,
    resetPreferences,
    syncPreferences
  } = useUserPreferences()

  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Préférences Utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Chargement des préférences...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Erreur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={syncPreferences} className="mt-4">
            <Sync className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Préférences Utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucune préférence trouvée.</p>
        </CardContent>
      </Card>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await savePreferences(preferences)
      if (success) {
        toast({
          title: "Préférences sauvegardées",
          description: "Vos préférences ont été sauvegardées avec succès.",
        })
      } else {
        toast({
          title: "Erreur de sauvegarde",
          description: "Impossible de sauvegarder vos préférences.",
          variant: "destructive"
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const success = await resetPreferences()
      if (success) {
        toast({
          title: "Préférences réinitialisées",
          description: "Vos préférences ont été réinitialisées aux valeurs par défaut.",
        })
      } else {
        toast({
          title: "Erreur de réinitialisation",
          description: "Impossible de réinitialiser vos préférences.",
          variant: "destructive"
        })
      }
    } finally {
      setIsResetting(false)
    }
  }

  const handlePreferenceChange = async (key: string, value: any) => {
    const success = await updatePreference(key, value)
    if (success) {
      toast({
        title: "Préférence mise à jour",
        description: "La préférence a été mise à jour automatiquement.",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Préférences Utilisateur
            </CardTitle>
            <CardDescription>
              Personnalisez votre expérience et synchronisez vos préférences entre tous vos appareils
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncPreferences}
              disabled={isSaving || isResetting}
            >
              <Sync className="h-4 w-4 mr-2" />
              Synchroniser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isResetting}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Apparence
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Langue
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Confidentialité
            </TabsTrigger>
          </TabsList>

          {/* Apparence */}
          <TabsContent value="appearance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Thème</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => handlePreferenceChange('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="system">Système</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Devise par défaut</Label>
                <Select
                  value={preferences.currency}
                  onValueChange={(value) => handlePreferenceChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dollar américain</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - Livre sterling</SelectItem>
                    <SelectItem value="JPY">JPY - Yen japonais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Langue et Localisation */}
          <TabsContent value="language" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => handlePreferenceChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Input
                  id="timezone"
                  value={preferences.timezone}
                  onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format">Format de date</Label>
                <Select
                  value={preferences.date_format}
                  onValueChange={(value) => handlePreferenceChange('date_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="number_format">Format des nombres</Label>
                <Select
                  value={preferences.number_format}
                  onValueChange={(value) => handlePreferenceChange('number_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US (1,234.56)</SelectItem>
                    <SelectItem value="EU">EU (1.234,56)</SelectItem>
                    <SelectItem value="UK">UK (1,234.56)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_notifications">Notifications par email</Label>
                  <p className="text-sm text-gray-500">Recevoir des notifications par email</p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={preferences.notifications.email}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.email', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push_notifications">Notifications push</Label>
                  <p className="text-sm text-gray-500">Recevoir des notifications push</p>
                </div>
                <Switch
                  id="push_notifications"
                  checked={preferences.notifications.push}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.push', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="market_alerts">Alertes de marché</Label>
                  <p className="text-sm text-gray-500">Alertes sur les mouvements de marché</p>
                </div>
                <Switch
                  id="market_alerts"
                  checked={preferences.notifications.market_alerts}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.market_alerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="risk_alerts">Alertes de risque</Label>
                  <p className="text-sm text-gray-500">Alertes sur les niveaux de risque</p>
                </div>
                <Switch
                  id="risk_alerts"
                  checked={preferences.notifications.risk_alerts}
                  onCheckedChange={(checked) => handlePreferenceChange('notifications.risk_alerts', checked)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_view">Vue par défaut</Label>
                <Select
                  value={preferences.dashboard.default_view}
                  onValueChange={(value) => handlePreferenceChange('dashboard.default_view', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Vue d'ensemble</SelectItem>
                    <SelectItem value="detailed">Détaillée</SelectItem>
                    <SelectItem value="compact">Compacte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh_interval">Intervalle de rafraîchissement (secondes)</Label>
                <Input
                  id="refresh_interval"
                  type="number"
                  value={preferences.dashboard.refresh_interval}
                  onChange={(e) => handlePreferenceChange('dashboard.refresh_interval', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_refresh">Rafraîchissement automatique</Label>
                  <p className="text-sm text-gray-500">Actualiser automatiquement les données</p>
                </div>
                <Switch
                  id="auto_refresh"
                  checked={preferences.dashboard.auto_refresh}
                  onCheckedChange={(checked) => handlePreferenceChange('dashboard.auto_refresh', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show_charts">Afficher les graphiques</Label>
                  <p className="text-sm text-gray-500">Afficher les graphiques sur le dashboard</p>
                </div>
                <Switch
                  id="show_charts"
                  checked={preferences.dashboard.show_charts}
                  onCheckedChange={(checked) => handlePreferenceChange('dashboard.show_charts', checked)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Confidentialité */}
          <TabsContent value="privacy" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share_analytics">Partager les analyses</Label>
                  <p className="text-sm text-gray-500">Partager des données d'analyse anonymes</p>
                </div>
                <Switch
                  id="share_analytics"
                  checked={preferences.privacy.share_analytics}
                  onCheckedChange={(checked) => handlePreferenceChange('privacy.share_analytics', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share_performance">Partager les performances</Label>
                  <p className="text-sm text-gray-500">Partager des données de performance</p>
                </div>
                <Switch
                  id="share_performance"
                  checked={preferences.privacy.share_performance}
                  onCheckedChange={(checked) => handlePreferenceChange('privacy.share_performance', checked)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || isResetting}
          >
            {isResetting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Réinitialiser
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Synchronisé
            </Badge>
            <span className="text-sm text-gray-500">
              Dernière mise à jour: {new Date(preferences.updated_at || preferences.created_at || '').toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default UserPreferencesPanel
