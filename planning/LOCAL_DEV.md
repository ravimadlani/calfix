# Local Development Setup

This guide helps you run CalFix locally for debugging and development with full API support.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
The `.env` file already contains all necessary Google credentials for development. If you want to experiment with the upcoming Outlook provider, add the `VITE_OUTLOOK_*` variables outlined in `.env.example`.

### 3. Run Development Servers

#### Option A: Run Everything (Recommended)
```bash
npm run dev:all
```
This starts:
- **Frontend**: http://localhost:3001 (Vite with hot reload)
- **API**: http://localhost:3000 (Vercel functions)
- API calls from frontend are automatically proxied to the Vercel dev server

#### Option B: Run Separately
```bash
# Terminal 1 - API Server
npm run dev:api

# Terminal 2 - Frontend
npm run dev
```

## What This Gives You

✅ **Hot Module Replacement** - See changes instantly
✅ **API Functions** - All `/api/*` endpoints work locally
✅ **Environment Variables** - Proper `.env` handling
✅ **Debugging** - Full source maps and error messages
✅ **Production-like** - Uses actual Vercel runtime

## Debugging Tips

### Check API Endpoints
```bash
# Test calendar sync endpoint
curl http://localhost:3001/api/calendar/sync

# Test user subscription
curl http://localhost:3001/api/user/subscription
```

### View Logs
- **Frontend**: Browser console
- **API Functions**: Terminal where you ran `npm run dev:vercel`

### Network Debugging
1. Open Chrome DevTools
2. Go to Network tab
3. Watch API calls and responses

## How It Works

- **Frontend**: Runs locally on http://localhost:3001 with hot module replacement
- **API Endpoints**: When deployed to Vercel, the `/api/*` routes are handled by serverless functions
- **Database**: Uses the production Supabase instance (no local database needed)

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Vercel CLI Issues
```bash
# Reinstall Vercel CLI
npm uninstall vercel
npm install -D vercel
```

### Environment Variables Not Loading
- Make sure `.env.development.local` exists
- Restart the dev server after changing env vars

## Deployment

When ready to deploy:
```bash
git push origin feature/your-branch
```
Vercel will automatically deploy preview URLs for PRs.
