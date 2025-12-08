---
status: pending
priority: p2
issue_id: "008"
tags: [performance, caching, oauth]
dependencies: []
---

# Implement Token Caching

## Problem Statement

Each API call that requires OAuth tokens fetches a fresh token from Clerk, causing unnecessary latency and API calls. Tokens should be cached for their validity period.

## Findings

- **Pattern:** Every request to `/api/calendar/token` fetches fresh token from Clerk
- **Impact:**
  - Added latency on every calendar operation
  - Unnecessary Clerk API calls
  - Potential rate limiting from Clerk
- **Measurement:** ~200-500ms added latency per token fetch

## Proposed Solutions

### Option 1: In-Memory Cache with TTL (Recommended)

**Approach:** Cache tokens in memory with expiration.

```typescript
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(userId: string, provider: string) {
  const key = `${userId}:${provider}`;
  const cached = tokenCache.get(key);

  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }

  const fresh = await fetchFromClerk(userId, provider);
  tokenCache.set(key, { token: fresh.token, expiresAt: fresh.expiresAt });
  return fresh.token;
}
```

**Pros:**
- Significant latency reduction
- Simple implementation
- No external dependencies

**Cons:**
- Not shared across serverless instances
- Memory usage

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Redis/KV Store Cache

**Approach:** Use distributed cache (Vercel KV, Redis).

**Pros:**
- Shared across instances
- Persistent

**Cons:**
- External dependency
- Additional cost

**Effort:** 3-4 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/calendar/token.ts`
- `api/lib/auth.ts`

**Cache key strategy:**
- Key: `token:${userId}:${provider}`
- TTL: token expiration minus 1 minute buffer

## Resources

- **PR:** #17

## Acceptance Criteria

- [ ] Tokens cached in memory with TTL
- [ ] Cache invalidation on expiration
- [ ] Reduced latency on subsequent requests
- [ ] No stale token usage

## Work Log

### 2025-12-07 - Discovery via Performance Review

**By:** Claude Code (Performance Oracle Agent)

**Actions:**
- Identified repeated token fetches
- Created todo for caching implementation

## Notes

- Can be combined with Issue #005 (token expiration handling)
- Consider cache warming on user session start
