---
status: pending
priority: p2
issue_id: "010"
tags: [performance, caching, admin]
dependencies: []
---

# Cache Admin Role Check

## Problem Statement

Every admin panel request calls Clerk API to check admin role, causing latency and potential rate limiting. Admin role changes infrequently and should be cached.

## Findings

- **File:** `api/lib/auth.ts`
- **Code:**
  ```typescript
  export async function checkAdminRole(userId: string): Promise<boolean> {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const user = await clerk.users.getUser(userId); // External API call every time
    return user.publicMetadata?.role === 'admin';
  }
  ```
- **Impact:**
  - ~100-300ms added latency per admin request
  - Clerk API rate limits may be hit
  - Unnecessary API calls for unchanged data

## Proposed Solutions

### Option 1: In-Memory Cache with TTL (Recommended)

**Approach:** Cache admin status for 5-10 minutes.

```typescript
const adminCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();

export async function checkAdminRole(userId: string): Promise<boolean> {
  const cached = adminCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.isAdmin;
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const user = await clerk.users.getUser(userId);
  const isAdmin = user.publicMetadata?.role === 'admin';

  adminCache.set(userId, {
    isAdmin,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  return isAdmin;
}
```

**Pros:**
- Simple implementation
- Significant latency reduction
- Works for admin panel use case

**Cons:**
- Role changes delayed up to TTL
- Not shared across instances

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Include Role in JWT Claims

**Approach:** Add admin role to Clerk session claims.

**Pros:**
- No additional API calls
- Instant role checks

**Cons:**
- Requires Clerk configuration
- JWT refresh needed for role changes

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/lib/auth.ts` - checkAdminRole function
- `api/admin/*` - admin endpoints

## Resources

- **PR:** #17
- **Clerk Session Claims:** https://clerk.com/docs/backend-requests/making/custom-session-token

## Acceptance Criteria

- [ ] Admin role cached with TTL
- [ ] Reduced latency on admin panel
- [ ] Cache invalidation works correctly
- [ ] Role changes reflected within reasonable time

## Work Log

### 2025-12-07 - Discovery via Performance Review

**By:** Claude Code (Performance Oracle Agent)

**Actions:**
- Identified external API call on every admin request
- Created todo for caching

## Notes

- 5-minute TTL is reasonable for admin role changes
- Consider cache invalidation webhook from Clerk
