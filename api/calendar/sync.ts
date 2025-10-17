import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, calendars, primaryCalendarId } = req.body;

  if (!userId || !calendars) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Initialize Supabase with service role key
  // Note: Vercel serverless functions don't use VITE_ prefix
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey
    });
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Delete existing managed calendars for this user
    await supabase
      .from('managed_calendars')
      .delete()
      .eq('user_id', userId);

    // 2. Insert new managed calendars
    const managedCalendarsData = calendars.map((cal: any) => ({
      user_id: userId,
      calendar_id: cal.id,
      calendar_name: cal.summary,
      is_primary: cal.id === primaryCalendarId || cal.primary || false,
      access_role: cal.accessRole || 'owner',
      created_at: new Date().toISOString(),
    }));

    const { error: calendarsError } = await supabase
      .from('managed_calendars')
      .insert(managedCalendarsData);

    if (calendarsError) {
      console.error('Error inserting managed calendars:', calendarsError);
      return res.status(500).json({ error: 'Failed to sync calendars' });
    }

    // 3. Create default calendar preferences if they don't exist
    const { data: existingPrefs } = await supabase
      .from('calendar_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingPrefs) {
      const { error: prefsError } = await supabase
        .from('calendar_preferences')
        .insert({
          user_id: userId,
          default_calendar_id: primaryCalendarId,
          work_hours_start: '09:00',
          work_hours_end: '17:00',
          timezone: 'Europe/London',
          buffer_time_minutes: 15,
          auto_add_buffers: false,
          auto_decline_conflicts: false,
          show_travel_time: true,
          show_focus_time: true,
          created_at: new Date().toISOString(),
        });

      if (prefsError) {
        console.error('Error creating calendar preferences:', prefsError);
        // Don't fail the request if preferences creation fails
      }
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
