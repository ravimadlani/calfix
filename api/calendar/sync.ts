import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { CalendarListEntry } from '../../src/types/index.js';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth.js';
import { setCorsHeaders, handleCorsPreflightRequest } from '../lib/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS with origin whitelist
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate request using Clerk JWT
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { calendars, primaryCalendarId } = req.body;

  if (!calendars) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Use authenticated user's ID instead of body.userId
  const userId = user.userId;

  // Initialize Supabase with service role key
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Calendar Sync] Database not configured');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get current calendar IDs from the request
    const typedCalendars = calendars as CalendarListEntry[];
    const calendarIds = typedCalendars.map(cal => cal.id);

    // 1. Upsert calendars (atomic operation using UNIQUE constraint on user_id + calendar_id)
    const managedCalendarsData = typedCalendars.map((cal) => ({
      user_id: userId,
      calendar_id: cal.id,
      calendar_name: cal.summary,
      is_primary: cal.id === primaryCalendarId || cal.primary || false,
      access_role: cal.accessRole || 'owner',
      created_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from('managed_calendars')
      .upsert(managedCalendarsData, {
        onConflict: 'user_id,calendar_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('[Calendar Sync] Error upserting managed calendars:', upsertError.message);
      return res.status(500).json({ error: 'Failed to sync calendars' });
    }

    // 2. Remove calendars that are no longer in the user's calendar list
    // This is safe because we've already upserted the new ones
    const { error: cleanupError } = await supabase
      .from('managed_calendars')
      .delete()
      .eq('user_id', userId)
      .not('calendar_id', 'in', `(${calendarIds.map(id => `"${id}"`).join(',')})`);

    if (cleanupError) {
      // Log but don't fail - the upsert succeeded
      console.error('[Calendar Sync] Warning: cleanup of old calendars failed:', cleanupError.message);
    }

    // 3. Create default calendar preferences if they don't exist
    let preferencesCreated = false;
    let preferencesWarning: string | null = null;

    const { data: existingPrefs, error: prefsQueryError } = await supabase
      .from('calendar_preferences')
      .select('*')
      .eq('user_id', userId);

    if (prefsQueryError) {
      console.error('[Calendar Sync] Error checking existing preferences:', prefsQueryError.message);
      preferencesWarning = 'Could not verify calendar preferences';
    } else if (!existingPrefs || existingPrefs.length === 0) {
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

      const { error: prefsError } = await supabase
        .from('calendar_preferences')
        .insert(preferencesData)
        .select();

      if (prefsError) {
        console.error('[Calendar Sync] Error creating calendar preferences:', prefsError.message);
        preferencesWarning = 'Calendar preferences could not be initialized';
      } else {
        preferencesCreated = true;
      }
    }

    // Return success with any warnings
    return res.status(200).json({
      success: true,
      calendarsCount: managedCalendarsData.length,
      preferencesCreated,
      ...(preferencesWarning && { warning: preferencesWarning }),
    });
  } catch (error) {
    console.error('[Calendar Sync] Internal error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
