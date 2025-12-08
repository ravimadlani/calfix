---
status: pending
priority: p3
issue_id: "013"
tags: [code-quality, cleanup, dead-code]
dependencies: []
---

# Remove Legacy OAuth Code

## Problem Statement

The `USE_CLERK_TOKENS` flag is always `true`, but legacy OAuth code paths still exist. This dead code adds maintenance burden and confusion.

## Findings

- **Files:**
  - `src/context/CalendarProviderContext.tsx` - legacy branches
  - `src/services/providers/tokenStorage.ts` - entire module (~268 lines)
  - Various provider auth files
- **Dead code:** ~600+ lines that can never execute
- **Flag:** `const USE_CLERK_TOKENS = true;` (never false)

## Proposed Solutions

### Option 1: Remove Dead Code (Recommended)

**Approach:** Delete all code paths where `USE_CLERK_TOKENS === false`.

**Pros:**
- Cleaner codebase
- Less confusion
- Smaller bundle size

**Cons:**
- Need to verify nothing depends on legacy paths

**Effort:** 2-3 hours

**Risk:** Low (code paths are unreachable)

## Recommended Action

_To be filled during triage._

## Technical Details

**Files to modify/delete:**
- `src/services/providers/tokenStorage.ts` - DELETE
- `src/context/CalendarProviderContext.tsx` - remove legacy branches
- Provider auth files - remove `USE_CLERK_TOKENS` checks

## Resources

- **PR:** #17

## Acceptance Criteria

- [ ] `USE_CLERK_TOKENS` flag removed
- [ ] Legacy code paths deleted
- [ ] `tokenStorage.ts` deleted
- [ ] Application works correctly
- [ ] Bundle size reduced

## Work Log

### 2025-12-07 - Discovery via Code Simplicity Review

**By:** Claude Code (Code Simplicity Reviewer Agent)

**Actions:**
- Identified 600+ lines of dead code
- Created todo for cleanup
