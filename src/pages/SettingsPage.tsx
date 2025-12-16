import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useCalendarProvider } from '../context/CalendarProviderContext';
import { PageHeader } from '../components/shared';

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  accessRole: string;
  primary?: boolean;
}

interface UserPreferences {
  selected_calendar_ids: string[];
  active_provider: string;
  onboarding_completed: boolean;
}

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { subscription, isLoaded: subscriptionLoaded } = useSubscription();
  const { activeProvider, activeProviderId } = useCalendarProvider();

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxCalendars = subscription?.maxCalendars || 1;
  const hasMultiCalendarAccess = subscription?.hasMultiCalendarAccess || false;

  // Fetch current preferences and calendars on mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      // Fetch preferences from API
      const prefsResponse = await fetch('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!prefsResponse.ok) {
        throw new Error('Failed to load preferences');
      }

      const prefs: UserPreferences = await prefsResponse.json();

      // Fetch available calendars from provider
      const calendarList = await activeProvider.calendar.fetchCalendarList();

      // Filter to manageable calendars (owner or writer access, not resource calendars)
      const manageable = calendarList.filter((cal: Calendar) =>
        ['owner', 'writer'].includes(cal.accessRole) &&
        !cal.id.includes('.resource.calendar.google.com')
      );

      setCalendars(manageable);
      setSelectedIds(prefs.selected_calendar_ids || []);
    } catch (err) {
      console.error('[SettingsPage] Error loading data:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getToken, activeProvider]);

  useEffect(() => {
    if (subscriptionLoaded) {
      loadData();
    }
  }, [subscriptionLoaded, loadData]);

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
    // Clear success state when user makes changes
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getToken();
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          selected_calendar_ids: selectedIds,
          active_provider: activeProviderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isOverLimit = selectedIds.length > maxCalendars;

  if (loading || !subscriptionLoaded) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Settings"
        description="Manage your calendar preferences and account settings"
      />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Calendar Selection Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Calendar Selection
            </h2>
            <span
              className={`text-sm ${
                isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}
            >
              {selectedIds.length} of {maxCalendars} selected
            </span>
          </div>

          {!hasMultiCalendarAccess && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Your current plan supports 1 calendar. Upgrade to EA Basic or Pro
                to manage multiple calendars.
              </p>
            </div>
          )}

          {isOverLimit && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-medium text-amber-800">
                Action Required: Your plan allows {maxCalendars} calendar
                {maxCalendars === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Please deselect {selectedIds.length - maxCalendars} calendar(s)
                to continue.
              </p>
            </div>
          )}

          {calendars.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No calendars found.</p>
              <p className="text-sm mt-1">
                Make sure you have write access to at least one calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {calendars.map((calendar) => {
                const isSelected = selectedIds.includes(calendar.id);
                const isDisabled =
                  !isSelected && selectedIds.length >= maxCalendars;

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
                        w-5 h-5 rounded border-2 mr-4 flex items-center justify-center
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
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {calendar.summary}
                        {calendar.primary && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </p>
                      {calendar.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {calendar.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                Settings saved successfully!
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || isOverLimit}
              className={`
                px-6 py-2 rounded-lg font-medium
                transition-all duration-200
                ${
                  saving || isOverLimit
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {saving
                ? 'Saving...'
                : isOverLimit
                  ? `Deselect ${selectedIds.length - maxCalendars} More`
                  : 'Save Changes'}
            </button>
          </div>
        </section>

        {/* Account Info Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Subscription Tier</span>
              <span className="font-medium text-gray-900 capitalize">
                {subscription?.subscriptionTier || 'Basic'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Calendar Limit</span>
              <span className="font-medium text-gray-900">
                {maxCalendars} calendar{maxCalendars === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Connected Provider</span>
              <span className="font-medium text-gray-900 capitalize">
                {activeProviderId === 'google' ? 'Google Calendar' : 'Outlook'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
