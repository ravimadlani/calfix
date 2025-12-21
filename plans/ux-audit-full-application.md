# UX Audit: Full CalendarZero Application

## Overview

Conduct a comprehensive UX audit of the entire CalendarZero application, capturing screenshots of all user flows, analyzing usability using Nielsen's 10 Heuristics and WCAG 2.1 AA accessibility standards, and producing a self-contained HTML report accessible at `/admin/ux_audit_001`.

**Audit Scope**: Complete application audit logged in as `ravi@madlanilabs.com` (admin user)
**Deliverable**: Standalone HTML report with embedded screenshots at `/admin/ux_audit_001`
**Branch**: `staging/ux_fix/consistency` → deploys to `calfix-new.vercel.app`

---

## Problem Statement / Motivation

CalendarZero is a calendar management SaaS for executive assistants. Before further feature development, a systematic UX audit is needed to:

1. **Identify usability issues** - Find friction points, confusing workflows, and broken patterns
2. **Ensure accessibility compliance** - Verify WCAG 2.1 AA standards are met
3. **Document current state** - Create baseline for measuring future improvements
4. **Prioritize improvements** - Categorize findings by severity and business impact

---

## Technical Approach

### Architecture

**Report Structure**:
```
/public/admin/ux_audit_001/
├── index.html              # Main audit report
├── images/                 # Screenshot directory
│   ├── 01-landing/
│   │   ├── desktop-hero.png
│   │   ├── desktop-features.png
│   │   ├── mobile-hero.png
│   │   └── ...
│   ├── 02-auth/
│   ├── 03-onboarding/
│   ├── 04-dashboard/
│   ├── 05-recurring/
│   ├── 06-schedule/
│   ├── 07-settings/
│   ├── 08-admin/
│   └── 09-navigation/
└── styles.css              # Report styling (optional, can use Tailwind CDN)
```

**Report Access**:
- Direct URL: `https://calfix-new.vercel.app/admin/ux_audit_001/index.html`
- Clean URL: Configure Vercel rewrites for `/admin/ux_audit_001` → `/admin/ux_audit_001/index.html`

### Implementation Tools

- **Playwright MCP**: Browser automation for navigation and screenshot capture
- **Vite**: Static file serving from `/public` directory
- **Vercel**: Deployment and static asset hosting
- **Tailwind CSS (CDN)**: Report styling without build dependencies

---

## Implementation Phases

### Phase 1: Preparation & Setup

**Tasks**:
- [ ] Create directory structure at `/public/admin/ux_audit_001/`
- [ ] Create HTML report template with navigation sidebar
- [ ] Configure Vercel rewrite for clean URL access
- [ ] Verify admin access for `ravi@madlanilabs.com` in Clerk

**Files to create**:
- `/public/admin/ux_audit_001/index.html`
- `/public/admin/ux_audit_001/images/.gitkeep`

**Success Criteria**:
- Empty report template loads at `/admin/ux_audit_001`
- Directory structure ready for screenshots

---

### Phase 2: Screenshot Capture - Public Pages

**Routes to Audit**:

| Route | Page | Screenshots Needed |
|-------|------|-------------------|
| `/` | Landing Page | Hero, Features, Pricing, Resources, CTA, Footer (desktop + mobile) |
| `/sign-in` | Sign In | Form state, Loading state (desktop + mobile) |
| `/sign-up` | Sign Up | Form state, Loading state (desktop + mobile) |
| `/privacy` | Privacy Policy | Full page (desktop + mobile) |
| `/terms` | Terms of Service | Full page (desktop + mobile) |

**Screenshot Naming Convention**:
```
{section}-{page}-{viewport}-{state}.png
Examples:
- 01-landing-hero-desktop-default.png
- 01-landing-hero-mobile-default.png
- 02-auth-signin-desktop-default.png
- 02-auth-signin-desktop-loading.png
```

**Tasks**:
- [ ] Navigate to landing page and capture hero section (desktop 1440px)
- [ ] Scroll and capture features section
- [ ] Scroll and capture pricing section
- [ ] Scroll and capture resources section
- [ ] Scroll and capture CTA section
- [ ] Capture footer
- [ ] Resize to mobile (390px) and repeat captures
- [ ] Navigate to /sign-in and capture form
- [ ] Navigate to /sign-up and capture form
- [ ] Navigate to /privacy and capture full page
- [ ] Navigate to /terms and capture full page

**Success Criteria**:
- All public pages captured at desktop and mobile viewports
- Screenshots saved to `/public/admin/ux_audit_001/images/01-landing/` and `/02-auth/`

---

### Phase 3: Screenshot Capture - Authenticated Pages

**Prerequisites**:
- Log in as `ravi@madlanilabs.com`
- Ensure calendar is connected and onboarding is complete

**Routes to Audit**:

| Route | Page | Screenshots Needed |
|-------|------|-------------------|
| `/dashboard` | Main Dashboard | Health Score Hero, View Selector states, Day Filter Pills, All Dashboard Tabs, Calendar Selector, Action Workflow Modal |
| `/recurring` | Recurring Analysis | Health Check tab, 1:1s tab, Audit Report tab |
| `/schedule` | Smart Scheduling | Empty state, Participant entry, Availability results, Quick Schedule buttons, Active Holds |
| `/settings` | Settings | Calendar selection (all slot states), Save success state |
| `/profile` | User Profile | Clerk profile component |
| `/admin` | Admin Panel | Analytics tab, Health Factors tab, Users tab (if visible) |

**Tasks**:
- [ ] Sign in via Playwright and navigate to /dashboard
- [ ] Capture Health Score Hero with current score
- [ ] Capture each View Selector state (Today, Tomorrow, Week, etc.)
- [ ] Capture Day Filter Pills in active state
- [ ] Capture each Dashboard Tab (Insights, Timeline, Actions, Workspace)
- [ ] Capture Calendar Selector dropdown
- [ ] Trigger and capture Action Workflow Modal
- [ ] Capture Upgrade Modal (if triggerable)
- [ ] Navigate to /recurring and capture all tabs
- [ ] Navigate to /schedule and capture all states
- [ ] Navigate to /settings and capture calendar selection UI
- [ ] Navigate to /admin and capture all tabs
- [ ] Repeat key pages at mobile viewport

**Success Criteria**:
- All authenticated pages captured with realistic data
- Modal states captured
- All tab variations documented

---

### Phase 4: Accessibility Audit

**WCAG 2.1 AA Checklist**:

| Criterion | Description | Test Method |
|-----------|-------------|-------------|
| 1.1.1 | Non-text content has text alternative | Manual review of all images |
| 1.3.1 | Info and relationships | Inspect semantic HTML structure |
| 1.4.1 | Use of color | Check status indicators use more than color |
| 1.4.3 | Contrast (minimum) | Lighthouse audit for 4.5:1 ratio |
| 1.4.4 | Resize text | Test at 200% zoom |
| 2.1.1 | Keyboard | Tab through all interactive elements |
| 2.4.1 | Bypass blocks | Check for skip links |
| 2.4.3 | Focus order | Verify logical tab order |
| 2.4.4 | Link purpose | Check link text clarity |
| 2.4.6 | Headings and labels | Verify heading hierarchy |
| 3.1.1 | Language of page | Check html lang attribute |
| 3.2.1 | On focus | Verify no unexpected context changes |
| 3.3.1 | Error identification | Check form error messages |
| 4.1.2 | Name, role, value | Inspect ARIA attributes |

**Tasks**:
- [ ] Run Lighthouse accessibility audit on each main page
- [ ] Test keyboard navigation through critical user flows
- [ ] Check color contrast on health score indicators
- [ ] Verify form error message accessibility
- [ ] Test screen reader announcements on dynamic content
- [ ] Capture accessibility audit results as screenshots

**Success Criteria**:
- Lighthouse accessibility score captured for each page
- Keyboard navigation issues documented
- Color contrast violations identified

---

### Phase 5: Heuristic Evaluation

**Nielsen's 10 Heuristics Assessment**:

| # | Heuristic | Key Questions for CalendarZero |
|---|-----------|-------------------------------|
| 1 | Visibility of system status | Does health score update in real-time? Are loading states clear? |
| 2 | Match between system and real world | Does terminology match EA workflow (e.g., "buffer time", "holds")? |
| 3 | User control and freedom | Can users undo actions? Is there clear "back" navigation? |
| 4 | Consistency and standards | Are button styles consistent? Does navigation follow patterns? |
| 5 | Error prevention | Are destructive actions confirmed? Are form inputs validated? |
| 6 | Recognition over recall | Is current calendar selection visible? Are action options clear? |
| 7 | Flexibility and efficiency | Are there keyboard shortcuts? Can power users work faster? |
| 8 | Aesthetic and minimalist design | Is information density appropriate? Is there visual clutter? |
| 9 | Help users with errors | Are error messages helpful? Do they suggest solutions? |
| 10 | Help and documentation | Is there contextual help? Are features explained? |

**Tasks**:
- [ ] Evaluate each heuristic across all pages
- [ ] Rate each finding: Pass / Warning / Fail
- [ ] Capture screenshot evidence for each finding
- [ ] Write actionable recommendations for each issue

**Success Criteria**:
- All 10 heuristics evaluated
- Each finding has severity rating (P0-P3)
- Each finding has clear recommendation

---

### Phase 6: Report Compilation

**Report Structure**:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CalendarZero UX Audit Report #001</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <!-- Sticky Navigation Sidebar -->
  <nav class="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
    <div class="p-4">
      <h1 class="text-xl font-bold">UX Audit #001</h1>
      <p class="text-sm text-gray-500">December 2025</p>
    </div>
    <ul class="space-y-1 p-4">
      <li><a href="#executive-summary">Executive Summary</a></li>
      <li><a href="#methodology">Methodology</a></li>
      <li><a href="#landing-page">Landing Page</a></li>
      <li><a href="#authentication">Authentication</a></li>
      <li><a href="#onboarding">Onboarding</a></li>
      <li><a href="#dashboard">Dashboard</a></li>
      <li><a href="#recurring">Recurring</a></li>
      <li><a href="#schedule">Schedule</a></li>
      <li><a href="#settings">Settings</a></li>
      <li><a href="#admin">Admin Panel</a></li>
      <li><a href="#accessibility">Accessibility</a></li>
      <li><a href="#recommendations">Recommendations</a></li>
    </ul>
  </nav>

  <!-- Main Content -->
  <main class="ml-64 p-8">
    <!-- Sections with screenshots and findings -->
  </main>
</body>
</html>
```

**Tasks**:
- [ ] Build HTML report template with navigation
- [ ] Embed all screenshots with descriptive captions
- [ ] Write executive summary with key metrics
- [ ] Document methodology section
- [ ] Compile all heuristic findings by page
- [ ] Add accessibility audit results
- [ ] Create prioritized recommendations table
- [ ] Add severity legend and rating explanations

**Success Criteria**:
- Report renders correctly at `/admin/ux_audit_001`
- All screenshots visible and properly captioned
- Navigation sidebar works correctly
- Report is itself accessible (good contrast, semantic HTML)

---

### Phase 7: Deployment & Verification

**Tasks**:
- [ ] Commit all files to `staging/ux_fix/consistency` branch
- [ ] Push to remote to trigger Vercel deployment
- [ ] Verify report loads at `https://calfix-new.vercel.app/admin/ux_audit_001/index.html`
- [ ] Test report on mobile device
- [ ] Verify all images load correctly
- [ ] Test navigation sidebar functionality

**Success Criteria**:
- Report accessible at expected URL
- All images load without 404 errors
- Report is responsive and readable on mobile

---

## User Flows to Document (32 Total)

### Authentication & Onboarding (7 flows)
1. Anonymous visitor exploration (landing → features → pricing)
2. Sign-up and OAuth connection flow
3. First-time user onboarding (welcome → calendar selection → completion)
4. Onboarding guard redirect flow
5. Calendar disconnection recovery
6. Sign-in returning user flow
7. Session expiration handling

### Core Dashboard Features (8 flows)
8. Dashboard initial load and health score display
9. View selector time horizon changes
10. Day filter pill interactions
11. Calendar selector (Basic tier - single)
12. Calendar selector (EA/Pro tier - multi)
13. Action workflow modal flow
14. Upgrade modal encounter
15. Agent chatbot (feature-flagged)

### Secondary Features (5 flows)
16. Recurring meetings analytics
17. Schedule page meeting creation
18. Active holds management
19. Template save and reuse
20. Settings calendar configuration

### Navigation & Layout (5 flows)
21. Header app navigation
22. Header marketing navigation
23. Footer navigation
24. Mobile navigation (CRITICAL GAP - currently missing)
25. Anchor hash navigation

### Profile & Admin (5 flows)
26. User profile management
27. Account information review
28. Admin access authorization
29. Admin panel analytics
30. Admin panel configuration

### Error States (2 flows)
31. OAuth callback error handling
32. API failure recovery

---

## Known Issues to Document

### Critical (P0) - Must Fix
1. **Mobile Navigation Missing**: Navigation hidden on mobile with no hamburger menu alternative
2. **OAuth Error Recovery**: No specification for handling OAuth failures

### High (P1) - Should Fix Soon
3. **Calendar Token Refresh**: Unclear handling of expired calendar tokens
4. **Loading State Consistency**: Multiple loading patterns (skeleton, spinner, full-page)
5. **Empty State Messaging**: Inconsistent empty states across features

### Medium (P2) - Fix When Possible
6. **Keyboard Navigation**: Unverified keyboard accessibility in custom components
7. **Color Contrast**: Health score indicators may rely on color alone
8. **Real-time Updates**: Dashboard data doesn't update without refresh

### Low (P3) - Nice to Have
9. **Tab State Persistence**: Dashboard tab resets on navigation
10. **Timezone Display**: No toggle between local and event timezone

---

## Acceptance Criteria

### Functional Requirements
- [ ] All 32 user flows documented with screenshots
- [ ] All pages captured at desktop (1440px) and mobile (390px) viewports
- [ ] All modal states captured
- [ ] All error states documented (where accessible)

### Quality Gates
- [ ] Report HTML validates (no broken images, working links)
- [ ] Report is itself accessible (WCAG 2.1 AA compliant)
- [ ] Screenshots are high quality (PNG, full resolution)
- [ ] All findings have severity ratings
- [ ] All findings have actionable recommendations

### Deliverables
- [ ] `/public/admin/ux_audit_001/index.html` - Main report
- [ ] `/public/admin/ux_audit_001/images/` - All screenshots (~100+ images)
- [ ] Report accessible at `https://calfix-new.vercel.app/admin/ux_audit_001/`

---

## References & Research

### Internal References
- Route configuration: `src/App.tsx`
- Layout component: `src/components/Layout.tsx`
- Dashboard: `src/components/CalendarDashboard.tsx`
- Admin panel: `src/components/AdminPanel.tsx`
- Settings: `src/pages/SettingsPage.tsx`

### External References
- [Nielsen's 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?levels=aaa)
- [Playwright MCP Documentation](https://github.com/anthropics/mcp)
- [Vite Static Asset Handling](https://vitejs.dev/guide/assets.html#the-public-directory)

### Research Sources
- Nielsen Norman Group - Heuristic Evaluation methodology
- W3C - WCAG 2.1 AA accessibility standards
- Eleken - UX Audit Report best practices
- Raw.Studio - SaaS Dashboard UX patterns
- PageFlows - Calendar Design UX patterns

---

## ERD: Report Structure

```mermaid
erDiagram
    AUDIT_REPORT ||--o{ PAGE_SECTION : contains
    PAGE_SECTION ||--o{ FINDING : has
    PAGE_SECTION ||--o{ SCREENSHOT : includes
    FINDING ||--o{ RECOMMENDATION : generates

    AUDIT_REPORT {
        string title
        date audit_date
        string auditor
        string app_version
        string executive_summary
    }

    PAGE_SECTION {
        string page_name
        string route
        string description
        int finding_count
    }

    SCREENSHOT {
        string filename
        string viewport
        string state
        string caption
        string alt_text
    }

    FINDING {
        string heuristic
        string description
        enum severity P0_P1_P2_P3
        string evidence
        string user_impact
    }

    RECOMMENDATION {
        string action
        string rationale
        enum effort LOW_MED_HIGH
        string code_reference
    }
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pages Audited | 11 routes |
| User Flows Documented | 32 flows |
| Screenshots Captured | 100+ images |
| Heuristics Evaluated | 10 per page |
| WCAG Criteria Checked | 14 criteria |
| Findings Documented | All issues found |
| Recommendations Provided | 1 per finding |

---

## Timeline Note

This plan focuses on **what** needs to be done, not **when**. The work is broken into phases that can be executed sequentially. Each phase has clear success criteria to determine completion.
