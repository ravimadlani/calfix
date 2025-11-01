# 📅 Calendar Dashboard

A professional calendar management dashboard application with multi-provider calendar integration (Google today, Outlook coming soon), intelligent analytics, and smart scheduling features.

![Calendar Dashboard](https://img.shields.io/badge/React-18.2.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.5-38B2AC)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### Calendar Analytics
- **Health Score Calculation**: 0-100 score based on meeting density, buffers, and focus time
- **Back-to-Back Detection**: Automatically identifies meetings with no gaps
- **Focus Block Analysis**: Highlights 60+ minute gaps for deep work
- **Meeting Load Tracking**: Monitors total meeting hours per day/week

### Smart Insights
- Actionable recommendations based on calendar patterns
- Best practice tips for calendar management
- Real-time gap analysis between events
- Insufficient buffer warnings (< 10 minutes)

### Quick Actions
- **Block Focus Time**: One-click 2-hour focus blocks
- **Add Buffers**: Automatically add 15-min gaps to back-to-back meetings
- **Evening Review**: Identify and manage after-hours meetings
- **Move Events**: Find and suggest optimal time slots

### Event Management
- Color-coded event categorization (Meeting, Focus, Break, etc.)
- Add buffer before/after individual events
- Move events to next available slot
- Duration and attendee tracking

### Multiple Views
- Today's schedule
- Tomorrow's schedule
- This Week (Monday-Sunday)
- Next Week

## 🔄 Provider Support

| Provider | Status | Capabilities |
| --- | --- | --- |
| Google Calendar | ✅ Available | Buffers & focus blocks, travel automation, Meet links, free/busy lookup |
| Microsoft Outlook | 🚧 In progress | Planned: Graph API calendar CRUD, Teams meeting links, multi-account selection |

CalFix now uses a provider registry and context (`CalendarProviderContext`) so the UI can switch between calendar backends without code changes. The Google adapter implements the shared interface today; the Outlook adapter is scaffolded behind the scenes and will light up once credentials and API wiring are in place.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- A **Google Cloud Platform** account (for Google provider)
- A **Google Calendar** with events (Outlook / Microsoft 365 support coming soon)

## 🚀 Getting Started

### Step 1: Clone and Install

```bash
cd calendar-dashboard
npm install
```

### Step 2: Google Cloud Console Setup

This is the most critical step. Follow carefully:

#### 2.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name (e.g., "Calendar Dashboard")
4. Click **"Create"**

#### 2.2 Enable Google Calendar API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it and press **"Enable"**

#### 2.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: Calendar Dashboard
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **"Save and Continue"**
6. On "Scopes" page, click **"Add or Remove Scopes"**
7. Search for and select:
   - `https://www.googleapis.com/auth/calendar.events`
8. Click **"Update"** → **"Save and Continue"**
9. On "Test users" page, click **"Add Users"**
10. Add your Google email address
11. Click **"Save and Continue"**

#### 2.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Enter name: "Calendar Dashboard Client"
5. Under **"Authorized JavaScript origins"**, click **"Add URI"**:
   - Add: `http://localhost:3001`
6. Under **"Authorized redirect URIs"**, click **"Add URI"**:
   - Add: `http://localhost:3001`
7. Click **"Create"**
8. **IMPORTANT**: Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
9. Click **"OK"**

### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor

3. Replace the placeholders with your actual credentials:
   ```env
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
   VITE_REDIRECT_URI=http://localhost:3001

   # Optional: preconfigure Outlook provider
   VITE_OUTLOOK_CLIENT_ID=your-outlook-client-id
   VITE_OUTLOOK_TENANT_ID=common
   VITE_OUTLOOK_REDIRECT_URI=http://localhost:3001
   OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
   ```

4. Save the file

### Step 4: Run the Application

```bash
npm run dev
```

The application will open at [http://localhost:3001](http://localhost:3001)

### Step 5: Pre-commit Verification

Before pushing changes or declaring a feature complete, run the mandatory checks:

```bash
npm run lint
npm run build
```

Both commands must succeed (no warnings/errors) to match the production build that Vercel runs.

### Step 6: First-Time Authentication

1. Choose your calendar provider from the connection prompt (Google is available now; Outlook is coming soon).
2. If you're using a Google test OAuth app you'll see a warning: **"Google hasn't verified this app"**
   - This is normal for development apps
   - Click **"Advanced"** → **"Go to Calendar Dashboard (unsafe)"**
3. Review permissions and click **"Continue"**
4. You'll be redirected back to the dashboard
5. Your calendar events will load automatically

## 📁 Project Structure

```
calendar-dashboard/
├── public/
│   └── index.html                 # HTML template
├── src/
│   ├── components/
│   │   ├── AuthButton.jsx        # Sign in/out button
│   │   ├── CalendarDashboard.jsx # Main dashboard
│   │   ├── StatsCard.jsx         # Stat display card
│   │   ├── EventCard.jsx         # Individual event display
│   │   ├── ViewSelector.jsx      # Today/Tomorrow/Week tabs
│   │   ├── InsightsBanner.jsx    # Best practices tips
│   │   ├── ActionItemsPanel.jsx  # Recommendations panel
│   │   └── QuickActions.jsx      # One-click actions
│   ├── services/
│   │   ├── providers/            # Multi-provider calendar adapters
│   │   ├── googleAuth.js         # OAuth 2.0 handling (legacy wrapper)
│   │   ├── googleCalendar.js     # Calendar API calls (legacy wrapper)
│   │   └── calendarAnalytics.js  # Analytics engine
│   ├── utils/
│   │   ├── dateHelpers.js        # Date formatting & parsing
│   │   ├── eventCategorizer.js   # Event categorization
│   │   └── healthCalculator.js   # Health score algorithms
│   ├── App.jsx                    # Root component
│   ├── index.js                   # Entry point
│   └── index.css                  # Global styles
├── .env                           # Environment variables (create this)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies
├── tailwind.config.js             # Tailwind configuration
└── README.md                      # This file
```

> ℹ️  The new multi-provider architecture lives under `src/services/providers/` and is consumed through the `CalendarProviderContext` added in `src/context/CalendarProviderContext.tsx`.

## 🎨 Key Technologies

- **React 18**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Google Calendar API v3**: Full calendar access and management
- **OAuth 2.0 with PKCE**: Secure authentication flow
- **localStorage**: Token persistence

## 🔐 Security Features

- **PKCE (Proof Key for Code Exchange)**: Enhanced OAuth security
- **Token Refresh**: Automatic token renewal when expired
- **Secure Storage**: Tokens stored in localStorage (never logged)
- **Client-Side Only**: No backend server required
- **Read/Write Scope**: Only calendar.events access

## 📊 Health Score Algorithm

The calendar health score (0-100) is calculated as follows:

```
Starting score: 100

Penalties:
- Back-to-back meetings: -15 points each
- Insufficient buffers (< 10 min): -8 points each
- Meeting load > 6 hours: -10 points
- Meeting load > 8 hours: -20 points (additional)

Bonuses:
- Focus blocks (60+ min gaps): +8 points each

Final score: Capped between 0 and 100
```

### Score Interpretation
- **80-100**: Excellent - Well-balanced calendar
- **60-79**: Good - Room for improvement
- **40-59**: Fair - Consider optimization
- **0-39**: Poor - Needs attention

## 🎯 Event Categories

Events are automatically categorized by keywords:

| Category | Color | Keywords |
|----------|-------|----------|
| Meeting | Blue | 1:1, sync, standup, call, meeting |
| Focus/Work | Indigo | work, focus, deep work, project |
| Prep/TODO | Yellow | prep, todo, review, planning |
| Break | Green | lunch, break, coffee |
| Personal | Pink | family, gym, workout, doctor |
| Travel | Orange | travel, flight, commute |
| Conference | Purple | conference, event, workshop |
| Admin | Gray | admin, expenses, paperwork |
| Other | Slate | (default category) |

## 🔧 Troubleshooting

### Issue: "Google hasn't verified this app"

**Solution**: This is expected for development apps. Click "Advanced" → "Go to Calendar Dashboard (unsafe)". This is safe because it's your own app.

### Issue: "Error 401: Unauthorized"

**Solutions**:
1. Check that your Client ID in `.env` is correct
2. Verify redirect URI in Google Console matches `http://localhost:3001`
3. Try signing out and signing in again
4. Clear browser cache and localStorage

### Issue: "Error 403: Permission denied"

**Solutions**:
1. Verify Google Calendar API is enabled in Google Cloud Console
2. Check OAuth consent screen includes correct scope
3. Ensure your Google account is added as a test user

### Issue: No events showing

**Solutions**:
1. Check that you have events in your Google Calendar
2. Try a different view (Tomorrow, This Week)
3. Check browser console for errors
4. Verify time range matches your events

### Issue: "Failed to fetch events"

**Solutions**:
1. Check your internet connection
2. Verify you're signed in
3. Check for rate limiting (wait a minute and try again)
4. Look for errors in browser console (F12)

### Issue: Port 3001 already in use

**Solution**:
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in package.json:
# "start": "PORT=3002 react-scripts start"
```

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Adding New Features

1. **New Component**: Add to `src/components/`
2. **New Service**: Add to `src/services/`
3. **New Utility**: Add to `src/utils/`
4. **Update Analytics**: Modify `calendarAnalytics.js`

### Code Style

- Use functional components with hooks
- Follow existing naming conventions
- Add JSDoc comments for functions
- Use Tailwind for all styling
- Keep components focused and reusable

## 🚀 Deployment

### Deploy to Vercel/Netlify

1. Update `REACT_APP_REDIRECT_URI` in `.env`:
   ```env
   REACT_APP_REDIRECT_URI=https://your-domain.com
   ```

2. Add production URL to Google Console:
   - Go to Credentials → Edit OAuth client
   - Add production URL to authorized origins and redirect URIs

3. Deploy:
   ```bash
   npm run build
   # Upload build/ folder to hosting provider
   ```

### Environment Variables for Production

Make sure to set these in your hosting provider:
- `REACT_APP_GOOGLE_CLIENT_ID`
- `REACT_APP_REDIRECT_URI`

## 📝 Future Roadmap

- [ ] Drag-and-drop event rescheduling
- [ ] Calendar sync status indicator
- [ ] Export calendar health report (PDF)
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Event search functionality
- [ ] Multiple calendar support
- [ ] Weekly/monthly trend graphs
- [ ] Meeting prep checklist integration
- [ ] Mobile app version

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Google Calendar API documentation
- React and Tailwind CSS communities
- Calendar management research and best practices

## 📧 Support

If you encounter any issues:

1. Check the Troubleshooting section above
2. Review browser console for errors (F12)
3. Verify Google Cloud Console configuration
4. Create an issue on GitHub (if applicable)

---

**Made with ❤️ for productive professionals**

*Last updated: 2025*
