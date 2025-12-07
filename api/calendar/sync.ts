import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { CalendarListEntry } from '../../src/types/index.js';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    // 1. Delete existing managed calendars for this user
    const { error: deleteError } = await supabase
      .from('managed_calendars')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[Calendar Sync] Error deleting existing calendars');
    }

    // 2. Insert new managed calendars
    const typedCalendars = calendars as CalendarListEntry[];

    const managedCalendarsData = typedCalendars.map((cal) => ({
      user_id: userId,
      calendar_id: cal.id,
      calendar_name: cal.summary,
      is_primary: cal.id === primaryCalendarId || cal.primary || false,
      access_role: cal.accessRole || 'owner',
      created_at: new Date().toISOString(),
    }));

    const { error: calendarsError } = await supabase
      .from('managed_calendars')
      .insert(managedCalendarsData)
      .select();

    if (calendarsError) {
      console.error('[Calendar Sync] Error inserting managed calendars');
      return res.status(500).json({ error: 'Failed to sync calendars' });
    }

    // 3. Create default calendar preferences if they don't exist
    const { data: existingPrefs } = await supabase
      .from('calendar_preferences')
      .select('*')
      .eq('user_id', userId);

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

      const { error: prefsError } = await supabase
        .from('calendar_preferences')
        .insert(preferencesData)
        .select();

      if (prefsError) {
        console.error('[Calendar Sync] Error creating calendar preferences');
        // Don't fail the request if preferences creation fails
      }
    }

    return res.status(200).json({
      success: true,
      calendarsCount: managedCalendarsData.length
    });
  } catch (error) {
    console.error('[Calendar Sync] Internal error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
