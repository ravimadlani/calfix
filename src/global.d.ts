/**
 * Global type declarations
 */

import type { FreeBusyResponse } from './types';

// Google API (GAPI) types
interface Window {
  gapi: {
    load: (apiName: string, callback: () => void) => void;
    client: {
      setToken: (token: { access_token: string }) => void;
      load: (apiName: string, version: string) => Promise<void>;
      calendar: {
        freebusy: {
          query: (request: {
            timeMin: string;
            timeMax: string;
            timeZone: string;
            items: Array<{ id: string }>;
          }) => Promise<{ result: FreeBusyResponse }>;
        };
      };
    };
  };
}
