/**
 * Date Helper Utilities
 * Functions for parsing, formatting, and manipulating dates for calendar operations
 */

/**
 * Get start and end of today in ISO format
 * @returns {Object} { timeMin, timeMax }
 */
export const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
};

/**
 * Get start and end of tomorrow in ISO format
 * @returns {Object} { timeMin, timeMax }
 */
export const getTomorrowRange = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
  const end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
};

/**
 * Get start (Sunday) and end (Saturday) of current week in ISO format
 * This week = most recent Sunday through the following Saturday
 * @returns {Object} { timeMin, timeMax }
 */
export const getThisWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Find the most recent Sunday (could be today if it's Sunday)
  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  console.log('=== THIS WEEK RANGE DEBUG ===');
  console.log('Today:', now.toDateString());
  console.log('Day of week:', dayOfWeek, '(0=Sun, 6=Sat)');
  console.log('Calculated Sunday:', sunday.toDateString());
  console.log('Calculated Saturday:', saturday.toDateString());
  console.log('ISO timeMin:', sunday.toISOString());
  console.log('ISO timeMax:', saturday.toISOString());
  console.log('============================');

  return {
    timeMin: sunday.toISOString(),
    timeMax: saturday.toISOString()
  };
};

/**
 * Get start (Sunday) and end (Saturday) of next week in ISO format
 * Next week = the Sunday after this coming Saturday through the following Saturday
 * @returns {Object} { timeMin, timeMax }
 */
export const getNextWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Find this coming Sunday (start of next week)
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;

  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() + daysUntilNextSunday);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  console.log('=== NEXT WEEK RANGE DEBUG ===');
  console.log('Today:', now.toDateString());
  console.log('Day of week:', dayOfWeek, '(0=Sun, 6=Sat)');
  console.log('Days until next Sunday:', daysUntilNextSunday);
  console.log('Calculated Sunday:', sunday.toDateString());
  console.log('Calculated Saturday:', saturday.toDateString());
  console.log('ISO timeMin:', sunday.toISOString());
  console.log('ISO timeMax:', saturday.toISOString());
  console.log('============================');

  return {
    timeMin: sunday.toISOString(),
    timeMax: saturday.toISOString()
  };
};

/**
 * Get start and end of current month in ISO format
 * @returns {Object} { timeMin, timeMax }
 */
export const getThisMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
};

/**
 * Get start and end of next month in ISO format
 * @returns {Object} { timeMin, timeMax }
 */
export const getNextMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
};

/**
 * Format time for display (e.g., "2:30 PM")
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Formatted time string
 */
export const formatTime = (dateTimeString) => {
  if (!dateTimeString) return '';

  const date = new Date(dateTimeString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for display (e.g., "Mon, Jan 15")
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateTimeString) => {
  if (!dateTimeString) return '';

  const date = new Date(dateTimeString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time for display (e.g., "Mon, Jan 15 at 2:30 PM")
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '';

  return `${formatDate(dateTimeString)} at ${formatTime(dateTimeString)}`;
};

/**
 * Calculate duration between two times in minutes
 * @param {string} startTime - ISO datetime string
 * @param {string} endTime - ISO datetime string
 * @returns {number} Duration in minutes
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();

  return Math.round(diffMs / (1000 * 60)); // Convert to minutes
};

/**
 * Calculate gap between two events in minutes
 * @param {Object} event1 - First event with end time
 * @param {Object} event2 - Second event with start time
 * @returns {number} Gap in minutes
 */
export const calculateGap = (event1, event2) => {
  if (!event1 || !event2) return 0;

  const end1 = event1.end?.dateTime || event1.end?.date;
  const start2 = event2.start?.dateTime || event2.start?.date;

  if (!end1 || !start2) return 0;

  const endTime = new Date(end1);
  const startTime = new Date(start2);
  const diffMs = startTime.getTime() - endTime.getTime();

  return Math.round(diffMs / (1000 * 60)); // Convert to minutes
};

/**
 * Check if an event is an all-day event
 * @param {Object} event - Calendar event
 * @returns {boolean} True if all-day event
 */
export const isAllDayEvent = (event) => {
  return !!(event.start?.date && !event.start?.dateTime);
};

/**
 * Parse event start time (handles both dateTime and all-day events)
 * @param {Object} event - Calendar event
 * @returns {Date} Event start date
 */
export const getEventStartTime = (event) => {
  const startStr = event.start?.dateTime || event.start?.date;
  return startStr ? new Date(startStr) : null;
};

/**
 * Parse event end time (handles both dateTime and all-day events)
 * @param {Object} event - Calendar event
 * @returns {Date} Event end date
 */
export const getEventEndTime = (event) => {
  const endStr = event.end?.dateTime || event.end?.date;
  return endStr ? new Date(endStr) : null;
};

/**
 * Convert hours to human-readable format (e.g., "2.5h" or "1h 30m")
 * @param {number} hours - Number of hours
 * @returns {string} Formatted hours string
 */
export const formatHours = (hours) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

/**
 * Check if a time is during business hours (9 AM - 5 PM)
 * @param {string} dateTimeString - ISO datetime string
 * @returns {boolean} True if during business hours
 */
export const isBusinessHours = (dateTimeString) => {
  const date = new Date(dateTimeString);
  const hour = date.getHours();
  return hour >= 9 && hour < 17;
};

/**
 * Get day name from date string
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Day name (e.g., "Monday")
 */
export const getDayName = (dateTimeString) => {
  const date = new Date(dateTimeString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};
