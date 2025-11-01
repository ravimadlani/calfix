import type { CalendarEvent, TimeRange } from '../types';

/**
 * DayFilterPills Component
 * Shows individual day pills for week views to filter events by specific day
 */
/**
 * Find the location event covering a specific date
 * @param {Date} date - The date to check
 * @param {Array} events - All events
 * @returns {Object|null} - Location event or null
 */
const findLocationForDate = (date: Date, events: CalendarEvent[]) => {
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
 * Extract location details from location event summary
 * @param {string} summary - Event summary
 * @returns {Object} - Location details
 */
const extractLocationDetails = (summary: string) => {
  // Format: "🇺🇸 Location: San Francisco, United States"
  const match = summary.match(/^(.+?)\s+Location:\s+([^,]+),\s+(.+)$/);
  if (match) {
    return {
      flag: match[1].trim(),
      city: match[2].trim(),
      country: match[3].trim()
    };
  }
  return null;
};

interface DayFilterPillsProps {
  events: CalendarEvent[];
  selectedDay: string | null;
  onDaySelect: (dayKey: string | null) => void;
  viewType: string;
  timeRange: TimeRange | null;
}

type EventsByDateEntry = {
  dayName: string;
  date: Date;
  events: CalendarEvent[];
};

const DayFilterPills: React.FC<DayFilterPillsProps> = ({ events, selectedDay, onDaySelect, viewType, timeRange }) => {
  // Only show for week and month views
  if (viewType !== 'week' && viewType !== 'nextWeek' && viewType !== 'thisMonth' && viewType !== 'nextMonth') {
    return null;
  }

  // Parse time range boundaries
  const rangeStart = timeRange ? new Date(timeRange.timeMin) : null;
  const rangeEnd = timeRange ? new Date(timeRange.timeMax) : null;

  // Group events by actual date (not just day name)
  const eventsByDate: Record<string, EventsByDateEntry> = {};
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  events.forEach(event => {
    // Parse date correctly
    let startTime;
    if (event.start?.dateTime) {
      startTime = new Date(event.start.dateTime);
    } else if (event.start?.date) {
      const [year, month, day] = event.start.date.split('-').map(Number);
      startTime = new Date(year, month - 1, day);
    } else {
      return;
    }

    // Only create pills for dates within the current view's range
    if (rangeStart && rangeEnd) {
      if (startTime < rangeStart || startTime > rangeEnd) {
        return; // Skip dates outside the range
      }
    }

    // Use the actual date as key (YYYY-MM-DD)
    const dateKey = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`;
    const dayName = daysOfWeek[startTime.getDay()];

    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = {
        dayName,
        date: startTime,
        events: []
      };
    }
    eventsByDate[dateKey].events.push(event);
  });

  // Sort dates chronologically
  const sortedDates = Object.keys(eventsByDate).sort();

  console.log('=== DAY FILTER PILLS DEBUG ===');
  console.log('View type:', viewType);
  console.log('Total events:', events.length);
  console.log('Grouped dates:', sortedDates);
  console.log('Events by date:', Object.entries(eventsByDate).map(([key, val]) => ({
    dateKey: key,
    dayName: val.dayName,
    actualDate: val.date.toDateString(),
    count: val.events.length
  })));
  console.log('==============================');

  // If no events, don't show anything
  if (sortedDates.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl" role="img" aria-label="Calendar">
          📅
        </span>
        <h3 className="text-lg font-semibold text-gray-900">
          Filter by Day
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* All Days button */}
        <button
          onClick={() => onDaySelect(null)}
          className={`
            px-4 py-2 rounded-full font-medium transition-all duration-200
            ${selectedDay === null
              ? 'bg-slate-700 text-white shadow-lg scale-105'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          aria-label="Show all days"
          aria-pressed={selectedDay === null}
        >
          All Days
          <span className="ml-2 text-xs opacity-75">
            ({events.length})
          </span>
        </button>

        {/* Individual day buttons */}
        {sortedDates.map(dateKey => {
          const dateInfo = eventsByDate[dateKey];
          const { dayName, date, events: dayEvents } = dateInfo;

          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          // Check if there's a location event for this day
          const locationEvent = findLocationForDate(date, events);
          const locationDetails = locationEvent ? extractLocationDetails(locationEvent.summary) : null;

          return (
            <button
              key={dateKey}
              onClick={() => onDaySelect(dateKey)}
              className={`
                px-4 py-2 rounded-full font-medium transition-all duration-200 flex flex-col items-center
                ${selectedDay === dateKey
                  ? 'bg-slate-700 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              aria-label={`Filter to ${dayName} ${dateStr}`}
              aria-pressed={selectedDay === dateKey}
            >
              <span className="text-sm">
                {dayName.substring(0, 3)}
              </span>
              <span className="text-xs opacity-75">
                {dateStr}
              </span>
              {locationDetails && (
                <span className="text-base mt-1">
                  {locationDetails.flag}
                </span>
              )}
              <span className="text-xs font-bold mt-0.5">
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay && eventsByDate[selectedDay] && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
          <p className="text-sm text-slate-900">
            <strong>Viewing {eventsByDate[selectedDay].dayName}, {eventsByDate[selectedDay].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong> ({eventsByDate[selectedDay].events.length} events)
          </p>
          <button
            onClick={() => onDaySelect(null)}
            className="text-sm text-slate-700 hover:text-slate-800 font-medium underline"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
};

export default DayFilterPills;
