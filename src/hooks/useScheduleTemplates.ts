import { useUser } from '@clerk/clerk-react';
import { useSupabaseClient } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import type { ScheduleTemplate, TemplateConfig } from '../types/scheduling';

export function useScheduleTemplates() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Note: supabase NOT in deps (causes infinite loop)

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (name: string, config: TemplateConfig) => {
    if (!user?.id) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('schedule_templates')
      .insert([{ user_id: user.id, name, config }])
      .select()
      .single();

    if (error) throw error;
    await fetchTemplates();
    return data;
  };

  const updateTemplate = async (templateId: string, updates: { name?: string; config?: TemplateConfig }) => {
    if (!user?.id) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('schedule_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    await fetchTemplates();
    return data;
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from('schedule_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    await fetchTemplates();
  };

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  };
}
