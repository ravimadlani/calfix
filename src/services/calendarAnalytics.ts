/**
 * Calendar Analytics Service
 * High-level service that combines utilities and API for analytics
 */

import type { CalendarEvent } from '../types';
import { getEventStartTime, isAllDayEvent } from '../utils/dateHelpers';
import { isMeeting } from '../utils/eventCategorizer';
import {
  analyzeGaps,
  countBackToBack,
  countFocusBlocks,
  countInsufficientBuffers,
  generateInsights,
  detectDoubleBookings,
  findMeetingsWithoutVideoLinks,
  findDeclinedTwoPersonMeetings,
  findFlightsWithoutTravelBlocks,
  findInternationalFlightsWithoutLocation,
  findMeetingsOutsideBusinessHours
} from '../utils/healthCalculator';
import { calculateMeetingAudienceBreakdown } from '../utils/meetingAudience';

/**
 * Calculate comprehensive analytics for a set of events
 * @param {Array} events - Array of calendar events
 * @param {Array} extendedEvents - Extended event range for flight analysis (optional)
 * @returns {Object} Analytics data
 */
export const calculateAnalytics = (
  events: CalendarEvent[],
  extendedEvents: CalendarEvent[] | null = null,
  calendarOwnerEmail?: string | null
) => {
  if (!events || !events.length) {
    return {
      totalEvents: 0,
      totalMeetings: 0,
      totalMeetingHours: 0,
      internalMeetingCount: 0,
      externalMeetingCount: 0,
      internalMeetingHours: 0,
      externalMeetingHours: 0,
      backToBackCount: 0,
      insufficientBufferCount: 0,
      focusBlockCount: 0,
      gaps: [],
      insights: generateInsights([]),
      doubleBookings: [],
      doubleBookingCount: 0,
      meetingsWithoutVideoLinks: [],
      missingVideoLinkCount: 0,
      declinedTwoPersonMeetings: [],
      declinedMeetingCount: 0,
      flightsWithoutTravelBlocks: [],
      flightsNeedingTravelBlockCount: 0,
      internationalFlightsWithoutLocation: [],
      internationalFlightsNeedingLocationCount: 0,
      meetingsOutsideBusinessHours: [],
      outOfHoursMeetingCount: 0
    };
  }

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = getEventStartTime(a);
    const bTime = getEventStartTime(b);
    return aTime.getTime() - bTime.getTime();
  });

  // Filter out all-day events for certain calculations
  const timedEvents = sortedEvents.filter(event => !isAllDayEvent(event));

  // Meeting audience breakdown
  const {
    internalCount,
    externalCount,
    internalMinutes,
    externalMinutes
  } = calculateMeetingAudienceBreakdown(timedEvents, calendarOwnerEmail);

  const totalMeetings = internalCount + externalCount;
  const internalMeetingHours = internalMinutes / 60;
  const externalMeetingHours = externalMinutes / 60;
  const totalMeetingHours = internalMeetingHours + externalMeetingHours;

  // Calculate metrics
  const backToBackCount = countBackToBack(timedEvents);
  const insufficientBufferCount = countInsufficientBuffers(timedEvents);
  const focusBlockCount = countFocusBlocks(timedEvents);
  const gaps = analyzeGaps(timedEvents);
  const insights = generateInsights(timedEvents);

  // New metrics
  const doubleBookings = detectDoubleBookings(sortedEvents);
  const doubleBookingCount = doubleBookings.length;
  const meetingsWithoutVideoLinks = findMeetingsWithoutVideoLinks(sortedEvents);
  const missingVideoLinkCount = meetingsWithoutVideoLinks.length;
  const declinedTwoPersonMeetings = findDeclinedTwoPersonMeetings(sortedEvents);
  const declinedMeetingCount = declinedTwoPersonMeetings.length;
  const flightsWithoutTravelBlocks = findFlightsWithoutTravelBlocks(sortedEvents);
  const flightsNeedingTravelBlockCount = flightsWithoutTravelBlocks.length;

  // Use extended events for international flight analysis if available
  // This allows scanning ahead for return flights that may be outside current view
  const eventsForFlightAnalysis = extendedEvents || sortedEvents;
  console.log('calculateAnalytics: eventsForFlightAnalysis count:', eventsForFlightAnalysis.length);
  console.log('calculateAnalytics: extendedEvents provided?', !!extendedEvents);
  const internationalFlightsWithoutLocation = findInternationalFlightsWithoutLocation(eventsForFlightAnalysis);
  const internationalFlightsNeedingLocationCount = internationalFlightsWithoutLocation.length;
  console.log('calculateAnalytics: found', internationalFlightsNeedingLocationCount, 'international flights without location');

  // Find meetings outside business hours when in a foreign location
  const meetingsOutsideBusinessHours = findMeetingsOutsideBusinessHours(sortedEvents);
  const outOfHoursMeetingCount = meetingsOutsideBusinessHours.length;

  return {
    totalEvents: events.length,
    totalMeetings,
    totalMeetingHours,
    internalMeetingCount: internalCount,
    externalMeetingCount: externalCount,
    internalMeetingHours,
    externalMeetingHours,
    backToBackCount,
    insufficientBufferCount,
    focusBlockCount,
    gaps,
    insights,
    doubleBookings,
    doubleBookingCount,
    meetingsWithoutVideoLinks,
    missingVideoLinkCount,
    declinedTwoPersonMeetings,
    declinedMeetingCount,
    flightsWithoutTravelBlocks,
    flightsNeedingTravelBlockCount,
    internationalFlightsWithoutLocation,
    internationalFlightsNeedingLocationCount,
    meetingsOutsideBusinessHours,
    outOfHoursMeetingCount
  };
};

/**
 * Get events with gap information attached
 * @param {Array} events - Array of calendar events
 * @returns {Array} Events with gap info
 */
export const getEventsWithGaps = (events: CalendarEvent[]) => {
  if (!events || !events.length) {
    return [];
  }

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = getEventStartTime(a);
    const bTime = getEventStartTime(b);
    return aTime.getTime() - bTime.getTime();
  });

  const gaps = analyzeGaps(sortedEvents);

  // Attach gap info to events
  return sortedEvents.map(event => {
    // Find gap after this event
    const gapAfter = gaps.find(gap => gap.afterEvent.id === event.id);

    return {
      ...event,
      gapAfter: gapAfter || null
    };
  });
};

/**
 * Get problematic events (back-to-back or insufficient buffers)
 * @param {Array} events - Array of calendar events
 * @returns {Array} Problematic events with recommendations
 */
export const getProblematicEvents = (events: CalendarEvent[]) => {
  if (!events || !events.length) {
    return [];
  }

  const gaps = analyzeGaps(events);

  // Find gaps that are problematic
  const problematicGaps = gaps.filter(
    gap => gap.status === 'back-to-back' || gap.status === 'insufficient-buffer'
  );

  // Return events involved in problematic gaps
  const problematicEvents = [];

  problematicGaps.forEach(gap => {
    problematicEvents.push({
      event: gap.afterEvent,
      issue: gap.status,
      recommendation: gap.recommendation,
      nextEvent: gap.beforeEvent
    });
  });

  return problematicEvents;
};

/**
 * Get focus time opportunities (large gaps)
 * @param {Array} events - Array of calendar events
 * @returns {Array} Focus time opportunities
 */
export const getFocusOpportunities = (events: CalendarEvent[]) => {
  if (!events || !events.length) {
    return [];
  }

  const gaps = analyzeGaps(events);

  return gaps
    .filter(gap => gap.status === 'focus-block')
    .map(gap => ({
      startTime: new Date(gap.afterEvent.end.dateTime),
      endTime: new Date(gap.beforeEvent.start.dateTime),
      durationMinutes: gap.gapMinutes,
      beforeEvent: gap.afterEvent,
      afterEvent: gap.beforeEvent
    }));
};

/**
 * Get daily summary for a specific day
 * @param {Array} events - Array of calendar events for the day
 * @returns {Object} Daily summary
 */
export const getDailySummary = (events: CalendarEvent[], calendarOwnerEmail?: string | null) => {
  const analytics = calculateAnalytics(events, null, calendarOwnerEmail);

  // Calculate additional daily metrics
  const timedEvents = events.filter(event => !isAllDayEvent(event));

  let earliestMeeting = null;
  let latestMeeting = null;

  if (timedEvents.length > 0) {
    const meetingTimes = timedEvents.map(event => getEventStartTime(event).getTime());
    earliestMeeting = new Date(Math.min(...meetingTimes));

    const endTimes = timedEvents.map(event => new Date(event.end.dateTime || event.end.date).getTime());
    latestMeeting = new Date(Math.max(...endTimes));
  }

  // Calculate work day length
  let workDayHours = 0;
  if (earliestMeeting && latestMeeting) {
    const diffMs = latestMeeting - earliestMeeting;
    workDayHours = diffMs / (1000 * 60 * 60);
  }

  return {
    ...analytics,
    earliestMeeting,
    latestMeeting,
    workDayHours: Math.round(workDayHours * 10) / 10, // Round to 1 decimal
    hasEveningMeetings: latestMeeting && latestMeeting.getHours() >= 17,
    hasEarlyMeetings: earliestMeeting && earliestMeeting.getHours() < 9
  };
};

/**
 * Get weekly summary
 * @param {Array} events - Array of calendar events for the week
 * @returns {Object} Weekly summary
 */
export const getWeeklySummary = (events: CalendarEvent[], calendarOwnerEmail?: string | null) => {
  const analytics = calculateAnalytics(events, null, calendarOwnerEmail);

  // Group events by day
  const eventsByDay: Record<string, CalendarEvent[]> = {};

  events.forEach(event => {
    const startTime = getEventStartTime(event);
    if (!startTime) return;

    const dayName = startTime.toLocaleDateString('en-US', { weekday: 'long' });

    if (!eventsByDay[dayName]) {
      eventsByDay[dayName] = [];
    }

    eventsByDay[dayName].push(event);
  });

  // Find busiest day
  let busiestDay = null;
  let maxMeetings = 0;

  Object.entries(eventsByDay).forEach(([day, dayEvents]: [string, CalendarEvent[]]) => {
    const meetingCount = dayEvents.filter(e => isMeeting(e)).length;
    if (meetingCount > maxMeetings) {
      maxMeetings = meetingCount;
      busiestDay = day;
    }
  });

  return {
    ...analytics,
    eventsByDay,
    busiestDay,
    busiestDayMeetingCount: maxMeetings,
    averageMeetingsPerDay: Math.round(analytics.totalMeetings / Object.keys(eventsByDay).length)
  };
};

/**
 * Get actionable recommendations based on analytics
 * @param {Array} events - Array of calendar events
 * @returns {Array} Array of recommendation objects
 */
export const getRecommendations = (events: CalendarEvent[], calendarOwnerEmail?: string | null) => {
  const analytics = calculateAnalytics(events, null, calendarOwnerEmail);
  const recommendations = [];

  // Back-to-back meeting recommendations
  if (analytics.backToBackCount > 0) {
    recommendations.push({
      type: 'high-priority',
      icon: '🔴',
      title: 'Add Buffers to Back-to-Back Meetings',
      description: `You have ${analytics.backToBackCount} back-to-back meetings. Add 10-15 minute buffers.`,
      action: 'add-buffers',
      color: 'red'
    });
  }

  // Insufficient buffer recommendations
  if (analytics.insufficientBufferCount > 0) {
    recommendations.push({
      type: 'medium-priority',
      icon: '🟡',
      title: 'Extend Short Buffers',
      description: `${analytics.insufficientBufferCount} meetings have less than 10 minutes between them.`,
      action: 'extend-buffers',
      color: 'orange'
    });
  }

  // Focus time recommendations
  if (analytics.focusBlockCount === 0) {
    recommendations.push({
      type: 'high-priority',
      icon: '🎯',
      title: 'Schedule Focus Time',
      description: 'No focus blocks found. Try to protect 1-2 hours for deep work.',
      action: 'add-focus-time',
      color: 'orange'
    });
  }

  // High meeting load recommendations
  if (analytics.totalMeetingHours > 6) {
    recommendations.push({
      type: 'medium-priority',
      icon: '⏰',
      title: 'Review Meeting Load',
      description: `${analytics.totalMeetingHours.toFixed(1)} hours of meetings. Consider declining optional ones.`,
      action: 'review-meetings',
      color: 'orange'
    });
  }

  return recommendations;
};
