import { addWeeks, differenceInCalendarDays, differenceInMinutes, subWeeks } from 'date-fns';
import type { CalendarEvent, CalendarDateTime, CalendarAttendee } from '../types/calendar';
import type {
  MeetingAudience,
  MeetingCadenceSummary,
  MeetingInsight,
  MeetingOccurrence,
  MeetingMetrics,
  RecurringMeetingFilters,
  RecurringMeetingOptions,
  RecurringMeetingSeries
} from '../types/meetings';

const DEFAULT_LOOKBACK_WEEKS = 4;
const DEFAULT_LOOKAHEAD_WEEKS = 4;

type DomainSet = Set<string>;

type MetricComputationContext = {
  referenceDate: Date;
  lookbackWeeks: number;
  lookaheadWeeks: number;
};

const toLower = (value?: string | null) => (value ? value.toLowerCase() : undefined);

const extractDomain = (email?: string | null): string | null => {
  if (!email || !email.includes('@')) {
    return null;
  }
  return email.split('@')[1]?.toLowerCase() ?? null;
};

const parseEventDate = (value?: CalendarDateTime): Date | null => {
  if (!value) {
    return null;
  }
  if (value.dateTime) {
    return new Date(value.dateTime);
  }
  if (value.date) {
    const [year, month, day] = value.date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
};

const safeDifferenceInMinutes = (start: Date | null, end: Date | null): number => {
  if (!start || !end) {
    return 0;
  }
  const diff = differenceInMinutes(end, start);
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
};

const buildResponseStats = (attendees: CalendarAttendee[]) => {
  return attendees.reduce(
    (acc, attendee) => {
      switch (attendee.responseStatus) {
        case 'accepted':
          acc.accepted += 1;
          break;
        case 'declined':
          acc.declined += 1;
          break;
        case 'tentative':
          acc.tentative += 1;
          break;
        default:
          acc.needsAction += 1;
          break;
      }
      return acc;
    },
    { accepted: 0, declined: 0, tentative: 0, needsAction: 0 }
  );
};

const enrichDomainSet = (baseDomains: DomainSet, event: CalendarEvent): DomainSet => {
  const domains = new Set(baseDomains);
  const organizerDomain = extractDomain(event.organizer?.email) || extractDomain(event.creator?.email);
  if (organizerDomain) {
    domains.add(organizerDomain);
  }
  return domains;
};

const buildOccurrence = (event: CalendarEvent, domainSet: DomainSet): MeetingOccurrence | null => {
  const start = parseEventDate(event.start);
  const end = parseEventDate(event.end) ?? start;

  if (!start || !end) {
    return null;
  }

  const attendees = event.attendees ?? [];
  let internalCount = 0;
  let externalCount = 0;

  attendees.forEach((attendee) => {
    const domain = extractDomain(attendee.email);
    if (!domain) {
      return;
    }
    if (domainSet.has(domain)) {
      internalCount += 1;
    } else {
      externalCount += 1;
    }
  });

  const durationMinutes = safeDifferenceInMinutes(start, end);

  return {
    id: `${event.id}-${start.getTime()}`,
    eventId: event.id,
    start,
    end,
    durationMinutes,
    attendees,
    internalCount,
    externalCount,
    totalAttendees: attendees.length,
    hasConferenceLink: Boolean(event.hangoutLink || event.conferenceData?.entryPoints?.length),
    isCancelled: event.status === 'cancelled',
    responseStats: buildResponseStats(attendees)
  };
};

const determineAudience = (occurrences: MeetingOccurrence[]): MeetingAudience => {
  let internal = 0;
  let external = 0;

  occurrences.forEach((occurrence) => {
    internal += occurrence.internalCount;
    external += occurrence.externalCount;
  });

  if (external === 0 && internal > 0) {
    return 'internal';
  }
  if (internal === 0 && external > 0) {
    return 'external';
  }
  if (internal === 0 && external === 0) {
    return 'mixed';
  }
  return 'mixed';
};

const inferCadence = (occurrences: MeetingOccurrence[]): MeetingCadenceSummary => {
  const relevant = occurrences
    .filter((occurrence) => !occurrence.isCancelled)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (relevant.length < 2) {
    return { label: 'Ad hoc' };
  }

  const intervals: number[] = [];
  for (let i = 1; i < relevant.length; i += 1) {
    const interval = Math.abs(differenceInCalendarDays(relevant[i].start, relevant[i - 1].start));
    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (!intervals.length) {
    return { label: 'Ad hoc' };
  }

  const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const roundedInterval = Math.round(averageInterval);

  if (Math.abs(averageInterval - 7) <= 1) {
    return { label: 'Weekly', intervalDays: roundedInterval };
  }
  if (Math.abs(averageInterval - 14) <= 1) {
    return { label: 'Bi-weekly', intervalDays: roundedInterval };
  }
  if (averageInterval >= 27 && averageInterval <= 32) {
    return { label: 'Monthly', intervalDays: roundedInterval };
  }
  if (averageInterval <= 3) {
    return { label: 'Multiple times / week', intervalDays: roundedInterval };
  }

  return { label: `${roundedInterval}-day cadence`, intervalDays: roundedInterval };
};

const buildAttendanceTrend = (
  occurrences: MeetingOccurrence[],
  context: MetricComputationContext
): number[] => {
  const { referenceDate, lookbackWeeks } = context;
  const trend: number[] = [];

  for (let week = lookbackWeeks; week > 0; week -= 1) {
    const periodEnd = subWeeks(referenceDate, week - 1);
    const periodStart = subWeeks(referenceDate, week);

    const windowOccurrences = occurrences.filter(
      (occurrence) =>
        !occurrence.isCancelled &&
        occurrence.start >= periodStart &&
        occurrence.start < periodEnd
    );

    if (!windowOccurrences.length) {
      trend.push(0);
      continue;
    }

    const totalAttendees = windowOccurrences.reduce(
      (sum, occurrence) => sum + occurrence.totalAttendees,
      0
    );

    const average = totalAttendees / windowOccurrences.length;
    trend.push(Math.round(average * 10) / 10);
  }

  return trend;
};

const buildMetrics = (
  occurrences: MeetingOccurrence[],
  context: MetricComputationContext
): { metrics: MeetingMetrics; windowStart: Date; windowEnd: Date } => {
  const { referenceDate, lookbackWeeks, lookaheadWeeks } = context;
  const windowStart = subWeeks(referenceDate, lookbackWeeks);
  const windowEnd = addWeeks(referenceDate, lookaheadWeeks);

  const inWindow = occurrences.filter(
    (occurrence) => occurrence.start >= windowStart && occurrence.start <= windowEnd
  );

  const activeOccurrences = inWindow.filter((occurrence) => !occurrence.isCancelled);
  const totalOccurrences = inWindow.length;

  const pastMonthOccurrences = activeOccurrences.filter(
    (occurrence) => occurrence.start < referenceDate
  );
  const nextMonthOccurrences = activeOccurrences.filter(
    (occurrence) => occurrence.start >= referenceDate
  );

  const totalPastMinutes = pastMonthOccurrences.reduce(
    (sum, occurrence) => sum + occurrence.durationMinutes,
    0
  );

  const averageDurationMinutes = activeOccurrences.length
    ? Math.round(
        (activeOccurrences.reduce((sum, occurrence) => sum + occurrence.durationMinutes, 0) /
          activeOccurrences.length) *
          10
      ) / 10
    : 0;

  const cancellationRate = totalOccurrences
    ? inWindow.filter((occurrence) => occurrence.isCancelled).length / totalOccurrences
    : 0;

  const totalAttendance = activeOccurrences.reduce(
    (sum, occurrence) => sum + occurrence.totalAttendees,
    0
  );

  const totalExternal = activeOccurrences.reduce(
    (sum, occurrence) => sum + occurrence.externalCount,
    0
  );

  const averageAttendance = activeOccurrences.length
    ? Math.round((totalAttendance / activeOccurrences.length) * 10) / 10
    : 0;

  const externalRatio = totalAttendance ? Math.round((totalExternal / totalAttendance) * 100) / 100 : 0;

  return {
    metrics: {
      totalOccurrences,
      pastMonthOccurrences: pastMonthOccurrences.length,
      nextMonthOccurrences: nextMonthOccurrences.length,
      averageDurationMinutes,
      totalPastMinutes,
      cancellationRate,
      averageAttendance,
      externalRatio,
      attendanceTrend: buildAttendanceTrend(occurrences, context)
    },
    windowStart,
    windowEnd
  };
};

const buildTimeline = (
  occurrences: MeetingOccurrence[],
  windowStart: Date,
  windowEnd: Date,
  referenceDate: Date
) => {
  const past = occurrences.filter(
    (occurrence) =>
      occurrence.start >= windowStart &&
      occurrence.start < referenceDate
  );

  const upcoming = occurrences.filter(
    (occurrence) =>
      occurrence.start >= referenceDate &&
      occurrence.start <= windowEnd
  );

  return {
    past,
    upcoming
  };
};

const buildInsights = (series: RecurringMeetingSeries): MeetingInsight[] => {
  const insights: MeetingInsight[] = [];
  const { metrics, audience, cadence, nextOccurrence } = series;

  const addInsight = (tone: MeetingInsight['tone'], message: string) => {
    insights.push({
      id: `${series.id}-${tone}-${insights.length + 1}`,
      tone,
      message
    });
  };

  if (metrics.cancellationRate >= 0.25) {
    addInsight('warning', 'High cancellation rate over the observed period.');
  }

  if (metrics.averageDurationMinutes >= 60) {
    addInsight('warning', 'Average duration exceeds 60 minutes. Consider trimming the agenda.');
  }

  if (metrics.averageAttendance <= 3 && metrics.totalOccurrences >= 2) {
    addInsight('warning', 'Low engagement — average attendance is below 3 attendees.');
  }

  if (metrics.externalRatio >= 0.5) {
    addInsight('info', 'Majority of attendees are external partners. Ensure the prep is client-ready.');
  }

  if (audience === 'internal' && metrics.externalRatio === 0 && metrics.pastMonthOccurrences >= 3) {
    addInsight('positive', 'Purely internal collaboration. Great candidate for async updates if focus time is needed.');
  }

  if (!metrics.nextMonthOccurrences) {
    addInsight('info', 'No upcoming occurrences scheduled for the next month. Decide if the series is still required.');
  }

  if (metrics.totalPastMinutes >= 300) {
    addInsight('info', 'This series consumed over five hours in the last month. Validate the ROI.');
  }

  if (cadence.intervalDays && cadence.intervalDays > 14 && metrics.nextMonthOccurrences <= 1) {
    addInsight('info', 'Long cadence with few upcoming instances — ensure stakeholders stay aligned between meetings.');
  }

  if (!insights.length && nextOccurrence) {
    addInsight('positive', 'Healthy recurring meeting with steady attendance.');
  }

  return insights;
};

export const normalizeRecurringMeetings = (
  events: CalendarEvent[],
  options?: RecurringMeetingOptions
): RecurringMeetingSeries[] => {
  if (!events?.length) {
    return [];
  }

  const {
    internalDomains = [],
    referenceDate = new Date(),
    lookbackWeeks = DEFAULT_LOOKBACK_WEEKS,
    lookaheadWeeks = DEFAULT_LOOKAHEAD_WEEKS
  } = options || {};

  const normalizedDomains: DomainSet = new Set(
    internalDomains.map((domain) => toLower(domain)).filter((domain): domain is string => Boolean(domain))
  );

  const groups = new Map<string, CalendarEvent[]>();

  events.forEach((event) => {
    if (!event) {
      return;
    }

    const isRecurring = Boolean(event.recurringEventId || (event.recurrence && event.recurrence.length > 0));
    if (!isRecurring) {
      return;
    }

    const seriesId = event.recurringEventId || event.id;
    if (!seriesId) {
      return;
    }

    const group = groups.get(seriesId) ?? [];
    group.push(event);
    groups.set(seriesId, group);
  });

  const context: MetricComputationContext = {
    referenceDate,
    lookbackWeeks,
    lookaheadWeeks
  };

  const seriesList: RecurringMeetingSeries[] = [];

  groups.forEach((groupEvents, seriesId) => {
    const domains = enrichDomainSet(normalizedDomains, groupEvents[0]);
    const occurrences: MeetingOccurrence[] = [];

    groupEvents.forEach((event) => {
      const domainSet = enrichDomainSet(domains, event);
      const occurrence = buildOccurrence(event, domainSet);
      if (occurrence) {
        occurrences.push(occurrence);
      }
    });

    if (!occurrences.length) {
      return;
    }

    occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());

    const { metrics, windowStart, windowEnd } = buildMetrics(occurrences, context);
    const timeline = buildTimeline(occurrences, windowStart, windowEnd, referenceDate);
    const nextOccurrence = timeline.upcoming.find((occurrence) => !occurrence.isCancelled);
    const lastOccurrence = [...timeline.past].reverse().find((occurrence) => !occurrence.isCancelled);

    const series: RecurringMeetingSeries = {
      id: seriesId,
      title: groupEvents[0]?.summary || 'Untitled meeting',
      owner: groupEvents[0]?.organizer?.email || groupEvents[0]?.creator?.email,
      audience: determineAudience(occurrences),
      cadence: inferCadence(occurrences),
      occurrences,
      metrics,
      insights: [],
      timeline,
      nextOccurrence,
      lastOccurrence,
      referenceDate
    };

    series.insights = buildInsights(series);
    seriesList.push(series);
  });

  seriesList.sort((a, b) => {
    const aTime = a.nextOccurrence?.start.getTime() ?? a.lastOccurrence?.start.getTime() ?? 0;
    const bTime = b.nextOccurrence?.start.getTime() ?? b.lastOccurrence?.start.getTime() ?? 0;
    return aTime - bTime;
  });

  return seriesList;
};

export const filterRecurringMeetings = (
  series: RecurringMeetingSeries[],
  filters: RecurringMeetingFilters
) => {
  const searchQuery = filters.search.trim().toLowerCase();

  return series.filter((item) => {
    if (filters.audience !== 'all' && item.audience !== filters.audience) {
      return false;
    }

    if (!filters.showCancelled && item.metrics.totalOccurrences === 0) {
      return false;
    }

    if (searchQuery) {
      const haystack = [item.title, item.owner]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchQuery)) {
        return false;
      }
    }

    return true;
  });
};

export const summarizeRecurringMeetings = (
  events: CalendarEvent[],
  options?: RecurringMeetingOptions
) => {
  const series = normalizeRecurringMeetings(events, options);
  return {
    series,
    generatedAt: options?.referenceDate ?? new Date()
  };
};

export const getMeetingAudience = (occurrences: MeetingOccurrence[]): MeetingAudience => {
  return determineAudience(occurrences);
};

export const getMeetingCadence = (occurrences: MeetingOccurrence[]): MeetingCadenceSummary => {
  return inferCadence(occurrences);
};

export { DEFAULT_LOOKBACK_WEEKS, DEFAULT_LOOKAHEAD_WEEKS };
