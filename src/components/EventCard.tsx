/**
 * EventCard Component
 * Displays individual calendar event with category, time, and action buttons
 */


import { formatTime, calculateDuration, isAllDayEvent } from '../utils/dateHelpers';
import { getEventColors, getEventIcon } from '../utils/eventCategorizer';
import { EventProviderLink } from './EventProviderLink';

const EventCard = ({ event, gapAfter, onAddBufferBefore, onAddBufferAfter, onMoveEvent }) => {
  const colors = getEventColors(event);
  const icon = getEventIcon(event);
  const allDay = isAllDayEvent(event);

  // Calculate duration
  let duration = 0;
  if (!allDay) {
    duration = calculateDuration(event.start.dateTime, event.end.dateTime);
  }

  // Format time display
  const timeDisplay = allDay
    ? 'All Day'
    : `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}`;

  // Determine gap status color
  let gapStatusColor = '';
  let gapStatusText = '';

  if (gapAfter) {
    if (gapAfter.status === 'back-to-back') {
      gapStatusColor = 'bg-red-100 border-red-500 text-red-800';
      gapStatusText = '⚠️ Back-to-back';
    } else if (gapAfter.status === 'insufficient-buffer') {
      gapStatusColor = 'bg-orange-100 border-orange-500 text-orange-800';
      gapStatusText = `⚠️ ${gapAfter.gapMinutes}m gap`;
    } else if (gapAfter.status === 'focus-block') {
      gapStatusColor = 'bg-green-100 border-green-500 text-green-800';
      // Format time nicely: show hours if >= 60 minutes
      const minutes = gapAfter.gapMinutes;
      const timeText = minutes >= 60
        ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? (minutes % 60) + 'm' : ''}`.trim()
        : `${minutes}m`;
      gapStatusText = `✅ ${timeText} focus time`;
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden group">
      {/* Event header with category color */}
      <div className={`h-2 ${colors.border.replace('border', 'bg')}`}></div>

      <div className="p-5">
        {/* Event title and icon */}
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0" role="img" aria-label="Event type">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {event.summary || 'Untitled Event'}
              </h3>
              {/* Provider link - shows on hover */}
              <EventProviderLink
                event={event}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              />
            </div>

            {/* Category badge */}
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
                {colors.categoryName}
              </span>

              {/* Out of hours badge */}
              {event.outOfHoursInTimezone && (
                <span
                  className="inline-block px-2 py-1 text-xs font-medium rounded bg-amber-50 text-amber-900 border border-amber-300"
                  title={`Meeting at ${event.foreignLocalHour}:00 in ${event.locationCity} (${event.homeLocalHour}:00 UK time)`}
                >
                  {event.locationFlag || '🌙'} Out of hours in {event.locationCity || 'foreign location'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time and duration */}
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{timeDisplay}</span>
          {!allDay && (
            <span className="text-gray-400">• {duration} min</span>
          )}
        </div>

        {/* Location */}
        {event.location && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Attendees count */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Gap status indicator */}
        {gapStatusText && (
          <div className={`mt-3 p-2 rounded-lg border ${gapStatusColor} text-xs font-medium`}>
            {gapStatusText}
          </div>
        )}

        {/* Action buttons */}
        {!allDay && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onAddBufferBefore(event)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              title="Add 15-minute buffer before this event"
            >
              + Buffer Before
            </button>
            <button
              onClick={() => onAddBufferAfter(event)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              title="Add 15-minute buffer after this event"
            >
              + Buffer After
            </button>
            <button
              onClick={() => onMoveEvent(event)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              title="Move to next available time slot"
            >
              📅 Move Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
