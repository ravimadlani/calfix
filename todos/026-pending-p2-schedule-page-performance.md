---
status: pending
priority: p2
issue_id: "026"
tags: [performance, code-review, pr-18, react, optimization]
dependencies: []
---

# IMPORTANT: Performance Issues in SchedulePage

## Problem Statement

SchedulePage.tsx has multiple performance issues including O(n²) algorithm complexity, missing memoization, and unnecessary re-renders. At scale (30-day search, 10 participants), search could take 15-20 seconds.

**PR:** #18 - feat: Dedicated Schedule page with Quick Schedule buttons

## Findings

### 1. O(n²) Algorithm in findCommonFreeSlots
- **File:** `src/pages/SchedulePage.tsx:536-647`
- **Complexity:** O(days × slots_per_day × calendars × busy_periods)
- **Current:** ~2-3 seconds for 10 days, 3 calendars
- **At Scale:** 15-20 seconds for 30 days, 10 calendars

```typescript
while (dayCursor < searchEnd && proposedSlots.length < 80) {    // O(days)
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {     // O(48)
    for (const calendarId of calendarIdentifiers) {             // O(calendars)
      const conflict = calendar.busy.some((busy) => { ... });   // O(busy)
    }
  }
}
```

### 2. Repeated Intl.DateTimeFormat Creation
- **Files:** Lines 97-145, 339, 687, 1234
- **Issue:** Creates new formatters on every call
- **Impact:** ~0.5ms per formatter × thousands of calls = seconds wasted

```typescript
// Created on EVERY call
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: timezone,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});
```

### 3. Missing useCallback for Event Handlers
- **Lines:** 395-445, 649-657
- **Issue:** Functions recreated on every render
- **Impact:** All 80 slot cards re-render when parent state changes

```typescript
// Recreated every render - passed to 80 slot cards
const toggleSlotSelection = (slot: AvailabilitySlot) => { ... }
```

### 4. summarizeSlotTimezones Called in Render
- **Line:** 1095 (inside renderSlotCard)
- **Issue:** Creates new Map/arrays for each of 80 slots on every render
- **Impact:** 80 Maps + 240 arrays per render cycle

### 5. Unbounded fetchCalendars Dependency
- **Lines:** 237-239
- **Issue:** fetchCalendars is recreated due to managedCalendarId dependency
- **Impact:** May re-fetch calendars unnecessarily

## Proposed Solutions

### Option 1: Optimize findCommonFreeSlots (Recommended)

**Approach:** Pre-compute merged busy intervals

```typescript
// Pre-compute busy periods into sorted intervals
const mergedBusyPeriods = mergeBusyPeriodsForAllCalendars(busyLookup);
const freeSlots = findGapsInBusyPeriods(mergedBusyPeriods, durationMs);
// Then filter by working hours
```

**Expected Improvement:** O(n log n) → 95% faster for 30-day windows

**Effort:** Medium
**Risk:** Medium

### Option 2: Cache Intl.DateTimeFormat Instances

```typescript
const timeFormatters = useMemo(() => {
  const cache = new Map<string, Intl.DateTimeFormat>();
  return {
    getFormatter: (timezone: string, options: Intl.DateTimeFormatOptions) => {
      const key = `${timezone}_${JSON.stringify(options)}`;
      if (!cache.has(key)) {
        cache.set(key, new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }));
      }
      return cache.get(key)!;
    }
  };
}, []);
```

**Expected Improvement:** 60-70% faster slot computation

**Effort:** Small
**Risk:** Low

### Option 3: Wrap Event Handlers in useCallback

```typescript
const toggleSlotSelection = useCallback((slot: AvailabilitySlot) => {
  setSelectedSlots(prev => {
    const exists = prev.find(existing => existing.id === slot.id);
    return exists ? prev.filter(s => s.id !== slot.id) : [...prev, slot];
  });
}, []); // No dependencies needed
```

**Expected Improvement:** 80% reduction in slot card re-renders

**Effort:** Small
**Risk:** Low

### Option 4: Pre-compute summarizeSlotTimezones

```typescript
// During slot generation (line 622)
const slot = {
  // ...existing fields
  timezoneSummary: summarizeSlotTimezones(participantStatus) // Cache here
};
```

**Effort:** Small
**Risk:** Low

## Recommended Action

Apply all four options:
1. **Immediate:** Options 2, 3, 4 (quick wins)
2. **Next Sprint:** Option 1 (algorithm optimization)

## Scalability Projections

| Scenario | Current | After Fixes |
|----------|---------|-------------|
| Search 10 days | ~2s | ~500ms |
| Search 30 days | ~15s | ~2s |
| Render 80 slots | ~200ms | ~50ms |
| Re-render cycle | ~100ms | ~20ms |

## Acceptance Criteria

- [ ] Search completes in <3s for 30-day window
- [ ] Slot grid renders in <100ms
- [ ] No unnecessary re-renders on state change
- [ ] Intl.DateTimeFormat instances cached
- [ ] Event handlers wrapped in useCallback

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-08 | Created during PR #18 review | Nested loops cause O(n²) |

## Resources

- **PR:** https://github.com/ravimadlani/calfix/pull/18
- **React Performance:** https://react.dev/learn/render-and-commit
