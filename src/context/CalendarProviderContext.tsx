import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { useUser } from '@clerk/clerk-react';
import type {
  CalendarProviderId,
  CalendarProviderMetadata
} from '../types';
import type { CalendarProvider } from '../services/providers/CalendarProvider';
import {
  getCalendarProvider,
  getProviderMetadata,
  isProviderImplemented
} from '../services/providers/providerRegistry';
import { setTokenUserContext } from '../services/providers/tokenStorage';

type ProviderConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ProviderState {
  status: ProviderConnectionStatus;
  lastError?: string | null;
}

interface CalendarProviderContextValue {
  providerMetadata: CalendarProviderMetadata[];
  activeProviderId: CalendarProviderId;
  activeProvider: CalendarProvider;
  setActiveProvider(providerId: CalendarProviderId): void;
  getProvider(providerId: CalendarProviderId): CalendarProvider;
  isProviderImplemented(providerId: CalendarProviderId): boolean;
  signIn(providerId: CalendarProviderId): Promise<void>;
  signOut(providerId: CalendarProviderId): Promise<void>;
  handleCallback(providerId: CalendarProviderId, code: string): Promise<void>;
  isAuthenticated(providerId: CalendarProviderId): boolean;
  getStatus(providerId: CalendarProviderId): ProviderConnectionStatus;
  getLastError(providerId: CalendarProviderId): string | null | undefined;
}

const STORAGE_KEY = 'calfix.activeCalendarProvider';

const CalendarProviderContext = createContext<CalendarProviderContextValue | undefined>(undefined);

const defaultProviderId: CalendarProviderId = 'google';

const ensureImplemented = (providerId: CalendarProviderId) => {
  if (!isProviderImplemented(providerId)) {
    throw new Error(`Provider ${providerId} is not yet implemented`);
  }
};

const INITIAL_PROVIDER_STATE: Record<CalendarProviderId, ProviderState> = {
  google: { status: 'disconnected' },
  outlook: { status: 'disconnected' }
};

export const CalendarProviderContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const providerMetadata = useMemo(() => getProviderMetadata(), []);
  const { user, isLoaded } = useUser();

  const [activeProviderId, setActiveProviderId] = useState<CalendarProviderId>(() => {
    if (typeof window === 'undefined') {
      return defaultProviderId;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isProviderImplemented(stored as CalendarProviderId)) {
        return stored as CalendarProviderId;
      }
    } catch (error) {
      console.warn('Unable to read stored provider selection', error);
    }
    return defaultProviderId;
  });

  const [providerStates, setProviderStates] = useState<Record<CalendarProviderId, ProviderState>>({
    ...INITIAL_PROVIDER_STATE
  });

  const providerCache = useRef<Partial<Record<CalendarProviderId, CalendarProvider>>>({});
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, activeProviderId);
    } catch (error) {
      console.warn('Unable to persist provider selection', error);
    }
  }, [activeProviderId]);

  const getProvider = useCallback((providerId: CalendarProviderId) => {
    ensureImplemented(providerId);

    if (!providerCache.current[providerId]) {
      providerCache.current[providerId] = getCalendarProvider(providerId);
    }

    return providerCache.current[providerId]!;
  }, []);

  const refreshProviderState = useCallback((providerId: CalendarProviderId) => {
    if (!isProviderImplemented(providerId)) {
      return;
    }

    try {
      const provider = getProvider(providerId);
      const isAuthed = provider.auth.isAuthenticated();
      setProviderStates(prev => ({
        ...prev,
        [providerId]: {
          status: isAuthed ? 'connected' : 'disconnected',
          lastError: null
        }
      }));
    } catch (error) {
      setProviderStates(prev => ({
        ...prev,
        [providerId]: {
          status: 'error',
          lastError: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  }, [getProvider]);

  useEffect(() => {
    providerMetadata
      .filter(meta => isProviderImplemented(meta.id))
      .forEach(meta => refreshProviderState(meta.id));
  }, [providerMetadata, refreshProviderState]);

  const activeProvider = useMemo(() => getProvider(activeProviderId), [activeProviderId, getProvider]);

  const setActiveProviderSafe = useCallback((providerId: CalendarProviderId) => {
    if (!isProviderImplemented(providerId)) {
      console.warn(`Provider ${providerId} is not yet implemented; selection ignored.`);
      return;
    }
    setActiveProviderId(providerId);
  }, []);

  const signIn = useCallback(async (providerId: CalendarProviderId) => {
    ensureImplemented(providerId);

    setProviderStates(prev => ({
      ...prev,
      [providerId]: {
        status: 'connecting',
        lastError: null
      }
    }));

    try {
      await getProvider(providerId).auth.signIn();
    } catch (error) {
      console.error('Calendar provider sign-in error', error);
      setProviderStates(prev => ({
        ...prev,
        [providerId]: {
          status: 'error',
          lastError: error instanceof Error ? error.message : String(error)
        }
      }));
      throw error;
    }
  }, [getProvider]);

  const signOut = useCallback(async (providerId: CalendarProviderId) => {
    if (!isProviderImplemented(providerId)) {
      return;
    }

    try {
      await getProvider(providerId).auth.signOut();
    } finally {
      refreshProviderState(providerId);
    }
  }, [getProvider, refreshProviderState]);

  const handleCallback = useCallback(async (providerId: CalendarProviderId, code: string) => {
    ensureImplemented(providerId);

    try {
      await getProvider(providerId).auth.handleCallback(code);
      refreshProviderState(providerId);
    } catch (error) {
      console.error('Calendar provider callback error', error);
      setProviderStates(prev => ({
        ...prev,
        [providerId]: {
          status: 'error',
          lastError: error instanceof Error ? error.message : String(error)
        }
      }));
      throw error;
    }
  }, [getProvider, refreshProviderState]);

  const isAuthenticated = useCallback((providerId: CalendarProviderId) => {
    if (!isProviderImplemented(providerId)) {
      return false;
    }

    try {
      return getProvider(providerId).auth.isAuthenticated();
    } catch (error) {
      console.warn('Calendar provider auth status error', error);
      return false;
    }
  }, [getProvider]);

  const getStatus = useCallback((providerId: CalendarProviderId): ProviderConnectionStatus => {
    return providerStates[providerId]?.status || 'disconnected';
  }, [providerStates]);

  const getLastError = useCallback((providerId: CalendarProviderId) => {
    return providerStates[providerId]?.lastError;
  }, [providerStates]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      try {
        setTokenUserContext(previousUserId);
        providerMetadata
          .filter(meta => isProviderImplemented(meta.id))
          .forEach(meta => {
            try {
              getCalendarProvider(meta.id).auth.signOut();
            } catch (error) {
              console.warn('Error signing out provider during user switch', error);
            }
          });
      } finally {
        providerCache.current = {};
        setProviderStates({ ...INITIAL_PROVIDER_STATE });
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem('managed_calendar_id');
          } catch (error) {
            console.warn('Unable to clear stored provider selection', error);
          }
        }
        setActiveProviderId(defaultProviderId);
      }
    }

    setTokenUserContext(nextUserId);
    previousUserIdRef.current = nextUserId;
  }, [isLoaded, providerMetadata, setActiveProviderId, user?.id]);

  const value = useMemo<CalendarProviderContextValue>(() => ({
    providerMetadata,
    activeProviderId,
    activeProvider,
    setActiveProvider: setActiveProviderSafe,
    getProvider,
    isProviderImplemented,
    signIn,
    signOut,
    handleCallback,
    isAuthenticated,
    getStatus,
    getLastError
  }), [
    activeProvider,
    activeProviderId,
    getProvider,
    getLastError,
    getStatus,
    handleCallback,
    isAuthenticated,
    providerMetadata,
    setActiveProviderSafe,
    signIn,
    signOut
  ]);

  return (
    <CalendarProviderContext.Provider value={value}>
      {children}
    </CalendarProviderContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCalendarProvider = (): CalendarProviderContextValue => {
  const context = useContext(CalendarProviderContext);
  if (!context) {
    throw new Error('useCalendarProvider must be used within a CalendarProviderContextProvider');
  }
  return context;
};
