# Event Provider Links - Technical Specification

## Quick Implementation Guide

### Step 1: Update CalendarEvent Type

```typescript
// src/types/calendar.ts
export interface CalendarEvent {
  id: string;
  calendarId: string;
  summary?: string;
  description?: string;
  // ... other existing fields

  // NEW FIELDS
  htmlLink?: string;        // Direct web link from API (if available)
  providerUrl?: string;     // Constructed link to open in provider
  providerType?: 'google' | 'outlook';  // Which provider owns this event
}
```

### Step 2: Update Google Calendar Service

```typescript
// src/services/providers/google/calendar.ts

function normalizeEvent(googleEvent: any, calendarId?: string): CalendarEvent {
  return {
    id: googleEvent.id,
    calendarId: calendarId || 'primary',
    summary: googleEvent.summary,
    description: googleEvent.description,
    // ... other fields

    // NEW: Add provider URL
    htmlLink: googleEvent.htmlLink,  // Google provides this directly
    providerUrl: googleEvent.htmlLink || generateGoogleCalendarUrl(googleEvent.id, calendarId),
    providerType: 'google',
  };
}

function generateGoogleCalendarUrl(eventId: string, calendarId?: string): string {
  // Simple direct link format that works for most cases
  return `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(eventId)}`;
}
```

### Step 3: Update Outlook Calendar Service

```typescript
// src/services/providers/outlook/calendar.ts

function normalizeEvent(outlookEvent: any, calendarId?: string): CalendarEvent {
  return {
    id: outlookEvent.id,
    calendarId: calendarId || 'primary',
    summary: outlookEvent.subject,
    description: outlookEvent.body?.content,
    // ... other fields

    // NEW: Add provider URL
    htmlLink: outlookEvent.webLink,  // Outlook provides this
    providerUrl: outlookEvent.webLink || generateOutlookCalendarUrl(outlookEvent.id),
    providerType: 'outlook',
  };
}

function generateOutlookCalendarUrl(eventId: string): string {
  // Outlook Web App deep link
  return `https://outlook.office365.com/calendar/item/${encodeURIComponent(eventId)}`;
}
```

### Step 4: Create Event Link Component

```typescript
// src/components/EventProviderLink.tsx

import React from 'react';
import { ExternalLink } from 'lucide-react';  // or your preferred icon library

interface EventProviderLinkProps {
  event: CalendarEvent;
  className?: string;
  showText?: boolean;
}

export const EventProviderLink: React.FC<EventProviderLinkProps> = ({
  event,
  className = '',
  showText = false
}) => {
  if (!event.providerUrl) {
    return null;
  }

  const providerName = event.providerType === 'google' ? 'Google Calendar' : 'Outlook';
  const providerColor = event.providerType === 'google' ? 'text-blue-600' : 'text-indigo-600';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();  // Prevent event card click
    window.open(event.providerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 ${providerColor} hover:underline ${className}`}
      title={`Open in ${providerName}`}
      aria-label={`Open event in ${providerName}`}
    >
      <ExternalLink className="w-4 h-4" />
      {showText && <span className="text-sm">View in {providerName}</span>}
    </button>
  );
};
```

### Step 5: Update EventCard Component

```typescript
// src/components/EventCard.tsx

import { EventProviderLink } from './EventProviderLink';

const EventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  return (
    <div className="event-card relative group">
      {/* Existing event content */}
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-900">{event.summary || 'No title'}</h3>

        {/* NEW: Add provider link icon */}
        <EventProviderLink
          event={event}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Rest of event details */}
    </div>
  );
};
```

### Step 6: Update EventsTimeline Component

```typescript
// src/components/EventsTimeline.tsx

// Add provider link to timeline events
const EventTimelineItem = ({ event }) => {
  return (
    <div className="timeline-item">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4>{event.summary}</h4>
          <p className="text-sm text-gray-600">{event.time}</p>
        </div>

        {/* NEW: Add subtle link icon */}
        <EventProviderLink event={event} />
      </div>
    </div>
  );
};
```

## API Response Examples

### Google Calendar Event Response
```json
{
  "id": "abc123xyz",
  "summary": "Team Meeting",
  "htmlLink": "https://www.google.com/calendar/event?eid=abc123xyz",
  "start": { "dateTime": "2024-01-15T10:00:00Z" },
  "end": { "dateTime": "2024-01-15T11:00:00Z" }
}
```

### Outlook Calendar Event Response
```json
{
  "id": "AAMkAGI2TG93AAA=",
  "subject": "Team Meeting",
  "webLink": "https://outlook.office365.com/owa/?itemid=AAMkAGI2TG93AAA%3D&exvsurl=1&path=/calendar/item",
  "start": { "dateTime": "2024-01-15T10:00:00.0000000" },
  "end": { "dateTime": "2024-01-15T11:00:00.0000000" }
}
```

## CSS Styling Suggestions

```css
/* src/styles/event-links.css */

.event-provider-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
  background: transparent;
  border: none;
}

.event-provider-link:hover {
  background-color: rgba(59, 130, 246, 0.1); /* blue-500/10 */
}

.event-provider-link.google {
  color: #4285F4;  /* Google Blue */
}

.event-provider-link.outlook {
  color: #0078D4;  /* Microsoft Blue */
}

/* Subtle appearance in event cards */
.event-card .event-provider-link {
  opacity: 0.7;
}

.event-card:hover .event-provider-link {
  opacity: 1;
}

/* Tooltip styling */
.event-provider-link[title] {
  position: relative;
}

.event-provider-link[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 12px;
  white-space: nowrap;
  border-radius: 4px;
  margin-bottom: 4px;
  z-index: 1000;
}
```

## Implementation Priority

### Minimum Viable Product (MVP) - Phase 1
1. ✅ Add `providerUrl` to CalendarEvent type
2. ✅ Update Google normalizeEvent to include htmlLink
3. ✅ Update Outlook normalizeEvent to include webLink
4. ✅ Create basic EventProviderLink component
5. ✅ Add link to EventCard

### Nice-to-Have - Phase 2
1. ⏳ Add to EventsTimeline
2. ⏳ Add to event details modal
3. ⏳ Add user preference for new tab vs same tab
4. ⏳ Add analytics tracking
5. ⏳ Add keyboard shortcuts (Cmd+Click)

### Advanced - Phase 3
1. ⏳ Support for desktop app deep links
2. ⏳ Handle multiple Google accounts
3. ⏳ Support for recurring event instances
4. ⏳ Batch URL generation for performance

## Testing Checklist

### Unit Tests
- [ ] Test Google URL generation with various event IDs
- [ ] Test Outlook URL generation with various event IDs
- [ ] Test EventProviderLink component rendering
- [ ] Test click handling and preventDefault

### Integration Tests
- [ ] Test with actual Google Calendar events
- [ ] Test with actual Outlook events
- [ ] Test with missing providerUrl fallback
- [ ] Test with different calendar IDs

### Manual Testing
- [ ] Links open in new tab
- [ ] Links work when multiple accounts are logged in
- [ ] Visual appearance matches design
- [ ] Hover states work correctly
- [ ] Mobile touch targets are adequate

## Common Issues & Solutions

### Issue 1: Google Calendar Links Not Working
**Problem**: Links fail when user has multiple Google accounts
**Solution**: Use the simpler `eid` parameter format which auto-detects the right account

### Issue 2: Outlook Deep Links Fail
**Problem**: Desktop Outlook not installed
**Solution**: Default to web links, add fallback handling

### Issue 3: Event IDs with Special Characters
**Problem**: URLs break with certain characters
**Solution**: Always use `encodeURIComponent()` on event IDs

## Next Steps for Implementation

1. Start with MVP implementation (Phase 1)
2. Test with small group of users
3. Gather feedback on UX
4. Implement Phase 2 based on feedback
5. Consider Phase 3 for power users