/**
 * Shared authentication utilities for API routes
 * Handles Clerk JWT verification and user validation
 */

import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  sessionId?: string;
}

/**
 * Verify Clerk JWT token from request headers
 * @param req - The incoming request
 * @returns Authenticated user information
 * @throws Error if authentication fails
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token with Clerk
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!payload) {
      throw new Error('Invalid token');
    }

    // Extract user information from token
    return {
      userId: payload.sub, // Clerk user ID
      email: payload.email as string | undefined,
      sessionId: payload.sid as string | undefined,
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Verify that a user has access to a specific calendar
 * @param userId - The authenticated user ID
 * @param calendarId - The calendar to check access for
 * @returns True if user has access, false otherwise
 */
export async function verifyCalendarAccess(
  userId: string,
  calendarId: string
): Promise<boolean> {
  try {
    // Handle "primary" alias by checking for the user's primary calendar
    if (calendarId === 'primary') {
      const { data, error } = await supabaseAdmin
        .from('managed_calendars')
        .select('id')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      if (error || !data) {
        return false;
      }
      return true;
    }

    // For non-primary calendars, check by calendar_id
    const { data, error } = await supabaseAdmin
      .from('managed_calendars')
      .select('id')
      .eq('user_id', userId)
      .eq('calendar_id', calendarId)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying calendar access:', error);
    return false;
  }
}

/**
 * Get Supabase admin client (with service role key)
 * Use this for database operations that bypass RLS
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}

/**
 * Verify authentication and return result with authenticated flag
 * Compatible with existing API endpoints
 */
export async function verifyAuth(req: VercelRequest): Promise<{ authenticated: boolean; userId?: string; email?: string }> {
  try {
    const user = await authenticateRequest(req);
    return {
      authenticated: true,
      userId: user.userId,
      email: user.email,
    };
  } catch {
    return {
      authenticated: false,
    };
  }
}