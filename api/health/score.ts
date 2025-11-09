/**
 * API Route: /api/health/score
 * Save health scores and breakdowns with proper validation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateRequest,
  getSupabaseAdmin,
  verifyCalendarAccess
} from '../lib/auth.js';
import { SaveHealthScoreSchema } from '../lib/validation.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse and validate request body
    const validatedData = SaveHealthScoreSchema.parse(req.body);

    // Step 3: Verify calendar access
    const hasAccess = await verifyCalendarAccess(user.userId, validatedData.calendarId);
    if (!hasAccess) {
      return res.status(403).json({ error: `No access to calendar: ${validatedData.calendarId}` });
    }

    const supabase = getSupabaseAdmin();

    // Step 4: Check for existing score for the same period
    const { data: existingScore } = await supabase
      .from('health_scores')
      .select('id')
      .eq('user_id', user.userId)
      .eq('calendar_id', validatedData.calendarId)
      .eq('time_horizon', validatedData.timeHorizon)
      .eq('period_start', validatedData.periodStart)
      .eq('period_end', validatedData.periodEnd)
      .single();

    let healthScoreId: string;

    if (existingScore) {
      // Update existing score
      const { error } = await supabase
        .from('health_scores')
        .update({
          base_score: validatedData.baseScore,
          actual_score: validatedData.actualScore,
          unsnoozed_score: validatedData.unsnoozedScore,
          snoozed_deductions: validatedData.snoozedDeductions || 0,
          total_events: validatedData.totalEvents || 0,
          total_meetings: validatedData.totalMeetings || 0,
          total_hours: validatedData.totalHours || 0,
          calculation_metadata: validatedData.calculationMetadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingScore.id)
        .select()
        .single();

      if (error) throw error;
      healthScoreId = existingScore.id;

      // Delete existing breakdowns to replace with new ones
      if (validatedData.breakdowns && validatedData.breakdowns.length > 0) {
        await supabase
          .from('health_score_breakdowns')
          .delete()
          .eq('health_score_id', healthScoreId);
      }
    } else {
      // Create new score
      const { data: newScore, error } = await supabase
        .from('health_scores')
        .insert({
          user_id: user.userId,
          calendar_id: validatedData.calendarId,
          time_horizon: validatedData.timeHorizon,
          period_start: validatedData.periodStart,
          period_end: validatedData.periodEnd,
          base_score: validatedData.baseScore,
          actual_score: validatedData.actualScore,
          unsnoozed_score: validatedData.unsnoozedScore,
          snoozed_deductions: validatedData.snoozedDeductions || 0,
          total_events: validatedData.totalEvents || 0,
          total_meetings: validatedData.totalMeetings || 0,
          total_hours: validatedData.totalHours || 0,
          calculation_metadata: validatedData.calculationMetadata || {},
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (!newScore) throw new Error('Failed to create health score');

      healthScoreId = newScore.id;
    }

    // Step 5: Insert breakdowns if provided
    if (validatedData.breakdowns && validatedData.breakdowns.length > 0) {
      const breakdownsToInsert = validatedData.breakdowns.map(breakdown => ({
        health_score_id: healthScoreId,
        factor_id: breakdown.factorId,
        occurrences: breakdown.occurrences,
        points_per_occurrence: breakdown.pointsPerOccurrence,
        total_impact: breakdown.totalImpact,
        snoozed_occurrences: breakdown.snoozedOccurrences || 0,
        snoozed_impact: breakdown.snoozedImpact || 0,
        affected_event_ids: breakdown.affectedEventIds || [],
        calculation_details: breakdown.calculationDetails || {},
        created_at: new Date().toISOString(),
      }));

      const { error: breakdownError } = await supabase
        .from('health_score_breakdowns')
        .insert(breakdownsToInsert);

      if (breakdownError) {
        console.error('Error inserting breakdowns:', breakdownError);
        // Don't fail the whole request if breakdowns fail
      }
    }

    // Step 6: Update health score session if exists
    const { data: currentSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (currentSession) {
      // Check if health score session exists
      const { data: healthSession } = await supabase
        .from('health_score_sessions')
        .select('id, initial_scores, actions_taken')
        .eq('user_id', user.userId)
        .eq('session_id', currentSession.id)
        .eq('calendar_id', validatedData.calendarId)
        .single();

      if (healthSession) {
        // Update existing health session
        const finalScores = healthSession.initial_scores || {};
        finalScores[validatedData.timeHorizon] = validatedData.actualScore;

        await supabase
          .from('health_score_sessions')
          .update({
            final_scores: finalScores,
            score_changes: {
              [validatedData.timeHorizon]: {
                initial: healthSession.initial_scores?.[validatedData.timeHorizon] || 100,
                final: validatedData.actualScore,
                change: validatedData.actualScore - (healthSession.initial_scores?.[validatedData.timeHorizon] || 100),
              },
            },
            actions_taken: (healthSession.actions_taken || 0) + 1,
          })
          .eq('id', healthSession.id);
      }
    }

    // Step 7: Return success response
    return res.status(200).json({
      success: true,
      healthScoreId,
      score: validatedData.actualScore,
      timeHorizon: validatedData.timeHorizon,
    });

  } catch (error) {
    console.error('Health score save error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: `Validation error: ${error.issues[0].message}` });
    }

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}