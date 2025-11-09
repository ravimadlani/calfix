-- Core Logging Tables Migration
-- Phase 1: Foundation - Core logging infrastructure

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Sessions Table
-- Tracks user sessions for better analytics
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_sessions
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);

-- 2. Action Types Table
-- Reference table for all possible action types
CREATE TABLE IF NOT EXISTS public.action_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    severity_level VARCHAR(20) DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for action_types
CREATE INDEX idx_action_types_category ON public.action_types(category);
CREATE INDEX idx_action_types_name ON public.action_types(name);

-- 3. User Actions Table (Enhanced)
-- Core logging table for all user actions
CREATE TABLE IF NOT EXISTS public.user_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES public.user_sessions(id),
    action_type_id UUID REFERENCES public.action_types(id),
    action_name VARCHAR(100) NOT NULL,
    action_category VARCHAR(50) NOT NULL,
    calendar_id VARCHAR(255),
    event_id VARCHAR(255),
    attendee_count INTEGER,
    health_score_impact DECIMAL(5, 2),
    time_horizon VARCHAR(20),
    action_metadata JSONB DEFAULT '{}',
    client_timestamp TIMESTAMPTZ,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_actions
CREATE INDEX idx_user_actions_user_id ON public.user_actions(user_id);
CREATE INDEX idx_user_actions_session_id ON public.user_actions(session_id);
CREATE INDEX idx_user_actions_action_type ON public.user_actions(action_type_id);
CREATE INDEX idx_user_actions_calendar_id ON public.user_actions(calendar_id);
CREATE INDEX idx_user_actions_event_id ON public.user_actions(event_id);
CREATE INDEX idx_user_actions_server_timestamp ON public.user_actions(server_timestamp);
CREATE INDEX idx_user_actions_action_name ON public.user_actions(action_name);
CREATE INDEX idx_user_actions_action_category ON public.user_actions(action_category);

-- 4. Action Errors Table
-- Tracks errors that occur during actions
CREATE TABLE IF NOT EXISTS public.action_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES public.user_sessions(id),
    action_type_id UUID REFERENCES public.action_types(id),
    action_name VARCHAR(100) NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    error_stack TEXT,
    recovery_action TEXT,
    error_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for action_errors
CREATE INDEX idx_action_errors_user_id ON public.action_errors(user_id);
CREATE INDEX idx_action_errors_session_id ON public.action_errors(session_id);
CREATE INDEX idx_action_errors_created_at ON public.action_errors(created_at);
CREATE INDEX idx_action_errors_error_code ON public.action_errors(error_code);

-- 5. Calendar Delegate Access Table
-- Tracks which calendars a user has access to
CREATE TABLE IF NOT EXISTS public.calendar_delegate_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255),
    access_level VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, calendar_id)
);

-- Indexes for calendar_delegate_access
CREATE INDEX idx_calendar_delegate_user_id ON public.calendar_delegate_access(user_id);
CREATE INDEX idx_calendar_delegate_calendar_id ON public.calendar_delegate_access(calendar_id);
CREATE INDEX idx_calendar_delegate_last_accessed ON public.calendar_delegate_access(last_accessed_at);

-- Row Level Security (RLS) Policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_delegate_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for action_types (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view action types" ON public.action_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for user_actions
CREATE POLICY "Users can view their own actions" ON public.user_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own actions" ON public.user_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for action_errors
CREATE POLICY "Users can view their own errors" ON public.action_errors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own errors" ON public.action_errors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for calendar_delegate_access
CREATE POLICY "Users can view their own calendar access" ON public.calendar_delegate_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own calendar access" ON public.calendar_delegate_access
    FOR ALL USING (auth.uid() = user_id);

-- Insert initial action types
INSERT INTO public.action_types (name, category, description, severity_level) VALUES
-- Authentication
('auth_sign_in', 'authentication', 'User signed in', 'info'),
('auth_sign_out', 'authentication', 'User signed out', 'info'),
('auth_token_refresh', 'authentication', 'Access token refreshed', 'info'),
('auth_token_refresh_failed', 'authentication', 'Token refresh failed', 'error'),
('auth_session_expired', 'authentication', 'Session expired', 'warning'),

-- Calendar Operations
('calendar_switch', 'calendar_management', 'Switched managed calendar', 'info'),
('calendar_events_fetch', 'calendar_read', 'Fetched calendar events', 'info'),
('calendar_event_create', 'calendar_write', 'Created new event', 'info'),
('calendar_event_update', 'calendar_write', 'Updated existing event', 'info'),
('calendar_event_delete', 'calendar_write', 'Deleted event', 'info'),
('calendar_event_duplicate', 'calendar_write', 'Duplicated event', 'info'),
('calendar_events_batch_update', 'calendar_write', 'Batch updated events', 'info'),
('calendar_events_batch_delete', 'calendar_write', 'Batch deleted events', 'info'),

-- Quick Actions
('quick_action_add_prep', 'quick_action', 'Added prep time', 'info'),
('quick_action_add_wrap', 'quick_action', 'Added wrap-up time', 'info'),
('quick_action_add_travel', 'quick_action', 'Added travel time', 'info'),
('quick_action_add_buffer', 'quick_action', 'Added buffer time', 'info'),
('quick_action_add_focus', 'quick_action', 'Added focus block', 'info'),
('quick_action_add_break', 'quick_action', 'Added break', 'info'),
('quick_action_add_lunch', 'quick_action', 'Added lunch block', 'info'),

-- Meeting Actions
('meeting_reschedule', 'meeting_management', 'Rescheduled meeting', 'info'),
('meeting_attendee_add', 'meeting_management', 'Added attendee', 'info'),
('meeting_attendee_remove', 'meeting_management', 'Removed attendee', 'info'),
('meeting_location_update', 'meeting_management', 'Updated meeting location', 'info'),
('meeting_to_virtual', 'meeting_management', 'Converted to virtual meeting', 'info'),
('meeting_add_zoom', 'meeting_management', 'Added Zoom link', 'info'),
('meeting_add_teams', 'meeting_management', 'Added Teams link', 'info'),
('meeting_add_meet', 'meeting_management', 'Added Google Meet link', 'info'),

-- Workflow Actions
('workflow_double_booking_resolve', 'workflow', 'Resolved double booking', 'warning'),
('workflow_back_to_back_add_buffer', 'workflow', 'Added buffer between meetings', 'info'),
('workflow_gap_fill', 'workflow', 'Filled calendar gap', 'info'),
('workflow_out_of_hours_reschedule', 'workflow', 'Rescheduled out-of-hours meeting', 'warning'),
('workflow_international_add_location', 'workflow', 'Added location for international travel', 'info'),
('workflow_flight_add_travel_block', 'workflow', 'Added travel block for flight', 'info'),

-- Analytics & View Actions
('analytics_view_today', 'analytics', 'Viewed today analytics', 'info'),
('analytics_view_tomorrow', 'analytics', 'Viewed tomorrow analytics', 'info'),
('analytics_view_week', 'analytics', 'Viewed week analytics', 'info'),
('analytics_view_next_week', 'analytics', 'Viewed next week analytics', 'info'),
('analytics_view_month', 'analytics', 'Viewed month analytics', 'info'),
('analytics_view_next_month', 'analytics', 'Viewed next month analytics', 'info'),
('analytics_export', 'analytics', 'Exported analytics data', 'info'),

-- Team Scheduling
('team_schedule_create', 'team_scheduling', 'Created team scheduling request', 'info'),
('team_schedule_find_slots', 'team_scheduling', 'Found available team slots', 'info'),
('team_schedule_book', 'team_scheduling', 'Booked team meeting', 'info'),
('team_schedule_cancel', 'team_scheduling', 'Cancelled team scheduling', 'info'),

-- User Preferences
('preference_theme_change', 'preferences', 'Changed theme preference', 'info'),
('preference_notification_update', 'preferences', 'Updated notification settings', 'info'),
('preference_calendar_settings', 'preferences', 'Updated calendar settings', 'info'),

-- Errors
('error_api_rate_limit', 'error', 'Hit API rate limit', 'error'),
('error_api_permission', 'error', 'Permission denied', 'error'),
('error_api_network', 'error', 'Network error', 'error'),
('error_api_timeout', 'error', 'Request timeout', 'error'),
('error_validation', 'error', 'Validation error', 'warning'),
('error_unknown', 'error', 'Unknown error occurred', 'error');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_action_types_updated_at BEFORE UPDATE ON public.action_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_delegate_updated_at BEFORE UPDATE ON public.calendar_delegate_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.user_sessions IS 'Tracks user sessions for analytics and debugging';
COMMENT ON TABLE public.action_types IS 'Reference table for all possible action types';
COMMENT ON TABLE public.user_actions IS 'Core logging table for all user actions with privacy-first design';
COMMENT ON TABLE public.action_errors IS 'Tracks errors that occur during user actions';
COMMENT ON TABLE public.calendar_delegate_access IS 'Tracks which calendars a user has delegate access to';

COMMENT ON COLUMN public.user_actions.action_metadata IS 'JSONB field for flexible metadata - no PII should be stored here';
COMMENT ON COLUMN public.user_actions.health_score_impact IS 'The impact this action had on the health score at the time';
COMMENT ON COLUMN public.user_actions.time_horizon IS 'Time horizon context: today, tomorrow, week, next_week, month, next_month';