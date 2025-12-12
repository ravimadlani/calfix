import React, { useCallback, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useCalendarProvider } from '../../context/CalendarProviderContext';
import ProviderSwitcher from '../ProviderSwitcher';
import type { CalendarListEntry } from '../../types';

const MANAGED_CALENDAR_STORAGE_KEY = 'managed_calendar_id';

/**
 * Props for the CalendarSelectorCard component.
 * Now simplified - component handles its own data fetching internally.
 */
export interface CalendarSelectorCardProps {
  /** Callback when calendar selection changes */
  onCalendarChange?: (calendarId: string) => void;

  /** Whether to show the provider switcher dropdown */
  showProviderSwitcher?: boolean;

  /** Whether to show action buttons (Refresh, Preferences) */
  showActionButtons?: boolean;

  /** Whether to show reset button for non-primary calendars */
  showResetButton?: boolean;

  /** Callback for preferences button click */
  onPreferences?: () => void;

  /** Callback for upgrade button click */
  onUpgrade?: () => void;

  /** Component variant for different layouts */
  variant?: 'default' | 'compact';
}

/**
 * Filter calendars to only include manageable user calendars.
 * This is the single source of truth for calendar filtering logic.
 */
const filterManageableCalendars = (calendars: CalendarListEntry[]): CalendarListEntry[] => {
  return calendars.filter(cal => {
    const hasWriteAccess = cal.accessRole === 'owner' || cal.accessRole === 'writer';
    const isNotResource = !cal.id.includes('resource.calendar.google.com');
    const isUserCalendar = cal.id.includes('@') && (
      cal.primary ||
      (!cal.id.includes('@group.') && !cal.id.includes('@resource.'))
    );
    return hasWriteAccess && isNotResource && (isUserCalendar || cal.primary);
  });
};

/**
 * CalendarSelectorCard - A self-contained component for calendar selection.
 *
 * This component handles all its own data fetching:
 * - Fetches subscription status from the API
 * - Fetches calendar list from the provider
 * - Manages calendar selection state with localStorage persistence
 *
 * This ensures consistent behavior across all pages that use this component.
 */
const CalendarSelectorCard: React.FC<CalendarSelectorCardProps> = ({
  onCalendarChange,
  showProviderSwitcher = true,
  showActionButtons = true,
  showResetButton = false,
  onPreferences,
  onUpgrade,
  variant = 'default',
}) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { activeProvider, isAuthenticated: isCalendarConnected } = useCalendarProvider();
  const fetchProviderCalendarList = activeProvider?.calendar?.fetchCalendarList;

  // Subscription state
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [hasMultiCalendarAccess, setHasMultiCalendarAccess] = useState(false);
  const [isInTrial, setIsInTrial] = useState(false);
  const [daysLeftInTrial, setDaysLeftInTrial] = useState(0);
  const [maxCalendars, setMaxCalendars] = useState(1);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  // Calendar state
  const [availableCalendars, setAvailableCalendars] = useState<CalendarListEntry[]>([]);
  const [allManageableCalendars, setAllManageableCalendars] = useState<CalendarListEntry[]>([]);
  const [managedCalendarId, setManagedCalendarId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY);
      if (stored && stored !== '[object Object]') {
        return stored;
      }
    }
    return 'primary';
  });
  const [loading, setLoading] = useState(false);

  // Derived state
  const selectedCalendar = availableCalendars.find(c => c.id === managedCalendarId);
  const primaryCalendar = availableCalendars.find(c => c.primary);
  const isManagingNonPrimary = managedCalendarId !== 'primary' &&
    primaryCalendar && primaryCalendar.id !== managedCalendarId;

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      const response = await fetch(`/api/user/subscription?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHasMultiCalendarAccess(data.hasMultiCalendarAccess);
        setSubscriptionTier(data.subscriptionTier);
        setIsInTrial(data.isInTrial);
        setDaysLeftInTrial(data.daysLeftInTrial);
        setMaxCalendars(data.maxCalendars);
      }
    } catch (error) {
      console.error('[CalendarSelectorCard] Error checking subscription:', error);
      setHasMultiCalendarAccess(false);
      setSubscriptionTier('basic');
    } finally {
      setSubscriptionLoaded(true);
    }
  }, [user?.id, getToken]);

  // Fetch calendar list
  const fetchCalendars = useCallback(async () => {
    if (!isCalendarConnected || !fetchProviderCalendarList) {
      setAvailableCalendars([]);
      setAllManageableCalendars([]);
      return;
    }

    setLoading(true);
    try {
      const calendars = await fetchProviderCalendarList();
      const manageable = filterManageableCalendars(calendars);

      // Store all manageable calendars for upgrade prompts
      setAllManageableCalendars(manageable);

      // Filter based on subscription tier
      let calendarsToShow = manageable;
      if (!hasMultiCalendarAccess) {
        calendarsToShow = manageable.filter(cal => cal.primary);
      } else {
        calendarsToShow = manageable.slice(0, maxCalendars);
      }

      // Fallback if filtering resulted in empty list
      if (calendarsToShow.length === 0 && manageable.length > 0) {
        calendarsToShow = [manageable[0]];
      }

      setAvailableCalendars(calendarsToShow);

      // Update selection if current selection is not in the list
      if (!calendarsToShow.find(cal => cal.id === managedCalendarId) && calendarsToShow.length > 0) {
        const newId = calendarsToShow[0].id;
        setManagedCalendarId(newId);
        onCalendarChange?.(newId);
      }
    } catch (error) {
      console.error('[CalendarSelectorCard] Failed to fetch calendar list:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProviderCalendarList, isCalendarConnected, hasMultiCalendarAccess, maxCalendars, managedCalendarId, onCalendarChange]);

  // Initialize subscription check on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Fetch calendars after subscription is loaded
  useEffect(() => {
    if (!subscriptionLoaded) return;
    fetchCalendars();
  }, [subscriptionLoaded, fetchCalendars]);

  // Persist calendar selection to localStorage
  useEffect(() => {
    if (managedCalendarId && typeof window !== 'undefined') {
      localStorage.setItem(MANAGED_CALENDAR_STORAGE_KEY, managedCalendarId);
    }
  }, [managedCalendarId]);

  // Handle calendar change
  const handleCalendarChange = (calendarId: string) => {
    setManagedCalendarId(calendarId);
    onCalendarChange?.(calendarId);
  };

  // Handle reset to primary
  const handleResetToPrimary = () => {
    if (primaryCalendar) {
      handleCalendarChange(primaryCalendar.id);
    } else {
      handleCalendarChange('primary');
    }
  };

  // Container classes based on variant
  const containerClasses = variant === 'compact'
    ? 'bg-slate-50 border border-slate-200 rounded-lg p-4'
    : 'bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3';

  return (
    <div className={containerClasses}>
      {/* Provider Switcher Row */}
      {showProviderSwitcher && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Provider:</span>
            <ProviderSwitcher />
          </div>
        </div>
      )}

      {/* Calendar Selection */}
      {hasMultiCalendarAccess ? (
        <>
          <div className="flex items-center gap-4">
            <label
              htmlFor="calendar-selector"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Managing Calendar:
            </label>
            <select
              id="calendar-selector"
              value={managedCalendarId}
              onChange={(e) => handleCalendarChange(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-white"
              aria-describedby="calendar-helper-text"
            >
              {availableCalendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary || cal.id} {cal.primary ? '(Your Calendar)' : ''} - {cal.id}
                </option>
              ))}
            </select>
            {showResetButton && isManagingNonPrimary && (
              <button
                type="button"
                onClick={handleResetToPrimary}
                className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Reset to My Calendar
              </button>
            )}
          </div>
          <p id="calendar-helper-text" className="text-xs text-gray-500">
            {selectedCalendar?.summary || managedCalendarId}
            {' \u2022 '}
            {availableCalendars.length} calendar{availableCalendars.length !== 1 ? 's' : ''} available
            {isManagingNonPrimary ? ' \u2022 Managing as delegate' : ''}
          </p>
        </>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {availableCalendars[0]?.summary || 'Your Calendar'}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded uppercase">
              {isInTrial
                ? `${subscriptionTier || 'Loading'} Trial (${daysLeftInTrial} days left)`
                : (subscriptionTier || 'Loading')}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {allManageableCalendars.length > 1
              ? `You have access to ${allManageableCalendars.length} calendars! Upgrade to EA to manage them all`
              : `Manage up to ${maxCalendars === 5 ? '5' : maxCalendars === 15 ? '15' : '1'} calendar${maxCalendars > 1 ? 's' : ''} with ${maxCalendars === 5 ? 'EA' : maxCalendars === 15 ? 'EA Pro' : 'your plan'}`}
          </p>
          {allManageableCalendars.length > 1 && onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Unlock additional calendars
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {showActionButtons && (fetchCalendars || onPreferences) && (
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={fetchCalendars}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          {onPreferences && (
            <button
              type="button"
              onClick={onPreferences}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Preferences
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarSelectorCard;

/**
 * Hook to get the currently selected calendar ID.
 * Useful for pages that need to know the selection without rendering the component.
 */
export const useSelectedCalendarId = (): string => {
  const [calendarId, setCalendarId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY);
      if (stored && stored !== '[object Object]') {
        return stored;
      }
    }
    return 'primary';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY);
      if (stored && stored !== '[object Object]') {
        setCalendarId(stored);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return calendarId;
};
