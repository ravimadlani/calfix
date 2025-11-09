import { addDays } from 'date-fns';
import type {
  Intent,
  IntentParameters,
  IntentType,
  NaturalLanguageContext,
  ParsedIntentResult,
  ProposedTime,
  TimezoneConstraint,
  BulkActionType
} from '../types';

const TIMEZONE_ALIASES: Record<string, { timezone: string; label: string }> = {
  est: { timezone: 'America/New_York', label: 'EST' },
  edt: { timezone: 'America/New_York', label: 'ET' },
  eastern: { timezone: 'America/New_York', label: 'Eastern' },
  pst: { timezone: 'America/Los_Angeles', label: 'PST' },
  pdt: { timezone: 'America/Los_Angeles', label: 'PT' },
  pacific: { timezone: 'America/Los_Angeles', label: 'Pacific' },
  cst: { timezone: 'America/Chicago', label: 'CST' },
  cdt: { timezone: 'America/Chicago', label: 'CT' },
  mst: { timezone: 'America/Denver', label: 'MST' },
  mdt: { timezone: 'America/Denver', label: 'MT' },
  gmt: { timezone: 'Europe/London', label: 'GMT' },
  bst: { timezone: 'Europe/London', label: 'BST' },
  uk: { timezone: 'Europe/London', label: 'UK' },
  london: { timezone: 'Europe/London', label: 'London' },
  europe: { timezone: 'Europe/London', label: 'Europe/London' },
  cet: { timezone: 'Europe/Berlin', label: 'CET' },
  cest: { timezone: 'Europe/Berlin', label: 'CEST' },
  ist: { timezone: 'Asia/Kolkata', label: 'IST' },
  india: { timezone: 'Asia/Kolkata', label: 'India' },
  tokyo: { timezone: 'Asia/Tokyo', label: 'Tokyo' },
  jst: { timezone: 'Asia/Tokyo', label: 'JST' },
  sgt: { timezone: 'Asia/Singapore', label: 'SGT' },
  singapore: { timezone: 'Asia/Singapore', label: 'Singapore' },
  nyc: { timezone: 'America/New_York', label: 'NYC' },
  'new york': { timezone: 'America/New_York', label: 'New York' }
};

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6
};

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11
};

const DEFAULT_DURATION_MINUTES = 30;

const numberFromOrdinal = (value: string): number => {
  return Number.parseInt(value.replace(/(st|nd|rd|th)$/i, ''), 10);
};

const getNextDayOfWeek = (dayIndex: number, referenceDate: Date): Date => {
  const result = new Date(referenceDate);
  const currentDay = referenceDate.getDay();
  let delta = dayIndex - currentDay;
  if (delta <= 0) {
    delta += 7;
  }
  return addDays(result, delta);
};

const setTime = (date: Date, hour: number, minute: number): Date => {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  return copy;
};

const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

const convertHourTo24 = (hourValue: number, meridiem?: string): number => {
  if (!meridiem) {
    return hourValue;
  }
  const normalized = meridiem.toLowerCase();
  if (normalized.startsWith('a')) {
    return hourValue === 12 ? 0 : hourValue;
  }
  return hourValue === 12 ? 12 : hourValue + 12;
};

const extractDurationMinutes = (text: string): number | undefined => {
  const match = text.match(/(\d{1,3})\s*(minute|min|mins|m)\b/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  const hourMatch = text.match(/(\d{1,2})\s*(hour|hr|hrs)\b/i);
  if (hourMatch) {
    return Number.parseInt(hourMatch[1], 10) * 60;
  }
  return undefined;
};

const detectDateRange = (text: string): IntentParameters['date_range'] => {
  if (text.includes('tomorrow')) {
    return 'tomorrow';
  }
  if (text.includes('today')) {
    return 'today';
  }
  if (text.includes('next month')) {
    return 'next_month';
  }
  if (text.includes('this month')) {
    return 'this_month';
  }
  if (text.includes('next week')) {
    return 'next_week';
  }
  if (text.includes('this week')) {
    return 'this_week';
  }
  return undefined;
};

const hasWorkingHoursHint = (text: string): boolean => {
  return text.includes('working hours') || text.includes('business hours') || text.includes('work hours');
};

const parseWorkingHoursWindow = (text: string): { start: number; end: number } | undefined => {
  const windowMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|–)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!windowMatch) {
    return undefined;
  }

  const startHour = Number.parseInt(windowMatch[1], 10);
  const startMinute = windowMatch[2] ? Number.parseInt(windowMatch[2], 10) : 0;
  const startMeridiem = windowMatch[3];
  const endHour = Number.parseInt(windowMatch[4], 10);
  const endMinute = windowMatch[5] ? Number.parseInt(windowMatch[5], 10) : 0;
  const endMeridiem = windowMatch[6];

  const start = convertHourTo24(startHour % 12 || startHour, startMeridiem) + startMinute / 60;
  const end = convertHourTo24(endHour % 12 || endHour, endMeridiem) + endMinute / 60;

  return { start, end };
};

const extractTimezoneConstraints = (text: string): TimezoneConstraint[] => {
  const results: TimezoneConstraint[] = [];
  const seen = new Set<string>();
  const normalized = text.toLowerCase();
  const tokens = Object.keys(TIMEZONE_ALIASES).sort((a, b) => b.length - a.length);

  tokens.forEach(token => {
    const index = normalized.indexOf(token);
    if (index === -1) {
      return;
    }

    const alias = TIMEZONE_ALIASES[token];
    if (!alias || seen.has(alias.timezone)) {
      return;
    }

    const snippet = normalized.slice(Math.max(0, index - 10), index + 40);
    const hoursWindow = parseWorkingHoursWindow(snippet);
    const startHour = hoursWindow ? hoursWindow.start : 9;
    const endHour = hoursWindow ? hoursWindow.end : 17;

    results.push({
      timezone: alias.timezone,
      label: alias.label,
      hoursStart: startHour,
      hoursEnd: endHour
    });
    seen.add(alias.timezone);
  });

  return results;
};

const resolveDayReference = (token: string, referenceDate: Date): Date => {
  const lower = token.toLowerCase();
  if (lower === 'today') {
    return new Date(referenceDate);
  }
  if (lower === 'tomorrow') {
    return addDays(referenceDate, 1);
  }
  const dayIndex = DAY_NAME_TO_INDEX[lower];
  if (dayIndex !== undefined) {
    return getNextDayOfWeek(dayIndex, referenceDate);
  }
  return new Date(referenceDate);
};

const resolveDateByMonth = (
  dayValue: number,
  monthToken: string | null,
  referenceDate: Date
): Date => {
  const result = new Date(referenceDate);
  const baseYear = result.getFullYear();
  let monthIndex = result.getMonth();

  if (monthToken) {
    const normalized = monthToken.toLowerCase();
    const explicitIndex = MONTH_NAME_TO_INDEX[normalized];
    if (explicitIndex !== undefined) {
      monthIndex = explicitIndex;
      if (explicitIndex < result.getMonth() || (explicitIndex === result.getMonth() && dayValue < result.getDate())) {
        result.setFullYear(baseYear + 1);
      }
    }
  } else if (dayValue < result.getDate()) {
    // Move to next month if the day has already passed
    if (monthIndex === 11) {
      result.setFullYear(baseYear + 1);
      monthIndex = 0;
    } else {
      monthIndex += 1;
    }
  }

  result.setMonth(monthIndex, dayValue);
  return result;
};

const findTimezoneNearIndex = (text: string, index: number): string | undefined => {
  const searchWindow = text.slice(Math.max(0, index - 10), index + 20).toLowerCase();
  const match = Object.keys(TIMEZONE_ALIASES).find(token => searchWindow.includes(token));
  if (!match) {
    return undefined;
  }
  return TIMEZONE_ALIASES[match].timezone;
};

const extractProposedTimes = (text: string, context: NaturalLanguageContext): ProposedTime[] => {
  const results: ProposedTime[] = [];
  const sanitized = text.replace(/\//g, ' ');
  const referenceDate = context.currentDate;

  const dayTimeRegex = /(today|tomorrow|mon(?:day)?|tue(?:sday)?|tues|wed(?:nesday)?|thu(?:rsday)?|thur|thurs|fri(?:day)?|sat(?:urday)?|sun(?:day)?)[^\d]*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  let match: RegExpExecArray | null;
  while ((match = dayTimeRegex.exec(sanitized))) {
    const [, dayToken, hourValue, minuteValue, meridiem] = match;
    const baseDate = resolveDayReference(dayToken, referenceDate);
    const hour = convertHourTo24(Number.parseInt(hourValue, 10) % 12 || Number.parseInt(hourValue, 10), meridiem ?? undefined);
    const minute = minuteValue ? Number.parseInt(minuteValue, 10) : 0;
    const startDate = setTime(baseDate, hour, minute);
    const durationMinutes = extractDurationMinutes(text) ?? DEFAULT_DURATION_MINUTES;
    const endDate = addMinutes(startDate, durationMinutes);
    const timezone = findTimezoneNearIndex(text, match.index) ?? context.userTimezone;
    results.push({
      label: `${dayToken} ${hourValue}${meridiem ? meridiem.toLowerCase() : ''}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMinutes,
      timezone
    });
  }

  const ordinalRegex = /(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?[^\d]*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  while ((match = ordinalRegex.exec(sanitized))) {
    const [, dayOrdinal, monthToken, hourValue, minuteValue, meridiem] = match;
    const dayNumber = numberFromOrdinal(dayOrdinal);
    const baseDate = resolveDateByMonth(dayNumber, monthToken ?? null, referenceDate);
    const hour = convertHourTo24(Number.parseInt(hourValue, 10) % 12 || Number.parseInt(hourValue, 10), meridiem ?? undefined);
    const minute = minuteValue ? Number.parseInt(minuteValue, 10) : 0;
    const startDate = setTime(baseDate, hour, minute);
    const durationMinutes = extractDurationMinutes(text) ?? DEFAULT_DURATION_MINUTES;
    const endDate = addMinutes(startDate, durationMinutes);
    const timezone = findTimezoneNearIndex(text, match.index) ?? context.userTimezone;
    results.push({
      label: `${dayOrdinal} ${monthToken ?? ''}`.trim(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMinutes,
      timezone
    });
  }

  return results;
};

const inferBulkActionType = (text: string): BulkActionType => {
  if (text.includes('before all') || text.includes('buffer before')) {
    return 'add_buffers_before';
  }
  if (text.includes('buffer') && text.includes('after')) {
    return 'add_buffers_after';
  }
  if (text.includes('clear') && text.includes('after') && text.includes('6pm')) {
    return 'clear_after_hours';
  }
  if (text.includes('block') && text.includes('focus')) {
    return 'add_focus_blocks';
  }
  if (text.includes('remove') && text.includes('after hours')) {
    return 'remove_after_hours';
  }
  return 'unknown';
};

const inferFocusPreference = (text: string): IntentParameters['focus_preferences'] => {
  if (text.includes('morning')) {
    return 'morning';
  }
  if (text.includes('afternoon')) {
    return 'afternoon';
  }
  if (text.includes('evening')) {
    return 'evening';
  }
  return 'any';
};

const inferTargetDay = (text: string): string | undefined => {
  const match = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);
  return match ? match[1].toLowerCase() : undefined;
};

const inferIntentType = (text: string): IntentType => {
  if (/reschedul|move\s+this/.test(text)) {
    return 'suggest_reschedule';
  }
  if (/(buffer|clear|bulk|remove|delete).*(meeting|calendar|schedule)/.test(text)) {
    return 'bulk_action';
  }
  if (/(focus block|focus time|deep work|protect time)/.test(text)) {
    return 'create_focus_block';
  }
  if (/(conflict|clash|double book|double-book|busy|free\s+for\s+\d)/.test(text) || /can i add/.test(text)) {
    return 'check_conflicts';
  }
  if (/(can|could).*(meet|do).*(mon|tue|wed|thu|fri|sat|sun|today|tomorrow|\d{1,2}(?:st|nd|rd|th))/.test(text)) {
    return 'respond_to_request';
  }
  if (/(est|pst|gmt|time zone|timezone|uk|london|tokyo|jst|cest|cet)/.test(text)) {
    return 'multi_timezone_query';
  }
  return 'find_availability';
};

export const parseIntentFallback = (
  command: string,
  context: NaturalLanguageContext
): ParsedIntentResult => {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      intent: null,
      source: 'fallback',
      confidence: 0,
      error: 'Command is empty'
    };
  }

  const lower = trimmed.toLowerCase();
  let intentType = inferIntentType(lower);

  const durationMinutes = extractDurationMinutes(lower);
  const timezoneConstraints = extractTimezoneConstraints(lower);
  const workingHoursOnly = hasWorkingHoursHint(lower) || timezoneConstraints.length > 0;
  const dateRange = detectDateRange(lower);
  const proposedTimes =
    intentType === 'respond_to_request' || intentType === 'check_conflicts'
      ? extractProposedTimes(trimmed, context)
      : undefined;

  if ((intentType === 'respond_to_request' || intentType === 'check_conflicts') && (!proposedTimes || proposedTimes.length === 0)) {
    intentType = 'find_availability';
  }

  const params: IntentParameters = {
    duration: durationMinutes,
    date_range: dateRange,
    timezone_constraints: timezoneConstraints.length > 0 ? timezoneConstraints : undefined,
    working_hours_only: workingHoursOnly || undefined,
    proposed_times: proposedTimes,
    action_type: intentType === 'bulk_action' ? inferBulkActionType(lower) : undefined,
    focus_preferences: intentType === 'create_focus_block' ? inferFocusPreference(lower) : undefined,
    target_day: intentType === 'create_focus_block' ? inferTargetDay(lower) : undefined
  };

  if (intentType === 'multi_timezone_query' && timezoneConstraints.length === 0) {
    params.timezone_constraints = [
      {
        timezone: context.userTimezone,
        label: 'Local',
        hoursStart: 9,
        hoursEnd: 17
      }
    ];
  }

  const intent: Intent = {
    type: intentType,
    params,
    confidence: 0.55,
    rawCommand: trimmed
  };

  return {
    intent,
    source: 'fallback',
    confidence: intent.confidence
  };
};
