import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
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
    // Fetch user subscription info
    const { data, error } = await supabase
      .from('users')
      .select('subscription_tier, stripe_customer_id, stripe_subscription_id, trial_ends_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user subscription:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tier = data.subscription_tier || 'trial';

    // Determine calendar limits based on tier
    let maxCalendars = 1;
    let hasMultiCalendarAccess = false;

    switch (tier) {
      case 'trial':
        // Trial users get basic features (1 calendar)
        maxCalendars = 1;
        hasMultiCalendarAccess = false;
        break;
      case 'basic':
        maxCalendars = 1;
        hasMultiCalendarAccess = false;
        break;
      case 'ea':
        maxCalendars = 5;
        hasMultiCalendarAccess = true;
        break;
      case 'ea_pro':
        maxCalendars = 15;
        hasMultiCalendarAccess = true;
        break;
      default:
        maxCalendars = 1;
        hasMultiCalendarAccess = false;
    }

    // Check if trial has expired
    let isTrialExpired = false;
    if (tier === 'trial' && data.trial_ends_at) {
      const trialEndDate = new Date(data.trial_ends_at);
      isTrialExpired = trialEndDate < new Date();
    }

    return res.status(200).json({
      subscriptionTier: tier,
      maxCalendars,
      hasMultiCalendarAccess,
      isTrialExpired,
      trialEndsAt: data.trial_ends_at,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
