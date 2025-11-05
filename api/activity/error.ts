/**
 * API Route: /api/activity/error
 * Batch logging of errors with proper validation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, getSupabaseAdmin } from '../lib/auth';
import { BatchLogErrorsSchema } from '../lib/validation';
import { z } from 'zod';

const MAX_ERRORS_PER_BATCH = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse and validate request body
    const validatedData = BatchLogErrorsSchema.parse(req.body);

    // Step 3: Additional validation
    if (validatedData.errors.length > MAX_ERRORS_PER_BATCH) {
      return res.status(400).json({ error: `Maximum ${MAX_ERRORS_PER_BATCH} errors per batch` });
    }

    // Step 4: Get action type IDs for better normalization
    const supabase = getSupabaseAdmin();
    const { data: actionTypes } = await supabase
      .from('action_types')
      .select('id, name')
      .eq('is_active', true);

    const actionTypeMap = new Map(
      actionTypes?.map(at => [at.name, at.id]) || []
    );

    // Step 5: Get current session if exists
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
    }

    // Step 6: Prepare errors for batch insert
    const errorsToInsert = validatedData.errors.map(error => ({
      user_id: user.userId,
      session_id: sessionId,
      action_type_id: actionTypeMap.get(error.actionName) || null,
      action_name: error.actionName,
      error_code: error.errorCode || null,
      error_message: error.errorMessage,
      error_stack: error.errorStack || null,
      recovery_action: error.recoveryAction || null,
      error_metadata: error.metadata || {},
      created_at: new Date().toISOString(),
    }));

    // Step 7: Batch insert errors
    const { data: insertedErrors, error: insertError } = await supabase
      .from('action_errors')
      .insert(errorsToInsert)
      .select('id, action_name, created_at');

    if (insertError) {
      console.error('Error inserting errors:', insertError);
      throw insertError;
    }

    // Step 8: Return success response
    return res.status(200).json({
      success: true,
      count: insertedErrors?.length || 0,
      sessionId,
      errors: insertedErrors,
    });

  } catch (error) {
    console.error('Error logging error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: `Validation error: ${error.errors[0].message}` });
    }

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}