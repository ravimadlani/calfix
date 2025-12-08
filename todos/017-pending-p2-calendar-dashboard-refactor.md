---
status: pending
priority: p2
issue_id: "017"
tags: [code-quality, refactoring, maintainability]
dependencies: []
---

# Refactor CalendarDashboard Component

## Problem Statement

The `CalendarDashboard.tsx` component has grown to 1640 lines with 42 state variables, making it difficult to maintain, test, and reason about. This is a "god component" anti-pattern that violates single responsibility principle.

## Findings

- **File:** `src/components/CalendarDashboard.tsx`
- **Size:** ~1640 lines
- **State variables:** 42 useState hooks
- **Console logs:** 62+ console.log statements
- **Impact:**
  - Difficult to maintain and debug
  - Hard to test individual features
  - High cognitive load for developers
  - Performance concerns from excessive re-renders

## Proposed Solutions

### Option 1: Extract Feature Components (Recommended)

**Approach:** Break down into smaller, focused components.

```
src/components/dashboard/
├── CalendarDashboard.tsx        # Main orchestrator (300-400 lines)
├── CalendarInbox.tsx            # Inbox tab
├── HealthScorePanel.tsx         # Health score display
├── EventList.tsx                # Event listing
├── CalendarSelector.tsx         # Calendar picker
├── AlertsPanel.tsx              # Alerts tab
└── hooks/
    ├── useCalendarEvents.ts     # Event fetching/filtering
    ├── useHealthScore.ts        # Health calculations
    └── useCalendarSync.ts       # Sync operations
```

**Pros:**
- Single responsibility per component
- Easier testing
- Better code organization
- Improved maintainability

**Cons:**
- Significant refactoring effort
- Need to carefully manage shared state

**Effort:** 6-8 hours

**Risk:** Medium (need comprehensive testing)

---

### Option 2: Use Custom Hooks for State Management

**Approach:** Extract state logic to custom hooks, keep single component.

**Pros:**
- Less structural change
- Reusable hooks

**Cons:**
- Component still large
- Partial improvement

**Effort:** 3-4 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Current state variables include:**
- Calendar selection state
- Event data and filtering
- Health score calculations
- UI state (tabs, modals, loading)
- Sync status
- Alert management

**Suggested extraction:**
1. Calendar state → CalendarSelector + useCalendarState
2. Event state → EventList + useCalendarEvents
3. Health state → HealthScorePanel + useHealthScore
4. Tab/UI state → Keep in main component

## Resources

- **PR:** #17
- **React Patterns:** https://reactpatterns.com/

## Acceptance Criteria

- [ ] No single component exceeds 400 lines
- [ ] State grouped by feature
- [ ] Custom hooks for complex logic
- [ ] Existing functionality preserved
- [ ] Component tests added

## Work Log

### 2025-12-07 - Discovery via Code Simplicity Review

**By:** Claude Code (Code Simplicity Reviewer Agent)

**Actions:**
- Identified god component anti-pattern
- Counted 42 state variables
- Created todo for refactoring

**Learnings:**
- Components should have single responsibility
- Extract hooks for reusable logic
- Keep components under 400 lines

## Notes

- Consider incremental refactoring approach
- Start with extracting the most independent pieces
- Add tests before refactoring
