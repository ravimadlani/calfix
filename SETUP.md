# Calendar Dashboard - Setup Guide

This guide will help you set up and run the Calendar Dashboard on your local machine.

## Prerequisites

Before you begin, make sure you have:
- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **Google Account** with Google Calendar access
- **Google Cloud Project** with Calendar API enabled

## Quick Start (5 minutes)

### 1. Download the Project

```bash
# If you received a ZIP file, extract it
# Or clone from Git:
git clone [repository-url]
cd calendar_dash
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages (React, Tailwind CSS, etc.)

### 3. Set Up Google Calendar API

#### A. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Name it something like "Calendar Dashboard"

#### B. Enable Google Calendar API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

#### C. Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: **Internal** (for company use)
   - App name: "Calendar Dashboard"
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue" through the scopes and test users
4. Back in Credentials, click "Create Credentials" → "OAuth client ID"
5. Application type: **Web application**
6. Name: "Calendar Dashboard Web Client"
7. Authorized JavaScript origins:
   - `http://localhost:3000`
8. Authorized redirect URIs:
   - `http://localhost:3000`
9. Click "Create"
10. **Copy the Client ID and Client Secret** (you'll need these next)

### 4. Configure Environment Variables

Create a file named `.env` in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your credentials:

```
REACT_APP_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your-client-secret-here
REACT_APP_REDIRECT_URI=http://localhost:3000
```

**Important:** Replace the placeholder values with your actual Client ID and Client Secret from step 3.

### 5. Start the Application

```bash
npm start
```

The app will open automatically in your browser at `http://localhost:3000`

### 6. Sign In

1. Click "Sign in with Google"
2. Select your Google account
3. Grant calendar permissions
4. You're ready to go! 🎉

## Features

### For Executive Assistants
- **Manage Delegate Calendars**: Switch between calendars you manage using the dropdown
- **Track International Travel**: Automatically detect timezone changes
- **Flag Out-of-Hours Meetings**: See when meetings are scheduled at odd hours while traveling
- **Resolve Double Bookings**: Quick actions to fix scheduling conflicts
- **Add Travel Buffers**: Automatically add time before/after flights

### Quick Tips
- Use the calendar dropdown at the top to switch between your calendar and calendars you manage
- Date pills (Today, Tomorrow, This Week, etc.) help you quickly filter your view
- Click on Proposed Actions to batch-fix common issues
- The system automatically detects flights, meetings, and placeholder events

## Troubleshooting

### "Failed to authenticate" error
- Check that your `.env` file has the correct Client ID and Client Secret
- Make sure the redirect URI in Google Cloud Console matches `http://localhost:3000`
- Try signing out and back in

### "Permission denied" error
- Ensure you've enabled the Google Calendar API in your Google Cloud project
- Check that you've granted calendar permissions when signing in
- For delegate calendars, verify the calendar owner has given you "Make changes to events" permission

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill

# Or run on a different port
PORT=3001 npm start
```

### Can't see delegate calendars
- Make sure the calendar owner has shared their calendar with you
- They must grant "Make changes to events" permission (not just "See all event details")
- It can take a few minutes for permissions to propagate

## Updating the App

When new features are added:

```bash
# Pull latest changes (if using Git)
git pull

# Reinstall dependencies (if package.json changed)
npm install

# Restart the app
npm start
```

## Security Notes

- **Never share your `.env` file** - it contains sensitive credentials
- **Keep your Client Secret private** - don't commit it to version control
- The `.env` file is already in `.gitignore` to prevent accidental commits
- All authentication happens locally - no credentials are sent to external servers

## Getting Help

Common questions:
- **Q: Can others see my calendar data?**
  A: No, everything runs locally on your machine. Your calendar data never leaves your computer.

- **Q: Do I need to be connected to the internet?**
  A: Yes, the app needs to connect to Google Calendar API.

- **Q: Can I use this on multiple computers?**
  A: Yes, just follow the setup steps on each computer. You can use the same Google Cloud credentials.

- **Q: How do I share this with colleagues?**
  A: Share this folder with them. They'll need to:
  1. Run `npm install`
  2. Create their own `.env` file with the same credentials
  3. Run `npm start`

## Next Steps

Once you're up and running:
1. Try switching to a delegate calendar using the dropdown
2. Click "Team Scheduling" to find meeting times for multiple people
3. Explore the Proposed Actions section for calendar optimization tips
4. Check out the analytics cards to see your calendar health

---

**Support:** If you run into issues, check the Troubleshooting section above or ask your IT team for help with Node.js installation.
