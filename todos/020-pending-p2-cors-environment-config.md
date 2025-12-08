---
status: pending
priority: p2
issue_id: "020"
tags: [security, configuration, deployment]
dependencies: ["001"]
---

# Move CORS Origins to Environment Variables

## Problem Statement

The CORS origin whitelist is hardcoded in `api/lib/cors.ts`. This makes it difficult to add new deployment environments and creates security concerns around the permissive Vercel preview URL pattern.

## Findings

- **File:** `api/lib/cors.ts`
- **Current implementation:**
  ```typescript
  const allowedOrigins = [
    'https://calfix.vercel.app',
    'https://calfix-new.vercel.app',
    // ... more hardcoded origins
  ];

  // Overly permissive pattern
  const vercelPreviewPattern = /^https:\/\/calfix(-new)?-.*\.vercel\.app$/;
  ```
- **Issues:**
  - Hardcoded values require code changes for new environments
  - Vercel preview pattern too broad (subdomain takeover risk)
  - No environment-specific configuration

## Proposed Solutions

### Option 1: Environment Variable Configuration (Recommended)

**Approach:** Move origins to environment variables.

```typescript
// .env
CORS_ALLOWED_ORIGINS=https://calfix.vercel.app,https://calfix-new.vercel.app

// api/lib/cors.ts
const envOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
const isDev = process.env.NODE_ENV === 'development';

const allowedOrigins = [
  ...envOrigins,
  isDev ? 'http://localhost:3000' : null,
  isDev ? 'http://localhost:5173' : null,
].filter(Boolean);
```

**Pros:**
- Environment-specific configuration
- No code changes for new origins
- Easier security auditing
- Stricter preview URL handling

**Cons:**
- Need to maintain env vars per environment

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Tighten Preview URL Pattern

**Approach:** Keep hardcoded but restrict preview pattern.

```typescript
// Only allow Vercel preview URLs that match PR number pattern
const vercelPreviewPattern = /^https:\/\/calfix-new-[a-z0-9]+-ravimadlani\.vercel\.app$/;
```

**Pros:**
- Minimal change
- More secure pattern

**Cons:**
- Still hardcoded

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/lib/cors.ts`
- `.env.example` (create/update)
- `vercel.json` (environment variables)

**Security considerations:**
- Current pattern allows any *.vercel.app subdomain
- Subdomain takeover could bypass CORS
- Preview URLs should use stricter pattern

## Resources

- **PR:** #17
- **Vercel Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
- **CORS Security:** https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny

## Acceptance Criteria

- [ ] Origins configurable via environment
- [ ] Preview URL pattern tightened
- [ ] Local development works
- [ ] Production origins secured
- [ ] Documentation updated

## Work Log

### 2025-12-07 - Discovery via Security Review

**By:** Claude Code (Security Sentinel Agent)

**Actions:**
- Identified hardcoded CORS origins
- Flagged permissive preview pattern
- Created todo for configuration

**Learnings:**
- CORS origins should be environment-configurable
- Preview URL patterns need careful scoping

## Notes

- Should be done after Issue #001 (CORS wildcard fix)
- Consider adding CORS configuration docs
