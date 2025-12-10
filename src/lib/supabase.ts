import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Custom hook to create a Supabase client
 * Note: Using anon key with permissive RLS policies.
 * User filtering is done in application code via user_id column.
 * TODO: Set up Clerk JWT template for proper Supabase auth integration
 */
export function useSupabaseClient() {
  const supabase = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  return supabase;
}

/**
 * Create a standalone Supabase client (for use outside React components)
 * Note: This won't have automatic Clerk authentication - use for public data only
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
