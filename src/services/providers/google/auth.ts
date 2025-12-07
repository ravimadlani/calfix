/**
 * Google Calendar OAuth Authentication Service
 *
 * SECURITY NOTE: This module has been updated to remove client-side secrets.
 * Access tokens are now fetched from the server via /api/calendar/token endpoint,
 * which retrieves them securely from Clerk's OAuth token storage.
 *
 * The OAuth flow still uses PKCE for initial authorization, but token refresh
 * is now handled server-side through Clerk.
 */

import type { CalendarProviderId } from '../../../types';
import {
  clearEphemeral,
  clearTokens,
  getEphemeral,
  getTokens,
  setEphemeral,
  storeTokens
} from '../tokenStorage';
import type { CalendarProviderAuth } from '../CalendarProvider';

const PROVIDER_ID: CalendarProviderId = 'google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// REMOVED: CLIENT_SECRET - no longer stored client-side for security
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const SCOPE = 'https://www.googleapis.com/auth/calendar';

const CODE_VERIFIER_KEY = 'code_verifier';

// Flag to use Clerk token endpoint instead of local token refresh
const USE_CLERK_TOKENS = true;

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface TokenErrorData {
  error?: string;
  error_description?: string;
}

const generateRandomString = (length: number): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
};

const sha256 = async (plain: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const buildAuthUrl = async (): Promise<string> => {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);

  setEphemeral(PROVIDER_ID, CODE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    redirect_uri: REDIRECT_URI || '',
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const storeTokenResponse = (data: TokenData) => {
  storeTokens(PROVIDER_ID, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type
  });
};

const isTokenExpired = (): boolean => {
  const { expiresAt } = getTokens(PROVIDER_ID);
  if (!expiresAt) {
    return true;
  }

  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() + fiveMinutes >= expiresAt;
};

/**
 * Fetch access token from Clerk via our server-side token endpoint.
 * This is the secure way to get tokens - Clerk stores the refresh token
 * and handles token refresh automatically.
 */
const fetchTokenFromClerk = async (): Promise<string> => {
  // Get Clerk session token to authenticate with our API
  const clerkToken = await getClerkSessionToken();
  if (!clerkToken) {
    throw new Error('No Clerk session - please sign in');
  }

  const response = await fetch('/api/calendar/token?provider=google', {
    headers: {
      Authorization: `Bearer ${clerkToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Google Calendar not connected - please connect via Settings');
    }
    throw new Error('Failed to get access token from server');
  }

  const data = await response.json();
  return data.access_token;
};

/**
 * Get Clerk session token for API authentication.
 * This uses Clerk's client-side SDK.
 */
const getClerkSessionToken = async (): Promise<string | null> => {
  try {
    // Access Clerk from window object (set by ClerkProvider)
    const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
    if (clerk?.session) {
      return await clerk.session.getToken();
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Refresh access token - now uses Clerk's server-side token management.
 * Falls back to legacy refresh if Clerk tokens not available.
 */
const refreshAccessToken = async (): Promise<string> => {
  // Use Clerk token endpoint (secure, no client secret needed)
  if (USE_CLERK_TOKENS) {
    return await fetchTokenFromClerk();
  }

  // Legacy fallback (deprecated - will be removed)
  const { refreshToken } = getTokens(PROVIDER_ID);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // NOTE: This legacy path no longer works without client secret
  // It's kept for reference but will throw an error
  throw new Error('Legacy token refresh disabled - please reconnect via Clerk OAuth');
};

const getValidAccessToken = async (): Promise<string> => {
  const { accessToken } = getTokens(PROVIDER_ID);

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  if (isTokenExpired()) {
    return await refreshAccessToken();
  }

  return accessToken;
};

/**
 * Handle OAuth callback - DEPRECATED for Clerk OAuth users.
 * This function is kept for backwards compatibility with direct OAuth flows,
 * but users should connect Google Calendar through Clerk OAuth instead.
 *
 * Note: This uses PKCE without client_secret. Google requires proper OAuth
 * client configuration (public client) for this to work.
 */
const handleCallback = async (code: string): Promise<void> => {
  // When using Clerk OAuth, users shouldn't reach this flow
  if (USE_CLERK_TOKENS) {
    throw new Error('Please connect Google Calendar through your account settings');
  }

  const codeVerifier = getEphemeral(PROVIDER_ID, CODE_VERIFIER_KEY);

  if (!codeVerifier) {
    throw new Error('Code verifier not found - authentication flow incomplete');
  }

  // Using PKCE flow - no client_secret needed for public clients
  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI || ''
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorData: TokenErrorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || 'Token exchange failed');
  }

  const data: TokenData = await response.json();
  storeTokenResponse(data);
  clearEphemeral(PROVIDER_ID, CODE_VERIFIER_KEY);
};

const signIn = async (): Promise<void> => {
  const authUrl = await buildAuthUrl();
  window.location.href = authUrl;
};

const signOut = async (): Promise<void> => {
  clearTokens(PROVIDER_ID);
  clearEphemeral(PROVIDER_ID);
};

const isAuthenticated = (): boolean => {
  const { accessToken, expiresAt } = getTokens(PROVIDER_ID);
  if (!accessToken || !expiresAt) {
    return false;
  }
  return Date.now() < expiresAt;
};

const forceReauthentication = async (): Promise<void> => {
  await signOut();
  await signIn();
};

export const googleAuth: CalendarProviderAuth & {
  getValidAccessToken: () => Promise<string>;
  refreshAccessToken: () => Promise<string>;
  getProviderId: () => CalendarProviderId;
} = {
  signIn,
  signOut,
  handleCallback,
  isAuthenticated,
  getValidAccessToken,
  forceReauthentication,
  refreshAccessToken,
  getProviderId: () => PROVIDER_ID
};

export const GOOGLE_PROVIDER_ID = PROVIDER_ID;
export const getGoogleAccessToken = getValidAccessToken;
export const refreshGoogleAccessToken = refreshAccessToken;
