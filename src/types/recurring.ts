import type { CalendarEvent } from './calendar';

export interface RecurringSeriesMetrics {
  id: string;
  title: string;
  organizerEmail?: string;
  frequencyLabel: string;
  averageGapDays: number | null;
  durationMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  peopleHoursPerMonth: number;
  actualMonthlyMinutes: number;
  internalAttendeeCount: number;
  externalAttendeeCount: number;
  attendeeCount: number;
  acceptanceRate: number;
  cancellationRate: number;
  agendaMissing: boolean;
  lastUpdated?: string;
  lastOccurrence?: Date | null;
  nextOccurrence?: Date | null;
  totalInstances: number;
  flags: string[];
  sampleEvents: CalendarEvent[];
  isPlaceholder: boolean;
}

export interface RecurringSummary {
  totalSeries: number;
  weeklyHours: number;
  monthlyHours: number;
  peopleHours: number;
  percentOfWorkWeek: number;
  internalSeries: number;
  externalSeries: number;
  placeholderSeries: number;
  flaggedSeries: number;
  flagCounts: Record<string, number>;
}

export type RelationshipHealthStatus = 'healthy' | 'overdue' | 'critical';

export interface RelationshipSnapshot {
  personEmail: string;
  personName?: string;
  lastMeetings: CalendarEvent[];
  nextMeetings: CalendarEvent[];
  averageGapDays: number | null;
  daysSinceLast: number | null;
  status: RelationshipHealthStatus;
}

export interface RecurringAnalyticsResult {
  series: RecurringSeriesMetrics[];
  summary: RecurringSummary;
  relationships: RelationshipSnapshot[];
}
