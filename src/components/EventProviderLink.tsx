/**
 * EventProviderLink Component
 * Renders a clickable link to open an event in its calendar provider (Google Calendar or Outlook)
 */

import React from 'react';
import type { CalendarEvent } from '../types/calendar';
import GoogleCalendarIcon from '../assets/google-calendar.svg';
import OutlookCalendarIcon from '../assets/outlook-calendar.jpg';

interface EventProviderLinkProps {
  event: CalendarEvent;
  className?: string;
  showText?: boolean;
}

export const EventProviderLink: React.FC<EventProviderLinkProps> = ({
  event,
  className = '',
  showText = false
}) => {
  // Only render if we have a provider URL
  if (!event.providerUrl) {
    return null;
  }

  // Determine provider name and styling based on provider type
  const providerName = event.providerType === 'google' ? 'Google Calendar' : 'Outlook';
  const providerColor = event.providerType === 'google' ? 'text-blue-600 hover:text-blue-700' : 'text-indigo-600 hover:text-indigo-700';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event card click if used inside a clickable card
    window.open(event.providerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 ${providerColor} hover:underline transition-all duration-200 ${className}`}
      title={`Open in ${providerName}`}
      aria-label={`Open event in ${providerName}`}
      type="button"
    >
      {/* Provider-specific icon */}
      <img
        src={event.providerType === 'google' ? GoogleCalendarIcon : OutlookCalendarIcon}
        alt={`${providerName} icon`}
        className="w-4 h-4 object-contain"
      />

      {/* External link icon */}
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>

      {showText && <span className="text-sm">View in {providerName}</span>}
    </button>
  );
};