/**
 * useOnboardingStatus Hook
 * Determines if a user needs to complete onboarding
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

export type OnboardingStatus = 'loading' | 'required' | 'completed';

export function useOnboardingStatus() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!userLoaded || !user) return;

    try {
      // Check Supabase for onboarding status (source of truth)
      const token = await getToken();
      const response = await fetch('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
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
      // Default to required if we can't check - this ensures new users go through onboarding
      setStatus('required');
    }
  }, [userLoaded, user, getToken]);

  useEffect(() => {
    if (userLoaded && user) {
      checkStatus();
    }
  }, [userLoaded, user, checkStatus]);

  return { status, error, refresh: checkStatus };
}
