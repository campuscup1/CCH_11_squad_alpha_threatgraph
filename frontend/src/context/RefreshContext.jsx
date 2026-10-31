import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api';

const RefreshContext = createContext(null);

export function RefreshProvider({ children }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendError, setBackendError] = useState(null);

  const triggerRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const markUpdated = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    let active = true;

    async function checkBackend() {
      try {
        await api.health();
        if (active) {
          setBackendStatus('online');
          setBackendError(null);
        }
      } catch (error) {
        if (active) {
          setBackendStatus('offline');
          setBackendError(error.message);
        }
      }
    }

    if (refreshToken === 0) {
      setBackendStatus('checking');
    }
    checkBackend();
    const interval = setInterval(checkBackend, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshToken]);

  const value = useMemo(
    () => ({
      refreshToken,
      triggerRefresh,
      lastUpdated,
      markUpdated,
      backendStatus,
      backendError,
    }),
    [
      refreshToken,
      triggerRefresh,
      lastUpdated,
      markUpdated,
      backendStatus,
      backendError,
    ],
  );

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used inside a RefreshProvider.');
  }
  return context;
}
