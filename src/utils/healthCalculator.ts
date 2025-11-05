/**
 * Calendar Health Calculator
 * Algorithms for calculating calendar health metrics and scores
 */

import { calculateDuration, calculateGap, isAllDayEvent, getEventStartTime, getEventEndTime } from './dateHelpers';
import { isMeeting } from './eventCategorizer';

/**
 * Analyze gaps between consecutive events
 * Returns array of gap analyses with status (back-to-back, insufficient, focus-block)
 * @param {Array} events - Sorted array of calendar events
 * @returns {Array} Gap analysis results
 */
export const analyzeGaps = (events) => {
  if (!events || events.length < 2) return [];

  const gaps = [];

  for (let i = 0; i < events.length - 1; i++) {
    const currentEvent = events[i];
    const nextEvent = events[i + 1];

    // Skip all-day events for gap analysis
    if (isAllDayEvent(currentEvent) || isAllDayEvent(nextEvent)) {
      continue;
    }

    // Check if both events are actual meetings (have attendees)
    const isCurrentMeeting = isMeeting(currentEvent);
    const isNextMeeting = isMeeting(nextEvent);

    const gapMinutes = calculateGap(currentEvent, nextEvent);

    let status = 'normal';
    let color = 'gray';
    let recommendation = '';

    // Only flag back-to-back and insufficient buffers if both are actual meetings
    if (gapMinutes === 0 && isCurrentMeeting && isNextMeeting) {
      status = 'back-to-back';
      color = 'red';
      recommendation = 'Add a buffer to prevent burnout';
    } else if (gapMinutes > 0 && gapMinutes < 10 && isCurrentMeeting && isNextMeeting) {
      status = 'insufficient-buffer';
      color = 'orange';
      recommendation = 'Consider extending buffer to 10-15 minutes';
    } else if (gapMinutes >= 60 && gapMinutes <= 120) {
      // Only highlight 1-2 hour gaps as focus blocks
      status = 'focus-block';
      color = 'green';
      recommendation = 'Great! Use this for deep work';
    } else if (gapMinutes > 120) {
      // Gaps longer than 2 hours are just normal spacing
      status = 'normal';
      color = 'gray';
      recommendation = '';
    }

    gaps.push({
      afterEvent: currentEvent,
      beforeEvent: nextEvent,
      gapMinutes,
      status,
      color,
      recommendation,
      isCurrentMeeting,
      isNextMeeting
    });
  }

  return gaps;
};

/**
 * Calculate total meeting time in hours
 * @param {Array} events - Array of calendar events
 * @returns {number} Total hours of meetings
 */
export const calculateTotalMeetingTime = (events) => {
  if (!events || !events.length) return 0;

  let totalMinutes = 0;

  events.forEach(event => {
    if (isAllDayEvent(event)) return; // Skip all-day events

    const startTime = event.start?.dateTime;
    const endTime = event.end?.dateTime;

    if (startTime && endTime) {
      const duration = calculateDuration(startTime, endTime);

      // Only count if it's a meeting
      if (isMeeting(event)) {
        totalMinutes += duration;
      }
    }
  });

  return totalMinutes / 60; // Convert to hours
};

/**
 * Count back-to-back meetings (0 minute gap)
 * @param {Array} events - Sorted array of calendar events
 * @returns {number} Count of back-to-back meetings
 */
export const countBackToBack = (events) => {
  const gaps = analyzeGaps(events);
  return gaps.filter(gap => gap.status === 'back-to-back').length;
};

/**
 * Count insufficient buffers (< 10 minute gap)
 * @param {Array} events - Sorted array of calendar events
 * @returns {number} Count of insufficient buffers
 */
export const countInsufficientBuffers = (events) => {
  const gaps = analyzeGaps(events);
  return gaps.filter(gap => gap.status === 'insufficient-buffer').length;
};

/**
 * Count focus time blocks (>= 60 minute gap)
 * @param {Array} events - Sorted array of calendar events
 * @returns {number} Count of focus blocks
 */
export const countFocusBlocks = (events) => {
  const gaps = analyzeGaps(events);
  return gaps.filter(gap => gap.status === 'focus-block').length;
};

/**
 * Calculate calendar health score (0-100)
 * Algorithm:
 * - Start at 100
 * - Subtract 15 points per back-to-back meeting
 * - Subtract 8 points per insufficient buffer
 * - Add 8 points per focus block
 * - Subtract 10 points if > 6 hours of meetings
 * - Subtract 20 points if > 8 hours of meetings
 * - Cap between 0-100
 * @param {Array} events - Array of calendar events
 * @returns {number} Health score (0-100)
 */
export const calculateHealthScore = (events) => {
  if (!events || !events.length) return 100;

  let score = 100;

  const backToBackCount = countBackToBack(events);
  const insufficientBufferCount = countInsufficientBuffers(events);
  const focusBlockCount = countFocusBlocks(events);
  const totalMeetingHours = calculateTotalMeetingTime(events);

  // Penalties
  score -= backToBackCount * 15;
  score -= insufficientBufferCount * 8;

  // Bonuses
  score += focusBlockCount * 8;

  // Meeting load penalties
  if (totalMeetingHours > 6) {
    score -= 10;
  }
  if (totalMeetingHours > 8) {
    score -= 20;
  }

  // Cap between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Get health score interpretation (Excellent, Good, Fair, Poor)
 * @param {number} score - Health score (0-100)
 * @returns {Object} Interpretation with label, color, and message
 */
export const getHealthScoreInterpretation = (score: number): {
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: 'green' | 'blue' | 'yellow' | 'red';
  bgColor: string;
  textColor: string;
  message: string;
} => {
  if (score >= 80) {
    return {
      label: 'Excellent' as const,
      color: 'green' as const,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      message: 'Your calendar is well-balanced!'
    };
  } else if (score >= 60) {
    return {
      label: 'Good' as const,
      color: 'blue' as const,
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-800',
      message: 'Good calendar health with room for improvement'
    };
  } else if (score >= 40) {
    return {
      label: 'Fair' as const,
      color: 'yellow' as const,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      message: 'Consider optimizing your schedule'
    };
  } else {
    return {
      label: 'Poor' as const,
      color: 'red' as const,
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      message: 'Your calendar needs attention'
    };
  }
};

/**
 * Generate actionable insights and recommendations
 * @param {Array} events - Array of calendar events
 * @returns {Array} Array of insight objects
 */
export const generateInsights = (events) => {
  if (!events || !events.length) {
    return [{
      type: 'info',
      icon: '📅',
      message: 'No events found for this time period'
    }];
  }

  const insights = [];
  const backToBackCount = countBackToBack(events);
  const focusBlockCount = countFocusBlocks(events);
  const totalMeetingHours = calculateTotalMeetingTime(events);

  // Back-to-back meetings warning
  if (backToBackCount > 0) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      color: 'red',
      message: `You have ${backToBackCount} back-to-back meeting${backToBackCount > 1 ? 's' : ''} - consider adding buffers`
    });
  }

  // Focus time insights
  if (focusBlockCount === 0) {
    insights.push({
      type: 'warning',
      icon: '🎯',
      color: 'orange',
      message: 'No focus time found - try to protect at least 1 hour for deep work'
    });
  } else {
    insights.push({
      type: 'success',
      icon: '✅',
      color: 'green',
      message: `Great! You have ${focusBlockCount} focus block${focusBlockCount > 1 ? 's' : ''} - use them for important projects`
    });
  }

  // Meeting load insights
  if (totalMeetingHours > 6) {
    insights.push({
      type: 'warning',
      icon: '⏰',
      color: 'orange',
      message: `High meeting load (${totalMeetingHours.toFixed(1)}h) - review if all meetings are essential`
    });
  }

  // Best practice reminders
  insights.push({
    type: 'tip',
    icon: '💡',
    color: 'blue',
    message: 'Morning review: Spend 10 mins planning your day'
  });

  insights.push({
    type: 'tip',
    icon: '🌅',
    color: 'blue',
    message: 'End-of-day review: Block 20-30 mins to wrap up and preview tomorrow'
  });

  return insights;
};

/**
 * Find optimal time slots for scheduling new events
 * Ranks gaps by size, time of day, and proximity to other events
 * @param {Array} events - Sorted array of calendar events
 * @param {number} durationMinutes - Required duration in minutes
 * @returns {Array} Array of suggested time slots
 */
export const findOptimalTimeSlots = (events, durationMinutes = 60) => {
  const gaps = analyzeGaps(events);

  const validSlots = gaps
    .filter(gap => gap.gapMinutes >= durationMinutes)
    .map(gap => {
      const startTime = new Date(gap.afterEvent.end.dateTime);
      const endTime = new Date(gap.beforeEvent.start.dateTime);
      const hour = startTime.getHours();

      // Score based on time of day (prefer mid-morning or early afternoon)
      let timeScore = 0;
      if (hour >= 9 && hour <= 11) timeScore = 10; // Mid-morning
      else if (hour >= 13 && hour <= 15) timeScore = 8; // Early afternoon
      else if (hour >= 8 && hour < 9) timeScore = 6; // Early morning
      else if (hour >= 15 && hour < 17) timeScore = 5; // Late afternoon
      else timeScore = 2; // Other times

      // Score based on gap size (prefer larger gaps)
      const sizeScore = Math.min(10, gap.gapMinutes / 30);

      const totalScore = timeScore + sizeScore;

      return {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        gapMinutes: gap.gapMinutes,
        score: totalScore,
        reason: `${gap.gapMinutes} min gap available`
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Return top 3 suggestions

  return validSlots;
};

/**
 * Detect double-booked time slots (overlapping events)
 * @param {Array} events - Array of calendar events
 * @returns {Array} Array of double-booking conflicts
 */
export const detectDoubleBookings = (events) => {
  if (!events || events.length < 2) return [];

  const conflicts = [];
  const timedEvents = events.filter(event => !isAllDayEvent(event));

  // Sort events by start time
  const sortedEvents = [...timedEvents].sort((a, b) => {
    const aStart = getEventStartTime(a);
    const bStart = getEventStartTime(b);
    return aStart.getTime() - bStart.getTime();
  });

  // Check each pair of events for overlap
  for (let i = 0; i < sortedEvents.length; i++) {
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const event1 = sortedEvents[i];
      const event2 = sortedEvents[j];

      // Only flag as double booking if at least one is a meeting (not a placeholder)
      const isMeeting1 = isMeeting(event1);
      const isMeeting2 = isMeeting(event2);

      // Skip if neither is a meeting (both are placeholders like focus time, lunch, etc.)
      if (!isMeeting1 && !isMeeting2) {
        continue;
      }

      const start1 = getEventStartTime(event1);
      const end1 = getEventEndTime(event1);
      const start2 = getEventStartTime(event2);
      const end2 = getEventEndTime(event2);

      // Check if events overlap
      // Event1 starts before Event2 ends AND Event1 ends after Event2 starts
      if (start1 < end2 && end1 > start2) {
        conflicts.push({
          event1,
          event2,
          overlapStart: new Date(Math.max(start1.getTime(), start2.getTime())),
          overlapEnd: new Date(Math.min(end1.getTime(), end2.getTime())),
          overlapMinutes: Math.round((Math.min(end1.getTime(), end2.getTime()) - Math.max(start1.getTime(), start2.getTime())) / (1000 * 60)),
          isMeeting1,
          isMeeting2
        });
      }
    }
  }

  return conflicts;
};

/**
 * Count double-booked slots
 * @param {Array} events - Array of calendar events
 * @returns {number} Number of double-booking conflicts
 */
export const countDoubleBookings = (events) => {
  return detectDoubleBookings(events).length;
};

/**
 * Find meetings that don't have video conferencing links
 * Checks for common video conferencing platforms in various event fields
 * @param {Array} events - Array of calendar events
 * @returns {Array} Array of meetings without video links
 */
export const findMeetingsWithoutVideoLinks = (events) => {
  if (!events || !events.length) return [];

  const meetingEvents = events.filter(event => !isAllDayEvent(event) && isMeeting(event));

  const meetingsWithoutLinks = meetingEvents.filter(event => {
    // Only flag meetings organized by the user (not just attending)
    const isOrganizer = event.organizer?.self === true;
    if (!isOrganizer) return false;

    // Only flag meetings with multiple attendees (more than just the organizer)
    const attendees = event.attendees || [];
    const hasMultipleAttendees = attendees.length > 0;
    if (!hasMultipleAttendees) return false;

    // Check for video conferencing indicators
    const hasConferenceData = event.conferenceData && event.conferenceData.entryPoints && event.conferenceData.entryPoints.length > 0;

    // Check for common video conferencing keywords in location or description
    const searchText = [
      event.location || '',
      event.description || '',
      event.hangoutLink || ''
    ].join(' ').toLowerCase();

    const videoKeywords = [
      'zoom.us',
      'meet.google.com',
      'teams.microsoft.com',
      'webex.com',
      'gotomeeting.com',
      'bluejeans.com',
      'whereby.com',
      'meet.jit.si',
      'http://',
      'https://'
    ];

    const hasVideoKeyword = videoKeywords.some(keyword => searchText.includes(keyword));

    // Return true if no video conferencing info found
    return !hasConferenceData && !hasVideoKeyword && !event.hangoutLink;
  });

  return meetingsWithoutLinks;
};

/**
 * Count meetings without video conferencing links
 * @param {Array} events - Array of calendar events
 * @returns {number} Number of meetings without video links
 */
export const countMeetingsWithoutVideoLinks = (events) => {
  return findMeetingsWithoutVideoLinks(events).length;
};

/**
 * Find two-person meetings where one or both parties have declined
 * These are candidates for deletion since they won't happen
 * @param {Array} events - Array of calendar events
 * @returns {Array} Meetings with declined attendees
 */
export const findDeclinedTwoPersonMeetings = (events) => {
  if (!events || !events.length) return [];

  const meetingEvents = events.filter(event => !isAllDayEvent(event) && isMeeting(event));

  console.log('=== DECLINED MEETINGS DEBUG ===');
  console.log('Total meeting events:', meetingEvents.length);

  const declinedMeetings = meetingEvents.filter(event => {
    // IMPORTANT: Skip flights - they should not be treated as declined meetings
    if (isFlight(event)) {
      console.log(`Skipping flight: "${event.summary}" - flights are not declined meetings`);
      return false;
    }

    const attendees = event.attendees || [];

    console.log(`Event: "${event.summary}", Attendees:`, attendees.length, attendees.map(a => ({
      email: a.email,
      displayName: a.displayName,
      self: a.self,
      responseStatus: a.responseStatus
    })));

    // Only look at meetings with exactly 2 people total
    // The attendees list includes both you and the other person
    if (attendees.length !== 2) return false;

    // Find yourself and the other person
    const selfAttendee = attendees.find(a => a.self === true);
    const otherAttendee = attendees.find(a => a.self !== true);

    // Check if either person has declined
    const selfDeclined = selfAttendee?.responseStatus === 'declined';
    const otherPersonDeclined = otherAttendee?.responseStatus === 'declined';

    const isDeclined = otherPersonDeclined || selfDeclined;

    if (isDeclined) {
      console.log(`✓ DECLINED: "${event.summary}" - otherDeclined: ${otherPersonDeclined} (${otherAttendee?.email}), selfDeclined: ${selfDeclined}`);
    }

    // Return true if either person has declined (meeting won't happen)
    return isDeclined;
  });

  console.log('Total declined meetings found:', declinedMeetings.length);
  console.log('==============================');

  return declinedMeetings;
};

/**
 * Count two-person meetings where the other person has declined
 * @param {Array} events - Array of calendar events
 * @returns {number} Number of declined two-person meetings
 */
export const countDeclinedTwoPersonMeetings = (events) => {
  return findDeclinedTwoPersonMeetings(events).length;
};

/**
 * Check if an event is a flight based on keywords in the title
 * @param {Object} event - Calendar event
 * @returns {boolean} True if event appears to be a flight
 */
export const isFlight = (event) => {
  if (!event || !event.summary) return false;

  const summary = event.summary.toLowerCase();

  // Check for "flight:" keyword
  if (summary.includes('flight:')) return true;

  // Check for airline codes like "BA123" or "BA 123"
  // Common airline codes: BA, AA, UA, DL, LH, AF, KL, etc.
  const airlinePattern = /\b(ba|aa|ua|dl|lh|af|kl|vs|ey|qr|tk|sq|ek|qf|nz|ca|cx|jl|nh|ai|ga|ke|sa|la|cm|av|am)\s?\d{1,4}\b/i;
  if (airlinePattern.test(summary)) return true;

  return false;
};

/**
 * Find flights that are missing travel blocks before or after
 * @param {Array} events - Array of calendar events
 * @returns {Array} Flights missing travel blocks
 */
export const findFlightsWithoutTravelBlocks = (events) => {
  if (!events || !events.length) return [];

  console.log('=== FLIGHT DETECTION DEBUG ===');

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = getEventStartTime(a);
    const bTime = getEventStartTime(b);
    return aTime.getTime() - bTime.getTime();
  });

  const flightsNeedingTravelBlocks = [];

  sortedEvents.forEach(event => {
    // Skip all-day events
    if (isAllDayEvent(event)) return;

    // Check if this is a flight
    if (!isFlight(event)) return;

    console.log(`Found flight: "${event.summary}"`);

    const flightStart = getEventStartTime(event);
    const flightEnd = getEventEndTime(event);

    // Check for existing travel block BEFORE the flight
    // Look for ANY event that ends at or just before the flight starts
    let hasTravelBlockBefore = false;

    for (const e of sortedEvents) {
      if (isAllDayEvent(e) || e.id === event.id) continue;

      const eEnd = getEventEndTime(e);
      const eSummary = (e.summary || '').toLowerCase();
      const isTravelBlock = eSummary.includes('travel') || eSummary.includes('transit');

      // Check if this travel block ends at or within 1 minute of the flight start
      const timeDiff = Math.abs(flightStart.getTime() - eEnd.getTime()) / (1000 * 60); // minutes

      if (isTravelBlock && timeDiff <= 1 && eEnd <= flightStart) {
        hasTravelBlockBefore = true;
        console.log(`  Found travel block before: "${e.summary}"`);
        break;
      }
    }

    // Check for existing travel block AFTER the flight
    // Look for ANY event that starts at or just after the flight ends
    let hasTravelBlockAfter = false;

    for (const e of sortedEvents) {
      if (isAllDayEvent(e) || e.id === event.id) continue;

      const eStart = getEventStartTime(e);
      const eSummary = (e.summary || '').toLowerCase();
      const isTravelBlock = eSummary.includes('travel') || eSummary.includes('transit');

      // Check if this travel block starts at or within 1 minute of the flight end
      const timeDiff = Math.abs(eStart.getTime() - flightEnd.getTime()) / (1000 * 60); // minutes

      if (isTravelBlock && timeDiff <= 1 && eStart >= flightEnd) {
        hasTravelBlockAfter = true;
        console.log(`  Found travel block after: "${e.summary}"`);
        break;
      }
    }

    if (!hasTravelBlockBefore || !hasTravelBlockAfter) {
      console.log(`  Missing travel blocks - Before: ${!hasTravelBlockBefore}, After: ${!hasTravelBlockAfter}`);
      flightsNeedingTravelBlocks.push({
        ...event,
        needsTravelBlockBefore: !hasTravelBlockBefore,
        needsTravelBlockAfter: !hasTravelBlockAfter
      });
    }
  });

  console.log('Total flights needing travel blocks:', flightsNeedingTravelBlocks.length);
  console.log('==============================');

  return flightsNeedingTravelBlocks;
};

/**
 * Count flights missing travel blocks
 * @param {Array} events - Array of calendar events
 * @returns {number} Number of flights missing travel blocks
 */
export const countFlightsWithoutTravelBlocks = (events) => {
  return findFlightsWithoutTravelBlocks(events).length;
};

/**
 * User's home/default location
 * TODO: Make this configurable in settings
 */
const HOME_LOCATION = {
  city: 'London',
  country: 'United Kingdom',
  timezone: 'Europe/London',
  flag: '🇬🇧'
};

/**
 * Airport code to country/timezone mapping
 */
const airportData = {
  // US Airports
  'SFO': { country: 'United States', city: 'San Francisco', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  'LAX': { country: 'United States', city: 'Los Angeles', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  'PSP': { country: 'United States', city: 'Palm Springs', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  'JFK': { country: 'United States', city: 'New York', timezone: 'America/New_York', flag: '🇺🇸' },
  'EWR': { country: 'United States', city: 'Newark', timezone: 'America/New_York', flag: '🇺🇸' },
  'ORD': { country: 'United States', city: 'Chicago', timezone: 'America/Chicago', flag: '🇺🇸' },
  'DFW': { country: 'United States', city: 'Dallas', timezone: 'America/Chicago', flag: '🇺🇸' },
  'ATL': { country: 'United States', city: 'Atlanta', timezone: 'America/New_York', flag: '🇺🇸' },
  'MIA': { country: 'United States', city: 'Miami', timezone: 'America/New_York', flag: '🇺🇸' },
  'SEA': { country: 'United States', city: 'Seattle', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  'BOS': { country: 'United States', city: 'Boston', timezone: 'America/New_York', flag: '🇺🇸' },

  // UK Airports
  'LHR': { country: 'United Kingdom', city: 'London', timezone: 'Europe/London', flag: '🇬🇧' },
  'LGW': { country: 'United Kingdom', city: 'London', timezone: 'Europe/London', flag: '🇬🇧' },
  'MAN': { country: 'United Kingdom', city: 'Manchester', timezone: 'Europe/London', flag: '🇬🇧' },
  'EDI': { country: 'United Kingdom', city: 'Edinburgh', timezone: 'Europe/London', flag: '🇬🇧' },

  // European Airports
  'CDG': { country: 'France', city: 'Paris', timezone: 'Europe/Paris', flag: '🇫🇷' },
  'FRA': { country: 'Germany', city: 'Frankfurt', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  'AMS': { country: 'Netherlands', city: 'Amsterdam', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
  'MAD': { country: 'Spain', city: 'Madrid', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  'BCN': { country: 'Spain', city: 'Barcelona', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  'FCO': { country: 'Italy', city: 'Rome', timezone: 'Europe/Rome', flag: '🇮🇹' },
  'ZRH': { country: 'Switzerland', city: 'Zurich', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  'CPH': { country: 'Denmark', city: 'Copenhagen', timezone: 'Europe/Copenhagen', flag: '🇩🇰' },

  // Asian Airports
  'HND': { country: 'Japan', city: 'Tokyo', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  'NRT': { country: 'Japan', city: 'Tokyo', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  'ICN': { country: 'South Korea', city: 'Seoul', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  'PVG': { country: 'China', city: 'Shanghai', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
  'PEK': { country: 'China', city: 'Beijing', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
  'SIN': { country: 'Singapore', city: 'Singapore', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  'HKG': { country: 'Hong Kong', city: 'Hong Kong', timezone: 'Asia/Hong_Kong', flag: '🇭🇰' },
  'BKK': { country: 'Thailand', city: 'Bangkok', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
  'DEL': { country: 'India', city: 'Delhi', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  'BOM': { country: 'India', city: 'Mumbai', timezone: 'Asia/Kolkata', flag: '🇮🇳' },

  // Middle East
  'DXB': { country: 'UAE', city: 'Dubai', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  'DOH': { country: 'Qatar', city: 'Doha', timezone: 'Asia/Qatar', flag: '🇶🇦' },

  // Australia
  'SYD': { country: 'Australia', city: 'Sydney', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  'MEL': { country: 'Australia', city: 'Melbourne', timezone: 'Australia/Melbourne', flag: '🇦🇺' }
};

/**
 * Extract airport codes from flight summary
 * @param {string} summary - Flight event summary
 * @returns {Object} { from, to } airport codes
 */
const extractAirportCodes = (summary) => {
  // Match patterns like "SFO to LHR", "from SFO to LHR", "SFO-LHR", "SFO → LHR"
  const pattern = /\b([A-Z]{3})\b.*?(?:to|-|→|>)\s*\b([A-Z]{3})\b/i;
  const match = summary.match(pattern);

  if (match) {
    return { from: match[1].toUpperCase(), to: match[2].toUpperCase() };
  }

  return null;
};

/**
 * Find international flights missing location tracking events
 * @param {Array} events - Array of calendar events
 * @returns {Array} International flights needing location events
 */
export const findInternationalFlightsWithoutLocation = (events) => {
  if (!events || !events.length) return [];

  console.log('=== INTERNATIONAL FLIGHT DETECTION ===');

  const sortedEvents = [...events].sort((a, b) => {
    const aTime = getEventStartTime(a);
    const bTime = getEventStartTime(b);
    return aTime.getTime() - bTime.getTime();
  });

  const flightsNeedingLocation = [];

  // Debug: Check how many potential flight events we have
  const timedEvents = sortedEvents.filter(e => !isAllDayEvent(e));
  console.log(`Total timed events: ${timedEvents.length}`);

  // Check for events with "Flight" or "BA" in the title
  const potentialFlights = timedEvents.filter(e => {
    const summary = (e.summary || '').toLowerCase();
    return summary.includes('flight') || summary.includes('ba ') || /ba\s?\d+/.test(summary);
  });
  console.log(`Potential flights (with 'flight' or 'BA' in summary): ${potentialFlights.length}`);
  potentialFlights.forEach((f, i) => console.log(`  Potential ${i}: ${f.summary}`));

  const flights = sortedEvents.filter(e => !isAllDayEvent(e) && isFlight(e));
  console.log(`Total flights found (after isFlight filter): ${flights.length}`);
  flights.forEach((f, i) => console.log(`  Flight ${i}: ${f.summary}`));

  // Group outbound and return flights
  flights.forEach((event, index) => {
    const airports = extractAirportCodes(event.summary);
    if (!airports) {
      console.log(`Could not extract airports from: "${event.summary}"`);
      return;
    }

    const fromData = airportData[airports.from];
    const toData = airportData[airports.to];

    if (!fromData || !toData) {
      console.log(`Unknown airports: ${airports.from} or ${airports.to}`);
      return;
    }

    // Check if destination is different from home location
    const isReturningHome = toData.city === HOME_LOCATION.city;

    // Check if this is part of a multi-leg return journey home
    // (e.g., PSP → SFO, then SFO → LHR within 24 hours)
    let isPartOfReturnJourney = false;
    if (!isReturningHome) {
      const arrivalTime = getEventEndTime(event);
      for (let i = index + 1; i < flights.length; i++) {
        const nextFlight = flights[i];
        const nextAirports = extractAirportCodes(nextFlight.summary);
        if (nextAirports) {
          const nextFromData = airportData[nextAirports.from];
          const nextToData = airportData[nextAirports.to];
          const nextFlightTime = getEventStartTime(nextFlight);
          const timeDiff = (nextFlightTime.getTime() - new Date(arrivalTime).getTime()) / (1000 * 60 * 60);

          // If next flight starts from where this lands, within 24h, and goes home
          if (nextFromData?.city === toData.city &&
              nextToData?.city === HOME_LOCATION.city &&
              timeDiff < 24 && timeDiff > 0) {
            isPartOfReturnJourney = true;
            console.log(`Flight ${airports.from} → ${airports.to} is part of return journey (connects to ${nextAirports.from} → ${nextAirports.to})`);
            break;
          }
        }
      }
    }

    // Only track outbound flights (leaving home)
    if ((fromData.country !== toData.country || fromData.city !== toData.city) && !isReturningHome && !isPartOfReturnJourney) {
      console.log(`Outbound flight found: ${airports.from} (${fromData.city}) → ${airports.to} (${toData.city})`);

      // Check if there's a connecting flight to a final destination
      // (e.g., LHR → SFO, then SFO → PSP within 24 hours)
      let finalDestinationData = toData;
      let finalDestinationAirport = airports.to;
      const arrivalTime = getEventEndTime(event);

      // Look for connecting flights within 24 hours
      for (let i = index + 1; i < flights.length; i++) {
        const nextFlight = flights[i];
        const nextAirports = extractAirportCodes(nextFlight.summary);

        if (nextAirports) {
          const nextFromData = airportData[nextAirports.from];
          const nextToData = airportData[nextAirports.to];
          const nextFlightTime = getEventStartTime(nextFlight);

          // Check if this is a connecting flight (starts from where we just arrived, within 24 hours)
          const timeDiff = (nextFlightTime.getTime() - new Date(arrivalTime).getTime()) / (1000 * 60 * 60); // hours
          if (nextFromData?.city === finalDestinationData.city && timeDiff < 24 && timeDiff > 0) {
            console.log(`  Found connecting flight: ${nextAirports.from} → ${nextAirports.to} (${timeDiff.toFixed(1)}h later)`);
            finalDestinationData = nextToData;
            finalDestinationAirport = nextAirports.to;
          }
        }
      }

      if (finalDestinationAirport !== airports.to) {
        console.log(`  Final destination: ${finalDestinationData?.city} (via connecting flight)`);
      }

      const finalArrivalTime = getEventEndTime(event);
      const arrivalDate = new Date(finalArrivalTime);
      arrivalDate.setHours(0, 0, 0, 0); // Start of arrival day

      // Find return flight from final destination back towards home
      let returnFlight = null;
      let departureDate = null;

      for (let i = index + 1; i < flights.length; i++) {
        const futureEvent = flights[i];
        const futureAirports = extractAirportCodes(futureEvent.summary);

        if (futureAirports) {
          const futureFromData = airportData[futureAirports.from];
          const futureToData = airportData[futureAirports.to];

          // Check if this flight starts the journey home from final destination
          // It could be direct home, or to a connecting city that leads home
          if (futureFromData?.city === finalDestinationData?.city) {
            // This is leaving the final destination
            // Check if it goes directly home, or if there's a connecting flight home
            if (futureToData?.city === HOME_LOCATION.city) {
              // Direct flight home
              returnFlight = futureEvent;
              const departureTime = getEventStartTime(returnFlight);
              departureDate = new Date(departureTime);
              departureDate.setHours(0, 0, 0, 0);
              console.log(`  Found direct return flight: ${futureAirports.from} → ${futureAirports.to}`);
              break;
            } else {
              // Check if next flight goes home (connecting flight)
              for (let j = i + 1; j < flights.length; j++) {
                const nextFlight = flights[j];
                const nextAirports = extractAirportCodes(nextFlight.summary);

                if (nextAirports) {
                  const nextFromData = airportData[nextAirports.from];
                  const nextToData = airportData[nextAirports.to];
                  const nextFlightTime = getEventStartTime(nextFlight);
                  const thisFlightTime = getEventStartTime(futureEvent);
                  const timeDiff = (nextFlightTime.getTime() - thisFlightTime.getTime()) / (1000 * 60 * 60);

                  // If next flight is from where this flight lands, and goes home, within 24h
                  if (nextFromData?.city === futureToData?.city &&
                      nextToData?.city === HOME_LOCATION.city &&
                      timeDiff < 24 && timeDiff > 0) {
                    returnFlight = futureEvent; // The first leg starting from final destination
                    const departureTime = getEventStartTime(futureEvent);
                    departureDate = new Date(departureTime);
                    departureDate.setHours(0, 0, 0, 0);
                    console.log(`  Found return flight via connection: ${futureAirports.from} → ${futureAirports.to} → ${nextAirports.to}`);
                    break;
                  }
                }
              }
              if (returnFlight) break;
            }
          }
        }
      }

      // If no return flight found, default to 7 days
      if (!departureDate) {
        departureDate = new Date(arrivalDate);
        departureDate.setDate(departureDate.getDate() + 7);
        console.log(`  No return flight found, defaulting to 7 days`);
      }

      // Check if location event already exists covering this period
      const hasLocationEvent = sortedEvents.some(e => {
        if (!isAllDayEvent(e)) return false;

        const eSummary = (e.summary || '').toLowerCase();
        const isLocationEvent = eSummary.includes('location:') ||
                               eSummary.includes(finalDestinationData.city.toLowerCase()) ||
                               eSummary.includes(finalDestinationData.flag);

        if (!isLocationEvent) return false;

        // Check if it covers the arrival date
        const eStart = new Date(e.start?.date || e.start?.dateTime);
        const eEnd = new Date(e.end?.date || e.end?.dateTime);
        eStart.setHours(0, 0, 0, 0);
        eEnd.setHours(0, 0, 0, 0);

        // Event covers arrival date if start <= arrival AND end >= arrival
        return eStart <= arrivalDate && eEnd >= arrivalDate;
      });

      if (!hasLocationEvent) {
        console.log(`  Missing location event for stay in ${finalDestinationData.city} (${arrivalDate.toDateString()} - ${departureDate.toDateString()})`);
        flightsNeedingLocation.push({
          ...event,
          fromAirport: airports.from,
          toAirport: finalDestinationAirport,
          fromData,
          toData: finalDestinationData,
          arrivalDate,
          departureDate,
          returnFlight,
          isReturningHome: false
        });
      }
    } else if (isReturningHome) {
      // This is a return flight home - no location tracking needed for home
      console.log(`Return flight to ${HOME_LOCATION.city} from ${fromData.city} - no location tracking needed`);
    }
  });

  console.log('Total trips needing location:', flightsNeedingLocation.length);
  console.log('======================================');

  return flightsNeedingLocation;
};

/**
 * Count international flights missing location tracking
 * @param {Array} events - Array of calendar events
 * @returns {number} Number of international flights missing location events
 */
export const countInternationalFlightsWithoutLocation = (events) => {
  return findInternationalFlightsWithoutLocation(events).length;
};

/**
 * Find the location event covering a specific date
 * @param {Date} date - The date to check
 * @param {Array} events - All events
 * @returns {Object|null} - Location event or null
 */
export const findLocationForDate = (date, events) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return events.find(e => {
    // Must be an all-day event
    if (!e.start?.date) return false;

    const summary = (e.summary || '').toLowerCase();
    if (!summary.includes('location:')) return false;

    // Check if this location event covers the target date
    const startDate = new Date(e.start.date);
    const endDate = new Date(e.end.date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return startDate <= targetDate && endDate >= targetDate;
  });
};

/**
 * Extract timezone from location event description
 * @param {Object} event - Location event
 * @returns {string|null} - Timezone (e.g., 'America/Los_Angeles') or null
 */
export const extractTimezoneFromLocation = (event) => {
  const description = event.description || '';
  const match = description.match(/Timezone:\s+([^\n]+)/);
  return match ? match[1].trim() : null;
};

/**
 * Check if a meeting time is outside business hours (8am-6pm) in a given timezone
 * @param {Date} meetingTime - Meeting start time
 * @param {string} timezone - IANA timezone (e.g., 'America/Los_Angeles')
 * @returns {boolean} - True if outside business hours
 */
export const isOutsideBusinessHours = (meetingTime, timezone) => {
  try {
    // Convert meeting time to the target timezone
    const localTime = new Date(meetingTime.toLocaleString('en-US', { timeZone: timezone }));
    const hour = localTime.getHours();

    // Business hours: 8am (8) to 6pm (18)
    return hour < 8 || hour >= 18;
  } catch (error) {
    console.error('Error checking business hours:', error);
    return false;
  }
};

/**
 * Extract location details from location event summary
 * @param {Object} event - Location event
 * @returns {Object|null} - Location details or null
 */
export const extractLocationFromEvent = (event) => {
  if (!event || !event.summary) return null;

  // Format: "🇺🇸 Location: San Francisco, United States"
  const match = event.summary.match(/^(.+?)\s+Location:\s+([^,]+),\s+(.+)$/);
  if (match) {
    return {
      flag: match[1].trim(),
      city: match[2].trim(),
      country: match[3].trim()
    };
  }
  return null;
};

/**
 * Find meetings outside business hours when in a different location
 * Flags meetings that would be during normal hours at home but are out of hours at the foreign location
 * @param {Array} events - Array of calendar events
 * @returns {Array} - Array of meetings with outOfHours flag
 */
export const findMeetingsOutsideBusinessHours = (events) => {
  if (!events || !events.length) return [];

  const sortedEvents = [...events].sort((a, b) => {
    const aTime = getEventStartTime(a);
    const bTime = getEventStartTime(b);
    return aTime.getTime() - bTime.getTime();
  });

  const meetingsOutOfHours = [];

  sortedEvents.forEach(event => {
    // Skip all-day events
    if (isAllDayEvent(event)) return;

    // Skip non-meetings
    if (!isMeeting(event)) return;

    const startTime = getEventStartTime(event);
    if (!startTime) return;

    // Find location event for this date
    const locationEvent = findLocationForDate(startTime, sortedEvents);

    // If no location event, assume at home - no need to flag
    if (!locationEvent) return;

    // Extract timezone from location event
    const foreignTimezone = extractTimezoneFromLocation(locationEvent);
    if (!foreignTimezone) return;

    // Skip if location is home timezone
    if (foreignTimezone === HOME_LOCATION.timezone) return;

    // Extract location details for display
    const locationDetails = extractLocationFromEvent(locationEvent);

    // Check if meeting is outside business hours in the FOREIGN location's timezone
    const isOutOfHoursInForeignLocation = isOutsideBusinessHours(startTime, foreignTimezone);

    // Check if meeting is during business hours in HOME timezone
    const isWithinHoursAtHome = !isOutsideBusinessHours(startTime, HOME_LOCATION.timezone);

    // Flag if it's out of hours in foreign location (regardless of home time)
    // This helps identify when you're taking meetings at inconvenient local times
    if (isOutOfHoursInForeignLocation) {
      // Calculate what time it is in both timezones
      const foreignLocalTime = new Date(startTime.toLocaleString('en-US', { timeZone: foreignTimezone }));
      const homeLocalTime = new Date(startTime.toLocaleString('en-US', { timeZone: HOME_LOCATION.timezone }));

      meetingsOutOfHours.push({
        ...event,
        locationEvent,
        locationCity: locationDetails?.city || 'Unknown',
        locationCountry: locationDetails?.country || 'Unknown',
        locationFlag: locationDetails?.flag || '🌍',
        foreignTimezone,
        homeTimezone: HOME_LOCATION.timezone,
        foreignLocalHour: foreignLocalTime.getHours(),
        homeLocalHour: homeLocalTime.getHours(),
        isWithinHoursAtHome,
        outOfHoursInTimezone: foreignTimezone
      });
    }
  });

  return meetingsOutOfHours;
};

/**
 * Count meetings outside business hours
 * @param {Array} events - Array of calendar events
 * @returns {number} - Count of meetings outside business hours
 */
export const countMeetingsOutsideBusinessHours = (events) => {
  return findMeetingsOutsideBusinessHours(events).length;
};
