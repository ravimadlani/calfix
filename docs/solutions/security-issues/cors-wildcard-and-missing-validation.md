---
title: "CORS Wildcard and Missing Input Validation in User Preferences API"
category: security-issues
tags:
  - cors
  - input-validation
  - api-security
  - zod-schema
  - pattern-inconsistency
severity: critical
component: "/api/user/preferences.ts"
discovery_method: "multi-agent-code-review"
discovered_in: "PR #20 - Onboarding improvements"
date_fixed: "2025-12-20"
---

# CORS Wildcard and Missing Input Validation in User Preferences API

## Problem Summary

During a multi-agent code review of PR #20, two security issues were identified in `/api/user/preferences.ts`:

1. **CORS Wildcard**: Used `Access-Control-Allow-Origin: *` instead of the proper `setCorsHeaders()` utility
2. **Missing Validation**: Accepted raw `req.body` without Zod validation

Both were deviations from established codebase patterns used by all other API endpoints.

## How It Was Discovered

| Agent | Finding |
|-------|---------|
| Security Sentinel | Flagged CORS wildcard as P1-CRITICAL |
| Pattern Recognition | Identified this as the ONLY API not using `setCorsHeaders()` |
| TypeScript Reviewer | Noted missing Zod validation vs other APIs |

## Root Cause

The new endpoint was developed without following established API patterns. Other endpoints (e.g., `/api/health/score.ts`, `/api/activity/log.ts`) use:
- `setCorsHeaders()` from `/api/lib/cors.ts`
- Zod schemas from `/api/lib/validation.ts`

This endpoint manually set CORS headers and skipped validation.

---

## Solution

### Fix 1: CORS Configuration

**Before:**
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

**After:**
```typescript
import { setCorsHeaders, handleCorsPreflightRequest } from '../lib/cors.js';

// Handle CORS using shared utility
setCorsHeaders(req, res);

if (handleCorsPreflightRequest(req, res)) {
  return;
}
```

The CORS utility (`api/lib/cors.ts`) maintains an allowlist:
```typescript
const ALLOWED_ORIGINS = [
  'https://calendarzero.com',
  'https://www.calendarzero.com',
  'https://calfix-new-ravis-projects-1b880e50.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
const VERCEL_PREVIEW_PATTERN = /^https:\/\/calfix-[\w-]+\.vercel\.app$/;
```

### Fix 2: Input Validation

**Before:**
```typescript
const body = req.body;
const { selected_calendar_ids, active_provider, ... } = body;
```

**After:**
```typescript
import { z } from 'zod';

const UpdatePreferencesSchema = z.object({
  selected_calendar_ids: z.array(z.string().max(255)).max(15).optional(),
  active_provider: z.enum(['google', 'outlook']).optional(),
  onboarding_completed: z.boolean().optional(),
  home_location: z.record(z.unknown()).nullable().optional(),
  business_hours: z.record(z.unknown()).nullable().optional(),
  notification_preferences: z.record(z.unknown()).nullable().optional(),
  auto_dismiss_alerts: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

// In PUT handler:
const parseResult = UpdatePreferencesSchema.safeParse(req.body);
if (!parseResult.success) {
  return res.status(400).json({
    error: 'Invalid request body',
    details: parseResult.error.issues.map(i => i.message),
  });
}

const { selected_calendar_ids, active_provider, ... } = parseResult.data;
```

---

## Prevention

### Code Review Checklist

For all new API endpoints, verify:

- [ ] Uses `setCorsHeaders(req, res)` from `/api/lib/cors.ts`
- [ ] Calls `handleCorsPreflightRequest(req, res)` before handlers
- [ ] Does NOT manually set `Access-Control-Allow-Origin`
- [ ] All request bodies validated with Zod schemas
- [ ] New schemas added to `/api/lib/validation.ts`
- [ ] Uses `authenticateRequest(req)` for protected endpoints
- [ ] Error handling: ZodError → 400, AuthError → 401, Other → 500

### Reference Implementations

When creating new API endpoints, copy patterns from:
- `/api/health/score.ts` - POST with Zod validation
- `/api/activity/log.ts` - Full auth + validation flow
- `/api/user/preferences.ts` - GET/PUT with CORS (after fix)

### Automated Enforcement (Future)

Consider adding:
1. ESLint rule to detect manual CORS headers
2. Pre-commit hook checking for `Access-Control-Allow-Origin: *`
3. CI check for `req.body` without Zod validation

---

## Related Files

| File | Purpose |
|------|---------|
| `/api/lib/cors.ts` | CORS utility with origin allowlist |
| `/api/lib/validation.ts` | All Zod schemas (14 exported) |
| `/api/lib/auth.ts` | Authentication utilities |
| `/CLAUDE.md` | Security rules for Clerk/Supabase |

## Cross-References

- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- Clerk/Supabase Integration: https://clerk.com/docs/guides/development/integrations/databases/supabase
