import type { CalendarEvent, EventWithGap, TimeRange } from '../types';

/**
 * EventsTimeline Component
 * Displays events with day headings when viewing multiple days
 */

import EventCard from './EventCard';

type TimelineEvent = EventWithGap | (CalendarEvent & { gapAfter?: unknown });

interface EventsTimelineProps {
  events: TimelineEvent[];
  showDayHeadings: boolean;
  onAddBufferBefore: (event: CalendarEvent) => Promise<void>;
  onAddBufferAfter: (event: CalendarEvent) => Promise<void>;
  onMoveEvent: (event: CalendarEvent) => Promise<void>;
  timeRange: TimeRange | null;
}

type EventsByDayEntry = {
  dayName: string;
  dateStr: string;
  events: TimelineEvent[];
  date: Date;
};

const EventsTimeline: React.FC<EventsTimelineProps> = ({
  events,
  showDayHeadings,
  onAddBufferBefore,
  onAddBufferAfter,
  onMoveEvent,
  timeRange
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <span className="text-6xl block mb-4" role="img" aria-label="Empty">
          📭
        </span>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Events Found
        </h3>
        <p className="text-gray-600">
          Enjoy your free time! 🎉
        </p>
      </div>
    );
  }

  // Group events by day if showing day headings
  if (showDayHeadings) {
    const eventsByDay: Record<string, EventsByDayEntry> = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Parse time range boundaries if provided
    const rangeStart = timeRange ? new Date(timeRange.timeMin) : null;
    const rangeEnd = timeRange ? new Date(timeRange.timeMax) : null;

    events.forEach(event => {
      // Parse date correctly to avoid timezone issues
      let startTime;

      if (event.start?.dateTime) {
        // Event has specific time
        startTime = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        // All-day event - parse as local date to avoid timezone shift
        const [year, month, day] = event.start.date.split('-').map(Number);
        startTime = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        startTime = new Date();
      }

      // Skip events outside the time range if timeRange is provided
      if (rangeStart && rangeEnd) {
        if (startTime < rangeStart || startTime > rangeEnd) {
          return; // Skip this event
        }
      }

      const dayKey = startTime.toDateString(); // Unique key for each calendar day
      const dayName = daysOfWeek[startTime.getDay()];
      const dateStr = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = {
          dayName,
          dateStr,
          events: [],
          date: startTime
        };
      }

      eventsByDay[dayKey].events.push(event);
    });

    // Sort days chronologically
    const sortedDays = Object.entries(eventsByDay)
      .map(([key, value]) => ({ dayKey: key, ...value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
      <div className="space-y-8">
        {sortedDays.map(({ dayName, dateStr, events: dayEvents, date }) => (
          <div key={date.toISOString()} className="space-y-4">
            {/* Day Heading */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl shadow-lg p-4 sticky top-20 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" role="img" aria-label="Calendar">
                    📅
                  </span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {dayName}
                    </h3>
                    <p className="text-sm text-white/90">
                      {dateStr}
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-white font-bold text-lg">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Events for this day */}
            <div className="space-y-4 ml-4">
              {dayEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  gapAfter={event.gapAfter}
                  onAddBufferBefore={onAddBufferBefore}
                  onAddBufferAfter={onAddBufferAfter}
                  onMoveEvent={onMoveEvent}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single day view - no headings
  return (
    <div className="space-y-4">
      {events.map(event => (
        <EventCard
          key={event.id}
          event={event}
          gapAfter={event.gapAfter}
          onAddBufferBefore={onAddBufferBefore}
          onAddBufferAfter={onAddBufferAfter}
          onMoveEvent={onMoveEvent}
        />
      ))}
    </div>
  );
};

export default EventsTimeline;
