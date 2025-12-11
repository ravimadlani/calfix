-- Scheduling Tables Migration
-- Creates schedule_templates and calendar_holds tables with proper RLS policies
-- These tables support the scheduling feature for creating meeting holds

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Schedule Templates Table
-- Stores user-created scheduling templates
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key to users table
    CONSTRAINT schedule_templates_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for schedule_templates
CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_id
    ON public.schedule_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_at
    ON public.schedule_templates(created_at DESC);

-- Comments
COMMENT ON TABLE public.schedule_templates IS 'User-created scheduling templates for quick meeting setup';
COMMENT ON COLUMN public.schedule_templates.config IS 'JSONB containing: meetingPurpose, duration, searchWindowDays, participants[], respectedTimezones[], calendarId';

-- ============================================
-- 2. Calendar Holds Table
-- Tracks calendar hold events created by the scheduling feature
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    meeting_purpose TEXT NOT NULL,
    participants JSONB,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'confirmed', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key to users table
    CONSTRAINT calendar_holds_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for calendar_holds
CREATE INDEX IF NOT EXISTS idx_calendar_holds_user_id
    ON public.calendar_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_holds_status
    ON public.calendar_holds(status);
CREATE INDEX IF NOT EXISTS idx_calendar_holds_start_time
    ON public.calendar_holds(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_holds_end_time
    ON public.calendar_holds(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_holds_event_id
    ON public.calendar_holds(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_holds_user_status_time
    ON public.calendar_holds(user_id, status, end_time);

-- Comments
COMMENT ON TABLE public.calendar_holds IS 'Tracks calendar hold events created by the scheduling feature';
COMMENT ON COLUMN public.calendar_holds.event_id IS 'Google Calendar event ID for the hold';
COMMENT ON COLUMN public.calendar_holds.participants IS 'JSONB array of participant objects: {email, name, timezone?, sendInvite?}';
COMMENT ON COLUMN public.calendar_holds.status IS 'active: hold is live, confirmed: meeting scheduled, canceled: hold removed';

-- ============================================
-- 3. Row Level Security (RLS) Policies
-- Users can only access their own data
-- ============================================

-- Enable RLS on both tables
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_holds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_templates
-- Note: auth.uid() returns the Clerk user ID when using JWT template
CREATE POLICY "Users can view their own templates"
    ON public.schedule_templates
    FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own templates"
    ON public.schedule_templates
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own templates"
    ON public.schedule_templates
    FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own templates"
    ON public.schedule_templates
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- RLS Policies for calendar_holds
CREATE POLICY "Users can view their own holds"
    ON public.calendar_holds
    FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own holds"
    ON public.calendar_holds
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own holds"
    ON public.calendar_holds
    FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own holds"
    ON public.calendar_holds
    FOR DELETE
    USING (auth.uid()::text = user_id);
