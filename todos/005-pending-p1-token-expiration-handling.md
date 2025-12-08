---
status: completed
priority: p1
issue_id: "005"
tags: [security, oauth, tokens, critical]
dependencies: []
---

# CRITICAL: No Token Expiration Handling

## Problem Statement

OAuth tokens have no expiration tracking or refresh logic. Expired tokens will cause API calls to fail without clear error handling or automatic refresh, leading to broken calendar functionality.

## Findings

- **Issue:** Access tokens returned without expiration metadata
- **Impact:**
  - Calendar operations fail when tokens expire
  - Users see cryptic errors instead of re-auth prompt
  - No automatic token refresh
- **Code pattern:**
  ```typescript
  // Token returned without expiration info
  return res.status(200).json({ access_token: data.token });
  // Client has no idea when this expires
  ```

## Proposed Solutions

### Option 1: Return Expiration Metadata (Recommended)

**Approach:** Include token expiration time in API response.

```typescript
return res.status(200).json({
  access_token: data.token,
  expires_at: data.expiresAt, // Unix timestamp
  token_type: 'Bearer'
});
```

Frontend can then:
- Track expiration
- Proactively refresh before expiry
- Show re-auth prompts when needed

**Pros:**
- Client can manage token lifecycle
- Better UX with proactive refresh
- Clear API contract

**Cons:**
- Frontend needs token management logic

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Implement Server-Side Token Refresh

**Approach:** Server automatically refreshes expired tokens using refresh tokens.

**Pros:**
- Transparent to client
- Handles long sessions

**Cons:**
- More complex server logic
- Need to store refresh tokens securely

**Effort:** 4-6 hours

**Risk:** Medium

---

### Option 3: Short-Lived Tokens with Aggressive Refresh

**Approach:** Always fetch fresh token on each request.

**Pros:**
- Tokens always valid
- Simple implementation

**Cons:**
- Performance overhead
- More API calls to Clerk

**Effort:** 1 hour

**Risk:** Medium (rate limiting concerns)

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `api/calendar/token.ts` - token endpoint
- Frontend token consumers
- `src/context/CalendarProviderContext.tsx` - OAuth status checking

**Token lifecycle:**
1. User authenticates with Clerk
2. Clerk provides OAuth tokens for Google/Outlook
3. Our API proxies these tokens to frontend
4. Frontend uses tokens for calendar API calls
5. Tokens expire (typically 1 hour)
6. Currently: No handling = broken functionality

## Resources

- **PR:** #17
- **Clerk OAuth Docs:** https://clerk.com/docs/authentication/social-connections/oauth
- **Google Token Refresh:** https://developers.google.com/identity/protocols/oauth2/web-server#offline

## Acceptance Criteria

- [ ] Token expiration time available to client
- [ ] Frontend tracks token expiration
- [ ] Clear error handling for expired tokens
- [ ] Re-authentication flow works smoothly
- [ ] Optional: Automatic token refresh before expiry

## Work Log

### 2025-12-07 - Discovery via Data Integrity Review

**By:** Claude Code (Data Integrity Guardian Agent)

**Actions:**
- Identified missing token expiration handling
- Flagged as CRITICAL due to reliability impact
- Created todo for tracking

**Learnings:**
- OAuth tokens always have expiration
- Client needs expiration info for proper lifecycle management

## Notes

- Clerk may provide token refresh capability - investigate
- Consider caching token with expiration in frontend state
