/**
 * Meetings & Recurring Series domain types
 */

import type { CalendarAttendee, CalendarEvent } from './calendar';

export type MeetingAudience = 'internal' | 'external' | 'mixed';

export type MeetingInsightTone = 'info' | 'warning' | 'positive';

export interface MeetingInsight {
  id: string;
  tone: MeetingInsightTone;
  message: string;
}

export interface MeetingResponseStats {
  accepted: number;
  declined: number;
  tentative: number;
  needsAction: number;
}

export interface MeetingOccurrence {
  id: string;
  eventId: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  attendees: CalendarAttendee[];
  internalCount: number;
  externalCount: number;
  totalAttendees: number;
  hasConferenceLink: boolean;
  isCancelled: boolean;
  responseStats: MeetingResponseStats;
}

export interface MeetingCadenceSummary {
  label: string;
  intervalDays?: number;
}

export interface MeetingTimeline {
  past: MeetingOccurrence[];
  upcoming: MeetingOccurrence[];
}

export interface MeetingMetrics {
  totalOccurrences: number;
  pastMonthOccurrences: number;
  nextMonthOccurrences: number;
  averageDurationMinutes: number;
  totalPastMinutes: number;
  cancellationRate: number;
  averageAttendance: number;
  externalRatio: number;
  attendanceTrend: number[];
}

export interface RecurringMeetingSeries {
  id: string;
  title: string;
  owner?: string;
  audience: MeetingAudience;
  cadence: MeetingCadenceSummary;
  occurrences: MeetingOccurrence[];
  metrics: MeetingMetrics;
  insights: MeetingInsight[];
  timeline: MeetingTimeline;
  nextOccurrence?: MeetingOccurrence;
  lastOccurrence?: MeetingOccurrence;
  referenceDate: Date;
}

export interface RecurringMeetingFilters {
  audience: 'all' | MeetingAudience;
  search: string;
  showCancelled: boolean;
}

export interface RecurringMeetingOptions {
  internalDomains?: string[];
  referenceDate?: Date;
  lookbackWeeks?: number;
  lookaheadWeeks?: number;
}

export interface RecurringMeetingComputationResult {
  series: RecurringMeetingSeries[];
  generatedAt: Date;
}

export type MeetingInsightInput = {
  events: CalendarEvent[];
  options?: RecurringMeetingOptions;
};
