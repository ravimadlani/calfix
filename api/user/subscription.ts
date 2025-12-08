import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate request using Clerk JWT
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Use authenticated user's ID - don't allow accessing other users' subscriptions
  const requestedUserId = req.query.userId as string;
  if (requestedUserId && requestedUserId !== user.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userId = user.userId;

  // Initialize Supabase with service role key
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[User Subscription] Database not configured');
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

    // Get the actual subscription tier (defaults to 'basic' per our migration)
    const tier = data.subscription_tier || 'basic';

    // Check if user is in trial period
    let isInTrial = false;
    let isTrialExpired = false;
    let daysLeftInTrial = 0;

    if (data.trial_ends_at) {
      const trialEndDate = new Date(data.trial_ends_at);
      const now = new Date();

      if (trialEndDate > now) {
        isInTrial = true;
        // Calculate days left in trial
        daysLeftInTrial = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        isTrialExpired = true;
      }
    }

    // Determine calendar limits based on tier
    let maxCalendars = 1;
    let hasMultiCalendarAccess = false;

    switch (tier) {
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
        // Default to basic tier limits
        maxCalendars = 1;
        hasMultiCalendarAccess = false;
    }

    // Only limit access if on basic tier with expired trial and no active subscription
    // Users with ea or ea_pro tiers should always have access regardless of Stripe status
    if (tier === 'basic' && isTrialExpired && !data.stripe_subscription_id) {
      maxCalendars = 0;  // No access after trial without subscription for basic tier
      hasMultiCalendarAccess = false;
    }

    return res.status(200).json({
      subscriptionTier: tier,
      maxCalendars,
      hasMultiCalendarAccess,
      isInTrial,
      isTrialExpired,
      daysLeftInTrial,
      trialEndsAt: data.trial_ends_at,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
