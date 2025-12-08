---
status: pending
priority: p2
issue_id: "009"
tags: [security, validation, api]
dependencies: []
---

# Add Input Validation to Health Factors Endpoint

## Problem Statement

The `/api/health-factors` endpoint lacks proper input validation. Malformed or malicious input could cause errors, unexpected behavior, or potential security issues.

## Findings

- **File:** `api/health-factors.ts` (or similar)
- **Issue:** Missing schema validation on request body
- **Impact:**
  - Potential for injection attacks
  - Unclear error messages for invalid input
  - Unpredictable behavior with malformed data

## Proposed Solutions

### Option 1: Zod Schema Validation (Recommended)

**Approach:** Use Zod for runtime schema validation.

```typescript
import { z } from 'zod';

const HealthFactorsSchema = z.object({
  events: z.array(z.object({
    id: z.string(),
    title: z.string().max(500),
    start: z.string().datetime(),
    end: z.string().datetime(),
  })).max(1000),
  timeframe: z.enum(['day', 'week', 'month']).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = HealthFactorsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.issues });
  }
  // Use result.data (typed and validated)
}
```

**Pros:**
- Type-safe validation
- Clear error messages
- Reusable schemas

**Cons:**
- Additional dependency
- Learning curve

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Manual Validation

**Approach:** Write custom validation functions.

**Pros:**
- No dependencies
- Full control

**Cons:**
- More code to maintain
- Easy to miss edge cases

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/health-factors.ts`
- Other API endpoints (audit for similar issues)

**Validation requirements:**
- Max array lengths
- String length limits
- Required fields
- Type checking

## Resources

- **PR:** #17
- **Zod:** https://zod.dev/

## Acceptance Criteria

- [ ] Input validation on all API parameters
- [ ] Clear error messages for invalid input
- [ ] Max limits on arrays and strings
- [ ] 400 Bad Request for validation failures

## Work Log

### 2025-12-07 - Discovery via Security Review

**By:** Claude Code (Security Sentinel Agent)

**Actions:**
- Identified missing input validation
- Created todo for tracking

## Notes

- Consider adding validation to all API endpoints
- Zod can generate TypeScript types from schemas
