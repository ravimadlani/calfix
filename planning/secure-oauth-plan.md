# Plan: Secure OAuth Flows (Browser-Only Data Plane)

Goal: Keep calendar data flowing directly between the browser and Google/Outlook (no API proxy for event data), while removing client secrets from the bundle and minimizing risk from token handling in the client.

## Constraints
- No calendar/event payloads should transit CalFix servers.
- Server use is allowed only for non-sensitive coordination (e.g., distributing public config, optional token vault), not for data proxying.
- Must work with OAuth for public clients (authorization code + PKCE, no client secret in the browser).

## Approach Overview
- Use the OAuth authorization code with PKCE flow as a public client (no client secret), fully in-browser.
- Prefer short-lived access tokens and avoid storing refresh tokens persistently; if refresh tokens are required, store them only encrypted-at-rest in the client with a key derived from the current Clerk session, and clear on sign-out/context switch.
- Keep calendar API calls direct from the browser to provider endpoints using Bearer tokens set in JS (no server proxy).

## Workstreams
1) **Remove Client Secret Reliance**
   - Update Google/Outlook OAuth config to public-client (no client secret for Google; Outlook SPA flow already omits it).
   - Strip `VITE_GOOGLE_CLIENT_SECRET` from the client bundle and environment docs.

2) **PKCE-Only Auth Flow**
   - Generate `code_verifier`/`code_challenge` in-browser; store verifier only in session memory or sessionStorage.
   - Exchange auth code at the provider’s token endpoint without client secret (allowed for public clients with PKCE).
   - Handle error cases (missing verifier, expired code) with a clean reauth path.

3) **Token Storage Hardening (Client-Side)**
   - Store access tokens in memory (React state/module singleton) and mirror in sessionStorage for tab restore; avoid localStorage.
   - If refresh tokens are needed, encrypt before storage using WebCrypto (AES-GCM) with a key derived from the Clerk session token hash; store only the ciphertext + IV in sessionStorage.
   - On sign-out/user switch, wipe all token storage and zeroize in-memory buffers.

4) **Short-Lived Tokens & Reauth UX**
   - Prefer provider-issued short-lived access tokens; if refresh token is not persisted, prompt for reauth when nearing expiry.
   - Implement proactive token refresh if encrypted refresh token is available; otherwise, trigger a lightweight reauth prompt with preserved UI state.

5) **Runtime Token Handling**
   - Wrap fetch helpers to always pull the current access token from memory; if expired, refresh or reauth before the call.
   - Guard `gapi`-dependent flows (Google free/busy) with a loader and timeout; fail gracefully to a direct REST fallback when possible.

6) **Security Hygiene**
   - No tokens or emails in console logs; add redaction in error paths.
   - Add CSP guidance (script-src, connect-src to Google/Graph) and ensure no third-party scripts can exfiltrate tokens.
   - Validate redirect URI whitelisting in Google/Microsoft console to prevent code interception.

7) **Sign-out & Context Switch**
   - On Clerk sign-out or user change, clear all token stores (memory/sessionStorage) and revoke refresh tokens when possible.
   - Reset provider selection/local state to defaults after clearance.

8) **Fallback Optional Vault (If Needed)**
   - If UX requires silent renew without user prompts, consider an optional server “vault” that stores refresh tokens encrypted and bound to user id; it would only return access tokens, never calendar data. This can be feature-flagged and disabled by default to maintain the data-direct value prop.

9) **Testing & Verification**
   - Unit-test token helpers: PKCE generation, encryption/decryption, expiry checks, clear routines.
   - Integration flow tests in Playwright with mock OAuth servers (no real creds) to verify no tokens land in localStorage and no network calls hit CalFix for calendar data.
   - Manual validation: browser devtools confirms tokens only in memory/sessionStorage (encrypted), no client secret in bundle, and calendar API calls go directly to Google/Outlook domains.

10) **Docs & Migration**
   - Update environment docs to remove secret usage and list required OAuth redirect URIs.
   - Communicate reauth expectations (short-lived tokens) and the optional vault feature flag.
   - Add a “privacy posture” checklist for future features to ensure no accidental server proxying of calendar data.
