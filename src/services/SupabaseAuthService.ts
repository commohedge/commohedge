import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
  loginTime: string
}

class SupabaseAuthService {
  private static instance: SupabaseAuthService

  private constructor() {
    this.initializeAuth()
  }

  public static getInstance(): SupabaseAuthService {
    if (!SupabaseAuthService.instance) {
      SupabaseAuthService.instance = new SupabaseAuthService()
    }
    return SupabaseAuthService.instance
  }

  private initializeAuth() {
    // Écouter les changements d'authentification
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user) {
        this.handleSignIn(session.user)
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut()
      }
    })
  }

  private handleSignIn(user: User) {
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role: user.user_metadata?.role || 'Risk Manager',
      loginTime: new Date().toISOString()
    }

    // Stocker dans localStorage pour compatibilité avec l'ancien système
    localStorage.setItem('fx_hedging_auth', 'true')
    localStorage.setItem('fx_hedging_user', JSON.stringify(authUser))
    
    console.log('✅ User signed in:', authUser.email)
  }

  private handleSignOut() {
    localStorage.removeItem('fx_hedging_auth')
    localStorage.removeItem('fx_hedging_user')
    console.log('👋 User signed out')
  }

  // Inscription avec email/password
  async signUp(email: string, password: string, userData?: { name?: string; role?: string }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData?.name || email.split('@')[0],
            role: userData?.role || 'Risk Manager'
          }
        }
      })

      if (error) throw error

      return {
        success: true,
        user: data.user,
        message: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.'
      }
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error)
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'inscription'
      }
    }
  }

  // Connexion avec email/password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return {
        success: true,
        user: data.user,
        message: 'Connexion réussie !'
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la connexion'
      }
    }
  }

  // Connexion avec Google
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw error

      return {
        success: true,
        message: 'Redirection vers Google...'
      }
    } catch (error: any) {
      console.error('Erreur de connexion Google:', error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la connexion Google'
      }
    }
  }

  // Déconnexion
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return {
        success: true,
        message: 'Déconnexion réussie !'
      }
    } catch (error: any) {
      console.error('Erreur de déconnexion:', error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la déconnexion'
      }
    }
  }

  // Obtenir l'utilisateur actuel
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error

      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'Risk Manager',
          loginTime: new Date().toISOString()
        }
        return authUser
      }

      return null
    } catch (error: any) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      return null
    }
  }

  // Vérifier si l'utilisateur est connecté
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error)
      return false
    }
  }

  // Réinitialiser le mot de passe
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      return {
        success: true,
        message: 'Email de réinitialisation envoyé !'
      }
    } catch (error: any) {
      console.error('Erreur de réinitialisation:', error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la réinitialisation'
      }
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(updates: { name?: string; role?: string }) {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) throw error

      return {
        success: true,
        message: 'Profil mis à jour !'
      }
    } catch (error: any) {
      console.error('Erreur de mise à jour du profil:', error)
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour'
      }
    }
  }
}

export default SupabaseAuthService
