/**
 * Shared types for calendar selector and page header components.
 */

import type { CalendarListEntry } from '../../types/calendar';

/**
 * Props for the CalendarSelectorCard component.
 */
export interface CalendarSelectorCardProps {
  /** List of available calendars to display in the dropdown */
  availableCalendars: CalendarListEntry[];

  /** Currently selected calendar ID */
  managedCalendarId: string;

  /** Callback when calendar selection changes */
  onCalendarChange: (calendarId: string) => void;

  /** Whether user has multi-calendar access (EA/EA Pro tier) */
  hasMultiCalendarAccess: boolean;

  /** Current subscription tier */
  subscriptionTier?: string;

  /** Whether user is in trial period */
  isInTrial?: boolean;

  /** Days remaining in trial */
  daysLeftInTrial?: number;

  /** All calendars user could manage (for upgrade prompts) */
  allManageableCalendars?: CalendarListEntry[];

  /** Maximum calendars allowed by subscription */
  maxCalendars?: number;

  /** Whether to show the provider switcher dropdown */
  showProviderSwitcher?: boolean;

  /** Whether to show action buttons (Refresh, Preferences) */
  showActionButtons?: boolean;

  /** Whether to show reset button for non-primary calendars */
  showResetButton?: boolean;

  /** Callback for refresh button click */
  onRefresh?: () => void;

  /** Callback for preferences button click */
  onPreferences?: () => void;

  /** Callback for upgrade button click */
  onUpgrade?: () => void;

  /** Whether a loading operation is in progress */
  loading?: boolean;

  /** Component variant for different layouts */
  variant?: 'default' | 'compact';
}

/**
 * Tab configuration for PageHeader navigation.
 */
export interface PageHeaderTab {
  /** Unique key for the tab */
  key: string;

  /** Display label for the tab */
  label: string;

  /** Whether this tab is currently active */
  active: boolean;

  /** Callback when tab is clicked */
  onClick: () => void;
}

/**
 * Props for the PageHeader component.
 */
export interface PageHeaderProps {
  /** Page title */
  title: string;

  /** Optional description below title */
  description?: string | React.ReactNode;

  /** Optional navigation tabs */
  tabs?: PageHeaderTab[];

  /** Optional actions slot (rendered on the right side) */
  actions?: React.ReactNode;

  /** Header variant - inline (no background) or sticky (white bg with border) */
  variant?: 'inline' | 'sticky';

  /** Optional className for additional styling */
  className?: string;
}
