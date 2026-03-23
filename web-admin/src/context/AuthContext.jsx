import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

/**
 * Secure auth provider:
 * - Stores JWT in memory (not localStorage) to mitigate XSS
 * - Persists refresh token in localStorage (opaque token, not a JWT)
 * - Auto-refreshes access token before expiry
 * - Exposes user role for RBAC
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Attach token via interceptor (from memory, not localStorage)
  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use((config) => {
      if (tokenRef.current) {
        config.headers.Authorization = `Bearer ${tokenRef.current}`;
      }
      return config;
    });

    return () => api.interceptors.request.eject(reqInterceptor);
  }, []);

  const scheduleRefresh = useCallback((expiresIn) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60s before expiry (or half of expiresIn if short)
    const delay = Math.max((expiresIn - 60) * 1000, 30000);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return;
        const { data } = await api.post('/auth/refresh', { refreshToken });
        tokenRef.current = data.token;
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        scheduleRefresh(data.expiresIn || 3600);
      } catch {
        // refresh failed — force logout
        tokenRef.current = null;
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      }
    }, delay);
  }, []);

  // Boot: try to restore session with saved refresh token
  useEffect(() => {
    const boot = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');

      if (!refreshToken || !savedUser) {
        // Fall back: try legacy token from localStorage (migration path)
        const legacyToken = localStorage.getItem('token');
        if (legacyToken) {
          tokenRef.current = legacyToken;
          try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } catch {
            tokenRef.current = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
        setLoading(false);
        return;
      }

      try {
        // Get a fresh access token using the refresh token
        const { data } = await api.post('/auth/refresh', { refreshToken });
        tokenRef.current = data.token;
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user || JSON.parse(savedUser));
        scheduleRefresh(data.expiresIn || 3600);
      } catch {
        // Refresh token expired — clean up
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    boot();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenRef.current = data.token;
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Remove legacy token key
    localStorage.removeItem('token');
    setUser(data.user);
    scheduleRefresh(data.expiresIn || 3600);
    return data;
  };

  const signup = async ({ propertyName, firstName, lastName, email, password, phone, currency, timezone }) => {
    const { data } = await api.post('/auth/signup', { propertyName, firstName, lastName, email, password, phone, currency, timezone });

    // Auto-login after signup — property is auto-approved
    if (data.token) {
      tokenRef.current = data.token;
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      scheduleRefresh(data.expiresIn || 3600);
    }
    return data;
  };

  const logout = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Call server-side logout to invalidate refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }); } catch { /* ignore */ }
    }
    tokenRef.current = null;
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const { data } = await api.put('/auth/profile', updates);
    const updatedUser = { ...user, ...data.user };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
    return data;
  };

  const changePlan = async (plan) => {
    const { data } = await api.put('/auth/subscription', { plan });
    const updatedUser = { ...user, subscriptionPlan: plan };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return data;
  };

  const getSubscriptionInfo = async () => {
    const { data } = await api.get('/auth/subscription');
    return data;
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    changePlan,
    getSubscriptionInfo,
    loading,
    isAuthenticated: !!user,
    /** Checks if user has one of the allowed roles (system_admin passes all) */
    hasRole: (...roles) => user?.role === 'system_admin' || (user?.role && roles.includes(user.role)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
