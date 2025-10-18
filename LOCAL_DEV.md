# Local Development Setup

This guide helps you run CalFix locally for debugging and development.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create `.env.development.local` file with your credentials (already created for you).

### 3. Run Local Development Server
```bash
npm run dev:vercel
```

This will start:
- Vite dev server (React app) on http://localhost:3001
- Vercel Functions locally (API endpoints)
- All environment variables from `.env.development.local`

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

## Alternative: Run Frontend Only
If you just need the frontend without API functions:
```bash
npm run dev
```

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