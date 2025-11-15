/**
 * Microsoft Outlook/Office 365 Calendar Service
 * Implements calendar operations using Microsoft Graph API
 */

import type {
  CalendarEvent,
  CalendarProviderId,
  Calendar,
  CalendarEventInput,
  FreeBusyResponse,
  CalendarApiMethods,
  CalendarHelperMethods
} from '../../../types';
import { getAccessToken, OUTLOOK_PROVIDER_ID } from './auth';

// Microsoft Graph API base URL
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

// Microsoft Graph Event interface (partial, based on what we need)
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
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
  };
  attendees?: Array<{
    emailAddress?: {
      address?: string;
      name?: string;
    };
    type?: 'required' | 'optional' | 'resource';
    status?: {
      response?: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
      time?: string;
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
  importance?: 'low' | 'normal' | 'high';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
  onlineMeeting?: {
    joinUrl?: string;
  };
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness' | 'skypeForConsumer' | 'unknown';
  allowNewTimeProposals?: boolean;
  responseRequested?: boolean;
  categories?: string[];
  webLink?: string;
}

/**
 * Make authenticated API request to Microsoft Graph
 */
async function makeGraphApiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
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
  // Extract meeting URL from various sources
  const meetingUrl = event.onlineMeeting?.joinUrl || event.webLink || undefined;

  // Determine if it's an all-day event
  const isAllDay = event.isAllDay || false;

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
      self: false // Will be determined by comparing with user email
    } : undefined,
    status: event.isCancelled ? 'cancelled' : 'confirmed',
    transparency: event.showAs === 'free' ? 'transparent' : 'opaque',
    visibility: event.sensitivity === 'private' ? 'private' : 'public',
    reminders: event.isReminderOn ? {
      useDefault: false,
      overrides: [{
        method: 'popup',
        minutes: event.reminderMinutesBeforeStart || 10
      }]
    } : undefined,
    meetingUrl,
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
    categories: event.categories,
    raw: event
  };

  return normalizedEvent;
}

/**
 * Convert CalendarEventInput to Microsoft Graph event format
 */
function convertToGraphEvent(event: CalendarEventInput): Partial<MicrosoftGraphEvent> {
  const graphEvent: Partial<MicrosoftGraphEvent> = {
    subject: event.summary,
    body: event.description ? {
      contentType: 'text',
      content: event.description
    } : undefined,
    location: event.location ? {
      displayName: event.location
    } : undefined,
    isAllDay: Boolean(event.start.date),
    showAs: event.transparency === 'transparent' ? 'free' : 'busy',
    sensitivity: event.visibility === 'private' ? 'private' : 'normal',
    responseRequested: true
  };

  // Handle date/time
  if (event.start.date) {
    // All-day event
    graphEvent.start = {
      dateTime: `${event.start.date}T00:00:00`,
      timeZone: event.start.timeZone || 'UTC'
    };
    graphEvent.end = {
      dateTime: `${event.end.date}T00:00:00`,
      timeZone: event.end.timeZone || 'UTC'
    };
  } else {
    // Timed event
    graphEvent.start = {
      dateTime: event.start.dateTime!,
      timeZone: event.start.timeZone || 'UTC'
    };
    graphEvent.end = {
      dateTime: event.end.dateTime!,
      timeZone: event.end.timeZone || 'UTC'
    };
  }

  // Handle attendees
  if (event.attendees && event.attendees.length > 0) {
    graphEvent.attendees = event.attendees.map(a => ({
      emailAddress: {
        address: a.email,
        name: a.displayName
      },
      type: a.optional ? 'optional' as const : 'required' as const
    }));
  }

  // Handle reminders
  if (event.reminders?.overrides && event.reminders.overrides.length > 0) {
    graphEvent.isReminderOn = true;
    graphEvent.reminderMinutesBeforeStart = event.reminders.overrides[0].minutes;
  }

  // Handle categories (colors)
  if (event.colorId) {
    // Map numeric colorId to category names
    const colorMap: Record<string, string> = {
      '1': 'Blue category',
      '2': 'Green category',
      '3': 'Purple category',
      '4': 'Red category',
      '5': 'Yellow category',
      '6': 'Orange category',
      '7': 'Turquoise category',
      '8': 'Gray category',
      '9': 'Navy category',
      '10': 'Olive category',
      '11': 'Pink category'
    };
    graphEvent.categories = [colorMap[event.colorId] || 'Blue category'];
  }

  return graphEvent;
}

/**
 * Fetch events from calendar
 */
export async function fetchEvents(
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date,
  maxResults: number = 250
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  let nextLink: string | null = null;

  // Build initial URL
  const baseUrl = calendarId === 'primary'
    ? `${GRAPH_API_BASE}/me/events`
    : `${GRAPH_API_BASE}/me/calendars/${calendarId}/events`;

  // Use calendarView for date filtering if timeMin and timeMax are provided
  let url = baseUrl;
  const params = new URLSearchParams();

  if (timeMin && timeMax) {
    url = calendarId === 'primary'
      ? `${GRAPH_API_BASE}/me/calendarView`
      : `${GRAPH_API_BASE}/me/calendars/${calendarId}/calendarView`;

    params.append('startDateTime', timeMin.toISOString());
    params.append('endDateTime', timeMax.toISOString());
  }

  // Set page size (max 999 for Graph API)
  params.append('$top', Math.min(maxResults, 999).toString());

  // Order by start time
  params.append('$orderby', 'start/dateTime');

  url = `${url}?${params.toString()}`;

  // Fetch pages until we have enough events or no more pages
  while (url && events.length < maxResults) {
    const data = await makeGraphApiRequest(url);

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
export async function createEvent(
  event: CalendarEventInput,
  calendarId: string = 'primary'
): Promise<CalendarEvent> {
  const url = calendarId === 'primary'
    ? `${GRAPH_API_BASE}/me/events`
    : `${GRAPH_API_BASE}/me/calendars/${calendarId}/events`;

  const graphEvent = convertToGraphEvent(event);

  const createdEvent = await makeGraphApiRequest(url, {
    method: 'POST',
    body: JSON.stringify(graphEvent)
  });

  console.log('[Outlook Calendar] Event created:', createdEvent.id);
  return normalizeEvent(createdEvent, calendarId);
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<CalendarEventInput>,
  calendarId: string = 'primary'
): Promise<CalendarEvent> {
  const url = `${GRAPH_API_BASE}/me/events/${eventId}`;

  // Convert updates to Graph format
  const graphUpdates: Partial<MicrosoftGraphEvent> = {};

  if (updates.summary !== undefined) {
    graphUpdates.subject = updates.summary;
  }

  if (updates.description !== undefined) {
    graphUpdates.body = {
      contentType: 'text',
      content: updates.description
    };
  }

  if (updates.location !== undefined) {
    graphUpdates.location = {
      displayName: updates.location
    };
  }

  if (updates.start) {
    if (updates.start.date) {
      graphUpdates.start = {
        dateTime: `${updates.start.date}T00:00:00`,
        timeZone: updates.start.timeZone || 'UTC'
      };
      graphUpdates.isAllDay = true;
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

  const updatedEvent = await makeGraphApiRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(graphUpdates)
  });

  console.log('[Outlook Calendar] Event updated:', eventId);
  return normalizeEvent(updatedEvent, calendarId);
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const url = `${GRAPH_API_BASE}/me/events/${eventId}`;

  await makeGraphApiRequest(url, {
    method: 'DELETE'
  });

  console.log('[Outlook Calendar] Event deleted:', eventId);
}

/**
 * Fetch list of user's calendars
 */
export async function fetchCalendarList(): Promise<Calendar[]> {
  const url = `${GRAPH_API_BASE}/me/calendars`;

  const data = await makeGraphApiRequest(url);

  const calendars: Calendar[] = [];

  if (data.value && Array.isArray(data.value)) {
    for (const cal of data.value) {
      calendars.push({
        id: cal.id,
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
      id: 'primary',
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
  timeMin: Date,
  timeMax: Date,
  calendars: string[]
): Promise<FreeBusyResponse> {
  // Microsoft Graph uses the getSchedule API for free/busy
  const url = `${GRAPH_API_BASE}/me/calendar/getSchedule`;

  const requestBody = {
    schedules: calendars.map(id => id === 'primary' ? 'me' : id),
    startTime: {
      dateTime: timeMin.toISOString(),
      timeZone: 'UTC'
    },
    endTime: {
      dateTime: timeMax.toISOString(),
      timeZone: 'UTC'
    },
    availabilityViewInterval: 30 // 30-minute intervals
  };

  const data = await makeGraphApiRequest(url, {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  // Convert to our FreeBusyResponse format
  const response: FreeBusyResponse = {
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
  calendarId: string = 'primary'
): Promise<string | null> {
  // For Outlook, we need to update the event to be an online meeting
  const url = `${GRAPH_API_BASE}/me/events/${eventId}`;

  const updates = {
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness'
  };

  try {
    const updatedEvent = await makeGraphApiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    console.log('[Outlook Calendar] Teams meeting added to event:', eventId);
    return updatedEvent.onlineMeeting?.joinUrl || null;
  } catch (error) {
    console.error('[Outlook Calendar] Failed to add Teams meeting:', error);
    return null;
  }
}

// Helper action implementations
const createBufferEvent = async (
  title: string,
  startTime: Date,
  endTime: Date,
  calendarId: string = 'primary'
): Promise<CalendarEvent> => {
  return createEvent({
    summary: title,
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    transparency: 'opaque',
    reminders: { useDefault: false }
  }, calendarId);
};

const createFocusBlock = async (
  startTime: Date,
  duration: number,
  calendarId: string = 'primary'
): Promise<CalendarEvent> => {
  const endTime = new Date(startTime.getTime() + duration * 60000);
  return createEvent({
    summary: '🎯 Focus Time',
    description: 'Protected time for deep work',
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    transparency: 'opaque',
    colorId: '9', // Blue in Outlook categories
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 5 }]
    }
  }, calendarId);
};

const createTravelBlock = async (
  title: string,
  startTime: Date,
  duration: number,
  calendarId: string = 'primary'
): Promise<CalendarEvent> => {
  const endTime = new Date(startTime.getTime() + duration * 60000);
  return createEvent({
    summary: title,
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    transparency: 'opaque',
    colorId: '5', // Yellow
    reminders: { useDefault: false }
  }, calendarId);
};

const createLocationEvent = async (
  location: string,
  date: Date,
  calendarId: string = 'primary'
): Promise<CalendarEvent> => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  return createEvent({
    summary: `Location: ${location}`,
    start: { date: startDate.toISOString().split('T')[0] },
    end: { date: endDate.toISOString().split('T')[0] },
    transparency: 'transparent',
    visibility: 'public'
  }, calendarId);
};

// Export calendar API methods
export const outlookCalendarApi: CalendarApiMethods = {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchCalendarList,
  findFreeBusy,
  addConferenceLink
};

// Export helper methods
export const outlookHelperActions: CalendarHelperMethods = {
  addBufferBefore: async (event, calendarId = 'primary') => {
    if (!event.start.dateTime) throw new Error('Event must have a start time');
    const bufferStart = new Date(event.start.dateTime);
    bufferStart.setMinutes(bufferStart.getMinutes() - 15);
    const bufferEnd = new Date(event.start.dateTime);
    return createBufferEvent('📍 Buffer', bufferStart, bufferEnd, calendarId);
  },

  addBufferAfter: async (event, calendarId = 'primary') => {
    if (!event.end.dateTime) throw new Error('Event must have an end time');
    const bufferStart = new Date(event.end.dateTime);
    const bufferEnd = new Date(event.end.dateTime);
    bufferEnd.setMinutes(bufferEnd.getMinutes() + 15);
    return createBufferEvent('📍 Buffer', bufferStart, bufferEnd, calendarId);
  },

  batchAddBuffers: async (events, position, calendarId = 'primary') => {
    const results = [];
    for (const event of events) {
      try {
        if (position === 'before') {
          const buffer = await outlookHelperActions.addBufferBefore!(event, calendarId);
          results.push(buffer);
        } else {
          const buffer = await outlookHelperActions.addBufferAfter!(event, calendarId);
          results.push(buffer);
        }
      } catch (error) {
        console.error(`[Outlook Calendar] Failed to add buffer for event ${event.id}:`, error);
      }
    }
    return results;
  },

  deletePlaceholderAndLog: async (event, reason, calendarId = 'primary') => {
    if (event.id) {
      await deleteEvent(event.id, calendarId);
      console.log(`[Outlook Calendar] Deleted placeholder: ${event.summary} - Reason: ${reason}`);
    }
  },

  createTravelBlock,
  createLocationEvent,
  createFocusBlock,

  batchAddConferenceLinks: async (events, calendarId = 'primary') => {
    const results: Array<{ eventId: string; success: boolean; conferenceLink?: string }> = [];

    for (const event of events) {
      if (event.id) {
        const link = await addConferenceLink(event.id, calendarId);
        results.push({
          eventId: event.id,
          success: link !== null,
          conferenceLink: link || undefined
        });
      }
    }

    return results;
  },

  findNextAvailableSlot: async (duration, earliestTime, calendarId = 'primary') => {
    const timeMax = new Date(earliestTime);
    timeMax.setDate(timeMax.getDate() + 7); // Search up to 7 days ahead

    const busyTimes = await findFreeBusy(earliestTime, timeMax, [calendarId]);
    const busy = busyTimes.calendars[calendarId]?.busy || [];

    // Sort busy times
    busy.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    let currentTime = new Date(earliestTime);
    const durationMs = duration * 60000;

    for (const busySlot of busy) {
      const busyStart = new Date(busySlot.start);
      const gap = busyStart.getTime() - currentTime.getTime();

      if (gap >= durationMs) {
        // Found a suitable slot
        return {
          start: currentTime,
          end: new Date(currentTime.getTime() + durationMs)
        };
      }

      currentTime = new Date(busySlot.end);
    }

    // Check if there's time after all busy slots
    return {
      start: currentTime,
      end: new Date(currentTime.getTime() + durationMs)
    };
  },

  moveEvent: async (eventId, newStart, newEnd, calendarId = 'primary') => {
    return updateEvent(eventId, {
      start: { dateTime: newStart.toISOString() },
      end: { dateTime: newEnd.toISOString() }
    }, calendarId);
  },

  getOptimalTimeTomorrow: async (calendarId = 'primary') => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(17, 0, 0, 0);

    const busyTimes = await findFreeBusy(tomorrow, endOfDay, [calendarId]);
    const busy = busyTimes.calendars[calendarId]?.busy || [];

    // Find the largest gap
    let bestStart = tomorrow;
    let maxGap = 0;

    let currentTime = new Date(tomorrow);
    for (const busySlot of busy) {
      const busyStart = new Date(busySlot.start);
      const gap = busyStart.getTime() - currentTime.getTime();

      if (gap > maxGap) {
        maxGap = gap;
        bestStart = currentTime;
      }

      currentTime = new Date(busySlot.end);
    }

    // Check gap until end of day
    const finalGap = endOfDay.getTime() - currentTime.getTime();
    if (finalGap > maxGap) {
      bestStart = currentTime;
    }

    return bestStart;
  }
};