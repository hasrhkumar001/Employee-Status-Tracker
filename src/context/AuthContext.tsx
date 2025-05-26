import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  teams?: string[];
  projects?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: () => {},
  clearError: () => {}
};

export const AuthContext = createContext<AuthContextType>(initialState);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState({
    isAuthenticated: false,
    user: null as User | null,
    loading: true,
    error: null as string | null
  });

  // Check if user is already logged in
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setState(prevState => ({ ...prevState, loading: false }));
        return;
      }
      
      try {
        // Set default headers for all axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const res = await axios.get('/api/auth/me');
        
        setState({
          isAuthenticated: true,
          user: res.data,
          loading: false,
          error: null
        });
      } catch (err) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        
        setState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'Session expired, please login again'
        });
      }
    };
    
    loadUser();
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setState({
        isAuthenticated: true,
        user: res.data.user,
        loading: false,
        error: null
      });
    } catch (err: any) {
      setState(prevState => ({
        ...prevState,
        error: err.response?.data?.message || 'Login failed'
      }));
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    
    setState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  };

  // Clear error
  const clearError = () => {
    setState(prevState => ({ ...prevState, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loading: state.loading,
        error: state.error,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};