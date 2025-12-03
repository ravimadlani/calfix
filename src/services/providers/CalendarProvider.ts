import type {
  CalendarEvent,
  CalendarListEntry,
  CalendarProviderCapabilities,
  CalendarProviderId,
  FreeBusyResponse
} from '../../types';

export interface FetchEventsOptions {
  timeMin: string;
  timeMax: string;
  calendarId?: string;
  maxResults?: number;
}

export interface CalendarProviderAuth {
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  handleCallback(code: string): Promise<void>;
  isAuthenticated(): boolean;
  getValidAccessToken(): Promise<string>;
  forceReauthentication(): Promise<void>;
}

export type EventResponseStatus = 'accepted' | 'declined' | 'tentative';

export interface CalendarProviderCalendarApi {
  fetchEvents(options: FetchEventsOptions): Promise<CalendarEvent[]>;
  createEvent(eventData: unknown, calendarId?: string): Promise<CalendarEvent>;
  updateEvent(eventId: string, eventData: unknown, calendarId?: string): Promise<CalendarEvent>;
  deleteEvent(eventId: string, calendarId?: string): Promise<void>;
  fetchCalendarList(): Promise<CalendarListEntry[]>;
  findFreeBusy(timeMin: string, timeMax: string, calendarIds: string | string[]): Promise<FreeBusyResponse>;
  addConferenceLink?(eventId: string, event: CalendarEvent, calendarId?: string): Promise<CalendarEvent>;
  respondToEvent?(eventId: string, response: EventResponseStatus, calendarId?: string): Promise<CalendarEvent>;
}

export interface CalendarProviderHelperActions {
  createBufferEvent?(startTime: Date, durationMinutes?: number): Promise<CalendarEvent>;
  createFocusBlock?(startTime: Date, durationMinutes?: number, title?: string): Promise<CalendarEvent>;
  createTravelBlock?(startTime: Date, durationMinutes?: number, title?: string): Promise<CalendarEvent>;
  createLocationEvent?(startDate: Date, endDate: Date, city: string, country: string, timezone: string, flag: string): Promise<CalendarEvent>;
  moveEvent?(eventId: string, event: CalendarEvent, newStartTime: Date): Promise<CalendarEvent>;
  addBufferBefore?(event: CalendarEvent, bufferMinutes?: number): Promise<CalendarEvent>;
  addBufferAfter?(event: CalendarEvent, bufferMinutes?: number): Promise<CalendarEvent>;
  batchAddBuffers?(events: CalendarEvent[], position?: 'before' | 'after', bufferMinutes?: number): Promise<CalendarEvent[]>;
  deletePlaceholderAndLog?(event: CalendarEvent): Promise<void>;
  getOptimalTimeTomorrow?(events: CalendarEvent[], durationMinutes?: number): Date | null;
  batchAddConferenceLinks?(events: CalendarEvent[], calendarId?: string): Promise<{
    successful: CalendarEvent[];
    failed: Array<{ event: CalendarEvent; error: string }>;
    successCount: number;
    failCount: number;
  }>;
  findNextAvailableSlot?(events: CalendarEvent[], durationMinutes: number, searchStartTime: Date): Date | null;
}

export interface CalendarProvider {
  id: CalendarProviderId;
  label: string;
  description?: string;
  icon?: string;
  capabilities: CalendarProviderCapabilities;
  auth: CalendarProviderAuth;
  calendar: CalendarProviderCalendarApi;
  helpers: CalendarProviderHelperActions;
}

export type CalendarProviderFactory = () => CalendarProvider;
