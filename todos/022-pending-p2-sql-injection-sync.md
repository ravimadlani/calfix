---
status: pending
priority: p2
issue_id: "022"
tags: [security, sql-injection, database]
dependencies: []
---

# Fix SQL Injection Risk in Calendar Sync

## Problem Statement

The calendar sync cleanup operation uses string interpolation to build a SQL `NOT IN` clause. This is a potential SQL injection vector if calendar IDs are not properly sanitized.

## Findings

- **File:** `api/calendar/sync.ts`
- **Pattern:**
  ```typescript
  // Potential SQL injection if calendarIds are not sanitized
  const calendarIds = managedCalendarsData.map(c => c.calendar_id);
  await supabase
    .from('managed_calendars')
    .delete()
    .eq('user_id', userId)
    .not('calendar_id', 'in', `(${calendarIds.join(',')})`);
  ```
- **Risk:** If `calendar_id` values contain SQL metacharacters, they could alter the query
- **Severity:** Medium (calendar IDs typically come from trusted sources)

## Proposed Solutions

### Option 1: Use Parameterized Query (Recommended)

**Approach:** Use Supabase's array filter properly.

```typescript
const calendarIds = managedCalendarsData.map(c => c.calendar_id);

// Use proper array filtering
await supabase
  .from('managed_calendars')
  .delete()
  .eq('user_id', userId)
  .not('calendar_id', 'in', calendarIds); // Supabase handles escaping
```

Or using RPC:

```typescript
// Create RPC function that handles cleanup safely
await supabase.rpc('cleanup_unmanaged_calendars', {
  p_user_id: userId,
  p_calendar_ids: calendarIds
});
```

**Pros:**
- Eliminates injection risk
- Supabase handles escaping
- Proper parameterization

**Cons:**
- Minor code change needed

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Validate Calendar IDs

**Approach:** Validate calendar ID format before use.

```typescript
const calendarIdPattern = /^[a-zA-Z0-9_@.-]+$/;

const calendarIds = managedCalendarsData
  .map(c => c.calendar_id)
  .filter(id => calendarIdPattern.test(id));

if (calendarIds.length !== managedCalendarsData.length) {
  throw new Error('Invalid calendar ID format');
}
```

**Pros:**
- Defense in depth
- Catches malformed data

**Cons:**
- Additional validation code
- May reject valid IDs

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/calendar/sync.ts`

**Supabase filter syntax:**
```typescript
// Correct: Array is parameterized
.not('column', 'in', ['value1', 'value2'])

// Incorrect: String interpolation
.not('column', 'in', `(${values.join(',')})`)
```

## Resources

- **PR:** #17
- **OWASP SQL Injection:** https://owasp.org/www-community/attacks/SQL_Injection
- **Supabase Filters:** https://supabase.com/docs/reference/javascript/using-filters

## Acceptance Criteria

- [ ] String interpolation removed from SQL
- [ ] Parameterized queries used
- [ ] Input validation added
- [ ] No functionality changes

## Work Log

### 2025-12-07 - Discovery via Data Integrity Review

**By:** Claude Code (Data Integrity Guardian Agent)

**Actions:**
- Identified string interpolation in SQL
- Flagged as potential injection risk
- Created todo for fix

**Learnings:**
- Never use string interpolation for SQL
- Use parameterized queries or ORM methods

## Notes

- Calendar IDs from Google/Outlook are generally safe
- Still important to fix for defense in depth
- Audit codebase for similar patterns
