# Vercel Deployment Requirements - CalFix NLP Features

## Overview
This document outlines the environment variables, API keys, and configuration required to deploy CalFix with NLP chatbot functionality to Vercel.

---

## Required Environment Variables

### 1. Google OAuth (Already Configured)
Required for calendar access and authentication.

```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
VITE_REDIRECT_URI=https://your-production-domain.vercel.app/oauth/callback
```

**Note:** Use the same values from your local `.env` file.

**Note:** Update `VITE_REDIRECT_URI` to match your production domain.

### 2. Clerk Authentication (Already Configured)
Required for user authentication and session management.

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** Use the same values from your local `.env` file.

### 3. Supabase (Already Configured)
Required for activity logging, health score tracking, and database operations.

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://your-project-ref.supabase.co
```

**Note:** Use the same values from your local `.env` file.

### 4. OpenAI API (NEW - Required for NLP Chatbot)
Required for natural language processing of calendar commands.

```bash
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to obtain:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-proj-`)
4. Add to Vercel environment variables

**Cost Considerations:**
- Model used: `gpt-4o-mini` (most cost-effective)
- Estimated cost: ~$0.15 per 1000 API calls
- Fallback: If API key is missing, the app automatically falls back to regex-based parsing

---

## Feature Flag: Chatbot Enable/Disable

### URL Parameter Control
The chatbot is feature-flagged and only appears when explicitly enabled via URL parameter:

```
https://your-domain.vercel.app/?chatbot=true
```

**Without the parameter:** Chatbot widget is hidden
**With `?chatbot=true`:** Chatbot widget appears

**Implementation:**
- See `src/components/CalendarDashboard.tsx:85-90`
- Checks URL params on component mount
- No persistent storage - must include param each time

---

## Vercel Configuration Steps

### Step 1: Add Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add each variable listed above
4. **Important:** Select all environments (Production, Preview, Development)

### Step 2: Update Redirect URIs
1. **Google OAuth Console:**
   - Go to https://console.cloud.google.com/apis/credentials
   - Update authorized redirect URIs to include your Vercel domain:
     - `https://your-project.vercel.app/oauth/callback`
     - `https://your-custom-domain.com/oauth/callback` (if using custom domain)

2. **Clerk Dashboard:**
   - Go to https://dashboard.clerk.com
   - Update allowed redirect URLs to include your Vercel domain

### Step 3: Verify Build Settings
Ensure `vercel.json` is properly configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### Step 4: Test Deployment
1. Deploy to preview environment first
2. Test chatbot with `?chatbot=true` parameter
3. Verify OpenAI integration works (check browser console for errors)
4. Test fallback behavior (temporarily remove OpenAI key to test regex parser)
5. Deploy to production when verified

---

## API Endpoints Required

The following Vercel serverless functions must be deployed:

### Health Score & Logging APIs
- `/api/health/factors` - Get health factors with user overrides
- `/api/health/score` - Save health score calculations
- `/api/health/snooze` - Manage snooze settings
- `/api/activity/log` - Log user actions
- `/api/activity/session` - Manage activity sessions
- `/api/activity/error` - Log errors
- `/api/admin/analytics` - Admin analytics dashboard
- `/api/admin/health-factors` - Admin health factor management

**Note:** All these APIs are already implemented in the `api/` directory.

---

## Security Considerations

### 1. API Key Protection
- ✅ OpenAI API key is only exposed in client-side code (prefixed with `VITE_`)
- ⚠️ Consider moving OpenAI calls to serverless function for better security
- ✅ Supabase service role key is server-side only (no `VITE_` prefix)

### 2. Rate Limiting
- OpenAI has built-in rate limits
- Consider implementing client-side rate limiting for chatbot queries
- Suggested: Max 10 queries per minute per user

### 3. Cost Controls
- Set usage limits in OpenAI dashboard
- Monitor spending via OpenAI usage dashboard
- Consider setting up billing alerts

---

## Testing Checklist

Before deploying to production, verify:

- [ ] All environment variables are set in Vercel
- [ ] OpenAI API key is valid and has credits
- [ ] Google OAuth redirect URIs include Vercel domain
- [ ] Clerk redirect URLs include Vercel domain
- [ ] Build succeeds without errors (`npm run build`)
- [ ] Chatbot appears with `?chatbot=true` parameter
- [ ] Chatbot is hidden without the parameter
- [ ] Natural language parsing works (try "find me 30 minutes tomorrow")
- [ ] Fallback parser works (remove OpenAI key temporarily)
- [ ] Health score calculation works
- [ ] Activity logging to Supabase works
- [ ] All API endpoints return 200 (not 500)

---

## Monitoring & Debugging

### Vercel Logs
Access real-time logs:
```bash
vercel logs --follow
```

### OpenAI Usage Monitoring
- Dashboard: https://platform.openai.com/usage
- Set up email alerts for spending thresholds

### Supabase Monitoring
- Dashboard: https://supabase.com/dashboard/project/meimpbgadjlmxszppxrm
- Monitor database performance and API usage

### Browser Console
Check for errors in browser console when testing chatbot:
- Look for OpenAI API errors (401 = invalid key, 429 = rate limit)
- Verify fallback message appears if OpenAI fails

---

## Cost Estimates (Monthly)

### OpenAI (gpt-4o-mini)
- **Input:** $0.150 per 1M tokens
- **Output:** $0.600 per 1M tokens
- **Estimated:** $5-20/month for 100-500 daily queries

### Vercel
- **Hobby Plan:** Free (sufficient for testing)
- **Pro Plan:** $20/month (recommended for production)
- **Bandwidth:** Included in plan

### Supabase
- **Free Tier:** Up to 500MB database, 2GB bandwidth
- **Pro Plan:** $25/month (unlimited API requests)

**Total Estimated Monthly Cost:** $30-65/month

---

## Rollback Plan

If issues occur after deployment:

1. **Disable chatbot immediately:**
   - Remove `?chatbot=true` from URLs
   - Feature flag ensures no user impact

2. **Revert to previous deployment:**
   ```bash
   vercel rollback
   ```

3. **Remove OpenAI key:**
   - App will automatically use fallback parser
   - No functionality lost, just reduced accuracy

---

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **OpenAI Documentation:** https://platform.openai.com/docs
- **Clerk Documentation:** https://clerk.com/docs
- **Supabase Documentation:** https://supabase.com/docs

---

## Next Steps After Deployment

1. Monitor OpenAI usage for first 24 hours
2. Collect user feedback on chatbot accuracy
3. Fine-tune system prompts based on common queries
4. Consider implementing conversation history
5. Evaluate moving to GPT-4 if accuracy needs improvement
6. Set up error tracking (Sentry or similar)

---

**Last Updated:** 2025-11-14
**Branch:** feature/nlp_actions
**Status:** Ready for deployment with feature flag
