import type { CalendarEvent, TimeRange } from '../types';

/**
 * DayFilterPills Component
 * Shows individual day pills for week views and week pills for month views
 */

/**
 * Find the location event covering a specific date
 */
const findLocationForDate = (date: Date, events: CalendarEvent[]) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return events.find(e => {
    if (!e.start?.date) return false;
    const summary = (e.summary || '').toLowerCase();
    if (!summary.includes('location:')) return false;

    const startDate = new Date(e.start.date);
    const endDate = new Date(e.end.date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return startDate <= targetDate && endDate >= targetDate;
  });
};

/**
 * Extract location details from location event summary
 */
const extractLocationDetails = (summary: string) => {
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

/**
 * Get the start of the week (Sunday) for a given date
 */
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the week (Saturday) for a given date
 */
const getWeekEnd = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Format a week range as "Mon D - Mon D"
 */
const formatWeekRange = (weekStart: Date, weekEnd: Date): string => {
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
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

type WeekEntry = {
  weekKey: string;
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  events: CalendarEvent[];
  locationFlags: string[];
};

const DayFilterPills: React.FC<DayFilterPillsProps> = ({ events, selectedDay, onDaySelect, viewType, timeRange }) => {
  const isMonthView = viewType === 'thisMonth' || viewType === 'nextMonth';

  // Only show for week and month views
  if (viewType !== 'week' && viewType !== 'nextWeek' && viewType !== 'thisMonth' && viewType !== 'nextMonth') {
    return null;
  }

  // Parse time range boundaries
  const rangeStart = timeRange ? new Date(timeRange.timeMin) : null;
  const rangeEnd = timeRange ? new Date(timeRange.timeMax) : null;

  // Group events by actual date
  const eventsByDate: Record<string, EventsByDateEntry> = {};
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  events.forEach(event => {
    let startTime;
    if (event.start?.dateTime) {
      startTime = new Date(event.start.dateTime);
    } else if (event.start?.date) {
      const [year, month, day] = event.start.date.split('-').map(Number);
      startTime = new Date(year, month - 1, day);
    } else {
      return;
    }

    if (rangeStart && rangeEnd) {
      if (startTime < rangeStart || startTime > rangeEnd) {
        return;
      }
    }

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

  const sortedDates = Object.keys(eventsByDate).sort();

  // For month views, group by week
  const eventsByWeek: Record<string, WeekEntry> = {};

  if (isMonthView && rangeStart) {
    // Generate all weeks in the month view
    let weekNumber = 1;
    let currentWeekStart = getWeekStart(rangeStart);

    while (currentWeekStart <= (rangeEnd || rangeStart)) {
      const weekEnd = getWeekEnd(currentWeekStart);
      const weekKey = `week-${weekNumber}`;

      eventsByWeek[weekKey] = {
        weekKey,
        weekNumber,
        weekStart: new Date(currentWeekStart),
        weekEnd: new Date(weekEnd),
        events: [],
        locationFlags: []
      };

      // Move to next week
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNumber++;
    }

    // Assign events to weeks
    events.forEach(event => {
      let startTime;
      if (event.start?.dateTime) {
        startTime = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        const [year, month, day] = event.start.date.split('-').map(Number);
        startTime = new Date(year, month - 1, day);
      } else {
        return;
      }

      if (rangeStart && rangeEnd) {
        if (startTime < rangeStart || startTime > rangeEnd) {
          return;
        }
      }

      // Find which week this event belongs to
      Object.values(eventsByWeek).forEach(week => {
        if (startTime >= week.weekStart && startTime <= week.weekEnd) {
          week.events.push(event);

          // Check for location flags
          const locationEvent = findLocationForDate(startTime, events);
          if (locationEvent) {
            const details = extractLocationDetails(locationEvent.summary || '');
            if (details?.flag && !week.locationFlags.includes(details.flag)) {
              week.locationFlags.push(details.flag);
            }
          }
        }
      });
    });
  }

  const sortedWeeks = Object.values(eventsByWeek).sort((a, b) => a.weekNumber - b.weekNumber);

  // If no events, don't show anything
  if (sortedDates.length === 0 && sortedWeeks.every(w => w.events.length === 0)) {
    return null;
  }

  // Check if selected key is a week
  const isWeekSelected = selectedDay?.startsWith('week-');
  const selectedWeek = isWeekSelected ? eventsByWeek[selectedDay] : null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl" role="img" aria-label="Calendar">
          📅
        </span>
        <h3 className="text-lg font-semibold text-gray-900">
          Filter by {isMonthView ? 'Week' : 'Day'}
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* All button */}
        <button
          onClick={() => onDaySelect(null)}
          className={`
            px-4 py-2 rounded-full font-medium transition-all duration-200
            ${selectedDay === null
              ? 'bg-slate-700 text-white shadow-lg scale-105'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          aria-label={`Show all ${isMonthView ? 'weeks' : 'days'}`}
          aria-pressed={selectedDay === null}
        >
          All {isMonthView ? 'Weeks' : 'Days'}
          <span className="ml-2 text-xs opacity-75">
            ({events.length})
          </span>
        </button>

        {/* Week pills for month views */}
        {isMonthView && sortedWeeks.map(week => (
          <button
            key={week.weekKey}
            onClick={() => onDaySelect(week.weekKey)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200 flex flex-col items-center min-w-[100px]
              ${selectedDay === week.weekKey
                ? 'bg-slate-700 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-label={`Filter to Week ${week.weekNumber}`}
            aria-pressed={selectedDay === week.weekKey}
          >
            <span className="text-sm font-semibold">
              Week {week.weekNumber}
            </span>
            <span className="text-xs opacity-75">
              {formatWeekRange(week.weekStart, week.weekEnd)}
            </span>
            {week.locationFlags.length > 0 && (
              <span className="text-sm mt-1">
                {week.locationFlags.join(' ')}
              </span>
            )}
            <span className="text-xs font-bold mt-0.5">
              {week.events.length} {week.events.length === 1 ? 'event' : 'events'}
            </span>
          </button>
        ))}

        {/* Day pills for week views */}
        {!isMonthView && sortedDates.map(dateKey => {
          const dateInfo = eventsByDate[dateKey];
          const { dayName, date, events: dayEvents } = dateInfo;
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const locationEvent = findLocationForDate(date, events);
          const locationDetails = locationEvent ? extractLocationDetails(locationEvent.summary || '') : null;

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

      {/* Selected week indicator */}
      {selectedWeek && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
          <p className="text-sm text-slate-900">
            <strong>Viewing Week {selectedWeek.weekNumber}</strong> ({formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}) — {selectedWeek.events.length} events
          </p>
          <button
            onClick={() => onDaySelect(null)}
            className="text-sm text-slate-700 hover:text-slate-800 font-medium underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Selected day indicator (for week views) */}
      {!isMonthView && selectedDay && eventsByDate[selectedDay] && (
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
