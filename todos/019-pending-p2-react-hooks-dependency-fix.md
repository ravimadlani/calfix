---
status: pending
priority: p2
issue_id: "019"
tags: [bugs, react, hooks, correctness]
dependencies: []
---

# Fix React Hooks Dependency Array Anti-patterns

## Problem Statement

Several useEffect and useCallback hooks have incorrect dependency arrays, particularly excluding `getToken` from Clerk's useAuth(). This is a React hooks anti-pattern that can cause stale closures and incorrect behavior.

## Findings

- **Files:**
  - `src/context/CalendarProviderContext.tsx`
  - `src/components/CalendarDashboard.tsx`
- **Pattern:**
  ```typescript
  const { getToken } = useAuth();

  const fetchData = useCallback(async () => {
    const token = await getToken({ template: 'oauth_google' });
    // ...
  }, []); // getToken missing from dependencies!
  ```
- **Impact:**
  - Stale token fetches if auth state changes
  - Potential bugs after re-authentication
  - ESLint exhaustive-deps warnings ignored

## Proposed Solutions

### Option 1: Include getToken in Dependencies (Recommended)

**Approach:** Properly include getToken in dependency arrays.

```typescript
const { getToken } = useAuth();

const fetchData = useCallback(async () => {
  const token = await getToken({ template: 'oauth_google' });
  // ...
}, [getToken]); // Properly included
```

**Note:** Clerk's getToken is stable and won't cause unnecessary re-renders.

**Pros:**
- Correct React behavior
- No stale closure bugs
- Passes ESLint rules

**Cons:**
- May trigger additional effect runs (usually fine)

**Effort:** 1-2 hours

**Risk:** Low (Clerk's getToken is stable)

---

### Option 2: Use useRef to Avoid Dependencies

**Approach:** Store getToken in ref if stability is concern.

```typescript
const { getToken } = useAuth();
const getTokenRef = useRef(getToken);
getTokenRef.current = getToken;

const fetchData = useCallback(async () => {
  const token = await getTokenRef.current({ template: 'oauth_google' });
}, []); // No dependency needed
```

**Pros:**
- Zero re-renders
- Still type-safe

**Cons:**
- More complex pattern
- Not idiomatic React

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Locations to fix:**
1. `CalendarProviderContext.tsx:143-172` - checkClerkOAuthStatus callbacks
2. `CalendarDashboard.tsx` - multiple useCallback hooks
3. `src/services/providers/*/auth.ts` - OAuth functions

**ESLint rule:**
```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## Resources

- **PR:** #17
- **React Hooks Rules:** https://react.dev/reference/rules/rules-of-hooks
- **Clerk useAuth:** https://clerk.com/docs/references/react/use-auth

## Acceptance Criteria

- [ ] All useCallback/useEffect have correct dependencies
- [ ] ESLint exhaustive-deps passes
- [ ] No stale closure bugs
- [ ] Application behavior unchanged

## Work Log

### 2025-12-07 - Discovery via Pattern Recognition Review

**By:** Claude Code (Pattern Recognition Specialist Agent)

**Actions:**
- Identified hooks anti-pattern
- Flagged missing getToken dependency
- Created todo for fixes

**Learnings:**
- Always include all dependencies in hooks
- Clerk's useAuth returns stable function references
- Don't suppress ESLint hook rules

## Notes

- Run ESLint with --fix after changes
- Test auth flow after fixing
