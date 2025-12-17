import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // 检查是否存在有效的认证令牌
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = token;
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
    axios.defaults.headers.common['Authorization'] = token;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    isAuthenticated,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
