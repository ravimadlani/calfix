/**
 * DashboardTabs Component
 * Main tabbed interface for Calendar Inbox and Calendar Alerts
 */

import React, { useState, useMemo } from 'react';
import type { CalendarEvent, CalendarAnalytics } from '../types';

// Helper to get domain from email
const getDomainFromEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1 || atIndex === trimmed.length - 1) return null;
  return trimmed.slice(atIndex + 1);
};

// Check if event has external attendees
const isExternalMeeting = (event: CalendarEvent, calendarOwnerEmail: string | null): boolean => {
  if (!event.attendees || event.attendees.length === 0 || !calendarOwnerEmail) return false;

  const ownerDomain = getDomainFromEmail(calendarOwnerEmail);
  if (!ownerDomain) return false;

  return event.attendees.some(att => {
    if (!att.email) return false;
    const attendeeEmail = att.email.trim().toLowerCase();
    if (attendeeEmail === calendarOwnerEmail.toLowerCase()) return false;

    const attendeeDomain = getDomainFromEmail(attendeeEmail);
    if (!attendeeDomain || attendeeDomain.includes('calendar.google.com')) return false;

    return attendeeDomain !== ownerDomain;
  });
};

interface DashboardTabsProps {
  events: CalendarEvent[];
  analytics: CalendarAnalytics | null;
  calendarOwnerEmail: string | null;
  onActionClick: (actionType: string) => void;
}

type MainTab = 'inbox' | 'alerts';
type InboxSubTab = 'sent' | 'received';
type InboxFilter = 'all' | 'internal' | 'external' | 'action';

interface CategorizedEvents {
  sent: CalendarEvent[];
  received: CalendarEvent[];
}

// Helper to check if the calendar owner is the organizer
// Only use email matching - the 'self' property can be misleading on delegated calendars
const isOrganizer = (event: CalendarEvent, calendarOwnerEmail: string | null): boolean => {
  if (!calendarOwnerEmail) return false;

  // Check if organizer email matches the calendar owner
  if (event.organizer?.email?.toLowerCase() === calendarOwnerEmail.toLowerCase()) return true;

  return false;
};

// Helper to check if the calendar owner is an attendee (but not organizer)
const isAttendee = (event: CalendarEvent, calendarOwnerEmail: string | null): boolean => {
  if (!calendarOwnerEmail || !event.attendees) return false;

  // Check if user is in attendees list
  const selfAttendee = event.attendees.find(
    attendee => attendee.self === true ||
    attendee.email?.toLowerCase() === calendarOwnerEmail.toLowerCase()
  );

  return !!selfAttendee && !isOrganizer(event, calendarOwnerEmail);
};

// Get user's response status for an event
const getUserResponseStatus = (event: CalendarEvent, calendarOwnerEmail: string | null): string | null => {
  if (!calendarOwnerEmail || !event.attendees) return null;

  const selfAttendee = event.attendees.find(
    attendee => attendee.self === true ||
    attendee.email?.toLowerCase() === calendarOwnerEmail.toLowerCase()
  );

  return selfAttendee?.responseStatus || null;
};

// Get attendee response summary for sent events
const getAttendeeResponseSummary = (event: CalendarEvent) => {
  if (!event.attendees || event.attendees.length === 0) {
    return { accepted: 0, declined: 0, tentative: 0, needsAction: 0, total: 0 };
  }

  // Exclude the organizer from the count
  const nonOrganizerAttendees = event.attendees.filter(a => !a.organizer);

  return {
    accepted: nonOrganizerAttendees.filter(a => a.responseStatus === 'accepted').length,
    declined: nonOrganizerAttendees.filter(a => a.responseStatus === 'declined').length,
    tentative: nonOrganizerAttendees.filter(a => a.responseStatus === 'tentative').length,
    needsAction: nonOrganizerAttendees.filter(a => a.responseStatus === 'needsAction' || !a.responseStatus).length,
    total: nonOrganizerAttendees.length
  };
};

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  events,
  analytics,
  calendarOwnerEmail,
  onActionClick
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('inbox');
  const [inboxSubTab, setInboxSubTab] = useState<InboxSubTab>('received');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');

  // Categorize events into Sent and Received
  const categorizedEvents = useMemo<CategorizedEvents>(() => {
    const sent: CalendarEvent[] = [];
    const received: CalendarEvent[] = [];

    events.forEach(event => {
      // Only consider events with attendees (actual meetings)
      if (!event.attendees || event.attendees.length === 0) return;

      if (isOrganizer(event, calendarOwnerEmail)) {
        sent.push(event);
      } else if (isAttendee(event, calendarOwnerEmail)) {
        received.push(event);
      }
    });

    return { sent, received };
  }, [events, calendarOwnerEmail]);

  // Count events needing action
  const needsActionCount = useMemo(() => {
    return categorizedEvents.received.filter(event => {
      const status = getUserResponseStatus(event, calendarOwnerEmail);
      return status === 'needsAction' || !status;
    }).length;
  }, [categorizedEvents.received, calendarOwnerEmail]);

  // Count events where attendees need to respond (for chasing)
  const needsChasingCount = useMemo(() => {
    return categorizedEvents.sent.filter(event => {
      const summary = getAttendeeResponseSummary(event);
      return summary.needsAction > 0;
    }).length;
  }, [categorizedEvents.sent]);

  // Get current events based on sub-tab
  const currentEvents = inboxSubTab === 'sent' ? categorizedEvents.sent : categorizedEvents.received;

  // Filter counts for pills
  const filterCounts = useMemo(() => {
    const internalCount = currentEvents.filter(e => !isExternalMeeting(e, calendarOwnerEmail)).length;
    const externalCount = currentEvents.filter(e => isExternalMeeting(e, calendarOwnerEmail)).length;
    const actionCount = inboxSubTab === 'received'
      ? currentEvents.filter(event => {
          const status = getUserResponseStatus(event, calendarOwnerEmail);
          return status === 'needsAction' || !status;
        }).length
      : currentEvents.filter(event => {
          const summary = getAttendeeResponseSummary(event);
          return summary.needsAction > 0;
        }).length;

    return { internal: internalCount, external: externalCount, action: actionCount };
  }, [currentEvents, calendarOwnerEmail, inboxSubTab]);

  // Apply filter to events
  const filteredInboxEvents = useMemo(() => {
    if (inboxFilter === 'all') return currentEvents;

    return currentEvents.filter(event => {
      if (inboxFilter === 'internal') {
        return !isExternalMeeting(event, calendarOwnerEmail);
      }
      if (inboxFilter === 'external') {
        return isExternalMeeting(event, calendarOwnerEmail);
      }
      if (inboxFilter === 'action') {
        if (inboxSubTab === 'received') {
          const status = getUserResponseStatus(event, calendarOwnerEmail);
          return status === 'needsAction' || !status;
        } else {
          const summary = getAttendeeResponseSummary(event);
          return summary.needsAction > 0;
        }
      }
      return true;
    });
  }, [currentEvents, inboxFilter, calendarOwnerEmail, inboxSubTab]);

  // Get event URL for linking
  const getEventUrl = (event: CalendarEvent): string | null => {
    return event.htmlLink || event.providerUrl || null;
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start?.date) {
      return 'All day';
    }
    if (event.start?.dateTime) {
      return new Date(event.start.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    return '';
  };

  const formatEventDate = (event: CalendarEvent) => {
    const dateStr = event.start?.dateTime || event.start?.date;
    if (!dateStr) return '';

    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderResponseBadge = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>;
      case 'declined':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">Declined</span>;
      case 'tentative':
        return <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Tentative</span>;
      case 'needsAction':
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Needs Response</span>;
    }
  };

  const renderAttendeesSummary = (event: CalendarEvent) => {
    const summary = getAttendeeResponseSummary(event);

    if (summary.total === 0) return null;

    return (
      <div className="flex items-center gap-2 text-xs">
        {summary.accepted > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {summary.accepted} accepted
          </span>
        )}
        {summary.tentative > 0 && (
          <span className="flex items-center gap-1 text-yellow-600">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            {summary.tentative} tentative
          </span>
        )}
        {summary.needsAction > 0 && (
          <span className="flex items-center gap-1 text-orange-600">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            {summary.needsAction} awaiting
          </span>
        )}
        {summary.declined > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            {summary.declined} declined
          </span>
        )}
      </div>
    );
  };

  const renderAttendeesWhoNeedChasing = (event: CalendarEvent) => {
    if (!event.attendees) return null;

    const needsResponse = event.attendees.filter(
      a => !a.organizer && (a.responseStatus === 'needsAction' || !a.responseStatus)
    );

    if (needsResponse.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-orange-50 rounded-lg">
        <p className="text-xs font-medium text-orange-800 mb-1">Chase for response:</p>
        <div className="flex flex-wrap gap-1">
          {needsResponse.slice(0, 5).map((attendee, idx) => (
            <span key={idx} className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
              {attendee.displayName || attendee.email}
            </span>
          ))}
          {needsResponse.length > 5 && (
            <span className="text-xs text-orange-600">+{needsResponse.length - 5} more</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Main Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
            activeTab === 'inbox'
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Calendar Inbox
            {(needsActionCount > 0 || needsChasingCount > 0) && (
              <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                {needsActionCount + needsChasingCount}
              </span>
            )}
          </span>
          {activeTab === 'inbox' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
            activeTab === 'alerts'
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Calendar Alerts
            {analytics && (analytics.backToBackCount > 0 || analytics.doubleBookingCount > 0) && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {(analytics.backToBackCount || 0) + (analytics.doubleBookingCount || 0)}
              </span>
            )}
          </span>
          {activeTab === 'alerts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'inbox' && (
          <div>
            {/* Inbox Sub-tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setInboxSubTab('received'); setInboxFilter('all'); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  inboxSubTab === 'received'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Received
                {needsActionCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                    {needsActionCount}
                  </span>
                )}
                <span className="ml-1 text-gray-400">({categorizedEvents.received.length} events)</span>
              </button>
              <button
                onClick={() => { setInboxSubTab('sent'); setInboxFilter('all'); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  inboxSubTab === 'sent'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sent
                {needsChasingCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                    {needsChasingCount}
                  </span>
                )}
                <span className="ml-1 text-gray-400">({categorizedEvents.sent.length} events)</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setInboxFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inboxFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({currentEvents.length})
              </button>
              <button
                onClick={() => setInboxFilter('internal')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inboxFilter === 'internal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Internal ({filterCounts.internal})
              </button>
              <button
                onClick={() => setInboxFilter('external')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inboxFilter === 'external'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                External ({filterCounts.external})
              </button>
              <button
                onClick={() => setInboxFilter('action')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inboxFilter === 'action'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                Action Required ({filterCounts.action})
              </button>
            </div>

            {/* Event List */}
            <div className="space-y-3">
              {filteredInboxEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>No {inboxSubTab === 'received' ? 'received' : 'sent'} invitations {inboxFilter !== 'all' ? 'matching this filter' : 'in this time period'}</p>
                </div>
              ) : (
                <>
                  {inboxSubTab === 'received' && filteredInboxEvents.map(event => {
                    const responseStatus = getUserResponseStatus(event, calendarOwnerEmail);
                    const needsResponse = responseStatus === 'needsAction' || !responseStatus;
                    const isExternal = isExternalMeeting(event, calendarOwnerEmail);

                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border ${
                          needsResponse
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 truncate">
                                {event.summary || 'Untitled Event'}
                              </h4>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                isExternal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isExternal ? 'External' : 'Internal'}
                              </span>
                              {renderResponseBadge(responseStatus)}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatEventDate(event)} • {formatEventTime(event)}
                            </p>
                            {event.organizer && (
                              <p className="text-xs text-gray-400 mt-1">
                                From: {event.organizer.displayName || event.organizer.email}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getEventUrl(event) && (
                              <a
                                href={getEventUrl(event)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Open in calendar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                            {needsResponse && (
                              <>
                                <button className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                  Accept
                                </button>
                                <button className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                  Decline
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {inboxSubTab === 'sent' && filteredInboxEvents.map(event => {
                    const summary = getAttendeeResponseSummary(event);
                    const hasAwaitingResponses = summary.needsAction > 0;
                    const isExternal = isExternalMeeting(event, calendarOwnerEmail);

                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border ${
                          hasAwaitingResponses
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-medium text-gray-900 truncate">
                                {event.summary || 'Untitled Event'}
                              </h4>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                isExternal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isExternal ? 'External' : 'Internal'}
                              </span>
                              {renderAttendeesSummary(event)}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatEventDate(event)} • {formatEventTime(event)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {summary.total} attendee{summary.total !== 1 ? 's' : ''} invited
                            </p>
                            {hasAwaitingResponses && renderAttendeesWhoNeedChasing(event)}
                          </div>
                          {getEventUrl(event) && (
                            <a
                              href={getEventUrl(event)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                              title="Open in calendar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            {!analytics ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No analytics data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alert Items */}
                <div className="space-y-3">
                  {/* Double Bookings */}
                  {analytics.doubleBookings && analytics.doubleBookings.length > 0 && (
                    <button
                      onClick={() => onActionClick('double-booking')}
                      className="w-full p-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <h4 className="font-medium text-red-900">Double Bookings</h4>
                            <p className="text-sm text-red-700">{analytics.doubleBookings.length} conflict{analytics.doubleBookings.length !== 1 ? 's' : ''} detected</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* Back-to-Back Meetings */}
                  {analytics.backToBackCount > 0 && (
                    <button
                      onClick={() => onActionClick('back-to-back')}
                      className="w-full p-4 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🏃</span>
                          <div>
                            <h4 className="font-medium text-orange-900">Back-to-Back Meetings</h4>
                            <p className="text-sm text-orange-700">{analytics.backToBackCount} meeting{analytics.backToBackCount !== 1 ? 's' : ''} with no break</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* Insufficient Buffers */}
                  {analytics.insufficientBufferCount > 0 && (
                    <button
                      onClick={() => onActionClick('insufficient-buffer')}
                      className="w-full p-4 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⏱️</span>
                          <div>
                            <h4 className="font-medium text-yellow-900">Insufficient Buffers</h4>
                            <p className="text-sm text-yellow-700">{analytics.insufficientBufferCount} meeting{analytics.insufficientBufferCount !== 1 ? 's' : ''} need more buffer time</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* Missing Video Links */}
                  {analytics.missingVideoLinkCount > 0 && (
                    <button
                      onClick={() => onActionClick('missing-video')}
                      className="w-full p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📹</span>
                          <div>
                            <h4 className="font-medium text-blue-900">Missing Video Links</h4>
                            <p className="text-sm text-blue-700">{analytics.missingVideoLinkCount} meeting{analytics.missingVideoLinkCount !== 1 ? 's' : ''} without conference links</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* Flights without Travel Blocks */}
                  {analytics.flightsWithoutTravelBlocks && analytics.flightsWithoutTravelBlocks.length > 0 && (
                    <button
                      onClick={() => onActionClick('flights-travel-blocks')}
                      className="w-full p-4 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✈️</span>
                          <div>
                            <h4 className="font-medium text-purple-900">Flights Missing Travel Time</h4>
                            <p className="text-sm text-purple-700">{analytics.flightsWithoutTravelBlocks.length} flight{analytics.flightsWithoutTravelBlocks.length !== 1 ? 's' : ''} need travel blocks</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )}

                  {/* All Clear */}
                  {analytics.backToBackCount === 0 &&
                   analytics.doubleBookingCount === 0 &&
                   analytics.insufficientBufferCount === 0 &&
                   analytics.missingVideoLinkCount === 0 && (
                    <div className="p-4 rounded-lg border border-green-200 bg-green-50 text-center">
                      <span className="text-4xl block mb-2">🎉</span>
                      <h4 className="font-medium text-green-900">All Clear!</h4>
                      <p className="text-sm text-green-700">Your calendar looks healthy</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTabs;
