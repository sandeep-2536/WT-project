import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  // Set axios header whenever token changes
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      localStorage.setItem('accessToken', accessToken);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  // Fetch current user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
        setAccessToken(token);
        connectSocket(data.data.user._id);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user: u, accessToken: at, refreshToken: rt } = data.data;
    setUser(u);
    setAccessToken(at);
    localStorage.setItem('refreshToken', rt);
    connectSocket(u._id);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    const { user: u, accessToken: at, refreshToken: rt } = data.data;
    setUser(u);
    setAccessToken(at);
    localStorage.setItem('refreshToken', rt);
    connectSocket(u._id);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
