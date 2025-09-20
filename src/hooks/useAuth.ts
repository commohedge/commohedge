import { useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  role: string;
  loginTime: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const authStatus = localStorage.getItem('fx_hedging_auth');
      const userData = localStorage.getItem('fx_hedging_user');
      
      if (authStatus === 'true' && userData) {
        const parsedUser = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(parsedUser);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (email: string, userData: User) => {
    localStorage.setItem('fx_hedging_auth', 'true');
    localStorage.setItem('fx_hedging_user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('fx_hedging_auth');
    localStorage.removeItem('fx_hedging_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuthStatus
  };
};
