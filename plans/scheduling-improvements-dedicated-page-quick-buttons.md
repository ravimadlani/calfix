# ✨ feat: Schedule Page with Quick Buttons

## Overview

Convert the Schedule Meeting button from a modal to a dedicated `/schedule` page, and add Quick Schedule buttons for common scheduling patterns.

**Type:** Enhancement
**Priority:** Medium
**Estimated Effort:** 4 hours

---

## Problem Statement

1. **Modal Limitations**: The `TeamSchedulingModal.tsx` isn't shareable via URL and feels cramped on mobile
2. **Manual Slot Selection**: Users must navigate the full 3-step wizard every time
3. **Slow Scheduling**: No quick actions for common patterns like "3 slots this week"

---

## Solution: Keep It Simple

### Architecture Decision

- **Dashboard "Schedule Meeting" button** → Navigates to `/schedule` page
- **Existing wizard logic** → Reused as-is (no refactor)
- **Quick Schedule buttons** → 3 simple buttons with relative times

### What We're NOT Doing (YAGNI)

- ❌ No URL parameter schema for pre-filling slots
- ❌ No new date library (use existing date-fns)
- ❌ No wizard component extraction/refactor
- ❌ No timezone infrastructure (use browser timezone)
- ❌ No custom template system

---

## Implementation

### Phase 1: Move to Page (2 hours)

**Tasks:**
- [ ] Add `/schedule` route in `src/App.tsx`
- [ ] Create `SchedulePage.tsx` - copy TeamSchedulingModal content, remove modal wrapper
- [ ] Change dashboard button from `onClick` → `<Link to="/schedule">`
- [ ] Add "Schedule" link to navigation (optional)

**Files:**
```
NEW:    src/pages/SchedulePage.tsx
MODIFY: src/App.tsx (add route)
MODIFY: src/components/CalendarDashboard.tsx (button → Link)
MODIFY: src/components/Layout.tsx (optional nav link)
```

### Phase 2: Add Quick Buttons (2 hours)

**Tasks:**
- [ ] Create `QuickScheduleButtons.tsx` component (~100 lines)
- [ ] Add 3 hardcoded quick buttons with relative times
- [ ] Wire buttons to pre-fill wizard form via props
- [ ] Style to match existing UI

**Quick Button Options (v1):**

| Button | What it does |
|--------|-------------|
| "3 slots this week" | Tomorrow, day after, and 2 days later at 10 AM |
| "3 slots next week" | Mon, Wed, Fri of next week at 2 PM |
| "Coffee chat" | 3 × 30-min slots in next 3 business days |

**Files:**
```
NEW:    src/components/scheduling/QuickScheduleButtons.tsx
MODIFY: src/pages/SchedulePage.tsx (add buttons above wizard)
```

---

## Technical Details

### Route Addition

```tsx
// src/App.tsx
<Route
  path="/schedule"
  element={
    <ProtectedRoute>
      <SchedulePage />
    </ProtectedRoute>
  }
/>
```

### SchedulePage Structure

```tsx
// src/pages/SchedulePage.tsx
export function SchedulePage() {
  const [prefilledSlots, setPrefilledSlots] = useState<Date[]>([]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <Link to="/dashboard">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold">Schedule a Meeting</h1>
      </header>

      {/* Quick buttons */}
      <QuickScheduleButtons onSelectSlots={setPrefilledSlots} />

      {/* Existing wizard logic (copied from TeamSchedulingModal) */}
      <div className="mt-8">
        {/* Wizard content here - NOT refactored, just moved */}
      </div>
    </div>
  );
}
```

### Quick Buttons Component

```tsx
// src/components/scheduling/QuickScheduleButtons.tsx
interface QuickScheduleButtonsProps {
  onSelectSlots: (slots: Date[]) => void;
}

export function QuickScheduleButtons({ onSelectSlots }: QuickScheduleButtonsProps) {
  const generateThisWeekSlots = () => {
    const slots = [];
    let date = new Date();
    date.setDate(date.getDate() + 1); // Start tomorrow

    for (let i = 0; i < 3; i++) {
      // Skip weekends
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      const slot = new Date(date);
      slot.setHours(10, 0, 0, 0);
      slots.push(slot);
      date.setDate(date.getDate() + 1);
    }
    return slots;
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <button
        onClick={() => onSelectSlots(generateThisWeekSlots())}
        className="p-4 bg-slate-100 hover:bg-slate-200 rounded-lg"
      >
        <span className="text-2xl">📅</span>
        <p className="font-medium">3 slots this week</p>
        <p className="text-sm text-slate-500">10 AM slots</p>
      </button>
      {/* ... more buttons */}
    </div>
  );
}
```

### Date Handling

Use existing `date-fns` (already in project):

```tsx
import { addDays, setHours, isWeekend, nextMonday } from 'date-fns';
```

---

## Acceptance Criteria

- [ ] `/schedule` page loads correctly
- [ ] Dashboard button navigates to `/schedule`
- [ ] Quick buttons generate correct slots
- [ ] Wizard works exactly as before (no regressions)
- [ ] Mobile responsive

---

## What's Deferred to v2 (If Needed)

- Shareable URL parameters (`/schedule?slots=...`)
- Timezone selection (EST/PST/GMT buttons)
- Custom quick schedule templates
- Calendar availability filtering

---

## References

- **Current modal:** `src/components/TeamSchedulingModal.tsx`
- **Dashboard button:** `src/components/CalendarDashboard.tsx:1540-1554`
- **Router config:** `src/App.tsx:24-73`

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
