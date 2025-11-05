import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, getSupabaseAdmin } from './lib/auth';
import { SessionOperationSchema } from './lib/validation';
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
    const validatedData = SessionOperationSchema.parse(req.body);

    // Step 3: Get Supabase admin client
    const supabase = getSupabaseAdmin();

    // Step 4: Handle different session operations
    switch (validatedData.operation) {
      case 'create': {
        // Check for existing active session
        const { data: existingSession } = await supabase
          .from('user_sessions')
          .select('id, started_at, last_activity_at')
          .eq('user_id', user.userId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (existingSession) {
          // Check if last activity was within 30 minutes
          const lastActivity = new Date(existingSession.last_activity_at);
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

          if (lastActivity > thirtyMinutesAgo) {
            // Update existing session
            const { data: updated, error } = await supabase
              .from('user_sessions')
              .update({ last_activity_at: new Date().toISOString() })
              .eq('id', existingSession.id)
              .select()
              .single();

            if (error) throw error;
            return res.status(200).json({ session: updated });
          } else {
            // End old session
            await supabase
              .from('user_sessions')
              .update({ ended_at: new Date().toISOString() })
              .eq('id', existingSession.id);
          }
        }

        // Create new session
        const { data: newSession, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.userId,
            user_agent: req.headers['user-agent'],
            ip_address: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
            session_metadata: validatedData.metadata || {},
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ session: newSession });
      }

      case 'update': {
        if (!validatedData.sessionId) {
          return res.status(400).json({ error: 'Session ID required for update' });
        }

        // Verify session belongs to user
        const { data: session } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('id', validatedData.sessionId)
          .eq('user_id', user.userId)
          .single();

        if (!session) {
          return res.status(401).json({ error: 'Session not found or unauthorized' });
        }

        // Update session activity
        const { data: updated, error } = await supabase
          .from('user_sessions')
          .update({
            last_activity_at: new Date().toISOString(),
            session_metadata: validatedData.metadata,
          })
          .eq('id', validatedData.sessionId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ session: updated });
      }

      case 'end': {
        if (!validatedData.sessionId) {
          return res.status(400).json({ error: 'Session ID required for end' });
        }

        // Verify session belongs to user
        const { data: session } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('id', validatedData.sessionId)
          .eq('user_id', user.userId)
          .single();

        if (!session) {
          return res.status(401).json({ error: 'Session not found or unauthorized' });
        }

        // End session
        const { data: ended, error } = await supabase
          .from('user_sessions')
          .update({
            ended_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', validatedData.sessionId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ session: ended });
      }

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    console.error('Session operation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: `Validation error: ${error.errors[0].message}` });
    }

    if (error instanceof Error && error.message === 'Authentication failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}