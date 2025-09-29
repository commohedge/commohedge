import { supabase } from '../lib/supabase'

export interface User {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  company: string
  phone: string
  role: string
  loginTime: string
}

export interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
  company: string
  phone?: string
  role: string
}

class AuthService {
  private static instance: AuthService

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // Get current user from localStorage
  public getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem('fx_hedging_user')
      if (userData) {
        return JSON.parse(userData)
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
    }
    return null
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    const authStatus = localStorage.getItem('fx_hedging_auth')
    return authStatus === 'true'
  }

  // Sign up new user
  public async signUp(data: SignupData): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            company: data.company,
            phone: data.phone || '',
            role: data.role,
            full_name: `${data.firstName} ${data.lastName}`
          }
        }
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (authData.user) {
        const user: User = {
          id: authData.user.id,
          email: authData.user.email || '',
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
          phone: data.phone || '',
          role: data.role,
          loginTime: new Date().toISOString()
        }

        // Store user data
        this.storeUserData(user)
        
        return { user, error: null }
      }

      return { user: null, error: 'No user data returned' }
    } catch (error: any) {
      return { user: null, error: error.message || 'An error occurred during signup' }
    }
  }

  // Sign in user
  public async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      // Essayer d'abord avec Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Si Supabase échoue, essayer avec un système de fallback pour les comptes de test
        if (email === 'commohedge@test.com' && password === 'test') {
          const fallbackUser: User = {
            id: 'test-user-123',
            email: email,
            name: 'Commodity Hedge Manager',
            firstName: 'Commodity',
            lastName: 'Hedge Manager',
            company: 'Test Company',
            phone: '',
            role: 'Risk Manager',
            loginTime: new Date().toISOString()
          }

          this.storeUserData(fallbackUser)
          return { user: fallbackUser, error: null }
        }
        
        return { user: null, error: error.message }
      }

      if (data.user) {
        const userMetadata = data.user.user_metadata || {}
        
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: userMetadata.full_name || `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() || 'User',
          firstName: userMetadata.first_name || '',
          lastName: userMetadata.last_name || '',
          company: userMetadata.company || '',
          phone: userMetadata.phone || '',
          role: userMetadata.role || 'Risk Manager',
          loginTime: new Date().toISOString()
        }

        // Store user data
        this.storeUserData(user)
        
        return { user, error: null }
      }

      return { user: null, error: 'No user data returned' }
    } catch (error: any) {
      console.error('Supabase auth error:', error)
      
      // Fallback pour les comptes de test en cas d'erreur Supabase
      if (email === 'commohedge@test.com' && password === 'test') {
        const fallbackUser: User = {
          id: 'test-user-123',
          email: email,
          name: 'Commodity Hedge Manager',
          firstName: 'Commodity',
          lastName: 'Hedge Manager',
          company: 'Test Company',
          phone: '',
          role: 'Risk Manager',
          loginTime: new Date().toISOString()
        }

        this.storeUserData(fallbackUser)
        return { user: fallbackUser, error: null }
      }
      
      return { user: null, error: error.message || 'An error occurred during sign in' }
    }
  }

  // Sign out user
  public async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      // Clear local storage
      localStorage.removeItem('fx_hedging_auth')
      localStorage.removeItem('fx_hedging_user')
      
      return { error: error?.message || null }
    } catch (error: any) {
      return { error: error.message || 'An error occurred during sign out' }
    }
  }

  // Store user data in localStorage
  private storeUserData(user: User): void {
    localStorage.setItem('fx_hedging_auth', 'true')
    localStorage.setItem('fx_hedging_user', JSON.stringify(user))
  }

  // Update user profile
  public async updateProfile(updates: Partial<User>): Promise<{ user: User | null; error: string | null }> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { user: null, error: 'No user logged in' }
      }

      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: updates.firstName || currentUser.firstName,
          last_name: updates.lastName || currentUser.lastName,
          company: updates.company || currentUser.company,
          phone: updates.phone || currentUser.phone,
          role: updates.role || currentUser.role,
          full_name: `${updates.firstName || currentUser.firstName} ${updates.lastName || currentUser.lastName}`
        }
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const updatedUser: User = {
          ...currentUser,
          ...updates,
          name: `${updates.firstName || currentUser.firstName} ${updates.lastName || currentUser.lastName}`
        }

        this.storeUserData(updatedUser)
        return { user: updatedUser, error: null }
      }

      return { user: null, error: 'No user data returned' }
    } catch (error: any) {
      return { user: null, error: error.message || 'An error occurred during profile update' }
    }
  }

  // Reset password
  public async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      return { error: error?.message || null }
    } catch (error: any) {
      return { error: error.message || 'An error occurred during password reset' }
    }
  }

  // Listen to auth state changes
  public onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const userMetadata = session.user.user_metadata || {}
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: userMetadata.full_name || `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() || 'User',
          firstName: userMetadata.first_name || '',
          lastName: userMetadata.last_name || '',
          company: userMetadata.company || '',
          phone: userMetadata.phone || '',
          role: userMetadata.role || 'Risk Manager',
          loginTime: new Date().toISOString()
        }
        callback(user)
      } else {
        callback(null)
      }
    })

    return () => subscription.unsubscribe()
  }

  // Get user's strategies from Supabase
  public async getUserStrategies(): Promise<{ strategies: any[]; error: string | null }> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { strategies: [], error: 'No user logged in' }
      }

      const { data, error } = await supabase
        .from('forex_strategies')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        return { strategies: [], error: error.message }
      }

      return { strategies: data || [], error: null }
    } catch (error: any) {
      return { strategies: [], error: error.message || 'An error occurred while fetching strategies' }
    }
  }

  // Save user's strategy to Supabase
  public async saveUserStrategy(strategy: any): Promise<{ strategy: any; error: string | null }> {
    try {
      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { strategy: null, error: 'No user logged in' }
      }

      const { data, error } = await supabase
        .from('forex_strategies')
        .insert([{
          ...strategy,
          user_id: currentUser.id
        }])
        .select()
        .single()

      if (error) {
        return { strategy: null, error: error.message }
      }

      return { strategy: data, error: null }
    } catch (error: any) {
      return { strategy: null, error: error.message || 'An error occurred while saving strategy' }
    }
  }
}

export default AuthService
