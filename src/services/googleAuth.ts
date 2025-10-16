/**
 * Google OAuth 2.0 Authentication Service
 * Handles OAuth flow with PKCE, token management, and refresh
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const SCOPE = 'https://www.googleapis.com/auth/calendar'; // Full calendar access including free/busy

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_access_token',
  REFRESH_TOKEN: 'google_refresh_token',
  EXPIRES_AT: 'google_token_expires_at',
  CODE_VERIFIER: 'google_code_verifier'
} as const;

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

/**
 * Generate random string for PKCE
 */
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

/**
 * Generate SHA256 hash for PKCE challenge
 */
const sha256 = async (plain: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

/**
 * Get the OAuth authorization URL with PKCE
 */
export const getAuthUrl = async (): Promise<string> => {
  // Generate code verifier and challenge for PKCE
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);

  // Store code verifier for later use
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);

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

/**
 * Initiate OAuth sign-in flow
 */
export const signIn = async (): Promise<void> => {
  try {
    const authUrl = await getAuthUrl();
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating sign-in:', error);
    throw new Error('Failed to start authentication');
  }
};

/**
 * Handle OAuth callback and exchange code for tokens
 */
export const handleCallback = async (code: string): Promise<TokenData> => {
  const codeVerifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);

  if (!codeVerifier) {
    throw new Error('Code verifier not found - authentication flow incomplete');
  }

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID || '',
      client_secret: CLIENT_SECRET || '',
      code: code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI || ''
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData: TokenErrorData = await response.json();
      throw new Error(errorData.error_description || 'Token exchange failed');
    }

    const data: TokenData = await response.json();

    // Store tokens
    storeTokens(data);

    // Clean up code verifier
    localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

    return data;
  } catch (error) {
    console.error('Error handling callback:', error);
    throw error;
  }
};

/**
 * Store tokens in localStorage
 */
const storeTokens = (tokenData: TokenData): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);

  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  }

  // Calculate expiration time (current time + expires_in seconds)
  const expiresAt = Date.now() + (tokenData.expires_in * 1000);
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
};

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!token || !expiresAt) {
    return false;
  }

  // Check if token is expired
  return Date.now() < parseInt(expiresAt);
};

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export const needsRefresh = (): boolean => {
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!expiresAt) {
    return true;
  }

  // Refresh if expiring within 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() + fiveMinutes >= parseInt(expiresAt);
};

/**
 * Refresh the access token using refresh token
 */
export const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID || '',
      client_secret: CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData: TokenErrorData = await response.json();
      throw new Error(errorData.error_description || 'Token refresh failed');
    }

    const data: TokenData = await response.json();

    // Store new access token
    storeTokens({
      ...data,
      refresh_token: refreshToken // Keep existing refresh token
    });

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // If refresh fails, clear tokens and force re-authentication
    signOut();
    throw error;
  }
};

/**
 * Get valid access token (refresh if needed)
 */
export const getValidAccessToken = async (): Promise<string> => {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  if (needsRefresh()) {
    return await refreshAccessToken();
  }

  return getAccessToken() || '';
};

/**
 * Sign out and clear all stored tokens
 */
export const signOut = (): void => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
};

/**
 * Handle errors from Google API calls
 */
export const handleApiError = async (response: Response): Promise<void> => {
  if (response.status === 401) {
    // Unauthorized - try to refresh token
    try {
      await refreshAccessToken();
      // Retry the request should be handled by caller
      return;
    } catch (refreshError) {
      throw new Error('Authentication failed. Please sign in again.');
    }
  } else if (response.status === 403) {
    throw new Error('Permission denied. Please check calendar access permissions.');
  } else if (response.status === 429) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  } else if (response.status >= 500) {
    throw new Error('Google Calendar service error. Please try again later.');
  } else {
    const errorData: TokenErrorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || 'An error occurred');
  }
};
