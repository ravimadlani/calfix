# Settings Page UX Consistency Update

## Overview

Update the Settings page (`/settings`) to match the header and layout patterns used in Dashboard and Recurring pages for visual consistency across the application.

## Problem Statement / Motivation

The Settings page currently uses different layout patterns than Dashboard and Recurring pages:

| Aspect | Settings (Current) | Dashboard/Recurring |
|--------|-------------------|---------------------|
| PageHeader variant | `inline` (default) | `sticky` |
| Container width | `max-w-3xl` (768px) | `max-w-7xl` (1280px) |
| Section spacing | `mb-6` on each section | `space-y-8` on container |
| Background wrapper | `min-h-screen bg-gray-50` | No wrapper |

This inconsistency creates a jarring experience when navigating between pages.

---

## Technical Approach

### Current Implementation

**File:** `src/pages/SettingsPage.tsx:145-152`

```tsx
return (
  <div className="min-h-screen bg-gray-50">
    <PageHeader
      title="Settings"
      description="Manage your calendar preferences and account settings"
    />

    <div className="max-w-3xl mx-auto px-4 py-8">
```

### Target Implementation

Match the Dashboard pattern from `src/components/CalendarDashboard.tsx:1148-1155`:

```tsx
return (
  <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
    <PageHeader
      title="Settings"
      description="Manage your calendar preferences and account settings"
      variant="sticky"
    />
```

---

## Implementation Phases

### Phase 1: Update Main Page Structure

**File:** `src/pages/SettingsPage.tsx`

**Changes:**

1. **Line 146**: Change outer wrapper from `min-h-screen bg-gray-50` to `max-w-7xl mx-auto px-4 py-8 space-y-8`

2. **Lines 147-150**: Add `variant="sticky"` to PageHeader

3. **Line 152**: Remove the nested container div (content will be direct children of outer wrapper)

4. **Line 154**: Remove `mb-6` from Calendar Slots section (spacing handled by parent's `space-y-8`)

5. **Line 274**: Remove `mb-6` from Account Info section (not needed as last child)

### Phase 2: Update Skeleton State

**File:** `src/pages/SettingsPage.tsx`

Update `SettingsPageSkeleton` to match new layout (prevent layout shift during load):

1. **Line 306**: Change wrapper to `max-w-7xl mx-auto px-4 py-8 space-y-8`

2. **Lines 307-312**: Update skeleton header to match sticky variant styling

3. **Line 313**: Remove nested `max-w-3xl` wrapper

---

## Acceptance Criteria

### Functional Requirements

- [ ] Settings page header renders with sticky variant (white background, border-bottom)
- [ ] Settings page content uses `max-w-7xl` container width
- [ ] Section spacing uses `space-y-8` (32px gaps)
- [ ] Visual appearance matches Dashboard and Recurring pages

### Quality Gates

- [ ] No layout shift during skeleton → loaded transition
- [ ] Page renders correctly on mobile (390px), tablet (768px), and desktop (1440px)
- [ ] All existing functionality preserved (calendar selection, save, etc.)

---

## MVP

### SettingsPage.tsx (updated)

```tsx
// src/pages/SettingsPage.tsx - lines 145-155 (after change)

return (
  <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
    {/* Page Header - sticky variant for consistency with Dashboard/Recurring */}
    <PageHeader
      title="Settings"
      description="Manage your calendar preferences and account settings"
      variant="sticky"
    />

    {/* Calendar Selection Section */}
    <section className="bg-white rounded-lg shadow p-6">
```

### SettingsPageSkeleton (updated)

```tsx
// src/pages/SettingsPage.tsx - SettingsPageSkeleton function

function SettingsPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Skeleton header matching sticky variant */}
      <div className="bg-white border-b border-gray-200 rounded-t-lg -mx-4 px-4 py-6">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
      </div>

      {/* Calendar slots skeleton */}
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-80 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Account info skeleton */}
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## References

### Internal References

- Dashboard layout: `src/components/CalendarDashboard.tsx:1148-1155`
- Recurring layout: `src/components/RecurringPage.tsx:492-499`
- PageHeader component: `src/components/shared/PageHeader.tsx`
- Settings page: `src/pages/SettingsPage.tsx`

### Related Work

- UX Audit Report: `/admin/ux_audit_001` (documents consistency findings)
