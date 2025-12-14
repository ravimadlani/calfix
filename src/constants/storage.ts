/**
 * Storage keys used throughout the application.
 * Centralizing these prevents typos and makes refactoring easier.
 */

export const MANAGED_CALENDAR_STORAGE_KEY = 'managed_calendar_id';

/**
 * Custom event name for same-tab calendar selection changes.
 * The native 'storage' event only fires in OTHER tabs, not the same tab.
 * We use this custom event to notify components in the same tab.
 */
export const CALENDAR_SELECTION_CHANGE_EVENT = 'calendarSelectionChange';
