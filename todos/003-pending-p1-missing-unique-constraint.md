---
status: completed
priority: p1
issue_id: "003"
tags: [database, constraints, data-integrity, critical]
dependencies: []
---

# CRITICAL: Missing UNIQUE Constraint on managed_calendars

## Problem Statement

The `managed_calendars` table lacks a UNIQUE constraint on `(user_id, calendar_id)`. This allows duplicate calendar entries which can cause sync conflicts, double-processing of events, and inconsistent UI state.

## Findings

- **Table:** `managed_calendars`
- **Missing constraint:** UNIQUE(user_id, calendar_id)
- **Impact:**
  - Duplicate calendars can be inserted
  - Calendar operations may affect wrong records
  - Upsert operations cannot be used safely
- **Related:** Issue #002 (race condition) depends on this constraint for Option 2

## Proposed Solutions

### Option 1: Add UNIQUE Constraint (Recommended)

**Approach:** Create migration to add unique constraint.

```sql
-- First, remove any existing duplicates
DELETE FROM managed_calendars a USING managed_calendars b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND a.calendar_id = b.calendar_id;

-- Add constraint
ALTER TABLE managed_calendars
ADD CONSTRAINT managed_calendars_user_calendar_unique
UNIQUE (user_id, calendar_id);
```

**Pros:**
- Database enforces uniqueness
- Enables upsert operations
- Prevents data corruption

**Cons:**
- Migration required
- Need to handle existing duplicates

**Effort:** 1 hour

**Risk:** Low (with duplicate cleanup)

---

### Option 2: Create New Table with Constraint

**Approach:** Create new table with proper constraints, migrate data.

**Pros:**
- Clean schema design
- No duplicate cleanup needed

**Cons:**
- More complex migration
- Potential downtime

**Effort:** 3-4 hours

**Risk:** Medium

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- Database schema: `managed_calendars` table
- `api/calendar/sync.ts` - can use upsert after constraint added

**Database changes:**
- Add UNIQUE constraint on (user_id, calendar_id)
- Clean up any existing duplicates first

## Resources

- **PR:** #17
- **Related:** Issue #002 (race condition)
- **Supabase Migrations:** https://supabase.com/docs/guides/database/migrations

## Acceptance Criteria

- [ ] UNIQUE constraint exists on (user_id, calendar_id)
- [ ] No duplicate records in production
- [ ] Migration tested in preview environment
- [ ] API handles constraint violations gracefully

## Work Log

### 2025-12-07 - Discovery via Data Integrity Review

**By:** Claude Code (Data Integrity Guardian Agent)

**Actions:**
- Identified missing UNIQUE constraint
- Noted dependency relationship with race condition fix
- Created todo for tracking

**Learnings:**
- Always define database constraints for data integrity
- Constraints enable safer update patterns (upsert)

## Notes

- Consider adding this constraint as part of Issue #002 fix
- Check for duplicates before migration
