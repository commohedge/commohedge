import { useState, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';

interface User {
  email: string;
  name: string;
  role: string;
  loginTime: string;
}

export const useAuth = () => {
  // Utiliser uniquement Supabase Auth
  const supabaseAuth = useSupabaseAuth();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Synchroniser avec Supabase Auth
    setIsAuthenticated(supabaseAuth.isAuthenticated);
    setUser(supabaseAuth.user);
    setIsLoading(supabaseAuth.isLoading);
  }, [supabaseAuth.isAuthenticated, supabaseAuth.user, supabaseAuth.isLoading]);

  const login = async (email: string, password: string) => {
    // Rediriger vers Supabase Login
    window.location.href = '/supabase-login';
  };

  const logout = async () => {
    // Utiliser la déconnexion Supabase
    await supabaseAuth.signOut();
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuthStatus: () => supabaseAuth.checkAuthStatus()
  };
};
