---
status: pending
priority: p2
issue_id: "027"
tags: [code-quality, code-review, pr-18, constants, maintainability]
dependencies: []
---

# IMPORTANT: Magic Numbers Throughout SchedulePage

## Problem Statement

SchedulePage.tsx contains 15+ hardcoded magic numbers without named constants. This makes the code harder to understand, maintain, and modify.

**PR:** #18 - feat: Dedicated Schedule page with Quick Schedule buttons

## Findings

### Magic Numbers Identified

| Line | Value | Purpose | Suggested Constant |
|------|-------|---------|-------------------|
| 84 | `120` | Flex window minutes | `FLEX_MINUTES` (exists) |
| 156 | `1440` | Minutes per day | `MINUTES_PER_DAY` |
| 188 | `30` | Half-hour rounding | `SLOT_INCREMENT_MINUTES` |
| 503 | `1440` | Minutes per day (dup) | `MINUTES_PER_DAY` |
| 556 | `60 * 1000` | Minutes to ms | `MINUTES_TO_MS` |
| 562 | `80` | Max slots to find | `MAX_SLOTS_TO_GENERATE` |
| 573 | `30` | Slot increment (dup) | `SLOT_INCREMENT_MINUTES` |
| 573 | `24 * 60` | Minutes in day | `MINUTES_PER_DAY` |
| 1183 | `'60vh'` | Max slot grid height | `SLOT_GRID_MAX_HEIGHT` |

### Examples

```typescript
// Line 562: What does 80 mean?
while (dayCursor < searchEnd && proposedSlots.length < 80) {

// Line 573: Multiple calculations
for (let minutes = 0; minutes < 24 * 60; minutes += 30) {

// Line 156: Repeated value
normalizedWindowEnd = windowEnd + 1440;
```

## Proposed Solutions

### Option 1: Create Constants Module (Recommended)

```typescript
// src/utils/scheduling/constants.ts

// Time calculations
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR; // 1440
export const MINUTES_TO_MS = 60 * 1000;

// Slot generation
export const SLOT_INCREMENT_MINUTES = 30;
export const MAX_SLOTS_TO_GENERATE = 80;

// Working hours
export const FLEX_WINDOW_MINUTES = 120;
export const DEFAULT_WORK_START = '09:00';
export const DEFAULT_WORK_END = '17:00';

// UI constraints
export const SLOT_GRID_MAX_HEIGHT = '60vh';

// Existing constants to keep
export const MEETING_DURATION_OPTIONS = [30, 45, 60, 75, 90];
export const SEARCH_WINDOW_OPTIONS = [7, 10, 14, 21, 30];
```

**Pros:**
- Self-documenting code
- Single source of truth
- Easy to modify values
- Enables unit testing

**Cons:**
- Requires imports
- Minor refactoring effort

**Effort:** Small (1-2 hours)
**Risk:** Low

### Option 2: Inline Comments

**Approach:** Add comments explaining magic numbers

```typescript
// Max slots to generate (80 slots ≈ 40 hours of options)
while (dayCursor < searchEnd && proposedSlots.length < 80) {
```

**Pros:**
- Fastest fix
- No code changes

**Cons:**
- Comments can become stale
- Values still duplicated
- Harder to change

**Effort:** Minimal
**Risk:** Low

## Recommended Action

**Option 1** - Extract to constants module. This is a quick win that improves code quality significantly.

## Technical Details

### Files to Modify
- `src/pages/SchedulePage.tsx`
- `src/utils/scheduling/constants.ts` (new or extend existing)

### Changes Required

1. Create/extend constants file
2. Replace all magic numbers with constants
3. Import constants in SchedulePage

## Acceptance Criteria

- [ ] All numeric literals replaced with named constants
- [ ] Constants grouped logically in module
- [ ] No duplicate values
- [ ] JSDoc comments on constants explaining purpose

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-08 | Created during PR #18 review | 15+ magic numbers found |

## Resources

- **PR:** https://github.com/ravimadlani/calfix/pull/18
- **Clean Code:** Magic Numbers anti-pattern
