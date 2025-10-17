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
  try {
    const response = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        calendars,
        primaryCalendarId: primaryCalendarId || calendars.find(c => c.primary)?.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync calendars');
    }

    const data = await response.json();
    console.log(`Successfully synced ${data.calendarsCount} calendars to Supabase`);
  } catch (error) {
    console.error('Error syncing calendars:', error);
    throw error;
  }
};
