/**
 * API Route: /api/health/factors
 * Load health factors with user-specific overrides and patterns
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateRequest,
  getSupabaseAdmin
} from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse query parameters
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const calendarId = url.searchParams.get('calendarId');
    const includeOverrides = url.searchParams.get('includeOverrides') !== 'false';
    const includeSnoozes = url.searchParams.get('includeSnoozes') !== 'false';
    const includePatterns = url.searchParams.get('includePatterns') !== 'false';

    const supabase = getSupabaseAdmin();

    // Step 3: Fetch base health factors
    const { data: factors, error: factorsError } = await supabase
      .from('health_score_factors')
      .select('*')
      .eq('is_enabled', true)
      .order('category', { ascending: true })
      .order('factor_name', { ascending: true });

    if (factorsError) throw factorsError;

    // Step 4: Fetch user overrides if requested
    let overrides = [];
    if (includeOverrides) {
      const overrideQuery = supabase
        .from('user_health_factor_overrides')
        .select('*')
        .eq('user_id', user.userId);

      if (calendarId) {
        overrideQuery.or(`calendar_id.eq.${calendarId},calendar_id.is.null`);
      }

      const { data: overrideData, error: overrideError } = await overrideQuery;
      if (overrideError) {
        console.error('Error fetching overrides:', overrideError);
      } else {
        overrides = overrideData || [];
      }
    }

    // Step 5: Fetch active snoozes if requested
    let snoozes = [];
    if (includeSnoozes) {
      const snoozeQuery = supabase
        .from('health_alert_snoozes')
        .select('*')
        .eq('user_id', user.userId)
        .eq('is_active', true);

      if (calendarId) {
        snoozeQuery.eq('calendar_id', calendarId);
      }

      const { data: snoozeData, error: snoozeError } = await snoozeQuery;
      if (snoozeError) {
        console.error('Error fetching snoozes:', snoozeError);
      } else {
        snoozes = snoozeData || [];
      }
    }

    // Step 6: Fetch snooze patterns if requested
    let patterns = [];
    if (includePatterns) {
      const patternQuery = supabase
        .from('health_snooze_patterns')
        .select('*')
        .eq('user_id', user.userId)
        .eq('is_enabled', true);

      if (calendarId) {
        patternQuery.or(`calendar_id.eq.${calendarId},calendar_id.is.null`);
      }

      const { data: patternData, error: patternError } = await patternQuery;
      if (patternError) {
        console.error('Error fetching patterns:', patternError);
      } else {
        patterns = patternData || [];
      }
    }

    // Step 7: Merge factors with overrides
    const factorsWithOverrides = (factors || []).map(factor => {
      const override = overrides.find(o => o.factor_id === factor.id);

      if (override) {
        return {
          ...factor,
          // Override values if specified
          default_points: override.override_points ?? factor.default_points,
          aggregation_type: override.override_aggregation_type ?? factor.aggregation_type,
          max_occurrences: override.override_max_occurrences ?? factor.max_occurrences,
          is_disabled: override.is_disabled ?? false,
          override_reason: override.reason,
          has_override: true,
        };
      }

      return {
        ...factor,
        has_override: false,
      };
    });

    // Step 8: Return comprehensive response
    return res.status(200).json({
      success: true,
      factors: factorsWithOverrides,
      overrides,
      snoozes,
      patterns,
      stats: {
        totalFactors: factors?.length || 0,
        activeOverrides: overrides.length,
        activeSnoozes: snoozes.length,
        activePatterns: patterns.length,
      },
    });

  } catch (error) {
    console.error('Health factors fetch error:', error);

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}