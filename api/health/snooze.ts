/**
 * API Route: /api/health/snooze
 * Manage health alert snoozes with proper validation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateRequest,
  getSupabaseAdmin,
  verifyCalendarAccess
} from '../lib/auth.js';
import { CreateSnoozeSchema, UpdateSnoozeSchema } from '../lib/validation.js';
import { z } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Route based on HTTP method
    switch (req.method) {
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'GET':
        return handleGet(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Snooze handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse and validate request body
    const validatedData = CreateSnoozeSchema.parse(req.body);

    // Step 3: Verify calendar access
    const hasAccess = await verifyCalendarAccess(user.userId, validatedData.calendarId);
    if (!hasAccess) {
      return res.status(403).json({ error: `No access to calendar: ${validatedData.calendarId}` });
    }

    const supabase = getSupabaseAdmin();

    // Step 4: Check if snooze already exists for this event
    const { data: existingSnooze } = await supabase
      .from('health_alert_snoozes')
      .select('id, is_active')
      .eq('user_id', user.userId)
      .eq('calendar_id', validatedData.calendarId)
      .eq('event_id', validatedData.eventId)
      .eq('is_active', true)
      .single();

    if (existingSnooze) {
      return res.status(400).json({ error: 'Active snooze already exists for this event' });
    }

    // Step 5: Create new snooze
    const { data: newSnooze, error } = await supabase
      .from('health_alert_snoozes')
      .insert({
        user_id: user.userId,
        calendar_id: validatedData.calendarId,
        event_id: validatedData.eventId,
        factor_id: validatedData.factorId || null,
        snooze_reason: validatedData.snoozeReason || null,
        snooze_type: validatedData.snoozeType,
        pattern_id: validatedData.patternId || null,
        expires_at: validatedData.expiresAt || null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Step 6: If pattern-based snooze, track the application
    if (validatedData.snoozeType === 'pattern' && validatedData.patternId && newSnooze) {
      await supabase
        .from('snooze_pattern_applications')
        .insert({
          pattern_id: validatedData.patternId,
          snooze_id: newSnooze.id,
          event_id: validatedData.eventId,
          matched_criteria: {},
          applied_at: new Date().toISOString(),
        });
    }

    // Step 7: Return success response
    return res.status(201).json({
      success: true,
      snooze: newSnooze,
    });

  } catch (error) {
    console.error('Snooze creation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: `Validation error: ${error.issues[0].message}` });
    }

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse and validate request body
    const validatedData = UpdateSnoozeSchema.parse(req.body);

    const supabase = getSupabaseAdmin();

    // Step 3: Verify snooze belongs to user
    const { data: snooze } = await supabase
      .from('health_alert_snoozes')
      .select('id, user_id')
      .eq('id', validatedData.snoozeId)
      .single();

    if (!snooze || snooze.user_id !== user.userId) {
      return res.status(403).json({ error: 'Snooze not found or unauthorized' });
    }

    // Step 4: Update snooze
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.isActive !== undefined) {
      updateData.is_active = validatedData.isActive;
    }
    if (validatedData.expiresAt !== undefined) {
      updateData.expires_at = validatedData.expiresAt;
    }
    if (validatedData.snoozeReason !== undefined) {
      updateData.snooze_reason = validatedData.snoozeReason;
    }

    const { data: updatedSnooze, error } = await supabase
      .from('health_alert_snoozes')
      .update(updateData)
      .eq('id', validatedData.snoozeId)
      .select()
      .single();

    if (error) throw error;

    // Step 5: Return success response
    return res.status(200).json({
      success: true,
      snooze: updatedSnooze,
    });

  } catch (error) {
    console.error('Snooze update error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: `Validation error: ${error.issues[0].message}` });
    }

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Step 1: Authenticate the request
    const user = await authenticateRequest(req);

    // Step 2: Parse query parameters
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const calendarId = url.searchParams.get('calendarId');

    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID required' });
    }

    // Step 3: Verify calendar access
    const hasAccess = await verifyCalendarAccess(user.userId, calendarId);
    if (!hasAccess) {
      return res.status(403).json({ error: `No access to calendar: ${calendarId}` });
    }

    const supabase = getSupabaseAdmin();

    // Step 4: Fetch active snoozes
    const { data: snoozes, error } = await supabase
      .from('health_alert_snoozes')
      .select(`
        *,
        health_score_factors (
          factor_code,
          factor_name,
          category
        )
      `)
      .eq('user_id', user.userId)
      .eq('calendar_id', calendarId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Step 5: Return success response
    return res.status(200).json({
      success: true,
      snoozes: snoozes || [],
    });

  } catch (error) {
    console.error('Snooze fetch error:', error);

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}