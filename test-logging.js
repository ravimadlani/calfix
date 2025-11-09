// Test script to verify logging is working
import { createClient } from '@supabase/supabase-js';

// Get these from your .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://meimpbgadjlmxszppxrm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testLogging() {
  console.log('Testing Supabase logging connection...');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test user ID (replace with a real one if needed)
  const testUserId = 'user_34npURzdsoJN9TZlcifZ9iyyo5L';

  try {
    // Try to insert a test session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: testUserId,
        started_at: new Date(),
        last_activity_at: new Date()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation failed:', sessionError);
      return;
    }

    console.log('Session created:', session);

    // Try to insert a test action
    const { data: action, error: actionError } = await supabase
      .from('user_actions')
      .insert({
        session_id: session.id,
        user_id: testUserId,
        action_type_id: 'calendar_event_create',
        action_category: 'calendar_operations',
        calendar_id: 'primary',
        time_horizon: 'today',
        client_timestamp: new Date()
      })
      .select();

    if (actionError) {
      console.error('Action logging failed:', actionError);
    } else {
      console.log('Action logged successfully:', action);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogging();