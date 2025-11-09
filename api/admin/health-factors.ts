/**
 * Admin API endpoint for managing health score factors
 * GET: Fetch all health factors with configuration
 * PUT: Update health factor configuration
 * Auth is handled by Clerk in the backend
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, getSupabaseAdmin } from '../lib/auth.js';

/**
 * GET /api/admin/health-factors
 * Fetch all health factors
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication via Clerk
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();

    // Fetch all health factors
    const { data: factors, error } = await supabase
      .from('health_score_factors')
      .select('*')
      .order('factor_name', { ascending: true });

    if (error) {
      console.error('Error fetching health factors:', error);
      return res.status(500).json({ error: 'Failed to fetch health factors' });
    }

    return res.status(200).json({ factors });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/health-factors:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/admin/health-factors
 * Update a health factor configuration
 */
async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication via Clerk
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { factor } = req.body;

    if (!factor || !factor.id) {
      return res.status(400).json({ error: 'Missing required field: factor.id' });
    }

    const supabase = getSupabaseAdmin();

    // Update the health factor
    const updateData: {
      default_points: number;
      is_enabled: boolean;
      updated_at: string;
      aggregation_type?: string;
      max_occurrences?: number | null;
    } = {
      default_points: factor.default_points,
      is_enabled: factor.is_enabled,
      updated_at: new Date().toISOString(),
    };

    // Only include aggregation_type if provided
    if (factor.aggregation_type) {
      updateData.aggregation_type = factor.aggregation_type;
    }

    // Only include max_occurrences if provided (can be null to clear it)
    if (factor.max_occurrences !== undefined) {
      updateData.max_occurrences = factor.max_occurrences;
    }

    const { data, error } = await supabase
      .from('health_score_factors')
      .update(updateData)
      .eq('id', factor.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating health factor:', error);
      return res.status(500).json({ error: 'Failed to update health factor' });
    }

    return res.status(200).json({ factor: data });
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/health-factors:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'PUT') {
    return handlePut(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
