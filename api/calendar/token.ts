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
import { setCorsHeaders, handleCorsPreflightRequest } from '../lib/cors.js';

type Provider = 'google' | 'outlook';

const PROVIDER_MAP: Record<Provider, string> = {
  google: 'oauth_google',
  outlook: 'oauth_microsoft',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS with origin whitelist
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

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

    // Calculate expiration time
    // Google OAuth tokens typically expire in 1 hour (3600 seconds)
    // Microsoft tokens also typically expire in 1 hour
    // If Clerk provides expiration, use it; otherwise use a conservative 50-minute estimate
    const defaultExpiresIn = 50 * 60; // 50 minutes in seconds (conservative buffer before 1 hour)
    const expiresAt = Date.now() + (defaultExpiresIn * 1000);

    return res.status(200).json({
      access_token: tokenData.token,
      provider,
      scopes: tokenData.scopes,
      token_type: 'Bearer',
      expires_at: expiresAt,
      expires_in: defaultExpiresIn,
    });
  } catch (error) {
    console.error(`[Calendar Token] Failed to get ${provider} token`);
    return res.status(500).json({ error: 'Failed to retrieve token' });
  }
}
