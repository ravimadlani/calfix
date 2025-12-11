# Project Notes for Claude

## Testing & Deployment

**IMPORTANT**: The user cannot test changes locally. All changes must be deployed to Vercel for testing.

### Workflow
1. Make changes to the codebase
2. Commit changes to git
3. Push to the remote repository
4. Deploy to Vercel (the user will test on the deployed version)

### Deployment URLs
- **calfix-new.vercel.app**: Any branch starting with `staging/` deploys here
- **Preview URLs**: Other branches get unique preview URLs (e.g., `calfix-abc123.vercel.app`)
- **Production**: Merge to main branch

### Deployment Commands
- Push changes: `git push origin <branch-name>`
- Test on staging: Push to a `staging/*` branch, then test at calfix-new.vercel.app
- Deploy production: Merge to main branch

## Project Information

- **Framework**: React 19.1.1 + TypeScript + Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.18
- **Auth**: Clerk (@clerk/clerk-react)
- **Routing**: React Router 7.9.4
- **Backend**: Vercel serverless functions
- **Database**: Supabase

## Security Rules - DO NOT VIOLATE

### Supabase + Clerk Authentication (CRITICAL)

**NEVER remove or bypass the Clerk JWT integration in `src/lib/supabase.ts`.**

The Clerk JWT template is already configured and working. The `useSupabaseClient()` hook MUST:
1. Use `useAuth()` from Clerk to get the `getToken` function
2. Pass the Clerk token to Supabase via the custom fetch function
3. Include the `Authorization: Bearer ${clerkToken}` header

**Correct implementation (DO NOT CHANGE):**
```typescript
export function useSupabaseClient() {
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await getToken({ template: 'supabase' });
          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [getToken]);

  return supabase;
}
```

**FORBIDDEN actions:**
- Removing the `useAuth()` import or `getToken` call
- Using `createClient(url, anonKey)` without the custom fetch function
- Adding "TODO: Set up Clerk JWT" comments (it's already set up)
- Making RLS policies "permissive" as a workaround
- Filtering by `user_id` in application code instead of relying on RLS

If Supabase queries fail, debug the actual issue - do not remove authentication.

## Key Files
- `/src/components/LandingPage.tsx` - Main landing page
- `/src/components/Layout.tsx` - Navigation and footer
- `/src/components/Dashboard.tsx` - User dashboard

## Current Branch
- Working branch: `staging/feat/security-clerk-oauth`
