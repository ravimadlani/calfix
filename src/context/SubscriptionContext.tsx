import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

/**
 * Subscription data returned from the API.
 */
export interface SubscriptionData {
  hasMultiCalendarAccess: boolean;
  subscriptionTier: string | null;
  isInTrial: boolean;
  daysLeftInTrial: number;
  maxCalendars: number;
}

/**
 * Context value for subscription data.
 */
interface SubscriptionContextValue {
  /** Current subscription data */
  subscription: SubscriptionData | null;
  /** Whether subscription data has been loaded */
  isLoaded: boolean;
  /** Whether subscription data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Force refresh the subscription data */
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Provider component for subscription data.
 *
 * P1-037 FIX: This context caches subscription data to prevent
 * duplicate API calls when multiple CalendarSelectorCard components
 * are mounted.
 */
export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last fetch time for cache invalidation
  const lastFetchTimeRef = useRef<number>(0);
  // Track if a fetch is in progress to prevent duplicate requests
  const fetchInProgressRef = useRef<Promise<void> | null>(null);

  const fetchSubscription = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setSubscription(null);
      setIsLoaded(true);
      return;
    }

    // Check cache validity
    const now = Date.now();
    const cacheValid = now - lastFetchTimeRef.current < CACHE_DURATION;

    if (!forceRefresh && cacheValid && subscription) {
      return; // Use cached data
    }

    // If a fetch is already in progress, wait for it
    if (fetchInProgressRef.current) {
      await fetchInProgressRef.current;
      return;
    }

    // Start new fetch
    const fetchPromise = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const response = await fetch(`/api/user/subscription?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Subscription fetch failed: ${response.status}`);
        }

        const data = await response.json();

        setSubscription({
          hasMultiCalendarAccess: data.hasMultiCalendarAccess,
          subscriptionTier: data.subscriptionTier,
          isInTrial: data.isInTrial,
          daysLeftInTrial: data.daysLeftInTrial,
          maxCalendars: data.maxCalendars,
        });

        lastFetchTimeRef.current = Date.now();
      } catch (err) {
        console.error('[SubscriptionContext] Error fetching subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
        // Set defaults on error
        setSubscription({
          hasMultiCalendarAccess: false,
          subscriptionTier: 'basic',
          isInTrial: false,
          daysLeftInTrial: 0,
          maxCalendars: 1,
        });
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
        fetchInProgressRef.current = null;
      }
    })();

    fetchInProgressRef.current = fetchPromise;
    await fetchPromise;
  }, [user?.id, getToken, subscription]);

  // Fetch subscription on mount and when user changes
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const refresh = useCallback(async () => {
    await fetchSubscription(true);
  }, [fetchSubscription]);

  const value: SubscriptionContextValue = {
    subscription,
    isLoaded,
    isLoading,
    error,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * Hook to access subscription data from context.
 *
 * P1-037 FIX: This hook uses the cached subscription data
 * instead of making a new API call for each component.
 *
 * @throws Error if used outside of SubscriptionProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Hook to get just the subscription data, with a fallback for when not in context.
 * This is useful for gradual migration - components can use this and it will
 * work whether or not the provider is present.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscriptionData(): {
  subscription: SubscriptionData | null;
  isLoaded: boolean;
  isLoading: boolean;
} {
  const context = useContext(SubscriptionContext);

  // If not in context, return loading state
  if (!context) {
    return {
      subscription: null,
      isLoaded: false,
      isLoading: true,
    };
  }

  return {
    subscription: context.subscription,
    isLoaded: context.isLoaded,
    isLoading: context.isLoading,
  };
}
