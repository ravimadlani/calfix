# Security & Quality Improvement Plan (Simplified with Clerk OAuth)

## Overview

This plan addresses critical security vulnerabilities in CalendarZero.com by leveraging **Clerk's built-in OAuth token management** instead of building a custom token broker. This reduces implementation from 6 weeks to ~1-2 weeks.

**Created**: 2025-12-05
**Updated**: 2025-12-05 (Simplified after Clerk OAuth research)
**Repository**: `/Users/ravimadlani/projects/calfix-new/`

---

## Problem Statement

| Vulnerability | Severity | Fix |
|--------------|----------|-----|
| `VITE_GOOGLE_CLIENT_SECRET` in browser | CRITICAL | Use Clerk OAuth (secret stays on Clerk's servers) |
| Refresh tokens in localStorage | CRITICAL | Use Clerk OAuth (Clerk stores tokens securely) |
| Unauthenticated API endpoints | CRITICAL | Add Clerk JWT validation |
| Weak admin auth (`x-admin-email`) | HIGH | Use Clerk admin role claims |
| Verbose environment logging | HIGH | Remove sensitive logging |
| Test credentials in code | MEDIUM | Use environment variables |

---

## Solution: Use Clerk as Token Broker

Instead of building custom infrastructure, we use Clerk's existing OAuth capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│  CLERK OAUTH FLOW                                               │
│                                                                 │
│  1. User clicks "Connect Google Calendar"                      │
│     → Clerk handles OAuth consent screen                       │
│     → Client secret stays on CLERK'S servers (not yours)       │
│                                                                 │
│  2. Clerk stores refresh token securely                        │
│     → You never see it, can't leak it                          │
│                                                                 │
│  3. When you need a token, ask Clerk:                          │
│     const token = await clerkClient.users                      │
│       .getUserOauthAccessToken(userId, 'oauth_google')         │
│                                                                 │
│  4. Clerk returns fresh access token                           │
│     → Auto-refreshes if expired                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## What We're NOT Building (Eliminated by Clerk)

| Original Plan Item | Status |
|-------------------|--------|
| 6 token broker endpoints | ❌ Not needed |
| `encrypted_oauth_tokens` database table | ❌ Not needed |
| Custom AES-256-GCM encryption | ❌ Not needed |
| In-memory token caching | ❌ Not needed |
| Token refresh logic | ❌ Not needed |
| PKCE implementation | ❌ Clerk handles it |
| BroadcastChannel tab coordination | ❌ Not needed |

---

## Implementation Phases

### Phase 1: Clerk Dashboard Configuration (Day 1)

Configure OAuth in Clerk Dashboard to request calendar permissions.

#### 1.1 Configure Google OAuth Scopes

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **SSO Connections**
2. Find **Google** connection (or add it)
3. Click **Configure** → Enable **Use custom credentials**
4. Add these scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Save changes

#### 1.2 Configure Microsoft OAuth Scopes

1. In Clerk Dashboard → **SSO Connections**
2. Find **Microsoft** connection (or add it)
3. Click **Configure** → Enable **Use custom credentials**
4. Add these scopes:
   - `Calendars.ReadWrite`
   - `offline_access`
5. Save changes

#### 1.3 Set Up Custom OAuth Credentials (Production)

For production, you'll need your own OAuth credentials:

**Google Cloud Console:**
- Create OAuth 2.0 credentials
- Add Clerk's redirect URI: `https://clerk.your-domain.com/v1/oauth_callback`
- Copy Client ID and Secret to Clerk Dashboard

**Microsoft Azure Portal:**
- Register app in Azure Entra ID
- Add Clerk's redirect URI
- Copy Client ID and Secret to Clerk Dashboard

---

### Phase 2: Lock Down API Endpoints (Days 2-3)

Add Clerk authentication to all unprotected endpoints.

#### 2.1 Update Auth Helper

**File:** `api/lib/auth.ts`

```typescript
import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  sessionId: string;
}

export async function authenticateRequest(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.substring(7);

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  if (!payload.sub) {
    throw new Error('Invalid token');
  }

  return {
    userId: payload.sub,
    email: payload.email as string | undefined,
    sessionId: payload.sid as string,
  };
}

export async function checkAdminRole(userId: string): Promise<boolean> {
  const { createClerkClient } = await import('@clerk/backend');
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  const user = await clerk.users.getUser(userId);
  return user.publicMetadata?.role === 'admin';
}
```

#### 2.2 Fix Calendar Sync Endpoint

**File:** `api/calendar/sync.ts`

```typescript
import { authenticateRequest } from '../lib/auth.js';
// ... existing imports

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ADD THIS: Authenticate request
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { calendars, primaryCalendarId } = req.body;

  // USE user.userId instead of body.userId
  // ... rest of implementation using user.userId
}
```

#### 2.3 Fix User Subscription Endpoint

**File:** `api/user/subscription.ts`

```typescript
import { authenticateRequest } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow users to access their own subscription
  const requestedUserId = req.query.userId as string;
  if (requestedUserId && requestedUserId !== user.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ... rest using user.userId
}
```

#### 2.4 Fix Admin Endpoints

**File:** `api/admin/users.ts` (and similar for health-factors.ts, analytics.ts)

```typescript
import { authenticateRequest, checkAdminRole } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Authenticate
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check admin role
  const isAdmin = await checkAdminRole(user.userId);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // ... admin logic
}
```

---

### Phase 3: Create Calendar Token Endpoint (Day 4)

Create a simple endpoint that gets OAuth tokens from Clerk.

#### 3.1 New Token Endpoint

**File:** `api/calendar/token.ts` (NEW FILE)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient } from '@clerk/backend';
import { authenticateRequest } from '../lib/auth.js';

type Provider = 'google' | 'outlook';

const PROVIDER_MAP: Record<Provider, string> = {
  google: 'oauth_google',
  outlook: 'oauth_microsoft',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get provider from query
  const provider = req.query.provider as Provider;
  if (!provider || !PROVIDER_MAP[provider]) {
    return res.status(400).json({ error: 'Invalid provider. Use "google" or "outlook"' });
  }

  // Get OAuth token from Clerk
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  try {
    const response = await clerk.users.getUserOauthAccessToken(
      user.userId,
      PROVIDER_MAP[provider]
    );

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({
        error: 'No token found',
        message: `User has not connected ${provider} calendar`
      });
    }

    const tokenData = response.data[0];

    return res.status(200).json({
      access_token: tokenData.token,
      provider,
      scopes: tokenData.scopes,
    });
  } catch (error) {
    console.error(`[Calendar Token] Failed to get ${provider} token:`, error);
    return res.status(500).json({ error: 'Failed to retrieve token' });
  }
}
```

---

### Phase 4: Update Client-Side OAuth (Days 5-6)

Replace custom OAuth with Clerk's built-in flow.

#### 4.1 Simplify Google OAuth

**File:** `src/services/providers/google/auth.ts`

```typescript
// DELETE most of this file. Replace with:

import { useAuth, useSignIn } from '@clerk/clerk-react';

export function useGoogleCalendarAuth() {
  const { signIn } = useSignIn();
  const { getToken } = useAuth();

  const connect = async () => {
    if (!signIn) return;

    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/oauth-callback',
      redirectUrlComplete: '/dashboard',
    });
  };

  const getAccessToken = async (): Promise<string | null> => {
    // Get Clerk session token
    const clerkToken = await getToken();
    if (!clerkToken) return null;

    // Call our API to get Google OAuth token from Clerk
    const response = await fetch('/api/calendar/token?provider=google', {
      headers: { Authorization: `Bearer ${clerkToken}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.access_token;
  };

  return { connect, getAccessToken };
}
```

#### 4.2 Simplify Outlook OAuth

**File:** `src/services/providers/outlook/auth.ts`

```typescript
// Same pattern as Google
import { useAuth, useSignIn } from '@clerk/clerk-react';

export function useOutlookCalendarAuth() {
  const { signIn } = useSignIn();
  const { getToken } = useAuth();

  const connect = async () => {
    if (!signIn) return;

    await signIn.authenticateWithRedirect({
      strategy: 'oauth_microsoft',
      redirectUrl: '/oauth-callback',
      redirectUrlComplete: '/dashboard',
    });
  };

  const getAccessToken = async (): Promise<string | null> => {
    const clerkToken = await getToken();
    if (!clerkToken) return null;

    const response = await fetch('/api/calendar/token?provider=outlook', {
      headers: { Authorization: `Bearer ${clerkToken}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.access_token;
  };

  return { connect, getAccessToken };
}
```

#### 4.3 Delete Token Storage

**File:** `src/services/providers/tokenStorage.ts`

Delete or simplify this file - no more localStorage token storage needed.

```typescript
// The entire tokenStorage.ts can be reduced to:
// Nothing! Tokens are fetched on-demand from Clerk via API.
```

---

### Phase 5: Remove Secrets & Cleanup (Day 7)

#### 5.1 Remove Client Secret from Environment

**Files to update:**
- `.env` - Remove `VITE_GOOGLE_CLIENT_SECRET`
- `.env.local` - Remove `VITE_GOOGLE_CLIENT_SECRET`
- `.env.example` - Remove `VITE_GOOGLE_CLIENT_SECRET`

#### 5.2 Remove Verbose Logging

**File:** `api/calendar/sync.ts` (lines 38-44)

```typescript
// DELETE THIS BLOCK:
console.log('[Calendar Sync] Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyLength: supabaseServiceKey?.length,
});
```

#### 5.3 Fix Test Credentials

**File:** `tests/event-links.spec.ts`

```typescript
// Change from:
const GOOGLE_TEST_EMAIL = 'ravi@madlanilabs.com';
const OUTLOOK_TEST_EMAIL = 'ravi.madlani@madlanilabs.com';

// To:
const GOOGLE_TEST_EMAIL = process.env.TEST_GOOGLE_EMAIL || 'test@example.com';
const OUTLOOK_TEST_EMAIL = process.env.TEST_OUTLOOK_EMAIL || 'test@example.com';
```

---

## Testing on Vercel Branch

### How It Works

1. Create a feature branch: `git checkout -b feat/security-clerk-oauth`
2. Make changes and commit
3. Push to origin: `git push origin feat/security-clerk-oauth`
4. Vercel automatically deploys a preview URL
5. Test at: `https://calfix-new-<hash>-<your-team>.vercel.app`

### Testing Checklist

#### Phase 1: Dashboard Config
- [ ] Google OAuth scopes configured in Clerk Dashboard
- [ ] Microsoft OAuth scopes configured in Clerk Dashboard
- [ ] Test OAuth flow works on preview URL

#### Phase 2: API Auth
- [ ] `/api/calendar/sync` returns 401 without Clerk token
- [ ] `/api/calendar/sync` works with valid Clerk token
- [ ] `/api/user/subscription` returns 403 for wrong userId
- [ ] `/api/admin/users` returns 403 for non-admin users

#### Phase 3: Token Endpoint
- [ ] `/api/calendar/token?provider=google` returns token for connected user
- [ ] `/api/calendar/token?provider=google` returns 404 for unconnected user
- [ ] Same tests for `provider=outlook`

#### Phase 4: Client OAuth
- [ ] "Connect Google Calendar" uses Clerk's flow
- [ ] Calendar data loads after connection
- [ ] "Connect Outlook Calendar" uses Clerk's flow

#### Phase 5: Cleanup
- [ ] `VITE_GOOGLE_CLIENT_SECRET` not in bundle (check Network tab)
- [ ] No tokens in localStorage
- [ ] No sensitive data in console logs

---

## Environment Variables

### Keep (Already Configured)
```bash
CLERK_SECRET_KEY=sk_live_xxx        # Server-side Clerk auth
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx   # Client-side Clerk
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
```

### Remove
```bash
VITE_GOOGLE_CLIENT_SECRET=xxx  # DELETE - Clerk handles this
```

### Add (for tests only)
```bash
TEST_GOOGLE_EMAIL=test@example.com
TEST_OUTLOOK_EMAIL=test@example.com
```

---

## File Changes Summary

### New Files (1)
- `api/calendar/token.ts` - Get OAuth tokens from Clerk

### Modified Files (8)
- `api/lib/auth.ts` - Add `checkAdminRole()` function
- `api/calendar/sync.ts` - Add Clerk auth, remove logging
- `api/user/subscription.ts` - Add Clerk auth
- `api/admin/users.ts` - Replace header check with Clerk admin role
- `api/admin/health-factors.ts` - Same
- `api/admin/analytics.ts` - Same
- `src/services/providers/google/auth.ts` - Use Clerk OAuth
- `src/services/providers/outlook/auth.ts` - Use Clerk OAuth

### Deleted/Simplified Files (2)
- `src/services/providers/tokenStorage.ts` - No longer needed
- `.env*` files - Remove `VITE_GOOGLE_CLIENT_SECRET`

---

## Success Criteria

- [ ] No client secrets in browser bundle
- [ ] No tokens in localStorage
- [ ] All API endpoints require Clerk authentication
- [ ] Admin endpoints require admin role
- [ ] Calendar connection uses Clerk's OAuth flow
- [ ] Tokens retrieved via `/api/calendar/token` endpoint
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

---

## Timeline

| Day | Task |
|-----|------|
| 1 | Configure Clerk Dashboard OAuth scopes |
| 2-3 | Add Clerk auth to 5 API endpoints |
| 4 | Create `/api/calendar/token` endpoint |
| 5-6 | Update client-side OAuth to use Clerk |
| 7 | Remove secrets, cleanup, test |
| 8+ | Buffer for issues, deploy to production |

**Total: ~1-2 weeks** (down from 6 weeks)

---

## References

- [Clerk OAuth Token Retrieval](https://clerk.com/docs/reference/backend/user/get-user-oauth-access-token)
- [Clerk Google Calendar Blog Post](https://clerk.com/blog/using-clerk-sso-access-google-calendar)
- [Clerk Microsoft Social Connection](https://clerk.com/docs/authentication/social-connections/microsoft)
- [Clerk OAuth Scopes Configuration](https://clerk.com/docs/authentication/social-connections/overview)

---

*Plan updated: 2025-12-05 - Simplified to use Clerk OAuth*
