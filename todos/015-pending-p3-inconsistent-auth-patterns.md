---
status: pending
priority: p3
issue_id: "015"
tags: [code-quality, consistency, api]
dependencies: []
---

# Standardize Authentication Function Usage

## Problem Statement

API endpoints use inconsistent auth patterns: some use `verifyAuth()`, others use `authenticateRequest()`. This inconsistency makes code harder to maintain and may lead to security gaps.

## Findings

- **Patterns found:**
  - `verifyAuth(req)` - some endpoints
  - `authenticateRequest(req, res)` - other endpoints
  - Direct Clerk calls - a few places
- **Impact:**
  - Inconsistent error handling
  - Harder to audit security
  - Code duplication

## Proposed Solutions

### Option 1: Standardize on authenticateRequest (Recommended)

**Approach:** Use single auth function across all endpoints.

```typescript
// All endpoints use:
const userId = await authenticateRequest(req, res);
if (!userId) return; // Response already sent

// Consistent pattern everywhere
```

**Pros:**
- Single pattern to audit
- Consistent error responses
- Easier maintenance

**Cons:**
- Migration needed

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- All files in `api/` directory
- `api/lib/auth.ts` - may need consolidation

## Resources

- **PR:** #17

## Acceptance Criteria

- [ ] Single auth pattern across all endpoints
- [ ] Consistent error responses
- [ ] All endpoints audited

## Work Log

### 2025-12-07 - Discovery via Pattern Recognition Review

**By:** Claude Code (Pattern Recognition Specialist Agent)

**Actions:**
- Identified inconsistent auth patterns
- Created todo for standardization
