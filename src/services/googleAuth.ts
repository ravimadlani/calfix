import { googleAuth } from './providers/google/auth';
import { handleGoogleApiError } from './providers/google';

export const signIn = () => googleAuth.signIn();
export const signOut = () => googleAuth.signOut();
export const handleCallback = (code: string) => googleAuth.handleCallback(code);
export const isAuthenticated = () => googleAuth.isAuthenticated();
export const getValidAccessToken = () => googleAuth.getValidAccessToken();
export const forceReauthentication = () => googleAuth.forceReauthentication();
export const refreshAccessToken = () => googleAuth.refreshAccessToken();

export { handleGoogleApiError as handleApiError };
