# Project Notes for Claude

## Testing & Deployment

**IMPORTANT**: The user cannot test changes locally. All changes must be deployed to Vercel for testing.

### Workflow
1. Make changes to the codebase
2. Commit changes to git
3. Push to the remote repository
4. Deploy to Vercel (the user will test on the deployed version)

### Deployment Commands
- Push changes: `git push origin <branch-name>`
- Deploy preview: Changes pushed to branches automatically deploy to Vercel preview URLs
- Deploy production: Merge to main branch

## Project Information

- **Framework**: React 19.1.1 + TypeScript + Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.18
- **Auth**: Clerk (@clerk/clerk-react)
- **Routing**: React Router 7.9.4
- **Backend**: Vercel serverless functions
- **Database**: Supabase

## Key Files
- `/src/components/LandingPage.tsx` - Main landing page
- `/src/components/Layout.tsx` - Navigation and footer
- `/src/components/Dashboard.tsx` - User dashboard

## Current Branch
- Working branch: `design/website`
