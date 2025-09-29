import { useState, useEffect, useCallback } from 'react'
import AuthService, { User, SignupData } from '../services/AuthService'
import { useToast } from './use-toast'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { toast } = useToast()

  const authService = AuthService.getInstance()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = () => {
      const currentUser = authService.getCurrentUser()
      const authenticated = authService.isAuthenticated()
      
      setUser(currentUser)
      setIsAuthenticated(authenticated)
      setIsLoading(false)
    }

    initializeAuth()

    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user)
      setIsAuthenticated(!!user)
    })

    return () => unsubscribe()
  }, [authService])

  // Sign up
  const signUp = useCallback(async (data: SignupData) => {
    setIsLoading(true)
    try {
      const { user: newUser, error } = await authService.signUp(data)
      
      if (error) {
        toast({
          title: "Signup Failed",
          description: error,
          variant: "destructive",
        })
        return { success: false, error }
      }

      if (newUser) {
        setUser(newUser)
        setIsAuthenticated(true)
        toast({
          title: "Account Created Successfully!",
          description: "Welcome to FX hedging Risk Management Platform",
        })
        return { success: true, user: newUser }
      }

      return { success: false, error: 'No user data returned' }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during signup'
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [authService, toast])

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { user: signedInUser, error } = await authService.signIn(email, password)
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error,
          variant: "destructive",
        })
        return { success: false, error }
      }

      if (signedInUser) {
        setUser(signedInUser)
        setIsAuthenticated(true)
        toast({
          title: "Login Successful",
          description: "Welcome to FX hedging Risk Management Platform",
        })
        return { success: true, user: signedInUser }
      }

      return { success: false, error: 'No user data returned' }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign in'
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [authService, toast])

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      const { error } = await authService.signOut()
      
      if (error) {
        toast({
          title: "Sign Out Failed",
          description: error,
          variant: "destructive",
        })
        return { success: false, error }
      }

      setUser(null)
      setIsAuthenticated(false)
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      })
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign out'
      toast({
        title: "Sign Out Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [authService, toast])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    setIsLoading(true)
    try {
      const { user: updatedUser, error } = await authService.updateProfile(updates)
      
      if (error) {
        toast({
          title: "Profile Update Failed",
          description: error,
          variant: "destructive",
        })
        return { success: false, error }
      }

      if (updatedUser) {
        setUser(updatedUser)
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        })
        return { success: true, user: updatedUser }
      }

      return { success: false, error: 'No user data returned' }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during profile update'
      toast({
        title: "Profile Update Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [authService, toast])

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true)
    try {
      const { error } = await authService.resetPassword(email)
      
      if (error) {
        toast({
          title: "Password Reset Failed",
          description: error,
          variant: "destructive",
        })
        return { success: false, error }
      }

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions",
      })
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during password reset'
      toast({
        title: "Password Reset Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [authService, toast])

  // Get user strategies
  const getUserStrategies = useCallback(async () => {
    try {
      const { strategies, error } = await authService.getUserStrategies()
      
      if (error) {
        console.error('Error fetching user strategies:', error)
        return { strategies: [], error }
      }

      return { strategies, error: null }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while fetching strategies'
      console.error('Error fetching user strategies:', errorMessage)
      return { strategies: [], error: errorMessage }
    }
  }, [authService])

  // Save user strategy
  const saveUserStrategy = useCallback(async (strategy: any) => {
    try {
      const { strategy: savedStrategy, error } = await authService.saveUserStrategy(strategy)
      
      if (error) {
        toast({
          title: "Strategy Save Failed",
          description: error,
          variant: "destructive",
        })
        return { success: false, error }
      }

      if (savedStrategy) {
        toast({
          title: "Strategy Saved",
          description: "Your strategy has been saved successfully",
        })
        return { success: true, strategy: savedStrategy }
      }

      return { success: false, error: 'No strategy data returned' }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while saving strategy'
      toast({
        title: "Strategy Save Failed",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    }
  }, [authService, toast])

  // Alias pour logout (pour la compatibilité avec l'interface)
  const logout = useCallback(async () => {
    const result = await signOut()
    return result
  }, [signOut])

  return {
    // State
    user,
    isLoading,
    isAuthenticated,
    
    // Actions
    signUp,
    signIn,
    signOut,
    logout, // Alias pour logout
    updateProfile,
    resetPassword,
    getUserStrategies,
    saveUserStrategy,
    
    // Utils
    getCurrentUser: () => authService.getCurrentUser(),
    isUserAuthenticated: () => authService.isAuthenticated()
  }
}