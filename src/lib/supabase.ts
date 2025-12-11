import { createClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/clerk-react';
import { useMemo } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Custom hook to create a Supabase client with Clerk authentication
 *
 * IMPORTANT: This uses the native Clerk/Supabase third-party integration.
 * JWT templates are DEPRECATED as of April 2025.
 *
 * The accessToken callback provides Clerk's session token directly to Supabase,
 * which validates it using your JWKS endpoint configured in Supabase dashboard.
 *
 * @see https://clerk.com/docs/guides/development/integrations/databases/supabase
 * @see https://supabase.com/docs/guides/auth/third-party/clerk
 */
export function useSupabaseClient() {
  const { session } = useSession();

  const supabase = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        // Native Clerk/Supabase integration - no JWT template needed
        return session?.getToken() ?? null;
      },
    });
  }, [session]);

  return supabase;
}

/**
 * Create a standalone Supabase client (for use outside React components)
 * Note: This won't have automatic Clerk authentication - use for public data only
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
