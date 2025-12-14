/**
 * Shared components for consistent UI across the application.
 */

export { default as CalendarSelectorCard } from './CalendarSelectorCard';
export { default as PageHeader } from './PageHeader';
export * from './types';

// Re-export calendar selection hook for backwards compatibility
// Consumers can also import directly from '../../hooks/useCalendarSelection'
export { useSelectedCalendarId } from '../../hooks/useCalendarSelection';
