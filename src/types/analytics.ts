/**
 * Analytics Type Definitions
 */

import type {
  CalendarEvent,
  GapInfo,
  DoubleBooking,
  FlightWithTravelNeeds,
  InternationalFlightWithLocation,
  MeetingOutsideHours,
} from './calendar';

export interface HealthScoreInterpretation {
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: 'green' | 'blue' | 'yellow' | 'red';
  bgColor: string;
  textColor: string;
  message: string;
}

export interface CalendarAnalytics {
  totalEvents: number;
  totalMeetings: number;
  totalMeetingHours: number;
  backToBackCount: number;
  insufficientBufferCount: number;
  focusBlockCount: number;
  healthScore: number;
  healthInterpretation: HealthScoreInterpretation;
  gaps: GapInfo[];
  insights: Insight[];
  doubleBookings: DoubleBooking[];
  doubleBookingCount: number;
  meetingsWithoutVideoLinks: CalendarEvent[];
  missingVideoLinkCount: number;
  declinedTwoPersonMeetings: CalendarEvent[];
  declinedMeetingCount: number;
  flightsWithoutTravelBlocks: FlightWithTravelNeeds[];
  flightsNeedingTravelBlockCount: number;
  internationalFlightsWithoutLocation: InternationalFlightWithLocation[];
  internationalFlightsNeedingLocationCount: number;
  meetingsOutsideBusinessHours: MeetingOutsideHours[];
  outOfHoursMeetingCount: number;
}

export interface Insight {
  type: 'info' | 'success' | 'warning' | 'tip';
  icon: string;
  color?: 'red' | 'orange' | 'green' | 'blue';
  message: string;
}

export interface Recommendation {
  type: 'high-priority' | 'medium-priority' | 'success';
  icon: string;
  title: string;
  description: string;
  action: string;
  color: 'red' | 'orange' | 'green';
}

export interface DailySummary extends CalendarAnalytics {
  earliestMeeting: Date | null;
  latestMeeting: Date | null;
  workDayHours: number;
  hasEveningMeetings: boolean;
  hasEarlyMeetings: boolean;
}

export interface WeeklySummary extends CalendarAnalytics {
  eventsByDay: { [day: string]: CalendarEvent[] };
  busiestDay: string | null;
  busiestDayMeetingCount: number;
  averageMeetingsPerDay: number;
}

export interface ProblematicEvent {
  event: CalendarEvent;
  issue: 'back-to-back' | 'insufficient-buffer';
  recommendation: string;
  nextEvent: CalendarEvent;
}

export interface FocusOpportunity {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  beforeEvent: CalendarEvent;
  afterEvent: CalendarEvent;
}

export interface OptimalTimeSlot {
  startTime: string;
  endTime: string;
  gapMinutes: number;
  score: number;
  reason: string;
}
