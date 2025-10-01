import { useState, useEffect } from 'react'
import SupabaseAuthService, { AuthUser } from '../services/SupabaseAuthService'
import { useToast } from './use-toast'

export const useSupabaseAuth = () => {
  const { toast } = useToast()
  const [authService] = useState(() => SupabaseAuthService.getInstance())
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true)
      
      // Vérifier uniquement avec Supabase
      const supabaseUser = await authService.getCurrentUser()
      
      if (supabaseUser) {
        setUser(supabaseUser)
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData?: { name?: string; role?: string }) => {
    try {
      setIsLoading(true)
      const result = await authService.signUp(email, password, userData)
      
      if (result.success) {
        toast({
          title: "Registration Successful",
          description: result.message,
        })
      } else {
        toast({
          title: "Registration Error",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Erreur d\'inscription:', error)
      toast({
        title: "Erreur d'inscription",
          description: "An unexpected error occurred",
        variant: "destructive"
      })
      return { success: false, error: 'Unexpected error' }
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const result = await authService.signIn(email, password)
      
      if (result.success) {
        toast({
          title: "Connexion réussie",
          description: result.message,
        })
        
        // Mettre à jour l'état local
        if (result.user) {
          const authUser: AuthUser = {
            id: result.user.id,
            email: result.user.email || '',
            name: result.user.user_metadata?.name || result.user.email?.split('@')[0] || 'User',
            role: result.user.user_metadata?.role || 'Risk Manager',
            loginTime: new Date().toISOString()
          }
          setUser(authUser)
          setIsAuthenticated(true)
        }
      } else {
        toast({
          title: "Erreur de connexion",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Erreur de connexion:', error)
      toast({
        title: "Erreur de connexion",
          description: "An unexpected error occurred",
        variant: "destructive"
      })
      return { success: false, error: 'Unexpected error' }
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      const result = await authService.signInWithGoogle()
      
      if (result.success) {
        toast({
          title: "Redirection vers Google",
          description: result.message,
        })
      } else {
        toast({
          title: "Erreur de connexion Google",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Erreur de connexion Google:', error)
      toast({
        title: "Erreur de connexion Google",
          description: "An unexpected error occurred",
        variant: "destructive"
      })
      return { success: false, error: 'Unexpected error' }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setIsLoading(true)
      const result = await authService.signOut()
      
      if (result.success) {
        toast({
          title: "Déconnexion réussie",
          description: result.message,
        })
        
        // Mettre à jour l'état local
        setUser(null)
        setIsAuthenticated(false)
      } else {
        toast({
          title: "Erreur de déconnexion",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Erreur de déconnexion:', error)
      toast({
        title: "Erreur de déconnexion",
          description: "An unexpected error occurred",
        variant: "destructive"
      })
      return { success: false, error: 'Unexpected error' }
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true)
      const result = await authService.resetPassword(email)
      
      if (result.success) {
        toast({
          title: "Email envoyé",
          description: result.message,
        })
      } else {
        toast({
          title: "Erreur d'envoi",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Erreur de réinitialisation:', error)
      toast({
        title: "Erreur de réinitialisation",
          description: "An unexpected error occurred",
        variant: "destructive"
      })
      return { success: false, error: 'Unexpected error' }
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: { name?: string; role?: string }) => {
    try {
      setIsLoading(true)
      const result = await authService.updateProfile(updates)
      
      if (result.success) {
        toast({
          title: "Profil mis à jour",
          description: result.message,
        })
        
        // Mettre à jour l'état local
        if (user) {
          const updatedUser = { ...user, ...updates }
          setUser(updatedUser)
          localStorage.setItem('fx_hedging_user', JSON.stringify(updatedUser))
        }
      } else {
        toast({
          title: "Erreur de mise à jour",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error)
      toast({
        title: "Erreur de mise à jour",
          description: "An unexpected error occurred",
        variant: "destructive"
      })
      return { success: false, error: 'Unexpected error' }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // État
    isAuthenticated,
    user,
    isLoading,
    
    // Actions
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    checkAuthStatus,
    
    // Service
    authService
  }
}
