---
status: pending
priority: p3
issue_id: "016"
tags: [security, csrf, api]
dependencies: ["001"]
---

# Add CSRF Protection

## Problem Statement

State-changing API endpoints lack CSRF protection. While Bearer token auth provides some protection, additional CSRF measures would strengthen security posture.

## Findings

- **Issue:** No CSRF tokens on POST/PUT/DELETE endpoints
- **Current protection:** Bearer tokens in Authorization header
- **Gap:** If tokens are accessible to JS, CSRF attacks possible

## Proposed Solutions

### Option 1: SameSite Cookies + Custom Header (Recommended)

**Approach:** Combine SameSite cookies with custom header requirement.

```typescript
// Require custom header on mutating requests
if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
}
```

**Pros:**
- Simple implementation
- Effective protection
- No token management

**Cons:**
- Requires frontend changes

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- All mutating API endpoints
- Frontend fetch calls

## Resources

- **PR:** #17
- **OWASP CSRF:** https://owasp.org/www-community/attacks/csrf

## Acceptance Criteria

- [ ] CSRF protection on mutating endpoints
- [ ] Frontend sends required headers
- [ ] No breaking changes for legitimate requests

## Work Log

### 2025-12-07 - Discovery via Security Review

**By:** Claude Code (Security Sentinel Agent)

**Actions:**
- Identified missing CSRF protection
- Created todo for implementation
