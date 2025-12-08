---
status: completed
priority: p1
issue_id: "002"
tags: [database, data-integrity, race-condition, critical]
dependencies: []
---

# CRITICAL: Calendar Sync Race Condition

## Problem Statement

The calendar sync operation in `/api/calendar/sync.ts` uses a delete-then-insert pattern without database transactions. If the insert fails after the delete completes, user data is permanently lost with no recovery path.

## Findings

- **File:** `api/calendar/sync.ts`
- **Pattern:**
  ```typescript
  // Operation 1: Delete ALL existing calendars
  await supabase.from('managed_calendars').delete().eq('user_id', userId);

  // Operation 2: Insert new calendars (if this fails, data is GONE)
  await supabase.from('managed_calendars').insert(managedCalendarsData);
  ```
- **Impact:** Data loss on insert failure, network interruption, or timeout
- **Risk Level:** HIGH - affects user calendar configuration

## Proposed Solutions

### Option 1: Use Supabase RPC with Transaction (Recommended)

**Approach:** Create a PostgreSQL function that wraps delete+insert in a transaction.

```sql
-- Migration
CREATE OR REPLACE FUNCTION sync_managed_calendars(
  p_user_id TEXT,
  p_calendars JSONB
) RETURNS void AS $$
BEGIN
  DELETE FROM managed_calendars WHERE user_id = p_user_id;
  INSERT INTO managed_calendars SELECT * FROM jsonb_populate_recordset(null::managed_calendars, p_calendars);
END;
$$ LANGUAGE plpgsql;
```

```typescript
// API call
await supabase.rpc('sync_managed_calendars', {
  p_user_id: userId,
  p_calendars: managedCalendarsData
});
```

**Pros:**
- Atomic operation - all or nothing
- Rollback on failure
- Standard database pattern

**Cons:**
- Requires migration
- More complex to test

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Upsert Pattern

**Approach:** Use upsert instead of delete+insert. Mark calendars as inactive instead of deleting.

```typescript
await supabase
  .from('managed_calendars')
  .upsert(managedCalendarsData, { onConflict: 'user_id,calendar_id' });
```

**Pros:**
- No data loss possible
- Simpler implementation
- Can track history

**Cons:**
- Requires UNIQUE constraint
- May leave orphaned records

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 3: Soft Delete with Cleanup

**Approach:** Mark old records as deleted, insert new ones, then clean up on success.

**Pros:**
- Recovery possible
- Can audit changes

**Cons:**
- More complex logic
- Requires additional column

**Effort:** 3-4 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/calendar/sync.ts` - sync operation
- Database: `managed_calendars` table

**Database changes needed:**
- Option 1: New RPC function
- Option 2: UNIQUE constraint on (user_id, calendar_id)

## Resources

- **PR:** #17
- **Supabase RPC Docs:** https://supabase.com/docs/reference/javascript/rpc

## Acceptance Criteria

- [ ] Calendar sync is atomic (all or nothing)
- [ ] Insert failure does not cause data loss
- [ ] Transaction rollback on any error
- [ ] Existing functionality preserved
- [ ] Test with simulated failure scenarios

## Work Log

### 2025-12-07 - Discovery via Data Integrity Review

**By:** Claude Code (Data Integrity Guardian Agent)

**Actions:**
- Identified delete-then-insert pattern without transaction
- Flagged as CRITICAL data integrity issue
- Created todo for tracking

**Learnings:**
- Always use transactions for multi-step database operations
- Supabase RPC provides transaction support

## Notes

- This is a CRITICAL issue that should block PR merge
- Consider adding database constraints as defense-in-depth (see issue #003)
