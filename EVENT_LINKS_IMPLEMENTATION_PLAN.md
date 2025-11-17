# Event Provider Links Implementation Plan

## Overview
Add hyperlinks to event cards that open the event directly in the source calendar provider's interface (Google Calendar or Microsoft Outlook web/desktop).

## Goal
Enable users to quickly navigate from CalFix event cards to the actual event in their calendar provider for detailed viewing, editing, or sharing.

## Technical Research

### Google Calendar Event URLs

#### Format for Web Links
```
https://calendar.google.com/calendar/u/0/r/eventedit/{eventId}
```
or
```
https://calendar.google.com/calendar/event?eid={base64EncodedEventId}
```

#### Required Data
- Event ID (from Google Calendar API)
- Calendar ID (for non-primary calendars)
- Optional: Account index (`u/0`, `u/1`, etc.) for multiple Google accounts

#### Example Implementation
```typescript
function getGoogleCalendarEventUrl(eventId: string, calendarId?: string): string {
  // For primary calendar
  if (!calendarId || calendarId === 'primary') {
    return `https://calendar.google.com/calendar/u/0/r/event/${eventId}`;
  }

  // For shared/delegated calendars
  const encodedEventId = btoa(`${eventId} ${calendarId}`);
  return `https://calendar.google.com/calendar/event?eid=${encodedEventId}`;
}
```

### Microsoft Outlook Event URLs

#### Outlook Web App (OWA) Format
```
https://outlook.office365.com/calendar/deeplink/read/{eventId}
```
or
```
https://outlook.live.com/calendar/0/deeplink/read/{eventId}
```

#### Outlook Desktop App Deep Link (Windows/Mac)
```
outlook://calendar/?id={eventId}&account={email}
```

#### Required Data
- Event ID (from Microsoft Graph API)
- Optional: User's email/account for desktop deep links

#### Example Implementation
```typescript
function getOutlookEventUrl(eventId: string, webOnly: boolean = true): string {
  if (webOnly) {
    // For Outlook Web App
    return `https://outlook.office365.com/calendar/deeplink/read/${eventId}`;
  } else {
    // For desktop app deep link
    return `outlook://calendar/?id=${eventId}`;
  }
}
```

## Implementation Plan

### Phase 1: Backend/Service Layer Updates

#### 1.1 Update Event Type Definition
```typescript
// src/types/calendar.ts
export interface CalendarEvent {
  // ... existing fields
  providerUrl?: string;  // Direct link to event in provider
  providerId: CalendarProviderId; // Track which provider owns this event
}
```

#### 1.2 Update Provider Services
- **Google Calendar Service** (`src/services/providers/google/calendar.ts`)
  - Add `providerUrl` generation in `normalizeEvent()` function
  - Include calendar ID in URL construction

- **Outlook Calendar Service** (`src/services/providers/outlook/calendar.ts`)
  - Add `providerUrl` generation in `normalizeEvent()` function
  - Support both web and desktop URLs

#### 1.3 Create URL Generation Utilities
```typescript
// src/utils/eventLinks.ts
export const generateEventProviderUrl = (
  event: CalendarEvent,
  providerId: CalendarProviderId,
  options?: {
    preferDesktop?: boolean;
    accountIndex?: number;
  }
): string => {
  switch (providerId) {
    case 'google':
      return generateGoogleEventUrl(event);
    case 'outlook':
      return generateOutlookEventUrl(event, options?.preferDesktop);
    default:
      return '#';
  }
};
```

### Phase 2: UI/UX Updates

#### 2.1 EventCard Component Updates
```typescript
// src/components/EventCard.tsx
const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const { activeProviderId } = useCalendarProvider();

  const handleOpenInProvider = () => {
    if (event.providerUrl) {
      window.open(event.providerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="event-card">
      {/* Existing event content */}

      {/* Add link button/icon */}
      <button
        onClick={handleOpenInProvider}
        className="event-provider-link"
        title={`Open in ${activeProviderId === 'google' ? 'Google Calendar' : 'Outlook'}`}
      >
        <ExternalLinkIcon />
      </button>
    </div>
  );
};
```

#### 2.2 UI Design Options

**Option A: Subtle Icon Button**
- Small external link icon in top-right corner of event card
- Shows tooltip on hover: "Open in Google Calendar" / "Open in Outlook"
- Minimal visual disruption

**Option B: Text Link**
- "View in Calendar" link at bottom of event details
- More explicit but takes more space

**Option C: Context Menu**
- Right-click menu option: "Open in Calendar Provider"
- Most subtle but less discoverable

**Recommended: Option A** - Best balance of accessibility and clean design

#### 2.3 Visual Indicators
- Different icons for Google vs Outlook
- Hover state with provider-specific colors
- Loading state while generating/fetching URL if needed

### Phase 3: Advanced Features

#### 3.1 Smart URL Construction
- Detect if user has multiple Google accounts
- Handle delegated calendars correctly
- Support for resource calendars

#### 3.2 Settings/Preferences
```typescript
// User preferences
interface EventLinkPreferences {
  openInNewTab: boolean;     // Default: true
  preferDesktopApp: boolean;  // Default: false (use web)
  showLinkIcon: boolean;      // Default: true
}
```

#### 3.3 Analytics Tracking
- Track clicks on provider links
- Monitor which provider links are used more
- Identify any errors/failures in link generation

### Phase 4: Edge Cases & Error Handling

#### 4.1 Handle Missing Event IDs
- Some imported/synced events might not have proper IDs
- Provide fallback to calendar view for the event date/time

#### 4.2 Permission Issues
- Handle cases where user lacks permission to view event in provider
- Graceful fallback with appropriate messaging

#### 4.3 Provider-Specific Limitations
- Google Workspace vs personal accounts may have different URL formats
- Office 365 vs Outlook.com might require different approaches

## Testing Plan

### Unit Tests
1. URL generation for various event types
2. Provider detection logic
3. Edge case handling (missing IDs, special characters)

### Integration Tests
1. Test with real Google Calendar events
2. Test with real Outlook events
3. Test with delegated/shared calendars
4. Test with recurring events

### Manual Testing
1. Verify links open correctly in different browsers
2. Test with multiple Google accounts logged in
3. Test with both Outlook web and desktop apps
4. Verify mobile behavior (responsive design)

## Security Considerations

1. **Sanitization**: Ensure event IDs are properly sanitized before URL construction
2. **CORS**: No CORS issues as we're using direct navigation, not API calls
3. **Privacy**: Don't expose sensitive calendar IDs in URLs unnecessarily
4. **Validation**: Validate provider URLs before rendering to prevent XSS

## Performance Considerations

1. **Lazy Generation**: Generate URLs only when needed (on click or hover)
2. **Caching**: Cache generated URLs in event objects
3. **Batch Processing**: If generating many URLs, batch the operations

## Migration Strategy

1. **Backward Compatibility**: Support events without provider URLs
2. **Progressive Enhancement**: Add URLs to new events first, backfill existing
3. **Feature Flag**: Use feature flag to roll out gradually

## Success Metrics

1. **Usage Rate**: % of users clicking provider links
2. **Error Rate**: Failed link generations or broken links
3. **Performance**: Time to generate and open links
4. **User Feedback**: Survey on usefulness of feature

## Timeline Estimate

- **Phase 1**: 2-3 days (Backend implementation)
- **Phase 2**: 2-3 days (UI implementation)
- **Phase 3**: 2 days (Advanced features)
- **Phase 4**: 1 day (Error handling)
- **Testing**: 2 days
- **Total**: ~10-12 days

## Next Steps

1. Review and approve this plan
2. Create detailed technical specifications
3. Set up feature flag
4. Begin Phase 1 implementation
5. Conduct user testing with small group
6. Iterate based on feedback
7. Full rollout