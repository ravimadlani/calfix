# Plan: Server-Side Token Broker (Refresh Tokens in Supabase, Data Direct to Provider)

## Objectives
- Store provider refresh tokens securely on the server (Supabase + pgsodium/Vault) using the service role.
- Keep calendar data flowing directly between browser and Google/Outlook; no event payloads via our server.
- Deliver short-lived access tokens to the browser via httpOnly, secure cookies (or one-time POST), never exposing refresh tokens to the client.

## Architecture
- Browser uses PKCE to get an auth code and calls a backend token-broker endpoint.
- Token broker (Vercel serverless) exchanges the code for tokens, stores refresh token in Supabase (encrypted), returns only a short-lived access token in an httpOnly cookie.
- Browser uses the access token to call Google/Outlook APIs directly. On expiry, browser hits broker to mint a fresh access token (via refresh token in Supabase). No calendar data passes through broker.

## Workstreams
1) **Data Model & Security**
   - Create `provider_tokens` table: `user_id`, `provider_id`, `refresh_token_enc`, `scope`, `expires_at`, `created_at`, `updated_at`, optional `token_metadata`.
   - Enable pgsodium/Vault encrypted columns for `refresh_token_enc` (or store ciphertext/iv with KMS-managed key).
   - RLS: deny all by default; only service role can read/write. No anon/user access.

2) **Env & Config**
   - Server env (Vercel): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (if required), `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET` (if required), `REDIRECT_URI` (server callback).
   - Remove client-bundle secrets (no `VITE_GOOGLE_CLIENT_SECRET`).
   - Configure Google/Microsoft redirect URIs to point to server callback endpoints.

3) **Token Broker Endpoints**
   - `POST /api/auth/{provider}/start` (optional): issue PKCE verifier, set cookie or return values.
   - `POST /api/auth/{provider}/callback`: input `code`, `code_verifier`, Clerk user identity (via JWT). Exchange code → tokens. Store refresh token in Supabase (encrypted). Generate short-lived access token (raw provider token or signed wrapper) and set httpOnly, secure, sameSite=lax cookie (e.g., `calfix_{provider}_at`) with expiry ~= provider access token expiry (e.g., 1h). Do not return refresh token.
   - `POST /api/auth/{provider}/token`: mint new access token using stored refresh token; update storage; set/return access token cookie. Requires Clerk-authenticated user; checks ownership.
   - `POST /api/auth/{provider}/signout`: revoke tokens (if supported), delete row, clear cookies.

4) **Client Changes**
   - Remove refresh-token storage and client secrets from `src/services/providers/*/auth.ts` and `tokenStorage.ts`.
   - Update sign-in to redirect to provider consent, then call `/api/auth/{provider}/callback` from the client (or let server handle redirect). After callback, broker sets access-token cookie; client reads auth state from a non-sensitive flag (e.g., `calfix_{provider}_authed` boolean cookie/localStorage) or a broker “status” endpoint.
   - Update provider fetch helpers to include the access token from a getter that reads the httpOnly cookie via a lightweight broker endpoint (`/api/auth/{provider}/token` to fetch a fresh access token value via JSON or re-set-cookie). Keep calendar API calls direct to provider.

5) **Access Token Handling**
   - Prefer passing access token in a JSON payload from `/token` (short-lived response) or rely on httpOnly cookie if using same-site fetch to provider (note: direct provider fetch requires auth header from JS; so client will need token from broker response—ensure response lifespan short and avoid storing).
   - Store access token in memory; do not persist. Refresh from broker when near expiry. Clear on user switch/sign-out.

6) **Revocation & Rotation**
   - On Clerk sign-out/user switch: call `/signout` for each provider, clear access-token cookie, delete `provider_tokens` row.
   - Handle refresh failures by forcing re-auth and wiping stored token.

7) **Logging & Privacy**
   - No tokens/scopes in logs. Log only high-level events (success/failure, user_id, provider_id).
   - Ensure CORS/CSP align with broker endpoints; CSRF-protect mutation endpoints (Clerk JWT + sameSite cookies).

8) **Testing**
   - Unit: token exchange functions, Supabase storage helpers (using service role), encryption/decryption, cookie issuance/clearing.
   - Integration (dev): full Google/Outlook auth → token stored in Supabase → access token issued → direct provider API call from browser succeeds; verify no calendar data hits broker logs.
   - Security checks: confirm refresh token never leaves server; client bundle has no secrets; browser storage lacks refresh tokens; access tokens cleared on sign-out.

9) **Migration & Rollout**
   - Ship DB migration first, guarded by feature flag (`BROKER_TOKENS_ENABLED`).
   - Dual-path auth temporarily: allow legacy client-side tokens for a short window; prompt users to re-auth to populate server-stored refresh tokens.
   - Monitor broker errors/refresh failures; add alerting for repeated refresh failures and missing rows.

10) **Docs**
   - Update README/onboarding: required server env vars, redirect URIs, and the “data stays client-side; tokens vaulted server-side” posture.
   - Add a privacy note explaining that only tokens are stored server-side; calendar data flows directly between browser and provider.

## Cloud Console Checklist (Google & Microsoft)
- **Google Cloud (OAuth consent + credentials)**
  - OAuth consent screen: ensure published/verified, scopes limited to Calendar (e.g., `https://www.googleapis.com/auth/calendar`), include your app domain in authorized domains.
  - OAuth client: type = Web application; add Authorized redirect URIs for the server callbacks (e.g., `https://yourapp.com/api/auth/google/callback`, plus local dev `http://localhost:3000/api/auth/google/callback` if needed).
  - Remove client secret from client bundle (only set `GOOGLE_CLIENT_ID` client-side if needed; keep `GOOGLE_CLIENT_SECRET` server-only).
  - Configure test users if the consent screen is not yet verified.
  - Verify that “access_type=offline” and “prompt=consent” are allowed for refresh tokens in your OAuth settings.

- **Microsoft Entra (Azure AD) for Outlook**
  - Register app (single-tenant or multi-tenant as required). Platform: “Web” or SPA—with auth code + PKCE public client flow; add redirect URIs (`https://yourapp.com/api/auth/outlook/callback`, `http://localhost:3000/api/auth/outlook/callback` for dev).
  - Expose required delegated permissions: `Calendars.ReadWrite`, `offline_access`, `User.Read`; grant admin consent where needed.
  - Configure “Allow public client flows” (if using SPA/public client without secret).
  - Keep `OUTLOOK_CLIENT_SECRET` server-only if you choose confidential flow; for pure public-client PKCE, leave secret empty and ensure redirect URIs match.
  - Update branding/reply URLs and publisher verification if required to avoid user warnings.
