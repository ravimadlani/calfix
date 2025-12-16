/**
 * useOnboardingStatus Hook
 * Determines if a user needs to complete onboarding
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useAuth, useSession } from '@clerk/clerk-react';

export type OnboardingStatus = 'loading' | 'required' | 'completed';

export function useOnboardingStatus() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { session, isLoaded: sessionLoaded } = useSession();
  const [status, setStatus] = useState<OnboardingStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasChecked = useRef(false);

  const checkStatus = useCallback(async () => {
    // Wait for both user AND session to be fully loaded
    if (!userLoaded || !user || !sessionLoaded || !session) {
      return;
    }

    // Prevent duplicate checks
    if (hasChecked.current) {
      return;
    }

    try {
      // Get token - if it fails or returns null, session isn't ready
      const token = await getToken();
      if (!token) {
        console.warn('[useOnboardingStatus] Token not available yet, will retry');
        return; // Stay in loading state, will retry when session updates
      }

      hasChecked.current = true;

      // Check Supabase for onboarding status (source of truth)
      const response = await fetch('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // If 401, token might be stale - allow retry
        if (response.status === 401) {
          hasChecked.current = false;
          console.warn('[useOnboardingStatus] Got 401, will retry');
          return;
        }
        throw new Error('Failed to fetch preferences');
      }

      const prefs = await response.json();

      if (prefs.onboarding_completed) {
        setStatus('completed');
      } else {
        setStatus('required');
      }
    } catch (err) {
      console.error('[useOnboardingStatus] Error checking status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Only default to required after we've confirmed we can't check
      // Keep loading if it's a transient error
      hasChecked.current = false;
      setStatus('required');
    }
  }, [userLoaded, user, sessionLoaded, session, getToken]);

  useEffect(() => {
    if (userLoaded && user && sessionLoaded && session) {
      checkStatus();
    }
  }, [userLoaded, user, sessionLoaded, session, checkStatus]);

  return { status, error, refresh: checkStatus };
}
