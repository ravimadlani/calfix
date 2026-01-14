# CalFix

CalFix is a calendar operations dashboard that layers analytics, automation, and account management on top of provider calendars such as Google Calendar. The single-page app is built with React Router and Clerk authentication to expose public marketing views, protected scheduling tools, and admin surfaces in one layout shell.【F:src/App.tsx†L6-L74】 The main dashboard coordinates provider connections, event ingestion, insights, and upgrade flows through a central controller component.【F:src/components/CalendarDashboard.tsx†L1-L400】

## Core Functionality

### Authentication and Routing
- Clerk-powered routes split the app into public pages, protected dashboards, admin tools, and account management while keeping a shared layout wrapper.【F:src/App.tsx†L6-L74】
- Protected routes wrap every authenticated surface to enforce session checks before rendering sensitive features.【F:src/App.tsx†L32-L70】

### Calendar Operations Dashboard
- The dashboard orchestrates provider selection, subscription entitlements, calendar syncing, and time range selection before fetching events for the active view.【F:src/components/CalendarDashboard.tsx†L210-L400】
- Event timelines group meetings by day, support buffer management, and provide empty states tailored to each view.【F:src/components/EventsTimeline.tsx†L1-L170】
- Quick actions offer one-click automation for focus blocks, buffer insertion, evening cleanup, and Friday optimization.【F:src/components/QuickActions.tsx†L15-L99】
- Team scheduling tools coordinate participants, guardrails, and availability scoring across time zones to produce recommended slots.【F:src/components/TeamSchedulingModal.tsx†L1-L200】

### Analytics, Health, and Recommendations
- Calendar analytics compute meeting loads, gap analysis, double bookings, flight handling, and out-of-hours detections to drive UI insights.【F:src/services/calendarAnalytics.ts†L1-L196】
- A secure health score tracker translates analytics into configurable factor-based scoring with snoozes and Clerk-authenticated API calls.【F:src/services/healthScoreTrackerSecure.ts†L1-L200】
- Activity logging batches user actions and errors through authenticated API endpoints for auditing without leaking tokens client-side.【F:src/services/activityLoggerSecure.ts†L1-L120】

### Recurring Relationship Intelligence
- The recurring analytics workspace segments health, relationship, and audit views with filters for cadence, audience, and urgency while surfacing summary metrics per tab.【F:src/components/RecurringPage.tsx†L1-L200】
- Backend analytics classify series frequency, attendance, and flags such as high people hours or stale updates to prioritize follow-up.【F:src/services/recurringAnalytics.ts†L1-L120】

### Administration and Test Data
- The admin panel manages user records, health factor configuration, analytics views, and seeded calendar data with guardrails around provider authentication.【F:src/components/AdminPanel.tsx†L1-L150】
- Admin tooling can generate structured test datasets that cover buffers, back-to-backs, travel, and other edge cases for QA flows.【F:src/components/AdminPanel.tsx†L58-L120】

### API and Persistence Integrations
- Client-side calendar metadata syncs to Supabase whenever a user connects a provider, ensuring managed calendar records and preferences stay fresh.【F:src/components/CalendarDashboard.tsx†L294-L318】【F:src/services/calendarSync.ts†L24-L94】
- Vercel serverless routes store synced calendars, bootstrap preference rows, and rely on Supabase service credentials loaded at runtime.【F:api/calendar/sync.ts†L1-L150】

## Project Structure

- `src/components/` – Feature components including the calendar dashboard, quick action panels, admin tools, and scheduling modals.【F:src/components/CalendarDashboard.tsx†L1-L400】【F:src/components/AdminPanel.tsx†L1-L150】
- `src/context/` – React context for provider selection, connection status, and cached adapter instances backed by local storage.【F:src/context/CalendarProviderContext.tsx†L1-L120】
- `src/services/` – Provider-agnostic interfaces, analytics engines, Supabase sync helpers, activity logging, and recurring intelligence modules.【F:src/services/providers/CalendarProvider.ts†L1-L64】【F:src/services/calendarAnalytics.ts†L1-L196】
- `src/utils/` – Shared utilities for date math, event categorisation, and health calculations consumed by analytics services.【F:src/utils/healthCalculator.ts†L1-L80】
- `api/` – Vercel serverless handlers for calendar sync, admin data, health scoring, and activity pipelines.【F:api/calendar/sync.ts†L1-L150】
- `supabase/` – Local Supabase project configuration and migrations for managed calendars, preferences, and logging tables.【F:supabase/config.toml†L1-L160】

## Design Principles

1. **Provider-agnostic architecture** – A registry and context expose a uniform interface for calendar adapters, caching instances, persisting selection, and gating unimplemented providers without breaking the UI.【F:src/context/CalendarProviderContext.tsx†L1-L120】【F:src/services/providers/providerRegistry.ts†L1-L44】【F:src/services/providers/CalendarProvider.ts†L1-L64】
2. **Secure client-server boundaries** – Frontend services interact with backend APIs using Clerk tokens, batching requests, and caching minimal state to avoid exposing sensitive credentials in the browser.【F:src/services/activityLoggerSecure.ts†L1-L120】【F:src/services/healthScoreTrackerSecure.ts†L63-L140】
3. **Analytics-first UX** – Utility layers derive meeting load, buffer gaps, and recurring signals that feed tailored UI components, recommendations, and scoring workflows instead of raw calendar lists.【F:src/services/calendarAnalytics.ts†L1-L196】【F:src/services/recurringAnalytics.ts†L1-L120】【F:src/components/CalendarDashboard.tsx†L332-L400】
4. **Operational visibility** – Admin panels and serverless handlers surface audit trails, seed data, and Supabase synchronization to support troubleshooting complex scheduling scenarios.【F:src/components/AdminPanel.tsx†L1-L150】【F:api/calendar/sync.ts†L55-L150】

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables from `.env.example`, then supply Clerk, Supabase, and provider credentials.
3. Run the dev servers:
   ```bash
   npm run dev:all
   ```
   This starts both the Vite client and Vercel function runtime for local parity with production APIs.【F:package.json†L7-L21】

## Development Scripts

- `npm run dev` – Launch the Vite development server on its default port.【F:package.json†L7-L13】
- `npm run dev:api` – Spin up Vercel serverless functions locally for API testing.【F:package.json†L7-L13】
- `npm run dev:all` – Run client and API concurrently during local development.【F:package.json†L7-L13】
- `npm run lint` – Check TypeScript and React code with ESLint.【F:package.json†L7-L21】
- `npm run build` – Type-check and build the production bundle via `tsc -b` and Vite.【F:package.json†L7-L21】
- `npm run preview` – Preview the production build locally.【F:package.json†L7-L21】

## Environment and Services

- Supabase configuration (ports, auth, realtime, storage) lives under `supabase/config.toml` for local development parity with hosted infrastructure.【F:supabase/config.toml†L1-L160】
- Serverless functions, Supabase, and analytics services assume Clerk authentication and provider tokens are available at runtime; ensure related secrets are configured before enabling production workflows.【F:src/services/activityLoggerSecure.ts†L1-L120】【F:src/services/calendarSync.ts†L24-L94】
