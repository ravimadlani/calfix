
Here is the full updated Product Requirements Document (PRD) for the “Recurring” tab in CalFix, incorporating all feedback including domain inference, agenda rule, and 1-on-1 cohort logic. I’ve preserved your British accent preference by keeping phrasing clear and a little formal.

⸻

CalFix: Recurring Meetings Tab – PRD

Owner: Ravi Madlani
Date: 2 November 2025
Version: 1.1
Status: Draft → Review
Target Release: Next sprint (after Dashboard enhancements)
Codebase: React + TypeScript + Tailwind (as per CalFix repo)
Auth / Calendar Setup: Uses existing CalendarProviderContext + Clerk auth.

⸻

1. Problem Statement

Recurring meetings and 1:1s are a significant source of calendar bloat and weak relationship management for executives and their assistants. Without clear analytics and actionable tools, many recurring series remain outdated, inefficient or simply continue by inertia. By adding a dedicated “Recurring” tab, CalFix will help EAs (and execs) audit, optimise, and track recurring meetings and 1:1 relationships—freeing time and protecting focus.

⸻

2. Goals & Objectives

Goals
	•	Provide a Recurring Meeting Health dashboard: surface series with time cost, red‐flags (ghost, zombie, hoarding, external trap).
	•	Deliver a 1:1 Relationship Tracker: show last two and next two meetings for each involved person (from last 60 days cohort) and flag relationship health.
	•	Enable quick actions on recurring series (propose cadence change, request agenda, mark for review) and allow exports (CSV, PDF).
	•	Provide filters and segmentation (internal vs external) grounded in domain inference from selected calendar.
	•	Support advanced integrations (Meet/Zoom) in a roadmap, but deliver core functionality with available calendar metadata.

Objectives (Metrics)
	•	Increase awareness: At least 50% of users view the Recurring tab within two weeks of release.
	•	Action taken: At least 30% of listed series get at least one quick action (propose, request agenda) within one month.
	•	Time reclaimed: Users estimate a combined weekly saving > X hours (via UI messaging).
	•	Relationship health: Reduce overdue 1:1 relationships (status 🔴) by 20% within quarter.

⸻

3. Users & Personas

Primary: Executive Assistants (EAs) – they manage the calendar, optimise meetings, monitor relationships.
Secondary: Executives – want the high-level health of their recurring commitments and relationships.
Tertiary: Operations/Team leads – may use aggregated views for team calendar hygiene (future phase).

⸻

4. Scope: What is In & Out

In-Scope
	•	Data retrieval of recurring series from connected calendar account.
	•	Domain inference from selected calendar account’s email → internal vs external categorisation.
	•	Agenda check via minimal rule (empty or whitespace description).
	•	1:1 cohort defined: persons with true 1:1 in last 60 days; health view (last two, next two, cadence).
	•	Quick actions (UI only): propose, request agenda, mark for review.
	•	Exports: CSV (initial) and PDF (optional roadmap).
	•	Filters: time period (last 30/60/90 days), internal/external/mixed, frequency, search.
	•	Summary overview metrics: total recurring series, weekly hours, % of work-week (e.g., 40h baseline), people-hours.

Out of Scope (for now)
	•	Deep integration into conferencing APIs (Google Meet, Zoom) for true attendance analytics.
	•	Organisation-level aggregated dashboards (team/department).
	•	Fully automated cadence change (actual rescheduling via API).
	•	AI‐driven agenda generation/summary (future roadmap).

⸻

5. Information Architecture & Navigation

Top Navigation
	•	Dashboard | Recurring | Profile/Settings
	•	Link placed next to Dashboard in Layout.tsx.

Route
	•	/recurring → RecurringPage.tsx

Tab Segmentation within RecurringPage
	•	Segmented controls or sub-tabs:
	1.	Health Check
	2.	1:1s
	3.	Audit Report

Filters & Controls
	•	Time period selector (Last 30 days, 60 days, 90 days)
	•	Internal / External / Mixed toggle
	•	Frequency filter (daily, weekly, bi-weekly, monthly)
	•	Search bar (by meeting name, organiser, attendee)
	•	Sort dropdown (e.g., largest time cost, lowest acceptance, most stale)
	•	Export button (CSV; PDF in roadmap)

⸻

6. Functional Requirements

6.1 Recurring Detection & Grouping
	•	Identify recurring series via:
	•	recurrence[] field on master event OR recurringEventId on instances.
	•	Expand series via events.list with singleEvents=true and group by recurringEventId or master id.
	•	For each series compute:
	•	Frequency (derived from RRULE FREQ/INTERVAL; if inconsistent fallback to average gap between instances)
	•	Duration (scheduled end minus start)
	•	Weekly & monthly time cost: e.g., Duration × (instances/week)
	•	People-hours: (attendee count) × duration × frequency
	•	Attendance proxies: using attendees[].responseStatus (accepted, declined, needsAction)
	•	Attendee churn: Jaccard distance across attendees sets among instances
	•	Staleness: no title/description/time changes in ≥6 months
	•	Domain split: Using internalDomain = domainOf(selectedCalendarEmail). Attendees whose email ends with @internalDomain are “internal”; others external.
	•	Agenda check: flagged if description is empty or whitespace.
	•	Flags (health signals) as per heuristics in Section 7.

6.2 Health Signals
	•	Ghost Meeting (Critical): acceptance rate < 50% OR cancellations > 30% of instances.
	•	Zombie Meeting (High): no agenda AND staleness ≥6 months.
	•	Calendar Hoarding (Medium): 8+ attendees with many optional invites OR duration 60min+ when typical instances shorter OR high frequency when lower could suffice.
	•	External Dependency Trap (Medium): series includes external attendees and no end (RRULE without UNTIL/COUNT) OR frequent cancellations/reschedules.
	•	Stale Series: series unchanged (title/desc/time) for ≥6 months.

6.3 1:1 Relationship Tracker
	•	Cohort selection: All people with whom the user had a true 1:1 meeting in the last 60 days. “True 1:1” defined as exactly two human participants (user + other) and no resources.
	•	For each person:
	•	Retrieve instances in window ±90 days (i.e., look-back 90 days for past; look-ahead 90 days for future).
	•	Compute Last 2 meetings (most recent past) and Next 2 (upcoming).
	•	Compute cadence: average gap between past meetings (use up to last 6).
	•	Compute days since last meeting: difference between now and last meeting date.
	•	Determine status:
	•	🟢 healthy: days since last ≤ avg gap ×2
	•	🟡 overdue: days since last > avg gap ×2
	•	🔴 critical: days since last > 60 days (regardless of cadence)
	•	UI: Cards summarising each relationship with last/next meetings list, status pill, quick action buttons: “Schedule Next”, “Send Check-in”, “Adjust Cadence”.
	•	Pinning (optional): allow EA to mark top 4–5 relationships to keep at top of list; ordering still by status and recency by default.

6.4 Quick Actions
	•	Propose Cadence Change: For selected recurring series, allow user to pick a new cadence (e.g., weekly → bi-weekly) and display estimated time saved. Generate email draft with placeholders.
	•	Request Agenda/Purpose: For series flagged no agenda, generate polite email template to organiser.
	•	Mark for Month Review: Tag series with private note and remind in 30 days (localStorage/Clerk metadata).
	•	Schedule Next 1:1: Pre-fill scheduling modal for the counterpart with suggested date = last meeting + target cadence.
	•	Send Check-in: Pre-fill email draft: “Hi [Name], I noticed we haven’t met in [X days]…” etc.

6.5 Reporting & Exports
	•	Audit Report: One-click generate from Health Check tab for selected period. Contents: Summary (total recurring meetings, weekly hours, % of week, people-hours), Critical Issues (list), Opportunities (list with time savings).
	•	Export formats: CSV (table of all series with metrics) and PDF (formatted narrative report ready for sharing).
	•	In Audit modal: two buttons: [Export Full Report] and [Apply Quick Fixes] (batch application open).

⸻

7. UX / UI Design
	•	Page layout: consistent with existing Dashboard style (cards, tables, Tailwind spacing).
	•	Health Check view:
	•	Top stats banner (Total Recurring Meetings, Weekly Hours, % of 40h week, People-hours/month, Internal vs External breakdown).
	•	Table or card list of series: columns include Series Name, Organiser, Frequency, Duration, Attendees (#), InternalCount/ExternalCount, Acceptance Rate, Flag(s), Recommendation, Est. Time Savings.
	•	Row-expander: small sparkline chart of acceptance rate over last 4 instances + “Last Modified” date.
	•	1:1s view:
	•	Grid of relationship cards (scrollable). Each card: Person Photo/Avatar, Name, Last 2 dates, Next 2 dates, Cadence (~X days), Status pill (🟢/🟡/🔴), Buttons [Schedule Next], [Send Check-in], [Adjust Cadence].
	•	Option to Pin (star icon) each card. Pinned cards appear first.
	•	Audit modal: full-screen overlay with structured sections (Summary, Critical Issues, Opportunities). Visual indicators (icons: 👻 ghost, 🧟 zombie, etc) for flag types. Buttons for export/apply at bottom.
	•	Filters bar: always visible at top of view; sticky on scroll.
	•	Empty states:
	•	Health Check: “No recurring series found in the last 30 days. Connect your calendar or widen the date range.”
	•	1:1s: “No 1:1s detected in the last 60 days. Schedule your first 1:1 to get started.”
	•	Accessibility:
	•	Use aria-labels for status pills and buttons.
	•	Colour not sole indicator (status icons + text).
	•	Keyboard navigation supported (tab, arrows).
	•	Mobile / Responsive:
	•	Table collapses to card list on small screens.
	•	Filters toggle in drawer.

⸻

8. Data & Algorithmic Detail

Inputs
	•	Calendar events via provider API (Google Calendar, etc). Fields: id, recurrence[], recurringEventId, attendees[] (with email, responseStatus, optional, resource), organizer.email, creator.email, start.dateTime, end.dateTime, status, htmlLink, updated, description.
	•	Selected calendar account metadata from CalendarProviderContext (email, provider, id) for domain inference.

Derived Metrics
	•	InternalDomain: domain = selectedAccount.email.split('@')[1].toLowerCase()
	•	Attendee split:

const internal = attendees.filter(a => a.email!.toLowerCase().endsWith(`@${internalDomain}`));
const external = attendees.filter(a => !a.email!.toLowerCase().endsWith(`@${internalDomain}`));


	•	Acceptance Rate = acceptedCount / totalInvitedInstances (for last K instances, default K = 4)
	•	Decline Rate = declinedCount / totalInvited
	•	No-response Rate = needsActionCount / totalInvited
	•	Attendee Churn = 1 − (|Intersection(current attendees, previous attendees)| / |Union|)
	•	Stale if updated (or last change timestamp) > 6 months old.
	•	Time Cost Weekly = durationMinutes × frequencyPerWeek
	•	People-hours Monthly = attendeeCount × durationHours × frequencyPerMonth
	•	Cadence (1:1) = average days gap between last N past meetings (N ≤ 6)
	•	Days Since Last Meeting (1:1) = today − lastMeetingDate

Flag Logic Pseudocode (excerpt)

if (acceptanceRate < 0.5 || cancellations / totalInstances > 0.3) flags.push('Ghost');
if (needsAgenda(series) && isStale(series, 180)) flags.push('Zombie');
if (attendeeCount >= 8 && manyOptional(attendees) || durationMinutes >= 60 && typicalInstances < 45) flags.push('Hoarding');
if (hasExternalAttendees(series) && noRRuleEnd(series) || highCancellationRate(series)) flags.push('ExternalTrap');

1:1 Cohort Logic (refined)
	•	Time window: last 60 days for cohort inclusion (user had 1:1).
	•	Past data window: last 90 days.
	•	Future data window: next 90 days.
	•	True 1:1 = participants set size ==2 (user + other) and no resources.
	•	Status determination:
	•	If daysSinceLast > avgCadence × 2 → 🟡
	•	If daysSinceLast > 60 → 🔴
	•	Else 🟢

⸻

9. Privacy & Security
	•	Respect user privacy: only analyse the calendar events of the selected account (user’s explicit calendar connection).
	•	No content of event descriptions beyond minimal (agenda check) will be stored or surfaced externally.
	•	If the user opts into conferencing integrations (Meet/Zoom later), show explicit consent and scopes; store only aggregated metrics (attendance rate, join times) not raw transcripts.
	•	All data storage (quick action tags, 1:1 tracked persons) stored via Clerk user.publicMetadata (or localStorage fallback) and encrypted in transit.
	•	Export files (CSV/PDF) downloaded locally; no automatic email dispatch unless user initiates.

⸻

10. Technical Implementation Plan

Front-end changes
	•	In src/components/Layout.tsx: Add a nav link “Recurring” next to Dashboard.
	•	In src/App.tsx: Add route <Route path="/recurring" element={<RecurringPage />} />.
	•	Create src/pages/RecurringPage.tsx, and sub-components:
	•	HealthCheck.tsx
	•	OneOnOnes.tsx
	•	AuditModal.tsx
	•	SeriesCard.tsx, RelationshipCard.tsx
	•	Create hooks/services: useRecurringAnalysis() to fetch events and compute metrics; useOneOnOneCohort() for cohort logic.
	•	Extend existing CalendarProviderContext if needed to expose selectedAccount email.
	•	Styling: per Tailwind config, consistent with existing UI.
	•	Exports: Use json2csv or equivalent for CSV; PDF via jsPDF or backendless solution.

Backend / Integrations (future roadmap)
	•	Meet/Zoom attendance: OAuth flows; serverless endpoint to fetch participant lists.
	•	Admin/Org analytics: exposed via higher-admin role (future phase).

Performance & Data Considerations
	•	Limit events fetch window (e.g., last 6 months + next 3 months) to bound volume.
	•	Cache series computations by recurringEventId; update when updated timestamp changes.
	•	Paginate table lists; lazy-load sparkline charts.
	•	Use memoization for cohort arrays.

Edge Cases
	•	Events with attendeesOmitted=true: fallback to invited count unknown; mark “? attendees”.
	•	Series with heavy exceptions/reschedules: detection fallback to average gap rather than RRULE.
	•	Timezones: ensure all date comparisons are UTC-aware.
	•	User has multiple connected accounts: system uses currently selected (activeProviderId); allow account switch to recalc domain/internals.

⸻

11. Content & Guidance (for EAs)
	•	Tooltips & micro-copy:
	•	“Internal vs External classification is based on the email domain of the calendar account you’ve connected.”
	•	“An agenda (in the description) is the smallest signal of meeting value — we flag series with an empty description.”
	•	“Your 1:1 relationships view shows everyone you met 1:1 with in the last 60 days. Pin your top four or five to keep them front and centre.”
	•	Support contextual help (“?” icon) linking to best-practice guides: e.g., audit frameworks, 1:1 frequency guidelines.
	•	Encourage customers: “First step: run a 30-day audit, pick 3 big offenders, apply changes, revisit in next 30 days.” (supported by meeting audit literature)  ￼

⸻

12. Success Metrics (post-launch)
	•	Engagement: % of users visiting Recurring tab at least once per week.
	•	Action rate: % of recurring series with at least one quick action within 30 days.
	•	Time cost reduction: average weekly recurring meeting hours shown to user; target drop by e.g. 10% within first quarter.
	•	1:1 health improvement: % of relationships moving from 🟡/🔴 to 🟢 within 90 days.
	•	Customer satisfaction: user feedback rating (survey) > 4.5/5 for Recurring tab usefulness.

⸻

13. Delivery Timeline & Phases

Phase 1 (MVP – 2 weeks)
	•	Route/nav link, tab structure.
	•	Recurring detection and grouping.
	•	Domain inference, agenda check, internal/external split.
	•	Health Check view (table/cards) with flags.
	•	1:1 cohort logic (60-day inclusion) and card view with last/next 2, status pill.
	•	CSV export.
	•	Basic quick actions UI (without e-mail send).
	•	Filters (time period, internal/external, frequency).
	•	UI copy & tooltips.

Phase 2 (Next sprint)
	•	Audit Report modal (narrative + export PDF).
	•	Quick actions: email draft generation; mark for review with reminders.
	•	Sparkline charts in series rows.
	•	Pinning of 1:1 relationships.
	•	Performance tuning, caching.

Phase 3 (Later / roadmap)
	•	Integrations: Google Meet v2 attendance, Zoom participants.
	•	Org-level dashboard roll‐up.
	•	“Monthly Auto Audit” email sent to user.
	•	AI-driven agenda suggestions, meeting summarisation.

⸻

14. Open Questions & Assumptions

Assumptions
	•	Users connect a calendar account (Google/Microsoft) that supplies email for domain inference.
	•	Recurring series can be effectively grouped by recurringEventId or master event ID; exceptions exist but are rare enough to treat as edge cases.
	•	Presence of description field is a useful minimal proxy for agenda; more advanced quality (e.g., decision log, action items) is beyond MVP.

Open Questions
	1.	Pinning: how many relationships can be pinned? (default suggestion = 4–5)
	2.	End date detection: for series with no RRULE UNTIL/COUNT, should we assume “indefinite” and highlight accordingly?
	3.	CSV vs PDF exports: Should PDF include company/exec branding?
	4.	Email draft templating: Should default templates vary by series type (internal vs external)?
	5.	For 1:1 cadence determination: if fewer than 2 past meetings exist, what is the default cadence base? (Fallback: assume 14 days or ask user to set)
	6.	Handling multi-organizer series: If the user is an attendee rather than organiser, how should the recommendation differ? (E.g., propose-to-organiser vs propose-to-you)
	7.	For performance: Should series older than 12 months with no upcoming instances be auto-excluded from default table (but accessible via “All time” filter)?

⸻

15. Appendices

A. Pseudocode Snippets

(As provided in earlier section for domain inference, cohort logic, etc.)

B. Reference Material
	•	Recurring Meeting Audit Report template (Power BI/Viva Insights) – Microsoft Learn.  ￼
	•	Meeting Audit Guide – Noota.  ￼
	•	Meeting Time Audit – IdeaClouds.  ￼
	•	Effective Meeting Toolkit – University of Cambridge.  ￼
	•	Meeting Effectiveness Report – Microsoft Learn.  ￼

⸻

That completes the PRD.

If you like, I can generate a Markdown file (or Confluence-formatted page) ready for your engineering board, and XL column backlog or Jira-ready epics & stories broken down from this. Would you like me to proceed with that?