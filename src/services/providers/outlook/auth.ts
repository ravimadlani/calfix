/**
 * Microsoft Outlook/Office 365 OAuth Authentication Service
 * Implements OAuth 2.0 with PKCE flow for Microsoft Identity Platform
 */

import type { CalendarProviderAuth } from '../CalendarProvider';
import type { CalendarProviderId } from '../../../types';
import { storeTokens, getTokens, clearTokens, setEphemeral, getEphemeral, clearEphemeral } from '../tokenStorage';

// Provider identifier
export const OUTLOOK_PROVIDER_ID: CalendarProviderId = 'outlook';

// OAuth configuration from environment variables
const TENANT_ID = import.meta.env.VITE_OUTLOOK_TENANT_ID || 'common';
const CLIENT_ID = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_OUTLOOK_CLIENT_SECRET; // Optional for PKCE
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:3001/oauth/callback';

// Microsoft Identity Platform endpoints
const AUTH_BASE_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;
const AUTH_ENDPOINT = `${AUTH_BASE_URL}/authorize`;
const TOKEN_ENDPOINT = `${AUTH_BASE_URL}/token`;

// Required scopes for calendar operations
const SCOPES = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/Calendars.ReadWrite.Shared',
  'https://graph.microsoft.com/offline_access',
  'https://graph.microsoft.com/User.Read'
].join(' ');

// PKCE helper functions (similar to Google implementation)
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashed = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hashed);
}

/**
 * Build Microsoft authorization URL with PKCE
 */
async function buildAuthUrl(): Promise<string> {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);

  // Store code verifier for later use in token exchange
  setEphemeral(OUTLOOK_PROVIDER_ID, 'code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    response_mode: 'query',
    prompt: 'select_account' // Allow user to choose account
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
async function exchangeCodeForToken(code: string): Promise<boolean> {
  const codeVerifier = getEphemeral(OUTLOOK_PROVIDER_ID, 'code_verifier');

  if (!codeVerifier) {
    console.error('[Outlook Auth] Missing code verifier for token exchange');
    return false;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier
  });

  // Add client secret if available (not required for PKCE)
  if (CLIENT_SECRET) {
    params.append('client_secret', CLIENT_SECRET);
  }

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Outlook Auth] Token exchange failed:', error);
      return false;
    }

    const data = await response.json();

    // Store tokens
    const tokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    storeTokens(OUTLOOK_PROVIDER_ID, tokenData);

    // Clear ephemeral data
    clearEphemeral(OUTLOOK_PROVIDER_ID, 'code_verifier');

    console.log('[Outlook Auth] Successfully authenticated');
    return true;
  } catch (error) {
    console.error('[Outlook Auth] Token exchange error:', error);
    return false;
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  const tokens = getTokens(OUTLOOK_PROVIDER_ID);

  if (!tokens?.refreshToken) {
    console.error('[Outlook Auth] No refresh token available');
    return false;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    scope: SCOPES
  });

  // Add client secret if available
  if (CLIENT_SECRET) {
    params.append('client_secret', CLIENT_SECRET);
  }

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Outlook Auth] Token refresh failed:', error);

      // If refresh fails, clear tokens and require re-authentication
      if (response.status === 400 || response.status === 401) {
        clearTokens(OUTLOOK_PROVIDER_ID);
      }

      return false;
    }

    const data = await response.json();

    // Update tokens
    const tokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken, // Keep old refresh token if not provided
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope || tokens.scope,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    storeTokens(OUTLOOK_PROVIDER_ID, tokenData);

    console.log('[Outlook Auth] Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('[Outlook Auth] Token refresh error:', error);
    return false;
  }
}

/**
 * Get current access token, refreshing if necessary
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = getTokens(OUTLOOK_PROVIDER_ID);

  if (!tokens) {
    console.log('[Outlook Auth] No tokens found');
    return null;
  }

  // Check if token is expired or about to expire (5 minute buffer)
  const expiresAt = tokens.expiresAt || 0;
  const isExpired = Date.now() >= (expiresAt - 5 * 60 * 1000);

  if (isExpired) {
    console.log('[Outlook Auth] Token expired, refreshing...');
    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      return null;
    }

    // Get updated tokens
    const updatedTokens = getTokens(OUTLOOK_PROVIDER_ID);
    return updatedTokens?.accessToken || null;
  }

  return tokens.accessToken;
}

/**
 * Sign in with Microsoft account
 */
async function signIn(): Promise<void> {
  const authUrl = await buildAuthUrl();
  window.location.href = authUrl;
}

/**
 * Sign out and clear stored tokens
 */
async function signOut(): Promise<void> {
  clearTokens(OUTLOOK_PROVIDER_ID);
  clearEphemeral(OUTLOOK_PROVIDER_ID, 'code_verifier');
  console.log('[Outlook Auth] Signed out successfully');
}

/**
 * Handle OAuth callback
 */
async function handleCallback(code: string): Promise<boolean> {
  return exchangeCodeForToken(code);
}

/**
 * Check if user is authenticated (synchronous check of stored tokens)
 */
function isAuthenticated(): boolean {
  const tokens = getTokens(OUTLOOK_PROVIDER_ID);
  return tokens?.accessToken !== null && tokens?.accessToken !== undefined;
}

/**
 * Get user information
 */
async function getUserInfo(): Promise<unknown> {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('[Outlook Auth] Failed to fetch user info');
      return null;
    }

    const userInfo = await response.json();
    return {
      id: userInfo.id,
      email: userInfo.mail || userInfo.userPrincipalName,
      name: userInfo.displayName,
      givenName: userInfo.givenName,
      familyName: userInfo.surname
    };
  } catch (error) {
    console.error('[Outlook Auth] Error fetching user info:', error);
    return null;
  }
}

/**
 * Export Outlook auth methods conforming to CalendarProviderAuth interface
 */
export const outlookAuth: CalendarProviderAuth = {
  signIn,
  signOut,
  handleCallback: async (code: string) => { await handleCallback(code); }, // Convert boolean return to void
  isAuthenticated,
  getValidAccessToken: async () => await getAccessToken() || '',
  forceReauthentication: signIn
};

// Export additional utilities
export {
  TENANT_ID,
  CLIENT_ID,
  REDIRECT_URI,
  SCOPES,
  getUserInfo
};