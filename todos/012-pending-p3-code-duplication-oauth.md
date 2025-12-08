---
status: pending
priority: p3
issue_id: "012"
tags: [code-quality, dry, refactoring]
dependencies: []
---

# Extract Shared OAuth Logic (DRY)

## Problem Statement

Google and Outlook auth modules have ~150 lines of duplicated code. The same token fetching and error handling patterns are repeated in both providers.

## Findings

- **Files:**
  - `src/services/providers/google/auth.ts` (~90 lines)
  - `src/services/providers/outlook/auth.ts` (~94 lines)
- **Duplicated patterns:**
  - Token fetching from Clerk
  - Error handling
  - State management
  - OAuth callback handling
- **Impact:** Bug fixes need to be applied twice, risk of divergence

## Proposed Solutions

### Option 1: Shared OAuth Service (Recommended)

**Approach:** Extract common logic to shared module.

```typescript
// src/services/providers/shared/clerkOAuth.ts
export async function fetchClerkOAuthToken(providerId: string, getToken: () => Promise<string>) {
  // Common implementation
}
```

**Pros:**
- Single point of maintenance
- Consistent behavior
- Easier testing

**Cons:**
- Refactoring effort
- Need to handle provider-specific differences

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/services/providers/google/auth.ts`
- `src/services/providers/outlook/auth.ts`
- New: `src/services/providers/shared/clerkOAuth.ts`

## Resources

- **PR:** #17

## Acceptance Criteria

- [ ] Shared OAuth module created
- [ ] Both providers use shared code
- [ ] No behavior changes
- [ ] Tests pass

## Work Log

### 2025-12-07 - Discovery via Architecture Review

**By:** Claude Code (Architecture Strategist Agent)

**Actions:**
- Identified ~150 lines of duplicated code
- Created todo for refactoring
