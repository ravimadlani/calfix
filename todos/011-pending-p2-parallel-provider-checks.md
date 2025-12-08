---
status: pending
priority: p2
issue_id: "011"
tags: [performance, async, providers]
dependencies: []
---

# Parallelize Provider OAuth Checks

## Problem Statement

Provider OAuth status checks run sequentially, doubling the initialization time when both Google and Outlook need to be checked.

## Findings

- **File:** `src/context/CalendarProviderContext.tsx`
- **Code:**
  ```typescript
  for (const provider of implementedProviders) {
    // Sequential - waits for each to complete
    const isConnected = await checkClerkOAuthStatus(provider.id);
  }
  ```
- **Impact:**
  - ~200-500ms per provider check
  - Total time = N * per-provider time
  - Slow dashboard initialization

## Proposed Solutions

### Option 1: Promise.all for Parallel Execution (Recommended)

**Approach:** Check all providers concurrently.

```typescript
const results = await Promise.all(
  implementedProviders.map(async (provider) => ({
    id: provider.id,
    isConnected: await checkClerkOAuthStatus(provider.id)
  }))
);

const newConnected = new Set<CalendarProviderId>();
for (const { id, isConnected } of results) {
  if (isConnected) newConnected.add(id);
}
```

**Pros:**
- Total time = max(provider times)
- Simple change
- Better UX

**Cons:**
- More concurrent API calls
- Error handling needs care

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Promise.allSettled for Resilience

**Approach:** Use allSettled to handle individual failures gracefully.

**Pros:**
- One failure doesn't break others
- Better error isolation

**Cons:**
- Slightly more complex

**Effort:** 45 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/context/CalendarProviderContext.tsx:143-172`

## Resources

- **PR:** #17

## Acceptance Criteria

- [ ] Provider checks run in parallel
- [ ] Dashboard initialization faster
- [ ] Individual provider failures handled gracefully
- [ ] No race conditions in state updates

## Work Log

### 2025-12-07 - Discovery via Performance Review

**By:** Claude Code (Performance Oracle Agent)

**Actions:**
- Identified sequential provider checks
- Created todo for parallelization

## Notes

- Simple optimization with good impact
- Use Promise.allSettled for robustness
