---
status: completed
priority: p1
issue_id: "006"
tags: [data-integrity, architecture, database, critical]
dependencies: []
---

# CRITICAL: Primary Calendar Ambiguity (Multiple Sources of Truth)

## Problem Statement

Primary calendar is determined by multiple conflicting sources: localStorage, database column, and API responses. This creates race conditions and inconsistent state where different parts of the app may disagree on which calendar is primary.

## Findings

- **Sources of truth identified:**
  1. `localStorage('managed_calendar_id')` - client-side
  2. `managed_calendars.is_primary` column - database
  3. API response defaults - varies by endpoint
- **Impact:**
  - UI shows different primary calendar than operations use
  - Events may be created in wrong calendar
  - Sync operations may target wrong calendar
- **Example scenario:**
  1. User sets Calendar A as primary in UI (localStorage updated)
  2. Sync runs, sets Calendar B as primary (database updated)
  3. User creates event - which calendar receives it?

## Proposed Solutions

### Option 1: Database as Single Source of Truth (Recommended)

**Approach:** Remove localStorage, always fetch primary from database.

```typescript
// Remove localStorage usage for primary calendar
// Always query: SELECT * FROM managed_calendars WHERE is_primary = true

// API endpoint to update primary
POST /api/calendar/set-primary
{ calendar_id: 'xxx' }
```

**Pros:**
- Single source of truth
- Consistent across devices
- Database constraints can enforce single primary

**Cons:**
- Requires API call to read primary
- Slightly slower initial load

**Effort:** 3-4 hours

**Risk:** Low

---

### Option 2: localStorage with Database Sync

**Approach:** Keep localStorage for performance, sync with database.

**Pros:**
- Fast local reads
- Works offline

**Cons:**
- Still has potential conflicts
- More complex sync logic

**Effort:** 4-6 hours

**Risk:** Medium

---

### Option 3: Context-Based Primary Selection

**Approach:** Determine primary based on context (provider, most recent, etc.)

**Pros:**
- No explicit storage needed
- Self-healing

**Cons:**
- Unpredictable behavior
- Not user-controllable

**Effort:** 2-3 hours

**Risk:** High

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/context/CalendarProviderContext.tsx` - localStorage usage
- `api/calendar/sync.ts` - primary setting
- Database: `managed_calendars.is_primary`

**Database changes:**
- Consider UNIQUE partial index: only one primary per user
  ```sql
  CREATE UNIQUE INDEX managed_calendars_one_primary
  ON managed_calendars (user_id)
  WHERE is_primary = true;
  ```

## Resources

- **PR:** #17
- **Related:** Issue #002, #003 (data integrity)

## Acceptance Criteria

- [ ] Single source of truth for primary calendar
- [ ] Database enforces only one primary per user
- [ ] localStorage usage removed or clearly documented as cache
- [ ] API provides consistent primary calendar info
- [ ] UI and operations agree on primary

## Work Log

### 2025-12-07 - Discovery via Data Integrity Review

**By:** Claude Code (Data Integrity Guardian Agent)

**Actions:**
- Identified multiple sources of truth for primary calendar
- Analyzed conflict scenarios
- Created todo for tracking

**Learnings:**
- Single source of truth is essential for data consistency
- Database should own state, client can cache

## Notes

- This is related to but distinct from Issues #002 and #003
- Consider solving this as part of calendar sync improvements
