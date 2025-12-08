---
status: completed
priority: p1
issue_id: "001"
tags: [security, api, cors, critical]
dependencies: []
---

# CRITICAL: Remove Wildcard CORS on Token Endpoint

## Problem Statement

The `/api/calendar/token` endpoint has a wildcard CORS configuration that allows any origin to request OAuth tokens. Combined with `Access-Control-Allow-Credentials: true`, this creates a token theft vulnerability where malicious websites could steal user tokens.

## Findings

- **File:** `api/calendar/token.ts:16-17`
- **Code:**
  ```typescript
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  ```
- **Impact:** Any malicious website could potentially steal OAuth access tokens from authenticated users
- **OWASP Classification:** A01:2021 - Broken Access Control

## Proposed Solutions

### Option 1: Restrict to Application Origin (Recommended)

**Approach:** Use environment variable for allowed origin, validate against whitelist.

```typescript
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://calfix.vercel.app',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

const origin = req.headers.origin;
if (origin && allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
```

**Pros:**
- Prevents cross-origin token theft
- Works with preview deployments via env var
- Simple implementation

**Cons:**
- Need to manage allowed origins list

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Remove CORS Headers Entirely

**Approach:** Since this is an API endpoint called from the same origin, CORS headers may not be needed.

**Pros:**
- Simplest solution
- No configuration needed

**Cons:**
- May break if frontend is on different subdomain
- Less flexible

**Effort:** 15 minutes

**Risk:** Medium (may break functionality)

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/calendar/token.ts:16-17` - CORS headers

**Security implications:**
- Tokens exposed to this vulnerability could allow attackers to access user calendar data
- Combined with credentials header, cookies are sent enabling session hijacking

## Resources

- **PR:** #17
- **OWASP Reference:** https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- **MDN CORS:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

## Acceptance Criteria

- [ ] Wildcard `*` removed from Access-Control-Allow-Origin
- [ ] Origin validation implemented against whitelist
- [ ] Token endpoint only accepts requests from app origin
- [ ] Preview deployments still work (Vercel URLs)
- [ ] Local development works

## Work Log

### 2025-12-07 - Discovery via Security Review

**By:** Claude Code (Security Sentinel Agent)

**Actions:**
- Identified wildcard CORS in code review of PR #17
- Flagged as CRITICAL security vulnerability
- Created todo for tracking

**Learnings:**
- Never use `Access-Control-Allow-Origin: *` with credentials
- Token endpoints require strict origin validation

## Notes

- This is a CRITICAL security issue that should block PR merge
- Consider adding CSP headers as defense-in-depth
