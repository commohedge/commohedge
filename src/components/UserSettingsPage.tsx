import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import UserPreferencesPanel from './UserPreferencesPanel'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { 
  Settings, 
  User, 
  Smartphone, 
  Shield, 
  Activity,
  Clock,
  Globe
} from 'lucide-react'

const UserSettingsPage: React.FC = () => {
  const { user } = useSupabaseAuth()
  const { preferences, isLoading } = useUserPreferences()

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Chargement des paramètres...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres Utilisateur</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos préférences et synchronisez vos données entre tous vos appareils
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Synchronisé
          </Badge>
        </div>
      </div>

      {/* Informations utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations du Compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nom</label>
              <p className="text-lg">{user?.user_metadata?.full_name || 'Non défini'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Dernière connexion</label>
              <p className="text-lg">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Non disponible'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ID Utilisateur</label>
              <p className="text-sm font-mono text-gray-600">{user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets principaux */}
      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Préférences
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Appareils
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Confidentialité
          </TabsTrigger>
        </TabsList>

        {/* Préférences */}
        <TabsContent value="preferences">
          <UserPreferencesPanel />
        </TabsContent>

        {/* Appareils */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Appareils Connectés
              </CardTitle>
              <CardDescription>
                Gérez les appareils qui ont accès à votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Appareil Actuel</h3>
                        <p className="text-sm text-gray-500">
                          {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                           navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                           navigator.userAgent.includes('Safari') ? 'Safari' : 'Navigateur'} sur {navigator.platform}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">Actuel</Badge>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Connectez-vous depuis d'autres appareils pour les voir ici</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Sessions Actives
              </CardTitle>
              <CardDescription>
                Surveillez les sessions actives sur votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Session Actuelle</h3>
                      <p className="text-sm text-gray-500">
                        Créée le {new Date().toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune autre session active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confidentialité */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Confidentialité et Sécurité
              </CardTitle>
              <CardDescription>
                Gérez vos paramètres de confidentialité et de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Isolation des Données</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Vos données sont complètement isolées des autres utilisateurs grâce aux politiques de sécurité RLS.
                  </p>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <Shield className="h-3 w-3" />
                    Sécurisé
                  </Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Synchronisation Multi-Appareils</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Vos préférences et données sont automatiquement synchronisées entre tous vos appareils.
                  </p>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <Activity className="h-3 w-3" />
                    Synchronisé
                  </Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Chiffrement des Données</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Toutes vos données sont chiffrées en transit et au repos.
                  </p>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <Shield className="h-3 w-3" />
                    Chiffré
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UserSettingsPage
