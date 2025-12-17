import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否存在有效的认证令牌
    const token = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');
    if (token) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
      axios.defaults.headers.common['Authorization'] = token;
    }
    // 初始化完成，可以进行路由判断
    setIsLoading(false);
  }, []);

  const login = (token: string, user: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', user);
    setIsAuthenticated(true);
    setUsername(user);
    axios.defaults.headers.common['Authorization'] = token;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    isAuthenticated,
    isLoading,
    username,
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
