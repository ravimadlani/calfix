/**
 * Calendar Sync Service
 * Syncs Google Calendar data to Supabase after OAuth connection
 */

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

/**
 * Sync user's Google Calendars to Supabase
 */
export const syncCalendarsToSupabase = async (
  userId: string,
  calendars: Calendar[],
  primaryCalendarId?: string
): Promise<void> => {
  console.log('[Client: Calendar Sync] Starting sync with:', {
    userId,
    calendarsCount: calendars.length,
    primaryCalendarId,
    calendars: calendars.map(c => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary,
      accessRole: c.accessRole
    }))
  });

  try {
    const requestBody = {
      userId,
      calendars,
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
