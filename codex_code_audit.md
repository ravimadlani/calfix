## Scope & Method
- Reviewed repository structure, key React pages/components, provider services, API routes, utilities, and configuration. Focused on security, reliability, performance, and operational readiness. Ran `npm run lint` (fail) and `npm run build` (pass with bundle size warning) to validate surface health.

## High-Level Architecture
- Vite + React SPA with Clerk auth, Calendar provider abstraction (Google/Outlook) wired via `CalendarProviderContext`. Serverless APIs on Vercel handle Supabase persistence, webhooks, and activity logging. Supabase used both client-side (anon key) and server-side (service role).

## Build & Tooling Health
- `npm run lint` fails (unused import in `tests/event-links.spec.ts:8`). `npm run build` passes; bundle warning (`dist/assets/index-DnK_slN1.js` ~681 kB) suggests need for code-splitting.

## Code Quality & Style
- Several monolithic React components (`CalendarDashboard.tsx` >1k LOC) mix data-fetching, state, and business logic without memoized selectors or effect cleanup. This increases cognitive load and regression surface.
- Heavy console logging across client and API layers leaks operational details and risks performance/observability noise.
- Many `any`-like states in dashboard (`events`, `analytics`, etc.) reduce type safety and make error handling opaque.

## Accessibility & UX
- Layout lacks skip-navigation and landmark structure beyond nav/main/footer; large interactive sections (dashboard widgets) do not expose ARIA labels or focus order hints. Consider auditing interactive cards, modals, and hover-only affordances for keyboard users.
- ProtectedRoute renders a spinner without `aria-live`, so screen readers may not announce loading.

## Performance Considerations
- Single bundle at ~681 kB gzipped indicates aggressive code reuse needed (lazy-load heavy modals/widgets and provider-specific helpers).
- CalendarDashboard triggers multiple sequential fetches without cancellation/abort; stale responses could overwrite state when switching providers/views quickly.
- Excessive `console.log` in hot paths (event fetch, subscription checks) incurs runtime cost and noisy logs.

## Reliability & Error Handling
- Client calendar sync (`src/services/calendarSync.ts`) posts to `/api/calendar/sync` without auth headers, so failures or malicious requests are indistinguishable; no retries/backoff for network errors.
- Provider auth assumes presence of global `window.gapi` (Google free/busy) without guarded loader or timeout; failures bubble as generic errors.
- Activity logger queues do not flush on page unload reliably; session end best-effort only.

## Security & Secrets
- **Hardcoded client secret in frontend**: Google OAuth SPA stores `VITE_GOOGLE_CLIENT_SECRET` and refresh tokens in browser storage (`src/services/providers/google/auth.ts:14-159`, `tokenStorage.ts:3-173`). Client secrets must never ship to browsers; refresh tokens in `localStorage` are vulnerable to XSS/session theft.
- **Token storage risk**: Both Google and Outlook flows persist access/refresh tokens in `localStorage`/`sessionStorage` without encryption or httpOnly protection (`tokenStorage.ts:3-235`). Device sharing/XSS compromises accounts; clearing only on app sign-out is insufficient.
- **Unauthenticated privileged API**: `/api/calendar/sync` accepts arbitrary `userId` and uses Supabase service role to delete/reinsert calendars (`api/calendar/sync.ts:7-154`) with no auth/ownership check. Anyone can mutate another user’s calendars and default prefs if endpoint exposed.
- **Subscription API exposure**: `/api/user/subscription` uses service role and allows any `userId` query without auth (`api/user/subscription.ts:4-114`), leaking subscription/Stripe identifiers and enabling feature abuse.
- **Weak admin gate**: `/api/admin/users` guarded only by spoofable `x-admin-email` header (`api/admin/users.ts:10-51`) while using service role; attacker can exfiltrate full user table.
- **Verbose env logging**: Calendar sync endpoint logs Supabase URL fragments and service key length (`api/calendar/sync.ts:38-44`), increasing leakage risk in logs.
- **Test creds exposure**: Playwright spec embeds real email identities (`tests/event-links.spec.ts:11-12`) and describes interactive login steps; should be scrubbed or moved to secrets/fixtures.

## Data & API Boundaries
- Client-side calendar sync and subscription fetches lack Clerk auth headers, so backend cannot enforce per-user access via JWT. Service-role Supabase calls bypass RLS entirely.
- Webhook handler correctly verifies signatures, but other API routes rely on service-role Supabase without RLS-friendly patterns; missing rate limiting on public endpoints.

## Testing Coverage & Gaps
- Only Playwright spec focused on event links; relies on manual logins and writes HTML report to repo. No unit/integration tests for provider auth flows, API routes, or calendar analytics.
- Lint failure blocks CI; no automated coverage reporting present.

## Dependency & Version Risks
- React 19 with Clerk/React Router 7; ensure all libraries officially support React 19 (check Clerk). Service SDKs (Supabase 2.x) fine but Google/Outlook REST calls are handcrafted—no official SDK usage.
- Playwright pinned to 1.56; browsers need install in CI or tests will fail.

## Configuration & Env Management
- Multiple env vars required: Clerk publishable key, Google/Outlook IDs, Supabase URLs/keys, redirect URI. No `.env.example` checked in; onboarding risk.
- `vite.config.ts` proxies `/api` to localhost:3000, but production deploy expects Vercel routes—document dev vs prod expectations.

## Observations by Area
- **components**: `CalendarDashboard.tsx` centralizes orchestration with many side effects and alerts; consider splitting data hooks, using SWR/React Query, and reducing global `localStorage` reads (`managed_calendar_id`).
- **services/providers**: OAuth flows entirely client-side with secrets/tokens stored in web storage; missing backend token broker and rotation. Google free/busy depends on gapi global but script load not managed.
- **api**: Several routes unauthenticated while using Supabase service role (`api/calendar/sync.ts`, `api/user/subscription.ts`, `api/admin/users.ts`). Activity/health routes correctly require Clerk token.
- **utils**: Date helpers and health calculations appear deterministic; no evident issues, but lack unit tests.
- **tests**: Playwright spec couples to real accounts and commits screenshots/report generation—unsuitable for CI and leaks PII.

## Recommendations & Prioritized Actions
1) **Secure OAuth flows**: Move Google/Outlook token exchanges to server-side endpoints; remove client secrets and refresh-token storage from the browser. Use short-lived access tokens + httpOnly cookies; rotate/clear on sign-out.
2) **Lock down APIs**: Require Clerk JWT on `/api/calendar/sync` and `/api/user/subscription`; enforce user-id matching server-side and rely on RLS (replace service-role where possible). Harden admin endpoints with proper auth (Clerk roles) and eliminate header-based checks.
3) **Reduce secret leakage**: Strip verbose env logging from APIs; audit console logs for PII (calendar IDs/emails) before production.
4) **Refactor dashboard**: Break `CalendarDashboard.tsx` into smaller hooks/components (data fetching, subscription state, event actions), add abortable fetches, and drop alert-based error UX in favor of toasts.
5) **Improve testing**: Fix lint failure in Playwright spec; replace real credentials with env-driven mocks or stub network. Add unit tests for provider helpers and API input validation; add e2e flow for auth + calendar fetch with mocks.
6) **Performance hygiene**: Introduce route-based/lazy loading for heavy modals/widgets; consider code-splitting provider-specific helpers. Trim console logging in render paths.
7) **Docs & env**: Add `.env.example` with required keys and clarify dev/prod API proxy expectations; document Playwright browser install step for CI.
