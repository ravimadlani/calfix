/**
 * Google Calendar API Service
 * Handles all Calendar API operations with retry logic and error handling
 */

import { getValidAccessToken, handleApiError } from './googleAuth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const PRIMARY_CALENDAR = 'primary';

/**
 * Make authenticated request to Google Calendar API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
const makeApiRequest = async (endpoint, options = {}) => {
  try {
    const accessToken = await getValidAccessToken();

    const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      await handleApiError(response);
      // If handleApiError doesn't throw, retry the request
      return makeApiRequest(endpoint, options);
    }

    // DELETE requests return 204 No Content, don't try to parse JSON
    if (response.status === 204 || options.method === 'DELETE') {
      return null;
    }

    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Fetch events from primary calendar with pagination support
 * @param {string} timeMin - Start time in ISO format
 * @param {string} timeMax - End time in ISO format
 * @param {number} maxResults - Maximum number of results per page (default 250, max 2500)
 * @returns {Promise<Array>} Array of calendar events
 */
export const fetchEvents = async (timeMin, timeMax, maxResults = 2500, calendarId = PRIMARY_CALENDAR) => {
  try {
    let allEvents = [];
    let pageToken = null;
    const pageSize = Math.min(maxResults, 250); // Google Calendar API max per page is 250

    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: pageSize.toString()
      });

      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      const data = await makeApiRequest(
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
      );

      const items = data.items || [];
      allEvents = allEvents.concat(items);

      pageToken = data.nextPageToken;

      // Stop if we've reached the requested max or no more pages
      if (allEvents.length >= maxResults || !pageToken) {
        break;
      }
    } while (pageToken);

    // Trim to exact max if we fetched more
    return allEvents.slice(0, maxResults);
  } catch (error) {
    console.error(`Error fetching events from ${calendarId}:`, error);
    // Return empty array if we don't have permission, rather than throwing
    if (error.message.includes('Permission denied') || error.message.includes('Not Found')) {
      console.warn(`No access to calendar ${calendarId}, assuming free`);
      return [];
    }
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }
};

/**
 * Create a new calendar event
 * @param {Object} eventData - Event data object
 * @param {string} calendarId - Calendar ID (defaults to primary)
 * @returns {Promise<Object>} Created event
 */
export const createEvent = async (eventData, calendarId = PRIMARY_CALENDAR) => {
  try {
    const event = await makeApiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(eventData)
      }
    );

    return event;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error(`Failed to create event: ${error.message}`);
  }
};

/**
 * Update an existing calendar event
 * @param {string} eventId - Event ID
 * @param {Object} eventData - Updated event data
 * @returns {Promise<Object>} Updated event
 */
export const updateEvent = async (eventId, eventData) => {
  try {
    const event = await makeApiRequest(
      `/calendars/${PRIMARY_CALENDAR}/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(eventData)
      }
    );

    return event;
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error(`Failed to update event: ${error.message}`);
  }
};

/**
 * Delete a calendar event
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
export const deleteEvent = async (eventId) => {
  try {
    await makeApiRequest(
      `/calendars/${PRIMARY_CALENDAR}/events/${eventId}`,
      {
        method: 'DELETE'
      }
    );
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error(`Failed to delete event: ${error.message}`);
  }
};

/**
 * Delete a placeholder event and log it to an "AI-Removed Events" all-day event
 * @param {Object} placeholderEvent - The placeholder event to delete
 * @returns {Promise<void>}
 */
export const deletePlaceholderAndLog = async (placeholderEvent) => {
  try {
    // Get the date of the placeholder
    const eventDate = placeholderEvent.start?.dateTime || placeholderEvent.start?.date;
    const date = new Date(eventDate);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Format event info for logging
    const startTime = placeholderEvent.start?.dateTime
      ? new Date(placeholderEvent.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : 'All day';
    const endTime = placeholderEvent.end?.dateTime
      ? new Date(placeholderEvent.end.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '';
    const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
    const eventInfo = `• ${placeholderEvent.summary || 'Untitled'} (${timeRange})`;

    // Search for existing "AI-Removed Events" all-day event for this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingEvents = await fetchEvents(dayStart.toISOString(), dayEnd.toISOString());
    const trackingEvent = existingEvents.find(e =>
      e.summary === 'AI-Removed Events' &&
      e.start?.date === dateKey
    );

    if (trackingEvent) {
      // Update existing tracking event - need to include full event structure
      const currentDescription = trackingEvent.description || '';
      const updatedDescription = currentDescription
        ? `${currentDescription}\n${eventInfo}`
        : eventInfo;

      await updateEvent(trackingEvent.id, {
        summary: trackingEvent.summary,
        description: updatedDescription,
        start: trackingEvent.start,
        end: trackingEvent.end,
        colorId: '8',
        transparency: 'transparent'
      });
    } else {
      // Create new all-day tracking event
      await createEvent({
        summary: 'AI-Removed Events',
        description: `Placeholders removed by Calendar Dashboard AI:\n\n${eventInfo}`,
        start: {
          date: dateKey
        },
        end: {
          date: dateKey
        },
        colorId: '8', // Gray color for tracking events
        transparency: 'transparent' // Won't show as busy
      });
    }

    // Delete the placeholder event
    await deleteEvent(placeholderEvent.id);

  } catch (error) {
    console.error('Error deleting placeholder and logging:', error);
    throw new Error(`Failed to delete placeholder: ${error.message}`);
  }
};

/**
 * Initialize GAPI client if not already initialized
 * @returns {Promise<void>}
 */
const initGapiClient = async () => {
  if (!window.gapi) {
    throw new Error('GAPI library not loaded');
  }

  return new Promise((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        const accessToken = await getValidAccessToken();

        // Set the access token
        window.gapi.client.setToken({
          access_token: accessToken
        });

        // Initialize the calendar client
        await window.gapi.client.load('calendar', 'v3');

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Fetch list of calendars the user has access to
 * @returns {Promise<Array>} Array of calendar objects
 */
export const fetchCalendarList = async () => {
  try {
    const data = await makeApiRequest('/users/me/calendarList');
    return data.items || [];
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    throw new Error(`Failed to fetch calendar list: ${error.message}`);
  }
};

/**
 * Find free/busy times for calendars using GAPI client (avoids CORS)
 * @param {string} timeMin - Start time in ISO format
 * @param {string} timeMax - End time in ISO format
 * @param {Array<string>} calendarIds - Array of calendar IDs (email addresses) to check
 * @returns {Promise<Object>} Free/busy data
 */
export const findFreeBusy = async (timeMin, timeMax, calendarIds = [PRIMARY_CALENDAR]) => {
  try {
    // Convert calendar IDs to items array
    const items = Array.isArray(calendarIds)
      ? calendarIds.map(id => ({ id: id.trim() }))
      : [{ id: calendarIds.trim() }];

    const requestBody = {
      timeMin,
      timeMax,
      timeZone: 'UTC',
      items
    };

    console.log('Free/Busy request:', JSON.stringify(requestBody, null, 2));

    // Initialize GAPI client if needed
    await initGapiClient();

    // Use GAPI client to make the request (avoids CORS)
    const response = await window.gapi.client.calendar.freebusy.query(requestBody);

    console.log('Free/Busy response:', response.result);
    return response.result;
  } catch (error) {
    console.error('Error finding free/busy times:', error);
    throw new Error(`Failed to find free/busy times: ${error.message}`);
  }
};

/**
 * Create a buffer event (15-minute gap)
 * @param {Date} startTime - Buffer start time
 * @param {number} durationMinutes - Buffer duration in minutes (default 15)
 * @returns {Promise<Object>} Created buffer event
 */
export const createBufferEvent = async (startTime, durationMinutes = 15) => {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  const eventData = {
    summary: '🔵 Buffer Time',
    description: 'Automatically added buffer time for transitions',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    colorId: '7', // Cyan color
    transparency: 'transparent' // Won't show as busy
  };

  return await createEvent(eventData);
};

/**
 * Create a focus block event
 * @param {Date} startTime - Focus block start time
 * @param {number} durationMinutes - Focus block duration in minutes (default 120)
 * @param {string} title - Focus block title
 * @returns {Promise<Object>} Created focus block event
 */
export const createFocusBlock = async (startTime, durationMinutes = 120, title = '🎯 Focus Time') => {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  const eventData = {
    summary: title,
    description: 'Dedicated time for deep work and focused tasks',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    colorId: '10', // Green color
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  return await createEvent(eventData);
};

/**
 * Create a travel block for airport/transit time
 * @param {Date} startTime - Start time of the travel block
 * @param {number} durationMinutes - Duration in minutes (default 90)
 * @param {string} title - Title of the travel block
 * @returns {Promise<Object>} Created event
 */
export const createTravelBlock = async (startTime, durationMinutes = 90, title = '🚗 Travel to Airport') => {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  const eventData = {
    summary: title,
    description: 'Travel time to/from airport',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    colorId: '9', // Blue color
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 }
      ]
    }
  };

  return await createEvent(eventData);
};

/**
 * Create an all-day location tracking event (can span multiple days)
 * @param {Date} startDate - Start date for the location event
 * @param {Date} endDate - End date for the location event (departure day)
 * @param {string} city - City name
 * @param {string} country - Country name
 * @param {string} timezone - Timezone (e.g., 'Europe/London')
 * @param {string} flag - Flag emoji
 * @returns {Promise<Object>} Created event
 */
export const createLocationEvent = async (startDate, endDate, city, country, timezone, flag) => {
  // Create all-day event - use date format (not dateTime)
  const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Calculate number of days
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const daysText = days === 1 ? '1 day' : `${days} days`;

  const eventData = {
    summary: `${flag} Location: ${city}, ${country}`,
    description: `You are in ${city}, ${country} for ${daysText}.\nTimezone: ${timezone}\n\nThis helps track your location and timezone for scheduling.`,
    start: {
      date: startDateStr
    },
    end: {
      date: endDateStr
    },
    colorId: '7', // Cyan color
    reminders: {
      useDefault: false
    }
  };

  return await createEvent(eventData);
};

/**
 * Move an event to a new time
 * @param {string} eventId - Event ID
 * @param {Object} event - Original event object
 * @param {Date} newStartTime - New start time
 * @returns {Promise<Object>} Updated event
 */
export const moveEvent = async (eventId, event, newStartTime) => {
  // Calculate duration
  const originalStart = new Date(event.start.dateTime);
  const originalEnd = new Date(event.end.dateTime);
  const durationMs = originalEnd - originalStart;

  // Calculate new end time
  const newEndTime = new Date(newStartTime.getTime() + durationMs);

  const updatedEventData = {
    ...event,
    start: {
      dateTime: newStartTime.toISOString(),
      timeZone: event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: newEndTime.toISOString(),
      timeZone: event.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };

  return await updateEvent(eventId, updatedEventData);
};

/**
 * Add buffer before an event
 * @param {Object} event - Event object
 * @param {number} bufferMinutes - Buffer duration (default 15)
 * @returns {Promise<Object>} Created buffer event
 */
export const addBufferBefore = async (event, bufferMinutes = 15) => {
  const eventStart = new Date(event.start.dateTime);
  const bufferStart = new Date(eventStart);
  bufferStart.setMinutes(bufferStart.getMinutes() - bufferMinutes);

  return await createBufferEvent(bufferStart, bufferMinutes);
};

/**
 * Add buffer after an event
 * @param {Object} event - Event object
 * @param {number} bufferMinutes - Buffer duration (default 15)
 * @returns {Promise<Object>} Created buffer event
 */
export const addBufferAfter = async (event, bufferMinutes = 15) => {
  const eventEnd = new Date(event.end.dateTime);

  return await createBufferEvent(eventEnd, bufferMinutes);
};

/**
 * Find next available time slot
 * @param {Array} events - Array of existing events
 * @param {number} durationMinutes - Required duration
 * @param {Date} searchStartTime - Start searching from this time
 * @returns {Date|null} Next available start time or null
 */
export const findNextAvailableSlot = (events, durationMinutes, searchStartTime) => {
  if (!events || events.length === 0) {
    return searchStartTime;
  }

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const aStart = new Date(a.start.dateTime || a.start.date);
    const bStart = new Date(b.start.dateTime || b.start.date);
    return aStart - bStart;
  });

  let searchTime = new Date(searchStartTime);

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    // Check if there's a gap before this event
    const gapMs = eventStart - searchTime;
    const gapMinutes = gapMs / (1000 * 60);

    if (gapMinutes >= durationMinutes) {
      // Found a slot
      return searchTime;
    }

    // Move search time to after this event
    searchTime = new Date(eventEnd);
  }

  // No slot found before existing events, return time after last event
  return searchTime;
};

/**
 * Batch add buffers to multiple events
 * @param {Array} events - Array of events to add buffers to
 * @param {string} position - 'before' or 'after'
 * @param {number} bufferMinutes - Buffer duration
 * @returns {Promise<Array>} Array of created buffer events
 */
export const batchAddBuffers = async (events, position = 'after', bufferMinutes = 15) => {
  const promises = events.map(event => {
    if (position === 'before') {
      return addBufferBefore(event, bufferMinutes);
    } else {
      return addBufferAfter(event, bufferMinutes);
    }
  });

  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error batch adding buffers:', error);
    throw new Error(`Failed to add buffers: ${error.message}`);
  }
};

/**
 * Get optimal time for a new meeting tomorrow
 * @param {Array} tomorrowEvents - Events scheduled for tomorrow
 * @param {number} durationMinutes - Required meeting duration
 * @returns {Date|null} Optimal start time
 */
export const getOptimalTimeTomorrow = (tomorrowEvents, durationMinutes = 60) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Prefer mid-morning (10 AM)
  const preferredTime = new Date(tomorrow);
  preferredTime.setHours(10, 0, 0, 0);

  return findNextAvailableSlot(tomorrowEvents, durationMinutes, preferredTime);
};

/**
 * Add Google Meet conference link to an event
 * @param {string} eventId - Event ID
 * @param {Object} event - Full event object
 * @param {string} calendarId - Calendar ID (defaults to primary)
 * @returns {Promise<Object>} Updated event with conference data
 */
export const addGoogleMeetLink = async (eventId, event, calendarId = PRIMARY_CALENDAR) => {
  try {
    // Update the event with conferenceData request
    const updatedEventData = {
      ...event,
      conferenceData: {
        createRequest: {
          requestId: `meet-${eventId}-${Date.now()}`, // Unique request ID
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    // Must use conferenceDataVersion=1 parameter to enable conference creation
    const updatedEvent = await makeApiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?conferenceDataVersion=1`,
      {
        method: 'PUT',
        body: JSON.stringify(updatedEventData)
      }
    );

    return updatedEvent;
  } catch (error) {
    console.error('Error adding Google Meet link:', error);
    throw new Error(`Failed to add Google Meet link: ${error.message}`);
  }
};

/**
 * Batch add Google Meet links to multiple events
 * @param {Array} events - Array of event objects with id property
 * @param {string} calendarId - Calendar ID (defaults to primary)
 * @returns {Promise<Object>} Results with success and failure counts
 */
export const batchAddGoogleMeetLinks = async (events, calendarId = PRIMARY_CALENDAR) => {
  const results = {
    successful: [],
    failed: [],
    successCount: 0,
    failCount: 0
  };

  for (const event of events) {
    try {
      const updatedEvent = await addGoogleMeetLink(event.id, event, calendarId);
      results.successful.push(updatedEvent);
      results.successCount++;
    } catch (error) {
      console.error(`Failed to add Meet link to event ${event.id}:`, error);
      results.failed.push({ event, error: error.message });
      results.failCount++;
    }
  }

  return results;
};
