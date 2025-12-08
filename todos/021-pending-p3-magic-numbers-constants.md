---
status: pending
priority: p3
issue_id: "021"
tags: [code-quality, maintainability, constants]
dependencies: []
---

# Extract Magic Numbers to Named Constants

## Problem Statement

Magic numbers are scattered throughout the codebase for time calculations, thresholds, and limits. These should be extracted to named constants for clarity and maintainability.

## Findings

- **Locations:**
  - `src/components/CalendarDashboard.tsx` - time calculations
  - `api/calendar/sync.ts` - timeouts, limits
  - Various components - threshold values
- **Examples:**
  ```typescript
  // What does 3000000 mean?
  const expiry = Date.now() + 3000000;

  // What is 60000?
  if (cached.expiresAt > Date.now() + 60000) { ... }

  // Magic threshold
  if (events.length > 50) { ... }
  ```
- **Impact:**
  - Code intent unclear
  - Easy to introduce bugs when changing values
  - Difficult to maintain consistent values

## Proposed Solutions

### Option 1: Create Constants File (Recommended)

**Approach:** Extract to a central constants file.

```typescript
// src/constants/time.ts
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const TOKEN_EXPIRY_BUFFER_MS = MINUTE_MS; // 1 minute buffer
export const TOKEN_CACHE_DURATION_MS = 50 * MINUTE_MS; // 50 minutes

// src/constants/limits.ts
export const MAX_EVENTS_PER_SYNC = 50;
export const MAX_CALENDARS_PER_USER = 10;
export const HEALTH_SCORE_THRESHOLD = 70;
```

**Usage:**
```typescript
import { TOKEN_EXPIRY_BUFFER_MS, TOKEN_CACHE_DURATION_MS } from '@/constants/time';

if (cached.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) { ... }
```

**Pros:**
- Clear intent
- Single source of truth
- Easy to adjust values
- Self-documenting code

**Cons:**
- Additional files
- Import overhead

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Inline Named Constants

**Approach:** Define constants where used.

```typescript
const TOKEN_BUFFER_MS = 60_000; // 1 minute
if (cached.expiresAt > Date.now() + TOKEN_BUFFER_MS) { ... }
```

**Pros:**
- Minimal change
- No new files

**Cons:**
- Potential duplication
- Less discoverable

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Common magic numbers found:**
- `3000000` - 50 minutes in milliseconds
- `60000` - 1 minute in milliseconds
- `5 * 60 * 1000` - 5 minutes
- `50` - event/calendar limits
- `70` - health score threshold

**Suggested structure:**
```
src/constants/
├── time.ts      # Time-related constants
├── limits.ts    # Size/count limits
├── thresholds.ts # Business logic thresholds
└── index.ts     # Re-exports
```

## Resources

- **PR:** #17
- **Clean Code Constants:** https://refactoring.guru/replace-magic-number-with-symbolic-constant

## Acceptance Criteria

- [ ] Magic numbers replaced with named constants
- [ ] Constants file(s) created
- [ ] Code is self-documenting
- [ ] No functionality changes

## Work Log

### 2025-12-07 - Discovery via Pattern Recognition Review

**By:** Claude Code (Pattern Recognition Specialist Agent)

**Actions:**
- Identified magic numbers across codebase
- Created todo for extraction

**Learnings:**
- Magic numbers reduce code clarity
- Named constants improve maintainability

## Notes

- Low priority but improves code quality
- Can be done incrementally
