import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);
  const [warmupAttempt, setWarmupAttempt] = useState(0);
  const [warmupError, setWarmupError] = useState(false);
  const warmupTimer = useRef(null);

  // Mark backend ready (callable from anywhere)
  const markReady = useCallback(() => {
    if (!backendReady) {
      setBackendReady(true);
      setWarmupError(false);
      clearTimeout(warmupTimer.current);
    }
  }, [backendReady]);

  useEffect(() => {
    // 🔥 ALWAYS RESET ON APP START
    setUser(null);
    setToken(null);
    setLoading(false);

    // 🚀 Pre-warm backend with exponential backoff
    let attempt = 0;
    const wakeUpBackend = async () => {
      attempt++;
      setWarmupAttempt(attempt);
      setWarmupError(false);
      try {
        await client.get('/health');
        setBackendReady(true);
      } catch (err) {
        console.warn(`Backend wake-up attempt ${attempt} failed...`);
        setWarmupError(true);
        // Exponential backoff: 3s, 4s, 5s, 6s... capped at 8s
        const delay = Math.min(3000 + attempt * 1000, 8000);
        warmupTimer.current = setTimeout(wakeUpBackend, delay);
      }
    };
    wakeUpBackend();

    // 🧠 Also mark ready if ANY successful API response arrives first
    const interceptorId = client.interceptors.response.use(
      (res) => {
        setBackendReady(true);
        return res;
      },
      (err) => Promise.reject(err)
    );

    return () => {
      clearTimeout(warmupTimer.current);
      client.interceptors.response.eject(interceptorId);
    };
  }, []);

  // ✅ LOGIN
  const login = async (ticketData) => {
    const res = await client.post('/auth/scan', ticketData);
    const { token: jwt, user: userData } = res.data;

    localStorage.setItem('accesspass_token', jwt);
    localStorage.setItem('accesspass_user', JSON.stringify(userData));

    setToken(jwt);
    setUser(userData);

    return userData;
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem('accesspass_token');
    localStorage.removeItem('accesspass_user');

    // Clear session caches on logout
    sessionStorage.removeItem('accesspass_stalls_cache');
    sessionStorage.removeItem('accesspass_orders_cache');

    setToken(null);
    setUser(null);
  };

  // ✅ UPDATE USER
  const updateUser = (updates) => {
    if (!user) return;

    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('accesspass_user', JSON.stringify(updated));
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        backendReady,
        warmupAttempt,
        warmupError,
        login,
        logout,
        updateUser,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}