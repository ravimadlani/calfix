import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import { useSupabaseClient } from '../lib/supabase';
import { QuickScheduleButtons } from '../components/scheduling/QuickScheduleButtons';
import { ActiveHoldsSection } from '../components/scheduling/ActiveHoldsSection';
import { SaveTemplateModal } from '../components/scheduling/SaveTemplateModal';
import type { CalendarListEntry } from '../types';
import type { HoldParticipant, TemplateConfig, TemplateParticipant } from '../types/scheduling';

const MANAGED_CALENDAR_STORAGE_KEY = 'managed_calendar_id';

type ParticipantRole = 'host' | 'required' | 'optional';

interface Participant {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
  startHour: string;
  endHour: string;
  sendInvite: boolean;
  role: ParticipantRole;
  calendarId?: string;
  flexibleHours: boolean;
}

interface TimezoneGuardrail {
  id: string;
  timezone: string;
  label: string;
}

interface SlotParticipantStatus {
  id: string;
  name: string;
  role: ParticipantRole;
  timezone: string;
  localRange: string;
  status: 'inHours' | 'flex' | 'outside';
  flexible: boolean;
}

interface SlotGuardrailStatus {
  id: string;
  timezone: string;
  label: string;
  localRange: string;
  withinHours: boolean;
}

interface AvailabilitySlot {
  id: string;
  start: Date;
  end: Date;
  participants: SlotParticipantStatus[];
  guardrails: SlotGuardrailStatus[];
  summaryStatus: 'ideal' | 'flex';
}

// Slot with just date/time info for pre-filling
export interface PrefilledSlot {
  start: Date;
  end: Date;
}

const MEETING_DURATION_OPTIONS = [30, 45, 60, 75, 90];
const SEARCH_WINDOW_OPTIONS = [7, 10, 14, 21, 30];

const COMMON_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { value: 'America/Denver', label: 'US Mountain (MT)' },
  { value: 'America/Chicago', label: 'US Central (CT)' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AET)' }
];

const DEFAULT_GUARD_START = '09:00';
const DEFAULT_GUARD_END = '17:00';
const FLEX_MINUTES = 120;

const createId = () => Math.random().toString(36).slice(2, 10);

const timeStringToMinutes = (time: string) => {
  if (!time || !time.includes(':')) {
    return 0;
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (Number.isFinite(m) ? m : 0);
};

const getMinutesInTimezone = (date: Date, timezone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  });

  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
};

const formatLocalTimeRange = (start: Date, end: Date, timezone: string) => {
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(start);
  const startLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(start);

  const endLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(end);

  return `${dateLabel} · ${startLabel} — ${endLabel}`;
};

const formatTimeRangeBasic = (start: Date, end: Date, timezone: string) =>
  `${new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(start)} – ${new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(end)}`;

const normalizeForWindow = (startMinutes: number, endMinutes: number, windowStart: number, windowEnd: number) => {
  let normalizedStart = startMinutes;
  let normalizedEnd = endMinutes;
  const normalizedWindowStart = windowStart;
  let normalizedWindowEnd = windowEnd;

  const windowCrossesMidnight = windowEnd < windowStart;

  if (windowCrossesMidnight) {
    normalizedWindowEnd = windowEnd + 1440;

    if (normalizedStart < windowStart) {
      normalizedStart += 1440;
    }

    if (normalizedEnd <= windowEnd) {
      normalizedEnd += 1440;
    } else if (normalizedEnd < normalizedStart) {
      normalizedEnd += 1440;
    }
  } else if (normalizedEnd < normalizedStart) {
    normalizedEnd += 1440;
  }

  return {
    slotStart: normalizedStart,
    slotEnd: normalizedEnd,
    windowStart: normalizedWindowStart,
    windowEnd: normalizedWindowEnd
  };
};

const isWithinNormalizedWindow = (startMinutes: number, endMinutes: number, windowStart: number, windowEnd: number) => {
  const { slotStart, slotEnd, windowStart: normalizedWindowStart, windowEnd: normalizedWindowEnd } = normalizeForWindow(startMinutes, endMinutes, windowStart, windowEnd);
  return slotStart >= normalizedWindowStart && slotEnd <= normalizedWindowEnd;
};

const roundToNextHalfHour = (date: Date) => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 30;
  if (remainder !== 0) {
    const diff = 30 - remainder;
    rounded.setMinutes(minutes + diff);
  }
  if (rounded <= date) {
    rounded.setMinutes(rounded.getMinutes() + 30);
  }
  return rounded;
};

export function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { activeProvider, isAuthenticated: isCalendarConnected } = useCalendarProvider();
  const providerFindFreeBusy = activeProvider.calendar.findFreeBusy;
  const providerCapabilities = activeProvider.capabilities;
  const createProviderEvent = activeProvider.calendar.createEvent;
  const fetchProviderCalendarList = activeProvider.calendar.fetchCalendarList;

  // Calendar selector state
  const [availableCalendars, setAvailableCalendars] = useState<CalendarListEntry[]>([]);
  const [managedCalendarId, setManagedCalendarId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY) || 'primary';
    }
    return 'primary';
  });

  // Get host email from user's primary email
  const hostEmail = user?.primaryEmailAddress?.emailAddress || null;

  // Fetch available calendars on mount
  const fetchCalendars = useCallback(async () => {
    if (!isCalendarConnected || !fetchProviderCalendarList) return;
    try {
      const calendars = await fetchProviderCalendarList();
      const manageable = calendars.filter(cal => cal.accessRole === 'owner' || cal.accessRole === 'writer');
      setAvailableCalendars(manageable);

      // If current selection is not in the list, default to first
      if (!manageable.find(cal => cal.id === managedCalendarId) && manageable.length > 0) {
        setManagedCalendarId(manageable[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch calendar list:', error);
    }
  }, [fetchProviderCalendarList, isCalendarConnected, managedCalendarId]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  // Persist calendar selection to localStorage
  useEffect(() => {
    if (managedCalendarId) {
      window.localStorage.setItem(MANAGED_CALENDAR_STORAGE_KEY, managedCalendarId);
    }
  }, [managedCalendarId]);

  const defaultTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
    []
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeView, setActiveView] = useState<'new' | 'holds'>('new');
  const [meetingPurpose, setMeetingPurpose] = useState('');
  const [meetingDuration, setMeetingDuration] = useState<number>(60);
  const [searchWindowDays, setSearchWindowDays] = useState<number>(10);
  const [participants, setParticipants] = useState<Participant[]>(() => [
    {
      id: createId(),
      displayName: 'Primary Calendar',
      email: hostEmail ?? '',
      timezone: defaultTimezone,
      startHour: '08:30',
      endHour: '17:30',
      sendInvite: true,
      role: 'host',
      calendarId: managedCalendarId,
      flexibleHours: false
    }
  ]);
  const [respectedTimezones, setRespectedTimezones] = useState<TimezoneGuardrail[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);
  const [holdTitles, setHoldTitles] = useState<string[]>([]);
  const [viewTimezone, setViewTimezone] = useState(defaultTimezone);
  const [emailDraft, setEmailDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pre-filled slots from quick buttons
  const [prefilledSlots, setPrefilledSlots] = useState<PrefilledSlot[]>([]);

  // Save Template Modal state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Build current template config from Step 1 state
  const currentTemplateConfig = useMemo((): TemplateConfig => ({
    meetingPurpose,
    duration: meetingDuration,
    searchWindowDays,
    participants: participants.map(p => ({
      displayName: p.displayName,
      email: p.email,
      timezone: p.timezone,
      startHour: p.startHour,
      endHour: p.endHour,
      sendInvite: p.sendInvite,
      role: p.role,
      flexibleHours: p.flexibleHours
    })),
    respectedTimezones: respectedTimezones.map(tz => ({
      timezone: tz.timezone,
      label: tz.label
    })),
    calendarId: managedCalendarId
  }), [meetingPurpose, meetingDuration, searchWindowDays, participants, respectedTimezones, managedCalendarId]);

  // Handle loading a template
  const handleLoadTemplate = useCallback((config: TemplateConfig) => {
    setMeetingPurpose(config.meetingPurpose);
    setMeetingDuration(config.duration);
    setSearchWindowDays(config.searchWindowDays);

    if (config.calendarId) {
      setManagedCalendarId(config.calendarId);
    }

    // Convert TemplateParticipant[] to Participant[]
    if (config.participants && config.participants.length > 0) {
      const loadedParticipants: Participant[] = config.participants.map((tp, index) => ({
        id: createId(),
        displayName: tp.displayName,
        email: tp.email,
        timezone: tp.timezone,
        startHour: tp.startHour,
        endHour: tp.endHour,
        sendInvite: tp.sendInvite,
        role: tp.role,
        flexibleHours: tp.flexibleHours,
        calendarId: index === 0 && tp.role === 'host' ? config.calendarId : undefined
      }));
      setParticipants(loadedParticipants);
    }

    // Load timezone guardrails
    if (config.respectedTimezones) {
      const loadedGuardrails: TimezoneGuardrail[] = config.respectedTimezones.map(tz => ({
        id: createId(),
        timezone: tz.timezone,
        label: tz.label
      }));
      setRespectedTimezones(loadedGuardrails);
    }
  }, []);

  const suggestedTimezones = useMemo(() => {
    const existing = new Set(COMMON_TIMEZONES.map(tz => tz.value));
    if (!existing.has(defaultTimezone)) {
      return [{ value: defaultTimezone, label: `${defaultTimezone} (Current)` }, ...COMMON_TIMEZONES];
    }
    return COMMON_TIMEZONES;
  }, [defaultTimezone]);

  const hostParticipant = participants.find(person => person.role === 'host') ?? participants[0];

  // Update host participant when calendar selection changes
  useEffect(() => {
    const selectedCalendar = availableCalendars.find(c => c.id === managedCalendarId);
    if (selectedCalendar) {
      setParticipants(prev => prev.map(p =>
        p.role === 'host'
          ? {
              ...p,
              calendarId: managedCalendarId,
              displayName: selectedCalendar.summary || 'Primary Calendar',
              email: selectedCalendar.id
            }
          : p
      ));
    }
  }, [managedCalendarId, availableCalendars]);

  useEffect(() => {
    if (step !== 3) {
      setCopyFeedback(null);
    }
  }, [step]);

  // Handle pre-filled slots from quick buttons
  useEffect(() => {
    if (prefilledSlots.length > 0) {
      // Convert PrefilledSlots to AvailabilitySlots format
      const slots: AvailabilitySlot[] = prefilledSlots.map((slot, index) => ({
        id: `prefilled_${index}_${slot.start.toISOString()}`,
        start: slot.start,
        end: slot.end,
        participants: [],
        guardrails: [],
        summaryStatus: 'ideal' as const
      }));
      setSelectedSlots(slots);

      // Move to step 3 (summary) with pre-filled slots
      const trimmedPurpose = meetingPurpose.trim() || 'Meeting';
      const generatedHoldTitles = slots.map((_, i) => `[Hold] ${trimmedPurpose} ${i + 1}`);
      setHoldTitles(generatedHoldTitles);

      // Generate email draft
      const slotText = slots
        .map((slot, i) => {
          const dateLabel = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }).format(slot.start);
          const timeLabel = formatTimeRangeBasic(slot.start, slot.end, defaultTimezone);
          return `${i + 1}. ${dateLabel} · ${timeLabel}`;
        }).join('\n');

      setEmailDraft(`Hi,

We have availability at the following times:

${slotText}

Let me know which works best and I'll confirm the invite.

Thanks!`);

      setStep(3);
    }
  }, [prefilledSlots, meetingPurpose, defaultTimezone]);

  const getTimezoneLabel = (timezone: string) =>
    suggestedTimezones.find(tz => tz.value === timezone)?.label ?? timezone;

  const summarizeSlotTimezones = (slot: AvailabilitySlot) => {
    const map = new Map<string, { range: string; hasFlex: boolean }>();
    slot.participants.forEach(participant => {
      const existing = map.get(participant.timezone);
      if (!existing) {
        map.set(participant.timezone, {
          range: participant.localRange,
          hasFlex: participant.status === 'flex'
        });
      } else if (participant.status === 'flex') {
        existing.hasFlex = true;
      }
    });

    return Array.from(map.entries()).map(([timezone, value]) => ({
      timezone,
      label: getTimezoneLabel(timezone),
      range: value.range,
      hasFlex: value.hasFlex
    }));
  };

  const updateHoldTitle = (index: number, value: string) => {
    setHoldTitles(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addParticipant = () => {
    setParticipants(prev => [
      ...prev,
      {
        id: createId(),
        displayName: '',
        email: '',
        timezone: defaultTimezone,
        startHour: '09:00',
        endHour: '17:30',
        sendInvite: false,
        role: 'required',
        flexibleHours: false
      }
    ]);
  };

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants(prev => prev.map(participant => (
      participant.id === id
        ? { ...participant, ...updates }
        : participant
    )));
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(participant => participant.id !== id || participant.role === 'host'));
  };

  const addTimezoneGuardrail = () => {
    setRespectedTimezones(prev => [
      ...prev,
      {
        id: createId(),
        timezone: defaultTimezone,
        label: ''
      }
    ]);
  };

  const updateTimezoneGuardrail = (id: string, updates: Partial<TimezoneGuardrail>) => {
    setRespectedTimezones(prev => prev.map(guard => (
      guard.id === id
        ? { ...guard, ...updates }
        : guard
    )));
  };

  const removeTimezoneGuardrail = (id: string) => {
    setRespectedTimezones(prev => prev.filter(guard => guard.id !== id));
  };

  const calendarIdentifiers = useMemo(() => {
    const identifiers = new Set<string>();
    if (managedCalendarId) {
      identifiers.add(managedCalendarId);
    }
    participants.forEach(participant => {
      if (participant.calendarId) {
        identifiers.add(participant.calendarId);
      }
      if (participant.email.trim()) {
        identifiers.add(participant.email.trim());
      }
    });
    return Array.from(identifiers);
  }, [participants, managedCalendarId]);

  const ensureStepOneValid = () => {
    if (!meetingPurpose.trim()) {
      setErrorMessage('Please enter an event title before searching for availability.');
      return false;
    }

    if (!providerCapabilities.supportsFreeBusy) {
      setErrorMessage('Free/busy lookup is not supported for the selected calendar provider yet.');
      return false;
    }

    if (participants.length === 0) {
      setErrorMessage('Add at least one teammate to evaluate availability.');
      return false;
    }

    if (calendarIdentifiers.length === 0) {
      setErrorMessage('Provide at least one calendar email so availability can be checked.');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const buildSlotParticipantStatus = (slotStart: Date, slotEnd: Date): SlotParticipantStatus[] =>
    participants.map(participant => {
      const localStartMinutes = getMinutesInTimezone(slotStart, participant.timezone);
      const localEndMinutes = getMinutesInTimezone(slotEnd, participant.timezone);
      const workStart = timeStringToMinutes(participant.startHour);
      const workEnd = timeStringToMinutes(participant.endHour);

      const strictWithin = isWithinNormalizedWindow(localStartMinutes, localEndMinutes, workStart, workEnd);

      let status: 'inHours' | 'flex' | 'outside' = 'outside';

      if (strictWithin) {
        status = 'inHours';
      } else if (participant.flexibleHours) {
        const flexStart = Math.max(0, workStart - FLEX_MINUTES);
        const flexEnd = Math.min(1440, workEnd + FLEX_MINUTES);
        if (isWithinNormalizedWindow(localStartMinutes, localEndMinutes, flexStart, flexEnd)) {
          status = 'flex';
        }
      }

      return {
        id: participant.id,
        name: participant.displayName || (participant.role === 'host' ? 'Host' : 'Teammate'),
        role: participant.role,
        timezone: participant.timezone,
        localRange: formatTimeRangeBasic(slotStart, slotEnd, participant.timezone),
        status,
        flexible: participant.flexibleHours
      };
    });

  const buildGuardrailStatus = (slotStart: Date, slotEnd: Date): SlotGuardrailStatus[] =>
    respectedTimezones.map(guard => {
      const localStartMinutes = getMinutesInTimezone(slotStart, guard.timezone);
      const localEndMinutes = getMinutesInTimezone(slotEnd, guard.timezone);
      const windowStart = timeStringToMinutes(DEFAULT_GUARD_START);
      const windowEnd = timeStringToMinutes(DEFAULT_GUARD_END);

      return {
        id: guard.id,
        timezone: guard.timezone,
        label: guard.label,
        localRange: formatTimeRangeBasic(slotStart, slotEnd, guard.timezone),
        withinHours: isWithinNormalizedWindow(localStartMinutes, localEndMinutes, windowStart, windowEnd)
      };
    });

  const findCommonFreeSlots = async () => {
    if (!ensureStepOneValid()) {
      return;
    }

    const searchStart = roundToNextHalfHour(new Date());
    const searchEnd = new Date(searchStart);
    searchEnd.setDate(searchEnd.getDate() + searchWindowDays);

    setLoading(true);
    setStep(1);
    setSelectedSlots([]);

    try {
      const freeBusyData = await providerFindFreeBusy(
        searchStart.toISOString(),
        searchEnd.toISOString(),
        calendarIdentifiers
      );

      const durationMs = meetingDuration * 60 * 1000;
      const proposedSlots: AvailabilitySlot[] = [];
      const busyLookup = freeBusyData?.calendars ?? {};

      const dayCursor = new Date(searchStart);

      while (dayCursor < searchEnd && proposedSlots.length < 80) {
        const day = dayCursor.getDay();
        if (day === 0 || day === 6) {
          dayCursor.setDate(dayCursor.getDate() + 1);
          dayCursor.setHours(0, 0, 0, 0);
          continue;
        }

        const dayStart = new Date(dayCursor);
        dayStart.setHours(0, 0, 0, 0);

        for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
          const slotStart = new Date(dayStart.getTime() + minutes * 60 * 1000);
          if (slotStart < searchStart || slotStart >= searchEnd) {
            continue;
          }

          const slotEnd = new Date(slotStart.getTime() + durationMs);
          if (slotEnd > searchEnd) {
            continue;
          }

          let hasConflict = false;

          for (const calendarId of calendarIdentifiers) {
            const calendar = busyLookup[calendarId];
            if (!calendar?.busy) {
              continue;
            }

            const conflict = calendar.busy.some((busy: { start: string; end: string }) => {
              const busyStart = new Date(busy.start);
              const busyEnd = new Date(busy.end);
              return slotStart < busyEnd && slotEnd > busyStart;
            });

            if (conflict) {
              hasConflict = true;
              break;
            }
          }

          if (hasConflict) {
            continue;
          }

          const participantStatus = buildSlotParticipantStatus(slotStart, slotEnd);
          const guardrailStatus = buildGuardrailStatus(slotStart, slotEnd);

          const guardrailsValid = guardrailStatus.every(item => item.withinHours);
          const participantsValid = participantStatus.every(item => item.status !== 'outside');

          if (!guardrailsValid || !participantsValid) {
            continue;
          }

          const summaryStatus: 'ideal' | 'flex' = participantStatus.some(item => item.status === 'flex')
            ? 'flex'
            : 'ideal';

          proposedSlots.push({
            id: `${slotStart.toISOString()}_${slotEnd.toISOString()}`,
            start: slotStart,
            end: slotEnd,
            participants: participantStatus,
            guardrails: guardrailStatus,
            summaryStatus
          });
        }

        dayCursor.setDate(dayCursor.getDate() + 1);
        dayCursor.setHours(0, 0, 0, 0);
      }

      setAvailability(proposedSlots);
      setStep(2);
      setErrorMessage(proposedSlots.length === 0 ? 'No slots found in the selected window.' : null);
    } catch (error) {
      console.error('Error searching availability', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to find availability. Try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSlotSelection = (slot: AvailabilitySlot) => {
    setSelectedSlots(prev => {
      const exists = prev.find(existing => existing.id === slot.id);
      if (exists) {
        return prev.filter(existing => existing.id !== slot.id);
      }
      return [...prev, slot];
    });
  };

  const moveToSummary = () => {
    if (selectedSlots.length === 0) {
      setErrorMessage('Select at least one slot to continue.');
      return;
    }

    const sortedSlots = [...selectedSlots].sort((a, b) => a.start.getTime() - b.start.getTime());
    setSelectedSlots(sortedSlots);

    const trimmedPurpose = meetingPurpose.trim();
    const generatedHoldTitles = sortedSlots.map((_, index) => `[Hold] ${trimmedPurpose} ${index + 1}`);
    setHoldTitles(generatedHoldTitles);

    const slotText = sortedSlots
      .map((slot, index) => {
        const timezoneLines = summarizeSlotTimezones(slot).map(summary => {
          const statusNote = summary.hasFlex ? ' (flex window)' : '';
          return `   - ${summary.label}: ${summary.range}${statusNote}`;
        }).join('\n');

        const guardLines = slot.guardrails.map(guard => {
          const label = guard.label ? `${guard.label} (${guard.timezone})` : guard.timezone;
          const status = guard.withinHours ? 'within working hours' : 'outside normal hours';
          return `   - ${label}: ${guard.localRange} • ${status}`;
        }).join('\n');

        const guardSection = guardLines ? `\n   Guardrails:\n${guardLines}` : '';

        return `${index + 1}. ${new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }).format(slot.start)}\n${timezoneLines}${guardSection}`;
      }).join('\n\n');

    const draft = `Hi,

We have availability at the following times:

${slotText}

Let me know which works best and I'll confirm the invite.

Thanks!`;

    setEmailDraft(draft);
    setErrorMessage(null);
    setStep(3);
  };

  const copyEmailToClipboard = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      setCopyFeedback({ type: 'error', text: 'Clipboard not available. Please copy manually.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopyFeedback({ type: 'success', text: 'Message copied to clipboard.' });
    } catch (error) {
      console.error('Clipboard copy failed', error);
      setCopyFeedback({ type: 'error', text: 'Unable to copy automatically. Please copy manually.' });
    }
  };

  const createCalendarHolds = async () => {
    try {
      setLoading(true);

      const hostTimezone = hostParticipant?.timezone || defaultTimezone;
      const trimmedPurpose = meetingPurpose.trim() || 'Meeting';

      // Phase 1: Create all calendar events, collect results
      const results: Array<{
        success: boolean;
        event?: { id: string };
        error?: Error;
        index: number;
        slot: typeof selectedSlots[0];
      }> = [];

      for (let i = 0; i < selectedSlots.length; i++) {
        const slot = selectedSlots[i];
        const fallbackTitle = `[Hold] ${trimmedPurpose} ${i + 1}`;
        const summary = holdTitles[i]?.trim() || fallbackTitle;

        const hold = {
          summary,
          description: [
            trimmedPurpose ? `Purpose: ${trimmedPurpose}` : null,
            respectedTimezones.length > 0
              ? `Guardrails: ${respectedTimezones.map(guard => guard.label || guard.timezone).join(', ')}`
              : null,
            '\nCreated via CalFix'
          ].filter(Boolean).join('\n'),
          start: {
            dateTime: slot.start.toISOString(),
            timeZone: hostTimezone
          },
          end: {
            dateTime: slot.end.toISOString(),
            timeZone: hostTimezone
          },
          // NO attendees - creates blocking event, not meeting invite
          // This works for both Google Calendar and Outlook
          colorId: '11',
          transparency: 'opaque'
        };

        try {
          const createdEvent = await createProviderEvent(hold, managedCalendarId);
          results.push({ success: true, event: createdEvent, index: i, slot });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            index: i,
            slot
          });
        }
      }

      // Phase 2: Track successful holds in DB (batch insert)
      const successfulResults = results.filter(r => r.success && r.event?.id);

      if (successfulResults.length === 0) {
        throw new Error('Failed to create any calendar holds');
      }

      // Map participants to HoldParticipant format for storage
      const holdParticipants: HoldParticipant[] = participants.map(p => ({
        email: p.email,
        name: p.displayName,
        timezone: p.timezone,
        sendInvite: p.sendInvite
      }));

      const holdRecords = successfulResults.map(result => ({
        user_id: user?.id,
        calendar_id: managedCalendarId,
        event_id: result.event!.id,
        meeting_purpose: trimmedPurpose,
        participants: holdParticipants,
        start_time: result.slot.start.toISOString(),
        end_time: result.slot.end.toISOString()
      }));

      // Batch insert to Supabase
      const { error: dbError } = await supabase
        .from('calendar_holds')
        .insert(holdRecords);

      if (dbError) {
        // DB failed but calendar events exist - log for manual reconciliation
        console.error('[CRITICAL] Calendar events created but DB tracking failed:', dbError);
        setErrorMessage(
          `Calendar holds created but tracking failed. Events may appear in your calendar without tracking.`
        );
        // Still navigate - events were created successfully
      }

      // Show partial success feedback if needed
      const failedCount = results.length - successfulResults.length;
      if (failedCount > 0) {
        setErrorMessage(
          `Created ${successfulResults.length} holds successfully. ${failedCount} failed.`
        );
      }

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating calendar holds', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create holds.');
    } finally {
      setLoading(false);
    }
  };

  const buildTimezoneOptions = (current?: string) => {
    const seen = new Set<string>();
    const options = suggestedTimezones.map(timezone => {
      seen.add(timezone.value);
      return timezone;
    });

    if (current && !seen.has(current)) {
      options.push({ value: current, label: current });
    }

    return options;
  };

  const renderParticipantCard = (participant: Participant) => (
    <div key={participant.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {participant.role === 'host' ? 'Host (Managed Calendar)' : 'Teammate'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Provide working hours and timezone so suggestions stay fair.
          </p>
        </div>
        {participant.role !== 'host' && (
          <button
            type="button"
            onClick={() => removeParticipant(participant.id)}
            className="text-xs text-red-500 hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Name or label
          </label>
          <input
            type="text"
            value={participant.displayName}
            onChange={(event) => updateParticipant(participant.id, { displayName: event.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            placeholder={participant.role === 'host' ? 'Executive / Host' : 'Name'}
          />
        </div>
        {participant.role === 'host' ? (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Calendar email
            </label>
            <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">
              {participant.email || hostEmail || managedCalendarId || 'primary'}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Calendar email (optional)
            </label>
            <input
              type="email"
              value={participant.email}
              onChange={(event) => updateParticipant(participant.id, {
                email: event.target.value,
                calendarId: event.target.value.trim() ? event.target.value.trim() : participant.calendarId
              })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              placeholder="name@company.com"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Timezone
          </label>
          <select
            value={participant.timezone}
            onChange={(event) => updateParticipant(participant.id, { timezone: event.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white"
          >
            {buildTimezoneOptions(participant.timezone).map(timezone => (
              <option key={timezone.value} value={timezone.value}>
                {timezone.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Working hours start
          </label>
          <input
            type="time"
            value={participant.startHour}
            onChange={(event) => updateParticipant(participant.id, { startHour: event.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Working hours end
          </label>
          <input
            type="time"
            value={participant.endHour}
            onChange={(event) => updateParticipant(participant.id, { endHour: event.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 text-xs text-slate-600">
        <label className="inline-flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={participant.sendInvite}
            onChange={(event) => updateParticipant(participant.id, { sendInvite: event.target.checked })}
          />
          Send calendar invite when confirmed
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={participant.flexibleHours}
            onChange={(event) => updateParticipant(participant.id, { flexibleHours: event.target.checked })}
          />
          Flexible hours (+/- 2h window)
        </label>
      </div>
    </div>
  );

  const renderStepOne = () => (
    <div className="space-y-6 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Event title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={meetingPurpose}
            onChange={(event) => setMeetingPurpose(event.target.value)}
            placeholder="Executive intro with renewal stakeholders"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-600 focus:border-slate-600"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Search window
          </label>
          <select
            value={searchWindowDays}
            onChange={(event) => setSearchWindowDays(Number(event.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-600 focus:border-slate-600"
          >
            {SEARCH_WINDOW_OPTIONS.map(option => (
              <option key={option} value={option}>
                Next {option} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Meeting duration</p>
        <div className="flex flex-wrap gap-2">
          {MEETING_DURATION_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setMeetingDuration(option)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                meetingDuration === option
                  ? 'border-slate-600 bg-slate-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {option} minutes
            </button>
          ))}
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl bg-slate-50/60 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Timezones to respect
            </h3>
            <p className="text-xs text-slate-500">
              Add locations that should receive fair meeting windows even without inviting attendees.
            </p>
          </div>
          <button
            type="button"
            onClick={addTimezoneGuardrail}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            + Add timezone
          </button>
        </div>

        {respectedTimezones.length === 0 && (
          <p className="text-sm text-slate-500">
            No additional guardrails yet. Add one to account for a customer HQ or travel location.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3">
          {respectedTimezones.map(guard => (
            <div
              key={guard.id}
              className="border border-slate-200 rounded-xl bg-white p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Timezone
                  </label>
                  <select
                    value={guard.timezone}
                    onChange={(event) => updateTimezoneGuardrail(guard.id, { timezone: event.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-600 focus:border-slate-600 bg-white"
                  >
                    {buildTimezoneOptions(guard.timezone).map(timezone => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Optional label
                  </label>
                  <input
                    type="text"
                    value={guard.label}
                    onChange={(event) => updateTimezoneGuardrail(guard.id, { label: event.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-600 focus:border-slate-600"
                    placeholder="Customer HQ, Travel week, ..."
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeTimezoneGuardrail(guard.id)}
                className="text-xs text-red-500 hover:text-red-600 self-start"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Participants</h3>
          <button
            type="button"
            onClick={addParticipant}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            + Add teammate
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {participants.map(renderParticipantCard)}
        </div>
      </div>
    </div>
  );

  const renderSlotCard = (slot: AvailabilitySlot) => {
    const isSelected = selectedSlots.some(existing => existing.id === slot.id);
    const statusLabel = slot.summaryStatus === 'ideal'
      ? 'All in working hours'
      : 'Includes flexibility';

    const statusClasses = slot.summaryStatus === 'ideal'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200';

    const primaryViewTimes = formatLocalTimeRange(slot.start, slot.end, viewTimezone);

    return (
      <button
        key={slot.id}
        type="button"
        onClick={() => toggleSlotSelection(slot)}
        className={`text-left border rounded-xl p-4 transition shadow-sm hover:shadow-md ${
          isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
        } bg-white space-y-3`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">{primaryViewTimes}</p>
            <p className="text-xs text-slate-500 mt-1">
              {slot.participants.length} teammates · {slot.guardrails.length} guardrails
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusClasses}`}>
            {statusLabel}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase font-semibold text-slate-500">Timezones</p>
          <ul className="space-y-1">
            {summarizeSlotTimezones(slot).map(summary => (
              <li key={summary.timezone} className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-medium">
                  {summary.label}
                </span>
                <span className="text-slate-400">·</span>
                <span>{summary.range}</span>
                {summary.hasFlex && (
                  <span className="ml-2 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    flex window
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {slot.guardrails.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase font-semibold text-slate-500">Respected timezones</p>
            <ul className="space-y-1">
              {slot.guardrails.map((guard) => (
                <li key={guard.id} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="font-medium">
                    {guard.label || guard.timezone}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>{guard.localRange}</span>
                  {!guard.withinHours && (
                    <span className="ml-2 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      outside hours
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isSelected && (
          <div className="text-xs font-semibold text-emerald-600">
            Selected
          </div>
        )}
      </button>
    );
  };

  const renderStepTwo = () => (
    <div className="flex flex-col gap-5 h-full min-h-0 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {availability.length} slots where calendars are free
          </h3>
          <p className="text-xs text-slate-500">
            Toggle a primary timezone to view slots in another locale.
          </p>
        </div>
        <select
          value={viewTimezone}
          onChange={(event) => setViewTimezone(event.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-slate-600 focus:border-slate-600"
        >
          {[viewTimezone, ...suggestedTimezones.map(tz => tz.value)]
            .filter((value, index, array) => array.indexOf(value) === index)
            .map(timezone => {
              const label = suggestedTimezones.find(tz => tz.value === timezone)?.label ?? timezone;
              return (
                <option key={timezone} value={timezone}>
                  {label}
                </option>
              );
            })}
        </select>
      </div>

      {availability.length === 0 ? (
        <div className="text-center border border-dashed border-slate-300 rounded-2xl p-10 bg-white text-slate-500 space-y-2">
          <p className="text-sm font-semibold text-slate-600">No availability matched the current working-hour rules.</p>
          <p className="text-xs">
            Consider enabling <span className="font-semibold">Flexible hours</span> for specific teammates, removing guardrails that have no overlap, or widening the search window.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            className="h-full overflow-y-auto pr-1"
            style={{ maxHeight: '60vh' }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {availability.map(renderSlotCard)}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStepThree = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 min-h-[320px] lg:min-h-[360px]">
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-4 min-h-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Participants & guardrails</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {participants.map(person => (
                <li key={person.id}>
                  <span className="font-semibold">{person.displayName || (person.role === 'host' ? 'Host' : 'Participant')}</span>
                  <span className="text-slate-400"> · </span>
                  <span>{person.timezone}</span>
                  <span className="text-slate-400"> · </span>
                  <span>{person.startHour} - {person.endHour}</span>
                  {!person.sendInvite && (
                    <span className="ml-1 text-[11px] text-slate-500">(hold only)</span>
                  )}
                </li>
              ))}
              {respectedTimezones.map(guard => (
                <li key={guard.id} className="text-slate-500 text-sm">
                  Guardrail: <span className="font-semibold">{guard.label || guard.timezone}</span>
                  <span className="text-slate-400"> · </span>
                  <span>{guard.timezone}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-h-0">
            <h3 className="text-sm font-semibold text-slate-700">Selected windows</h3>
            <ul className="mt-2 space-y-3 text-sm text-slate-600 max-h-60 overflow-y-auto pr-1">
              {selectedSlots.map((slot, index) => {
                const timezoneSummaries = summarizeSlotTimezones(slot);
                const defaultTitle = `[Hold] ${meetingPurpose.trim() || 'Meeting'} ${index + 1}`;
                const titleValue = holdTitles[index] ?? defaultTitle;

                return (
                  <li key={slot.id} className="border border-slate-200 rounded-lg px-3 py-3 bg-slate-50 space-y-2">
                    <div className="font-semibold text-slate-700">
                      {new Intl.DateTimeFormat('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      }).format(slot.start)} · {formatTimeRangeBasic(slot.start, slot.end, hostParticipant?.timezone || defaultTimezone)}
                    </div>
                    <input
                      type="text"
                      value={titleValue}
                      onChange={(event) => updateHoldTitle(index, event.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-600 focus:border-slate-600"
                      placeholder={defaultTitle}
                    />
                    {timezoneSummaries.length > 0 && (
                      <ul className="text-xs text-slate-500 space-y-1">
                        {timezoneSummaries.map(summary => (
                          <li key={summary.timezone}>
                            {summary.label}: {summary.range}{summary.hasFlex ? ' (flex window)' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-slate-700">Message to send</h3>
          <textarea
            value={emailDraft}
            onChange={(event) => setEmailDraft(event.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-slate-600 focus:border-slate-600 flex-1 min-h-[180px]"
          />
          {copyFeedback && (
            <p
              className={`text-xs ${copyFeedback.type === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}
            >
              {copyFeedback.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const stepItems = [
    {
      id: 1,
      label: 'Team & working hours',
      description: 'Capture context, teammates, and guardrails.'
    },
    {
      id: 2,
      label: 'Select availability',
      description: 'Pick fair options to propose.'
    },
    {
      id: 3,
      label: 'Review & send',
      description: 'Confirm holds and outreach.'
    }
  ];

  const renderStepper = () => (
    <ol className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-3 mb-6">
      {stepItems.map(stepItem => {
        const isActive = stepItem.id === step;
        const isComplete = stepItem.id < step;

        return (
          <li
            key={stepItem.id}
            className={`flex-1 border rounded-2xl px-4 py-3 transition ${
              isActive
                ? 'border-slate-700 bg-white shadow-md'
                : isComplete
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-semibold text-slate-500"
                style={{
                  borderRadius: '999px',
                  padding: '3px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  color: isActive ? '#1f2937' : isComplete ? '#047857' : '#475569'
                }}
              >
                {stepItem.id}
              </span>
              <div>
                <p className={`text-sm font-semibold ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                  {stepItem.label}
                </p>
                <p className="text-xs text-slate-500">
                  {stepItem.description}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header - matches Dashboard/Recurring style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeView === 'new' ? 'Find mutual availability and propose meeting times' : 'View and manage your calendar holds'}
              </p>
            </div>
          </div>
          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-px">
            <button
              type="button"
              onClick={() => { setActiveView('new'); setStep(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeView === 'new'
                  ? 'bg-white border border-gray-200 border-b-white text-indigo-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              New Meeting
            </button>
            <button
              type="button"
              onClick={() => setActiveView('holds')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeView === 'holds'
                  ? 'bg-white border border-gray-200 border-b-white text-indigo-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Manage Holds
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Manage Holds View */}
        {activeView === 'holds' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Calendar Holds</h2>
              <ActiveHoldsSection />
            </div>
          </div>
        )}

        {/* New Meeting View */}
        {activeView === 'new' && (
          <>
        {/* Calendar Selector */}
        {availableCalendars.length > 0 && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Managing Calendar:
              </label>
              <select
                value={managedCalendarId}
                onChange={(e) => setManagedCalendarId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              >
                {availableCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary || cal.id} {cal.primary ? '(Your Calendar)' : ''} - {cal.id}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {availableCalendars.find(c => c.id === managedCalendarId)?.summary || managedCalendarId}
              {' • '}
              {availableCalendars.length} calendar{availableCalendars.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}

        {/* Quick Schedule Section - only show on step 1 */}
        {step === 1 && (
          <div className="mb-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Quick Schedule</h2>
                <p className="text-sm text-gray-600">
                  Skip the wizard — pick a preset to instantly propose times
                </p>
              </div>
            </div>
            <QuickScheduleButtons
              onSelectSlots={setPrefilledSlots}
              onLoadTemplate={handleLoadTemplate}
              meetingDuration={meetingDuration}
            />
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
            {errorMessage}
          </div>
        )}

        {/* Wizard Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          {/* Wizard Header */}
          {step === 1 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                Or customize your meeting details
              </h2>
              <p className="text-sm text-gray-500">
                Set participants, working hours, and timezone constraints
              </p>
            </div>
          )}

          <div className="p-6">
            {renderStepper()}

            <div className="mt-6">
              {step === 1 && renderStepOne()}
              {step === 2 && renderStepTwo()}
              {step === 3 && renderStepThree()}
            </div>
          </div>

          {/* Footer Actions - inside the card */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  navigate('/dashboard');
                } else if (step === 3 && prefilledSlots.length > 0) {
                  // Coming from quick options - go back to step 1
                  setStep(1);
                  setPrefilledSlots([]);
                  setSelectedSlots([]);
                } else {
                  // Normal flow - go to previous step
                  setStep(step === 3 ? 2 : 1);
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex items-center gap-3">
              {step === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateModal(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Save as Template
                  </button>
                  <button
                    type="button"
                    onClick={findCommonFreeSlots}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    {loading ? 'Searching...' : 'Find availability'}
                  </button>
                </>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={moveToSummary}
                  disabled={selectedSlots.length === 0}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Continue ({selectedSlots.length} selected)
                </button>
              )}
              {step === 3 && (
                <>
                  <button
                    type="button"
                    onClick={copyEmailToClipboard}
                    disabled={!emailDraft.trim()}
                    className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Copy message
                  </button>
                  <button
                    type="button"
                    onClick={createCalendarHolds}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    {loading ? 'Saving...' : 'Create holds'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Save Template Modal */}
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        currentConfig={currentTemplateConfig}
      />
    </div>
  );
}

export default SchedulePage;
