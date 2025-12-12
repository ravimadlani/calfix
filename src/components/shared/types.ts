/**
 * Shared types for calendar selector and page header components.
 */

// CalendarSelectorCardProps is now exported from CalendarSelectorCard.tsx
// since the component is self-contained and manages its own types

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
