---
status: pending
priority: p2
issue_id: "018"
tags: [performance, database, index]
dependencies: []
---

# Add Database Index for Health Score Breakdowns

## Problem Statement

The `health_score_breakdowns` table lacks an index on `health_score_id`, causing slow queries when fetching breakdowns for health scores. This N+1 query pattern impacts dashboard performance.

## Findings

- **Table:** `health_score_breakdowns`
- **Missing index:** `health_score_id` foreign key
- **Query pattern:**
  ```sql
  SELECT * FROM health_score_breakdowns WHERE health_score_id = ?
  ```
- **Impact:**
  - Full table scan for each breakdown fetch
  - Slow dashboard loading with many health scores
  - O(n) query time instead of O(log n)

## Proposed Solutions

### Option 1: Add Index via Migration (Recommended)

**Approach:** Create migration to add index.

```sql
-- Migration: add_index_health_score_breakdowns
CREATE INDEX idx_health_score_breakdowns_health_score_id
ON health_score_breakdowns (health_score_id);
```

**Pros:**
- Significant query speedup
- Simple change
- No code changes needed

**Cons:**
- Migration required
- Temporary lock during index creation

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Composite Index with Date

**Approach:** Add composite index including date for time-based queries.

```sql
CREATE INDEX idx_health_score_breakdowns_score_date
ON health_score_breakdowns (health_score_id, created_at DESC);
```

**Pros:**
- Optimizes both lookup and date sorting
- Covers common query patterns

**Cons:**
- Larger index size

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected tables:**
- `health_score_breakdowns`

**Query to verify current indexes:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'health_score_breakdowns';
```

## Resources

- **PR:** #17
- **PostgreSQL Indexes:** https://www.postgresql.org/docs/current/indexes.html

## Acceptance Criteria

- [ ] Index created on health_score_id
- [ ] Migration tested in preview environment
- [ ] Query performance improved
- [ ] EXPLAIN shows index usage

## Work Log

### 2025-12-07 - Discovery via Performance Review

**By:** Claude Code (Performance Oracle Agent)

**Actions:**
- Identified missing index
- Flagged N+1 query pattern
- Created todo for database optimization

**Learnings:**
- Always index foreign keys
- Use EXPLAIN to verify query plans

## Notes

- Check for other tables missing indexes
- Consider adding indexes during initial migration
