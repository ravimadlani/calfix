/**
 * SelectCalendarsStep Component
 * Allows EA/Pro tier users to select which calendars to manage
 */

import React, { useState, useEffect } from 'react';
import { useCalendarProvider } from '../../context/CalendarProviderContext';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  accessRole: string;
  primary?: boolean;
}

interface SelectCalendarsStepProps {
  maxCalendars: number;
  onNext: (selectedCalendars: string[]) => void;
  onBack: () => void;
}

export default function SelectCalendarsStep({
  maxCalendars,
  onNext,
  onBack,
}: SelectCalendarsStepProps) {
  const { activeProvider } = useCalendarProvider();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch calendars on mount
  useEffect(() => {
    async function fetchCalendars() {
      try {
        setLoading(true);
        const calendarList = await activeProvider.calendar.fetchCalendarList();

        // Filter to manageable calendars (owner or writer access, not resource calendars)
        const manageable = calendarList.filter(
          (cal: Calendar) =>
            ['owner', 'writer'].includes(cal.accessRole) &&
            !cal.id.includes('.resource.calendar.google.com')
        );

        setCalendars(manageable);

        // Auto-select primary calendar
        const primary = manageable.find((c: Calendar) => c.primary);
        if (primary) {
          setSelectedIds([primary.id]);
        }
      } catch (err) {
        console.error('[SelectCalendarsStep] Error fetching calendars:', err);
        setError('Failed to load calendars. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCalendars();
  }, [activeProvider]);

  const handleToggleCalendar = (calendarId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(calendarId)) {
        return prev.filter((id) => id !== calendarId);
      }
      if (prev.length >= maxCalendars) {
        return prev; // Already at limit
      }
      return [...prev, calendarId];
    });
  };

  const handleContinue = () => {
    if (selectedIds.length === 0) {
      // Select primary calendar by default
      const primary = calendars.find((c) => c.primary);
      onNext(primary ? [primary.id] : ['primary']);
    } else {
      onNext(selectedIds);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading your calendars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Select Your Calendars
      </h2>
      <p className="text-gray-600 mb-6">
        Choose which calendars you want to manage with CalendarZero. You can
        select up to {maxCalendars} calendars.
      </p>

      {/* Counter */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-600">Calendars selected</span>
        <span
          className={`text-sm font-medium ${
            selectedIds.length >= maxCalendars
              ? 'text-amber-600'
              : 'text-gray-900'
          }`}
        >
          {selectedIds.length} of {maxCalendars}
        </span>
      </div>

      {/* Calendar list */}
      <div className="space-y-3 max-h-64 overflow-y-auto mb-6">
        {calendars.map((calendar) => {
          const isSelected = selectedIds.includes(calendar.id);
          const isDisabled = !isSelected && selectedIds.length >= maxCalendars;

          return (
            <label
              key={calendar.id}
              className={`
                flex items-center p-4 rounded-lg border-2 cursor-pointer
                transition-all duration-200
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => handleToggleCalendar(calendar.id)}
                className="sr-only"
              />
              <div
                className={`
                  w-5 h-5 rounded border-2 mr-4 flex items-center justify-center flex-shrink-0
                  ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }
                `}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {calendar.summary}
                  {calendar.primary && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </p>
                {calendar.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {calendar.description}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {calendars.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No calendars found.</p>
          <p className="text-sm mt-1">
            Make sure you have write access to at least one calendar.
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
