import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check authentication on mount
  useEffect(() => {
    const credentials = api.getCredentials();
    if (credentials.userId && credentials.password) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (userId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError("");
    
    try {
      const result = await api.login(userId, password) as any;
      if (result.success) {
        setIsAuthenticated(true);
        return true;
      } else {
        setError(result.error || 'Login failed');
        return false;
      }
    } catch (err) {
      setError('Login failed');
      console.error('Login error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.clearCredentials();
    setIsAuthenticated(false);
    setError("");
  };

  const clearError = () => {
    setError("");
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError
  };
}