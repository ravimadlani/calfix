-- Health Score Tables Migration
-- Phase 2: Health score tracking and configuration

-- 1. Health Score Factors Configuration Table
-- Configurable health score factors
CREATE TABLE IF NOT EXISTS public.health_score_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factor_code VARCHAR(50) NOT NULL UNIQUE,
    factor_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    default_points DECIMAL(5, 2) NOT NULL,
    aggregation_type VARCHAR(20) NOT NULL DEFAULT 'per_occurrence',
    max_occurrences INTEGER,
    is_enabled BOOLEAN DEFAULT true,
    is_penalty BOOLEAN DEFAULT true,
    implementation_status VARCHAR(20) DEFAULT 'planned',
    detection_logic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_aggregation_type CHECK (aggregation_type IN ('per_occurrence', 'once_per_period', 'capped'))
);

-- Indexes for health_score_factors
CREATE INDEX idx_health_factors_code ON public.health_score_factors(factor_code);
CREATE INDEX idx_health_factors_category ON public.health_score_factors(category);
CREATE INDEX idx_health_factors_enabled ON public.health_score_factors(is_enabled);

-- 2. User Health Factor Overrides
-- User-specific overrides for health factors
CREATE TABLE IF NOT EXISTS public.user_health_factor_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255),
    factor_id UUID NOT NULL REFERENCES public.health_score_factors(id),
    override_points DECIMAL(5, 2),
    override_aggregation_type VARCHAR(20),
    override_max_occurrences INTEGER,
    is_disabled BOOLEAN DEFAULT false,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, calendar_id, factor_id)
);

-- Indexes for user_health_factor_overrides
CREATE INDEX idx_health_overrides_user ON public.user_health_factor_overrides(user_id);
CREATE INDEX idx_health_overrides_calendar ON public.user_health_factor_overrides(calendar_id);
CREATE INDEX idx_health_overrides_factor ON public.user_health_factor_overrides(factor_id);

-- 3. Health Scores Table
-- Stores calculated health scores
CREATE TABLE IF NOT EXISTS public.health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    time_horizon VARCHAR(20) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    base_score DECIMAL(5, 2) NOT NULL DEFAULT 100,
    actual_score DECIMAL(5, 2) NOT NULL,
    unsnoozed_score DECIMAL(5, 2) NOT NULL,
    snoozed_deductions DECIMAL(5, 2) DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    total_meetings INTEGER DEFAULT 0,
    total_hours DECIMAL(5, 2) DEFAULT 0,
    calculation_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for health_scores
CREATE INDEX idx_health_scores_user ON public.health_scores(user_id);
CREATE INDEX idx_health_scores_calendar ON public.health_scores(calendar_id);
CREATE INDEX idx_health_scores_horizon ON public.health_scores(time_horizon);
CREATE INDEX idx_health_scores_period ON public.health_scores(period_start, period_end);
CREATE INDEX idx_health_scores_created ON public.health_scores(created_at);

-- 4. Health Score Breakdowns
-- Detailed breakdown of health score calculations
CREATE TABLE IF NOT EXISTS public.health_score_breakdowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_score_id UUID NOT NULL REFERENCES public.health_scores(id) ON DELETE CASCADE,
    factor_id UUID NOT NULL REFERENCES public.health_score_factors(id),
    occurrences INTEGER NOT NULL DEFAULT 0,
    points_per_occurrence DECIMAL(5, 2) NOT NULL,
    total_impact DECIMAL(5, 2) NOT NULL,
    snoozed_occurrences INTEGER DEFAULT 0,
    snoozed_impact DECIMAL(5, 2) DEFAULT 0,
    affected_event_ids TEXT[],
    calculation_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for health_score_breakdowns
CREATE INDEX idx_health_breakdown_score ON public.health_score_breakdowns(health_score_id);
CREATE INDEX idx_health_breakdown_factor ON public.health_score_breakdowns(factor_id);

-- 5. Health Score Sessions
-- Links health scores to user sessions
CREATE TABLE IF NOT EXISTS public.health_score_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES public.user_sessions(id),
    calendar_id VARCHAR(255) NOT NULL,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    initial_scores JSONB NOT NULL,
    final_scores JSONB,
    score_changes JSONB,
    actions_taken INTEGER DEFAULT 0,
    improvements_made INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for health_score_sessions
CREATE INDEX idx_health_sessions_user ON public.health_score_sessions(user_id);
CREATE INDEX idx_health_sessions_session ON public.health_score_sessions(session_id);
CREATE INDEX idx_health_sessions_calendar ON public.health_score_sessions(calendar_id);
CREATE INDEX idx_health_sessions_start ON public.health_score_sessions(session_start);

-- 6. Action Health Impacts
-- Tracks the health score impact of specific actions
CREATE TABLE IF NOT EXISTS public.action_health_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES public.user_actions(id) ON DELETE CASCADE,
    health_score_id UUID REFERENCES public.health_scores(id),
    time_horizon VARCHAR(20) NOT NULL,
    score_before DECIMAL(5, 2),
    score_after DECIMAL(5, 2),
    net_impact DECIMAL(5, 2),
    factors_affected JSONB DEFAULT '[]',
    impact_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for action_health_impacts
CREATE INDEX idx_health_impacts_action ON public.action_health_impacts(action_id);
CREATE INDEX idx_health_impacts_score ON public.action_health_impacts(health_score_id);
CREATE INDEX idx_health_impacts_horizon ON public.action_health_impacts(time_horizon);
CREATE INDEX idx_health_impacts_created ON public.action_health_impacts(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE public.health_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_health_factor_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_score_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_score_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_health_impacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_score_factors (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view health factors" ON public.health_score_factors
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for user_health_factor_overrides
CREATE POLICY "Users can view their own overrides" ON public.user_health_factor_overrides
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own overrides" ON public.user_health_factor_overrides
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for health_scores
CREATE POLICY "Users can view their own scores" ON public.health_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON public.health_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for health_score_breakdowns
CREATE POLICY "Users can view their own breakdowns" ON public.health_score_breakdowns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.health_scores
            WHERE health_scores.id = health_score_breakdowns.health_score_id
            AND health_scores.user_id = auth.uid()
        )
    );

-- RLS Policies for health_score_sessions
CREATE POLICY "Users can view their own sessions" ON public.health_score_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON public.health_score_sessions
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for action_health_impacts
CREATE POLICY "Users can view their own impacts" ON public.action_health_impacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_actions
            WHERE user_actions.id = action_health_impacts.action_id
            AND user_actions.user_id = auth.uid()
        )
    );

-- Insert initial health score factors
INSERT INTO public.health_score_factors
(factor_code, factor_name, category, description, default_points, aggregation_type, max_occurrences, is_penalty, implementation_status)
VALUES
-- Currently Implemented Factors (from healthCalculator.ts)
('back_to_back', 'Back-to-Back Meetings', 'scheduling', 'Consecutive meetings without buffer time', -15.00, 'per_occurrence', NULL, true, 'implemented'),
('insufficient_buffer', 'Insufficient Buffer', 'scheduling', 'Less than 10 minutes between meetings', -8.00, 'per_occurrence', NULL, true, 'implemented'),
('focus_block', 'Focus Time Block', 'productivity', '60-120 minute gap for deep work', 8.00, 'per_occurrence', 5, false, 'implemented'),
('meeting_overload_6h', 'Meeting Overload (6+ hours)', 'workload', 'More than 6 hours of meetings in a day', -10.00, 'once_per_period', NULL, true, 'implemented'),
('meeting_overload_8h', 'Meeting Overload (8+ hours)', 'workload', 'More than 8 hours of meetings in a day', -20.00, 'once_per_period', NULL, true, 'implemented'),

-- Detected but Not Scored (from calendarAnalytics.ts)
('double_booking', 'Double Booking', 'conflict', 'Overlapping meetings with attendees', -20.00, 'per_occurrence', NULL, true, 'detected_only'),
('out_of_hours', 'Out of Hours Meeting', 'work_life_balance', 'Meetings outside business hours', -10.00, 'per_occurrence', NULL, true, 'detected_only'),
('long_meeting', 'Long Meeting (3+ hours)', 'meeting_health', 'Single meeting longer than 3 hours', -5.00, 'per_occurrence', NULL, true, 'detected_only'),
('early_morning', 'Early Morning Meeting', 'work_life_balance', 'Meeting before 8 AM', -5.00, 'per_occurrence', NULL, true, 'detected_only'),
('late_evening', 'Late Evening Meeting', 'work_life_balance', 'Meeting after 6 PM', -5.00, 'per_occurrence', NULL, true, 'detected_only'),
('international_flight_no_location', 'International Flight Missing Location', 'travel', 'International flight without location event', -10.00, 'per_occurrence', NULL, true, 'detected_only'),
('flight_no_travel_block', 'Flight Without Travel Block', 'travel', 'Flight without travel/transit time blocked', -8.00, 'per_occurrence', NULL, true, 'detected_only'),

-- Future Factors (not yet implemented)
('weekend_meeting', 'Weekend Meeting', 'work_life_balance', 'Meetings on Saturday or Sunday', -15.00, 'per_occurrence', NULL, true, 'planned'),
('no_lunch_break', 'No Lunch Break', 'wellbeing', 'No break scheduled between 11 AM and 2 PM', -10.00, 'once_per_period', NULL, true, 'planned'),
('calendar_fragmentation', 'Calendar Fragmentation', 'productivity', 'Many small gaps between meetings', -12.00, 'once_per_period', NULL, true, 'planned'),
('meeting_preparation', 'Proper Meeting Prep', 'productivity', 'Meetings with prep time scheduled', 5.00, 'per_occurrence', 10, false, 'planned'),
('meeting_follow_up', 'Meeting Follow-up Time', 'productivity', 'Meetings with follow-up time scheduled', 5.00, 'per_occurrence', 10, false, 'planned'),
('timezone_alignment', 'Timezone Optimization', 'travel', 'Meetings aligned with current timezone', 10.00, 'once_per_period', NULL, false, 'planned');

-- Create triggers for updated_at
CREATE TRIGGER update_health_factors_updated_at BEFORE UPDATE ON public.health_score_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_overrides_updated_at BEFORE UPDATE ON public.user_health_factor_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_scores_updated_at BEFORE UPDATE ON public.health_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.health_score_factors IS 'Configurable health score factors with aggregation rules';
COMMENT ON TABLE public.user_health_factor_overrides IS 'User-specific overrides for health score factors';
COMMENT ON TABLE public.health_scores IS 'Calculated health scores with snooze support';
COMMENT ON TABLE public.health_score_breakdowns IS 'Detailed breakdown of health score calculations';
COMMENT ON TABLE public.health_score_sessions IS 'Links health scores to user sessions for tracking improvements';
COMMENT ON TABLE public.action_health_impacts IS 'Tracks the health score impact of specific user actions';

COMMENT ON COLUMN public.health_scores.actual_score IS 'The actual score after applying snoozes';
COMMENT ON COLUMN public.health_scores.unsnoozed_score IS 'The raw score without any snoozes applied';
COMMENT ON COLUMN public.health_score_factors.aggregation_type IS 'per_occurrence: each instance counts, once_per_period: only counts once, capped: limited by max_occurrences';
COMMENT ON COLUMN public.health_score_factors.implementation_status IS 'implemented: fully working, detected_only: detected but not scored, planned: future implementation';