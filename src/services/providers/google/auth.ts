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
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const SCOPE = 'https://www.googleapis.com/auth/calendar';

const CODE_VERIFIER_KEY = 'code_verifier';

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

const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken } = getTokens(PROVIDER_ID);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    client_secret: CLIENT_SECRET || '',
    grant_type: 'refresh_token',
    refresh_token: refreshToken
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
    throw new Error(errorData.error_description || 'Token refresh failed');
  }

  const data: TokenData = await response.json();

  storeTokenResponse({
    ...data,
    refresh_token: data.refresh_token || refreshToken
  });

  return data.access_token;
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

const handleCallback = async (code: string): Promise<void> => {
  const codeVerifier = getEphemeral(PROVIDER_ID, CODE_VERIFIER_KEY);

  if (!codeVerifier) {
    throw new Error('Code verifier not found - authentication flow incomplete');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID || '',
    client_secret: CLIENT_SECRET || '',
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
