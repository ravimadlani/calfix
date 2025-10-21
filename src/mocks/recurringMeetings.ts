import type { CalendarAttendee } from '../types/calendar';
import type { MeetingOccurrence, RecurringMeetingSeries } from '../types/meetings';

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const attendeesFrom = (emails: string[]): CalendarAttendee[] =>
  emails.map((email) => ({
    email,
    responseStatus: 'accepted'
  }));

const makeOccurrence = (
  id: string,
  start: Date,
  durationMinutes: number,
  attendeeEmails: string[],
  externalEmails: string[] = [],
  options: { cancelled?: boolean } = {}
): MeetingOccurrence => {
  const attendees = attendeesFrom([...attendeeEmails, ...externalEmails]);
  return {
    id,
    eventId: id,
    start,
    end: new Date(start.getTime() + durationMinutes * 60 * 1000),
    durationMinutes,
    attendees,
    internalCount: attendeeEmails.length,
    externalCount: externalEmails.length,
    totalAttendees: attendees.length,
    hasConferenceLink: true,
    isCancelled: Boolean(options.cancelled),
    responseStats: {
      accepted: attendees.length,
      declined: 0,
      tentative: 0,
      needsAction: 0
    }
  };
};

const referenceDate = new Date('2024-03-18T12:00:00Z');

const productSyncOccurrences: MeetingOccurrence[] = [
  makeOccurrence('weekly-sync-1', addDays(referenceDate, -21), 45, ['pm@acme.com', 'designer@acme.com', 'dev@acme.com']),
  makeOccurrence('weekly-sync-2', addDays(referenceDate, -14), 45, ['pm@acme.com', 'designer@acme.com', 'dev@acme.com', 'qa@acme.com']),
  makeOccurrence('weekly-sync-3', addDays(referenceDate, -7), 45, ['pm@acme.com', 'designer@acme.com', 'dev@acme.com', 'qa@acme.com']),
  makeOccurrence('weekly-sync-4', addDays(referenceDate, 0), 45, ['pm@acme.com', 'designer@acme.com', 'dev@acme.com', 'qa@acme.com']),
  makeOccurrence('weekly-sync-5', addDays(referenceDate, 7), 45, ['pm@acme.com', 'designer@acme.com', 'dev@acme.com', 'qa@acme.com']),
  makeOccurrence('weekly-sync-6', addDays(referenceDate, 14), 45, ['pm@acme.com', 'designer@acme.com', 'dev@acme.com', 'qa@acme.com'])
];

const clientReviewOccurrences: MeetingOccurrence[] = [
  makeOccurrence('client-review-1', addDays(referenceDate, -28), 60, ['am@acme.com'], ['client@partner.com', 'finance@partner.com']),
  makeOccurrence('client-review-2', addDays(referenceDate, -14), 60, ['am@acme.com'], ['client@partner.com', 'finance@partner.com']),
  makeOccurrence('client-review-3', addDays(referenceDate, 0), 60, ['am@acme.com'], ['client@partner.com', 'finance@partner.com'], { cancelled: true }),
  makeOccurrence('client-review-4', addDays(referenceDate, 14), 60, ['am@acme.com'], ['client@partner.com', 'finance@partner.com']),
  makeOccurrence('client-review-5', addDays(referenceDate, 28), 60, ['am@acme.com'], ['client@partner.com', 'finance@partner.com'])
];

export const recurringMeetingMockSeries: RecurringMeetingSeries[] = [
  {
    id: 'weekly-product-sync',
    title: 'Product Squad Weekly Sync',
    owner: 'pm@acme.com',
    audience: 'internal',
    cadence: { label: 'Weekly', intervalDays: 7 },
    occurrences: productSyncOccurrences,
    metrics: {
      totalOccurrences: productSyncOccurrences.length,
      pastMonthOccurrences: 3,
      nextMonthOccurrences: 3,
      averageDurationMinutes: 45,
      totalPastMinutes: 135,
      cancellationRate: 0,
      averageAttendance: 4,
      externalRatio: 0,
      attendanceTrend: [3, 4, 4, 4]
    },
    insights: [
      {
        id: 'weekly-product-sync-healthy',
        tone: 'positive',
        message: 'Healthy recurring meeting with steady attendance.'
      }
    ],
    timeline: {
      past: productSyncOccurrences.slice(0, 3),
      upcoming: productSyncOccurrences.slice(3)
    },
    nextOccurrence: productSyncOccurrences[3],
    lastOccurrence: productSyncOccurrences[2],
    referenceDate
  },
  {
    id: 'client-quarterly-review',
    title: 'Client Quarterly Business Review',
    owner: 'am@acme.com',
    audience: 'mixed',
    cadence: { label: 'Bi-weekly', intervalDays: 14 },
    occurrences: clientReviewOccurrences,
    metrics: {
      totalOccurrences: clientReviewOccurrences.length,
      pastMonthOccurrences: 2,
      nextMonthOccurrences: 2,
      averageDurationMinutes: 60,
      totalPastMinutes: 120,
      cancellationRate: 0.2,
      averageAttendance: 3,
      externalRatio: 0.5,
      attendanceTrend: [3, 3, 3, 3]
    },
    insights: [
      {
        id: 'client-quarterly-review-external',
        tone: 'info',
        message: 'Majority of attendees are external partners. Ensure prep is client-ready.'
      },
      {
        id: 'client-quarterly-review-cancellations',
        tone: 'warning',
        message: 'One of the recent sessions was cancelled. Confirm agenda with the client team.'
      }
    ],
    timeline: {
      past: clientReviewOccurrences.slice(0, 2),
      upcoming: clientReviewOccurrences.slice(2)
    },
    nextOccurrence: clientReviewOccurrences[3],
    lastOccurrence: clientReviewOccurrences[1],
    referenceDate
  }
];
