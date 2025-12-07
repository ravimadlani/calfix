import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { useUser, useAuth } from '@clerk/clerk-react';
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

// Flag to use Clerk OAuth tokens - must match the flag in auth modules
const USE_CLERK_TOKENS = true;

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
  const { getToken } = useAuth();

  // Track which providers have been checked against Clerk OAuth
  const clerkOAuthCheckedRef = useRef<Set<CalendarProviderId>>(new Set());
  // Track which providers are confirmed connected via Clerk OAuth
  const [clerkConnectedProviders, setClerkConnectedProviders] = useState<Set<CalendarProviderId>>(new Set());

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

  /**
   * Check if a provider has OAuth tokens available via Clerk.
   * This is used when USE_CLERK_TOKENS is true to detect calendar connections.
   */
  const checkClerkOAuthStatus = useCallback(async (providerId: CalendarProviderId): Promise<boolean> => {
    if (!USE_CLERK_TOKENS || !user) {
      return false;
    }

    try {
      const clerkToken = await getToken();
      if (!clerkToken) {
        return false;
      }

      // Try to fetch an OAuth token from Clerk via our API
      const response = await fetch(`/api/calendar/token?provider=${providerId}`, {
        headers: {
          Authorization: `Bearer ${clerkToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return !!data.access_token;
      }

      return false;
    } catch (error) {
      console.warn(`[CalendarProvider] Error checking Clerk OAuth for ${providerId}:`, error);
      return false;
    }
  // Note: getToken intentionally excluded - it's stable from Clerk but causes infinite loops if included
  }, [user]);

  /**
   * Check Clerk OAuth status for all implemented providers on mount.
   * This enables auto-detection of calendars connected via Clerk OAuth.
   */
  useEffect(() => {
    if (!USE_CLERK_TOKENS || !isLoaded || !user) {
      return;
    }

    const checkAllProviders = async () => {
      const implementedProviders = providerMetadata.filter(meta => isProviderImplemented(meta.id));
      const newConnected = new Set<CalendarProviderId>();

      for (const provider of implementedProviders) {
        // Skip if already checked
        if (clerkOAuthCheckedRef.current.has(provider.id)) {
          if (clerkConnectedProviders.has(provider.id)) {
            newConnected.add(provider.id);
          }
          continue;
        }

        clerkOAuthCheckedRef.current.add(provider.id);
        const isConnected = await checkClerkOAuthStatus(provider.id);

        if (isConnected) {
          console.log(`[CalendarProvider] ${provider.id} connected via Clerk OAuth`);
          newConnected.add(provider.id);

          // Update provider state to connected
          setProviderStates(prev => ({
            ...prev,
            [provider.id]: {
              status: 'connected',
              lastError: null
            }
          }));
        }
      }

      setClerkConnectedProviders(newConnected);
    };

    checkAllProviders();
  }, [isLoaded, user, providerMetadata, checkClerkOAuthStatus, clerkConnectedProviders]);

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

    // When using Clerk OAuth, redirect to Clerk user profile to connect calendar
    if (USE_CLERK_TOKENS) {
      setProviderStates(prev => ({
        ...prev,
        [providerId]: {
          status: 'connecting',
          lastError: null
        }
      }));

      try {
        // Access Clerk from window object and open user profile for OAuth connection
        const clerk = (window as unknown as { Clerk?: { openUserProfile?: () => void } }).Clerk;
        if (clerk?.openUserProfile) {
          clerk.openUserProfile();
        } else {
          // Fallback: show message to user
          throw new Error('Please click your profile icon in the top right to connect your calendar via your account settings');
        }
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
      return;
    }

    // Legacy OAuth flow (deprecated)
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

    // When using Clerk OAuth, check if provider is in clerkConnectedProviders
    if (USE_CLERK_TOKENS) {
      return clerkConnectedProviders.has(providerId);
    }

    // Legacy: check localStorage tokens
    try {
      return getProvider(providerId).auth.isAuthenticated();
    } catch (error) {
      console.warn('Calendar provider auth status error', error);
      return false;
    }
  }, [getProvider, clerkConnectedProviders]);

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
        // Clear Clerk OAuth state on user switch
        clerkOAuthCheckedRef.current.clear();
        setClerkConnectedProviders(new Set());
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
