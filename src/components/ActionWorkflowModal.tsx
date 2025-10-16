/**
 * ActionWorkflowModal Component
 * Modal that displays filtered events for specific actions and allows bulk operations
 */

import React, { useState } from 'react';
import DoubleBookingTimeline from './DoubleBookingTimeline';
import BackToBackTimeline from './BackToBackTimeline';

const ActionWorkflowModal = ({
  isOpen,
  onClose,
  actionType,
  events,
  analytics,
  onExecuteAction,
  onDeletePlaceholder,
  onAddBuffer
}) => {
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  // Get action configuration based on type
  const getActionConfig = () => {
    const configs = {
      'back-to-back': {
        title: 'Add Buffers to Back-to-Back Meetings',
        description: 'Select meetings to add 15-minute buffers after',
        icon: '🔴',
        filterFn: (event) => event.gapAfter?.status === 'back-to-back',
        actionLabel: 'Add Buffer After',
        color: 'bg-red-50 border-red-300'
      },
      'insufficient-buffer': {
        title: 'Extend Insufficient Buffers',
        description: 'Select meetings with less than 10 minutes of buffer time',
        icon: '🟡',
        filterFn: (event) => event.gapAfter?.status === 'insufficient' && event.gapAfter?.minutes < 10,
        actionLabel: 'Extend Buffer',
        color: 'bg-orange-50 border-orange-300'
      },
      'missing-video': {
        title: 'Add Video Conferencing Links',
        description: 'Select meetings that need video conferencing links',
        icon: '🎥',
        filterFn: (event) => {
          // Use the analytics data if available
          if (analytics?.meetingsWithoutVideoLinks) {
            return analytics.meetingsWithoutVideoLinks.some(m => m.id === event.id);
          }
          // Fallback to checking manually
          const desc = event.description?.toLowerCase() || '';
          const location = event.location?.toLowerCase() || '';
          const hasConference = event.conferenceData || event.hangoutLink;
          const hasVideoKeyword = desc.includes('zoom.us') || desc.includes('meet.google.com') ||
                                   desc.includes('teams.microsoft.com') || location.includes('zoom') ||
                                   location.includes('meet') || location.includes('teams');
          return !hasConference && !hasVideoKeyword && event.summary &&
                 !event.summary.toLowerCase().includes('focus') &&
                 !event.summary.toLowerCase().includes('lunch');
        },
        actionLabel: 'Add Video Link',
        color: 'bg-orange-50 border-orange-300'
      },
      'double-booking': {
        title: 'Resolve Double Bookings',
        description: 'These events overlap with each other',
        icon: '🚨',
        filterFn: (event) => {
          // Use the analytics data if available
          if (analytics?.doubleBookings) {
            return analytics.doubleBookings.some(conflict =>
              conflict.event1.id === event.id || conflict.event2.id === event.id
            );
          }
          return event.isDoubleBooked === true;
        },
        actionLabel: 'Reschedule',
        color: 'bg-red-100 border-red-500'
      },
      'declined-meetings': {
        title: 'Review Declined Meetings',
        description: 'Two-person meetings where one or both parties declined',
        icon: '❌',
        filterFn: (event) => {
          // Use the analytics data if available
          if (analytics?.declinedTwoPersonMeetings) {
            return analytics.declinedTwoPersonMeetings.some(m => m.id === event.id);
          }
          // Fallback to checking manually
          const attendees = event.attendees || [];
          if (attendees.length !== 2) return false;

          const otherAttendee = attendees.find(a => !a.self);
          const selfAttendee = attendees.find(a => a.self === true);

          const otherDeclined = otherAttendee?.responseStatus === 'declined';
          const selfDeclined = selfAttendee?.responseStatus === 'declined';

          return otherDeclined || selfDeclined;
        },
        actionLabel: 'Delete Meeting',
        color: 'bg-red-100 border-red-400'
      },
      'flights-travel-blocks': {
        title: 'Add Travel Blocks to Flights',
        description: 'Flights missing 90-minute travel blocks before or after',
        icon: '✈️',
        filterFn: (event) => {
          // Use the analytics data if available
          if (analytics?.flightsWithoutTravelBlocks) {
            return analytics.flightsWithoutTravelBlocks.some(f => f.id === event.id);
          }
          return false;
        },
        actionLabel: 'Add Travel Blocks',
        color: 'bg-slate-100 border-slate-400'
      },
      'international-flights-location': {
        title: 'Add Location Tracking',
        description: 'International flights missing location/timezone tracking',
        icon: '🌍',
        filterFn: (event) => {
          // Use the analytics data if available
          if (analytics?.internationalFlightsWithoutLocation) {
            return analytics.internationalFlightsWithoutLocation.some(f => f.id === event.id);
          }
          return false;
        },
        actionLabel: 'Add Location Events',
        color: 'bg-slate-100 border-slate-400'
      },
      'out-of-hours-foreign': {
        title: 'Out of Hours Meetings in Foreign Timezone',
        description: 'Meetings scheduled outside business hours while traveling abroad',
        icon: '🌙',
        filterFn: (event) => {
          // Use the analytics data if available
          if (analytics?.meetingsOutsideBusinessHours) {
            return analytics.meetingsOutsideBusinessHours.some(m => m.id === event.id);
          }
          return event.outOfHoursInTimezone !== null;
        },
        actionLabel: 'Decline & Delete',
        color: 'bg-amber-100 border-amber-400'
      }
    };

    return configs[actionType] || {
      title: 'Action Workflow',
      description: 'Select events to take action on',
      icon: '⚡',
      filterFn: () => true,
      actionLabel: 'Apply Action',
      color: 'bg-slate-50 border-slate-300'
    };
  };

  const config = getActionConfig();

  // For flights and international flights, use the analytics data directly to preserve properties
  const filteredEvents = actionType === 'flights-travel-blocks' && analytics?.flightsWithoutTravelBlocks
    ? analytics.flightsWithoutTravelBlocks
    : actionType === 'international-flights-location' && analytics?.internationalFlightsWithoutLocation
    ? analytics.internationalFlightsWithoutLocation
    : actionType === 'out-of-hours-foreign' && analytics?.meetingsOutsideBusinessHours
    ? analytics.meetingsOutsideBusinessHours
    : events.filter(config.filterFn);

  // Toggle event selection
  const toggleEventSelection = (eventId) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  // Select all events
  const selectAll = () => {
    setSelectedEvents(filteredEvents.map(e => e.id));
  };

  // Deselect all events
  const deselectAll = () => {
    setSelectedEvents([]);
  };

  // Execute action on selected events
  const handleExecute = async () => {
    if (selectedEvents.length === 0) {
      alert('Please select at least one event');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${config.actionLabel.toLowerCase()} for ${selectedEvents.length} event(s)?`
    );

    if (!confirmed) return;

    setIsExecuting(true);
    try {
      await onExecuteAction(actionType, selectedEvents);
      alert(`Successfully applied action to ${selectedEvents.length} event(s)!`);
      onClose();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{config.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{config.title}</h2>
                <p className="text-sm opacity-90 mt-1">{config.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-3xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl block mb-4">✨</span>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                No Events Found
              </p>
              <p className="text-gray-600">
                All events are already in good shape!
              </p>
            </div>
          ) : actionType === 'double-booking' && analytics?.doubleBookings ? (
            // Special timeline view for double bookings
            <DoubleBookingTimeline
              conflicts={analytics.doubleBookings}
              onDeletePlaceholder={onDeletePlaceholder}
              onDeleteEvent={async (event) => {
                // Delete the event and refresh
                await onExecuteAction('delete-single-event', [event.id]);
                onClose();
              }}
            />
          ) : actionType === 'international-flights-location' && filteredEvents.length > 0 ? (
            // Special view for international flights - show location tracking
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600">
                  {selectedEvents.length} of {filteredEvents.length} flight(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-slate-700 hover:text-slate-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Flight Cards - Show Complete Trips */}
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvents.includes(event.id);

                  // Determine which data to use for the location
                  const locationData = event.isReturningHome ? event.fromData : event.toData;
                  const locationCity = locationData?.city;
                  const locationFlag = locationData?.flag;
                  const locationTimezone = locationData?.timezone;

                  // Calculate trip duration
                  const arrivalDate = new Date(event.arrivalDate);
                  const departureDate = new Date(event.departureDate);
                  const durationDays = Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`
                        ${config.color} border-2 rounded-lg p-5 cursor-pointer
                        transition-all duration-200 hover:shadow-md
                        ${isSelected ? 'ring-4 ring-purple-500 ring-opacity-50 scale-[1.01]' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEventSelection(event.id)}
                            className="w-5 h-5 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                          />
                        </div>

                        {/* Trip Details */}
                        <div className="flex-1 min-w-0">
                          {/* Trip Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{locationFlag}</span>
                            <h3 className="font-bold text-gray-900 text-lg">
                              Trip to {locationCity}
                            </h3>
                          </div>

                          {/* Outbound Flight (if available) */}
                          {event.outboundFlight && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-slate-900">✈️ Outbound Flight</span>
                              </div>
                              <div className="text-sm text-slate-800">
                                <div className="font-medium">{event.outboundFlight.summary}</div>
                                <div className="text-xs mt-1">
                                  {formatDate(event.outboundFlight.start?.dateTime)} • {formatTime(event.outboundFlight.start?.dateTime)}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Return Flight */}
                          {event.returnFlight && (
                            <div className="mb-3 p-3 bg-orange-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-orange-900">✈️ Return Flight</span>
                              </div>
                              <div className="text-sm text-orange-800">
                                <div className="font-medium">{event.returnFlight.summary}</div>
                                <div className="text-xs mt-1">
                                  {formatDate(event.returnFlight.start?.dateTime)} • {formatTime(event.returnFlight.start?.dateTime)}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* This Flight (the one detected) */}
                          <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-slate-900">
                                ✈️ {event.isReturningHome ? 'Return Flight (detected)' : 'Outbound Flight (detected)'}
                              </span>
                            </div>
                            <div className="text-sm text-slate-800">
                              <div className="font-medium">{event.summary}</div>
                              <div className="text-xs mt-1">
                                {formatDate(event.start?.dateTime)} • {formatTime(event.start?.dateTime)}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-lg">{event.fromData?.flag}</span>
                                <span className="text-xs">{event.fromData?.city}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-lg">{event.toData?.flag}</span>
                                <span className="text-xs">{event.toData?.city}</span>
                              </div>
                            </div>
                          </div>

                          {/* Location Event to Create */}
                          <div className="mt-3 p-4 bg-green-50 border border-green-300 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📍</span>
                              <span className="font-bold text-green-900">Location Event to Create:</span>
                            </div>
                            <div className="space-y-1 text-sm text-green-800">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{locationFlag}</span>
                                <span className="font-semibold">{locationCity}</span>
                                <span className="text-xs text-green-600">({locationTimezone})</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold">Duration:</span>
                                <span>{durationDays} {durationDays === 1 ? 'day' : 'days'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold">From:</span>
                                <span>{arrivalDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold">Until:</span>
                                <span>{departureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : actionType === 'flights-travel-blocks' && filteredEvents.length > 0 ? (
            // Special view for flights - show which travel blocks are needed
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600">
                  {selectedEvents.length} of {filteredEvents.length} flight(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-slate-700 hover:text-slate-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Flight Cards */}
              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvents.includes(event.id);
                  const startTime = event.start?.dateTime || event.start?.date;
                  const endTime = event.end?.dateTime || event.end?.date;

                  return (
                    <div
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`
                        ${config.color} border-2 rounded-lg p-4 cursor-pointer
                        transition-all duration-200 hover:shadow-md
                        ${isSelected ? 'ring-4 ring-blue-500 ring-opacity-50 scale-[1.01]' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEventSelection(event.id)}
                            className="w-5 h-5 rounded border-gray-300 text-slate-700 focus:ring-blue-500"
                          />
                        </div>

                        {/* Flight Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                            ✈️ {event.summary || 'Untitled Flight'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span>📅 {formatDate(startTime)}</span>
                            <span>⏰ {formatTime(startTime)} - {formatTime(endTime)}</span>
                          </div>

                          {/* Missing Travel Blocks Info */}
                          <div className="mt-2 space-y-1">
                            {event.needsTravelBlockBefore && (
                              <div className="p-2 bg-slate-50 rounded text-sm">
                                <span className="font-semibold text-slate-900">⬅️ Missing: </span>
                                <span className="text-slate-800">
                                  90-min travel block before flight
                                </span>
                              </div>
                            )}
                            {event.needsTravelBlockAfter && (
                              <div className="p-2 bg-slate-50 rounded text-sm">
                                <span className="font-semibold text-slate-900">➡️ Missing: </span>
                                <span className="text-slate-800">
                                  90-min travel block after flight
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Location */}
                          {event.location && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="truncate">📍 {event.location}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : actionType === 'declined-meetings' && filteredEvents.length > 0 ? (
            // Special view for declined meetings - just show the list with delete option
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600">
                  {selectedEvents.length} of {filteredEvents.length} meeting(s) selected for deletion
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-slate-700 hover:text-slate-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Event Cards */}
              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvents.includes(event.id);
                  const startTime = event.start?.dateTime || event.start?.date;
                  const endTime = event.end?.dateTime || event.end?.date;
                  const attendees = event.attendees || [];

                  // Check who declined
                  const otherAttendee = attendees.find(a => !a.self);
                  const selfAttendee = attendees.find(a => a.self);

                  const otherPersonDeclined = otherAttendee?.responseStatus === 'declined';
                  const selfDeclined = selfAttendee?.responseStatus === 'declined';

                  let declineMessage = '';
                  if (otherPersonDeclined && selfDeclined) {
                    declineMessage = 'Both parties declined';
                  } else if (otherPersonDeclined) {
                    declineMessage = `Declined by: ${otherAttendee.displayName || otherAttendee.email}`;
                  } else if (selfDeclined) {
                    declineMessage = 'You declined this meeting';
                  }

                  return (
                    <div
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`
                        ${config.color} border-2 rounded-lg p-4 cursor-pointer
                        transition-all duration-200 hover:shadow-md
                        ${isSelected ? 'ring-4 ring-red-500 ring-opacity-50 scale-[1.01]' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEventSelection(event.id)}
                            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {event.summary || 'Untitled Event'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span>📅 {formatDate(startTime)}</span>
                            <span>⏰ {formatTime(startTime)} - {formatTime(endTime)}</span>
                          </div>

                          {/* Declined Attendee Info */}
                          {declineMessage && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                              <span className="font-semibold text-red-900">❌ {declineMessage}</span>
                            </div>
                          )}

                          {/* Location */}
                          {event.location && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="truncate">📍 {event.location}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : actionType === 'out-of-hours-foreign' && filteredEvents.length > 0 ? (
            // Special view for out of hours meetings
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600">
                  {selectedEvents.length} of {filteredEvents.length} meeting(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-slate-700 hover:text-slate-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Event Cards */}
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvents.includes(event.id);
                  const startTime = event.start?.dateTime || event.start?.date;
                  const endTime = event.end?.dateTime || event.end?.date;

                  return (
                    <div
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`
                        ${config.color} border-2 rounded-lg p-4 cursor-pointer
                        transition-all duration-200 hover:shadow-md
                        ${isSelected ? 'ring-4 ring-amber-500 ring-opacity-50 scale-[1.01]' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEventSelection(event.id)}
                            className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            🌙 {event.summary || 'Untitled Event'}
                          </h3>

                          {/* Timezone Warning Banner */}
                          <div className="mb-3 p-3 bg-amber-200 border border-amber-400 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{event.locationFlag}</span>
                              <span className="font-bold text-amber-900">
                                Out of hours in {event.locationCity}, {event.locationCountry}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="font-semibold text-amber-900">Local Time ({event.locationCity}):</div>
                                <div className="text-amber-800">
                                  {formatTime(startTime)} (Hour: {event.foreignLocalHour}:00)
                                </div>
                                <div className="text-xs text-amber-700 mt-1">
                                  ⚠️ Outside business hours (8am-6pm)
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-amber-900">UK Time (Home):</div>
                                <div className="text-amber-800">
                                  {formatTime(startTime)} (Hour: {event.homeLocalHour}:00)
                                </div>
                                <div className="text-xs text-amber-700 mt-1">
                                  {event.isWithinHoursAtHome ? '✓ Within UK business hours' : '⚠️ Also out of hours in UK'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Meeting Details */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span>📅 {formatDate(startTime)}</span>
                            <span>⏰ {formatTime(startTime)} - {formatTime(endTime)}</span>
                          </div>

                          {/* Location */}
                          {event.location && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="truncate">📍 {event.location}</p>
                            </div>
                          )}

                          {/* Attendees Count */}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p>👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : actionType === 'back-to-back' && filteredEvents.length > 0 ? (
            // Special timeline view for back-to-back meetings
            <BackToBackTimeline
              backToBackPairs={filteredEvents.map(event => {
                // event is the first meeting that has no gap after it
                // Find the next event that starts right after this one ends
                const eventEnd = new Date(event.end?.dateTime || event.end?.date);
                const nextEvent = events.find(e => {
                  const eStart = new Date(e.start?.dateTime || e.start?.date);
                  // Allow up to 1 minute difference to account for rounding
                  const timeDiff = Math.abs(eStart - eventEnd);
                  return timeDiff <= 60000; // 60 seconds
                });

                return {
                  beforeEvent: event, // First meeting
                  afterEvent: nextEvent // Second meeting (back-to-back)
                };
              }).filter(pair => pair.afterEvent)}
              onAddBuffer={onAddBuffer}
            />
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600">
                  {selectedEvents.length} of {filteredEvents.length} event(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-slate-700 hover:text-slate-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Event Cards */}
              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvents.includes(event.id);
                  const startTime = event.start?.dateTime || event.start?.date;
                  const endTime = event.end?.dateTime || event.end?.date;

                  return (
                    <div
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`
                        ${config.color} border-2 rounded-lg p-4 cursor-pointer
                        transition-all duration-200 hover:shadow-md
                        ${isSelected ? 'ring-4 ring-indigo-500 ring-opacity-50 scale-[1.01]' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEventSelection(event.id)}
                            className="w-5 h-5 rounded border-gray-300 text-slate-700 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {event.summary || 'Untitled Event'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>📅 {formatDate(startTime)}</span>
                            <span>⏰ {formatTime(startTime)} - {formatTime(endTime)}</span>
                          </div>

                          {/* Gap Info */}
                          {event.gapAfter && (
                            <div className="mt-2 text-sm">
                              <span className="inline-block px-2 py-1 bg-white/50 rounded">
                                Gap after: {event.gapAfter.minutes} min ({event.gapAfter.status})
                              </span>
                            </div>
                          )}

                          {/* Location/Description Preview */}
                          {(event.location || event.description) && (
                            <div className="mt-2 text-sm text-gray-600">
                              {event.location && (
                                <p className="truncate">📍 {event.location}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {filteredEvents.length > 0 && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                {actionType === 'double-booking' ? 'Close' : 'Cancel'}
              </button>
              {actionType !== 'double-booking' && (
                <button
                  onClick={handleExecute}
                  disabled={selectedEvents.length === 0 || isExecuting}
                  className={`px-8 py-3 font-semibold rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2
                           ${actionType === 'declined-meetings'
                             ? 'bg-red-600 hover:bg-red-700 text-white'
                             : 'bg-slate-700 hover:bg-slate-800 text-white'
                           }`}
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {config.actionLabel} ({selectedEvents.length})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionWorkflowModal;
