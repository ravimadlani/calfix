/**
 * CalendarDashboard Component
 * Main dashboard that orchestrates all calendar features
 */

import React, { useState, useEffect, useCallback } from 'react';
import ViewSelector from './ViewSelector';
import StatsCard from './StatsCard';
import DayActionsPanel from './DayActionsPanel';
import DayFilterPills from './DayFilterPills';
import EventsTimeline from './EventsTimeline';
import ActionWorkflowModal from './ActionWorkflowModal';
import TeamSchedulingModal from './TeamSchedulingModal';
import CalendarConnectPrompt from './CalendarConnectPrompt';
import UpgradeModal from './UpgradeModal';

import { getTodayRange, getTomorrowRange, getThisWeekRange, getNextWeekRange, getThisMonthRange, getNextMonthRange, formatHours } from '../utils/dateHelpers';
import { calculateAnalytics, getEventsWithGaps, getRecommendations } from '../services/calendarAnalytics';
import { syncCalendarsToSupabase } from '../services/calendarSync';
import { useUser } from '@clerk/clerk-react';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import type { CalendarEvent, CalendarProviderId } from '../types';

const CalendarDashboard = () => {
  const { user: clerkUser } = useUser();
  const {
    activeProvider,
    activeProviderId,
    setActiveProvider,
    isAuthenticated: isProviderAuthenticated
  } = useCalendarProvider();

  const calendarApi = activeProvider.calendar;
  const helperApi = activeProvider.helpers;
  const providerCapabilities = activeProvider.capabilities;

  const {
    fetchEvents: fetchProviderEvents,
    createEvent: createProviderEvent,
    deleteEvent: deleteProviderEvent,
    fetchCalendarList: fetchProviderCalendarList,
    addConferenceLink: providerAddConferenceLink
  } = calendarApi;

  const {
    addBufferBefore: providerAddBufferBefore,
    addBufferAfter: providerAddBufferAfter,
    batchAddBuffers: providerBatchAddBuffers,
    deletePlaceholderAndLog: providerDeletePlaceholderAndLog,
    createTravelBlock: providerCreateTravelBlock,
    createLocationEvent: providerCreateLocationEvent,
    batchAddConferenceLinks: providerBatchAddConferenceLinks,
    findNextAvailableSlot: providerFindNextAvailableSlot,
    moveEvent: providerMoveEvent
  } = helperApi;
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null); // Start with null until we know the tier
  const [maxCalendars, setMaxCalendars] = useState(1);
  const [hasMultiCalendarAccess, setHasMultiCalendarAccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isInTrial, setIsInTrial] = useState(false);
  const [daysLeftInTrial, setDaysLeftInTrial] = useState(0);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false); // Track if subscription check is done
  const [currentView, setCurrentView] = useState('today');
  const [events, setEvents] = useState([]);
  const [eventsWithGaps, setEventsWithGaps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [, setActionLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // For filtering by day in week views
  const [extendedEventsForFlights, setExtendedEventsForFlights] = useState([]); // Extended events for flight analysis
  const [currentTimeRange, setCurrentTimeRange] = useState(null);
  const [workflowModal, setWorkflowModal] = useState({ isOpen: false, actionType: null });
  const [showTeamScheduler, setShowTeamScheduler] = useState(false);
  const [managedCalendarId, setManagedCalendarId] = useState(() => {
    // Load from localStorage or default to 'primary'
    const storedId = localStorage.getItem('managed_calendar_id');
    // Ensure it's a string, not an object that might have been incorrectly stored
    if (storedId && typeof storedId === 'string' && storedId !== '[object Object]') {
      return storedId;
    }
    return 'primary';
  });
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [allManageableCalendars, setAllManageableCalendars] = useState([]); // Track ALL calendars user has access to

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

  // Check user's subscription tier
  const checkSubscription = useCallback(async () => {
    const userId = clerkUser?.id;

    if (!userId) {
      setSubscriptionLoaded(true); // Mark as loaded even if no user
      return;
    }

    try {
      const response = await fetch(`/api/user/subscription?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionTier(data.subscriptionTier);
        setMaxCalendars(data.maxCalendars);
        setHasMultiCalendarAccess(data.hasMultiCalendarAccess);
        setIsInTrial(data.isInTrial);
        setDaysLeftInTrial(data.daysLeftInTrial);

        console.log('Subscription check:', {
          tier: data.subscriptionTier,
          maxCalendars: data.maxCalendars,
          hasMultiCalendarAccess: data.hasMultiCalendarAccess,
          isInTrial: data.isInTrial,
          daysLeftInTrial: data.daysLeftInTrial
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Default to basic tier on error
      setSubscriptionTier('basic');
      setMaxCalendars(1);
      setHasMultiCalendarAccess(false);
    } finally {
      // Always mark subscription as loaded
      setSubscriptionLoaded(true);
    }
  }, [clerkUser?.id]);

  // Fetch list of calendars user has access to
  const loadCalendarList = useCallback(async () => {
    try {
      const calendars = await fetchProviderCalendarList();
      console.log('All calendars:', calendars);

      // Filter to only show calendars where user has write access (owner or writer)
      // Exclude resources, groups, and read-only calendars
      const manageable = calendars.filter(cal => {
        // Must have owner or writer access
        const hasWriteAccess = cal.accessRole === 'owner' || cal.accessRole === 'writer';

        // Exclude resource calendars (conference rooms, equipment)
        const isNotResource = !cal.id.includes('resource.calendar.google.com');

        // Must be a user calendar (typically ends with @gmail.com or custom domain)
        const isUserCalendar = cal.id.includes('@') && (
          cal.primary ||
          !cal.id.includes('@group.') &&
          !cal.id.includes('@resource.')
        );

        return hasWriteAccess && isNotResource && (isUserCalendar || cal.primary);
      });

      console.log('Manageable calendars (filtered):', manageable);

      // Store ALL manageable calendars for upgrade teaser detection
      setAllManageableCalendars(manageable);

      // Filter calendars based on subscription tier and maxCalendars limit
      let calendarsToShow = manageable;
      if (!hasMultiCalendarAccess) {
        // Trial/Basic tier: Only show primary calendar
        calendarsToShow = manageable.filter(cal => cal.primary);
        console.log(`${subscriptionTier} tier: Limiting to primary calendar only`);
        console.log(`[Upgrade Opportunity] User has access to ${manageable.length} calendars but can only use 1`);
      } else {
        // EA/EA Pro tier: Show up to maxCalendars
        calendarsToShow = manageable.slice(0, maxCalendars);
        console.log(`${subscriptionTier} tier: Showing ${calendarsToShow.length} calendar(s) (max: ${maxCalendars})`);
      }

      setAvailableCalendars(calendarsToShow);

      // Sync calendars to Supabase if user is authenticated with Clerk
      console.log('[CalendarDashboard] Checking if should sync:', {
        hasClerkUser: !!clerkUser?.id,
        clerkUserId: clerkUser?.id,
        manageableCount: manageable.length,
        primaryCalendar: manageable.find(c => c.primary)
      });

      if (clerkUser?.id && manageable.length > 0) {
        try {
          console.log('[CalendarDashboard] Starting calendar sync to Supabase...');
          await syncCalendarsToSupabase(
            clerkUser.id,
            activeProviderId,
            manageable,
            manageable.find(c => c.primary)?.id
          );
          console.log('[CalendarDashboard] Successfully synced calendars to Supabase');
        } catch (syncError) {
          console.error('[CalendarDashboard] Failed to sync calendars to Supabase:', syncError);
          // Don't fail the whole operation if sync fails
        }
      } else {
        console.log('[CalendarDashboard] Skipping sync - no Clerk user or no manageable calendars');
      }
    } catch (error) {
      console.error('Error loading calendar list:', error);
      // If we can't fetch the list, still allow manual entry
    }
  }, [
    activeProviderId,
    clerkUser?.id,
    fetchProviderCalendarList,
    hasMultiCalendarAccess,
    maxCalendars,
    subscriptionTier
  ]);

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
      const analyticsData = calculateAnalytics(filteredEvents, extendedEvents);
      setAnalytics(analyticsData);

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

      // Get recommendations using filtered events
      const recs = getRecommendations(filteredEvents);
      setRecommendations(recs);

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
  }, [currentView, fetchProviderEvents, managedCalendarId]);

  // Update managed calendar and persist to localStorage
  const updateManagedCalendar = useCallback(async (calendarId: string) => {
    const trimmedId = calendarId.trim() || 'primary';
    console.log(`[Calendar Switch] Starting switch from ${managedCalendarId} to ${trimmedId}`);

    setEvents([]);
    setEventsWithGaps([]);
    setExtendedEventsForFlights([]);
    setAnalytics(null);
    setSelectedDay(null);

    setManagedCalendarId(trimmedId);
    localStorage.setItem('managed_calendar_id', trimmedId);

    console.log(`[Calendar Switch] State updated, calling loadEvents for calendar: ${trimmedId}`);

    try {
      await loadEvents(trimmedId);
      console.log(`[Calendar Switch] Successfully loaded events for ${trimmedId}`);
    } catch (error) {
      console.error(`[Calendar Switch] Error loading events for ${trimmedId}:`, error);
    }
  }, [loadEvents, managedCalendarId]);

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
    }

    const authenticated = isProviderAuthenticated(targetProviderId);
    setIsCalendarConnected(authenticated);
    setCheckingAuth(false);
  }, [activeProviderId, isProviderAuthenticated, setActiveProvider]);

  // Check subscription on mount
  useEffect(() => {
    if (clerkUser?.id) {
      checkSubscription();
    }
  }, [checkSubscription, clerkUser?.id]);

  // Load calendar list on mount (only after subscription is loaded)
  useEffect(() => {
    if (isCalendarConnected && subscriptionLoaded && maxCalendars > 0) {
      loadCalendarList();
    }
  }, [isCalendarConnected, subscriptionLoaded, maxCalendars, hasMultiCalendarAccess, loadCalendarList]);

  // Load events when view changes (only after subscription is loaded)
  useEffect(() => {
    if (isCalendarConnected && subscriptionLoaded) {
      setEvents([]);
      setEventsWithGaps([]);
      loadEvents();
      setSelectedDay(null);
    }
  }, [currentView, isCalendarConnected, loadEvents, subscriptionLoaded]);

  // Handle adding buffer before event
  const handleAddBufferBefore = async (event: CalendarEvent, options: ActionOptions = {}) => {
    if (!options.skipNotification && !window.confirm('Add a 15-minute buffer before this event?')) {
      return;
    }

    const helper = requireHelper(
      providerAddBufferBefore,
      'Buffer creation is not supported for this calendar provider yet.'
    );

    if (!helper) {
      return;
    }

    setActionLoading(true);
    try {
      await helper(event);

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

  // Handle moving event
  const handleMoveEvent = async (event: CalendarEvent) => {
    const findSlot = requireHelper(
      providerFindNextAvailableSlot,
      'Automatic rescheduling is not supported for this calendar provider yet.'
    );
    const move = requireHelper(
      providerMoveEvent,
      'Automatic rescheduling is not supported for this calendar provider yet.'
    );

    if (!findSlot || !move) {
      return;
    }

    const nextSlot = findSlot(events, 60, new Date(event.end.dateTime || event.end.date));

    if (!nextSlot) {
      alert('No available time slots found');
      return;
    }

    const confirmMessage = `Move "${event.summary}" to ${nextSlot.toLocaleString()}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionLoading(true);
    try {
      await move(event.id, event, nextSlot);
      await loadEvents();
      alert('Event moved successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to move event: ${message}`);
    } finally {
      setActionLoading(false);
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

        if (providerBatchAddConferenceLinks) {
          const meetResults = await providerBatchAddConferenceLinks(eventsToUpdate, managedCalendarId);

          if (meetResults.failCount === 0) {
            alert(`Successfully added video links to ${meetResults.successCount} meeting${meetResults.successCount !== 1 ? 's' : ''}!`);
          } else {
            alert(`Added video links to ${meetResults.successCount} meeting${meetResults.successCount !== 1 ? 's' : ''}. ${meetResults.failCount} failed.`);
          }
        } else if (providerAddConferenceLink) {
          let successCount = 0;
          let failCount = 0;

          for (const event of eventsToUpdate) {
            try {
              await providerAddConferenceLink(event.id, event, managedCalendarId);
              successCount++;
            } catch (error) {
              console.error('Failed to add conference link:', error);
              failCount++;
            }
          }

          if (failCount === 0) {
            alert(`Successfully added video links to ${successCount} meeting${successCount !== 1 ? 's' : ''}!`);
          } else {
            alert(`Added video links to ${successCount} meeting${successCount !== 1 ? 's' : ''}. ${failCount} failed.`);
          }
        } else {
          alert('Conference link automation is not supported for this calendar provider yet.');
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

    // Only refresh if not in bulk mode (bulk mode will refresh once at the end)
    if (!options.skipRefresh) {
      await loadEvents();
    }

    // Only show notification if not in bulk mode
    if (!options.skipNotification) {
      alert(`"${placeholderEvent.summary}" has been deleted and logged to AI-Removed Events.`);
    }
  };

  // Show loading while checking authentication or subscription
  if (checkingAuth || (clerkUser && !subscriptionLoaded)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show Google Calendar connection prompt if not connected
  if (!isCalendarConnected) {
    return <CalendarConnectPrompt />;
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

  // Helper to get readable view label
  const getViewLabel = (view) => {
    const labels = {
      today: 'Today',
      tomorrow: 'Tomorrow',
      week: 'This Week',
      nextWeek: 'Next Week'
    };
    return labels[view] || 'Today';
  };

  // Helper to get the date object for selected day
  const getSelectedDayDate = () => {
    if (!selectedDay || !events.length) return null;

    // selectedDay is in format YYYY-MM-DD
    const [year, month, day] = selectedDay.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Filter events by selected day if in week or month view
  const getFilteredEvents = () => {
    if (!selectedDay || (currentView !== 'week' && currentView !== 'nextWeek' && currentView !== 'thisMonth' && currentView !== 'nextMonth')) {
      return eventsWithGaps;
    }

    // selectedDay is now a date key in format YYYY-MM-DD
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
  };

  const filteredEvents = getFilteredEvents();

  // Calculate analytics for the filtered view (day-specific if a day is selected)
  const displayAnalytics = selectedDay && (currentView === 'week' || currentView === 'nextWeek' || currentView === 'thisMonth' || currentView === 'nextMonth')
    ? calculateAnalytics(filteredEvents, extendedEventsForFlights.length > 0 ? extendedEventsForFlights : null)
    : analytics;

  // Calculate recommendations for the filtered view
  const displayRecommendations = selectedDay && (currentView === 'week' || currentView === 'nextWeek' || currentView === 'thisMonth' || currentView === 'nextMonth')
    ? getRecommendations(filteredEvents)
    : recommendations;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Calendar Management Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        {hasMultiCalendarAccess ? (
          <>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Managing Calendar:
              </label>
              <select
                value={managedCalendarId}
                onChange={(e) => updateManagedCalendar(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-white"
              >
                {availableCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary ? '(Your Calendar)' : ''} - {cal.id}
                  </option>
                ))}
              </select>
              {managedCalendarId !== 'primary' && !availableCalendars.find(c => c.primary && c.id === managedCalendarId) && (
                <button
                  onClick={() => {
                    const primaryCal = availableCalendars.find(c => c.primary);
                    updateManagedCalendar(primaryCal ? primaryCal.id : 'primary');
                  }}
                  className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  Reset to My Calendar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {availableCalendars.find(c => c.id === managedCalendarId)?.summary || managedCalendarId}
              {' • '}
              {availableCalendars.length} calendar{availableCalendars.length !== 1 ? 's' : ''} available
              {managedCalendarId !== 'primary' && !availableCalendars.find(c => c.primary && c.id === managedCalendarId)
                ? ' • Managing as delegate'
                : ''}
            </p>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                📅 {availableCalendars[0]?.summary || 'Your Calendar'}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded uppercase">
                {isInTrial ? `${subscriptionTier || 'Loading'} Trial (${daysLeftInTrial} days left)` : (subscriptionTier || 'Loading')}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {(() => {
                console.log('[Upgrade Teaser] Checking:', {
                  subscriptionTier,
                  allManageableCount: allManageableCalendars.length,
                  shownCount: availableCalendars.length,
                  allManageableCalendars: allManageableCalendars.map(c => ({ summary: c.summary, accessRole: c.accessRole }))
                });

                if (subscriptionTier === 'basic' && allManageableCalendars.length > 1) {
                  return `🎯 You have access to ${allManageableCalendars.length} calendars! Upgrade to EA to manage them all`;
                }
                return `Manage up to ${maxCalendars === 5 ? '5' : maxCalendars === 15 ? '15' : '1'} calendar${maxCalendars > 1 ? 's' : ''} with ${maxCalendars === 5 ? 'EA' : maxCalendars === 15 ? 'EA Pro' : 'your plan'}`;
              })()}
            </p>
          </div>
        )}

        {/* Action Buttons - Below the calendar selection */}
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={() => loadEvents()}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => {/* TODO: Add preferences modal */}}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </button>
        </div>
      </div>

      {/* Upgrade Banner for Basic Users */}
      {subscriptionTier === 'basic' && allManageableCalendars.length > 1 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                🎯 Unlock All Your Calendars
              </p>
              <p className="text-xs text-gray-600">
                You have access to {allManageableCalendars.length} calendars but can only manage 1 with Basic plan
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 whitespace-nowrap"
            >
              Unlock All Calendars
            </button>
          </div>
        </div>
      )}

      {/* Header with View Selector and Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
          <button
            onClick={() => setShowTeamScheduler(true)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span>👥</span>
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={(subscriptionTier || 'basic') as 'basic' | 'ea' | 'ea_pro'}
      />

      {/* Statistics Grid */}
      {displayAnalytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            icon="📅"
            label="Total Events"
            value={displayAnalytics.totalEvents}
            subtext={`${displayAnalytics.totalMeetings} meetings`}
            color="indigo"
          />
          <StatsCard
            icon="⏰"
            label="Meeting Time"
            value={formatHours(displayAnalytics.totalMeetingHours)}
            subtext="Total hours"
            color="blue"
          />
          <StatsCard
            icon="🔴"
            label="Back-to-Back"
            value={displayAnalytics.backToBackCount}
            subtext="Needs buffers"
            color={displayAnalytics.backToBackCount > 0 ? 'red' : 'green'}
          />
          <StatsCard
            icon="🎯"
            label="Focus Blocks"
            value={displayAnalytics.focusBlockCount}
            subtext="60+ min gaps"
            color="green"
          />
          <StatsCard
            icon="🌙"
            label="Out of Hours"
            value={displayAnalytics.outOfHoursMeetingCount}
            subtext="In foreign timezone"
            color={displayAnalytics.outOfHoursMeetingCount > 0 ? 'orange' : 'green'}
          />
        </div>
      )}

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

      {/* Day-Specific Actions */}
      {displayAnalytics && (
        <DayActionsPanel
          analytics={displayAnalytics}
          recommendations={displayRecommendations}
          viewLabel={selectedDay ? getSelectedDayDate()?.toLocaleDateString('en-US', { weekday: 'long' }) : getViewLabel(currentView)}
          selectedDayDate={selectedDay ? getSelectedDayDate() : null}
          onActionClick={handleOpenWorkflow}
        />
      )}

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

      {/* Events Timeline */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <span role="img" aria-label="Calendar">
            📋
          </span>
          Your Schedule
        </h2>

        <EventsTimeline
          events={filteredEvents}
          showDayHeadings={(currentView === 'week' || currentView === 'nextWeek' || currentView === 'thisMonth' || currentView === 'nextMonth') && !selectedDay}
          timeRange={currentTimeRange}
          onAddBufferBefore={handleAddBufferBefore}
          onAddBufferAfter={handleAddBufferAfter}
          onMoveEvent={handleMoveEvent}
        />
      </div>

      {/* Team Scheduling Modal */}
      {showTeamScheduler && (
        <TeamSchedulingModal
          onClose={() => setShowTeamScheduler(false)}
          managedCalendarId={managedCalendarId}
          onSchedule={async (holds, emailDraft) => {
            // Create calendar holds for team members on the managed calendar
            for (const hold of holds) {
              await createProviderEvent(hold, managedCalendarId);
            }

            // Copy email draft to clipboard
            await navigator.clipboard.writeText(emailDraft);

            // Refresh events
            await loadEvents();
          }}
        />
      )}
    </div>
  );
};

export default CalendarDashboard;
