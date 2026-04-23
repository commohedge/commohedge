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
      console.error('Error while checking authentication:', error)
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
      console.error('Sign-up error:', error)
      toast({
        title: "Sign-up error",
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
          title: "Signed in",
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
          title: "Sign-in error",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Sign-in error:', error)
      toast({
        title: "Sign-in error",
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
          title: "Signed in with Google",
          description: result.message,
        })
        
        // Mettre à jour l'état local si un utilisateur est retourné
        if (result.user) {
          setUser(result.user)
          setIsAuthenticated(true)
        }
      } else {
        toast({
          title: "Google sign-in error",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Google sign-in error:', error)
      toast({
        title: "Google sign-in error",
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
          title: "Signed out",
          description: result.message,
        })
        
        // Mettre à jour l'état local
        setUser(null)
        setIsAuthenticated(false)
      } else {
        toast({
          title: "Sign-out error",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Sign-out error:', error)
      toast({
        title: "Sign-out error",
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
          title: "Email sent",
          description: result.message,
        })
      } else {
        toast({
          title: "Email error",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Password reset error:', error)
      toast({
        title: "Password reset error",
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
          title: "Profile updated",
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
          title: "Profile update error",
          description: result.error,
          variant: "destructive"
        })
      }
      
      return result
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: "Profile update error",
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
