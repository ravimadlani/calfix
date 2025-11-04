import React, { useEffect, useMemo, useState } from 'react';
import { useCalendarProvider } from '../context/CalendarProviderContext';

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

interface TeamSchedulingModalProps {
  onClose: () => void;
  onSchedule: (holds: Array<Record<string, unknown>>, emailDraft: string) => Promise<void>;
  managedCalendarId?: string;
  hostEmail?: string | null;
}

const TeamSchedulingModal: React.FC<TeamSchedulingModalProps> = ({
  onClose,
  onSchedule,
  managedCalendarId = 'primary',
  hostEmail = null
}) => {
  const { activeProvider } = useCalendarProvider();
  const providerFindFreeBusy = activeProvider.calendar.findFreeBusy;
  const providerCapabilities = activeProvider.capabilities;

  const defaultTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
    []
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const [isIpad, setIsIpad] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const suggestedTimezones = useMemo(() => {
    const existing = new Set(COMMON_TIMEZONES.map(tz => tz.value));
    if (!existing.has(defaultTimezone)) {
      return [{ value: defaultTimezone, label: `${defaultTimezone} (Current)` }, ...COMMON_TIMEZONES];
    }
    return COMMON_TIMEZONES;
  }, [defaultTimezone]);

  const hostParticipant = participants.find(person => person.role === 'host') ?? participants[0];

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
    const detectedIpad = /iPad/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
    setIsIpad(detectedIpad);
  }, []);

  useEffect(() => {
    if (step !== 3) {
      setCopyFeedback(null);
    }
  }, [step]);

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

Let me know which works best and I’ll confirm the invite.

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
      const attendees = participants
        .filter(person => person.sendInvite && person.email.trim())
        .map(person => ({ email: person.email.trim() }));

      const trimmedPurpose = meetingPurpose.trim();

      const holds = selectedSlots.map((slot, index) => {
        const fallbackTitle = `[Hold] ${trimmedPurpose} ${index + 1}`;
        const summary = holdTitles[index]?.trim() || fallbackTitle;

        return ({
          summary,
        description: [
          trimmedPurpose ? `Purpose: ${trimmedPurpose}` : null,
          respectedTimezones.length > 0
            ? `Guardrails: ${respectedTimezones.map(guard => guard.label || guard.timezone).join(', ')}`
            : null
        ].filter(Boolean).join('\n'),
          start: {
            dateTime: slot.start.toISOString(),
            timeZone: hostTimezone
          },
          end: {
            dateTime: slot.end.toISOString(),
            timeZone: hostTimezone
          },
          attendees,
          colorId: '11',
          transparency: 'opaque'
        });
      });

      await onSchedule(holds, emailDraft);
      onClose();
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
            ＋ Add timezone
          </button>
        </div>

        {respectedTimezones.length === 0 && (
          <p className="text-sm text-slate-500">
            No additional guardrails yet. Add one to account for a customer HQ or travel location.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 max-h-52 overflow-y-auto pr-1">
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
            ＋ Add teammate
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 max-h-64 overflow-y-auto pr-1">
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
            ✓ Selected
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
            style={{ maxHeight: '44vh' }}
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
            <h3 className="text-sm font-semibold text-slate-700">Participants &amp; guardrails</h3>
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
                const defaultTitle = `[Hold] ${meetingPurpose.trim()} ${index + 1}`;
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
                    <ul className="text-xs text-slate-500 space-y-1">
                      {timezoneSummaries.map(summary => (
                        <li key={summary.timezone}>
                          {summary.label}: {summary.range}{summary.hasFlex ? ' (flex window)' : ''}
                        </li>
                      ))}
                    </ul>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-3xl w-full max-w-4xl ${isIpad ? 'max-h-[100vh] overflow-y-auto' : 'max-h-[92vh] overflow-hidden'} flex flex-col shadow-2xl border border-slate-900/10`}
        style={isIpad ? { WebkitOverflowScrolling: 'touch' } : undefined}
      >
        <div
          className="px-6 py-5"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)',
            color: '#f8fafc'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Meeting Scheduler</h2>
              <p className="text-xs text-slate-200 mt-1">
                Step {step} of 3 · {
                  step === 1 ? 'Team & working hours' :
                  step === 2 ? 'Select availability' :
                  'Review & send'
                }
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl leading-none"
              style={{
                color: '#cbd5f5'
              }}
              onMouseEnter={(event) => { event.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(event) => { event.currentTarget.style.color = '#cbd5f5'; }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 bg-slate-50 flex flex-col">
          {errorMessage && (
            <div className="mb-4 border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              {errorMessage}
            </div>
          )}

          {renderStepper()}

          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {step === 1 && (
              <div className="pb-4">
                {renderStepOne()}
              </div>
            )}
            {step === 2 && (
              <div className="h-full">
                {renderStepTwo()}
              </div>
            )}
            {step === 3 && (
              <div className="pb-4">
                {renderStepThree()}
              </div>
            )}
          </div>
        </div>

        <div
          className="border-t border-slate-200 px-6 py-4 flex items-center justify-between backdrop-blur"
          style={{ background: 'rgba(226,232,240,0.9)' }}
        >
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep(step === 3 ? 2 : 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300"
            style={{
              backgroundColor: '#ffffff',
              color: '#1f2937'
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex items-center gap-3">
            {step === 1 && (
              <button
                type="button"
                onClick={findCommonFreeSlots}
                disabled={loading}
                className="px-6 py-3 rounded-xl text-sm font-semibold shadow-md shadow-slate-900/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff'
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = '#111827';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = '#1e293b';
                }}
              >
                {loading ? 'Searching…' : 'Find availability'}
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={moveToSummary}
                disabled={selectedSlots.length === 0}
                className="px-6 py-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff'
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = '#111827';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = '#1e293b';
                }}
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
                  className="px-5 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy message
                </button>
                <button
                  type="button"
                  onClick={createCalendarHolds}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#047857',
                    color: '#ffffff'
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = '#065f46';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = '#047857';
                  }}
                >
                  {loading ? 'Saving…' : 'Create holds'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSchedulingModal;
