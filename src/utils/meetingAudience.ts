/**
 * Meeting audience utilities
 * Calculate internal vs external meeting breakdowns.
 */

import type { CalendarEvent } from '../types';
import { calculateDuration, isAllDayEvent } from './dateHelpers';
import { isMeeting } from './eventCategorizer';

export interface MeetingAudienceBreakdown {
  internalCount: number;
  externalCount: number;
  internalMinutes: number;
  externalMinutes: number;
}

const getDomainFromEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1 || atIndex === trimmed.length - 1) return null;
  return trimmed.slice(atIndex + 1);
};

const isServiceDomain = (domain: string) => domain.includes('calendar.google.com');

const resolveOwnerDomain = (event: CalendarEvent, calendarOwnerEmail?: string | null): { ownerDomain: string | null; ownerEmail: string | null } => {
  const candidates = [
    calendarOwnerEmail,
    event.organizer?.email,
    event.creator?.email,
    event.attendees?.find(att => att.self)?.email
  ];

  for (const candidate of candidates) {
    const domain = getDomainFromEmail(candidate);
    if (domain && !isServiceDomain(domain)) {
      return {
        ownerDomain: domain,
        ownerEmail: candidate ? candidate.trim().toLowerCase() : null
      };
    }
  }

  // Fall back to the raw calendar owner email even if it's a service domain
  if (calendarOwnerEmail) {
    const normalizedEmail = calendarOwnerEmail.trim().toLowerCase();
    const fallbackDomain = getDomainFromEmail(normalizedEmail);

    if (fallbackDomain && !isServiceDomain(fallbackDomain)) {
      return {
        ownerDomain: fallbackDomain,
        ownerEmail: normalizedEmail
      };
    }

    return {
      ownerDomain: null,
      ownerEmail: normalizedEmail
    };
  }

  return { ownerDomain: null, ownerEmail: null };
};

const hasExternalAttendee = (event: CalendarEvent, ownerDomain: string | null, ownerEmail: string | null) => {
  if (!event.attendees || event.attendees.length === 0) {
    return false;
  }

  return event.attendees.some(att => {
    if (!att.email) return false;

    const attendeeEmail = att.email.trim().toLowerCase();
    if (ownerEmail && attendeeEmail === ownerEmail) {
      return false;
    }

    const attendeeDomain = getDomainFromEmail(attendeeEmail);
    if (!attendeeDomain || isServiceDomain(attendeeDomain)) {
      return false;
    }

    if (!ownerDomain) {
      return false;
    }

    return attendeeDomain !== ownerDomain;
  });
};

export const calculateMeetingAudienceBreakdown = (
  events: CalendarEvent[],
  calendarOwnerEmail?: string | null
): MeetingAudienceBreakdown => {
  if (!events || events.length === 0) {
    return {
      internalCount: 0,
      externalCount: 0,
      internalMinutes: 0,
      externalMinutes: 0
    };
  }

  let internalCount = 0;
  let externalCount = 0;
  let internalMinutes = 0;
  let externalMinutes = 0;

  events.forEach(event => {
    if (!isMeeting(event) || isAllDayEvent(event)) {
      return;
    }

    const { ownerDomain, ownerEmail } = resolveOwnerDomain(event, calendarOwnerEmail);
    const durationMinutes = calculateDuration(
      event.start?.dateTime || '',
      event.end?.dateTime || ''
    );

    if (durationMinutes <= 0) {
      return;
    }

    if (ownerDomain && hasExternalAttendee(event, ownerDomain, ownerEmail)) {
      externalCount += 1;
      externalMinutes += durationMinutes;
    } else {
      internalCount += 1;
      internalMinutes += durationMinutes;
    }
  });

  return {
    internalCount,
    externalCount,
    internalMinutes,
    externalMinutes
  };
};
