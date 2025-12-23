import { differenceInCalendarDays } from 'date-fns';
import type { CalendarEvent } from '../types';
import {
  calculateDuration,
  getEventStartTime,
  isAllDayEvent
} from '../utils/dateHelpers';
import { isMeeting } from '../utils/eventCategorizer';
import type {
  RecurringAnalyticsResult,
  RecurringSeriesMetrics,
  RecurringSummary,
  RelationshipSnapshot,
  RelationshipHealthStatus
} from '../types/recurring';

interface RecurringAnalyticsOptions {
  ownerEmail?: string | null;
  filterStart: Date;
  filterEnd: Date;
  baselineWorkWeekHours?: number;
  rangeMode: 'retro' | 'forward';
  relationshipWindowStart: Date;
  relationshipWindowEnd: Date;
}

const WORK_WEEK_DEFAULT = 40;
const MILLIS_IN_DAY = 1000 * 60 * 60 * 24;

const getDomain = (email?: string | null) => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at === -1) return null;
  return trimmed.slice(at + 1);
};

const toLower = (value?: string | null) => (value ? value.toLowerCase() : undefined);

const isServiceEmail = (email: string) => email.includes('calendar.google.com') || email.endsWith('@group.calendar.google.com');

const isWithinRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;

const roundTwo = (value: number) => Math.round(value * 100) / 100;

/**
 * Extract the BASE iCalUID by stripping provider-specific suffixes.
 *
 * Google Calendar appends `_R{timestamp}` suffix to iCalUID for rescheduled/modified instances:
 * - Original: `abc123@google.com`
 * - Rescheduled: `abc123_R20251110T151500@google.com`
 *
 * By extracting the base, all instances of the same recurring series will group together.
 */
const extractBaseICalUID = (iCalUID: string | undefined): string | null => {
  if (!iCalUID) return null;

  // Remove @google.com suffix (or other domain suffixes)
  let base = iCalUID.replace(/@[^@]+$/, '');

  // Remove _R{timestamp} suffix for rescheduled instances
  // Pattern: _R followed by date (YYYYMMDD) and optional time (THHMMSS)
  base = base.replace(/_R\d{8}(T\d{6})?$/, '');

  return base || null;
};

const getFrequencyLabelFromAverage = (avgGapDays: number | null) => {
  if (!avgGapDays || avgGapDays <= 0) {
    return 'Irregular';
  }

  if (avgGapDays <= 2) return 'Daily';
  if (avgGapDays <= 10) return 'Weekly';
  if (avgGapDays <= 17) return 'Bi-Weekly';
  if (avgGapDays <= 45) return 'Monthly';
  return 'Irregular';
};

const getFrequencyFromRecurrence = (event: CalendarEvent | undefined) => {
  const recurrenceRule = event?.recurrence?.find(rule => rule.toUpperCase().startsWith('RRULE'));
  if (!recurrenceRule) return null;

  const [, ruleBodyRaw] = recurrenceRule.split(':');
  const ruleBody = ruleBodyRaw || recurrenceRule;
  const parts = ruleBody.split(';');

  const freqPart = parts.find(part => part.startsWith('FREQ='));
  if (!freqPart) return null;

  const freqValue = freqPart.split('=')[1];
  const intervalPart = parts.find(part => part.startsWith('INTERVAL='));
  const interval = intervalPart ? Number(intervalPart.split('=')[1]) || 1 : 1;

  switch (freqValue) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return interval === 2 ? 'Bi-Weekly' : 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    default:
      return null;
  }
};

const getSeriesFlags = (
  metrics: RecurringSeriesMetrics,
  now: Date
): string[] => {
  const flags: string[] = [];

  const lastUpdated = metrics.lastUpdated ? new Date(metrics.lastUpdated) : null;
  const monthsSinceUpdate = lastUpdated ? differenceInCalendarDays(now, lastUpdated) / 30 : null;

  if (metrics.attendeeCount * metrics.actualMonthlyMinutes >= 2400) {
    flags.push('high-people-hours');
  }

  if (metrics.externalAttendeeCount > 0 && (!metrics.sampleEvents[0]?.recurrence || metrics.nextOccurrence === null)) {
    flags.push('external-no-end');
  }

  if (monthsSinceUpdate !== null && monthsSinceUpdate >= 6) {
    flags.push('stale');
  }

  return Array.from(new Set(flags));
};

const calculateAverageGapDays = (events: CalendarEvent[]) => {
  if (events.length < 2) return null;
  const sorted = [...events].sort((a, b) => {
    const aTime = getEventStartTime(a)?.getTime() ?? 0;
    const bTime = getEventStartTime(b)?.getTime() ?? 0;
    return aTime - bTime;
  });
  let totalGapMs = 0;
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = getEventStartTime(sorted[i - 1]);
    const current = getEventStartTime(sorted[i]);
    if (!prev || !current) continue;
    const diff = current.getTime() - prev.getTime();
    if (diff <= 0) continue;
    totalGapMs += diff;
    gapCount += 1;
  }
  if (gapCount === 0) return null;
  return totalGapMs / gapCount / MILLIS_IN_DAY;
};

const calculateAcceptanceMetrics = (events: CalendarEvent[]) => {
  let attendeeSlots = 0;
  let accepted = 0;
  let cancelled = 0;

  events.forEach(event => {
    if (event.status === 'cancelled') {
      cancelled += 1;
    }

    if (event.attendees) {
      event.attendees.forEach(att => {
        if (!att.email || att.responseStatus === 'needsAction') {
          return;
        }

        attendeeSlots += 1;
        if (att.responseStatus === 'accepted') {
          accepted += 1;
        }
      });
    }
  });

  const acceptanceRate = attendeeSlots > 0 ? accepted / attendeeSlots : 1;
  const cancellationRate = events.length > 0 ? cancelled / events.length : 0;

  return { acceptanceRate, cancellationRate };
};

const calculateAgendaMissing = (events: CalendarEvent[]) => {
  return events.every(event => !event.description || !event.description.trim());
};

const getPeopleHourEstimate = (attendeeCount: number, monthlyMinutes: number) => {
  if (attendeeCount <= 0) return 0;
  return (attendeeCount * monthlyMinutes) / 60;
};

const getRelationshipStatus = (
  averageGapDays: number | null,
  daysSinceLast: number | null
): RelationshipHealthStatus => {
  if (daysSinceLast === null) {
    return 'critical';
  }

  if (averageGapDays === null) {
    return daysSinceLast > 60 ? 'critical' : 'healthy';
  }

  if (daysSinceLast > 60) {
    return 'critical';
  }

  if (daysSinceLast > averageGapDays * 2) {
    return 'overdue';
  }

  return 'healthy';
};

const buildRecurringSeriesMetrics = (
  groupId: string,
  events: CalendarEvent[],
  options: RecurringAnalyticsOptions,
  now: Date
): RecurringSeriesMetrics | null => {
  const sortedEvents = events
    .filter(event => !!getEventStartTime(event) && !isAllDayEvent(event))
    .sort((a, b) => {
      const aTime = getEventStartTime(a)?.getTime() ?? 0;
      const bTime = getEventStartTime(b)?.getTime() ?? 0;
      return aTime - bTime;
    });

  if (sortedEvents.length === 0) {
    return null;
  }

  const eventsInWindow = sortedEvents.filter(event => {
    const start = getEventStartTime(event);
    if (!start) return false;
    return start >= options.filterStart && start <= options.filterEnd;
  });

  if (eventsInWindow.length === 0) {
    return null;
  }

  const durationSamples = eventsInWindow
    .map(event => calculateDuration(event.start?.dateTime || event.start?.date, event.end?.dateTime || event.end?.date))
    .filter(Boolean);

  const averageDurationMinutes = durationSamples.length > 0
    ? durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length
    : 0;

  const averageGapDays = calculateAverageGapDays(eventsInWindow);
  const recurrenceFrequencyLabel = getFrequencyFromRecurrence(eventsInWindow[0]);
  const frequencyLabel = recurrenceFrequencyLabel || getFrequencyLabelFromAverage(averageGapDays);

  const ownerEmail = toLower(options.ownerEmail);
  const ownerDomain = getDomain(ownerEmail);

  let internalAttendees = 0;
  let externalAttendees = 0;
  const attendeeEmails = new Set<string>();

  eventsInWindow.forEach(event => {
    event.attendees?.forEach(att => {
      if (!att.email) return;
      const email = att.email.toLowerCase();
      if (isServiceEmail(email)) {
        return;
      }
      if (ownerEmail && email === ownerEmail) {
        return;
      }
      if (attendeeEmails.has(email)) {
        return;
      }
      attendeeEmails.add(email);
      const domain = getDomain(email);
      if (ownerDomain && domain === ownerDomain) {
        internalAttendees += 1;
      } else {
        externalAttendees += 1;
      }
    });
  });

  const { acceptanceRate, cancellationRate } = calculateAcceptanceMetrics(eventsInWindow);
  const agendaMissing = calculateAgendaMissing(eventsInWindow);
  const lastUpdated = eventsInWindow.reduce<string | undefined>((latest, event) => {
    if (!event.updated) return latest;
    if (!latest) return event.updated;
    return new Date(event.updated) > new Date(latest) ? event.updated : latest;
  }, undefined);

  const pastEvents = eventsInWindow.filter(event => {
    const start = getEventStartTime(event);
    return !!start && start < now;
  });
  const futureEvents = eventsInWindow.filter(event => {
    const start = getEventStartTime(event);
    return !!start && start >= now;
  });

  const lastOccurrence = pastEvents.length > 0 ? getEventStartTime(pastEvents[pastEvents.length - 1]) ?? null : null;
  const nextOccurrence = futureEvents.length > 0 ? getEventStartTime(futureEvents[0]) ?? null : null;

  const attendeeCount = internalAttendees + externalAttendees;

  const measurementStart = new Date(now);
  const measurementEnd = new Date(now);
  if (options.rangeMode === 'retro') {
    measurementStart.setDate(measurementStart.getDate() - 30);
  } else {
    measurementEnd.setDate(measurementEnd.getDate() + 30);
  }

  const actualMonthlyMinutes = events.reduce((sum, event) => {
    const start = getEventStartTime(event);
    if (!start) return sum;
    if (start < measurementStart || start > measurementEnd) {
      return sum;
    }
    const duration = calculateDuration(event.start?.dateTime || event.start?.date, event.end?.dateTime || event.end?.date);
    return duration ? sum + duration : sum;
  }, 0);

  const weeklyMinutes = actualMonthlyMinutes > 0
    ? actualMonthlyMinutes * (7 / 30)
    : averageDurationMinutes;

  const monthlyMinutes = actualMonthlyMinutes > 0
    ? actualMonthlyMinutes
    : averageDurationMinutes * 4;

  const peopleHoursPerMonth = getPeopleHourEstimate(
    attendeeCount || 1,
    monthlyMinutes
  );

  const metricsBase: RecurringSeriesMetrics = {
    id: groupId,
    title: eventsInWindow[0]?.summary || 'Untitled meeting',
    organizerEmail: eventsInWindow[0]?.organizer?.email,
    frequencyLabel,
    averageGapDays: averageGapDays ? roundTwo(averageGapDays) : null,
    durationMinutes: roundTwo(averageDurationMinutes),
    weeklyMinutes: roundTwo(weeklyMinutes),
    monthlyMinutes: roundTwo(monthlyMinutes),
    actualMonthlyMinutes: roundTwo(actualMonthlyMinutes),
    peopleHoursPerMonth: roundTwo(peopleHoursPerMonth),
    internalAttendeeCount: internalAttendees,
    externalAttendeeCount: externalAttendees,
    attendeeCount,
    acceptanceRate: roundTwo(acceptanceRate),
    cancellationRate: roundTwo(cancellationRate),
    agendaMissing,
    lastUpdated,
    lastOccurrence,
    nextOccurrence,
    totalInstances: eventsInWindow.length,
    flags: [],
    sampleEvents: eventsInWindow.slice(0, 5),
    isPlaceholder: attendeeCount === 0
  };

  const flags = getSeriesFlags(metricsBase, now);

  return {
    ...metricsBase,
    flags
  };
};

const buildRelationshipSnapshots = (
  events: CalendarEvent[],
  ownerEmail: string | undefined,
  windowStart: Date,
  windowEnd: Date
): RelationshipSnapshot[] => {
  const now = new Date();
  const ownerAddress = ownerEmail?.toLowerCase();

  const relevantEvents = events.filter(event => {
    if (!isMeeting(event) || isAllDayEvent(event)) return false;
    const start = getEventStartTime(event);
    if (!start || !isWithinRange(start, windowStart, windowEnd)) return false;
    if (!event.attendees || event.attendees.length === 0) return false;
    return true;
  });

  const relationshipMap = new Map<string, CalendarEvent[]>();

  relevantEvents.forEach(event => {
    const attendees = (event.attendees || []).filter(att => att.email && !isServiceEmail(att.email.toLowerCase()));
    if (attendees.length !== 2) {
      return;
    }

    const attendeeEmails = attendees.map(att => att.email?.toLowerCase() ?? '').filter(Boolean);
    if (ownerAddress && !attendeeEmails.includes(ownerAddress)) {
      return;
    }

    const counterpart = attendeeEmails.find(email => email !== ownerAddress) ?? attendeeEmails[0];
    if (!counterpart) return;
    if (!relationshipMap.has(counterpart)) {
      relationshipMap.set(counterpart, []);
    }
    relationshipMap.get(counterpart)!.push(event);
  });

  const snapshots: RelationshipSnapshot[] = [];

  relationshipMap.forEach((relationshipEvents, email) => {
    const sorted = relationshipEvents
      .filter(event => !!getEventStartTime(event))
      .sort((a, b) => {
        const aTime = getEventStartTime(a)?.getTime() ?? 0;
        const bTime = getEventStartTime(b)?.getTime() ?? 0;
        return aTime - bTime;
      });

    if (sorted.length === 0) return;

    const past = sorted.filter(event => {
      const start = getEventStartTime(event);
      return !!start && start < now;
    });

    const future = sorted.filter(event => {
      const start = getEventStartTime(event);
      return !!start && start >= now;
    });

    const lastMeetings = past.slice(-2);
    const nextMeetings = future.slice(0, 2);

    let averageGap: number | null = null;
    if (past.length >= 2) {
      let totalDiffDays = 0;
      let diffCount = 0;
      for (let i = 1; i < past.length; i += 1) {
        const current = getEventStartTime(past[i]);
        const prev = getEventStartTime(past[i - 1]);
        if (!current || !prev) continue;
        const diff = (current.getTime() - prev.getTime()) / MILLIS_IN_DAY;
        if (diff <= 0) continue;
        totalDiffDays += diff;
        diffCount += 1;
      }
      if (diffCount > 0) {
        averageGap = totalDiffDays / diffCount;
      }
    }

    const lastMeetingDate = lastMeetings.length > 0 ? getEventStartTime(lastMeetings[lastMeetings.length - 1]) : null;
    const daysSinceLast = lastMeetingDate ? (now.getTime() - lastMeetingDate.getTime()) / MILLIS_IN_DAY : null;
    const nextMeetingDate = nextMeetings.length > 0 ? getEventStartTime(nextMeetings[0]) : null;
    const daysUntilNext = nextMeetingDate ? (nextMeetingDate.getTime() - now.getTime()) / MILLIS_IN_DAY : null;
    const isRecurring = relationshipEvents.some(event => event.recurringEventId || (event.recurrence && event.recurrence.length > 0));
    const status = getRelationshipStatus(averageGap, daysSinceLast);

    const attendeeInfo = relationshipEvents[0]?.attendees?.find(att => att.email && att.email.toLowerCase() === email);

    snapshots.push({
      personEmail: email,
      personName: attendeeInfo?.displayName,
      lastMeetings,
      nextMeetings,
      averageGapDays: averageGap ? roundTwo(averageGap) : null,
      daysSinceLast: daysSinceLast !== null ? roundTwo(daysSinceLast) : null,
      daysUntilNext: daysUntilNext !== null ? roundTwo(daysUntilNext) : null,
      isRecurring,
      status
    });
  });

  const sortedSnapshots = snapshots.sort((a, b) => {
    const statusOrder: RelationshipHealthStatus[] = ['critical', 'overdue', 'healthy'];
    const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    const daysA = a.daysSinceLast ?? 0;
    const daysB = b.daysSinceLast ?? 0;
    return daysB - daysA;
  });

  return sortedSnapshots;
};

export const summarizeRecurringSeries = (
  series: RecurringSeriesMetrics[],
  baselineWorkWeekHours: number
): RecurringSummary => {
  const weeklyMinutes = series.reduce((sum, item) => sum + item.weeklyMinutes, 0);
  const monthlyMinutes = series.reduce((sum, item) => sum + item.monthlyMinutes, 0);
  const peopleHours = series.reduce((sum, item) => sum + item.peopleHoursPerMonth, 0);

  let internalSeries = 0;
  let externalSeries = 0;
  let placeholderSeries = 0;
  let flaggedSeries = 0;
  const flagCounts: Record<string, number> = {};

  series.forEach(item => {
    if (item.isPlaceholder) {
      placeholderSeries += 1;
    } else if (item.externalAttendeeCount > 0 && item.internalAttendeeCount === 0) {
      externalSeries += 1;
    } else if (item.internalAttendeeCount > 0) {
      internalSeries += 1;
    }

    if (item.flags.length > 0) {
      flaggedSeries += 1;
    }

    item.flags.forEach(flag => {
      flagCounts[flag] = (flagCounts[flag] || 0) + 1;
    });
  });

  const weeklyHours = weeklyMinutes / 60;
  const monthlyHours = monthlyMinutes / 60;
  const percentOfWorkWeek = baselineWorkWeekHours > 0
    ? (weeklyHours / baselineWorkWeekHours) * 100
    : 0;

  return {
    totalSeries: series.length,
    weeklyHours: roundTwo(weeklyHours),
    monthlyHours: roundTwo(monthlyHours),
    peopleHours: roundTwo(peopleHours),
    percentOfWorkWeek: roundTwo(percentOfWorkWeek),
    internalSeries,
    externalSeries,
    placeholderSeries,
    flaggedSeries,
    flagCounts
  };
};

export const computeRecurringAnalytics = (
  events: CalendarEvent[],
  options: RecurringAnalyticsOptions
): RecurringAnalyticsResult => {
  const { filterStart, filterEnd } = options;
  const now = new Date();

  const recurringEvents = events.filter(event => {
    const hasRecurrence = (event.recurrence && event.recurrence.length > 0) || !!event.recurringEventId;
    if (!hasRecurrence) return false;
    const start = getEventStartTime(event);
    if (!start) return false;
    return start >= filterStart && start <= filterEnd;
  });

  const grouped = new Map<string, CalendarEvent[]>();

  // Helper to create a fallback grouping key when recurringEventId is missing
  const createFallbackKey = (event: CalendarEvent): string => {
    const title = (event.summary || 'untitled').toLowerCase().trim();
    const organizer = (event.organizer?.email || 'unknown').toLowerCase();
    // Include approximate duration to distinguish same-title meetings
    const duration = calculateDuration(
      event.start?.dateTime || event.start?.date,
      event.end?.dateTime || event.end?.date
    ) || 0;
    const durationBucket = Math.round(duration / 15) * 15; // Round to nearest 15 min
    return `fallback:${title}:${organizer}:${durationBucket}`;
  };

  recurringEvents.forEach(event => {
    // Primary grouping: use BASE iCalUID (strips _R{timestamp} suffix for modified instances)
    // Secondary: use recurringEventId (instances of a recurring series)
    // Tertiary: use event id for master events with recurrence rules
    // Fallback: group by title + organizer + duration for edge cases
    let key: string;

    // Extract base iCalUID (strips _R{timestamp}@google.com suffix for modified/rescheduled instances)
    const baseICalUID = extractBaseICalUID(event.iCalUID);

    if (baseICalUID) {
      // Best option: BASE iCalUID groups all instances including rescheduled ones
      key = `ical:${baseICalUID}`;
    } else if (event.recurringEventId) {
      // This is an instance of a recurring event - use the master event ID
      key = `recurring:${event.recurringEventId}`;
    } else if (event.recurrence && event.recurrence.length > 0) {
      // This is a master recurring event (shouldn't happen with singleEvents=true, but handle it)
      key = `master:${event.id}`;
    } else {
      // Fallback for events that should be grouped but lack proper recurring IDs
      key = createFallbackKey(event);
    }

    if (!key) {
      return;
    }
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  });

  const series: RecurringSeriesMetrics[] = [];

  grouped.forEach((groupEvents, key) => {
    const metrics = buildRecurringSeriesMetrics(key, groupEvents, options, now);
    if (metrics) {
      series.push(metrics);
    }
  });

  const baselineWorkWeekHours = options.baselineWorkWeekHours ?? WORK_WEEK_DEFAULT;
  const summary = summarizeRecurringSeries(series, baselineWorkWeekHours);

  const relationships = buildRelationshipSnapshots(
    events,
    toLower(options.ownerEmail),
    options.relationshipWindowStart,
    options.relationshipWindowEnd
  );

  return {
    series,
    summary,
    relationships
  };
};
