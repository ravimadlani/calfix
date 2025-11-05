/**
 * API Route: /api/activity/log
 * Batch logging of user actions with proper validation and authorization
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateRequest,
  getSupabaseAdmin,
  verifyCalendarAccess,
} from '../lib/auth';
import { BatchLogActionsSchema } from '../lib/validation';
import { z } from 'zod';

const MAX_ACTIONS_PER_BATCH = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse and validate request body
    const validatedData = BatchLogActionsSchema.parse(req.body);

    // Step 3: Additional validation
    if (validatedData.actions.length > MAX_ACTIONS_PER_BATCH) {
      return res.status(400).json({ error: `Maximum ${MAX_ACTIONS_PER_BATCH} actions per batch` });
    }

    // Step 4: Verify calendar access for each unique calendar
    const uniqueCalendarIds = [...new Set(
      validatedData.actions
        .filter(a => a.calendarId)
        .map(a => a.calendarId!)
    )];

    for (const calendarId of uniqueCalendarIds) {
      const hasAccess = await verifyCalendarAccess(user.userId, calendarId);
      if (!hasAccess) {
        return res.status(403).json({ error: `No access to calendar: ${calendarId}` });
      }
    }

    // Step 5: Get action type IDs for better normalization
    const supabase = getSupabaseAdmin();
    const { data: actionTypes } = await supabase
      .from('action_types')
      .select('id, name')
      .eq('is_active', true);

    const actionTypeMap = new Map(
      actionTypes?.map(at => [at.name, at.id]) || []
    );

    // Step 6: Get or create current session
    let sessionId: string | null = null;

    const { data: currentSession } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (currentSession) {
      sessionId = currentSession.id;

      // Update session activity
      await supabase
        .from('user_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    // Step 7: Prepare actions for batch insert
    const actionsToInsert = validatedData.actions.map(action => ({
      user_id: user.userId,
      session_id: sessionId,
      action_type_id: actionTypeMap.get(action.actionName) || null,
      action_name: action.actionName,
      action_category: action.actionCategory,
      calendar_id: action.calendarId || null,
      event_id: action.eventId || null,
      attendee_count: action.attendeeCount || null,
      health_score_impact: action.healthScoreImpact || null,
      time_horizon: action.timeHorizon || null,
      action_metadata: action.metadata || {},
      client_timestamp: action.clientTimestamp ? new Date(action.clientTimestamp) : null,
      server_timestamp: new Date().toISOString(),
    }));

    // Step 8: Batch insert actions
    const { data: insertedActions, error: insertError } = await supabase
      .from('user_actions')
      .insert(actionsToInsert)
      .select('id, action_name, created_at');

    if (insertError) {
      console.error('Error inserting actions:', insertError);
      throw insertError;
    }

    // Step 9: Track calendar delegate access if needed
    for (const calendarId of uniqueCalendarIds) {
      await supabase
        .from('calendar_delegate_access')
        .upsert({
          user_id: user.userId,
          calendar_id: calendarId,
          access_level: 'write',
          last_accessed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,calendar_id',
        });
    }

    // Step 10: Return success response
    return res.status(200).json({
      success: true,
      count: insertedActions?.length || 0,
      sessionId,
      actions: insertedActions,
    });

  } catch (error) {
    console.error('Activity logging error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: `Validation error: ${error.errors[0].message}` });
    }

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}