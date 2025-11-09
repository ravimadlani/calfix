# Vercel Environment Variables Setup

## Required Environment Variables

Add these environment variables to your Vercel project settings:

### Supabase Configuration
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Google OAuth Configuration
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_REDIRECT_URI=https://your-app.vercel.app
```

### Clerk Configuration
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
```

## Important Notes

1. **Client-side vs Server-side Variables**:
   - Variables with `VITE_` prefix are exposed to the client-side build
   - Server-side API functions should use variables WITHOUT the `VITE_` prefix
   - That's why we use `SUPABASE_URL` for API functions and `VITE_SUPABASE_URL` for client

2. **Setting up in Vercel**:
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add each variable for Production, Preview, and Development environments
   - The SUPABASE_URL should be the same value as VITE_SUPABASE_URL (add both)

3. **Google OAuth Redirect URI**:
   - For production: `https://your-app.vercel.app`
   - For local development: `http://localhost:3001`
   - Add both to your Google OAuth app's authorized redirect URIs

4. **Obtaining Supabase Service Role Key**:
   - Go to your Supabase project settings
   - Navigate to API section
   - Copy the "service_role" key (NOT the anon key)
   - This key has admin privileges - keep it secure!

5. **Google Calendar API Permissions**:
   - Ensure your Google OAuth app has the Calendar API enabled
   - The scope `https://www.googleapis.com/auth/calendar` provides full read/write access

## Troubleshooting

If you get 500 errors from API endpoints:
- Check Vercel function logs for missing environment variables
- Ensure both `SUPABASE_URL` and `VITE_SUPABASE_URL` are set
- Verify the service role key is correct

If you get 403 errors when creating calendar events:
- User needs to re-authenticate with Google Calendar
- Click "Reconnect with Proper Permissions" button in admin panel
- This will request the full calendar access scope