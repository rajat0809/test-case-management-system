import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const can = useCallback((action) => {
    if (!user) return false;
    const PERMISSIONS = {
      create: ['admin', 'test-lead'],
      edit: ['admin', 'test-lead'],
      delete: ['admin', 'test-lead'],
      execute: ['admin', 'test-lead', 'tester'],
      manageUsers: ['admin'],
    };
    return PERMISSIONS[action]?.includes(user.role) ?? false;
  }, [user]);

  const value = useMemo(() => ({ user, login, register, logout, can }), [user, login, register, logout, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
