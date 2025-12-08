---
status: pending
priority: p3
issue_id: "014"
tags: [code-quality, logging, production]
dependencies: []
---

# Remove Excessive Console Logging

## Problem Statement

There are 94+ `console.log` statements in production code. This clutters browser consoles, may leak sensitive information, and impacts performance.

## Findings

- **Count:** 94+ console.log statements
- **Locations:** Spread across components and services
- **Issues:**
  - Clutters browser console
  - May expose sensitive data
  - Small performance impact
  - Unprofessional appearance

## Proposed Solutions

### Option 1: Replace with Proper Logging Service (Recommended)

**Approach:** Use structured logging that can be disabled in production.

```typescript
// src/utils/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};
```

**Pros:**
- Controlled logging
- Environment-aware
- Consistent format

**Cons:**
- Migration effort

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Remove All Debug Logs

**Approach:** Delete all console.log statements, keep console.error.

**Pros:**
- Quick cleanup
- Clean console

**Cons:**
- Loses debugging capability

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**To find all logs:**
```bash
grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | wc -l
```

## Resources

- **PR:** #17

## Acceptance Criteria

- [ ] console.log statements removed or replaced
- [ ] Logging utility created
- [ ] Production console clean
- [ ] Debug logs available in development

## Work Log

### 2025-12-07 - Discovery via Pattern Recognition Review

**By:** Claude Code (Pattern Recognition Specialist Agent)

**Actions:**
- Counted 94+ console.log statements
- Created todo for cleanup
