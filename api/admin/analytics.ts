/**
 * Admin API endpoint for analytics data
 * GET: Fetch analytics stats, trends, and category distribution
 * Auth is handled by Clerk in the backend
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, getSupabaseAdmin } from '../lib/auth.js';

/**
 * GET /api/admin/analytics
 * Fetch analytics overview data
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication via Clerk
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();

    // Get date ranges for comparison
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch total actions (last 30 days)
    const { count: currentActions } = await supabase
      .from('user_actions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Fetch previous period actions (30-60 days ago)
    const { count: previousActions } = await supabase
      .from('user_actions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    // Calculate trend
    const actionsTrend = previousActions && previousActions > 0
      ? ((currentActions || 0) - previousActions) / previousActions * 100
      : 0;

    // Fetch active users (last 30 days)
    const { data: currentUserSessions } = await supabase
      .from('user_sessions')
      .select('user_id')
      .gte('started_at', thirtyDaysAgo.toISOString());

    const activeUsers = new Set(currentUserSessions?.map(s => s.user_id) || []).size;

    // Fetch previous period users
    const { data: previousUserSessions } = await supabase
      .from('user_sessions')
      .select('user_id')
      .gte('started_at', sixtyDaysAgo.toISOString())
      .lt('started_at', thirtyDaysAgo.toISOString());

    const previousUsers = new Set(previousUserSessions?.map(s => s.user_id) || []).size;
    const usersTrend = previousUsers > 0
      ? (activeUsers - previousUsers) / previousUsers * 100
      : 0;

    // Fetch average health scores
    const { data: currentScores } = await supabase
      .from('health_scores')
      .select('actual_score')
      .gte('calculated_at', thirtyDaysAgo.toISOString());

    const avgHealthScore = currentScores && currentScores.length > 0
      ? currentScores.reduce((sum, s) => sum + (s.actual_score || 0), 0) / currentScores.length
      : 0;

    const { data: previousScores } = await supabase
      .from('health_scores')
      .select('actual_score')
      .gte('calculated_at', sixtyDaysAgo.toISOString())
      .lt('calculated_at', thirtyDaysAgo.toISOString());

    const prevAvgScore = previousScores && previousScores.length > 0
      ? previousScores.reduce((sum, s) => sum + (s.actual_score || 0), 0) / previousScores.length
      : 0;

    const scoreTrend = avgHealthScore - prevAvgScore;

    // Fetch errors
    const { count: totalErrors } = await supabase
      .from('action_errors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    const errorRate = currentActions && currentActions > 0
      ? ((totalErrors || 0) / currentActions) * 100
      : 0;

    // Fetch 7-day trend data
    const trendDays = [];
    for (let i = 6; i >= 0; i--) {
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);

      const { count } = await supabase
        .from('user_actions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      const { count: prevDayCount } = await supabase
        .from('user_actions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(dayStart.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', dayStart.toISOString());

      const trend = prevDayCount && prevDayCount > 0
        ? ((count || 0) - prevDayCount) / prevDayCount * 100
        : 0;

      trendDays.push({
        date: dayEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        actions: count || 0,
        trend: Math.round(trend * 10) / 10,
      });
    }

    // Fetch category distribution
    const { data: actionTypes } = await supabase
      .from('action_types')
      .select('name, category')
      .eq('is_active', true);

    const { data: recentActions } = await supabase
      .from('user_actions')
      .select('action_name')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Create a map of action_name to category
    const actionCategoryMap: Record<string, string> = {};
    actionTypes?.forEach(type => {
      if (type.name && type.category) {
        actionCategoryMap[type.name] = type.category;
      }
    });

    // Count actions by category
    const categoryCounts: Record<string, number> = {};
    recentActions?.forEach(action => {
      const category = action.action_name ? (actionCategoryMap[action.action_name] || 'other') : 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const totalActionsForDistribution = recentActions?.length || 1;
    const categoryDistribution = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category: category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        rawCategory: category, // Keep raw category for color mapping
        count,
        percentage: Math.round((count / totalActionsForDistribution) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      stats: {
        totalActions: currentActions || 0,
        totalActionsTrend: Math.round(actionsTrend * 10) / 10,
        activeUsers,
        activeUsersTrend: Math.round(usersTrend * 10) / 10,
        avgHealthScore: Math.round(avgHealthScore * 10) / 10,
        avgHealthScoreTrend: Math.round(scoreTrend * 10) / 10,
        errorRate: Math.round(errorRate * 10) / 10,
        errorRateTrend: 0,
        totalErrors: totalErrors || 0,
      },
      trendData: trendDays,
      categoryDistribution,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/analytics:', error);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
