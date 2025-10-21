import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalendarEvent } from '../../types/calendar';
import { filterRecurringMeetings, normalizeRecurringMeetings } from '../meetingInsights';

const referenceDate = new Date('2024-01-15T10:00:00Z');

const buildEvent = (
  idSuffix: string,
  offsetDays: number,
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    id: `series-1-${idSuffix}`,
    recurringEventId: 'series-1',
    summary: 'Design Sync',
    organizer: { email: 'host@acme.com' },
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    attendees: [
      { email: 'host@acme.com', responseStatus: 'accepted' },
      { email: 'dev@acme.com', responseStatus: 'accepted' }
    ],
    ...overrides
  } as CalendarEvent;
};

describe('meetingInsights.normalizeRecurringMeetings', () => {
  it('groups recurring events and computes metrics for the active window', () => {
    const events: CalendarEvent[] = [
      buildEvent('a', -14),
      buildEvent('b', -7),
      buildEvent('c', 0),
      buildEvent('d', 7, { status: 'cancelled' })
    ];

    const seriesList = normalizeRecurringMeetings(events, {
      internalDomains: ['acme.com'],
      referenceDate,
      lookbackWeeks: 4,
      lookaheadWeeks: 4
    });

    assert.strictEqual(seriesList.length, 1);
    const [series] = seriesList;

    assert.strictEqual(series.audience, 'internal');
    assert.strictEqual(series.cadence.label, 'Weekly');
    assert.strictEqual(series.metrics.pastMonthOccurrences, 2);
    assert.strictEqual(series.metrics.nextMonthOccurrences, 1);
    assert.strictEqual(series.metrics.totalOccurrences, 4);
    assert.strictEqual(series.metrics.cancellationRate, 0.25);
    assert.strictEqual(series.timeline.past.length, 2);
    assert.strictEqual(series.timeline.upcoming.length, 2);
    assert(series.nextOccurrence, 'expected to identify the next occurrence');
    assert(series.insights.some((insight) => insight.tone === 'warning'));
  });

  it('classifies series with only external attendees', () => {
    const externalStart = new Date(referenceDate);
    externalStart.setDate(externalStart.getDate() - 7);
    const end = new Date(externalStart.getTime() + 60 * 60 * 1000);

    const externalEvents: CalendarEvent[] = [
      {
        id: 'series-2-a',
        recurringEventId: 'series-2',
        summary: 'Vendor Check-in',
        organizer: { email: 'host@acme.com' },
        start: { dateTime: externalStart.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: [
          { email: 'client@vendor.com', responseStatus: 'accepted' },
          { email: 'finance@vendor.com', responseStatus: 'accepted' }
        ]
      }
    ];

    const [series] = normalizeRecurringMeetings(externalEvents, {
      internalDomains: ['acme.com'],
      referenceDate,
      lookbackWeeks: 4,
      lookaheadWeeks: 4
    });

    assert.strictEqual(series.audience, 'external');
    assert.strictEqual(series.metrics.externalRatio, 1);
  });
});

describe('meetingInsights.filterRecurringMeetings', () => {
  it('filters by audience while preserving matching series', () => {
    const events: CalendarEvent[] = [
      buildEvent('internal-1', -7),
      buildEvent('internal-2', 0),
      {
        id: 'mixed-1',
        recurringEventId: 'mixed-series',
        summary: 'Partner Update',
        organizer: { email: 'host@acme.com' },
        start: { dateTime: referenceDate.toISOString() },
        end: { dateTime: new Date(referenceDate.getTime() + 45 * 60 * 1000).toISOString() },
        attendees: [
          { email: 'host@acme.com', responseStatus: 'accepted' },
          { email: 'client@partner.com', responseStatus: 'accepted' }
        ]
      } as CalendarEvent
    ];

    const seriesList = normalizeRecurringMeetings(events, {
      internalDomains: ['acme.com'],
      referenceDate,
      lookbackWeeks: 4,
      lookaheadWeeks: 4
    });

    const internalOnly = filterRecurringMeetings(seriesList, {
      audience: 'internal',
      search: '',
      showCancelled: true
    });

    assert.strictEqual(internalOnly.length, 1);
    assert.strictEqual(internalOnly[0].audience, 'internal');

    const mixedOnly = filterRecurringMeetings(seriesList, {
      audience: 'mixed',
      search: '',
      showCancelled: true
    });

    assert.strictEqual(mixedOnly.length, 1);
    assert.strictEqual(mixedOnly[0].audience, 'mixed');
  });
});
