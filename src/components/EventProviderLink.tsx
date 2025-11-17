/**
 * EventProviderLink Component
 * Renders a clickable link to open an event in its calendar provider (Google Calendar or Outlook)
 */

import React from 'react';
import type { CalendarEvent } from '../types/calendar';

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

  // Google Calendar icon
  const GoogleCalendarIcon = () => (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
    </svg>
  );

  // Outlook icon
  const OutlookIcon = () => (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 8.608v8.142a3.25 3.25 0 0 1-3.25 3.25h-5.5A3.25 3.25 0 0 1 10 16.75V11.5l8.5-5.5c.062-.035.126-.066.192-.092A3.24 3.24 0 0 1 20 5.75 3.25 3.25 0 0 1 22 8.608z"/>
      <path d="M15.5 2.25a1.5 1.5 0 0 0-1.5 1.5v8.75l6.077-3.936A3.235 3.235 0 0 0 20 8.25V3.75a1.5 1.5 0 0 0-1.5-1.5h-3zM2 5.25v13.5A1.25 1.25 0 0 0 3.25 20h7.5c.178 0 .347-.037.5-.104v-.146A4.726 4.726 0 0 1 10 16.75c0-.831.214-1.612.59-2.29L2 8.85v-3.6A1.25 1.25 0 0 1 3.25 4h9.05c.1-.358.264-.694.48-1H3.25C2.01 3 1 4.01 1 5.25h1z"/>
    </svg>
  );

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 ${providerColor} hover:underline transition-all duration-200 ${className}`}
      title={`Open in ${providerName}`}
      aria-label={`Open event in ${providerName}`}
      type="button"
    >
      {/* Provider-specific icon */}
      {event.providerType === 'google' ? <GoogleCalendarIcon /> : <OutlookIcon />}

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