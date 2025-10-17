/**
 * BackToBackTimeline Component
 * Visual timeline showing back-to-back meetings with time scale
 */

import React, { useState } from 'react';

const BackToBackTimeline = ({ backToBackPairs, onAddBuffer }) => {
  const [addingBufferId, setAddingBufferId] = useState(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  if (!backToBackPairs || backToBackPairs.length === 0) {
    return null;
  }

  // Handle bulk add buffers to all back-to-back meetings
  const handleBulkAddBuffers = async () => {
    if (!window.confirm(
      `Add 15-minute buffers after ${backToBackPairs.length} back-to-back meeting${backToBackPairs.length !== 1 ? 's' : ''}?`
    )) {
      return;
    }

    setIsBulkAdding(true);
    let successCount = 0;
    let failCount = 0;

    for (const pair of backToBackPairs) {
      try {
        await onAddBuffer(pair.afterEvent, { skipNotification: true, skipRefresh: true });
        successCount++;
      } catch (error) {
        console.error(`Failed to add buffer for ${pair.afterEvent.summary}:`, error);
        failCount++;
      }
    }

    setIsBulkAdding(false);

    if (failCount === 0) {
      alert(`Successfully added buffers to ${successCount} meeting${successCount !== 1 ? 's' : ''}!`);
    } else {
      alert(`Added buffers to ${successCount} meeting${successCount !== 1 ? 's' : ''}. ${failCount} failed.`);
    }

    // Refresh calendar once at the end
    window.location.reload();
  };

  // Handle add buffer to single meeting
  const handleAddBuffer = async (event) => {
    if (!window.confirm(`Add a 15-minute buffer after "${event.summary}"?`)) {
      return;
    }

    setAddingBufferId(event.id);
    try {
      await onAddBuffer(event);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setAddingBufferId(null);
    }
  };

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
      {/* Bulk Add Buffer Button */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h3 className="text-xl font-bold">Quick Action</h3>
              <p className="text-sm opacity-90">
                Add 15-minute buffers after {backToBackPairs.length} back-to-back meeting{backToBackPairs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleBulkAddBuffers}
            disabled={isBulkAdding}
            className="px-6 py-3 bg-white hover:bg-gray-100 text-orange-600 font-bold rounded-lg
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg"
          >
            {isBulkAdding ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                Adding Buffers...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add All Buffers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Individual Back-to-Back Cards */}
      {backToBackPairs.map((pair, index) => {
        const { afterEvent, beforeEvent } = pair;

        // beforeEvent is the first meeting (earlier in time)
        // afterEvent is the second meeting (later in time, back-to-back)
        const start1 = new Date(beforeEvent.start?.dateTime || beforeEvent.start?.date);
        const end1 = new Date(beforeEvent.end?.dateTime || beforeEvent.end?.date);
        const start2 = new Date(afterEvent.start?.dateTime || afterEvent.start?.date);
        const end2 = new Date(afterEvent.end?.dateTime || afterEvent.end?.date);

        const timelineStart = start1;
        const timelineEnd = end2;

        const timeMarkers = generateTimeMarkers(timelineStart, timelineEnd);

        const event1Style = getEventStyle(
          beforeEvent.start?.dateTime || beforeEvent.start?.date,
          beforeEvent.end?.dateTime || beforeEvent.end?.date,
          timelineStart,
          timelineEnd
        );

        const event2Style = getEventStyle(
          afterEvent.start?.dateTime || afterEvent.start?.date,
          afterEvent.end?.dateTime || afterEvent.end?.date,
          timelineStart,
          timelineEnd
        );

        return (
          <div key={index} className="bg-white rounded-xl shadow-lg border-2 border-orange-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔴</span>
                  <div>
                    <h3 className="text-xl font-bold">Back-to-Back #{index + 1}</h3>
                    <p className="text-sm opacity-90">
                      {formatDate(start1)} • No break between meetings
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 px-3 py-2 rounded-lg">
                  <div className="text-xs uppercase font-bold opacity-75">Gap</div>
                  <div className="text-lg font-bold">0 min</div>
                </div>
              </div>
            </div>

            {/* Timeline Visualization */}
            <div className="p-6">
              {(() => {
                const totalDurationMs = timelineEnd.getTime() - timelineStart.getTime();
                const totalMinutes = totalDurationMs / (1000 * 60);
                const heightInPixels = Math.max(400, (totalMinutes / 15) * 60);

                return (
                  <div className="flex gap-4">
                    {/* Time Scale */}
                    <div className="w-24 flex-shrink-0">
                      <div className="relative" style={{ height: `${heightInPixels}px` }}>
                        {timeMarkers.map((marker, idx) => {
                          const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
                          const markerTime = marker.getTime();
                          const position = ((markerTime - timelineStart.getTime()) / totalDuration) * 100;

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
                    <div className="flex-1">
                      <div className="relative bg-gray-50 rounded-lg border-2 border-gray-200" style={{ height: `${heightInPixels}px` }}>
                        {/* First Meeting */}
                        <div
                          className="absolute left-2 right-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg shadow-lg
                                     flex flex-col justify-between p-3 text-white overflow-hidden"
                          style={event1Style}
                        >
                          <div>
                            <div className="text-xs font-bold uppercase opacity-75 mb-1">📅 Meeting 1</div>
                            <div className="font-semibold text-sm leading-tight mb-2">
                              {beforeEvent.summary || 'Untitled'}
                            </div>
                            <div className="text-xs opacity-90">
                              {formatTime(beforeEvent.start?.dateTime || beforeEvent.start?.date)}
                            </div>
                          </div>
                          <div className="text-xs opacity-90">
                            {formatTime(beforeEvent.end?.dateTime || beforeEvent.end?.date)}
                          </div>
                        </div>

                        {/* Gap Indicator (Red line showing no gap) */}
                        <div
                          className="absolute left-0 right-0 h-1 bg-red-500 z-10"
                          style={{ top: `${parseFloat(event1Style.top) + parseFloat(event1Style.height)}%` }}
                        >
                          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold whitespace-nowrap">
                            ⚠️ NO BREAK
                          </div>
                        </div>

                        {/* Second Meeting */}
                        <div
                          className="absolute left-2 right-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg
                                     flex flex-col justify-between p-3 text-white overflow-hidden"
                          style={event2Style}
                        >
                          <div>
                            <div className="text-xs font-bold uppercase opacity-75 mb-1">📅 Meeting 2</div>
                            <div className="font-semibold text-sm leading-tight mb-2">
                              {afterEvent.summary || 'Untitled'}
                            </div>
                            <div className="text-xs opacity-90">
                              {formatTime(afterEvent.start?.dateTime || afterEvent.start?.date)}
                            </div>
                          </div>
                          <div className="text-xs opacity-90">
                            {formatTime(afterEvent.end?.dateTime || afterEvent.end?.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Meeting Details */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                {/* Meeting 1 Details */}
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-500 rounded"></span>
                    {beforeEvent.summary || 'Untitled Event'}
                  </h4>
                  <div className="space-y-1 text-sm text-slate-800">
                    <p>⏰ {formatTime(beforeEvent.start?.dateTime)} - {formatTime(beforeEvent.end?.dateTime)}</p>
                    {beforeEvent.location && <p>📍 {beforeEvent.location}</p>}
                    {beforeEvent.attendees && (
                      <p>👥 {beforeEvent.attendees.length} attendee{beforeEvent.attendees.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>

                {/* Meeting 2 Details */}
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-500 rounded"></span>
                    {afterEvent.summary || 'Untitled Event'}
                  </h4>
                  <div className="space-y-1 text-sm text-slate-800">
                    <p>⏰ {formatTime(afterEvent.start?.dateTime)} - {formatTime(afterEvent.end?.dateTime)}</p>
                    {afterEvent.location && <p>📍 {afterEvent.location}</p>}
                    {afterEvent.attendees && (
                      <p>👥 {afterEvent.attendees.length} attendee{afterEvent.attendees.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Buffer Action */}
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <h5 className="font-bold text-yellow-900 mb-1">Suggested Action:</h5>
                    <p className="text-sm text-yellow-800 mb-3">
                      Add a 15-minute buffer after <strong>"{afterEvent.summary}"</strong> to give yourself time to prepare for the next meeting.
                    </p>
                    <button
                      onClick={() => handleAddBuffer(afterEvent)}
                      disabled={addingBufferId === afterEvent.id}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {addingBufferId === afterEvent.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Adding Buffer...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add 15-Minute Buffer
                        </>
                      )}
                    </button>
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

export default BackToBackTimeline;
