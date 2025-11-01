import type { CalendarProviderId } from '../../types';

const STORAGE_PREFIX = 'calfix.provider';

let currentUserId: string | null = null;

const getUserSegment = () => (currentUserId ? `user.${currentUserId}` : 'shared');

export const setTokenUserContext = (userId: string | null) => {
  currentUserId = userId;
};

const buildKey = (providerId: CalendarProviderId, suffix: string): string => {
  return `${STORAGE_PREFIX}.${getUserSegment()}.${providerId}.${suffix}`;
};

export interface StoredTokenInfo {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  scope?: string | null;
  tokenType?: string | null;
}

export interface StoreTokenInput {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

export const storeTokens = (providerId: CalendarProviderId, data: StoreTokenInput): void => {
  localStorage.setItem(buildKey(providerId, 'access_token'), data.accessToken);

  if (data.refreshToken) {
    localStorage.setItem(buildKey(providerId, 'refresh_token'), data.refreshToken);
  }

  const expiresAt = data.expiresAt ?? (Date.now() + (data.expiresIn ?? 0) * 1000);
  if (expiresAt) {
    localStorage.setItem(buildKey(providerId, 'expires_at'), expiresAt.toString());
  }

  if (data.scope) {
    localStorage.setItem(buildKey(providerId, 'scope'), data.scope);
  }

  if (data.tokenType) {
    localStorage.setItem(buildKey(providerId, 'token_type'), data.tokenType);
  }
};

export const getTokens = (providerId: CalendarProviderId): StoredTokenInfo => {
  const accessToken = localStorage.getItem(buildKey(providerId, 'access_token'));
  const refreshToken = localStorage.getItem(buildKey(providerId, 'refresh_token'));
  const expiresAtRaw = localStorage.getItem(buildKey(providerId, 'expires_at'));
  const scope = localStorage.getItem(buildKey(providerId, 'scope'));
  const tokenType = localStorage.getItem(buildKey(providerId, 'token_type'));

  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAtRaw ? parseInt(expiresAtRaw, 10) : null,
    scope,
    tokenType
  };
};

export const clearTokens = (providerId: CalendarProviderId): void => {
  ['access_token', 'refresh_token', 'expires_at', 'scope', 'token_type'].forEach(suffix => {
    localStorage.removeItem(buildKey(providerId, suffix));
  });
};

export const setEphemeral = (providerId: CalendarProviderId, key: string, value: string): void => {
  localStorage.setItem(buildKey(providerId, `ephemeral.${key}`), value);
};

export const getEphemeral = (providerId: CalendarProviderId, key: string): string | null => {
  return localStorage.getItem(buildKey(providerId, `ephemeral.${key}`));
};

export const clearEphemeral = (providerId: CalendarProviderId, key?: string): void => {
  if (key) {
    localStorage.removeItem(buildKey(providerId, `ephemeral.${key}`));
    return;
  }

  Object.keys(localStorage)
    .filter(storageKey => storageKey.startsWith(`${STORAGE_PREFIX}.${getUserSegment()}.${providerId}.ephemeral.`))
    .forEach(storageKey => localStorage.removeItem(storageKey));
};
