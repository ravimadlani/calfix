---
status: pending
priority: p3
issue_id: "030"
tags: [logging, code-review, pr-18, security, production]
dependencies: []
---

# NICE-TO-HAVE: Console.error Statements in Production Code

## Problem Statement

SchedulePage.tsx has 4 console.error statements that will log to browser console in production, potentially exposing error details to users.

**PR:** #18 - feat: Dedicated Schedule page with Quick Schedule buttons

## Findings

### Console.error Locations

| Line | Context | Content |
|------|---------|---------|
| 233 | fetchCalendars | `console.error('Failed to fetch calendar list:', error)` |
| 640 | findCommonFreeSlots | `console.error('Error searching availability', error)` |
| 719 | copyEmailToClipboard | `console.error('Clipboard copy failed', error)` |
| 769 | createCalendarHolds | `console.error('Error creating calendar holds', error)` |

### Potential Issues

1. **Information Disclosure:** Error objects may contain sensitive data (tokens, emails)
2. **User Experience:** Technical errors visible in console
3. **No Tracking:** Errors not sent to monitoring service

## Proposed Solutions

### Option 1: Create Error Logger Utility (Recommended)

```typescript
// src/utils/errorLogger.ts
export const logError = (context: string, error: unknown, metadata?: Record<string, unknown>) => {
  // Sanitize error message
  const message = error instanceof Error
    ? error.message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
                  .replace(/[A-Za-z0-9-_]{20,}/g, '[TOKEN]')
    : 'Unknown error';

  // Development: Console log
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error, metadata);
  }

  // Production: Send to error tracking
  // Sentry.captureException(error, { tags: { context }, extra: metadata });
};

// Usage:
logError('fetchCalendars', error, { calendarId: managedCalendarId });
```

**Pros:**
- Sanitizes sensitive data
- Environment-aware logging
- Prepared for error tracking
- Consistent pattern

**Cons:**
- Needs error tracking setup
- Minor refactoring

**Effort:** Small
**Risk:** Low

### Option 2: Remove Console Statements

Simply remove all console.error calls, rely on error state.

**Pros:**
- No information disclosure
- Simplest fix

**Cons:**
- Lose debugging ability
- No production error visibility

**Effort:** Minimal
**Risk:** Low

## Recommended Action

**Option 1** - Create error logger utility. Sets foundation for proper error tracking.

## Acceptance Criteria

- [ ] No raw console.error in production code
- [ ] Error logger utility created
- [ ] Sensitive data sanitized from logs
- [ ] Ready for Sentry/LogRocket integration

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-08 | Created during PR #18 review | 4 console.error statements found |

## Resources

- **PR:** https://github.com/ravimadlani/calfix/pull/18
- **Related:** Todo #014 (excessive console logging)
