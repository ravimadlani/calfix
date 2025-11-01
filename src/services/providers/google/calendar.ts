import type {
  CalendarEvent,
  CalendarListEntry,
  FreeBusyResponse
} from '../../../types';
import type { CalendarProviderHelperActions, FetchEventsOptions } from '../CalendarProvider';
import { googleAuth, GOOGLE_PROVIDER_ID } from './auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const PRIMARY_CALENDAR = 'primary';

type GoogleRawCalendarEvent = Partial<CalendarEvent> & {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  [key: string]: unknown;
};

type GoogleRawCalendarListEntry = Partial<CalendarListEntry> & {
  id: string;
  summary?: string;
};

const buildAuthHeaders = async () => {
  const token = await googleAuth.getValidAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  } as const;
};

const makeApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const headers = await buildAuthHeaders();
    const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      await handleGoogleApiError(response);
      return makeApiRequest(endpoint, options);
    }

    if (response.status === 204 || options.method === 'DELETE') {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error('[Google Calendar] API request failed', error);
    throw error;
  }
};

const normalizeEvent = (event: GoogleRawCalendarEvent, calendarId = PRIMARY_CALENDAR): CalendarEvent => {
  const meetingUrl = event.hangoutLink || event.htmlLink || undefined;

  return {
    ...event,
    providerId: GOOGLE_PROVIDER_ID,
    calendarId,
    meetingUrl,
    raw: event
  } as CalendarEvent;
};

const normalizeEventArray = (events: GoogleRawCalendarEvent[] = [], calendarId = PRIMARY_CALENDAR): CalendarEvent[] => {
  return (events || []).map(event => normalizeEvent(event, calendarId));
};

const normalizeCalendarListEntry = (entry: GoogleRawCalendarListEntry): CalendarListEntry => {
  return {
    providerId: GOOGLE_PROVIDER_ID,
    id: entry.id,
    name: entry.summary || entry.id,
    summary: entry.summary,
    description: entry.description,
    location: entry.location,
    timeZone: entry.timeZone,
    summaryOverride: entry.summaryOverride,
    colorId: entry.colorId,
    backgroundColor: entry.backgroundColor,
    foregroundColor: entry.foregroundColor,
    hidden: entry.hidden,
    selected: entry.selected,
    accessRole: entry.accessRole,
    defaultReminders: entry.defaultReminders,
    primary: entry.primary,
    isPrimary: entry.primary,
    colorHex: entry.backgroundColor,
    secondaryColorHex: entry.foregroundColor,
    raw: entry
  } as CalendarListEntry;
};

export const handleGoogleApiError = async (response: Response): Promise<void> => {
  if (response.status === 401) {
    try {
      await googleAuth.refreshAccessToken();
      return;
    } catch {
      throw new Error('Authentication failed. Please sign in again.');
    }
  } else if (response.status === 403) {
    throw new Error('Permission denied. Please check calendar access permissions.');
  } else if (response.status === 429) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  } else if (response.status >= 500) {
    throw new Error('Google Calendar service error. Please try again later.');
  } else {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.error_description || 'An error occurred');
  }
};

export const fetchEvents = async ({
  timeMin,
  timeMax,
  calendarId = PRIMARY_CALENDAR,
  maxResults = 2500
}: FetchEventsOptions): Promise<CalendarEvent[]> => {
  try {
    let allEvents: CalendarEvent[] = [];
    let pageToken: string | null = null;
    const pageSize = Math.min(maxResults, 250);

    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: pageSize.toString()
      });

      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      const data = await makeApiRequest(
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
      );

      const items = data?.items || [];
      allEvents = allEvents.concat(normalizeEventArray(items, calendarId));

      pageToken = data?.nextPageToken || null;

      if (allEvents.length >= maxResults || !pageToken) {
        break;
      }
    } while (pageToken);

    return allEvents.slice(0, maxResults);
  } catch (error) {
    console.error(`[Google Calendar] Failed to fetch events for ${calendarId}`, error);
    if (error instanceof Error && (error.message.includes('Permission denied') || error.message.includes('Not Found'))) {
      console.warn(`[Google Calendar] No access to calendar ${calendarId}, returning empty list`);
      return [];
    }
    throw error;
  }
};

export const createEvent = async (eventData: unknown, calendarId = PRIMARY_CALENDAR): Promise<CalendarEvent> => {
  try {
    const event = await makeApiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(eventData)
      }
    );

    return normalizeEvent(event, calendarId);
  } catch (error) {
    console.error('[Google Calendar] Error creating event', error);
    throw error instanceof Error ? error : new Error('Failed to create event');
  }
};

export const updateEvent = async (eventId: string, eventData: unknown, calendarId = PRIMARY_CALENDAR): Promise<CalendarEvent> => {
  try {
    const event = await makeApiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(eventData)
      }
    );

    return normalizeEvent(event, calendarId);
  } catch (error) {
    console.error('[Google Calendar] Error updating event', error);
    throw error instanceof Error ? error : new Error('Failed to update event');
  }
};

export const deleteEvent = async (eventId: string, calendarId = PRIMARY_CALENDAR) => {
  try {
    await makeApiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE'
      }
    );
  } catch (error) {
    console.error('[Google Calendar] Error deleting event', error);
    throw error instanceof Error ? error : new Error('Failed to delete event');
  }
};

export const fetchCalendarList = async (): Promise<CalendarListEntry[]> => {
  try {
    const data = await makeApiRequest('/users/me/calendarList');
    const items = data?.items || [];
    return items.map(normalizeCalendarListEntry);
  } catch (error) {
    console.error('[Google Calendar] Error fetching calendar list', error);
    throw error instanceof Error ? error : new Error('Failed to fetch calendar list');
  }
};

export const findFreeBusy = async (
  timeMin: string,
  timeMax: string,
  calendarIds: string | string[] = [PRIMARY_CALENDAR]
): Promise<FreeBusyResponse> => {
  try {
    const items = Array.isArray(calendarIds)
      ? calendarIds.map(id => ({ id: id.trim() }))
      : [{ id: (calendarIds as string).trim() }];

    const requestBody = {
      timeMin,
      timeMax,
      timeZone: 'UTC',
      items
    };

    await ensureGapiClient();

    const response = await window.gapi.client.calendar.freebusy.query(requestBody);
    return response.result as FreeBusyResponse;
  } catch (error) {
    console.error('[Google Calendar] Error finding free/busy times', error);
    throw error instanceof Error ? error : new Error('Failed to find free/busy times');
  }
};

const ensureGapiClient = async () => {
  if (!window.gapi) {
    throw new Error('GAPI library not loaded');
  }

  if (window.gapi.client?.calendar) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        const accessToken = await googleAuth.getValidAccessToken();
        window.gapi.client.setToken({ access_token: accessToken });
        await window.gapi.client.load('calendar', 'v3');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const addConferenceLink = async (eventId: string, event: CalendarEvent, calendarId = PRIMARY_CALENDAR): Promise<CalendarEvent> => {
  try {
    const updatedEventData = {
      ...event,
      conferenceData: {
        createRequest: {
          requestId: `meet-${eventId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const updatedEvent = await makeApiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?conferenceDataVersion=1`,
      {
        method: 'PUT',
        body: JSON.stringify(updatedEventData)
      }
    );

    return normalizeEvent(updatedEvent, calendarId);
  } catch (error) {
    console.error('[Google Calendar] Error adding Meet link', error);
    throw error instanceof Error ? error : new Error('Failed to add Google Meet link');
  }
};

export function findNextAvailableSlot(
  events: CalendarEvent[],
  durationMinutes: number,
  searchStartTime: Date
): Date | null {
  if (!events || events.length === 0) {
    return searchStartTime;
  }

  const sortedEvents = [...events].sort((a, b) => {
    const aTime = new Date(a.start.dateTime || a.start.date).getTime();
    const bTime = new Date(b.start.dateTime || b.start.date).getTime();
    return aTime - bTime;
  });

  let searchTime = new Date(searchStartTime);

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    const gapMs = eventStart.getTime() - searchTime.getTime();
    const gapMinutes = gapMs / (1000 * 60);

    if (gapMinutes >= durationMinutes) {
      return searchTime;
    }

    searchTime = new Date(eventEnd);
  }

  return searchTime;
}

export const googleHelperActions: CalendarProviderHelperActions = {
  createBufferEvent: async (startTime, durationMinutes = 15) => {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    const eventData = {
      summary: '🔵 Buffer Time',
      description: 'Automatically added buffer time for transitions',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: '7',
      transparency: 'transparent'
    };

    return createEvent(eventData);
  },
  createFocusBlock: async (startTime, durationMinutes = 120, title = '🎯 Focus Time') => {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    const eventData = {
      summary: title,
      description: 'Dedicated time for deep work and focused tasks',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: '10',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    return createEvent(eventData);
  },
  createTravelBlock: async (startTime, durationMinutes = 90, title = '🚗 Travel to Airport') => {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    const eventData = {
      summary: title,
      description: 'Travel time to/from airport',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: '9',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    return createEvent(eventData);
  },
  createLocationEvent: async (startDate, endDate, city, country, timezone, flag) => {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysText = days === 1 ? '1 day' : `${days} days`;

    const eventData = {
      summary: `${flag} Location: ${city}, ${country}`,
      description: `You are in ${city}, ${country} for ${daysText}.\nTimezone: ${timezone}\n\nThis helps track your location and timezone for scheduling.`,
      start: {
        date: startDateStr
      },
      end: {
        date: endDateStr
      },
      colorId: '7',
      reminders: {
        useDefault: false
      }
    };

    return createEvent(eventData);
  },
  moveEvent: async (eventId, event, newStartTime) => {
    const originalStart = new Date(event.start.dateTime || event.start.date);
    const originalEnd = new Date(event.end.dateTime || event.end.date);
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const newEndTime = new Date(newStartTime.getTime() + durationMs);

    const updatedEventData = {
      ...event,
      start: {
        dateTime: newStartTime.toISOString(),
        timeZone: event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: newEndTime.toISOString(),
        timeZone: event.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    return updateEvent(eventId, updatedEventData, event.calendarId);
  },
  addBufferBefore: async (event, bufferMinutes = 15) => {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const bufferStart = new Date(eventStart);
    bufferStart.setMinutes(bufferStart.getMinutes() - bufferMinutes);
    return googleHelperActions.createBufferEvent!(bufferStart, bufferMinutes);
  },
  addBufferAfter: async (event, bufferMinutes = 15) => {
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    return googleHelperActions.createBufferEvent!(eventEnd, bufferMinutes);
  },
  batchAddBuffers: async (events, position = 'after', bufferMinutes = 15) => {
    const promises = events.map(event => {
      if (position === 'before') {
        return googleHelperActions.addBufferBefore!(event, bufferMinutes);
      }
      return googleHelperActions.addBufferAfter!(event, bufferMinutes);
    });

    return Promise.all(promises);
  },
  deletePlaceholderAndLog: async placeholderEvent => {
    const eventDate = placeholderEvent.start?.dateTime || placeholderEvent.start?.date;
    if (!eventDate) {
      return;
    }

    const date = new Date(eventDate);
    const dateKey = date.toISOString().split('T')[0];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingEvents = await fetchEvents({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString()
    });

    const trackingEvent = existingEvents.find(event =>
      event.summary === 'AI-Removed Events' && event.start?.date === dateKey
    );

    const startTime = placeholderEvent.start?.dateTime
      ? new Date(placeholderEvent.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : 'All day';
    const endTime = placeholderEvent.end?.dateTime
      ? new Date(placeholderEvent.end.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '';
    const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
    const eventInfo = `• ${placeholderEvent.summary || 'Untitled'} (${timeRange})`;

    if (trackingEvent) {
      const currentDescription = trackingEvent.description || '';
      const updatedDescription = currentDescription
        ? `${currentDescription}\n${eventInfo}`
        : eventInfo;

      await updateEvent(trackingEvent.id, {
        summary: trackingEvent.summary,
        description: updatedDescription,
        start: trackingEvent.start,
        end: trackingEvent.end,
        colorId: '8',
        transparency: 'transparent'
      }, trackingEvent.calendarId || PRIMARY_CALENDAR);
    } else {
      await createEvent({
        summary: 'AI-Removed Events',
        description: `Placeholders removed by Calendar Dashboard AI:\n\n${eventInfo}`,
        start: { date: dateKey },
        end: { date: dateKey },
        colorId: '8',
        transparency: 'transparent'
      });
    }

    await deleteEvent(placeholderEvent.id, placeholderEvent.calendarId || PRIMARY_CALENDAR);
  },
  getOptimalTimeTomorrow: (events, durationMinutes = 60) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const preferredTime = new Date(tomorrow);
    preferredTime.setHours(10, 0, 0, 0);

    return findNextAvailableSlot(events, durationMinutes, preferredTime);
  },
  batchAddConferenceLinks: async (events, calendarId = PRIMARY_CALENDAR) => {
    const results = {
      successful: [] as CalendarEvent[],
      failed: [] as Array<{ event: CalendarEvent; error: string }>,
      successCount: 0,
      failCount: 0
    };

    for (const event of events) {
      try {
        const updatedEvent = await addConferenceLink(event.id, event, calendarId);
        results.successful.push(updatedEvent);
        results.successCount++;
      } catch (error) {
        results.failed.push({
          event,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failCount++;
      }
    }

    return results;
  },
  findNextAvailableSlot
};
