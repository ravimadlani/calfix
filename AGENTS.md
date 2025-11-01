# Repository Guidelines

## Project Structure & Module Organization
- `src/` — App code in TypeScript/React.
  - `components/` (e.g., `CalendarDashboard.tsx`), `services/` (Google auth/calendar, analytics), `utils/`, `types/`, `lib/`, `assets/`.
- `public/` — Static assets served by Vite.
- `api/webhooks/` — Vercel serverless handlers (e.g., `clerk.ts`).
- Config: `vite.config.ts`, `tailwind.config.js`, `eslint.config.js`, `tsconfig*.json`.
- Env: `.env.example` → copy to `.env` (do not commit `.env`).
- Build output: `dist/`.

## Build, Test, and Development Commands
- `npm run dev` — Start Vite dev server.
- `npm run build` — Type-check then build (`tsc -b && vite build`).
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Lint TypeScript/React with ESLint.
- E2E (optional): `npx playwright test` (install browsers first: `npx playwright install`).
- **Before handing work back, run `npm run lint` and `npm run build` and confirm both succeed.**

## Coding Style & Naming Conventions
- Language: TypeScript + React function components; hooks and ES modules.
- Indentation: 2 spaces; use semicolons; prefer single quotes.
- Files: components `PascalCase.tsx` (e.g., `ViewSelector.tsx`); utilities/services `camelCase.ts` (e.g., `dateHelpers.ts`, `googleCalendar.ts`); types `PascalCase.ts` in `src/types`.
- CSS: Tailwind-first styling; keep custom CSS in `src/index.css` or co-located minimal overrides.
- Linting: keep `eslint.config.js` rules passing before PR.

## Testing Guidelines
- Preferred: Playwright for e2e. Place specs as `*.spec.ts` under `e2e/` or `tests/`.
- Scope: focus on critical user flows (auth, calendar fetch, quick actions).
- Run: `npx playwright test`; record new flows with `npx playwright codegen` if helpful.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (`feat:`, `fix:`, `chore:`) as in Git history.
- PRs: include clear description, linked issue(s), and screenshots/GIFs for UI changes.
- Checks: ensure `npm run build` and `npm run lint` pass; note any env/config requirements.

## Security & Configuration Tips
- Client env vars must be prefixed `VITE_` (e.g., `VITE_SUPABASE_URL`).
- Keep secrets server-side only (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_WEBHOOK_SECRET` used by `api/webhooks/clerk.ts`).
- For Vercel, set env vars in project settings; SPA routing handled by `vercel.json` rewrites.
