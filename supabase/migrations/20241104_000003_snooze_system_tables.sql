-- Snooze System Tables Migration
-- Phase 3: Alert snoozing and pattern-based auto-snooze

-- 1. Health Alert Snoozes Table
-- Individual event snoozes
CREATE TABLE IF NOT EXISTS public.health_alert_snoozes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    factor_id UUID NOT NULL REFERENCES public.health_score_factors(id),
    snooze_reason TEXT,
    snooze_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    pattern_id UUID,
    snoozed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_snooze_type CHECK (snooze_type IN ('manual', 'pattern', 'auto'))
);

-- Indexes for health_alert_snoozes
CREATE INDEX idx_alert_snoozes_user ON public.health_alert_snoozes(user_id);
CREATE INDEX idx_alert_snoozes_calendar ON public.health_alert_snoozes(calendar_id);
CREATE INDEX idx_alert_snoozes_event ON public.health_alert_snoozes(event_id);
CREATE INDEX idx_alert_snoozes_factor ON public.health_alert_snoozes(factor_id);
CREATE INDEX idx_alert_snoozes_active ON public.health_alert_snoozes(is_active);
CREATE INDEX idx_alert_snoozes_expires ON public.health_alert_snoozes(expires_at);

-- 2. Health Snooze Patterns Table
-- Pattern-based auto-snoozing rules
CREATE TABLE IF NOT EXISTS public.health_snooze_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255),
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    factor_id UUID REFERENCES public.health_score_factors(id),
    pattern_config JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    auto_expire_days INTEGER,
    created_by VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_pattern_type CHECK (pattern_type IN ('event_title', 'attendee', 'time_range', 'location', 'recurring', 'custom'))
);

-- Indexes for health_snooze_patterns
CREATE INDEX idx_snooze_patterns_user ON public.health_snooze_patterns(user_id);
CREATE INDEX idx_snooze_patterns_calendar ON public.health_snooze_patterns(calendar_id);
CREATE INDEX idx_snooze_patterns_factor ON public.health_snooze_patterns(factor_id);
CREATE INDEX idx_snooze_patterns_type ON public.health_snooze_patterns(pattern_type);
CREATE INDEX idx_snooze_patterns_enabled ON public.health_snooze_patterns(is_enabled);
CREATE INDEX idx_snooze_patterns_config ON public.health_snooze_patterns USING GIN (pattern_config);

-- 3. Snooze Pattern Applications Table
-- Track which events have been auto-snoozed by patterns
CREATE TABLE IF NOT EXISTS public.snooze_pattern_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES public.health_snooze_patterns(id) ON DELETE CASCADE,
    snooze_id UUID NOT NULL REFERENCES public.health_alert_snoozes(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL,
    matched_criteria JSONB,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for snooze_pattern_applications
CREATE INDEX idx_pattern_apps_pattern ON public.snooze_pattern_applications(pattern_id);
CREATE INDEX idx_pattern_apps_snooze ON public.snooze_pattern_applications(snooze_id);
CREATE INDEX idx_pattern_apps_event ON public.snooze_pattern_applications(event_id);
CREATE INDEX idx_pattern_apps_applied ON public.snooze_pattern_applications(applied_at);

-- 4. Snooze Analytics Table
-- Track snooze usage patterns for insights
CREATE TABLE IF NOT EXISTS public.snooze_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_snoozes INTEGER DEFAULT 0,
    manual_snoozes INTEGER DEFAULT 0,
    pattern_snoozes INTEGER DEFAULT 0,
    auto_snoozes INTEGER DEFAULT 0,
    most_snoozed_factor UUID REFERENCES public.health_score_factors(id),
    average_score_improvement DECIMAL(5, 2),
    snooze_by_factor JSONB DEFAULT '{}',
    snooze_by_day JSONB DEFAULT '{}',
    snooze_by_hour JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for snooze_analytics
CREATE INDEX idx_snooze_analytics_user ON public.snooze_analytics(user_id);
CREATE INDEX idx_snooze_analytics_calendar ON public.snooze_analytics(calendar_id);
CREATE INDEX idx_snooze_analytics_period ON public.snooze_analytics(period_start, period_end);

-- Row Level Security (RLS) Policies
ALTER TABLE public.health_alert_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_snooze_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snooze_pattern_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snooze_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_alert_snoozes
CREATE POLICY "Users can view their own snoozes" ON public.health_alert_snoozes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own snoozes" ON public.health_alert_snoozes
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for health_snooze_patterns
CREATE POLICY "Users can view their own patterns" ON public.health_snooze_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own patterns" ON public.health_snooze_patterns
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for snooze_pattern_applications
CREATE POLICY "Users can view their pattern applications" ON public.snooze_pattern_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.health_snooze_patterns
            WHERE health_snooze_patterns.id = snooze_pattern_applications.pattern_id
            AND health_snooze_patterns.user_id = auth.uid()
        )
    );

-- RLS Policies for snooze_analytics
CREATE POLICY "Users can view their snooze analytics" ON public.snooze_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their snooze analytics" ON public.snooze_analytics
    FOR ALL USING (auth.uid() = user_id);

-- Insert example snooze patterns (templates)
INSERT INTO public.health_snooze_patterns
(user_id, pattern_name, pattern_type, factor_id, pattern_config, priority, is_enabled, created_by)
VALUES
-- Note: These are template patterns that would be copied for each user
-- In production, you'd create these via an API when a user enables them
(
    '00000000-0000-0000-0000-000000000000'::UUID, -- Placeholder for template
    'Board Meetings',
    'event_title',
    (SELECT id FROM public.health_score_factors WHERE factor_code = 'back_to_back'),
    '{"title_contains": ["board meeting", "board call", "board review"], "case_sensitive": false}'::JSONB,
    10,
    false,
    'system'
),
(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'Client Calls',
    'event_title',
    (SELECT id FROM public.health_score_factors WHERE factor_code = 'out_of_hours'),
    '{"title_contains": ["client call", "customer meeting", "sales call"], "case_sensitive": false}'::JSONB,
    5,
    false,
    'system'
),
(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'Travel Days',
    'event_title',
    NULL, -- Applies to all factors
    '{"title_contains": ["flight", "travel", "transit"], "case_sensitive": false}'::JSONB,
    20,
    false,
    'system'
),
(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'All-Hands Meetings',
    'attendee',
    (SELECT id FROM public.health_score_factors WHERE factor_code = 'long_meeting'),
    '{"attendee_count_gt": 50}'::JSONB,
    15,
    false,
    'system'
);

-- Create function to auto-expire snoozes
CREATE OR REPLACE FUNCTION expire_old_snoozes()
RETURNS void AS $$
BEGIN
    UPDATE public.health_alert_snoozes
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to apply snooze patterns to new events
CREATE OR REPLACE FUNCTION apply_snooze_patterns(
    p_user_id UUID,
    p_calendar_id VARCHAR(255),
    p_event_id VARCHAR(255),
    p_event_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_pattern RECORD;
    v_matches BOOLEAN;
    v_snooze_id UUID;
    v_snoozes_created INTEGER := 0;
BEGIN
    -- Loop through enabled patterns for this user
    FOR v_pattern IN
        SELECT * FROM public.health_snooze_patterns
        WHERE user_id = p_user_id
        AND (calendar_id = p_calendar_id OR calendar_id IS NULL)
        AND is_enabled = true
        ORDER BY priority DESC
    LOOP
        v_matches := false;

        -- Check pattern match based on type
        CASE v_pattern.pattern_type
            WHEN 'event_title' THEN
                -- Check if event title matches pattern
                IF p_event_data->>'summary' IS NOT NULL THEN
                    -- Pattern matching logic here (simplified)
                    v_matches := true; -- Would implement actual matching
                END IF;

            WHEN 'attendee' THEN
                -- Check attendee-based patterns
                IF p_event_data->'attendees' IS NOT NULL THEN
                    -- Pattern matching logic here
                    v_matches := true; -- Would implement actual matching
                END IF;

            WHEN 'time_range' THEN
                -- Check time-based patterns
                -- Pattern matching logic here
                v_matches := false; -- Would implement actual matching

            -- Add other pattern types as needed
        END CASE;

        -- If pattern matches, create snooze
        IF v_matches THEN
            -- Check if snooze already exists
            IF NOT EXISTS (
                SELECT 1 FROM public.health_alert_snoozes
                WHERE user_id = p_user_id
                AND calendar_id = p_calendar_id
                AND event_id = p_event_id
                AND (factor_id = v_pattern.factor_id OR v_pattern.factor_id IS NULL)
                AND is_active = true
            ) THEN
                -- Create snooze
                INSERT INTO public.health_alert_snoozes
                (user_id, calendar_id, event_id, factor_id, snooze_reason, snooze_type, pattern_id, expires_at)
                VALUES
                (
                    p_user_id,
                    p_calendar_id,
                    p_event_id,
                    v_pattern.factor_id,
                    'Auto-snoozed by pattern: ' || v_pattern.pattern_name,
                    'pattern',
                    v_pattern.id,
                    CASE
                        WHEN v_pattern.auto_expire_days IS NOT NULL
                        THEN NOW() + (v_pattern.auto_expire_days || ' days')::INTERVAL
                        ELSE NULL
                    END
                )
                RETURNING id INTO v_snooze_id;

                -- Record pattern application
                INSERT INTO public.snooze_pattern_applications
                (pattern_id, snooze_id, event_id, matched_criteria)
                VALUES
                (v_pattern.id, v_snooze_id, p_event_id, p_event_data);

                v_snoozes_created := v_snoozes_created + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_snoozes_created;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_alert_snoozes_updated_at BEFORE UPDATE ON public.health_alert_snoozes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snooze_patterns_updated_at BEFORE UPDATE ON public.health_snooze_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snooze_analytics_updated_at BEFORE UPDATE ON public.snooze_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for pattern matching performance
CREATE INDEX idx_alert_snoozes_composite ON public.health_alert_snoozes(user_id, calendar_id, event_id, is_active);

-- Comments for documentation
COMMENT ON TABLE public.health_alert_snoozes IS 'Individual event snoozes to exclude from health score penalties';
COMMENT ON TABLE public.health_snooze_patterns IS 'Pattern-based auto-snoozing rules for systematic exclusions';
COMMENT ON TABLE public.snooze_pattern_applications IS 'Track which events have been auto-snoozed by patterns';
COMMENT ON TABLE public.snooze_analytics IS 'Analytics on snooze usage for insights and recommendations';

COMMENT ON COLUMN public.health_alert_snoozes.snooze_type IS 'manual: user snoozed, pattern: matched a pattern, auto: system suggested';
COMMENT ON COLUMN public.health_snooze_patterns.pattern_type IS 'Type of pattern matching: event_title, attendee, time_range, location, recurring, custom';
COMMENT ON COLUMN public.health_snooze_patterns.pattern_config IS 'JSON configuration for pattern matching logic';
COMMENT ON COLUMN public.health_snooze_patterns.priority IS 'Higher priority patterns are evaluated first';