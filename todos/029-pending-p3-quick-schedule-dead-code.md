---
status: pending
priority: p3
issue_id: "029"
tags: [code-quality, code-review, pr-18, dead-code, cleanup]
dependencies: []
---

# NICE-TO-HAVE: Dead Code in QuickScheduleButtons

## Problem Statement

QuickScheduleButtons.tsx contains dead code where a variable is created, mutated, then ignored.

**PR:** #18 - feat: Dedicated Schedule page with Quick Schedule buttons

## Findings

### Unused Variable (Lines 30-32)

```typescript
const generateThisWeekSlots = (): PrefilledSlot[] => {
  const businessDays = getNextBusinessDays(3);
  return businessDays.map(day => {
    const start = setMinutes(setHours(day, 10), 0); // 10:00 AM
    const end = addDays(start, 0);                  // Creates Date
    end.setMinutes(end.getMinutes() + meetingDuration); // Mutates it
    return { start, end: new Date(start.getTime() + meetingDuration * 60 * 1000) }; // Ignores it!
  });
};
```

**Issue:** `end` variable is created with `addDays(start, 0)`, then mutated with `setMinutes`, but the return statement creates a completely new Date object, making the previous two lines dead code.

## Proposed Solutions

### Option 1: Remove Dead Code (Recommended)

```typescript
const generateThisWeekSlots = (): PrefilledSlot[] => {
  const businessDays = getNextBusinessDays(3);
  return businessDays.map(day => {
    const start = setMinutes(setHours(day, 10), 0);
    const end = new Date(start.getTime() + meetingDuration * 60 * 1000);
    return { start, end };
  });
};
```

**Pros:**
- Cleaner code
- No wasted operations
- Easier to understand

**Effort:** Minimal
**Risk:** None

## Recommended Action

Remove the dead code - this is a trivial fix with no risk.

## Acceptance Criteria

- [ ] Dead code removed from generateThisWeekSlots
- [ ] Function produces same output
- [ ] Similar pattern checked in other generate functions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-08 | Created during PR #18 review | Likely copy-paste artifact |

## Resources

- **PR:** https://github.com/ravimadlani/calfix/pull/18
- **File:** `src/components/scheduling/QuickScheduleButtons.tsx`
