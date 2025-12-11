import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Custom hook to create a Supabase client with Clerk authentication
 * This automatically sets the Clerk session token as the Supabase auth token
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        // Fetch function that automatically includes Clerk token
        fetch: async (url, options = {}) => {
          const clerkToken = await getToken({ template: 'supabase' });

          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }

          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
    });
  }, [getToken]);

  return supabase;
}

/**
 * Create a standalone Supabase client (for use outside React components)
 * Note: This won't have automatic Clerk authentication - use for public data only
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
