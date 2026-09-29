import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bootstrap session from /api/auth/me
  const checkAuth = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data.user);
        setMemberships(res.data.memberships || []);
      } else {
        setUser(null);
        setMemberships([]);
      }
    } catch {
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Handle 401 unauthorized events
    const handleUnauthorized = () => {
      localStorage.removeItem('nexora_token');
      setUser(null);
      setMemberships([]);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) {
      if (res.data.token) {
        localStorage.setItem('nexora_token', res.data.token);
      }
      if (res.data.user) {
        setUser(res.data.user);
      }
      // Re-fetch user + memberships
      await checkAuth();
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    if (res.success && res.data) {
      if (res.data.token) {
        localStorage.setItem('nexora_token', res.data.token);
      }
      if (res.data.user) {
        setUser(res.data.user);
      }
      await checkAuth();
    }
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('nexora_token');
      localStorage.removeItem('nexora_active_org_id');
      setUser(null);
      setMemberships([]);
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        loading,
        login,
        register,
        logout,
        refreshUser: checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
