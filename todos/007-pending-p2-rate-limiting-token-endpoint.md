---
status: pending
priority: p2
issue_id: "007"
tags: [security, api, rate-limiting]
dependencies: ["001"]
---

# Add Rate Limiting to Token Endpoint

## Problem Statement

The `/api/calendar/token` endpoint has no rate limiting, making it vulnerable to brute force attacks, token enumeration, and denial of service.

## Findings

- **File:** `api/calendar/token.ts`
- **Issue:** No rate limiting middleware or logic
- **Impact:**
  - Potential for brute force attacks
  - Resource exhaustion (DoS)
  - Token enumeration attempts
- **Severity:** HIGH (security)

## Proposed Solutions

### Option 1: Vercel Edge Config Rate Limiting (Recommended)

**Approach:** Use Vercel's built-in rate limiting capabilities.

**Pros:**
- Native Vercel integration
- Low latency
- Easy configuration

**Cons:**
- Vercel-specific
- May require Edge Config setup

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Upstash Redis Rate Limiting

**Approach:** Use Upstash Redis for distributed rate limiting.

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

**Pros:**
- Battle-tested library
- Works across serverless functions
- Flexible configuration

**Cons:**
- Additional dependency
- Requires Upstash account

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/calendar/token.ts`

**Rate limit suggestions:**
- 10 requests per 10 seconds per user
- 100 requests per minute per IP
- Return 429 with Retry-After header

## Resources

- **PR:** #17
- **Upstash Ratelimit:** https://github.com/upstash/ratelimit
- **Vercel Rate Limiting:** https://vercel.com/docs/security/rate-limiting

## Acceptance Criteria

- [ ] Rate limiting implemented on token endpoint
- [ ] Returns 429 Too Many Requests when exceeded
- [ ] Includes Retry-After header
- [ ] Logs rate limit hits for monitoring
- [ ] Documented rate limits

## Work Log

### 2025-12-07 - Discovery via Security Review

**By:** Claude Code (Security Sentinel Agent)

**Actions:**
- Identified missing rate limiting
- Created todo for tracking

## Notes

- Should be implemented after CORS fix (Issue #001)
- Consider applying to other sensitive endpoints
