/**
 * Calendar Sync Service
 * Syncs calendar metadata to Supabase after provider connection
 */

import type { CalendarListEntry, CalendarProviderId } from '../types';

interface ProviderSyncPayload {
  providerId: CalendarProviderId;
  calendars: Array<Pick<CalendarListEntry,
    'id' |
    'summary' |
    'primary' |
    'isPrimary' |
    'accessRole' |
    'timeZone' |
    'colorId' |
    'backgroundColor' |
    'foregroundColor'
  >>;
}

/**
 * Sync user's calendars to Supabase
 */
export const syncCalendarsToSupabase = async (
  userId: string,
  providerId: CalendarProviderId,
  calendars: CalendarListEntry[],
  primaryCalendarId?: string
): Promise<void> => {
  console.log('[Client: Calendar Sync] Starting sync with:', {
    userId,
    calendarsCount: calendars.length,
    providerId,
    primaryCalendarId,
    calendars: calendars.map(c => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary,
      accessRole: c.accessRole
    }))
  });

  try {
    const payload: ProviderSyncPayload = {
      providerId,
      calendars: calendars.map(calendar => ({
        id: calendar.id,
        summary: calendar.summary,
        primary: calendar.primary,
        isPrimary: calendar.isPrimary,
        accessRole: calendar.accessRole,
        timeZone: calendar.timeZone,
        colorId: calendar.colorId,
        backgroundColor: calendar.backgroundColor,
        foregroundColor: calendar.foregroundColor
      }))
    };

    const requestBody = {
      userId,
      providerId,
      calendars: payload.calendars,
      primaryCalendarId: primaryCalendarId || calendars.find(c => c.primary)?.id,
    };

    console.log('[Client: Calendar Sync] Sending request to /api/calendar/sync:', requestBody);

    const response = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Client: Calendar Sync] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.error('[Client: Calendar Sync] API Error response:', error);
      throw new Error(error.error || 'Failed to sync calendars');
    }

    const data = await response.json();
    console.log('[Client: Calendar Sync] Success response:', data);
    console.log(`Successfully synced ${data.calendarsCount} calendars to Supabase`);
  } catch (error) {
    console.error('[Client: Calendar Sync] Error syncing calendars:', error);
    console.error('[Client: Calendar Sync] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};
