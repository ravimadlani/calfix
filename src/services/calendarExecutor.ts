import { addDays, addMinutes, endOfMonth, endOfWeek, max, min, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type {
  ActionPreviewItem,
  CalendarEvent,
  ConflictCheck,
  EventWithGap,
  Intent,
  IntentExecutionContext,
  IntentExecutionResult,
  IntentParameters,
  SlotSuggestion,
  TimezoneConstraint
} from '../types';
import { formatInTimezone, getTimePartsInTimezone } from '../utils/timezoneHelper';

const DEFAULT_DURATION = 30;
const DEFAULT_BUFFER_MINUTES = 15;
const MAX_SLOTS = 20;

interface BusyInterval {
  start: Date;
  end: Date;
  event: CalendarEvent;
}

interface AvailabilityRange {
  start: Date;
  end: Date;
  label: string;
}

const ensureDuration = (params: IntentParameters): number => {
  if (typeof params.duration === 'number' && Number.isFinite(params.duration) && params.duration > 0) {
    return params.duration;
  }
  return DEFAULT_DURATION;
};

const getEventDate = (dateLike?: { dateTime?: string; date?: string }): Date | null => {
  if (!dateLike) {
    return null;
  }
  if (dateLike.dateTime) {
    const parsed = new Date(dateLike.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (dateLike.date) {
    const [year, month, day] = dateLike.date.split('-').map(Number);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    return new Date(year, month - 1, day);
  }
  return null;
};

const normalizeEventInterval = (event: CalendarEvent): BusyInterval | null => {
  const start = getEventDate(event.start);
  const endRaw = getEventDate(event.end);
  if (!start || !endRaw) {
    return null;
  }

  const end = endRaw <= start ? addMinutes(start, DEFAULT_DURATION) : endRaw;
  return { start, end, event };
};

const determineRange = (
  params: IntentParameters,
  context: IntentExecutionContext
): AvailabilityRange => {
  const baseDate = context.currentDate;
  const labelForRange = (label: string, start: Date, end: Date): AvailabilityRange => ({
    start,
    end,
    label
  });

  if (params.custom_dates && params.custom_dates.length > 0) {
    const dates = params.custom_dates
      .map(dateStr => {
        const parsed = new Date(dateStr);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      })
      .filter((date): date is Date => Boolean(date));

    if (dates.length > 0) {
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      const start = startOfDay(sorted[0]);
      const end = addDays(startOfDay(sorted[sorted.length - 1]), 1);
      return labelForRange('Custom Dates', start, end);
    }
  }

  switch (params.date_range) {
    case 'today': {
      const start = startOfDay(baseDate);
      const end = addDays(start, 1);
      return labelForRange('Today', start, end);
    }
    case 'tomorrow': {
      const start = startOfDay(addDays(baseDate, 1));
      const end = addDays(start, 1);
      return labelForRange('Tomorrow', start, end);
    }
    case 'this_week': {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = addDays(endOfWeek(baseDate, { weekStartsOn: 1 }), 1);
      return labelForRange('This Week', start, end);
    }
    case 'next_week': {
      const nextWeekStart = startOfWeek(addDays(baseDate, 7), { weekStartsOn: 1 });
      const end = addDays(endOfWeek(addDays(baseDate, 7), { weekStartsOn: 1 }), 1);
      return labelForRange('Next Week', nextWeekStart, end);
    }
    case 'this_month': {
      const start = startOfMonth(baseDate);
      const end = addDays(endOfMonth(baseDate), 1);
      return labelForRange('This Month', start, end);
    }
    case 'next_month': {
      const nextMonthDate = addDays(startOfMonth(baseDate), 32);
      const start = startOfMonth(nextMonthDate);
      const end = addDays(endOfMonth(nextMonthDate), 1);
      return labelForRange('Next Month', start, end);
    }
    default: {
      if (context.timeRange) {
        const start = new Date(context.timeRange.timeMin);
        const end = new Date(context.timeRange.timeMax);
        return labelForRange('Current View', start, end);
      }
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = addDays(endOfWeek(baseDate, { weekStartsOn: 1 }), 1);
      return labelForRange('This Week', start, end);
    }
  }
};

const mergeIntervals = (intervals: BusyInterval[]): BusyInterval[] => {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: BusyInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = result[result.length - 1];
    if (current.start <= last.end) {
      last.end = current.end > last.end ? current.end : last.end;
    } else {
      result.push(current);
    }
  }

  return result;
};

const collectBusyIntervals = (
  events: CalendarEvent[],
  range: AvailabilityRange
): BusyInterval[] => {
  const intervals = events
    .map(normalizeEventInterval)
    .filter((interval): interval is BusyInterval => Boolean(interval))
    .filter(interval => interval.end > range.start && interval.start < range.end);

  return mergeIntervals(intervals);
};

const clampIntervalToDay = (
  interval: BusyInterval,
  dayStart: Date,
  dayEnd: Date
): BusyInterval | null => {
  const start = max([interval.start, dayStart]);
  const end = min([interval.end, dayEnd]);
  if (start >= end) {
    return null;
  }
  return { ...interval, start, end };
};

const generateDailyFreeIntervals = (
  busy: BusyInterval[],
  range: AvailabilityRange
): Array<{ start: Date; end: Date }> => {
  const intervals: Array<{ start: Date; end: Date }> = [];
  let cursor = startOfDay(range.start);

  while (cursor < range.end) {
    const dayStart = max([cursor, range.start]);
    const dayEnd = min([addDays(startOfDay(cursor), 1), range.end]);
    const dayBusy = busy
      .map(interval => clampIntervalToDay(interval, dayStart, dayEnd))
      .filter((interval): interval is BusyInterval => Boolean(interval));

    let pointer = dayStart;
    dayBusy.forEach(interval => {
      if (interval.start > pointer) {
        intervals.push({ start: pointer, end: interval.start });
      }
      pointer = interval.end > pointer ? interval.end : pointer;
    });

    if (pointer < dayEnd) {
      intervals.push({ start: pointer, end: dayEnd });
    }

    cursor = addDays(startOfDay(cursor), 1);
  }

  return intervals;
};

const withinWorkingHours = (
  start: Date,
  end: Date,
  timezone: string,
  hoursStart: number,
  hoursEnd: number
): boolean => {
  const startParts = getTimePartsInTimezone(start, timezone);
  const endParts = getTimePartsInTimezone(end, timezone);
  const startDecimal = startParts.hour + startParts.minute / 60;
  const endDecimal = endParts.hour + endParts.minute / 60;
  return startDecimal >= hoursStart && endDecimal <= hoursEnd;
};

const meetsTimezoneConstraints = (
  start: Date,
  end: Date,
  constraints: TimezoneConstraint[],
  fallbackTimezone: string,
  workingHoursOnly: boolean
): boolean => {
  const baseHoursStart = workingHoursOnly ? 9 : 0;
  const baseHoursEnd = workingHoursOnly ? 17 : 24;

  const baseCheck = withinWorkingHours(start, end, fallbackTimezone, baseHoursStart, baseHoursEnd);
  if (!baseCheck) {
    return false;
  }

  return constraints.every(constraint =>
    withinWorkingHours(start, end, constraint.timezone, constraint.hoursStart, constraint.hoursEnd)
  );
};

const buildSlotSuggestion = (
  start: Date,
  durationMinutes: number,
  context: IntentExecutionContext,
  constraints: TimezoneConstraint[],
  workingHoursOnly: boolean
): SlotSuggestion | null => {
  const end = addMinutes(start, durationMinutes);
  const allConstraints = constraints ?? [];
  if (!meetsTimezoneConstraints(start, end, allConstraints, context.timezone, workingHoursOnly)) {
    return null;
  }

  const timezoneSummaries: SlotSuggestion['timezoneSummaries'] = [];
  const seen = new Set<string>();
  const pushSummary = (timezone: string) => {
    if (seen.has(timezone)) {
      return;
    }
    timezoneSummaries.push({
      timezone,
      formatted: formatInTimezone(start, timezone, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      })
    });
    seen.add(timezone);
  };

  pushSummary(context.timezone);
  allConstraints.forEach(constraint => pushSummary(constraint.timezone));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    isWithinConstraints: true,
    timezoneSummaries
  };
};

const computeAvailability = (
  intent: Intent,
  context: IntentExecutionContext,
  override?: { workingHoursOnly?: boolean; timezoneConstraints?: TimezoneConstraint[] }
): { slots: SlotSuggestion[]; range: AvailabilityRange; durationMinutes: number; workingHoursOnly: boolean; timezoneConstraints: TimezoneConstraint[] } => {
  const durationMinutes = ensureDuration(intent.params);
  const range = determineRange(intent.params, context);
  const busyIntervals = collectBusyIntervals(context.events, range);
  const freeIntervals = generateDailyFreeIntervals(busyIntervals, range);
  const timezoneConstraints = override?.timezoneConstraints ?? intent.params.timezone_constraints ?? [];
  const workingHoursOnly = override?.workingHoursOnly ?? Boolean(intent.params.working_hours_only || timezoneConstraints.length > 0);

  const slots: SlotSuggestion[] = [];
  freeIntervals.forEach(interval => {
    let pointer = new Date(interval.start);
    while (pointer < interval.end) {
      const slot = buildSlotSuggestion(pointer, durationMinutes, context, timezoneConstraints, workingHoursOnly);
      if (slot) {
        slots.push(slot);
        if (slots.length >= MAX_SLOTS) {
          return;
        }
      }
      pointer = addMinutes(pointer, durationMinutes);
    }
  });

  return {
    slots,
    range,
    durationMinutes,
    workingHoursOnly,
    timezoneConstraints
  };
};

const formatRangeSummary = (range: AvailabilityRange, timezone: string): string => {
  const startStr = formatInTimezone(range.start, timezone, { month: 'short', day: 'numeric' });
  const endStr = formatInTimezone(addMinutes(range.end, -1), timezone, { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}`;
};

const executeFindAvailability = (
  intent: Intent,
  context: IntentExecutionContext,
  options?: { labelOverride?: string; timezoneConstraints?: TimezoneConstraint[] }
): IntentExecutionResult => {
  const availability = computeAvailability(intent, context, {
    timezoneConstraints: options?.timezoneConstraints
  });

  const summaryRange = formatRangeSummary(availability.range, context.timezone);
  const slotCount = availability.slots.length;
  const summary = slotCount > 0
    ? `Found ${slotCount} open slot${slotCount === 1 ? '' : 's'} for ${availability.durationMinutes}-minute meetings (${summaryRange}).`
    : `No open slots found for ${availability.durationMinutes}-minute meetings (${summaryRange}).`;

  return {
    intentType: intent.type,
    status: 'success',
    title: options?.labelOverride ?? 'Availability Results',
    summary,
    slots: availability.slots,
    suggestions: slotCount === 0
      ? ['Try adjusting the date range or relaxing timezone constraints.', 'Consider asking for different durations.']
      : undefined,
    meta: {
      range: availability.range,
      workingHoursOnly: availability.workingHoursOnly,
      timezoneConstraints: availability.timezoneConstraints
    }
  };
};

const gatherConflicts = (
  proposedTimes: NonNullable<IntentParameters['proposed_times']>,
  intent: Intent,
  context: IntentExecutionContext
): { conflicts: ConflictCheck[]; duration: number } => {
  const durationMinutes = ensureDuration(intent.params);

  const conflicts: ConflictCheck[] = proposedTimes.map(proposed => {
    const start = new Date(proposed.start);
    if (Number.isNaN(start.getTime())) {
      return {
        proposed,
        status: 'conflict',
        conflictingEvents: []
      };
    }

    const end = proposed.end ? new Date(proposed.end) : addMinutes(start, proposed.durationMinutes ?? durationMinutes);
    const overlapping = context.events
      .map(event => normalizeEventInterval(event))
      .filter((interval): interval is BusyInterval => Boolean(interval))
      .filter(interval => interval.start < end && interval.end > start)
      .map(interval => ({
        id: interval.event.id,
        summary: interval.event.summary,
        start: interval.event.start,
        end: interval.event.end
      }));

    return {
      proposed,
      status: overlapping.length > 0 ? 'conflict' : 'free',
      conflictingEvents: overlapping
    };
  });

  return { conflicts, duration: durationMinutes };
};

const executeCheckConflicts = (intent: Intent, context: IntentExecutionContext): IntentExecutionResult => {
  const proposedTimes = intent.params.proposed_times;
  if (!proposedTimes || proposedTimes.length === 0) {
    return {
      intentType: intent.type,
      status: 'error',
      title: 'Conflict Check',
      summary: 'No proposed times were provided to evaluate.'
    };
  }

  const { conflicts } = gatherConflicts(proposedTimes, intent, context);
  const freeCount = conflicts.filter(conflict => conflict.status === 'free').length;
  const summary = `You are free for ${freeCount} of ${conflicts.length} proposed option${conflicts.length === 1 ? '' : 's'}.`;

  return {
    intentType: intent.type,
    status: 'success',
    title: 'Conflict Check',
    summary,
    conflicts,
    suggestions: freeCount === 0
      ? ['Consider suggesting an alternative slot using "find availability".', 'Try shortening the requested duration.']
      : undefined
  };
};

const formatList = (values: string[]): string => {
  if (values.length === 0) {
    return '';
  }
  if (values.length === 1) {
    return values[0];
  }
  return `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`;
};

const executeRespondToRequest = (intent: Intent, context: IntentExecutionContext): IntentExecutionResult => {
  const proposedTimes = intent.params.proposed_times;
  if (!proposedTimes || proposedTimes.length === 0) {
    return {
      intentType: intent.type,
      status: 'error',
      title: 'Meeting Response',
      summary: 'No proposed times were provided to respond to.'
    };
  }

  const { conflicts } = gatherConflicts(proposedTimes, intent, context);
  const freeSlots = conflicts.filter(conflict => conflict.status === 'free');
  const busySlots = conflicts.filter(conflict => conflict.status === 'conflict');

  const freeDescriptions = freeSlots.map(slot => formatInTimezone(new Date(slot.proposed.start), context.timezone, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit'
  }));

  const busyDescriptions = busySlots.map(slot => {
    const firstConflict = slot.conflictingEvents[0];
    const conflictLabel = firstConflict?.summary ?? 'another commitment';
    const timeLabel = formatInTimezone(new Date(slot.proposed.start), context.timezone, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${timeLabel} (${conflictLabel})`;
  });

  let draftResponse = '';
  if (freeDescriptions.length > 0) {
    draftResponse += `I'm available ${formatList(freeDescriptions)}.`;
  }
  if (busyDescriptions.length > 0) {
    draftResponse += `${draftResponse ? ' ' : ''}Unfortunately ${formatList(busyDescriptions)} ${busyDescriptions.length === 1 ? 'does' : 'do'} not work.`;
  }
  if (freeDescriptions.length === 0) {
    draftResponse += `${draftResponse ? ' ' : ''}Could we explore some different options?`;
  }

  const summary = freeDescriptions.length > 0
    ? `Ready to confirm ${freeDescriptions.length} option${freeDescriptions.length === 1 ? '' : 's'}.`
    : 'No proposed times fit your calendar.';

  return {
    intentType: intent.type,
    status: 'success',
    title: 'Draft Response',
    summary,
    conflicts,
    draftResponse,
    suggestions: freeDescriptions.length === 0 ? ['Ask CalFix to find availability for you.', 'Offer to share a few alternate windows.'] : undefined
  };
};

const BUFFER_STATUSES = new Set(['back-to-back', 'insufficient-buffer']);

const gatherBufferTargets = (
  events: EventWithGap[] | undefined,
  position: 'before' | 'after'
): CalendarEvent[] => {
  if (!events || events.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const results: CalendarEvent[] = [];

  events.forEach(event => {
    const gap = event.gapAfter;
    if (!gap || !BUFFER_STATUSES.has(gap.status)) {
      return;
    }

    const target = position === 'before' ? gap.beforeEvent : gap.afterEvent;
    if (!target) {
      return;
    }

    const key = `${target.id ?? 'unknown'}:${target.start?.dateTime ?? target.start?.date ?? ''}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    results.push(target);
  });

  return results;
};

const executeBulkAction = async (
  intent: Intent,
  context: IntentExecutionContext
): Promise<IntentExecutionResult> => {
  const actionType = intent.params.action_type ?? 'unknown';
  const horizonEnd = addDays(context.currentDate, 7);
  const relevantEvents = context.events
    .map(event => ({
      event,
      interval: normalizeEventInterval(event)
    }))
    .filter(({ interval }) => interval !== null)
    .filter(({ interval }) => interval!.start >= context.currentDate && interval!.start <= horizonEnd)
    .slice(0, 10);

  const preview: ActionPreviewItem[] = relevantEvents.map(({ event, interval }) => ({
    eventId: event.id,
    summary: event.summary ?? 'Untitled meeting',
    originalStart: interval!.start.toISOString(),
    originalEnd: interval!.end.toISOString(),
    proposedChange: (() => {
      switch (actionType) {
        case 'add_buffers_before':
          return `Add a ${DEFAULT_BUFFER_MINUTES}-minute buffer before start.`;
        case 'add_buffers_after':
          return `Add a ${DEFAULT_BUFFER_MINUTES}-minute buffer after end.`;
        case 'add_focus_blocks':
          return 'Insert 2-hour focus block on free days.';
        case 'clear_after_hours':
          return 'Review and clear meetings after 6:00 PM.';
        case 'remove_after_hours':
          return 'Remove holds scheduled outside business hours.';
        default:
          return 'Preview suggested adjustments.';
      }
    })()
  }));

  const summary = preview.length > 0
    ? `Previewing ${preview.length} event${preview.length === 1 ? '' : 's'} for ${actionType.replace(/_/g, ' ')}.`
    : 'No upcoming meetings found in the next 7 days to adjust.';

  if ((actionType === 'add_buffers_after' || actionType === 'add_buffers_before') && context.actions?.applyBuffers) {
    const position = actionType === 'add_buffers_before' ? 'before' : 'after';
    const targets = gatherBufferTargets(context.eventsWithGaps, position);

    if (targets.length === 0) {
      return {
        intentType: intent.type,
        status: 'success',
        title: 'No Buffers Needed',
        summary: 'I looked at your upcoming meetings and they already have adequate buffers.',
        suggestions: ['Try a different time range or run a conflict check to confirm availability.'],
        meta: { executed: false }
      };
    }

    try {
      const result = await context.actions.applyBuffers({
        position,
        events: targets,
        bufferMinutes: intent.params.duration ?? DEFAULT_BUFFER_MINUTES
      });

      const appliedCount = result.appliedCount ?? targets.length;
      const title = position === 'before' ? 'Buffers Added Before Meetings' : 'Buffers Added After Meetings';
      const summaryText = appliedCount > 0
        ? `Added ${appliedCount} buffer${appliedCount === 1 ? '' : 's'} to upcoming meetings.`
        : 'No buffers were added.';

      return {
        intentType: intent.type,
        status: 'success',
        title,
        summary: summaryText,
        suggestions: appliedCount === 0
          ? ['All set for now! Try asking for availability or drafting a reply next.']
          : ['Let me know if you want to adjust a specific meeting or find more time.'],
        meta: { executed: true, appliedCount }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add buffers.';
      return {
        intentType: intent.type,
        status: 'error',
        title: 'Buffer Action Failed',
        summary: message,
        suggestions: ['Try running the quick action from the dashboard.', 'Check calendar permissions and try again.'],
        meta: { executed: false }
      };
    }
  }

  return {
    intentType: intent.type,
    status: 'success',
    title: 'Bulk Action Preview',
    summary,
    actionPreview: preview,
    suggestions: preview.length === 0
      ? ['Expand the lookahead window or connect additional calendars.', 'Try running availability to ensure events are loaded.']
      : ['Confirm if you would like CalFix to apply these changes.', 'Adjust the command to target a specific date range if needed.']
  };
};

const executeFocusBlock = async (
  intent: Intent,
  context: IntentExecutionContext
): Promise<IntentExecutionResult> => {
  const durationMinutes = ensureDuration(intent.params) || 120;
  const override: IntentParameters = {
    ...intent.params,
    duration: durationMinutes,
    working_hours_only: true
  };

  const availability = computeAvailability({ ...intent, params: override }, context);
  const preferred = intent.params.focus_preferences ?? 'morning';

  const pickSlot = (): SlotSuggestion | undefined => {
    const slots = availability.slots;
    if (slots.length === 0) {
      return undefined;
    }
    const preferenceCheck = (slot: SlotSuggestion): boolean => {
      const start = new Date(slot.start);
      const { hour } = getTimePartsInTimezone(start, context.timezone);
      if (preferred === 'morning') {
        return hour < 12;
      }
      if (preferred === 'afternoon') {
        return hour >= 12 && hour < 17;
      }
      if (preferred === 'evening') {
        return hour >= 17;
      }
      return true;
    };

    const match = slots.find(preferenceCheck);
    return match ?? slots[0];
  };

  const recommended = pickSlot();

  if (!recommended) {
    return {
      intentType: intent.type,
      status: 'success',
      title: 'Focus Time Recommendation',
      summary: 'No suitable focus block found in the current range.',
      suggestions: ['Adjust the timeframe or reduce the duration for more options.', 'Try a different day preference (e.g., mornings).']
    };
  }

  const summary = `Recommended focus block on ${formatInTimezone(new Date(recommended.start), context.timezone, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit'
  })} for ${durationMinutes} minutes.`;

  if (!context.actions?.createFocusBlock) {
    return {
      intentType: intent.type,
      status: 'success',
      title: 'Focus Time Recommendation',
      summary,
      slots: [recommended],
      suggestions: ['Add this block to your calendar to protect focus time.', 'Consider making it recurring if it works well.'],
      meta: { executed: false }
    };
  }

  try {
    await context.actions.createFocusBlock(recommended);
    return {
      intentType: intent.type,
      status: 'success',
      title: 'Focus Time Scheduled',
      summary: `Scheduled a focus block starting ${formatInTimezone(new Date(recommended.start), context.timezone, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit'
      })}.`,
      slots: [recommended],
      suggestions: ['Let me know if you want to make this recurring or adjust the duration.'],
      meta: { executed: true }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to schedule focus block.';
    return {
      intentType: intent.type,
      status: 'error',
      title: 'Focus Block Failed',
      summary: message,
      slots: [recommended],
      suggestions: ['Try again later or add the focus block manually from the calendar view.'],
      meta: { executed: false }
    };
  }
};

const executeSuggestReschedule = (intent: Intent, context: IntentExecutionContext): IntentExecutionResult => {
  const availability = computeAvailability(intent, context, { workingHoursOnly: true });
  const bestSlot = availability.slots[0];

  const summary = bestSlot
    ? `Earliest available option: ${formatInTimezone(new Date(bestSlot.start), context.timezone, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit'
      })}.`
    : 'No alternate time was found in the requested window.';

  return {
    intentType: intent.type,
    status: 'success',
    title: 'Reschedule Suggestions',
    summary,
    slots: bestSlot ? [bestSlot] : undefined,
    suggestions: bestSlot
      ? ['Confirm the move or request another option.', 'Share this slot with attendees to confirm.']
      : ['Try extending the date range or reducing the duration.']
  };
};

export const executeIntent = async (
  intent: Intent,
  context: IntentExecutionContext
): Promise<IntentExecutionResult> => {
  switch (intent.type) {
    case 'find_availability':
      return executeFindAvailability(intent, context);
    case 'multi_timezone_query':
      return executeFindAvailability(intent, context, {
        labelOverride: 'Multi-Timezone Availability',
        timezoneConstraints: intent.params.timezone_constraints ?? []
      });
    case 'check_conflicts':
      return executeCheckConflicts(intent, context);
    case 'respond_to_request':
      return executeRespondToRequest(intent, context);
    case 'bulk_action':
      return executeBulkAction(intent, context);
    case 'create_focus_block':
      return executeFocusBlock(intent, context);
    case 'suggest_reschedule':
      return executeSuggestReschedule(intent, context);
    default:
      return {
        intentType: intent.type,
        status: 'error',
        title: 'Intent Not Supported',
        summary: 'This intent is not recognized yet.'
      };
  }
};
