import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useToast } from '../hooks/use-toast'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Chrome, 
  Apple, 
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const SupabaseLogin: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    signIn, 
    signUp, 
    signInWithGoogle,
    resetPassword 
  } = useSupabaseAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('Risk Manager')

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    try {
      let result
      if (isSignUp) {
        result = await signUp(email, password, { name, role })
        if (result.success) {
          toast({
            title: "Inscription réussie",
            description: "Vérifiez votre email pour confirmer votre compte",
          })
        }
      } else {
        result = await signIn(email, password)
        if (result.success) {
          navigate('/dashboard')
        }
      }

      if (!result.success) {
        setError(result.error || 'Une erreur est survenue')
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue')
      console.error('Erreur d\'authentification:', err)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithGoogle()
      if (!result.success) {
        setError(result.error || 'Erreur de connexion Google')
      }
    } catch (err) {
      setError('Erreur de connexion Google')
      console.error('Erreur Google Auth:', err)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email d\'abord')
      return
    }

    try {
      const result = await resetPassword(email)
      if (result.success) {
        toast({
          title: "Email envoyé",
          description: "Vérifiez votre boîte email pour réinitialiser votre mot de passe",
        })
      } else {
        setError(result.error || 'Erreur d\'envoi de l\'email')
      }
    } catch (err) {
      setError('Erreur de réinitialisation')
      console.error('Erreur reset password:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Vérification de l'authentification...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Back to landing page */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="absolute -top-16 left-0 text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'accueil
        </Button>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">FX</span>
              </div>
            </div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                {isSignUp ? 'Créer un compte' : 'Connexion'}
              </CardTitle>
              <CardDescription className="text-white/70">
                {isSignUp 
                  ? 'Rejoignez la plateforme de gestion des risques FX' 
                  : 'Accédez à votre tableau de bord FX'
                }
              </CardDescription>
            </div>

            {/* Status badges */}
            <div className="flex justify-center gap-2">
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sécurisé
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Supabase
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            {/* Social login buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleGoogleAuth}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={isLoading}
              >
                <Chrome className="h-5 w-5 mr-2" />
                Continuer avec Google
              </Button>

              <Button
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled
              >
                <Apple className="h-5 w-5 mr-2" />
                Continuer avec Apple
                <Badge variant="secondary" className="ml-2 text-xs">Bientôt</Badge>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/70">ou</span>
              </div>
            </div>

            {/* Email/Password form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Nom complet</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Votre nom complet"
                    required={isSignUp}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Votre mot de passe"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!isSignUp && (
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleForgotPassword}
                    className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                  >
                    Mot de passe oublié ?
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isSignUp ? 'Créer le compte' : 'Se connecter'}
              </Button>
            </form>

            {/* Toggle sign up/sign in */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                className="text-white/70 hover:text-white p-0 h-auto"
              >
                {isSignUp 
                  ? 'Déjà un compte ? Se connecter' 
                  : 'Pas de compte ? Créer un compte'
                }
              </Button>
            </div>

            {/* Demo credentials info */}
            {!isSignUp && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-blue-200 mb-2">Compte de démonstration</h4>
                <p className="text-xs text-blue-300/80">
                  Email: <code className="bg-blue-500/20 px-1 rounded">demo@fx-hedging.com</code><br/>
                  Mot de passe: <code className="bg-blue-500/20 px-1 rounded">demo123</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SupabaseLogin
