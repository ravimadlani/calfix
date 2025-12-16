import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, getSupabaseAdmin } from '../lib/auth.js';

interface UserPreferences {
  user_id: string;
  selected_calendar_ids: string[];
  active_provider: 'google' | 'outlook';
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  home_location: object | null;
  business_hours: object | null;
  notification_preferences: object | null;
  auto_dismiss_alerts: boolean;
  theme: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate request using Clerk JWT
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[User Preferences GET] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      // Return default values if no preferences exist
      const defaults = {
        user_id: userId,
        selected_calendar_ids: [],
        active_provider: 'google',
        onboarding_completed: false,
        onboarding_completed_at: null,
        home_location: null,
        business_hours: null,
        notification_preferences: null,
        auto_dismiss_alerts: false,
        theme: 'light',
      };

      return res.status(200).json(data || defaults);
    } catch (error) {
      console.error('[User Preferences GET] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body;
      const {
        selected_calendar_ids,
        active_provider,
        onboarding_completed,
        home_location,
        business_hours,
        notification_preferences,
        auto_dismiss_alerts,
        theme,
      } = body;

      // Validate selected_calendar_ids against subscription limits
      if (selected_calendar_ids && Array.isArray(selected_calendar_ids)) {
        // Fetch subscription to validate limits
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('[User Preferences PUT] Error fetching user:', userError);
          return res.status(500).json({ error: 'Failed to validate subscription' });
        }

        const tier = userData?.subscription_tier || 'basic';
        let maxCalendars = 1;

        switch (tier) {
          case 'basic':
            maxCalendars = 1;
            break;
          case 'ea':
            maxCalendars = 5;
            break;
          case 'ea_pro':
            maxCalendars = 15;
            break;
        }

        if (selected_calendar_ids.length > maxCalendars) {
          return res.status(400).json({
            error: `Your plan allows ${maxCalendars} calendar(s). You selected ${selected_calendar_ids.length}.`,
          });
        }
      }

      // Build update object with only provided fields
      const updateData: Partial<UserPreferences> = {
        user_id: userId,
      };

      if (selected_calendar_ids !== undefined) {
        updateData.selected_calendar_ids = selected_calendar_ids;
      }
      if (active_provider !== undefined) {
        updateData.active_provider = active_provider;
      }
      if (onboarding_completed !== undefined) {
        updateData.onboarding_completed = onboarding_completed;
        if (onboarding_completed) {
          updateData.onboarding_completed_at = new Date().toISOString();
        }
      }
      if (home_location !== undefined) {
        updateData.home_location = home_location;
      }
      if (business_hours !== undefined) {
        updateData.business_hours = business_hours;
      }
      if (notification_preferences !== undefined) {
        updateData.notification_preferences = notification_preferences;
      }
      if (auto_dismiss_alerts !== undefined) {
        updateData.auto_dismiss_alerts = auto_dismiss_alerts;
      }
      if (theme !== undefined) {
        updateData.theme = theme;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('[User Preferences PUT] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('[User Preferences PUT] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
