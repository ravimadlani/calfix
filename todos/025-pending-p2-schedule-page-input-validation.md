---
status: pending
priority: p2
issue_id: "025"
tags: [security, code-review, pr-18, validation, input-sanitization]
dependencies: []
---

# IMPORTANT: Missing Input Validation in SchedulePage

## Problem Statement

SchedulePage.tsx accepts user input (emails, time strings, calendar IDs) without proper validation. This creates potential for injection attacks, API errors, and data corruption.

**PR:** #18 - feat: Dedicated Schedule page with Quick Schedule buttons

## Findings

### 1. Email Validation Missing
- **File:** `src/pages/SchedulePage.tsx:841-848`
- **Issue:** Participant emails accepted without validation
- **Impact:** Malicious email formats could cause API issues

```typescript
// Current - no validation
<input
  type="email"
  value={participant.email}
  onChange={(event) => updateParticipant(participant.id, {
    email: event.target.value,  // NO VALIDATION
    calendarId: event.target.value.trim() ? event.target.value.trim() : participant.calendarId
  })}
```

### 2. Calendar ID from localStorage
- **File:** `src/pages/SchedulePage.tsx:212, 244`
- **Issue:** Calendar ID read/written without sanitization
- **Impact:** Potential XSS if malicious value injected

```typescript
// Reading without validation
return localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY) || 'primary';

// Writing without validation
window.localStorage.setItem(MANAGED_CALENDAR_STORAGE_KEY, managedCalendarId);
```

### 3. Time String Validation Silent Failure
- **File:** `src/pages/SchedulePage.tsx:88-94`
- **Issue:** Invalid times return 0 instead of error
- **Impact:** Could schedule meetings at midnight unintentionally

```typescript
const timeStringToMinutes = (time: string) => {
  if (!time || !time.includes(':')) {
    return 0;  // Silent failure
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (Number.isFinite(m) ? m : 0);
};
```

### 4. Missing Input Length Limits
- **Locations:**
  - Line 924: `meetingPurpose` - no max length
  - Line 819: `displayName` - no max length
  - Line 1265: `emailDraft` - no max length

## Proposed Solutions

### Option 1: Add Validation Functions (Recommended)

```typescript
// src/utils/validation.ts
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const CALENDAR_ID_REGEX = /^[a-zA-Z0-9@._-]+$/;
const MAX_EMAIL_LENGTH = 254;

export const validateEmail = (email: string): boolean => {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
};

export const validateCalendarId = (id: string): string => {
  if (!id || !CALENDAR_ID_REGEX.test(id)) return 'primary';
  return id.slice(0, 255);
};

export const parseTimeToMinutes = (time: string): number => {
  if (!time || !time.includes(':')) {
    throw new Error(`Invalid time format: ${time}`);
  }
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid time values: ${time}`);
  }
  return h * 60 + m;
};

export const INPUT_LIMITS = {
  meetingPurpose: 200,
  displayName: 100,
  email: 254,
  label: 100,
  emailDraft: 5000
};
```

**Pros:**
- Centralized validation
- Reusable across components
- Clear error handling

**Cons:**
- Need to handle errors in UI
- Some refactoring required

**Effort:** Small (2-3 hours)
**Risk:** Low

### Option 2: Use Form Library (Zod + React Hook Form)

**Approach:** Add Zod schemas with react-hook-form

**Pros:**
- Type-safe validation
- Better form state management
- Industry standard

**Cons:**
- New dependencies
- Learning curve
- Over-engineering for this use case

**Effort:** Medium (4-6 hours)
**Risk:** Low

## Recommended Action

**Option 1** - Add simple validation functions. Library approach is overkill for current needs.

## Technical Details

### Files to Modify
- `src/pages/SchedulePage.tsx`
- `src/utils/validation.ts` (new)

### Validation Points
1. Email inputs (lines 841-848)
2. Calendar ID storage (lines 212, 244)
3. Time inputs (lines 876, 888)
4. Text inputs (add maxLength attributes)

## Acceptance Criteria

- [ ] Email validation with regex and length check
- [ ] Calendar ID validation before localStorage read/write
- [ ] Time string validation throws on invalid input
- [ ] All text inputs have maxLength attributes
- [ ] Error messages shown for invalid inputs

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-08 | Created during PR #18 review | No validation on any form fields |

## Resources

- **PR:** https://github.com/ravimadlani/calfix/pull/18
- **OWASP Input Validation:** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
