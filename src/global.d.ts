/**
 * Global type declarations
 */

// Google API (GAPI) types
interface Window {
  gapi: {
    load: (apiName: string, callback: () => void) => void;
    client: {
      setToken: (token: { access_token: string }) => void;
      load: (apiName: string, version: string) => Promise<void>;
      calendar: {
        freebusy: {
          query: (request: any) => Promise<any>;
        };
      };
    };
  };
}
