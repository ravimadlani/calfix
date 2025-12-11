---
status: pending
priority: p2
issue_id: "028"
tags: [react, code-review, pr-18, hooks, bugs]
dependencies: []
---

# IMPORTANT: useEffect Missing Dependencies in SchedulePage

## Problem Statement

Several useEffect hooks in SchedulePage.tsx have incomplete dependency arrays, which can cause stale closures and bugs.

**PR:** #18 - feat: Dedicated Schedule page with Quick Schedule buttons

## Findings

### 1. prefilledSlots Effect (Lines 318-360)

```typescript
useEffect(() => {
  if (prefilledSlots.length > 0) {
    // Uses: setSelectedSlots, setHoldTitles, setEmailDraft, setStep
    // Uses: meetingPurpose, defaultTimezone
    const slots: AvailabilitySlot[] = prefilledSlots.map((slot, index) => ({
      id: `prefilled_${index}_${slot.start.toISOString()}`,
      // ...
    }));
    setSelectedSlots(slots);
    // ... more state updates
  }
}, [prefilledSlots, meetingPurpose, defaultTimezone]); // Missing dependencies
```

**Issue:** Missing `setSelectedSlots`, `setHoldTitles`, `setEmailDraft`, `setStep` in deps
**Risk:** Low (setters are stable), but violates exhaustive-deps rule

### 2. fetchCalendars Effect (Lines 237-239)

```typescript
useEffect(() => {
  fetchCalendars();
}, [fetchCalendars]);
```

**Issue:** `fetchCalendars` callback depends on `managedCalendarId` (line 235)
**Risk:** May cause extra fetches or stale calendar data

### 3. Calendar Selection Effect (Lines 294-309)

```typescript
useEffect(() => {
  const selectedCalendar = availableCalendars.find(c => c.id === managedCalendarId);
  if (selectedCalendar) {
    setParticipants(prev => prev.map(p =>
      p.role === 'host'
        ? { ...p, calendarId: managedCalendarId, displayName: selectedCalendar.summary || 'Primary Calendar', email: selectedCalendar.id }
        : p
    ));
  }
}, [managedCalendarId, availableCalendars]);
```

**Issue:** `setParticipants` function referenced but works due to stable reference
**Risk:** Low but inconsistent with other effects

## Proposed Solutions

### Option 1: Fix Dependency Arrays (Recommended)

```typescript
// For prefilledSlots effect - add all deps
useEffect(() => {
  if (prefilledSlots.length > 0) {
    // ... logic
  }
}, [prefilledSlots, meetingPurpose, defaultTimezone, setSelectedSlots, setHoldTitles, setEmailDraft, setStep]);

// For fetchCalendars - fix callback dependencies
const fetchCalendars = useCallback(async () => {
  if (!isCalendarConnected || !fetchProviderCalendarList) return;
  // ... logic
}, [fetchProviderCalendarList, isCalendarConnected]); // Remove managedCalendarId

useEffect(() => {
  fetchCalendars();
}, [fetchCalendars]);
```

**Pros:**
- Follows React rules
- Prevents stale closures
- ESLint compliant

**Cons:**
- May trigger more effect runs
- Need to verify no infinite loops

**Effort:** Small
**Risk:** Low-Medium (need testing)

### Option 2: Extract to Custom Hooks

```typescript
// hooks/usePrefilledSlots.ts
export function usePrefilledSlots(prefilledSlots, meetingPurpose, defaultTimezone) {
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [holdTitles, setHoldTitles] = useState([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (prefilledSlots.length > 0) {
      // All logic here with correct deps
    }
  }, [prefilledSlots, meetingPurpose, defaultTimezone]);

  return { selectedSlots, holdTitles, emailDraft, step };
}
```

**Pros:**
- Isolates complexity
- Easier to test
- Cleaner main component

**Cons:**
- More refactoring
- State coordination complexity

**Effort:** Medium
**Risk:** Medium

### Option 3: Use useReducer

Replace related useState calls with single reducer, eliminating dependency issues:

```typescript
const [state, dispatch] = useReducer(scheduleReducer, initialState);

useEffect(() => {
  if (prefilledSlots.length > 0) {
    dispatch({
      type: 'PREFILL_SLOTS',
      payload: { slots: prefilledSlots, meetingPurpose, defaultTimezone }
    });
  }
}, [prefilledSlots, meetingPurpose, defaultTimezone]);
```

**Pros:**
- No setter dependencies
- Cleaner effect logic
- Better state coordination

**Cons:**
- Requires significant refactoring

**Effort:** Medium
**Risk:** Low

## Recommended Action

1. **Immediate:** Option 1 - Fix dependency arrays
2. **Follow-up:** Option 3 - Migrate to useReducer (part of larger refactor)

## Acceptance Criteria

- [ ] All useEffect hooks have exhaustive dependencies
- [ ] No ESLint exhaustive-deps warnings
- [ ] No stale closure bugs
- [ ] All effects tested for correct behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-08 | Created during PR #18 review | 3 effects with incomplete deps |

## Resources

- **PR:** https://github.com/ravimadlani/calfix/pull/18
- **React Docs:** https://react.dev/reference/react/useEffect#specifying-reactive-dependencies
