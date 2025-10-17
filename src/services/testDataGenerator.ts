/**
 * Test Data Generator Service
 * Generates realistic calendar events with various issues for testing CalFix
 */

import { createEvent } from './googleCalendar';

interface TestDataResult {
  totalEvents: number;
  backToBack: number;
  insufficientBuffer: number;
  doubleBookings: number;
  flights: number;
  internationalFlights: number;
  outOfHours: number;
  noVideoLink: number;
  declinedMeetings: number;
  focusBlocks: number;
  regularMeetings: number;
}

const SAMPLE_MEETING_TITLES = [
  'Team Standup',
  'Product Review',
  'Client Presentation',
  'Strategy Session',
  '1:1 with Manager',
  'Design Review',
  'Sprint Planning',
  'Budget Review',
  'Marketing Sync',
  'Engineering All-Hands',
];

const SAMPLE_ATTENDEES = [
  'john.doe@example.com',
  'jane.smith@example.com',
  'mike.johnson@example.com',
  'sarah.williams@example.com',
  'alex.brown@example.com',
];

/**
 * Generate 2 months of test calendar data
 */
export const generateTestCalendarData = async (): Promise<TestDataResult> => {
  const result: TestDataResult = {
    totalEvents: 0,
    backToBack: 0,
    insufficientBuffer: 0,
    doubleBookings: 0,
    flights: 0,
    internationalFlights: 0,
    outOfHours: 0,
    noVideoLink: 0,
    declinedMeetings: 0,
    focusBlocks: 0,
    regularMeetings: 0,
  };

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  // Generate events for next 60 days
  for (let day = 0; day < 60; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

    // Different event patterns for different days
    if (day % 5 === 0) {
      // Day 0, 5, 10, 15... - Heavy meeting days with back-to-back
      await generateHeavyMeetingDay(currentDate, result);
    } else if (day % 5 === 1) {
      // Day 1, 6, 11, 16... - Double booking day
      await generateDoubleBookingDay(currentDate, result);
    } else if (day % 5 === 2) {
      // Day 2, 7, 12, 17... - Flight day
      await generateFlightDay(currentDate, result, day);
    } else if (day % 5 === 3) {
      // Day 3, 8, 13, 18... - Light meeting day with focus blocks
      await generateFocusDay(currentDate, result);
    } else {
      // Day 4, 9, 14, 19... - Regular meeting day
      await generateRegularDay(currentDate, result);
    }

    // Randomly add declined meetings
    if (day % 7 === 0) {
      await generateDeclinedMeeting(currentDate, result);
    }
  }

  return result;
};

/**
 * Heavy meeting day with back-to-back meetings
 */
const generateHeavyMeetingDay = async (date: Date, result: TestDataResult): Promise<void> => {
  const meetings = [
    { start: 9, duration: 60, buffer: 0 },  // 9:00-10:00 (back-to-back)
    { start: 10, duration: 60, buffer: 0 }, // 10:00-11:00 (back-to-back)
    { start: 11, duration: 30, buffer: 5 }, // 11:00-11:30 (insufficient buffer)
    { start: 11.58, duration: 60, buffer: 0 }, // 11:35-12:35
    { start: 13, duration: 60, buffer: 0 }, // 13:00-14:00 (back-to-back)
    { start: 14, duration: 60, buffer: 0 }, // 14:00-15:00 (back-to-back)
    { start: 15, duration: 90, buffer: 5 }, // 15:00-16:30 (insufficient buffer)
    { start: 15.92, duration: 60, buffer: 0 }, // 15:35-16:35 (no video link)
  ];

  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    const startTime = new Date(date);
    startTime.setHours(Math.floor(meeting.start), (meeting.start % 1) * 60, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + meeting.duration);

    const hasVideoLink = i < meetings.length - 1; // Last meeting has no video link

    await createEvent({
      summary: SAMPLE_MEETING_TITLES[i % SAMPLE_MEETING_TITLES.length],
      start: { dateTime: startTime.toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Europe/London' },
      attendees: [
        { email: SAMPLE_ATTENDEES[Math.floor(Math.random() * SAMPLE_ATTENDEES.length)] },
        { email: SAMPLE_ATTENDEES[Math.floor(Math.random() * SAMPLE_ATTENDEES.length)] },
      ],
      ...(hasVideoLink && {
        conferenceData: {
          createRequest: { requestId: `test-${Date.now()}-${i}` },
        },
      }),
    });

    result.totalEvents++;

    if (meeting.buffer === 0 && i < meetings.length - 1) {
      result.backToBack++;
    } else if (meeting.buffer > 0 && meeting.buffer < 10) {
      result.insufficientBuffer++;
    }

    if (!hasVideoLink) {
      result.noVideoLink++;
    }
  }
};

/**
 * Day with double bookings
 */
const generateDoubleBookingDay = async (date: Date, result: TestDataResult): Promise<void> => {
  // Create overlapping meetings
  const overlaps = [
    { start: 10, duration: 60 },
    { start: 10.5, duration: 60 }, // Overlaps with previous
    { start: 14, duration: 90 },
    { start: 14.5, duration: 60 }, // Overlaps with previous
  ];

  for (let i = 0; i < overlaps.length; i++) {
    const meeting = overlaps[i];
    const startTime = new Date(date);
    startTime.setHours(Math.floor(meeting.start), (meeting.start % 1) * 60, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + meeting.duration);

    await createEvent({
      summary: `${SAMPLE_MEETING_TITLES[i % SAMPLE_MEETING_TITLES.length]} ${i % 2 === 0 ? '(Conflict)' : '(Overlap)'}`,
      start: { dateTime: startTime.toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Europe/London' },
      attendees: [
        { email: SAMPLE_ATTENDEES[Math.floor(Math.random() * SAMPLE_ATTENDEES.length)] },
      ],
      conferenceData: {
        createRequest: { requestId: `test-${Date.now()}-${i}` },
      },
    });

    result.totalEvents++;

    if (i % 2 === 1) {
      result.doubleBookings++;
    }
  }
};

/**
 * Day with flights
 */
const generateFlightDay = async (date: Date, result: TestDataResult, dayOffset: number): Promise<void> => {
  const isInternational = dayOffset % 10 === 2; // Every 10th day is international

  if (isInternational) {
    // International flight: LHR to SFO
    const departureTime = new Date(date);
    departureTime.setHours(11, 0, 0, 0);

    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + 11); // 11-hour flight

    await createEvent({
      summary: 'Flight: BA283 LHR to SFO',
      start: { dateTime: departureTime.toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: arrivalTime.toISOString(), timeZone: 'America/Los_Angeles' },
      description: 'British Airways flight from London Heathrow to San Francisco',
    });

    result.totalEvents++;
    result.flights++;
    result.internationalFlights++;

    // Add a meeting the next day in foreign timezone that's out of hours
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(6, 0, 0, 0); // 6am local time (out of hours)

    const meetingEnd = new Date(nextDay);
    meetingEnd.setHours(7, 0, 0, 0);

    await createEvent({
      summary: 'Early Morning Sync with UK Team',
      start: { dateTime: nextDay.toISOString(), timeZone: 'America/Los_Angeles' },
      end: { dateTime: meetingEnd.toISOString(), timeZone: 'America/Los_Angeles' },
      attendees: [{ email: SAMPLE_ATTENDEES[0] }],
      conferenceData: {
        createRequest: { requestId: `test-${Date.now()}-early` },
      },
    });

    result.totalEvents++;
    result.outOfHours++;
  } else {
    // Domestic flight: LHR to EDI
    const departureTime = new Date(date);
    departureTime.setHours(14, 30, 0, 0);

    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + 1, arrivalTime.getMinutes() + 30);

    await createEvent({
      summary: 'Flight: BA1449 LHR to EDI',
      start: { dateTime: departureTime.toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: arrivalTime.toISOString(), timeZone: 'Europe/London' },
      description: 'British Airways flight from London to Edinburgh',
    });

    result.totalEvents++;
    result.flights++;
  }
};

/**
 * Focus day with proper spacing and focus blocks
 */
const generateFocusDay = async (date: Date, result: TestDataResult): Promise<void> => {
  // Morning focus block
  const focusStart1 = new Date(date);
  focusStart1.setHours(9, 0, 0, 0);
  const focusEnd1 = new Date(focusStart1);
  focusEnd1.setHours(11, 0, 0, 0);

  await createEvent({
    summary: '🎯 Deep Work: Product Planning',
    start: { dateTime: focusStart1.toISOString(), timeZone: 'Europe/London' },
    end: { dateTime: focusEnd1.toISOString(), timeZone: 'Europe/London' },
    description: 'Focused time for strategic planning',
  });

  result.totalEvents++;
  result.focusBlocks++;

  // Regular meeting with proper buffer
  const meetingStart = new Date(date);
  meetingStart.setHours(13, 0, 0, 0);
  const meetingEnd = new Date(meetingStart);
  meetingEnd.setHours(14, 0, 0, 0);

  await createEvent({
    summary: 'Weekly Team Sync',
    start: { dateTime: meetingStart.toISOString(), timeZone: 'Europe/London' },
    end: { dateTime: meetingEnd.toISOString(), timeZone: 'Europe/London' },
    attendees: [
      { email: SAMPLE_ATTENDEES[0] },
      { email: SAMPLE_ATTENDEES[1] },
    ],
    conferenceData: {
      createRequest: { requestId: `test-${Date.now()}-focus` },
    },
  });

  result.totalEvents++;
  result.regularMeetings++;

  // Afternoon focus block
  const focusStart2 = new Date(date);
  focusStart2.setHours(15, 0, 0, 0);
  const focusEnd2 = new Date(focusStart2);
  focusEnd2.setHours(17, 0, 0, 0);

  await createEvent({
    summary: '🎯 Focus Time: Code Review',
    start: { dateTime: focusStart2.toISOString(), timeZone: 'Europe/London' },
    end: { dateTime: focusEnd2.toISOString(), timeZone: 'Europe/London' },
    description: 'Protected time for deep work',
  });

  result.totalEvents++;
  result.focusBlocks++;
};

/**
 * Regular day with proper meeting spacing
 */
const generateRegularDay = async (date: Date, result: TestDataResult): Promise<void> => {
  const meetings = [
    { start: 9, duration: 60 },
    { start: 11, duration: 30 },
    { start: 14, duration: 60 },
    { start: 16, duration: 30 },
  ];

  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    const startTime = new Date(date);
    startTime.setHours(Math.floor(meeting.start), (meeting.start % 1) * 60, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + meeting.duration);

    await createEvent({
      summary: SAMPLE_MEETING_TITLES[(i + 5) % SAMPLE_MEETING_TITLES.length],
      start: { dateTime: startTime.toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Europe/London' },
      attendees: [
        { email: SAMPLE_ATTENDEES[Math.floor(Math.random() * SAMPLE_ATTENDEES.length)] },
      ],
      conferenceData: {
        createRequest: { requestId: `test-${Date.now()}-${i}` },
      },
    });

    result.totalEvents++;
    result.regularMeetings++;
  }
};

/**
 * Generate a declined meeting
 */
const generateDeclinedMeeting = async (date: Date, result: TestDataResult): Promise<void> => {
  const startTime = new Date(date);
  startTime.setHours(10, 0, 0, 0);

  const endTime = new Date(startTime);
  endTime.setHours(11, 0, 0, 0);

  await createEvent({
    summary: '[DECLINED] Quarterly Review',
    start: { dateTime: startTime.toISOString(), timeZone: 'Europe/London' },
    end: { dateTime: endTime.toISOString(), timeZone: 'Europe/London' },
    attendees: [
      { email: SAMPLE_ATTENDEES[0], responseStatus: 'declined' as any },
    ],
    description: 'This meeting was declined',
  });

  result.totalEvents++;
  result.declinedMeetings++;
};
