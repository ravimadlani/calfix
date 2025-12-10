import { useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import type { CalendarHold, CreateHoldInput } from '../types/scheduling';
import { useCalendarProvider } from '../context/CalendarProviderContext';

export function useCalendarHolds() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { activeProvider } = useCalendarProvider();
  const [holds, setHolds] = useState<CalendarHold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHolds = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_holds')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setHolds(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Note: supabase NOT in deps (causes infinite loop)

  useEffect(() => {
    fetchHolds();
  }, [fetchHolds]);

  // Single hold creation with DB tracking
  const createHold = async (hold: CreateHoldInput) => {
    if (!user?.id) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('calendar_holds')
      .insert([{ ...hold, user_id: user.id, status: 'active' }])
      .select()
      .single();

    if (error) throw error;
    await fetchHolds();
    return data;
  };

  // Batch insert holds (used by createCalendarHolds in SchedulePage)
  const createHoldsBatch = async (holdsToCreate: CreateHoldInput[]) => {
    if (!user?.id) throw new Error('Not authenticated');

    const holdRecords = holdsToCreate.map(hold => ({
      ...hold,
      user_id: user.id,
      status: 'active'
    }));

    const { data, error } = await supabase
      .from('calendar_holds')
      .insert(holdRecords)
      .select();

    if (error) throw error;
    await fetchHolds();
    return data;
  };

  // Cancel hold: DB first (cheap), then calendar (can fail)
  // Per Kieran review: order matters for rollback
  const cancelHold = async (holdId: string) => {
    const hold = holds.find(h => h.id === holdId);
    if (!hold) throw new Error('Hold not found');

    // Step 1: Update DB first (easy to rollback)
    const { error: dbError } = await supabase
      .from('calendar_holds')
      .update({ status: 'canceled' })
      .eq('id', holdId);

    if (dbError) throw dbError;

    // Step 2: Delete calendar event
    try {
      await activeProvider.calendar.deleteEvent(hold.event_id, hold.calendar_id);
    } catch (calendarError) {
      // Rollback DB change
      await supabase
        .from('calendar_holds')
        .update({ status: 'active' })
        .eq('id', holdId);

      throw calendarError;
    }

    await fetchHolds();
  };

  return {
    holds,
    isLoading,
    error,
    createHold,
    createHoldsBatch,
    cancelHold,
    refetch: fetchHolds
  };
}
