/**
 * Google Calendar API Type Definitions
 */

export interface CalendarDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  self?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
  organizer?: boolean;
}

export interface CalendarOrganizer {
  email: string;
  displayName?: string;
  self?: boolean;
}

export interface ConferenceDataEntryPoint {
  entryPointType: string;
  uri: string;
  label?: string;
}

export interface ConferenceData {
  entryPoints?: ConferenceDataEntryPoint[];
  conferenceSolution?: {
    key: { type: string };
    name: string;
    iconUri?: string;
  };
  conferenceId?: string;
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: { type: string };
    status?: {
      statusCode: string;
    };
  };
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  attendees?: CalendarAttendee[];
  organizer?: CalendarOrganizer;
  creator?: CalendarOrganizer;
  colorId?: string;
  transparency?: 'opaque' | 'transparent';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: ConferenceData;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  recurringEventId?: string;
  created?: string;
  updated?: string;
}

export interface EventWithGap extends CalendarEvent {
  gapAfter?: GapInfo | null;
  outOfHoursInTimezone?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  locationFlag?: string | null;
  foreignLocalHour?: number | null;
  homeLocalHour?: number | null;
  isWithinHoursAtHome?: boolean | null;
}

export interface GapInfo {
  afterEvent: CalendarEvent;
  beforeEvent: CalendarEvent;
  gapMinutes: number;
  status: 'back-to-back' | 'insufficient-buffer' | 'focus-block' | 'normal';
  color: 'red' | 'orange' | 'green' | 'gray';
  recommendation: string;
  isCurrentMeeting: boolean;
  isNextMeeting: boolean;
}

export interface DoubleBooking {
  event1: CalendarEvent;
  event2: CalendarEvent;
  overlapStart: Date;
  overlapEnd: Date;
  overlapMinutes: number;
  isMeeting1: boolean;
  isMeeting2: boolean;
}

export interface FlightWithTravelNeeds extends CalendarEvent {
  needsTravelBlockBefore: boolean;
  needsTravelBlockAfter: boolean;
  fromAirport?: string;
  toAirport?: string;
  fromData?: AirportInfo;
  toData?: AirportInfo;
}

export interface InternationalFlightWithLocation extends CalendarEvent {
  fromAirport: string;
  toAirport: string;
  fromData: AirportInfo;
  toData: AirportInfo;
  arrivalDate: Date;
  departureDate: Date;
  returnFlight: CalendarEvent | null;
  isReturningHome: boolean;
}

export interface MeetingOutsideHours extends CalendarEvent {
  locationEvent: CalendarEvent;
  locationCity: string;
  locationCountry: string;
  locationFlag: string;
  foreignTimezone: string;
  homeTimezone: string;
  foreignLocalHour: number;
  homeLocalHour: number;
  isWithinHoursAtHome: boolean;
  outOfHoursInTimezone: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  defaultReminders?: Array<{
    method: string;
    minutes: number;
  }>;
  primary?: boolean;
}

export interface TimeRange {
  timeMin: string;
  timeMax: string;
}

export interface FreeBusyCalendar {
  busy: Array<{
    start: string;
    end: string;
  }>;
  errors?: Array<{
    domain: string;
    reason: string;
  }>;
}

export interface FreeBusyResponse {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars: {
    [calendarId: string]: FreeBusyCalendar;
  };
}

export type EventCategory =
  | 'Meeting'
  | 'Focus/Work'
  | 'Prep/TODO'
  | 'Break'
  | 'Personal'
  | 'Travel'
  | 'Conference'
  | 'Admin'
  | 'Other';

export interface AirportInfo {
  country: string;
  city: string;
  timezone: string;
  flag: string;
}
