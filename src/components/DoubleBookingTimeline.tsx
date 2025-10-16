/**
 * DoubleBookingTimeline Component
 * Visual timeline showing double-booked meetings with time scale
 */

import React, { useState } from 'react';

const DoubleBookingTimeline = ({ conflicts, onDeletePlaceholder, onDeleteEvent }) => {
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  // Get all placeholders from conflicts
  const getAllPlaceholders = () => {
    const placeholders = [];
    conflicts.forEach(({ event1, event2, isMeeting1, isMeeting2 }) => {
      // Only include conflicts where one is a meeting and one is a placeholder
      if (isMeeting1 && !isMeeting2) {
        placeholders.push(event2);
      } else if (!isMeeting1 && isMeeting2) {
        placeholders.push(event1);
      }
    });
    return placeholders;
  };

  // Handle bulk delete all placeholders
  const handleBulkDeletePlaceholders = async () => {
    const placeholders = getAllPlaceholders();

    if (placeholders.length === 0) {
      alert('No placeholders found to delete. All conflicts are between two meetings.');
      return;
    }

    const placeholderNames = placeholders.map(p => `• ${p.summary}`).join('\n');
    if (!window.confirm(
      `Delete ${placeholders.length} placeholder${placeholders.length !== 1 ? 's' : ''} and log to AI-Removed Events?\n\n${placeholderNames}`
    )) {
      return;
    }

    setIsBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const placeholder of placeholders) {
      try {
        // Pass options to skip individual notifications and refreshes in bulk mode
        await onDeletePlaceholder(placeholder, {
          skipNotification: true,
          skipRefresh: true
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to delete ${placeholder.summary}:`, error);
        failCount++;
      }
    }

    setIsBulkDeleting(false);

    // Show single summary notification at the end
    if (failCount === 0) {
      alert(`Successfully deleted ${successCount} placeholder${successCount !== 1 ? 's' : ''} and logged to AI-Removed Events!`);
    } else {
      alert(`Deleted ${successCount} placeholder${successCount !== 1 ? 's' : ''}. ${failCount} failed.`);
    }

    // Refresh calendar once at the end
    window.location.reload();
  };

  // Handle delete single placeholder
  const handleDeletePlaceholder = async (placeholderEvent) => {
    if (!window.confirm(`Delete "${placeholderEvent.summary}" and log it to AI-Removed Events?`)) {
      return;
    }

    setDeletingEventId(placeholderEvent.id);
    try {
      await onDeletePlaceholder(placeholderEvent);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeletingEventId(null);
    }
  };

  // Handle decline and delete meeting
  const handleDeclineAndDelete = async (event) => {
    if (!window.confirm(`Decline and delete "${event.summary}"?\n\nThis will remove the event from your calendar.`)) {
      return;
    }

    setDeletingEventId(event.id);
    try {
      if (onDeleteEvent) {
        await onDeleteEvent(event);
      } else {
        throw new Error('Delete function not available');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeletingEventId(null);
    }
  };

  const allPlaceholders = getAllPlaceholders();

  // Format time for display
  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date for display
  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate position and height for event blocks
  const getEventStyle = (startTime, endTime, totalStart, totalEnd) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const rangeStart = new Date(totalStart).getTime();
    const rangeEnd = new Date(totalEnd).getTime();

    const totalDuration = rangeEnd - rangeStart;
    const topPercent = ((start - rangeStart) / totalDuration) * 100;
    const heightPercent = ((end - start) / totalDuration) * 100;

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`
    };
  };

  // Generate time markers for the timeline
  const generateTimeMarkers = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const markers = [];

    // Round start time to nearest 15 minutes
    const roundedStart = new Date(start);
    roundedStart.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);

    let current = new Date(roundedStart);

    while (current <= end) {
      markers.push(new Date(current));
      current.setMinutes(current.getMinutes() + 15);
    }

    return markers;
  };

  return (
    <div className="space-y-6">
      {/* Bulk Delete Button */}
      {allPlaceholders.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗑️</span>
              <div>
                <h3 className="text-xl font-bold">Quick Action</h3>
                <p className="text-sm opacity-90">
                  Found {allPlaceholders.length} placeholder{allPlaceholders.length !== 1 ? 's' : ''} conflicting with meetings
                </p>
              </div>
            </div>
            <button
              onClick={handleBulkDeletePlaceholders}
              disabled={isBulkDeleting}
              className="px-6 py-3 bg-white hover:bg-gray-100 text-red-600 font-bold rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg"
            >
              {isBulkDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete All Placeholders
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Individual Conflict Cards */}
      {conflicts.map((conflict, index) => {
        const { event1, event2, overlapStart, overlapEnd, overlapMinutes, isMeeting1, isMeeting2 } = conflict;

        // Determine the overall time range for this conflict
        const start1 = new Date(event1.start?.dateTime || event1.start?.date);
        const end1 = new Date(event1.end?.dateTime || event1.end?.date);
        const start2 = new Date(event2.start?.dateTime || event2.start?.date);
        const end2 = new Date(event2.end?.dateTime || event2.end?.date);

        const timelineStart = new Date(Math.min(start1, start2));
        const timelineEnd = new Date(Math.max(end1, end2));

        const timeMarkers = generateTimeMarkers(timelineStart, timelineEnd);

        const event1Style = getEventStyle(
          event1.start?.dateTime || event1.start?.date,
          event1.end?.dateTime || event1.end?.date,
          timelineStart,
          timelineEnd
        );

        const event2Style = getEventStyle(
          event2.start?.dateTime || event2.start?.date,
          event2.end?.dateTime || event2.end?.date,
          timelineStart,
          timelineEnd
        );

        return (
          <div key={index} className="bg-white rounded-xl shadow-lg border-2 border-red-300 overflow-hidden">
            {/* Conflict Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Conflict #{index + 1}</h3>
                  <p className="text-sm opacity-90">
                    {formatDate(overlapStart)} • {overlapMinutes} minute{overlapMinutes !== 1 ? 's' : ''} overlapping
                  </p>
                </div>
                {/* Calculate overlap percentage */}
                {(() => {
                  const duration1 = (end1 - start1) / (1000 * 60);
                  const duration2 = (end2 - start2) / (1000 * 60);
                  const overlapPercent1 = Math.round((overlapMinutes / duration1) * 100);
                  const overlapPercent2 = Math.round((overlapMinutes / duration2) * 100);
                  const isCompleteOverlap = overlapPercent1 === 100 && overlapPercent2 === 100;

                  return (
                    <div className="bg-white/20 px-3 py-2 rounded-lg">
                      <div className="text-xs uppercase font-bold opacity-75">Severity</div>
                      <div className="text-lg font-bold">
                        {isCompleteOverlap ? '100%' : `${Math.max(overlapPercent1, overlapPercent2)}%`}
                      </div>
                      <div className="text-xs opacity-90">
                        {isCompleteOverlap ? 'Complete' : 'Partial'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Timeline Visualization */}
            <div className="p-6">
              {/* Calculate total duration in minutes for better scaling */}
              {(() => {
                const totalDurationMs = timelineEnd - timelineStart;
                const totalMinutes = totalDurationMs / (1000 * 60);
                // Use 60 pixels per 15 minutes for good scaling
                const heightInPixels = Math.max(400, (totalMinutes / 15) * 60);

                return (
                  <div className="flex gap-4">
                    {/* Time Scale */}
                    <div className="w-24 flex-shrink-0">
                      <div className="relative" style={{ height: `${heightInPixels}px` }}>
                        {timeMarkers.map((marker, idx) => {
                          const totalDuration = timelineEnd - timelineStart;
                          const markerTime = marker.getTime();
                          const position = ((markerTime - timelineStart) / totalDuration) * 100;

                          return (
                            <div
                              key={idx}
                              className="absolute left-0 right-0 flex items-center"
                              style={{ top: `${position}%` }}
                            >
                              <span className="text-xs text-gray-600 font-medium mr-2 w-16 text-right">
                                {marker.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                              <div className="flex-1 border-t border-gray-300"></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Event Blocks */}
                    <div className="flex-1 flex gap-4">
                      {/* Event 1 */}
                      <div className="flex-1 relative bg-gray-50 rounded-lg border-2 border-gray-200" style={{ height: `${heightInPixels}px` }}>
                        <div
                          className="absolute left-2 right-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg shadow-lg
                                     flex flex-col justify-between p-3 text-white overflow-hidden"
                          style={event1Style}
                        >
                          <div>
                            <div className="text-xs font-bold uppercase opacity-75 mb-1">
                              {isMeeting1 ? '📅 Meeting' : '📝 Placeholder'}
                            </div>
                            <div className="font-semibold text-sm leading-tight mb-2">
                              {event1.summary || 'Untitled'}
                            </div>
                            <div className="text-xs opacity-90">
                              {formatTime(event1.start?.dateTime || event1.start?.date)}
                            </div>
                          </div>
                          <div className="text-xs opacity-90">
                            {formatTime(event1.end?.dateTime || event1.end?.date)}
                          </div>
                        </div>
                      </div>

                      {/* Overlap Indicator */}
                      <div className="w-8 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 h-full">
                          <div className="w-1 flex-1 bg-red-400 rounded"></div>
                          <div className="bg-red-500 text-white rounded-full p-2 shadow-lg">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="w-1 flex-1 bg-red-400 rounded"></div>
                        </div>
                      </div>

                      {/* Event 2 */}
                      <div className="flex-1 relative bg-gray-50 rounded-lg border-2 border-gray-200" style={{ height: `${heightInPixels}px` }}>
                        <div
                          className="absolute left-2 right-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg
                                     flex flex-col justify-between p-3 text-white overflow-hidden"
                          style={event2Style}
                        >
                          <div>
                            <div className="text-xs font-bold uppercase opacity-75 mb-1">
                              {isMeeting2 ? '📅 Meeting' : '📝 Placeholder'}
                            </div>
                            <div className="font-semibold text-sm leading-tight mb-2">
                              {event2.summary || 'Untitled'}
                            </div>
                            <div className="text-xs opacity-90">
                              {formatTime(event2.start?.dateTime || event2.start?.date)}
                            </div>
                          </div>
                          <div className="text-xs opacity-90">
                            {formatTime(event2.end?.dateTime || event2.end?.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Conflict Details */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                {/* Event 1 Details */}
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-500 rounded"></span>
                    {event1.summary || 'Untitled Event'}
                  </h4>
                  <div className="space-y-1 text-sm text-slate-800 mb-3">
                    <p>⏰ {formatTime(event1.start?.dateTime)} - {formatTime(event1.end?.dateTime)}</p>
                    {event1.location && <p>📍 {event1.location}</p>}
                    {event1.attendees && (
                      <p>👥 {event1.attendees.length} attendee{event1.attendees.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {/* Show Decline button for all meetings */}
                  {isMeeting1 && onDeleteEvent && (
                    <button
                      onClick={() => handleDeclineAndDelete(event1)}
                      disabled={deletingEventId === event1.id}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {deletingEventId === event1.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Decline & Delete
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Event 2 Details */}
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-500 rounded"></span>
                    {event2.summary || 'Untitled Event'}
                  </h4>
                  <div className="space-y-1 text-sm text-slate-800 mb-3">
                    <p>⏰ {formatTime(event2.start?.dateTime)} - {formatTime(event2.end?.dateTime)}</p>
                    {event2.location && <p>📍 {event2.location}</p>}
                    {event2.attendees && (
                      <p>👥 {event2.attendees.length} attendee{event2.attendees.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {/* Show Decline button for all meetings */}
                  {isMeeting2 && onDeleteEvent && (
                    <button
                      onClick={() => handleDeclineAndDelete(event2)}
                      disabled={deletingEventId === event2.id}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {deletingEventId === event2.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Decline & Delete
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Suggested Actions */}
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <h5 className="font-bold text-yellow-900 mb-1">Suggested Actions:</h5>
                    {isMeeting1 && isMeeting2 ? (
                      // Both are meetings - serious conflict
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• <strong>Priority conflict:</strong> You have two meetings scheduled at the same time</li>
                        <li>• Decline or reschedule one of these meetings immediately</li>
                        <li>• Ask a colleague to attend one meeting on your behalf</li>
                        <li>• Check if one meeting can be shortened to reduce overlap</li>
                      </ul>
                    ) : (
                      // One is a meeting, one is a placeholder
                      <>
                        <ul className="text-sm text-yellow-800 space-y-1 mb-3">
                          <li>• The <strong>{isMeeting1 ? 'meeting' : 'placeholder'}</strong> conflicts with your <strong>{isMeeting1 ? 'placeholder' : 'meeting'}</strong></li>
                          <li>• {isMeeting1 ? 'Delete the placeholder to attend the meeting' : 'Reschedule the meeting or remove the placeholder'}</li>
                        </ul>
                        {/* Delete placeholder button */}
                        <button
                          onClick={() => handleDeletePlaceholder(isMeeting1 ? event2 : event1)}
                          disabled={deletingEventId === (isMeeting1 ? event2.id : event1.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          {deletingEventId === (isMeeting1 ? event2.id : event1.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete "{(isMeeting1 ? event2 : event1).summary}" and Log to AI-Removed Events
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DoubleBookingTimeline;
