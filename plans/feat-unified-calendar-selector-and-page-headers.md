# feat: Unified Calendar Selector and Page Headers

## Overview

Create shared components for the calendar selector and page header patterns that are currently implemented inconsistently across the Dashboard, Recurring, and Schedule pages.

## Problem Statement

The calendar selector and page header components are duplicated across three pages with subtle inconsistencies:

### Calendar Selector Differences

| Aspect | Dashboard | Recurring | Schedule |
|--------|-----------|-----------|----------|
| **Container Style** | `bg-slate-50 border-slate-200 rounded-lg` | `bg-slate-50 border-slate-200 rounded-lg` | `bg-gray-50 border-gray-200 rounded-xl` |
| **Focus Ring Color** | `focus:ring-slate-500` | `focus:ring-slate-500` | `focus:ring-indigo-500` |
| **Provider Switcher** | Yes | No | No |
| **Action Buttons** | Refresh + Preferences | Refresh + Preferences | None |
| **Reset Button** | Yes (conditional) | No | No |
| **Upgrade Banner** | Separate component below | Inline button | None |

### Page Header Differences

| Aspect | Dashboard | Recurring | Schedule |
|--------|-----------|-----------|----------|
| **Header Section** | None (calendar selector is first element) | Inline h1 + description | Dedicated header with white bg, border-b |
| **Title Style** | N/A | `text-3xl font-bold text-slate-900` | `text-2xl font-bold text-gray-900` |
| **Description** | N/A | `text-slate-600 text-sm` | `text-sm text-gray-500` |
| **Navigation Tabs** | None | None | Yes (New Meeting / Manage Holds) |
| **Container** | `max-w-7xl` | `max-w-7xl` | `max-w-6xl` |

### Visual Evidence

Screenshots captured at:
- `.playwright-mcp/dashboard-page.png`
- `.playwright-mcp/recurring-page.png`
- `.playwright-mcp/schedule-page.png`

## Proposed Solution

### Option A: Minimal Shared Components (Recommended)

Create two focused shared components with variants to handle page-specific needs.

#### 1. `CalendarSelectorCard` Component

```typescript
// src/components/shared/CalendarSelectorCard.tsx

interface CalendarSelectorCardProps {
  // Core props
  availableCalendars: Calendar[];
  managedCalendarId: string;
  onCalendarChange: (calendarId: string) => void;

  // Subscription props
  hasMultiCalendarAccess: boolean;
  subscriptionTier?: string;
  isInTrial?: boolean;
  daysLeftInTrial?: number;
  allManageableCalendars?: Calendar[];

  // Feature toggles
  showProviderSwitcher?: boolean;
  showActionButtons?: boolean;
  showResetButton?: boolean;

  // Actions
  onRefresh?: () => void;
  onPreferences?: () => void;
  onUpgrade?: () => void;
  loading?: boolean;

  // Variant for styling consistency
  variant?: 'default' | 'compact';
}
```

**Styling Decision:** Standardize on `slate` palette with `rounded-lg` to match Dashboard/Recurring.

#### 2. `PageHeader` Component

```typescript
// src/components/shared/PageHeader.tsx

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;

  // Optional navigation
  tabs?: Array<{
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }>;

  // Actions slot
  actions?: React.ReactNode;

  // Variant
  variant?: 'inline' | 'sticky';
}
```

**Styling Decision:** Adopt Schedule page's sticky header pattern as the standard - it provides the most polished UX with clear visual separation.

### Option B: Compound Component Pattern

Create a more flexible compound component API:

```tsx
<CalendarManager>
  <CalendarManager.Header title="Dashboard" description="..." />
  <CalendarManager.ProviderSwitcher />
  <CalendarManager.CalendarSelector />
  <CalendarManager.ActionBar>
    <CalendarManager.RefreshButton />
    <CalendarManager.PreferencesButton />
  </CalendarManager.ActionBar>
  <CalendarManager.UpgradeBanner />
</CalendarManager>
```

**Pros:** Maximum flexibility, composable
**Cons:** More complex, may be overkill for 3 pages

### Option C: Configuration Object Pattern

Single component with configuration object:

```tsx
<PageLayout
  config={{
    header: { title: "Dashboard", description: "..." },
    calendarSelector: {
      showProviderSwitcher: true,
      showActionButtons: true,
    },
    upgradeBanner: { position: 'below' }
  }}
>
  {/* Page content */}
</PageLayout>
```

**Pros:** Single import, centralized config
**Cons:** Less flexible, harder to customize

## Recommendation

**Option A (Minimal Shared Components)** is recommended because:

1. **Simplicity:** Two focused components are easier to understand and maintain
2. **Flexibility:** Props allow per-page customization without complexity
3. **Incremental:** Can be adopted page-by-page without big-bang refactor
4. **TypeScript:** Clear prop interfaces make usage obvious

## Implementation Plan

### Phase 1: Create Shared Components

- [ ] Create `src/components/shared/CalendarSelectorCard.tsx`
  - Extract common calendar selector UI
  - Support `showProviderSwitcher`, `showActionButtons`, `showResetButton` props
  - Standardize on slate palette styling

- [ ] Create `src/components/shared/PageHeader.tsx`
  - Sticky header with title, description, optional tabs
  - Standardize on Schedule page's visual pattern

- [ ] Create `src/components/shared/types.ts`
  - Shared TypeScript interfaces for Calendar, etc.

### Phase 2: Migrate Dashboard

- [ ] Replace inline calendar selector with `<CalendarSelectorCard>`
- [ ] Add `<PageHeader>` component (optional - Dashboard may not need one)
- [ ] Verify all features work: Provider switching, calendar selection, refresh, preferences

### Phase 3: Migrate Recurring

- [ ] Add `<PageHeader title="Recurring Meetings" description="..." />`
- [ ] Replace inline calendar selector with `<CalendarSelectorCard>`
- [ ] Remove `showProviderSwitcher` (not applicable to Recurring)

### Phase 4: Migrate Schedule

- [ ] Update existing header to use `<PageHeader>` with tabs
- [ ] Replace inline calendar selector with `<CalendarSelectorCard variant="compact" />`
- [ ] Standardize styling to slate palette

### Phase 5: Cleanup

- [ ] Remove duplicate code from original files
- [ ] Update tests
- [ ] Verify all pages work correctly

## Acceptance Criteria

### Functional Requirements
- [ ] Calendar selection works identically on all three pages
- [ ] Subscription tier logic (basic vs EA vs EA Pro) works correctly
- [ ] Provider switching works on Dashboard
- [ ] Refresh and Preferences buttons work where enabled
- [ ] Upgrade prompts appear appropriately for basic tier users

### Visual Requirements
- [ ] Consistent styling across all pages (slate palette, rounded-lg)
- [ ] Page headers have consistent typography and spacing
- [ ] Schedule page tabs work correctly
- [ ] Responsive layout works on mobile

### Non-Functional Requirements
- [ ] No performance regression
- [ ] TypeScript types are comprehensive
- [ ] Components are documented with JSDoc

## Technical Considerations

### State Management

The calendar selector currently relies on:
- `useCalendar()` hook for `availableCalendars`, `managedCalendarId`
- `useSubscription()` hook for tier information
- Local state for loading/error states

The shared component should:
- Accept these as props (controlled component)
- Not create its own context
- Let parent pages manage state

### Styling Approach

Standardize on:
```css
/* Container */
bg-slate-50 border border-slate-200 rounded-lg p-4

/* Select dropdown */
px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-white

/* Labels */
text-sm font-medium text-gray-700

/* Helper text */
text-xs text-gray-500
```

### Accessibility

- Ensure `<select>` has associated `<label>`
- Use `aria-describedby` for helper text
- Keyboard navigation for tabs
- Focus management for dropdowns

## File Changes

### New Files
- `src/components/shared/CalendarSelectorCard.tsx`
- `src/components/shared/PageHeader.tsx`
- `src/components/shared/types.ts`
- `src/components/shared/index.ts` (barrel export)

### Modified Files
- `src/components/CalendarDashboard.tsx` (~100 lines removed)
- `src/components/RecurringPage.tsx` (~100 lines removed)
- `src/pages/SchedulePage.tsx` (~50 lines removed)

## References

### Internal References
- `src/components/CalendarDashboard.tsx:1414-1511` - Dashboard calendar selector
- `src/components/RecurringPage.tsx:649-747` - Recurring calendar selector
- `src/pages/SchedulePage.tsx:1471-1561` - Schedule page header and calendar selector
- `src/components/ProviderSwitcher.tsx` - Existing provider switcher component
- `src/components/ViewSelector.tsx` - Existing view selector pattern

### External References
- [Headless UI Listbox](https://headlessui.com/v1/react/listbox) - Accessible dropdown patterns
- [Tailwind UI Headers](https://tailwindui.com/components/application-ui/headings/page-headings) - Page header patterns
- [React Component Composition](https://react.dev/learn/thinking-in-react) - Component design principles

## Questions for Clarification

1. Should the Schedule page switch from `gray` to `slate` palette to match others, or should all pages adopt the `indigo` focus ring from Schedule?

2. Should Dashboard get a page header, or is the current "headerless" design intentional?

3. Should the Recurring page have a Provider Switcher like Dashboard?
