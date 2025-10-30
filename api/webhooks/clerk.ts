import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Webhook } from 'svix';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(webhookSecret);

  let evt: any;
  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Initialize Supabase with service role key for admin operations
  // Note: Vercel serverless functions don't use VITE_ prefix
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase environment variables not configured:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey
    });
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Handle webhook events
  const { type, data } = evt;

  try {
    switch (type) {
      case 'user.created':
        // Create new user in Supabase
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: data.id,
            email: data.email_addresses?.[0]?.email_address || null,
            subscription_tier: 'basic', // Default to basic tier (with trial)
            created_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating user:', createError);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        console.log(`User created: ${data.id}`);
        break;

      case 'user.updated':
        // Update user in Supabase
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: data.email_addresses?.[0]?.email_address || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
          return res.status(500).json({ error: 'Failed to update user' });
        }

        console.log(`User updated: ${data.id}`);
        break;

      case 'user.deleted':
        // Delete user from Supabase (CASCADE will handle related data)
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', data.id);

        if (deleteError) {
          console.error('Error deleting user:', deleteError);
          return res.status(500).json({ error: 'Failed to delete user' });
        }

        console.log(`User deleted: ${data.id}`);
        break;

      case 'session.created':
      case 'session.ended':
      case 'session.removed':
      case 'session.revoked':
        // Session events - log but don't need to sync to Supabase
        console.log(`Session event: ${type} for user ${data.user_id}`);
        break;

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
