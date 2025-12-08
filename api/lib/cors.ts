/**
 * CORS Configuration
 * Whitelist of allowed origins for API endpoints
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed origins - production domains and localhost for development
const ALLOWED_ORIGINS = [
  'https://calendarzero.com',
  'https://www.calendarzero.com',
  'https://calfix-new-ravis-projects-1b880e50.vercel.app',
  'https://calfix-new-git-main-ravis-projects-1b880e50.vercel.app',
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Preview deployments pattern (Vercel preview URLs)
const VERCEL_PREVIEW_PATTERN = /^https:\/\/calfix-[\w-]+\.vercel\.app$/;

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // Check exact match
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check Vercel preview deployments
  if (VERCEL_PREVIEW_PATTERN.test(origin)) {
    return true;
  }

  return false;
}

/**
 * Set CORS headers for API responses
 * @param req - The incoming request
 * @param res - The outgoing response
 * @param allowCredentials - Whether to allow credentials (default: true)
 * @returns The allowed origin or null if not allowed
 */
export function setCorsHeaders(
  req: VercelRequest,
  res: VercelResponse,
  allowCredentials = true
): string | null {
  const origin = req.headers.origin;

  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  return isOriginAllowed(origin) ? origin! : null;
}

/**
 * Handle CORS preflight OPTIONS request
 * @param req - The incoming request
 * @param res - The outgoing response
 * @returns true if this was an OPTIONS request (handled), false otherwise
 */
export function handleCorsPreflightRequest(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}
