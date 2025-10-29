import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

console.log('[Calendar Sync] API endpoint loaded');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Calendar Sync] Handler called');
  console.log('[Calendar Sync] Request received:', {
    method: req.method,
    headers: req.headers,
    bodyKeys: Object.keys(req.body || {}),
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, calendars, primaryCalendarId } = req.body;

  console.log('[Calendar Sync] Request data:', {
    userId,
    calendarsCount: calendars?.length,
    primaryCalendarId,
    firstCalendar: calendars?.[0],
  });

  if (!userId || !calendars) {
    console.error('[Calendar Sync] Missing required fields:', { userId: !!userId, calendars: !!calendars });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Initialize Supabase with service role key
  // Note: Vercel serverless functions don't use VITE_ prefix
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Calendar Sync] Environment check:', {
    hasSupabaseUrl: !!supabaseUrl,
    supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
    hasServiceKey: !!supabaseServiceKey,
    serviceKeyLength: supabaseServiceKey?.length,
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  });

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Calendar Sync] Missing environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      availableEnvKeys: Object.keys(process.env)
    });
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Delete existing managed calendars for this user
    console.log('[Calendar Sync] Deleting existing calendars for user:', userId);
    const { error: deleteError } = await supabase
      .from('managed_calendars')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[Calendar Sync] Error deleting existing calendars:', deleteError);
    }

    // 2. Insert new managed calendars
    const managedCalendarsData = calendars.map((cal: any) => ({
      user_id: userId,
      calendar_id: cal.id,
      calendar_name: cal.summary,
      is_primary: cal.id === primaryCalendarId || cal.primary || false,
      access_role: cal.accessRole || 'owner',
      created_at: new Date().toISOString(),
    }));

    console.log('[Calendar Sync] Inserting managed calendars:', {
      count: managedCalendarsData.length,
      data: managedCalendarsData
    });

    const { error: calendarsError, data: insertedCalendars } = await supabase
      .from('managed_calendars')
      .insert(managedCalendarsData)
      .select();

    if (calendarsError) {
      console.error('[Calendar Sync] Error inserting managed calendars:', calendarsError);
      return res.status(500).json({ error: 'Failed to sync calendars' });
    }

    console.log('[Calendar Sync] Successfully inserted calendars:', insertedCalendars);

    // 3. Create default calendar preferences if they don't exist
    console.log('[Calendar Sync] Checking existing calendar preferences for user:', userId);
    const { data: existingPrefs, error: prefsSelectError } = await supabase
      .from('calendar_preferences')
      .select('*')
      .eq('user_id', userId);

    console.log('[Calendar Sync] Existing preferences:', {
      found: !!existingPrefs,
      count: existingPrefs?.length,
      error: prefsSelectError
    });

    if (!existingPrefs || existingPrefs.length === 0) {
      const preferencesData = {
        user_id: userId,
        calendar_id: primaryCalendarId || calendars[0]?.id || 'primary',
        preferences: {
          work_hours_start: '09:00',
          work_hours_end: '17:00',
          timezone: 'Europe/London',
          buffer_time_minutes: 15,
          auto_add_buffers: false,
          auto_decline_conflicts: false,
          show_travel_time: true,
          show_focus_time: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[Calendar Sync] Creating calendar preferences:', preferencesData);

      const { error: prefsError, data: createdPrefs } = await supabase
        .from('calendar_preferences')
        .insert(preferencesData)
        .select();

      if (prefsError) {
        console.error('[Calendar Sync] Error creating calendar preferences:', prefsError);
        // Don't fail the request if preferences creation fails
      } else {
        console.log('[Calendar Sync] Successfully created preferences:', createdPrefs);
      }
    } else {
      console.log('[Calendar Sync] Preferences already exist, skipping creation');
    }

    return res.status(200).json({
      success: true,
      calendarsCount: managedCalendarsData.length
    });
  } catch (error) {
    console.error('Error syncing calendar data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
