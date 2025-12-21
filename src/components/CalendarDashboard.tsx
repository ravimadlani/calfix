/**
 * CalendarDashboard Component
 * Main dashboard that orchestrates all calendar features
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ViewSelector from './ViewSelector';
import DayFilterPills from './DayFilterPills';
import ActionWorkflowModal from './ActionWorkflowModal';
import UpgradeModal from './UpgradeModal';
import DashboardSkeleton from './DashboardSkeleton';
import HealthScoreHero from './HealthScoreHero';
import AgentChatWidget from './AgentChatWidget';
import DashboardTabs from './DashboardTabs';
import { PageHeader, CalendarSelectorCard, useSelectedCalendarId } from './shared';

import { getTodayRange, getTomorrowRange, getThisWeekRange, getNextWeekRange, getThisMonthRange, getNextMonthRange } from '../utils/dateHelpers';
import { calculateAnalytics, getEventsWithGaps } from '../services/calendarAnalytics';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import type { CalendarEvent, CalendarProviderId, IntentActionHandlers } from '../types';
// Use secure versions of the services
import secureActivityLogger, { logUserAction } from '../services/activityLoggerSecure';
import secureHealthScoreTracker from '../services/healthScoreTrackerSecure';

// Helper to map view names to TimeHorizon type
const getTimeHorizon = (view: string): 'today' | 'tomorrow' | 'week' | 'next_week' | 'month' | 'next_month' => {
  const map: Record<string, 'today' | 'tomorrow' | 'week' | 'next_week' | 'month' | 'next_month'> = {
    'today': 'today',
    'tomorrow': 'tomorrow',
    'week': 'week',
    'nextWeek': 'next_week',
    'thisMonth': 'month',
    'nextMonth': 'next_month'
  };
  return map[view] || 'today';
};

// Helper to get date range for current view
const getDateRange = (view: string): { startDate: Date, endDate: Date } => {
  let range;
  switch (view) {
    case 'today':
      range = getTodayRange();
      break;
    case 'tomorrow':
      range = getTomorrowRange();
      break;
    case 'week':
      range = getThisWeekRange();
      break;
    case 'nextWeek':
      range = getNextWeekRange();
      break;
    case 'thisMonth':
      range = getThisMonthRange();
      break;
    case 'nextMonth':
      range = getNextMonthRange();
      break;
    default:
      range = getTodayRange();
  }

  // Convert timeMin/timeMax to Date objects
  return {
    startDate: new Date(range.timeMin),
    endDate: new Date(range.timeMax)
  };
};

const CalendarDashboard = () => {
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const {
    activeProvider,
    activeProviderId,
    setActiveProvider,
    isAuthenticated: isProviderAuthenticated
  } = useCalendarProvider();

  // Feature flag: Enable chatbot only with URL parameter ?chatbot=true
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsChatbotEnabled(urlParams.get('chatbot') === 'true');
  }, []);

  const calendarApi = activeProvider.calendar;
  const helperApi = activeProvider.helpers;
  const providerCapabilities = activeProvider.capabilities;

  const {
    fetchEvents: fetchProviderEvents,
    createEvent: createProviderEvent,
    deleteEvent: deleteProviderEvent,
    addConferenceLink: providerAddConferenceLink
  } = calendarApi;

  const {
    addBufferAfter: providerAddBufferAfter,
    batchAddBuffers: providerBatchAddBuffers,
    deletePlaceholderAndLog: providerDeletePlaceholderAndLog,
    createFocusBlock: providerCreateFocusBlock,
    createTravelBlock: providerCreateTravelBlock,
    createLocationEvent: providerCreateLocationEvent,
    batchAddConferenceLinks: providerBatchAddConferenceLinks
  } = helperApi;
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentView, setCurrentView] = useState('today');
  const [events, setEvents] = useState([]);
  const [eventsWithGaps, setEventsWithGaps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setActionLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // For filtering by day in week views
  const [extendedEventsForFlights, setExtendedEventsForFlights] = useState([]); // Extended events for flight analysis
  const [currentTimeRange, setCurrentTimeRange] = useState(null);
  const [workflowModal, setWorkflowModal] = useState({ isOpen: false, actionType: null });
  // Use the hook to get the currently selected calendar ID from CalendarSelectorCard
  const managedCalendarId = useSelectedCalendarId();
  const [loggingInitialized, setLoggingInitialized] = useState(false);
  const [healthScoreResult, setHealthScoreResult] = useState(null);
  const [isCalculatingHealthScore, setIsCalculatingHealthScore] = useState(true);

  const primaryClerkEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    null;

  const calendarOwnerEmail = useMemo(() => {
    // If managedCalendarId looks like an email, use it
    const candidateId = typeof managedCalendarId === 'string'
      ? managedCalendarId.toLowerCase()
      : null;

    const candidateLooksService = candidateId ? candidateId.includes('calendar.google.com') : false;

    if (candidateId && candidateId.includes('@') && !candidateLooksService) {
      return candidateId;
    }

    // Fall back to user's primary email
    if (primaryClerkEmail) {
      return primaryClerkEmail.toLowerCase();
    }

    return null;
  }, [managedCalendarId, primaryClerkEmail]);

  const requireHelper = <T extends (...args: unknown[]) => unknown>(helper: T | undefined, message: string): T | null => {
    if (!helper) {
      alert(message);
      return null;
    }

    return helper;
  };

  type ActionOptions = {
    skipNotification?: boolean;
    skipRefresh?: boolean;
  };

  type FlightEvent = CalendarEvent & {
    arrivalDate?: Date;
    departureDate?: Date;
    needsTravelBlockBefore?: boolean;
    needsTravelBlockAfter?: boolean;
    fromData?: {
      city: string;
      country: string;
      timezone: string;
      flag: string;
    };
    toData?: {
      city: string;
      country: string;
      timezone: string;
      flag: string;
    };
    isReturningHome?: boolean;
  };

  // Fetch events based on current view
  const loadEvents = useCallback(async (calendarIdOverride: string | null = null) => {
    setLoading(true);
    setError(null);

    // Use the override if provided, otherwise use state
    const calendarToUse = calendarIdOverride || managedCalendarId;

    // Debug logging to catch the object issue
    console.log('[loadEvents] calendarIdOverride:', calendarIdOverride);
    console.log('[loadEvents] managedCalendarId:', managedCalendarId);
    console.log('[loadEvents] calendarToUse:', calendarToUse);
    console.log('[loadEvents] typeof calendarToUse:', typeof calendarToUse);

    // Ensure we're using a string, not an object
    const calendarIdString = calendarToUse ?? 'primary';

    try {
      let timeRange;

      switch (currentView) {
        case 'today':
          timeRange = getTodayRange();
          break;
        case 'tomorrow':
          timeRange = getTomorrowRange();
          break;
        case 'week':
          timeRange = getThisWeekRange();
          break;
        case 'nextWeek':
          timeRange = getNextWeekRange();
          break;
        case 'thisMonth':
          timeRange = getThisMonthRange();
          break;
        case 'nextMonth':
          timeRange = getNextMonthRange();
          break;
        default:
          timeRange = getTodayRange();
      }

      setCurrentTimeRange(timeRange);

      console.log('=== FETCHING EVENTS ===');
      console.log('View:', currentView);
      console.log('Time range:', timeRange);
      console.log('Calendar:', calendarIdString);

      const fetchedEvents = await fetchProviderEvents({
        timeMin: timeRange.timeMin,
        timeMax: timeRange.timeMax,
        maxResults: 2500,
        calendarId: calendarIdString
      });

      console.log('Fetched events count (before filtering):', fetchedEvents.length);

      // Filter events to only include those within the requested time range
      // Google Calendar API sometimes returns events outside the range
      // Include multi-day events that overlap with the range
      const timeMinDate = new Date(timeRange.timeMin);
      const timeMaxDate = new Date(timeRange.timeMax);

      const filteredEvents = fetchedEvents.filter(event => {
        let eventStart, eventEnd;

        if (event.start?.dateTime) {
          eventStart = new Date(event.start.dateTime);
        } else if (event.start?.date) {
          // Parse all-day events correctly
          const [year, month, day] = event.start.date.split('-').map(Number);
          eventStart = new Date(year, month - 1, day);
        } else {
          return false;
        }

        if (event.end?.dateTime) {
          eventEnd = new Date(event.end.dateTime);
        } else if (event.end?.date) {
          // Parse all-day events correctly
          const [year, month, day] = event.end.date.split('-').map(Number);
          eventEnd = new Date(year, month - 1, day);
        } else {
          eventEnd = eventStart; // Single point in time
        }

        // Check if event overlaps with the requested range
        // Event overlaps if: (event starts before range ends) AND (event ends after range starts)
        return eventStart <= timeMaxDate && eventEnd >= timeMinDate;
      });

      console.log('Filtered events count (after filtering):', filteredEvents.length);
      console.log('Event dates:', filteredEvents.map(e => {
        const start = e.start?.dateTime || e.start?.date;
        return { summary: e.summary, start };
      }));
      console.log('=======================');

      setEvents(filteredEvents);

      // For flight analysis, we need to look a bit before/after the current view
      // to find connecting flights and return flights (typically within 2 weeks)
      const extendedStart = new Date(timeMinDate);
      extendedStart.setDate(extendedStart.getDate() - 7); // Look 7 days before view
      const extendedEnd = new Date(timeMaxDate);
      extendedEnd.setDate(extendedEnd.getDate() + 14); // Look 14 days after view

      const extendedEvents = await fetchProviderEvents({
        timeMin: extendedStart.toISOString(),
        timeMax: extendedEnd.toISOString(),
        maxResults: 2500,
        calendarId: calendarIdString
      });

      console.log('Extended events for flight analysis:', extendedEvents.length);

      // Store extended events for use when filtering by day
      setExtendedEventsForFlights(extendedEvents);

      // Calculate analytics using filtered events for the view,
      // but use extended events for international flight detection
      const analyticsData = calculateAnalytics(filteredEvents, extendedEvents, calendarOwnerEmail);
      setAnalytics(analyticsData);

      // Log analytics view based on current view
      const viewActionMap = {
        'today': 'analytics_view_today',
        'tomorrow': 'analytics_view_tomorrow',
        'week': 'analytics_view_week',
        'nextWeek': 'analytics_view_next_week',
        'thisMonth': 'analytics_view_month',
        'nextMonth': 'analytics_view_next_month'
      };

      const actionName = viewActionMap[currentView] || 'analytics_view_today';
      logUserAction(actionName, {
        calendarId: calendarIdString,
        timeHorizon: getTimeHorizon(currentView),
        metadata: {
          eventCount: filteredEvents.length
        }
      });

      // Get events with gap information using filtered events
      const eventsWithGapData = getEventsWithGaps(filteredEvents);

      // Merge out-of-hours data into events
      const outOfHoursMap = new Map(
        analyticsData.meetingsOutsideBusinessHours.map(e => [e.id, e])
      );
      const eventsWithAllData = eventsWithGapData.map(event => {
        const outOfHoursData = outOfHoursMap.get(event.id);
        return {
          ...event,
          outOfHoursInTimezone: outOfHoursData?.outOfHoursInTimezone || null,
          locationCity: outOfHoursData?.locationCity || null,
          locationCountry: outOfHoursData?.locationCountry || null,
          locationFlag: outOfHoursData?.locationFlag || null,
          foreignLocalHour: outOfHoursData?.foreignLocalHour || null,
          homeLocalHour: outOfHoursData?.homeLocalHour || null,
          isWithinHoursAtHome: outOfHoursData?.isWithinHoursAtHome || null
        };
      });

      setEventsWithGaps(eventsWithAllData);

    } catch (err) {
      console.error('Error loading events:', err);

      // Check for permission-specific errors
      if (err.message && (err.message.includes('Permission denied') || err.message.includes('Not Found') || err.message.includes('No access'))) {
        setError(`Cannot access calendar "${calendarIdString}".\n\nPlease check:\n• The email address is correct\n• You have delegate access to this calendar\n• The calendar owner has granted "Make changes to events" permission`);
      } else {
        setError(err.message || 'Failed to load calendar events');
      }
    } finally {
      setLoading(false);
    }
  }, [calendarOwnerEmail, currentView, fetchProviderEvents, managedCalendarId]);

  // Check active provider authentication on mount and after OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const providerParam = urlParams.get('provider') as CalendarProviderId | null;
    const targetProviderId = providerParam || activeProviderId;

    if (providerParam && providerParam !== activeProviderId) {
      setActiveProvider(providerParam);
    }

    if (oauthSuccess || oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (oauthError) {
      console.error('[CalendarDashboard] OAuth failed:', oauthError);
      setIsCalendarConnected(false);
      setCheckingAuth(false);
      alert(`Failed to connect calendar: ${oauthError}`);
      return;
    }

    if (oauthSuccess) {
      console.log('[CalendarDashboard] OAuth successful');

      // Log the successful OAuth connection
      logUserAction('oauth_calendar_connected', {
        metadata: {
          provider: targetProviderId,
          success: true
        }
      });
    }

    const authenticated = isProviderAuthenticated(targetProviderId);
    console.info('[CalendarDashboard] Provider auth state', {
      targetProviderId,
      authenticated
    });
    setIsCalendarConnected(authenticated);
    setCheckingAuth(false);
  }, [activeProviderId, isProviderAuthenticated, setActiveProvider]);

  // Initialize logging services when user is authenticated
  useEffect(() => {
    const initializeLogging = async () => {
      if (clerkUser?.id && !loggingInitialized) {
        try {
          console.log('[CalendarDashboard] Initializing secure activity logging services...');

          // Create a function that gets the token
          const tokenGetter = async () => {
            try {
              return await getToken();
            } catch (error) {
              console.error('Failed to get Clerk token:', error);
              return null;
            }
          };

          // Initialize both secure services with user ID and token getter
          await secureActivityLogger.initialize(
            clerkUser.id,
            tokenGetter
          );

          await secureHealthScoreTracker.initialize(
            clerkUser.id,
            tokenGetter
          );

          setLoggingInitialized(true);
          console.log('[CalendarDashboard] Secure activity logging services initialized successfully');
        } catch (error) {
          console.error('[CalendarDashboard] Failed to initialize logging services:', error);
          // Don't fail the whole app if logging fails
        }
      }
    };

    initializeLogging();
  // Note: getToken is intentionally excluded from deps - it's stable from Clerk but causes infinite loops if included
  }, [clerkUser?.id, loggingInitialized]);

  // Load events when view or calendar changes
  useEffect(() => {
    if (isCalendarConnected) {
      console.info('[CalendarDashboard] Loading events', { currentView, managedCalendarId });
      setEvents([]);
      setEventsWithGaps([]);
      loadEvents();
      setSelectedDay(null);
    }
  }, [currentView, isCalendarConnected, loadEvents, managedCalendarId]);

  // Calculate and save health score when both services are initialized and analytics are available
  useEffect(() => {
    const calculateAndSaveHealthScore = async () => {
      console.log('[CalendarDashboard] Health score useEffect - checking conditions:', {
        loggingInitialized,
        hasTracker: !!secureHealthScoreTracker,
        hasAnalytics: !!analytics
      });

      if (loggingInitialized && secureHealthScoreTracker && analytics) {
        console.log('[CalendarDashboard] All conditions met - calculating health score...');
        setIsCalculatingHealthScore(true);
        try {
          const { startDate, endDate } = getDateRange(currentView);
          const calendarId = managedCalendarId || 'primary';
          console.log('[CalendarDashboard] Health score params:', {
            calendarId,
            timeHorizon: getTimeHorizon(currentView),
            startDate,
            endDate
          });

          const healthScore = await secureHealthScoreTracker.calculateHealthScore(
            analytics,
            calendarId,
            getTimeHorizon(currentView),
            startDate,
            endDate
          );
          console.log('[CalendarDashboard] Health score successfully calculated and saved:', healthScore);
          setHealthScoreResult(healthScore);
        } catch (error) {
          console.error('[CalendarDashboard] Failed to calculate health score:', error);
        } finally {
          setIsCalculatingHealthScore(false);
        }
      }
    };

    calculateAndSaveHealthScore();
  }, [loggingInitialized, analytics, currentView, managedCalendarId]);

  // Memoized filtered events and analytics for display
  const filteredEvents = useMemo(() => {
    if (!selectedDay || (currentView !== 'week' && currentView !== 'nextWeek' && currentView !== 'thisMonth' && currentView !== 'nextMonth')) {
      return eventsWithGaps;
    }

    // Check if this is a week selection (format: "week-N")
    const isWeekSelection = selectedDay.startsWith('week-');

    if (isWeekSelection && currentTimeRange) {
      // Parse week number and calculate week boundaries
      const weekNumber = parseInt(selectedDay.replace('week-', ''), 10);
      const rangeStart = new Date(currentTimeRange.timeMin);

      // Get the start of the first week in the range
      const day = rangeStart.getDay();
      const firstWeekStart = new Date(rangeStart);
      firstWeekStart.setDate(firstWeekStart.getDate() - day);
      firstWeekStart.setHours(0, 0, 0, 0);

      // Calculate this week's start and end
      const weekStart = new Date(firstWeekStart);
      weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return eventsWithGaps.filter(event => {
        let startTime;
        if (event.start?.dateTime) {
          startTime = new Date(event.start.dateTime);
        } else if (event.start?.date) {
          const [year, month, eventDay] = event.start.date.split('-').map(Number);
          startTime = new Date(year, month - 1, eventDay);
        } else {
          return false;
        }

        return startTime >= weekStart && startTime <= weekEnd;
      });
    }

    // Day selection (format: "YYYY-MM-DD")
    return eventsWithGaps.filter(event => {
      let startTime;
      if (event.start?.dateTime) {
        startTime = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        const [year, month, day] = event.start.date.split('-').map(Number);
        startTime = new Date(year, month - 1, day);
      } else {
        return false;
      }

      const dateKey = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`;
      return dateKey === selectedDay;
    });
  }, [selectedDay, currentView, eventsWithGaps, currentTimeRange]);

  const displayAnalytics = useMemo(() => {
    return selectedDay && (currentView === 'week' || currentView === 'nextWeek' || currentView === 'thisMonth' || currentView === 'nextMonth')
      ? calculateAnalytics(
          filteredEvents,
          extendedEventsForFlights.length > 0 ? extendedEventsForFlights : null,
          calendarOwnerEmail
        )
      : analytics;
  }, [selectedDay, currentView, filteredEvents, extendedEventsForFlights, calendarOwnerEmail, analytics]);

  const assistantActions = useMemo<IntentActionHandlers>(() => ({
    applyBuffers: async ({ position, events: targetEvents, bufferMinutes = 15 }) => {
      if (!targetEvents || targetEvents.length === 0) {
        return { appliedCount: 0 };
      }

      if (!providerBatchAddBuffers) {
        throw new Error('Bulk buffer creation is not supported for this calendar provider yet.');
      }

      setActionLoading(true);
      try {
        await providerBatchAddBuffers(targetEvents, position, bufferMinutes);
        logUserAction('assistant_apply_buffers', {
          calendarId: managedCalendarId,
          timeHorizon: getTimeHorizon(currentView),
          metadata: {
            position,
            bufferMinutes,
            eventCount: targetEvents.length
          }
        });
        await loadEvents();
        return { appliedCount: targetEvents.length };
      } finally {
        setActionLoading(false);
      }
    },
    createFocusBlock: async slot => {
      if (!providerCreateFocusBlock) {
        throw new Error('Focus block creation is not supported for this calendar provider yet.');
      }

      const start = new Date(slot.start);
      if (Number.isNaN(start.getTime())) {
        throw new Error('Could not parse the focus block time.');
      }

      const durationMinutes = slot.durationMinutes ?? 120;

      setActionLoading(true);
      try {
        await providerCreateFocusBlock(start, durationMinutes, '🎯 Focus Time');
        logUserAction('assistant_create_focus_block', {
          calendarId: managedCalendarId,
          timeHorizon: getTimeHorizon(currentView),
          metadata: {
            start: start.toISOString(),
            durationMinutes
          }
        });
        await loadEvents();
      } finally {
        setActionLoading(false);
      }
    }
  }), [
    currentView,
    loadEvents,
    managedCalendarId,
    providerBatchAddBuffers,
    providerCreateFocusBlock
  ]);

  // Handle adding buffer after event
  const handleAddBufferAfter = async (event: CalendarEvent, options: ActionOptions = {}) => {
    if (!options.skipNotification && !window.confirm('Add a 15-minute buffer after this event?')) {
      return;
    }

    const helper = requireHelper(
      providerAddBufferAfter,
      'Buffer creation is not supported for this calendar provider yet.'
    );

    if (!helper) {
      return;
    }

    setActionLoading(true);
    try {
      await helper(event);

      // Log the action
      logUserAction('quick_action_add_wrap', {
        calendarId: managedCalendarId,
        eventId: event.id,
        timeHorizon: getTimeHorizon(currentView)
      });

      if (!options.skipRefresh) {
        await loadEvents();
      }

      if (!options.skipNotification) {
        alert('Buffer added successfully!');
      }
    } catch (err) {
      if (!options.skipNotification) {
        const message = err instanceof Error ? err.message : String(err);
        alert(`Failed to add buffer: ${message}`);
      }
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Handle responding to an event (accept/decline)
  const handleRespondToEvent = async (
    eventId: string,
    response: 'accepted' | 'declined' | 'tentative',
    targetCalendarId?: string
  ) => {
    if (!calendarApi.respondToEvent) {
      alert('Responding to events is not supported for this calendar provider yet.');
      return;
    }

    try {
      await calendarApi.respondToEvent(
        eventId,
        response,
        targetCalendarId || managedCalendarId
      );

      // Log the action
      logUserAction('event_response', {
        calendarId: targetCalendarId || managedCalendarId,
        eventId,
        timeHorizon: getTimeHorizon(currentView),
        metadata: { response }
      });

      // Refresh events to show updated status
      await loadEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to respond to event: ${message}`);
      throw err;
    }
  };

  // Open workflow modal
  const handleOpenWorkflow = (actionType) => {
    setWorkflowModal({ isOpen: true, actionType });
  };

  // Close workflow modal
  const handleCloseWorkflow = () => {
    setWorkflowModal({ isOpen: false, actionType: null });
  };

  // Execute workflow action
  const handleExecuteWorkflow = async (actionType: string, selectedEventIds: string[]) => {
    // For flights and international flights, get events from analytics to preserve properties
    const selectedEvents: CalendarEvent[] = actionType === 'flights-travel-blocks' && displayAnalytics?.flightsWithoutTravelBlocks
      ? displayAnalytics.flightsWithoutTravelBlocks.filter(e => selectedEventIds.includes(e.id))
      : actionType === 'international-flights-location' && displayAnalytics?.internationalFlightsWithoutLocation
      ? displayAnalytics.internationalFlightsWithoutLocation.filter(e => selectedEventIds.includes(e.id))
      : actionType === 'out-of-hours-foreign' && displayAnalytics?.meetingsOutsideBusinessHours
      ? displayAnalytics.meetingsOutsideBusinessHours.filter(e => selectedEventIds.includes(e.id))
      : eventsWithGaps.filter(e => selectedEventIds.includes(e.id));

    switch (actionType) {
      case 'back-to-back':
      case 'insufficient-buffer':
        // Add buffers after selected events
        {
          const bufferHelper = requireHelper(
            providerBatchAddBuffers,
            'Bulk buffer creation is not supported for this calendar provider yet.'
          );

          if (!bufferHelper) {
            break;
          }

          await bufferHelper(selectedEvents, 'after');

          // Log the batch action
          logUserAction('workflow_batch_add_buffers', {
            calendarId: managedCalendarId,
            timeHorizon: getTimeHorizon(currentView),
            metadata: {
              actionType,
              eventCount: selectedEvents.length
            }
          });
        }
        break;

      case 'international-flights-location': {
        // Add location tracking events for international flights
        let locationSuccessCount = 0;
        let locationFailCount = 0;

        const locationHelper = requireHelper(
          providerCreateLocationEvent,
          'Location tracking events are not supported for this calendar provider yet.'
        );

        if (!locationHelper) {
          break;
        }

        const flightEvents = selectedEvents as FlightEvent[];

        for (const event of flightEvents) {
          try {
            // For return flights home, track where we came FROM
            // For outbound flights, track where we're going TO
            const locationData = event.isReturningHome ? event.fromData : event.toData;

            if (!locationData) {
              throw new Error('Missing location metadata for flight');
            }

            await locationHelper(
              event.arrivalDate ?? new Date(event.start.dateTime || event.start.date),
              event.departureDate ?? new Date(event.end.dateTime || event.end.date),
              locationData.city,
              locationData.country,
              locationData.timezone,
              locationData.flag
            );
            locationSuccessCount++;
          } catch (error) {
            console.error(`Failed to add location for ${event.summary}:`, error);
            locationFailCount++;
          }
        }

        if (locationFailCount === 0) {
          alert(`Successfully added ${locationSuccessCount} location event${locationSuccessCount !== 1 ? 's' : ''}!`);
        } else {
          alert(`Added ${locationSuccessCount} location event${locationSuccessCount !== 1 ? 's' : ''}. ${locationFailCount} failed.`);
        }

        // Log the location tracking action
        logUserAction('workflow_add_flight_locations', {
          calendarId: managedCalendarId,
          timeHorizon: getTimeHorizon(currentView),
          metadata: {
            successCount: locationSuccessCount,
            failCount: locationFailCount,
            totalFlights: selectedEvents.length
          }
        });
        break;
      }

      case 'flights-travel-blocks': {
        // Add travel blocks before/after selected flights
        let travelBlockSuccessCount = 0;
        let travelBlockFailCount = 0;

        const travelHelper = requireHelper(
          providerCreateTravelBlock,
          'Travel buffer events are not supported for this calendar provider yet.'
        );

        if (!travelHelper) {
          break;
        }

        console.log('=== ADDING TRAVEL BLOCKS ===');
        console.log('Selected events:', selectedEvents);

        const flightEvents = selectedEvents as FlightEvent[];

        for (const event of flightEvents) {
          console.log(`Processing flight: "${event.summary}"`);
          console.log('needsTravelBlockBefore:', event.needsTravelBlockBefore);
          console.log('needsTravelBlockAfter:', event.needsTravelBlockAfter);

          const flightStart = new Date(event.start?.dateTime || event.start?.date);
          const flightEnd = new Date(event.end?.dateTime || event.end?.date);

          try {
            if (event.needsTravelBlockBefore) {
              const travelStartBefore = new Date(flightStart);
              travelStartBefore.setMinutes(travelStartBefore.getMinutes() - 90);
              console.log('Creating travel block before flight:', travelStartBefore);
              await travelHelper(travelStartBefore, 90, '🚗 Travel to Airport');
              travelBlockSuccessCount++;
            }

            if (event.needsTravelBlockAfter) {
              console.log('Creating travel block after flight:', flightEnd);
              await travelHelper(flightEnd, 90, '🚗 Travel from Airport');
              travelBlockSuccessCount++;
            }
          } catch (error) {
            console.error(`Failed to add travel blocks for ${event.summary}:`, error);
            travelBlockFailCount++;
          }
        }

        console.log('Total travel blocks added:', travelBlockSuccessCount);
        console.log('===========================');

        if (travelBlockFailCount === 0) {
          alert(`Successfully added ${travelBlockSuccessCount} travel block${travelBlockSuccessCount !== 1 ? 's' : ''}!`);
        } else {
          alert(`Added ${travelBlockSuccessCount} travel block${travelBlockSuccessCount !== 1 ? 's' : ''}. ${travelBlockFailCount} failed.`);
        }

        // Log the travel block action
        logUserAction('workflow_add_travel_blocks', {
          calendarId: managedCalendarId,
          timeHorizon: getTimeHorizon(currentView),
          metadata: {
            successCount: travelBlockSuccessCount,
            failCount: travelBlockFailCount,
            totalFlights: selectedEvents.length
          }
        });
        break;
      }

      case 'declined-meetings': {
        // Delete selected meetings that have been declined
        let deleteSuccessCount = 0;
        let deleteFailCount = 0;

        for (const event of selectedEvents) {
          try {
            await deleteProviderEvent(event.id, event.calendarId || managedCalendarId);
            deleteSuccessCount++;
          } catch (error) {
            console.error(`Failed to delete event ${event.summary}:`, error);
            deleteFailCount++;
          }
        }

        if (deleteFailCount === 0) {
          alert(`Successfully deleted ${deleteSuccessCount} meeting${deleteSuccessCount !== 1 ? 's' : ''}!`);
        } else {
          alert(`Deleted ${deleteSuccessCount} meeting${deleteSuccessCount !== 1 ? 's' : ''}. ${deleteFailCount} failed.`);
        }

        // Log the declined meeting cleanup
        logUserAction('workflow_delete_declined_meetings', {
          calendarId: managedCalendarId,
          timeHorizon: getTimeHorizon(currentView),
          metadata: {
            successCount: deleteSuccessCount,
            failCount: deleteFailCount,
            totalMeetings: selectedEvents.length
          }
        });
        break;
      }

      case 'out-of-hours-foreign': {
        // Delete selected out-of-hours meetings (decline and delete)
        let outOfHoursDeleteSuccessCount = 0;
        let outOfHoursDeleteFailCount = 0;

        for (const event of selectedEvents) {
          try {
            await deleteProviderEvent(event.id, managedCalendarId);
            outOfHoursDeleteSuccessCount++;
          } catch (error) {
            console.error(`Failed to delete event ${event.summary}:`, error);
            outOfHoursDeleteFailCount++;
          }
        }

        if (outOfHoursDeleteFailCount === 0) {
          alert(`Successfully declined and deleted ${outOfHoursDeleteSuccessCount} out-of-hours meeting${outOfHoursDeleteSuccessCount !== 1 ? 's' : ''}!`);
        } else {
          alert(`Declined and deleted ${outOfHoursDeleteSuccessCount} meeting${outOfHoursDeleteSuccessCount !== 1 ? 's' : ''}. ${outOfHoursDeleteFailCount} failed.`);
        }

        // Log the out-of-hours meeting deletion
        logUserAction('workflow_delete_out_of_hours_meetings', {
          calendarId: managedCalendarId,
          timeHorizon: getTimeHorizon(currentView),
          metadata: {
            successCount: outOfHoursDeleteSuccessCount,
            failCount: outOfHoursDeleteFailCount,
            totalMeetings: selectedEvents.length
          }
        });
        break;
      }

      case 'missing-video': {
        // Add Google Meet links to selected events
        if (selectedEventIds.length === 0) {
          throw new Error('No events selected');
        }

        // Get the full event objects for selected IDs
        const eventsToUpdate = events.filter(e => selectedEventIds.includes(e.id));

        if (eventsToUpdate.length === 0) {
          throw new Error('Selected events not found');
        }

        if (!providerCapabilities.supportsConferenceLinks) {
          alert('Conference link automation is not supported for this calendar provider yet.');
          break;
        }

        let videoLinkSuccessCount = 0;
        let videoLinkFailCount = 0;

        if (providerBatchAddConferenceLinks) {
          const meetResults = await providerBatchAddConferenceLinks(eventsToUpdate, managedCalendarId);
          videoLinkSuccessCount = meetResults.successCount;
          videoLinkFailCount = meetResults.failCount;

          if (meetResults.failCount === 0) {
            alert(`Successfully added video links to ${meetResults.successCount} meeting${meetResults.successCount !== 1 ? 's' : ''}!`);
          } else {
            alert(`Added video links to ${meetResults.successCount} meeting${meetResults.successCount !== 1 ? 's' : ''}. ${meetResults.failCount} failed.`);
          }
        } else if (providerAddConferenceLink) {
          for (const event of eventsToUpdate) {
            try {
              await providerAddConferenceLink(event.id, event, managedCalendarId);
              videoLinkSuccessCount++;
            } catch (error) {
              console.error('Failed to add conference link:', error);
              videoLinkFailCount++;
            }
          }

          if (videoLinkFailCount === 0) {
            alert(`Successfully added video links to ${videoLinkSuccessCount} meeting${videoLinkSuccessCount !== 1 ? 's' : ''}!`);
          } else {
            alert(`Added video links to ${videoLinkSuccessCount} meeting${videoLinkSuccessCount !== 1 ? 's' : ''}. ${videoLinkFailCount} failed.`);
          }
        } else {
          alert('Conference link automation is not supported for this calendar provider yet.');
        }

        // Log the video link addition
        if (videoLinkSuccessCount > 0 || videoLinkFailCount > 0) {
          logUserAction('workflow_add_video_links', {
            calendarId: managedCalendarId,
            timeHorizon: getTimeHorizon(currentView),
            metadata: {
              successCount: videoLinkSuccessCount,
              failCount: videoLinkFailCount,
              totalMeetings: eventsToUpdate.length
            }
          });
        }
        break;
      }

      case 'double-booking':
        // For double bookings, show rescheduling options
        alert('Rescheduling feature - coming soon! This will help you resolve conflicts.');
        throw new Error('Not yet implemented');

      case 'delete-single-event':
        // Delete a single event (used for double booking resolution)
        if (selectedEventIds.length === 0) {
          throw new Error('No event selected');
        }

        try {
          await deleteProviderEvent(selectedEventIds[0], managedCalendarId);
          alert('Event declined and deleted successfully!');

          // Log the single event deletion (double booking resolution)
          logUserAction('workflow_resolve_double_booking', {
            calendarId: managedCalendarId,
            eventId: selectedEventIds[0],
            timeHorizon: getTimeHorizon(currentView),
            metadata: {
              action: 'delete_conflicting_event'
            }
          });
        } catch (error) {
          console.error('Failed to delete event:', error);
          throw new Error(`Failed to delete event: ${error.message}`);
        }
        break;

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // Refresh events after action
    await loadEvents();
  };

  // Delete placeholder and log to AI-Removed Events
  const handleDeletePlaceholder = async (placeholderEvent: CalendarEvent, options: ActionOptions = {}) => {
    const helper = requireHelper(
      providerDeletePlaceholderAndLog,
      'Placeholder cleanup is not supported for this calendar provider yet.'
    );

    if (!helper) {
      return;
    }

    await helper(placeholderEvent);

    // Log the action
    logUserAction('calendar_event_delete', {
      calendarId: managedCalendarId,
      eventId: placeholderEvent.id,
      timeHorizon: getTimeHorizon(currentView),
      metadata: {
        eventType: 'placeholder',
        eventTitle: placeholderEvent.summary
      }
    });

    // Only refresh if not in bulk mode (bulk mode will refresh once at the end)
    if (!options.skipRefresh) {
      await loadEvents();
    }

    // Only show notification if not in bulk mode
    if (!options.skipNotification) {
      alert(`"${placeholderEvent.summary}" has been deleted and logged to AI-Removed Events.`);
    }
  };

  // Show skeleton while checking authentication or calendar not yet connected
  // OnboardingGuard handles the redirect to onboarding if needed
  // We just show skeleton until the calendar provider state is ready
  if (checkingAuth || !isCalendarConnected) {
    return <DashboardSkeleton />;
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-3" role="img" aria-label="Error">
            ⚠️
          </span>
          <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Calendar</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => loadEvents()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header - sticky variant for consistency */}
      <PageHeader
        title="Dashboard"
        description="Manage your calendar and view your upcoming events"
        variant="sticky"
      />

      {/* Calendar Management Section - Self-contained component that handles its own data fetching */}
      <CalendarSelectorCard
        showProviderSwitcher={true}
        showActionButtons={true}
        showResetButton={true}
        onUpgrade={() => setShowUpgradeModal(true)}
      />

      {/* Header with View Selector and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
          <Link
            to="/schedule"
            onClick={() => {
              // Log navigating to schedule page
              logUserAction('schedule_page_opened', {
                calendarId: managedCalendarId,
                timeHorizon: getTimeHorizon(currentView)
              });
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span>👥</span>
            Schedule Meeting
          </Link>
        </div>
      </div>

      {/* Day Filter Pills for Week and Month Views */}
      {(currentView === 'week' || currentView === 'nextWeek' || currentView === 'thisMonth' || currentView === 'nextMonth') && currentTimeRange && (
        <DayFilterPills
          events={events}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
          viewType={currentView}
          timeRange={currentTimeRange}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier="basic"
      />

      {/* Health Score Hero (replaces stats grid) */}
      {displayAnalytics && (
        <HealthScoreHero
          analytics={displayAnalytics}
          healthScoreResult={healthScoreResult}
          isCalculating={isCalculatingHealthScore}
        />
      )}

      {/* New Dashboard Tabs - Calendar Inbox & Alerts */}
      <DashboardTabs
        events={filteredEvents}
        analytics={displayAnalytics}
        calendarOwnerEmail={calendarOwnerEmail}
        calendarId={managedCalendarId}
        onActionClick={handleOpenWorkflow}
        onRespondToEvent={handleRespondToEvent}
      />

      {/* Action Workflow Modal */}
      <ActionWorkflowModal
        isOpen={workflowModal.isOpen}
        onClose={handleCloseWorkflow}
        actionType={workflowModal.actionType}
        events={filteredEvents}
        analytics={displayAnalytics}
        onExecuteAction={handleExecuteWorkflow}
        onDeletePlaceholder={handleDeletePlaceholder}
        onAddBuffer={handleAddBufferAfter}
      />


      {isChatbotEnabled && (
        <AgentChatWidget
          events={events}
          extendedEvents={extendedEventsForFlights}
          eventsWithGaps={eventsWithGaps}
          analytics={displayAnalytics}
          assistantActions={assistantActions}
          currentView={currentView}
          timeRange={currentTimeRange}
        />
      )}
    </div>
  );
};

export default CalendarDashboard;
