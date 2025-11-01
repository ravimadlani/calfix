import type { CalendarProviderId } from '../../types';

const STORAGE_PREFIX = 'calfix.provider';
const USER_CONTEXT_STORAGE_KEY = `${STORAGE_PREFIX}.current_user`;
const SESSION_EPHEMERAL_PREFIX = `${STORAGE_PREFIX}.session.ephemeral`;
const SHARED_SEGMENT = 'shared';

let currentUserId: string | null = null;

const getLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Unable to access localStorage', error);
    return null;
  }
};

const getSessionStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('Unable to access sessionStorage', error);
    return null;
  }
};

const localStorageRef = getLocalStorage();

if (localStorageRef) {
  try {
    const storedContext = localStorageRef.getItem(USER_CONTEXT_STORAGE_KEY);
    if (storedContext) {
      currentUserId = storedContext;
    }
  } catch (error) {
    console.warn('Unable to read stored token user context', error);
  }
}

const getUserSegment = () => (currentUserId ? `user.${currentUserId}` : SHARED_SEGMENT);

const buildSegmentKey = (segment: string, providerId: CalendarProviderId, suffix: string) => {
  return `${STORAGE_PREFIX}.${segment}.${providerId}.${suffix}`;
};

const buildKey = (providerId: CalendarProviderId, suffix: string): string => {
  return buildSegmentKey(getUserSegment(), providerId, suffix);
};

const buildSharedKey = (providerId: CalendarProviderId, suffix: string): string => {
  return buildSegmentKey(SHARED_SEGMENT, providerId, suffix);
};

const buildSessionEphemeralKey = (providerId: CalendarProviderId, key: string): string => {
  return `${SESSION_EPHEMERAL_PREFIX}.${providerId}.${key}`;
};

const migrateSharedEntriesToUser = (userId: string) => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  const sharedPrefix = `${STORAGE_PREFIX}.${SHARED_SEGMENT}.`;
  const userPrefix = `${STORAGE_PREFIX}.user.${userId}.`;

  const keysToMigrate: string[] = [];

  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && key.startsWith(sharedPrefix)) {
      keysToMigrate.push(key);
    }
  }

  keysToMigrate.forEach(key => {
    const value = storage.getItem(key);
    storage.removeItem(key);
    if (value !== null) {
      const userKey = key.replace(sharedPrefix, userPrefix);
      storage.setItem(userKey, value);
    }
  });
};

export const setTokenUserContext = (userId: string | null) => {
  currentUserId = userId;

  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    if (userId) {
      storage.setItem(USER_CONTEXT_STORAGE_KEY, userId);
      migrateSharedEntriesToUser(userId);
    } else {
      storage.removeItem(USER_CONTEXT_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Unable to persist token user context', error);
  }
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
  const storage = getLocalStorage();
  if (storage) {
    storage.setItem(buildKey(providerId, `ephemeral.${key}`), value);
  }

  const sessionStorageRef = getSessionStorage();
  if (sessionStorageRef) {
    sessionStorageRef.setItem(buildSessionEphemeralKey(providerId, key), value);
  }
};

export const getEphemeral = (providerId: CalendarProviderId, key: string): string | null => {
  const storage = getLocalStorage();
  const primaryKey = buildKey(providerId, `ephemeral.${key}`);
  const fallbackSharedKey = buildSharedKey(providerId, `ephemeral.${key}`);

  if (storage) {
    const storedValue = storage.getItem(primaryKey);
    if (storedValue !== null) {
      return storedValue;
    }

    const sharedValue = storage.getItem(fallbackSharedKey);
    if (sharedValue !== null) {
      if (currentUserId) {
        storage.setItem(primaryKey, sharedValue);
        storage.removeItem(fallbackSharedKey);
      }
      return sharedValue;
    }
  }

  const sessionStorageRef = getSessionStorage();
  if (sessionStorageRef) {
    const sessionValue = sessionStorageRef.getItem(buildSessionEphemeralKey(providerId, key));
    if (sessionValue !== null) {
      if (storage && currentUserId) {
        storage.setItem(primaryKey, sessionValue);
      }
      return sessionValue;
    }
  }

  return null;
};

export const clearEphemeral = (providerId: CalendarProviderId, key?: string): void => {
  const storage = getLocalStorage();
  const sessionStorageRef = getSessionStorage();

  if (key) {
    if (storage) {
      storage.removeItem(buildKey(providerId, `ephemeral.${key}`));
      storage.removeItem(buildSharedKey(providerId, `ephemeral.${key}`));
    }

    if (sessionStorageRef) {
      sessionStorageRef.removeItem(buildSessionEphemeralKey(providerId, key));
    }
    return;
  }

  if (storage) {
    const segmentPrefix = `${STORAGE_PREFIX}.${getUserSegment()}.${providerId}.ephemeral.`;
    const sharedPrefix = `${STORAGE_PREFIX}.${SHARED_SEGMENT}.${providerId}.ephemeral.`;

    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const storageKey = storage.key(index);
      if (
        storageKey &&
        (storageKey.startsWith(segmentPrefix) || storageKey.startsWith(sharedPrefix))
      ) {
        keysToRemove.push(storageKey);
      }
    }

    keysToRemove.forEach(storageKey => storage.removeItem(storageKey));
  }

  if (sessionStorageRef) {
    const sessionPrefix = `${SESSION_EPHEMERAL_PREFIX}.${providerId}.`;
    const keysToRemove: string[] = [];
    for (let index = 0; index < sessionStorageRef.length; index++) {
      const sessionKey = sessionStorageRef.key(index);
      if (sessionKey && sessionKey.startsWith(sessionPrefix)) {
        keysToRemove.push(sessionKey);
      }
    }
    keysToRemove.forEach(sessionKey => sessionStorageRef.removeItem(sessionKey));
  }
};
