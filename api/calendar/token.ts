/**
 * Calendar Token Endpoint
 * GET /api/calendar/token?provider=google|outlook
 *
 * Returns OAuth access tokens from Clerk for the authenticated user.
 * This replaces client-side token management with secure server-side token retrieval.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClerkClient } from '@clerk/backend';
import { authenticateRequest } from '../lib/auth.js';

type Provider = 'google' | 'outlook';

const PROVIDER_MAP: Record<Provider, string> = {
  google: 'oauth_google',
  outlook: 'oauth_microsoft',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  // Get provider from query
  const provider = req.query.provider as Provider;
  if (!provider || !PROVIDER_MAP[provider]) {
    return res.status(400).json({
      error: 'Invalid provider',
      message: 'Use "google" or "outlook"'
    });
  }

  // Get OAuth token from Clerk
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  try {
    const response = await clerk.users.getUserOauthAccessToken(
      user.userId,
      PROVIDER_MAP[provider]
    );

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({
        error: 'No token found',
        message: `User has not connected ${provider} calendar. Please sign in with ${provider === 'google' ? 'Google' : 'Microsoft'} to connect your calendar.`
      });
    }

    const tokenData = response.data[0];

    return res.status(200).json({
      access_token: tokenData.token,
      provider,
      scopes: tokenData.scopes,
    });
  } catch (error) {
    console.error(`[Calendar Token] Failed to get ${provider} token`);
    return res.status(500).json({ error: 'Failed to retrieve token' });
  }
}
