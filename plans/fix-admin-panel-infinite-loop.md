# Fix: Admin Panel Infinite Loop

## Problem Statement

The admin panel at `/admin` has an infinite loop that causes hundreds of API calls to `/api/admin/users`, exhausting browser resources (`ERR_INSUFFICIENT_RESOURCES`). The page becomes completely unresponsive.

## Root Cause Analysis

**Evidence from Playwright console logs:**
```
[ERROR] Failed to load resource: the server responded with a status of 403 () @ /api/admin/users
[ERROR] Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES @ /api/admin/users
[ERROR] Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES @ /api/admin/users
... (hundreds more)
```

**Root Cause:** The `getToken` function from Clerk's `useAuth()` hook is NOT referentially stable - it returns a new function reference on every render. When included in React `useCallback` or `useEffect` dependency arrays, it causes infinite re-renders:

1. Component renders
2. `getToken` is a new reference
3. `useCallback` creates new callback
4. `useEffect` that depends on callback fires
5. State updates, component re-renders
6. Go to step 2 (infinite loop)

**Affected Files:**

| File | Line | Problem |
|------|------|---------|
| `src/components/AdminPanel.tsx` | 66 | `}, [getToken]);` in `loadUsers` callback |
| `src/components/CalendarDashboard.tsx` | 259, 346, 654 | `getToken` in multiple dependency arrays |
| `src/components/RecurringPage.tsx` | 430 | `}, [user?.id, getToken]);` in `checkSubscription` |
| `src/context/CalendarProviderContext.tsx` | 131 | `}, [getToken, user]);` in `checkClerkOAuthStatus` |

## Solution

Remove `getToken` from all `useCallback` and `useEffect` dependency arrays. The `getToken` function is provided by Clerk and safe to call inside callbacks without being listed as a dependency.

### Phase 1: Fix CalendarProviderContext (Critical - affects entire app)

**File:** `src/context/CalendarProviderContext.tsx:131`

```typescript
// BEFORE (broken)
const checkClerkOAuthStatus = useCallback(async (providerId: CalendarProviderId): Promise<boolean> => {
  // ... uses getToken inside
}, [getToken, user]);

// AFTER (fixed)
const checkClerkOAuthStatus = useCallback(async (providerId: CalendarProviderId): Promise<boolean> => {
  // ... uses getToken inside
// Note: getToken intentionally excluded - stable from Clerk but causes infinite loops if included
}, [user]);
```

### Phase 2: Fix AdminPanel (already partially fixed, verify)

**File:** `src/components/AdminPanel.tsx`

Verify the fix from earlier commit is deployed:
```typescript
// Should be:
}, []);  // getToken removed
```

### Phase 3: Fix CalendarDashboard (already partially fixed, verify)

**File:** `src/components/CalendarDashboard.tsx`

Verify all three occurrences are fixed:
- Line ~259: `}, [clerkUser?.id]);`
- Line ~346: Remove `getToken` from array
- Line ~654: `}, [clerkUser?.id, loggingInitialized]);`

### Phase 4: Fix RecurringPage (already partially fixed, verify)

**File:** `src/components/RecurringPage.tsx`

Verify:
```typescript
}, [user?.id]);  // getToken removed
```

## Acceptance Criteria

- [ ] Admin panel loads without infinite API calls
- [ ] No `ERR_INSUFFICIENT_RESOURCES` errors in console
- [ ] `/api/admin/users` called only once on page load
- [ ] User list displays correctly for admin users
- [ ] All other pages (Dashboard, Recurring) work without infinite loops

## Implementation Steps

1. Fix `CalendarProviderContext.tsx` - remove `getToken` from line 131 dependency array
2. Verify the other three files have the fix from commit `f0e7721`
3. Build and verify no TypeScript errors
4. Commit and push to `staging/feat/security-clerk-oauth`
5. Wait for Vercel deployment
6. Test admin panel in Playwright - verify single API call
7. Test dashboard and recurring pages still work

## Testing Plan

```bash
# Build locally
npm run build

# Push to trigger Vercel deploy
git push origin staging/feat/security-clerk-oauth

# Test with Playwright:
# 1. Navigate to /admin
# 2. Check console - should see only 1-2 API calls, not hundreds
# 3. Page should render user list (or access denied if not admin)
```

## References

- Commit with partial fix: `f0e7721` (fix: Remove getToken from useCallback dependency arrays)
- React docs on useCallback: https://react.dev/reference/react/useCallback
- Clerk useAuth hook: The `getToken` function is not memoized by Clerk

## Risk Assessment

**Low risk** - This is a targeted fix to dependency arrays only. No business logic changes.

The fix follows React best practices: functions that don't depend on component state (like Clerk's `getToken`) don't need to be in dependency arrays.
