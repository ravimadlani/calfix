import { useState, useEffect, useCallback } from 'react';
import {
  MANAGED_CALENDAR_STORAGE_KEY,
  CALENDAR_SELECTION_CHANGE_EVENT,
} from '../constants/storage';

/**
 * Custom event detail for calendar selection changes.
 */
interface CalendarSelectionEventDetail {
  calendarId: string;
}

/**
 * Sets the selected calendar ID and notifies all listeners.
 *
 * This function:
 * 1. Updates localStorage for persistence
 * 2. Dispatches a custom event for same-tab listeners
 *
 * The custom event is necessary because the native 'storage' event
 * only fires in OTHER tabs, not the tab that made the change.
 *
 * @param calendarId - The calendar ID to select
 */
export function setSelectedCalendarId(calendarId: string): void {
  if (typeof window === 'undefined') return;

  // Update localStorage
  localStorage.setItem(MANAGED_CALENDAR_STORAGE_KEY, calendarId);

  // Dispatch custom event for same-tab listeners
  const event = new CustomEvent<CalendarSelectionEventDetail>(
    CALENDAR_SELECTION_CHANGE_EVENT,
    { detail: { calendarId } }
  );
  window.dispatchEvent(event);
}

/**
 * Gets the current selected calendar ID from localStorage.
 *
 * @returns The stored calendar ID or 'primary' as default
 */
export function getSelectedCalendarId(): string {
  if (typeof window === 'undefined') return 'primary';

  const stored = localStorage.getItem(MANAGED_CALENDAR_STORAGE_KEY);
  if (stored && stored !== '[object Object]') {
    return stored;
  }
  return 'primary';
}

/**
 * Hook to get and subscribe to the currently selected calendar ID.
 *
 * This hook listens to BOTH:
 * 1. Custom events (for same-tab changes via setSelectedCalendarId)
 * 2. Storage events (for cross-tab changes)
 *
 * This ensures the calendar selection stays in sync across all components
 * whether the change originated in the same tab or a different tab.
 *
 * @returns The current calendar ID, reactive to changes
 */
export function useSelectedCalendarId(): string {
  const [calendarId, setCalendarId] = useState<string>(() => {
    return getSelectedCalendarId();
  });

  useEffect(() => {
    // Handler for same-tab changes (custom event)
    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<CalendarSelectionEventDetail>;
      const newId = customEvent.detail?.calendarId;
      if (newId && newId !== '[object Object]') {
        setCalendarId(newId);
      }
    };

    // Handler for cross-tab changes (storage event)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === MANAGED_CALENDAR_STORAGE_KEY && event.newValue) {
        const newId = event.newValue;
        if (newId !== '[object Object]') {
          setCalendarId(newId);
        }
      }
    };

    // Listen to both event types
    window.addEventListener(CALENDAR_SELECTION_CHANGE_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(CALENDAR_SELECTION_CHANGE_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  return calendarId;
}

/**
 * Hook that provides both the current calendar ID and a setter function.
 *
 * This is useful for components that need to both read and update the selection.
 *
 * @returns Tuple of [calendarId, setCalendarId]
 */
export function useCalendarSelection(): [string, (id: string) => void] {
  const calendarId = useSelectedCalendarId();

  const setCalendar = useCallback((id: string) => {
    setSelectedCalendarId(id);
  }, []);

  return [calendarId, setCalendar];
}
