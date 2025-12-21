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
  // Calendar slots: array of length maxCalendars, each slot is calendar ID or empty string
  const [calendarSlots, setCalendarSlots] = useState<string[]>([]);
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

      // Initialize slots array with existing selections, padded to maxCalendars
      const existingIds = prefs.selected_calendar_ids || [];
      const slots = Array(maxCalendars).fill('').map((_, i) => existingIds[i] || '');
      setCalendarSlots(slots);
    } catch (err) {
      console.error('[SettingsPage] Error loading data:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getToken, activeProvider, maxCalendars]);

  useEffect(() => {
    if (subscriptionLoaded) {
      loadData();
    }
  }, [subscriptionLoaded, loadData]);

  // Handle dropdown change for a specific slot
  const handleSlotChange = (slotIndex: number, calendarId: string) => {
    setCalendarSlots((prev) => {
      const newSlots = [...prev];
      newSlots[slotIndex] = calendarId;
      return newSlots;
    });
    // Clear success state when user makes changes
    setSuccess(false);
  };

  // Get calendars available for a specific slot (excluding ones selected in other slots)
  const getAvailableCalendarsForSlot = (slotIndex: number) => {
    const selectedInOtherSlots = calendarSlots.filter((id, i) => i !== slotIndex && id !== '');
    return calendars.filter((cal) => !selectedInOtherSlots.includes(cal.id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getToken();
      // Filter out empty slots and send only selected calendar IDs
      const selectedCalendarIds = calendarSlots.filter((id) => id !== '');

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          selected_calendar_ids: selectedCalendarIds,
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

  // Count how many slots are filled
  const filledSlots = calendarSlots.filter((id) => id !== '').length;

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
              Calendar Slots
            </h2>
            <span className="text-sm text-gray-500">
              {filledSlots} of {maxCalendars} configured
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Select which calendars CalFix should manage. Each slot represents one calendar you can configure.
          </p>

          {!hasMultiCalendarAccess && calendars.length > 1 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                You have access to {calendars.length} calendars. Upgrade to EA to unlock up to 5 slots, or EA Pro for 15 slots.
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
              {calendarSlots.map((selectedId, slotIndex) => {
                const availableCalendars = getAvailableCalendarsForSlot(slotIndex);
                const selectedCalendar = calendars.find((c) => c.id === selectedId);

                return (
                  <div
                    key={slotIndex}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-sm">
                      {slotIndex + 1}
                    </div>
                    <div className="flex-1">
                      <select
                        value={selectedId}
                        onChange={(e) => handleSlotChange(slotIndex, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">— Select a calendar —</option>
                        {/* Show currently selected calendar first if it exists */}
                        {selectedCalendar && (
                          <option value={selectedCalendar.id}>
                            {selectedCalendar.summary}
                            {selectedCalendar.primary ? ' (Primary)' : ''}
                          </option>
                        )}
                        {/* Show available calendars */}
                        {availableCalendars
                          .filter((cal) => cal.id !== selectedId)
                          .map((calendar) => (
                            <option key={calendar.id} value={calendar.id}>
                              {calendar.summary}
                              {calendar.primary ? ' (Primary)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    {selectedId && (
                      <button
                        type="button"
                        onClick={() => handleSlotChange(slotIndex, '')}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Clear this slot"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
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
              disabled={saving || filledSlots === 0}
              className={`
                px-6 py-2 rounded-lg font-medium
                transition-all duration-200
                ${
                  saving || filledSlots === 0
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {saving ? 'Saving...' : 'Save Changes'}
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
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-80 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
              </div>
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
