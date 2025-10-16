/**
 * Event Categorization Utilities
 * Automatically categorize events by keywords and assign color coding
 */

/**
 * Event categories with associated colors and keywords
 */
export const EVENT_CATEGORIES = {
  MEETING: {
    name: 'Meeting',
    color: 'blue',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-500',
    keywords: ['1:1', '1-1', 'sync', 'standup', 'stand-up', 'call', 'meeting', 'discussion', 'check-in', 'catch-up', 'team', 'all-hands']
  },
  FOCUS: {
    name: 'Focus/Work',
    color: 'indigo',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-400',
    keywords: ['work', 'focus', 'deep work', 'coding', 'development', 'project', 'build', 'implement', 'design']
  },
  BREAK: {
    name: 'Break',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-500',
    keywords: ['lunch', 'break', 'coffee', 'tea', 'breakfast', 'dinner', 'snack', 'rest']
  },
  PERSONAL: {
    name: 'Personal',
    color: 'pink',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-800',
    borderColor: 'border-pink-500',
    keywords: ['family', 'personal', 'gym', 'workout', 'exercise', 'doctor', 'appointment', 'dentist', 'health']
  },
  TRAVEL: {
    name: 'Travel',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-500',
    keywords: ['travel', 'flight', 'commute', 'drive', 'transit', 'airport', 'train', 'bus']
  },
  CONFERENCE: {
    name: 'Conference',
    color: 'purple',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-500',
    keywords: ['conference', 'summit', 'event', 'workshop', 'seminar', 'webinar', 'training', 'course']
  },
  ADMIN: {
    name: 'Admin',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-500',
    keywords: ['admin', 'administrative', 'expenses', 'paperwork', 'filing', 'timesheets', 'hr']
  },
  DEFAULT: {
    name: 'Other',
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-500',
    keywords: []
  }
};

/**
 * Categorize an event based on its title and description
 * @param {Object} event - Calendar event with summary and description
 * @returns {Object} Event category object
 */
export const categorizeEvent = (event) => {
  if (!event) return EVENT_CATEGORIES.DEFAULT;

  const searchText = [
    event.summary || '',
    event.description || '',
    event.location || ''
  ].join(' ').toLowerCase();

  // Check each category's keywords
  for (const [key, category] of Object.entries(EVENT_CATEGORIES)) {
    if (key === 'DEFAULT') continue;

    const hasKeyword = category.keywords.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      return category;
    }
  }

  return EVENT_CATEGORIES.DEFAULT;
};

/**
 * Get color classes for an event based on its category
 * @param {Object} event - Calendar event
 * @returns {Object} Color classes object
 */
export const getEventColors = (event) => {
  const category = categorizeEvent(event);
  return {
    bg: category.bgColor,
    text: category.textColor,
    border: category.borderColor,
    categoryName: category.name
  };
};

/**
 * Determine if event is likely a meeting (has attendees or meeting keywords)
 * @param {Object} event - Calendar event
 * @returns {boolean} True if likely a meeting
 */
export const isMeeting = (event) => {
  if (!event) return false;

  // Has attendees other than organizer
  if (event.attendees && event.attendees.length > 1) {
    return true;
  }

  // Check for meeting keywords
  const category = categorizeEvent(event);
  return category.name === 'Meeting';
};

/**
 * Get event type icon (emoji or text representation)
 * @param {Object} event - Calendar event
 * @returns {string} Icon/emoji for event type
 */
export const getEventIcon = (event) => {
  const category = categorizeEvent(event);

  const iconMap = {
    'Meeting': '👥',
    'Focus/Work': '💼',
    'Break': '☕',
    'Personal': '👤',
    'Travel': '✈️',
    'Conference': '🎤',
    'Admin': '📁',
    'Other': '📅'
  };

  return iconMap[category.name] || '📅';
};

/**
 * Get all unique categories from a list of events
 * @param {Array} events - Array of calendar events
 * @returns {Array} Array of unique category names
 */
export const getUniqueCategories = (events) => {
  if (!events || !events.length) return [];

  const categories = new Set();
  events.forEach(event => {
    const category = categorizeEvent(event);
    categories.add(category.name);
  });

  return Array.from(categories).sort();
};

/**
 * Filter events by category
 * @param {Array} events - Array of calendar events
 * @param {string} categoryName - Category name to filter by
 * @returns {Array} Filtered events
 */
export const filterEventsByCategory = (events, categoryName) => {
  if (!events || !events.length) return [];

  return events.filter(event => {
    const category = categorizeEvent(event);
    return category.name === categoryName;
  });
};
