/**
 * Microsoft Outlook/Office 365 Calendar Service
 * Implements calendar operations using Microsoft Graph API
 */

import type {
  CalendarEvent,
  CalendarListEntry,
  FreeBusyResponse
} from '../../../types';
import type { CalendarProviderHelperActions, FetchEventsOptions } from '../CalendarProvider';
import { getAccessToken, OUTLOOK_PROVIDER_ID } from './auth';

// Microsoft Graph API base URL
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

// Type definitions for Microsoft Graph API responses
interface GraphListResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

// Input type for creating/updating events
interface EventInput {
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  conferenceData?: {
    createRequest?: {
      requestId: string;
    };
  };
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  visibility?: string;
  transparency?: string;
  colorId?: string;
}

// Microsoft Graph FreeBusy response interface
interface MicrosoftGraphFreeBusyResponse {
  value: Array<{
    scheduleId: string;
    availabilityView?: string;
    scheduleItems?: Array<{
      status: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
      start: {
        dateTime: string;
        timeZone: string;
      };
      end: {
        dateTime: string;
        timeZone: string;
      };
    }>;
    workingHours?: {
      daysOfWeek: string[];
      startTime: string;
      endTime: string;
      timeZone: {
        name: string;
      };
    };
  }>;
}

// Microsoft Graph Calendar interface
interface MicrosoftGraphCalendar {
  id: string;
  name: string;
  description?: string;
  canEdit: boolean;
  canShare: boolean;
  canViewPrivateItems: boolean;
  owner?: {
    name?: string;
    address?: string;
  };
  isDefaultCalendar?: boolean;
  color?: string;
}

// Microsoft Graph Event interface (partial)
interface MicrosoftGraphEvent {
  id?: string;
  subject?: string;
  body?: {
    contentType?: 'text' | 'html';
    content?: string;
  };
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
  };
  location?: {
    displayName?: string;
  };
  attendees?: Array<{
    emailAddress?: {
      address?: string;
      name?: string;
    };
    type?: 'required' | 'optional' | 'resource';
    status?: {
      response?: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    };
  }>;
  organizer?: {
    emailAddress?: {
      address?: string;
      name?: string;
    };
  };
  isAllDay?: boolean;
  isCancelled?: boolean;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
  onlineMeeting?: {
    joinUrl?: string;
  };
  categories?: string[];
  webLink?: string;
}

/**
 * Make authenticated API request to Microsoft Graph
 */
async function makeGraphApiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not authenticated with Outlook');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error(`[Outlook Calendar] API Error ${response.status}:`, error);
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  // Handle empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Map Microsoft Graph response status to CalendarEvent response status
 */
function mapResponseStatus(status?: string): 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined {
  switch (status) {
    case 'accepted':
      return 'accepted';
    case 'tentativelyAccepted':
      return 'tentative';
    case 'declined':
      return 'declined';
    case 'notResponded':
    case 'none':
      return 'needsAction';
    default:
      return undefined;
  }
}

/**
 * Normalize Microsoft Graph event to CalendarEvent format
 */
function normalizeEvent(event: MicrosoftGraphEvent, calendarId = 'primary'): CalendarEvent {
  const meetingUrl = event.onlineMeeting?.joinUrl || event.webLink || undefined;
  const isAllDay = event.isAllDay || false;

  // Generate Outlook provider URL - using webLink directly if available
  const providerUrl = event.webLink || (event.id ? generateOutlookCalendarUrl(event.id) : undefined);

  const normalizedEvent: CalendarEvent = {
    providerId: OUTLOOK_PROVIDER_ID,
    calendarId,
    id: event.id || '',
    summary: event.subject || '',
    description: event.body?.content || undefined,
    location: event.location?.displayName || undefined,
    start: isAllDay
      ? { date: event.start?.dateTime?.split('T')[0] }
      : {
          dateTime: event.start?.dateTime,
          timeZone: event.start?.timeZone
        },
    end: isAllDay
      ? { date: event.end?.dateTime?.split('T')[0] }
      : {
          dateTime: event.end?.dateTime,
          timeZone: event.end?.timeZone
        },
    attendees: event.attendees?.map(a => ({
      email: a.emailAddress?.address || '',
      displayName: a.emailAddress?.name,
      responseStatus: mapResponseStatus(a.status?.response),
      optional: a.type === 'optional',
      resource: a.type === 'resource'
    })),
    organizer: event.organizer ? {
      email: event.organizer.emailAddress?.address || '',
      displayName: event.organizer.emailAddress?.name,
      self: false
    } : undefined,
    status: event.isCancelled ? 'cancelled' : 'confirmed',
    transparency: event.showAs === 'free' ? 'transparent' : 'opaque',
    reminders: event.isReminderOn ? {
      useDefault: false,
      overrides: [{
        method: 'popup',
        minutes: event.reminderMinutesBeforeStart || 10
      }]
    } : undefined,
    meetingUrl,
    htmlLink: event.webLink,  // Direct link from API
    providerUrl,  // Constructed link to open in provider
    providerType: 'outlook',  // Provider type
    conferenceData: event.onlineMeeting ? {
      entryPoints: [{
        entryPointType: 'video',
        uri: event.onlineMeeting.joinUrl || '',
        label: 'Join Teams Meeting'
      }],
      conferenceSolution: {
        name: 'Microsoft Teams',
        key: {
          type: 'teamsForBusiness'
        }
      }
    } : undefined,
    raw: event
  };

  return normalizedEvent;
}

// Helper function to generate Outlook Calendar URL
function generateOutlookCalendarUrl(eventId: string): string {
  // Outlook Web App deep link
  return `https://outlook.office365.com/calendar/item/${encodeURIComponent(eventId)}`;
}

/**
 * Fetch events from calendar
 */
export async function fetchEvents(options: FetchEventsOptions): Promise<CalendarEvent[]> {
  const { timeMin, timeMax, calendarId = 'primary', maxResults = 250 } = options;
  const events: CalendarEvent[] = [];
  let nextLink: string | null = null;

  // Build initial URL using calendarView for date filtering
  const baseUrl = calendarId === 'primary'
    ? `${GRAPH_API_BASE}/me/calendarView`
    : `${GRAPH_API_BASE}/me/calendars/${calendarId}/calendarView`;

  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    $top: Math.min(maxResults, 999).toString(),
    $orderby: 'start/dateTime'
  });

  let url: string | null = `${baseUrl}?${params.toString()}`;

  // Fetch pages until we have enough events or no more pages
  while (url && events.length < maxResults) {
    const data = await makeGraphApiRequest<GraphListResponse<MicrosoftGraphEvent>>(url);

    if (data.value && Array.isArray(data.value)) {
      for (const event of data.value) {
        if (events.length >= maxResults) break;
        events.push(normalizeEvent(event, calendarId));
      }
    }

    // Check for next page
    nextLink = data['@odata.nextLink'] || null;
    url = nextLink;
  }

  console.log(`[Outlook Calendar] Fetched ${events.length} events`);
  return events;
}

/**
 * Create a new calendar event
 */
export async function createEvent(eventData: unknown, calendarId?: string): Promise<CalendarEvent> {
  const url = calendarId === 'primary' || !calendarId
    ? `${GRAPH_API_BASE}/me/events`
    : `${GRAPH_API_BASE}/me/calendars/${calendarId}/events`;

  // Convert eventData to Microsoft Graph format
  const graphEvent: Partial<MicrosoftGraphEvent> = {};
  const input = eventData as EventInput;

  if (input.summary) graphEvent.subject = input.summary;
  if (input.description) graphEvent.body = { contentType: 'text', content: input.description };
  if (input.location) graphEvent.location = { displayName: input.location };

  // Handle dates
  if (input.start) {
    if (input.start.date) {
      graphEvent.isAllDay = true;
      graphEvent.start = {
        dateTime: `${input.start.date}T00:00:00`,
        timeZone: input.start.timeZone || 'UTC'
      };
    } else if (input.start.dateTime) {
      graphEvent.start = {
        dateTime: input.start.dateTime,
        timeZone: input.start.timeZone || 'UTC'
      };
    }
  }

  if (input.end) {
    if (input.end.date) {
      graphEvent.end = {
        dateTime: `${input.end.date}T00:00:00`,
        timeZone: input.end.timeZone || 'UTC'
      };
    } else if (input.end.dateTime) {
      graphEvent.end = {
        dateTime: input.end.dateTime,
        timeZone: input.end.timeZone || 'UTC'
      };
    }
  }

  const createdEvent = await makeGraphApiRequest<MicrosoftGraphEvent>(url, {
    method: 'POST',
    body: JSON.stringify(graphEvent)
  });

  console.log('[Outlook Calendar] Event created:', createdEvent.id);
  return normalizeEvent(createdEvent, calendarId);
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(eventId: string, eventData: unknown, calendarId?: string): Promise<CalendarEvent> {
  const url = `${GRAPH_API_BASE}/me/events/${eventId}`;

  // Convert updates to Microsoft Graph format
  const graphUpdates: Partial<MicrosoftGraphEvent> = {};
  const updates = eventData as EventInput;

  if (updates.summary !== undefined) graphUpdates.subject = updates.summary;
  if (updates.description !== undefined) {
    graphUpdates.body = { contentType: 'text', content: updates.description };
  }
  if (updates.location !== undefined) {
    graphUpdates.location = { displayName: updates.location };
  }

  // Handle dates
  if (updates.start) {
    if (updates.start.date) {
      graphUpdates.isAllDay = true;
      graphUpdates.start = {
        dateTime: `${updates.start.date}T00:00:00`,
        timeZone: updates.start.timeZone || 'UTC'
      };
    } else if (updates.start.dateTime) {
      graphUpdates.start = {
        dateTime: updates.start.dateTime,
        timeZone: updates.start.timeZone || 'UTC'
      };
    }
  }

  if (updates.end) {
    if (updates.end.date) {
      graphUpdates.end = {
        dateTime: `${updates.end.date}T00:00:00`,
        timeZone: updates.end.timeZone || 'UTC'
      };
    } else if (updates.end.dateTime) {
      graphUpdates.end = {
        dateTime: updates.end.dateTime,
        timeZone: updates.end.timeZone || 'UTC'
      };
    }
  }

  const updatedEvent = await makeGraphApiRequest<MicrosoftGraphEvent>(url, {
    method: 'PATCH',
    body: JSON.stringify(graphUpdates)
  });

  console.log('[Outlook Calendar] Event updated:', eventId);
  return normalizeEvent(updatedEvent, calendarId);
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(eventId: string, calendarId?: string): Promise<void> {
  const url = calendarId && calendarId !== 'primary'
    ? `${GRAPH_API_BASE}/me/calendars/${calendarId}/events/${eventId}`
    : `${GRAPH_API_BASE}/me/events/${eventId}`;

  await makeGraphApiRequest<void>(url, {
    method: 'DELETE'
  });

  console.log('[Outlook Calendar] Event deleted:', eventId);
}

/**
 * Fetch list of user's calendars
 */
export async function fetchCalendarList(): Promise<CalendarListEntry[]> {
  const url = `${GRAPH_API_BASE}/me/calendars`;

  const data = await makeGraphApiRequest<GraphListResponse<MicrosoftGraphCalendar>>(url);

  const calendars: CalendarListEntry[] = [];

  if (data.value && Array.isArray(data.value)) {
    for (const cal of data.value) {
      calendars.push({
        providerId: OUTLOOK_PROVIDER_ID,
        id: cal.id,
        name: cal.name, // Required property from ProviderCalendar
        summary: cal.name,
        description: cal.description,
        backgroundColor: cal.color?.toLowerCase(),
        foregroundColor: '#ffffff',
        accessRole: cal.canEdit ? 'writer' : 'reader',
        primary: cal.isDefaultCalendar || false,
        selected: true
      });
    }
  }

  // Add primary calendar if not in list
  if (!calendars.find(c => c.primary)) {
    calendars.unshift({
      providerId: OUTLOOK_PROVIDER_ID,
      id: 'primary',
      name: 'Calendar', // Required property from ProviderCalendar
      summary: 'Calendar',
      description: 'Primary calendar',
      accessRole: 'owner',
      primary: true,
      selected: true
    });
  }

  console.log(`[Outlook Calendar] Found ${calendars.length} calendars`);
  return calendars;
}

/**
 * Find free/busy information
 */
export async function findFreeBusy(
  timeMin: string,
  timeMax: string,
  calendarIds: string | string[]
): Promise<FreeBusyResponse> {
  // Microsoft Graph uses the getSchedule API for free/busy
  const url = `${GRAPH_API_BASE}/me/calendar/getSchedule`;

  const ids = Array.isArray(calendarIds) ? calendarIds : [calendarIds];

  const requestBody = {
    schedules: ids.map(id => id === 'primary' ? 'me' : id),
    startTime: {
      dateTime: timeMin,
      timeZone: 'UTC'
    },
    endTime: {
      dateTime: timeMax,
      timeZone: 'UTC'
    },
    availabilityViewInterval: 30 // 30-minute intervals
  };

  const data = await makeGraphApiRequest<MicrosoftGraphFreeBusyResponse>(url, {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  // Convert to our FreeBusyResponse format
  const response: FreeBusyResponse = {
    kind: 'calendar#freeBusy',
    timeMin,
    timeMax,
    calendars: {}
  };

  if (data.value && Array.isArray(data.value)) {
    for (const schedule of data.value) {
      const calendarId = schedule.scheduleId === 'me' ? 'primary' : schedule.scheduleId;
      response.calendars[calendarId] = {
        busy: []
      };

      if (schedule.scheduleItems && Array.isArray(schedule.scheduleItems)) {
        for (const item of schedule.scheduleItems) {
          if (item.status !== 'free') {
            response.calendars[calendarId].busy.push({
              start: item.start.dateTime,
              end: item.end.dateTime
            });
          }
        }
      }
    }
  }

  return response;
}

/**
 * Add Microsoft Teams conference link to an event
 */
export async function addConferenceLink(
  eventId: string,
  event: CalendarEvent,
  calendarId?: string
): Promise<CalendarEvent> {
  // For Outlook, we need to update the event to be an online meeting
  const url = `${GRAPH_API_BASE}/me/events/${eventId}`;

  const updates = {
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness'
  };

  const updatedEvent = await makeGraphApiRequest<MicrosoftGraphEvent>(url, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });

  console.log('[Outlook Calendar] Teams meeting added to event:', eventId);
  return normalizeEvent(updatedEvent, calendarId);
}

// Helper action implementations
const createBufferEvent = async (
  startTime: Date,
  durationMinutes = 15
): Promise<CalendarEvent> => {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  return createEvent({
    summary: '📍 Buffer',
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    transparency: 'opaque',
    reminders: { useDefault: false }
  });
};

const createFocusBlock = async (
  startTime: Date,
  durationMinutes = 60,
  title = '🎯 Focus Time'
): Promise<CalendarEvent> => {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  return createEvent({
    summary: title,
    description: 'Protected time for deep work',
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    transparency: 'opaque',
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 5 }]
    }
  });
};

const createTravelBlock = async (
  startTime: Date,
  durationMinutes = 30,
  title = '🚗 Travel Time'
): Promise<CalendarEvent> => {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  return createEvent({
    summary: title,
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    transparency: 'opaque',
    reminders: { useDefault: false }
  });
};

const createLocationEvent = async (
  startDate: Date,
  endDate: Date,
  city: string,
  country: string,
  timezone: string,
  flag: string
): Promise<CalendarEvent> => {
  return createEvent({
    summary: `${flag} Location: ${city}, ${country}`,
    start: { date: startDate.toISOString().split('T')[0] },
    end: { date: endDate.toISOString().split('T')[0] },
    transparency: 'transparent'
  });
};

const moveEvent = async (
  eventId: string,
  event: CalendarEvent,
  newStartTime: Date
): Promise<CalendarEvent> => {
  const duration = event.end?.dateTime && event.start?.dateTime
    ? new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()
    : 60 * 60 * 1000; // Default 1 hour

  const newEndTime = new Date(newStartTime.getTime() + duration);

  return updateEvent(eventId, {
    start: { dateTime: newStartTime.toISOString() },
    end: { dateTime: newEndTime.toISOString() }
  });
};

// Export helper actions
export const outlookHelperActions: CalendarProviderHelperActions = {
  createBufferEvent,
  createFocusBlock,
  createTravelBlock,
  createLocationEvent,
  moveEvent,

  addBufferBefore: async (event: CalendarEvent, bufferMinutes = 15) => {
    if (!event.start?.dateTime) throw new Error('Event must have a start time');
    const bufferStart = new Date(event.start.dateTime);
    bufferStart.setMinutes(bufferStart.getMinutes() - bufferMinutes);
    return createBufferEvent(bufferStart, bufferMinutes);
  },

  addBufferAfter: async (event: CalendarEvent, bufferMinutes = 15) => {
    if (!event.end?.dateTime) throw new Error('Event must have an end time');
    const bufferStart = new Date(event.end.dateTime);
    return createBufferEvent(bufferStart, bufferMinutes);
  },

  batchAddBuffers: async (
    events: CalendarEvent[],
    position = 'before' as 'before' | 'after',
    bufferMinutes = 15
  ) => {
    const results = [];
    for (const event of events) {
      try {
        if (position === 'before' && outlookHelperActions.addBufferBefore) {
          const buffer = await outlookHelperActions.addBufferBefore(event, bufferMinutes);
          results.push(buffer);
        } else if (outlookHelperActions.addBufferAfter) {
          const buffer = await outlookHelperActions.addBufferAfter(event, bufferMinutes);
          results.push(buffer);
        }
      } catch (error) {
        console.error(`[Outlook Calendar] Failed to add buffer for event ${event.id}:`, error);
      }
    }
    return results;
  },

  deletePlaceholderAndLog: async (event: CalendarEvent) => {
    if (event.id) {
      await deleteEvent(event.id, event.calendarId);
      console.log(`[Outlook Calendar] Deleted placeholder: ${event.summary}`);
    }
  },

  getOptimalTimeTomorrow: (events: CalendarEvent[], durationMinutes = 60) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(17, 0, 0, 0);

    // Find the largest gap
    let bestStart = tomorrow;
    let maxGap = 0;

    const sortedEvents = [...events].sort((a, b) => {
      const aTime = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const bTime = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return aTime - bTime;
    });

    let currentTime = new Date(tomorrow);
    for (const event of sortedEvents) {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || 0);
      const gap = eventStart.getTime() - currentTime.getTime();

      if (gap > maxGap && gap >= durationMinutes * 60000) {
        maxGap = gap;
        bestStart = currentTime;
      }

      currentTime = new Date(event.end?.dateTime || event.end?.date || eventStart);
    }

    // Check gap until end of day
    const finalGap = endOfDay.getTime() - currentTime.getTime();
    if (finalGap > maxGap && finalGap >= durationMinutes * 60000) {
      bestStart = currentTime;
    }

    return bestStart;
  },

  batchAddConferenceLinks: async (events: CalendarEvent[], calendarId?: string) => {
    const results: {
      successful: CalendarEvent[];
      failed: Array<{ event: CalendarEvent; error: string }>;
      successCount: number;
      failCount: number;
    } = {
      successful: [],
      failed: [],
      successCount: 0,
      failCount: 0
    };

    for (const event of events) {
      if (event.id) {
        try {
          const updated = await addConferenceLink(event.id, event, calendarId);
          results.successful.push(updated);
          results.successCount++;
        } catch (error) {
          results.failed.push({
            event,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          results.failCount++;
        }
      }
    }

    return results;
  },

  findNextAvailableSlot: (
    events: CalendarEvent[],
    durationMinutes: number,
    searchStartTime: Date
  ) => {
    const searchEndTime = new Date(searchStartTime);
    searchEndTime.setDate(searchEndTime.getDate() + 7); // Search up to 7 days ahead

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => {
      const aTime = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const bTime = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return aTime - bTime;
    });

    let currentTime = new Date(searchStartTime);
    const durationMs = durationMinutes * 60000;

    for (const event of sortedEvents) {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || 0);
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || eventStart);

      // Skip events that are before our search start time
      if (eventEnd <= currentTime) continue;

      const gap = eventStart.getTime() - currentTime.getTime();

      if (gap >= durationMs) {
        // Found a suitable slot
        return currentTime;
      }

      currentTime = new Date(Math.max(currentTime.getTime(), eventEnd.getTime()));
    }

    // Check if there's time after all events
    if (searchEndTime.getTime() - currentTime.getTime() >= durationMs) {
      return currentTime;
    }

    return null;
  }
};

// Export calendar API
export const outlookCalendarApi = {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchCalendarList,
  findFreeBusy,
  addConferenceLink
};