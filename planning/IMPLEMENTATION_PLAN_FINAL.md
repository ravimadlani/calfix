# Final Implementation Plan: Logging & Health Scoring System

## Executive Summary
Complete implementation plan for user action logging and configurable health scoring with snooze system. Estimated timeline: 4-5 weeks for full implementation.

---

## PHASE 1: DATABASE FOUNDATION (Week 1)
**Goal:** Set up all database tables and migrations

### Day 1-2: Core Logging Tables

#### 1.1 Create Migration Files
```bash
# Create migration files in Supabase
supabase migration new create_logging_tables
supabase migration new create_health_score_tables
supabase migration new create_snooze_tables
```

#### 1.2 Core Logging Tables Migration
```sql
-- Migration: 001_create_logging_tables.sql

-- 1. Enhanced user_actions table (update existing)
ALTER TABLE user_actions
    ADD COLUMN IF NOT EXISTS action_category TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS action_status TEXT NOT NULL DEFAULT 'initiated',
    ADD COLUMN IF NOT EXISTS target_calendar_id TEXT,
    ADD COLUMN IF NOT EXISTS workflow_id TEXT,
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS events_affected INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
    ADD COLUMN IF NOT EXISTS error_code TEXT,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS request_params JSONB,
    ADD COLUMN IF NOT EXISTS response_data JSONB,
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS ip_hash TEXT,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    -- Health score tracking columns
    ADD COLUMN IF NOT EXISTS health_impact_score INTEGER,
    ADD COLUMN IF NOT EXISTS health_horizons_affected TEXT[],
    ADD COLUMN IF NOT EXISTS health_flags_resolved TEXT[],
    ADD COLUMN IF NOT EXISTS health_flags_created TEXT[];

-- 2. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_actions INTEGER DEFAULT 0,
    total_time_saved_minutes INTEGER DEFAULT 0,
    ip_hash TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create action_types reference table
CREATE TABLE IF NOT EXISTS action_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    action_type TEXT NOT NULL UNIQUE,
    description TEXT,
    expected_duration_ms INTEGER,
    time_saved_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, action_type)
);

-- 4. Create action_errors table
CREATE TABLE IF NOT EXISTS action_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_id UUID REFERENCES user_actions(id) ON DELETE CASCADE,
    error_type TEXT NOT NULL,
    error_code TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_calendar_id ON user_actions(calendar_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_category ON user_actions(action_category);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_session_id ON user_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_status ON user_actions(action_status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_action_errors_action_id ON action_errors(action_id);
CREATE INDEX IF NOT EXISTS idx_action_errors_error_type ON action_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_action_errors_created_at ON action_errors(created_at);

-- 6. Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_errors ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Public can view action types" ON action_types
    FOR SELECT USING (true);

CREATE POLICY "Users can view own action errors" ON action_errors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_actions ua
            WHERE ua.id = action_errors.action_id
            AND ua.user_id = auth.uid()::text
        )
    );
```

### Day 3-4: Health Score Tables

#### 1.3 Health Score Tables Migration
```sql
-- Migration: 002_create_health_score_tables.sql

-- 1. Create health_score_factors configuration table
CREATE TABLE IF NOT EXISTS health_score_factors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factor_key TEXT NOT NULL UNIQUE,
    factor_name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('scheduling', 'meeting_hygiene', 'work_life_balance', 'travel')),

    -- Scoring configuration
    impact_type TEXT NOT NULL DEFAULT 'per_occurrence',
    aggregation_type TEXT NOT NULL DEFAULT 'per_occurrence'
        CHECK (aggregation_type IN ('per_occurrence', 'once_per_period', 'capped')),
    aggregation_limit INTEGER,
    base_impact INTEGER NOT NULL,
    threshold_value DECIMAL,
    threshold_operator TEXT CHECK (threshold_operator IN ('gt', 'lt', 'gte', 'lte', 'eq')),

    -- Control flags
    is_active BOOLEAN DEFAULT true,
    is_positive BOOLEAN DEFAULT false,

    -- User customization
    allow_user_override BOOLEAN DEFAULT false,
    min_impact INTEGER,
    max_impact INTEGER,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user health factor overrides
CREATE TABLE IF NOT EXISTS user_health_factor_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    factor_id UUID NOT NULL REFERENCES health_score_factors(id) ON DELETE CASCADE,
    custom_impact INTEGER,
    is_disabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, factor_id)
);

-- 3. Create health_scores tracking table
CREATE TABLE IF NOT EXISTS health_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,

    -- Time horizon identification
    calculation_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_horizon TEXT NOT NULL CHECK (time_horizon IN
        ('today', 'tomorrow', 'this_week', 'next_week', 'this_month', 'next_month')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Health metrics
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    health_score_unsnoozed INTEGER CHECK (health_score_unsnoozed >= 0 AND health_score_unsnoozed <= 100),
    previous_score INTEGER,
    score_change INTEGER GENERATED ALWAYS AS (health_score - COALESCE(previous_score, health_score)) STORED,

    -- Snooze tracking
    snoozed_penalties INTEGER DEFAULT 0,
    snoozed_event_count INTEGER DEFAULT 0,
    snoozed_factors JSONB,

    -- Flag counts
    back_to_back_count INTEGER DEFAULT 0,
    insufficient_buffer_count INTEGER DEFAULT 0,
    focus_block_count INTEGER DEFAULT 0,
    double_booking_count INTEGER DEFAULT 0,
    out_of_hours_count INTEGER DEFAULT 0,
    declined_meeting_count INTEGER DEFAULT 0,
    missing_video_count INTEGER DEFAULT 0,
    flight_without_location_count INTEGER DEFAULT 0,
    flight_without_travel_count INTEGER DEFAULT 0,
    meeting_hours DECIMAL(5,2) DEFAULT 0,
    total_meetings INTEGER DEFAULT 0,

    -- Metadata
    flags JSONB,
    recommendations JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create health_score_sessions table
CREATE TABLE IF NOT EXISTS health_score_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,

    -- Session timing
    session_type TEXT NOT NULL CHECK (session_type IN ('start', 'end')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Health scores for each horizon
    health_today INTEGER,
    health_tomorrow INTEGER,
    health_this_week INTEGER,
    health_next_week INTEGER,
    health_this_month INTEGER,
    health_next_month INTEGER,

    -- Aggregate improvements (only for 'end' type)
    total_health_improvement INTEGER,
    total_actions_taken INTEGER,
    time_saved_minutes INTEGER,

    -- Top issues
    top_issues JSONB
);

-- 5. Create action_health_impacts table
CREATE TABLE IF NOT EXISTS action_health_impacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_id UUID NOT NULL REFERENCES user_actions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,

    -- Impact details
    impact_type TEXT NOT NULL,
    time_horizon TEXT NOT NULL,

    -- Score changes
    score_before INTEGER NOT NULL,
    score_after INTEGER NOT NULL,
    score_delta INTEGER GENERATED ALWAYS AS (score_after - score_before) STORED,

    -- What changed
    flag_type TEXT,
    flag_count_before INTEGER,
    flag_count_after INTEGER,
    events_modified INTEGER DEFAULT 0,

    -- Metadata
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX idx_health_scores_user_calendar ON health_scores(user_id, calendar_id);
CREATE INDEX idx_health_scores_time ON health_scores(calculation_time);
CREATE INDEX idx_health_scores_horizon ON health_scores(time_horizon);
CREATE INDEX idx_health_scores_period ON health_scores(period_start, period_end);

CREATE INDEX idx_health_sessions_session ON health_score_sessions(session_id);
CREATE INDEX idx_health_sessions_user ON health_score_sessions(user_id);
CREATE INDEX idx_health_sessions_time ON health_score_sessions(recorded_at);

CREATE INDEX idx_action_impacts_action ON action_health_impacts(action_id);
CREATE INDEX idx_action_impacts_user ON action_health_impacts(user_id);
CREATE INDEX idx_action_impacts_type ON action_health_impacts(impact_type);
CREATE INDEX idx_action_impacts_time ON action_health_impacts(created_at);

-- 7. Enable RLS
ALTER TABLE health_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_factor_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_score_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_health_impacts ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
CREATE POLICY "Public can view health factors" ON health_score_factors
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own overrides" ON user_health_factor_overrides
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own health scores" ON health_scores
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own health sessions" ON health_score_sessions
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own health impacts" ON action_health_impacts
    FOR ALL USING (auth.uid()::text = user_id);
```

### Day 5: Snooze System Tables

#### 1.4 Snooze Tables Migration
```sql
-- Migration: 003_create_snooze_tables.sql

-- 1. Create health_alert_snoozes table
CREATE TABLE IF NOT EXISTS health_alert_snoozes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- User & Calendar Context
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,

    -- What is snoozed
    event_id TEXT NOT NULL,
    factor_key TEXT NOT NULL,

    -- Snooze details
    snoozed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snoozed_until TIMESTAMPTZ,
    snooze_reason TEXT,

    -- Event snapshot
    event_summary TEXT,
    event_start TIMESTAMPTZ,
    event_end TIMESTAMPTZ,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, calendar_id, event_id, factor_key)
);

-- 2. Create health_snooze_patterns table
CREATE TABLE IF NOT EXISTS health_snooze_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- User context
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,

    -- Pattern matching
    pattern_type TEXT NOT NULL CHECK (pattern_type IN
        ('title_contains', 'attendee_email', 'recurring_event_id', 'time_range')),
    pattern_value TEXT NOT NULL,
    factor_key TEXT,

    -- Snooze configuration
    auto_snooze BOOLEAN DEFAULT true,
    snooze_duration_days INTEGER,

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX idx_snoozes_user_calendar ON health_alert_snoozes(user_id, calendar_id);
CREATE INDEX idx_snoozes_event ON health_alert_snoozes(event_id);
CREATE INDEX idx_snoozes_factor ON health_alert_snoozes(factor_key);
CREATE INDEX idx_snoozes_active ON health_alert_snoozes(is_active, snoozed_until);

CREATE INDEX idx_patterns_user ON health_snooze_patterns(user_id, calendar_id);
CREATE INDEX idx_patterns_active ON health_snooze_patterns(is_active);

-- 4. Enable RLS
ALTER TABLE health_alert_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_snooze_patterns ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can manage own snoozes" ON health_alert_snoozes
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own patterns" ON health_snooze_patterns
    FOR ALL USING (auth.uid()::text = user_id);

-- 6. Insert default health score factors
INSERT INTO health_score_factors (factor_key, factor_name, description, category,
    aggregation_type, base_impact, is_positive, is_active)
VALUES
    -- Currently implemented and scored
    ('back_to_back', 'Back-to-back meetings', 'Meetings with no buffer between them',
     'scheduling', 'per_occurrence', -15, false, true),
    ('insufficient_buffer', 'Insufficient buffer', 'Less than 10 minutes between meetings',
     'scheduling', 'per_occurrence', -8, false, true),
    ('focus_blocks', 'Focus time blocks', '60-120 minute gaps for deep work',
     'scheduling', 'per_occurrence', 8, true, true),
    ('meeting_overload_6h', 'Meeting overload (6+ hours)', 'More than 6 hours of meetings',
     'work_life_balance', 'once_per_period', -10, false, true),
    ('meeting_overload_8h', 'Meeting overload (8+ hours)', 'More than 8 hours of meetings',
     'work_life_balance', 'once_per_period', -20, false, true),

    -- Detected but not yet scored (inactive by default)
    ('double_booking', 'Double bookings', 'Overlapping meetings',
     'scheduling', 'once_per_period', -25, false, false),
    ('missing_video_links', 'Missing video links', 'Meetings without conference links',
     'meeting_hygiene', 'capped', -3, false, false),
    ('declined_meetings', 'Declined meetings present', 'Declined meetings not removed',
     'meeting_hygiene', 'per_occurrence', -5, false, false),
    ('out_of_hours', 'Out-of-hours meetings', 'Meetings outside business hours',
     'work_life_balance', 'per_occurrence', -12, false, false),
    ('flight_without_location', 'International flight without location', 'Missing timezone context',
     'travel', 'per_occurrence', -10, false, false),
    ('flight_without_travel', 'Flight without travel blocks', 'No buffer for airport time',
     'travel', 'per_occurrence', -8, false, false)
ON CONFLICT (factor_key) DO NOTHING;

-- Set aggregation limit for capped factors
UPDATE health_score_factors
SET aggregation_limit = 5
WHERE factor_key = 'missing_video_links';
```

---

## PHASE 2: CORE SERVICES (Week 2)
**Goal:** Implement logging and health score tracking services

### Day 6-7: Activity Logger Service

#### 2.1 Create Activity Logger (`/src/services/activityLogger.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface LogActionParams {
  category: string;
  actionType: string;
  status?: 'initiated' | 'success' | 'failed' | 'partial';
  calendarId?: string;
  eventId?: string;
  targetCalendarId?: string;
  workflowId?: string;
  eventsAffected?: number;
  timeSavedMinutes?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  requestParams?: Record<string, any>;
  responseData?: Record<string, any>;
  // Health tracking
  healthImpactScore?: number;
  healthHorizonsAffected?: string[];
  healthFlagsResolved?: string[];
  healthFlagsCreated?: string[];
}

class ActivityLogger {
  private static instance: ActivityLogger;
  private sessionId: string;
  private userId: string | null;
  private actionQueue: (LogActionParams & { id: string; timestamp: number })[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private supabase: any;
  private readonly BATCH_INTERVAL = 1000; // 1 second
  private readonly MAX_BATCH_SIZE = 50;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.initializeSession();

    // Set up periodic batch sending
    setInterval(() => this.checkAndSendBatch(), this.BATCH_INTERVAL);

    // Send batch on page unload
    window.addEventListener('beforeunload', () => {
      this.sendBatch(true); // Force synchronous send
    });
  }

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  // Main logging method
  async logAction(params: LogActionParams): Promise<string> {
    const actionId = uuidv4();

    this.actionQueue.push({
      ...params,
      id: actionId,
      timestamp: Date.now()
    });

    // Send immediately if batch is full
    if (this.actionQueue.length >= this.MAX_BATCH_SIZE) {
      await this.sendBatch();
    }

    return actionId;
  }

  // Log with timing
  async logTimedAction<T>(
    params: LogActionParams,
    action: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const actionId = await this.logAction({
      ...params,
      status: 'initiated'
    });

    try {
      const result = await action();

      await this.logAction({
        ...params,
        status: 'success',
        metadata: {
          ...params.metadata,
          actionId,
          durationMs: Date.now() - startTime
        }
      });

      return result;
    } catch (error) {
      await this.logAction({
        ...params,
        status: 'failed',
        errorCode: error.code || 'UNKNOWN',
        errorMessage: this.sanitizeError(error.message),
        metadata: {
          ...params.metadata,
          actionId,
          durationMs: Date.now() - startTime
        }
      });
      throw error;
    }
  }

  // Batch send logs to Supabase
  private async sendBatch(forceSynchronous = false): Promise<void> {
    if (this.actionQueue.length === 0) return;

    const batch = [...this.actionQueue];
    this.actionQueue = [];

    const logs = batch.map(action => ({
      id: action.id,
      user_id: this.userId,
      calendar_id: action.calendarId,
      action_category: action.category,
      action_type: action.actionType,
      action_status: action.status || 'success',
      event_id: action.eventId,
      target_calendar_id: action.targetCalendarId,
      workflow_id: action.workflowId,
      session_id: this.sessionId,
      time_saved_minutes: action.timeSavedMinutes || 0,
      events_affected: action.eventsAffected || 0,
      duration_ms: action.metadata?.durationMs,
      error_code: action.errorCode,
      error_message: action.errorMessage,
      retry_count: action.metadata?.retryCount || 0,
      metadata: this.sanitizeMetadata(action.metadata),
      request_params: this.sanitizeMetadata(action.requestParams),
      response_data: this.sanitizeMetadata(action.responseData),
      health_impact_score: action.healthImpactScore,
      health_horizons_affected: action.healthHorizonsAffected,
      health_flags_resolved: action.healthFlagsResolved,
      health_flags_created: action.healthFlagsCreated,
      user_agent: navigator.userAgent,
      ip_hash: await this.getIpHash(),
      created_at: new Date(action.timestamp).toISOString()
    }));

    if (forceSynchronous) {
      // Use sendBeacon for page unload
      const blob = new Blob([JSON.stringify(logs)], { type: 'application/json' });
      navigator.sendBeacon('/api/logs', blob);
    } else {
      try {
        const { error } = await this.supabase
          .from('user_actions')
          .insert(logs);

        if (error) {
          console.error('Failed to send activity logs:', error);
          this.storeFailedLogs(batch);
        }
      } catch (error) {
        console.error('Error sending activity logs:', error);
        this.storeFailedLogs(batch);
      }
    }
  }

  private checkAndSendBatch(): void {
    if (this.actionQueue.length > 0) {
      const oldestAction = this.actionQueue[0];
      const age = Date.now() - oldestAction.timestamp;

      // Send if oldest action is more than BATCH_INTERVAL old
      if (age >= this.BATCH_INTERVAL) {
        this.sendBatch();
      }
    }
  }

  private sanitizeMetadata(data: any): any {
    if (!data) return null;

    const sanitized = { ...data };
    const piiFields = ['email', 'name', 'phone', 'address', 'summary',
                       'description', 'title', 'attendees', 'location'];

    const removePII = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const cleaned = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        if (piiFields.includes(key.toLowerCase())) {
          // Skip PII fields
          continue;
        } else if (typeof value === 'object') {
          cleaned[key] = removePII(value);
        } else {
          cleaned[key] = value;
        }
      }

      return cleaned;
    };

    return removePII(sanitized);
  }

  private sanitizeError(message: string): string {
    if (!message) return '';

    return message
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]')
      .replace(/\/users\/[^\/\s]+/gi, '/users/[id]')
      .replace(/calendar_[a-zA-Z0-9]+/g, 'calendar_[id]')
      .replace(/event_[a-zA-Z0-9]+/g, 'event_[id]');
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string | null {
    // Try multiple sources for user ID
    return localStorage.getItem('user_id') ||
           sessionStorage.getItem('user_id') ||
           (window as any).currentUser?.id ||
           null;
  }

  private async getIpHash(): Promise<string> {
    // In production, this would call an API to get hashed IP
    // For now, return a placeholder
    return 'ip_hash_placeholder';
  }

  private async initializeSession(): Promise<void> {
    if (!this.userId) return;

    try {
      await this.supabase.from('user_sessions').insert({
        id: this.sessionId,
        user_id: this.userId,
        user_agent: navigator.userAgent,
        ip_hash: await this.getIpHash()
      });

      // Retry failed logs from previous session
      this.retryFailedLogs();
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  private storeFailedLogs(logs: any[]): void {
    const existingLogs = JSON.parse(
      localStorage.getItem('failed_activity_logs') || '[]'
    );
    const allLogs = [...existingLogs, ...logs];

    // Keep only last 100 failed logs
    const trimmedLogs = allLogs.slice(-100);
    localStorage.setItem('failed_activity_logs', JSON.stringify(trimmedLogs));
  }

  async retryFailedLogs(): Promise<void> {
    const failedLogs = JSON.parse(
      localStorage.getItem('failed_activity_logs') || '[]'
    );

    if (failedLogs.length === 0) return;

    localStorage.removeItem('failed_activity_logs');

    for (const log of failedLogs) {
      this.actionQueue.push(log);
    }

    await this.sendBatch();
  }

  async endSession(): Promise<void> {
    if (!this.userId || !this.sessionId) return;

    // Send any remaining logs
    await this.sendBatch();

    // Update session end time
    await this.supabase
      .from('user_sessions')
      .update({
        ended_at: new Date().toISOString(),
        total_actions: this.actionQueue.length
      })
      .eq('id', this.sessionId);
  }
}

export const activityLogger = ActivityLogger.getInstance();
```

### Day 8-9: Health Score Tracker Service

#### 2.2 Create Health Score Tracker (`/src/services/healthScoreTracker.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
import {
  calculateHealthScore,
  countBackToBack,
  countInsufficientBuffers,
  countFocusBlocks,
  calculateTotalMeetingTime,
  detectDoubleBookings,
  findMeetingsWithoutVideoLinks,
  findDeclinedTwoPersonMeetings,
  findMeetingsOutsideBusinessHours,
  findFlightsWithoutTravelBlocks,
  findInternationalFlightsWithoutLocation
} from '../utils/healthCalculator';

interface HealthFactor {
  id: string;
  factor_key: string;
  factor_name: string;
  aggregation_type: 'per_occurrence' | 'once_per_period' | 'capped';
  aggregation_limit?: number;
  base_impact: number;
  is_active: boolean;
  is_positive: boolean;
}

interface HealthScoreSnapshot {
  userId: string;
  calendarId: string;
  timeHorizon: string;
  periodStart: Date;
  periodEnd: Date;
  score: number;
  unSnoozedScore: number;
  flags: Record<string, number>;
  snoozedFactors: Record<string, any>;
  recommendations: string[];
}

interface HealthAlertSnooze {
  event_id: string;
  factor_key: string;
  snoozed_until: string | null;
  is_active: boolean;
}

class HealthScoreTracker {
  private static instance: HealthScoreTracker;
  private supabase: any;
  private factorsCache: Map<string, HealthFactor[]> = new Map();
  private snoozesCache: Map<string, HealthAlertSnooze[]> = new Map();
  private baselineScores: Map<string, Map<string, HealthScoreSnapshot>> = new Map();

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  static getInstance(): HealthScoreTracker {
    if (!HealthScoreTracker.instance) {
      HealthScoreTracker.instance = new HealthScoreTracker();
    }
    return HealthScoreTracker.instance;
  }

  // Get health factors with user overrides
  async getHealthFactors(userId?: string): Promise<HealthFactor[]> {
    const cacheKey = userId || 'default';

    // Check cache
    if (this.factorsCache.has(cacheKey)) {
      return this.factorsCache.get(cacheKey)!;
    }

    // Fetch factors
    const { data: factors, error } = await this.supabase
      .from('health_score_factors')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('factor_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch health factors:', error);
      return this.getDefaultFactors();
    }

    // Apply user overrides if userId provided
    if (userId && factors) {
      const { data: overrides } = await this.supabase
        .from('user_health_factor_overrides')
        .select('*')
        .eq('user_id', userId);

      if (overrides) {
        const overrideMap = new Map(overrides.map(o => [o.factor_id, o]));

        factors.forEach(factor => {
          const override = overrideMap.get(factor.id);
          if (override) {
            if (override.is_disabled) {
              factor.is_active = false;
            }
            if (override.custom_impact !== null) {
              factor.base_impact = override.custom_impact;
            }
          }
        });
      }
    }

    // Cache for 5 minutes
    this.factorsCache.set(cacheKey, factors || []);
    setTimeout(() => this.factorsCache.delete(cacheKey), 5 * 60 * 1000);

    return factors || [];
  }

  // Get active snoozes for user
  async getActiveSnoozes(
    userId: string,
    calendarId: string
  ): Promise<HealthAlertSnooze[]> {
    const cacheKey = `${userId}-${calendarId}`;

    // Check cache
    if (this.snoozesCache.has(cacheKey)) {
      return this.snoozesCache.get(cacheKey)!;
    }

    const { data: snoozes } = await this.supabase
      .from('health_alert_snoozes')
      .select('event_id, factor_key, snoozed_until, is_active')
      .eq('user_id', userId)
      .eq('calendar_id', calendarId)
      .eq('is_active', true);

    const activeSn oozes = (snoozes || []).filter(snooze => {
      if (!snooze.snoozed_until) return true; // Indefinite snooze
      return new Date(snooze.snoozed_until) > new Date();
    });

    // Cache for 1 minute
    this.snoozesCache.set(cacheKey, activeSnoozes);
    setTimeout(() => this.snoozesCache.delete(cacheKey), 60 * 1000);

    return activeSnoozes;
  }

  // Calculate health scores for all time horizons
  async calculateAllHorizons(
    userId: string,
    calendarId: string,
    events: any[]
  ): Promise<Map<string, HealthScoreSnapshot>> {
    const now = new Date();
    const scores = new Map<string, HealthScoreSnapshot>();

    const horizons = [
      {
        key: 'today',
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date(now.setHours(23, 59, 59, 999))
      },
      {
        key: 'tomorrow',
        start: new Date(new Date().setDate(now.getDate() + 1)).setHours(0, 0, 0, 0),
        end: new Date(new Date().setDate(now.getDate() + 1)).setHours(23, 59, 59, 999)
      },
      // Add other horizons...
    ];

    for (const horizon of horizons) {
      const periodEvents = events.filter(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        return eventStart >= horizon.start && eventStart <= horizon.end;
      });

      const snapshot = await this.calculateHealthScore(
        userId,
        calendarId,
        periodEvents,
        horizon.key,
        horizon.start,
        horizon.end
      );

      scores.set(horizon.key, snapshot);
    }

    return scores;
  }

  // Calculate health score with snooze support
  private async calculateHealthScore(
    userId: string,
    calendarId: string,
    events: any[],
    timeHorizon: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HealthScoreSnapshot> {
    const factors = await this.getHealthFactors(userId);
    const snoozes = await this.getActiveSnoozes(userId, calendarId);

    // Create snooze map for quick lookup
    const snoozeMap = new Map<string, boolean>();
    snoozes.forEach(snooze => {
      snoozeMap.set(`${snooze.event_id}-${snooze.factor_key}`, true);
    });

    let actualScore = 100;
    let unSnoozedScore = 100;
    const flags: Record<string, number> = {};
    const snoozedFactors: Record<string, any> = {};

    for (const factor of factors) {
      if (!factor.is_active) continue;

      // Get occurrences
      const occurrences = this.detectOccurrences(events, factor.factor_key);
      flags[factor.factor_key] = occurrences.length;

      // Separate snoozed and active occurrences
      const snoozedOccurrences = occurrences.filter(occ =>
        snoozeMap.has(`${occ.eventId}-${factor.factor_key}`)
      );

      const activeOccurrences = occurrences.filter(occ =>
        !snoozeMap.has(`${occ.eventId}-${factor.factor_key}`)
      );

      // Calculate impacts
      const fullImpact = this.calculateFactorImpact(factor, occurrences.length);
      const activeImpact = this.calculateFactorImpact(factor, activeOccurrences.length);

      unSnoozedScore += fullImpact;
      actualScore += activeImpact;

      // Track snoozed details
      if (snoozedOccurrences.length > 0) {
        snoozedFactors[factor.factor_key] = {
          totalOccurrences: occurrences.length,
          snoozedOccurrences: snoozedOccurrences.length,
          activeOccurrences: activeOccurrences.length,
          pointsRecovered: fullImpact - activeImpact
        };
      }
    }

    // Cap scores
    actualScore = Math.max(0, Math.min(100, Math.round(actualScore)));
    unSnoozedScore = Math.max(0, Math.min(100, Math.round(unSnoozedScore)));

    // Generate recommendations
    const recommendations = this.generateRecommendations(flags, actualScore);

    return {
      userId,
      calendarId,
      timeHorizon,
      periodStart,
      periodEnd,
      score: actualScore,
      unSnoozedScore,
      flags,
      snoozedFactors,
      recommendations
    };
  }

  // Detect occurrences based on factor type
  private detectOccurrences(events: any[], factorKey: string): any[] {
    switch (factorKey) {
      case 'back_to_back':
        return this.getBackToBackEvents(events);
      case 'insufficient_buffer':
        return this.getInsufficientBufferEvents(events);
      case 'focus_blocks':
        return this.getFocusBlockEvents(events);
      case 'double_booking':
        return detectDoubleBookings(events);
      case 'missing_video_links':
        return findMeetingsWithoutVideoLinks(events);
      case 'declined_meetings':
        return findDeclinedTwoPersonMeetings(events);
      case 'out_of_hours':
        return findMeetingsOutsideBusinessHours(events);
      case 'flight_without_location':
        return findInternationalFlightsWithoutLocation(events);
      case 'flight_without_travel':
        return findFlightsWithoutTravelBlocks(events);
      case 'meeting_overload_6h':
        const hours6 = calculateTotalMeetingTime(events);
        return hours6 > 6 ? [{ eventId: 'threshold' }] : [];
      case 'meeting_overload_8h':
        const hours8 = calculateTotalMeetingTime(events);
        return hours8 > 8 ? [{ eventId: 'threshold' }] : [];
      default:
        return [];
    }
  }

  // Helper to get events with IDs
  private getBackToBackEvents(events: any[]): any[] {
    // Implementation would identify specific back-to-back event pairs
    const gaps = analyzeGaps(events);
    return gaps
      .filter(gap => gap.status === 'back-to-back')
      .map(gap => ({ eventId: gap.afterEvent.id, pairedEventId: gap.beforeEvent.id }));
  }

  private getInsufficientBufferEvents(events: any[]): any[] {
    const gaps = analyzeGaps(events);
    return gaps
      .filter(gap => gap.status === 'insufficient-buffer')
      .map(gap => ({ eventId: gap.afterEvent.id, pairedEventId: gap.beforeEvent.id }));
  }

  private getFocusBlockEvents(events: any[]): any[] {
    const gaps = analyzeGaps(events);
    return gaps
      .filter(gap => gap.status === 'focus-block')
      .map(gap => ({ eventId: `gap-${gap.afterEvent.id}-${gap.beforeEvent.id}` }));
  }

  // Calculate impact based on aggregation type
  private calculateFactorImpact(
    factor: HealthFactor,
    occurrenceCount: number
  ): number {
    if (occurrenceCount === 0) return 0;

    switch (factor.aggregation_type) {
      case 'per_occurrence':
        return factor.base_impact * occurrenceCount;

      case 'once_per_period':
        return factor.base_impact;

      case 'capped':
        const cappedCount = Math.min(
          occurrenceCount,
          factor.aggregation_limit || occurrenceCount
        );
        return factor.base_impact * cappedCount;

      default:
        return factor.base_impact * occurrenceCount;
    }
  }

  // Generate recommendations
  private generateRecommendations(
    flags: Record<string, number>,
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (flags.back_to_back > 0) {
      recommendations.push(
        `Add ${flags.back_to_back} buffer blocks between back-to-back meetings`
      );
    }

    if (flags.double_booking > 0) {
      recommendations.push(
        `Resolve ${flags.double_booking} double-booked time slots`
      );
    }

    if (flags.out_of_hours > 0) {
      recommendations.push(
        `Consider rescheduling ${flags.out_of_hours} out-of-hours meetings`
      );
    }

    if (score < 50) {
      recommendations.push(
        'Your calendar needs significant optimization - consider declining non-essential meetings'
      );
    }

    return recommendations;
  }

  // Record session start with health scores
  async recordSessionStart(
    sessionId: string,
    userId: string,
    calendarId: string,
    events: any[]
  ): Promise<void> {
    const scores = await this.calculateAllHorizons(userId, calendarId, events);

    // Store baseline for comparison
    this.baselineScores.set(sessionId, scores);

    // Save to database
    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      calendar_id: calendarId,
      session_type: 'start',
      health_today: scores.get('today')?.score,
      health_tomorrow: scores.get('tomorrow')?.score,
      health_this_week: scores.get('this_week')?.score,
      health_next_week: scores.get('next_week')?.score,
      health_this_month: scores.get('this_month')?.score,
      health_next_month: scores.get('next_month')?.score,
      top_issues: this.identifyTopIssues(scores)
    };

    await this.supabase
      .from('health_score_sessions')
      .insert(sessionData);

    // Store individual snapshots
    for (const [horizon, snapshot] of scores) {
      await this.storeHealthSnapshot(snapshot);
    }
  }

  // Record session end with improvements
  async recordSessionEnd(
    sessionId: string,
    userId: string,
    calendarId: string,
    events: any[],
    totalActions: number,
    timeSaved: number
  ): Promise<void> {
    const scores = await this.calculateAllHorizons(userId, calendarId, events);
    const baseline = this.baselineScores.get(sessionId);

    let totalImprovement = 0;
    if (baseline) {
      for (const [horizon, currentScore] of scores) {
        const baselineScore = baseline.get(horizon);
        if (baselineScore) {
          const improvement = currentScore.score - baselineScore.score;
          if (improvement > 0) totalImprovement += improvement;
        }
      }
    }

    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      calendar_id: calendarId,
      session_type: 'end',
      health_today: scores.get('today')?.score,
      health_tomorrow: scores.get('tomorrow')?.score,
      health_this_week: scores.get('this_week')?.score,
      health_next_week: scores.get('next_week')?.score,
      health_this_month: scores.get('this_month')?.score,
      health_next_month: scores.get('next_month')?.score,
      total_health_improvement: totalImprovement,
      total_actions_taken: totalActions,
      time_saved_minutes: timeSaved,
      top_issues: this.identifyTopIssues(scores)
    };

    await this.supabase
      .from('health_score_sessions')
      .insert(sessionData);

    // Clean up baseline
    this.baselineScores.delete(sessionId);
  }

  // Store health snapshot
  private async storeHealthSnapshot(snapshot: HealthScoreSnapshot): Promise<void> {
    const data = {
      user_id: snapshot.userId,
      calendar_id: snapshot.calendarId,
      time_horizon: snapshot.timeHorizon,
      period_start: snapshot.periodStart,
      period_end: snapshot.periodEnd,
      health_score: snapshot.score,
      health_score_unsnoozed: snapshot.unSnoozedScore,
      snoozed_penalties: snapshot.unSnoozedScore - snapshot.score,
      snoozed_event_count: Object.keys(snapshot.snoozedFactors).reduce(
        (sum, key) => sum + snapshot.snoozedFactors[key].snoozedOccurrences, 0
      ),
      snoozed_factors: snapshot.snoozedFactors,
      back_to_back_count: snapshot.flags.back_to_back || 0,
      insufficient_buffer_count: snapshot.flags.insufficient_buffer || 0,
      focus_block_count: snapshot.flags.focus_blocks || 0,
      double_booking_count: snapshot.flags.double_booking || 0,
      out_of_hours_count: snapshot.flags.out_of_hours || 0,
      declined_meeting_count: snapshot.flags.declined_meetings || 0,
      missing_video_count: snapshot.flags.missing_video_links || 0,
      flight_without_location_count: snapshot.flags.flight_without_location || 0,
      flight_without_travel_count: snapshot.flags.flight_without_travel || 0,
      meeting_hours: snapshot.flags.meeting_hours || 0,
      total_meetings: snapshot.flags.total_meetings || 0,
      flags: snapshot.flags,
      recommendations: snapshot.recommendations
    };

    await this.supabase
      .from('health_scores')
      .insert(data);
  }

  // Identify top issues for session
  private identifyTopIssues(scores: Map<string, HealthScoreSnapshot>): any[] {
    const issues: any[] = [];
    const todayScore = scores.get('today');

    if (todayScore) {
      const flags = todayScore.flags;

      if (flags.back_to_back > 0) {
        issues.push({
          type: 'back_to_back',
          count: flags.back_to_back,
          impact: flags.back_to_back * 15
        });
      }

      if (flags.double_booking > 0) {
        issues.push({
          type: 'double_booking',
          count: flags.double_booking,
          impact: 25
        });
      }

      // Add other issues...
    }

    return issues.sort((a, b) => b.impact - a.impact).slice(0, 3);
  }

  // Get default factors if database fails
  private getDefaultFactors(): HealthFactor[] {
    return [
      {
        id: '1',
        factor_key: 'back_to_back',
        factor_name: 'Back-to-back meetings',
        aggregation_type: 'per_occurrence',
        base_impact: -15,
        is_active: true,
        is_positive: false
      },
      // Add other default factors...
    ];
  }
}

export const healthScoreTracker = HealthScoreTracker.getInstance();
```

---

## PHASE 3: INTEGRATION (Week 3)
**Goal:** Integrate logging into existing code

### Day 10-11: Calendar Operations Integration

#### 3.1 Update Google Calendar Service
```typescript
// In /src/services/providers/google/calendar.ts

import { activityLogger } from '@/services/activityLogger';
import { healthScoreTracker } from '@/services/healthScoreTracker';

// Example: Create buffer event with logging
export const createBufferEvent = async (
  startTime: string,
  duration: number,
  calendarId?: string
): Promise<any> => {
  const actionId = await activityLogger.logAction({
    category: 'event',
    actionType: 'create_buffer_before',
    status: 'initiated',
    calendarId,
    requestParams: { startTime, duration }
  });

  try {
    const event = await makeApiRequest(/* ... */);

    await activityLogger.logAction({
      category: 'event',
      actionType: 'create_buffer_before',
      status: 'success',
      calendarId,
      eventId: event.id,
      timeSavedMinutes: duration,
      eventsAffected: 1,
      responseData: { eventId: event.id },
      metadata: { actionId, duration }
    });

    return event;
  } catch (error) {
    await activityLogger.logAction({
      category: 'event',
      actionType: 'create_buffer_before',
      status: 'failed',
      calendarId,
      errorCode: error.code,
      errorMessage: error.message,
      metadata: { actionId }
    });
    throw error;
  }
};
```

### Day 12-13: UI Components Integration

#### 3.2 Update CalendarDashboard
```typescript
// In /src/components/CalendarDashboard.tsx

import { activityLogger } from '@/services/activityLogger';
import { healthScoreTracker } from '@/services/healthScoreTracker';

// Initialize on mount
useEffect(() => {
  const initializeTracking = async () => {
    // Initialize session
    const sessionId = activityLogger.getSessionId();

    // Record initial health scores
    if (events.length > 0) {
      await healthScoreTracker.recordSessionStart(
        sessionId,
        userId,
        managedCalendarId,
        events
      );
    }

    // Log dashboard load
    await activityLogger.logAction({
      category: 'view',
      actionType: 'dashboard_loaded',
      calendarId: managedCalendarId
    });
  };

  initializeTracking();

  // Cleanup on unmount
  return () => {
    activityLogger.endSession();
  };
}, []);

// Log view changes
const handleViewChange = async (newView: string) => {
  await activityLogger.logAction({
    category: 'view',
    actionType: 'change_view',
    calendarId: managedCalendarId,
    metadata: {
      fromView: currentView,
      toView: newView
    }
  });

  setCurrentView(newView);
  await loadEvents();
};

// Log workflow execution with health tracking
const handleExecuteWorkflow = async (
  workflowType: string,
  selectedEvents: any[]
) => {
  const workflowId = uuidv4();
  const eventsBefore = [...events];

  await activityLogger.logAction({
    category: 'workflow',
    actionType: 'workflow_initiated',
    workflowId,
    metadata: {
      workflowType,
      eventsCount: selectedEvents.length
    }
  });

  try {
    // Execute workflow...

    // Get events after workflow
    const eventsAfter = await loadEvents();

    // Calculate health impact
    const impact = await healthScoreTracker.trackActionImpact(
      workflowId,
      userId,
      managedCalendarId,
      workflowType,
      eventsBefore,
      eventsAfter
    );

    await activityLogger.logAction({
      category: 'workflow',
      actionType: workflowType,
      status: 'success',
      workflowId,
      eventsAffected: selectedEvents.length,
      timeSavedMinutes: calculateTimeSaved(workflowType, selectedEvents.length),
      healthImpactScore: impact.scoreDelta,
      healthHorizonsAffected: impact.affectedHorizons,
      healthFlagsResolved: impact.flagsResolved
    });

  } catch (error) {
    await activityLogger.logAction({
      category: 'workflow',
      actionType: workflowType,
      status: 'failed',
      workflowId,
      errorCode: error.code,
      errorMessage: error.message
    });
  }
};
```

---

## PHASE 4: USER INTERFACE (Week 4)
**Goal:** Build UI components for configuration and snoozing

### Day 14-15: Admin Configuration UI

#### 4.1 Create Admin Health Factors Component
Create `/src/components/AdminHealthFactors.tsx` (full implementation in previous plan)

### Day 16-17: Snooze UI Components

#### 4.2 Create Snooze Components
- `/src/components/EventHealthAlerts.tsx`
- `/src/components/SnoozeSettings.tsx`
- `/src/components/HealthScoreDisplay.tsx`

---

## PHASE 5: TESTING & DEPLOYMENT (Week 5)

### Day 18-19: Testing

#### 5.1 Unit Tests
```typescript
// /src/services/__tests__/activityLogger.test.ts
describe('ActivityLogger', () => {
  test('sanitizes PII from metadata', () => {
    const input = {
      email: 'user@example.com',
      eventId: 'event_123',
      summary: 'Meeting with John'
    };

    const sanitized = activityLogger.sanitizeMetadata(input);

    expect(sanitized.email).toBeUndefined();
    expect(sanitized.summary).toBeUndefined();
    expect(sanitized.eventId).toBe('event_123');
  });

  test('batches logs correctly', async () => {
    // Test batching logic
  });
});
```

#### 5.2 Integration Tests
- Test end-to-end logging flow
- Test health score calculations with snoozes
- Test configuration changes

### Day 20: Deployment

#### 5.3 Deployment Checklist
- [ ] Run migrations in production
- [ ] Deploy backend changes
- [ ] Deploy frontend with feature flag
- [ ] Monitor error rates
- [ ] Verify logging is working
- [ ] Test health score calculations
- [ ] Enable for subset of users
- [ ] Full rollout

---

## Success Metrics

### Technical Metrics
- **Logging Coverage**: 100% of identified actions logged
- **Performance Impact**: < 50ms added latency
- **Success Rate**: > 99.9% of logs delivered
- **Health Score Accuracy**: Matches manual calculations

### Business Metrics
- **User Engagement**: % of users viewing health scores
- **Snooze Usage**: Average snoozes per user
- **Health Improvement**: Average score increase per session
- **Time Savings**: Total minutes saved across users

---

## Risk Mitigation

### Performance Risks
- **Mitigation**: Batch logging, async operations, caching

### Privacy Risks
- **Mitigation**: PII sanitization, data minimization, RLS

### Reliability Risks
- **Mitigation**: Retry logic, local storage fallback, error handling

---

## Rollback Plan

If issues arise:
1. **Disable via feature flag** (immediate)
2. **Stop logging new events** (keep existing data)
3. **Fix issues in staging**
4. **Re-enable gradually**

---

## Documentation Needed

1. **API Documentation**: Document all logging endpoints
2. **Configuration Guide**: How to configure health factors
3. **User Guide**: How to use snooze system
4. **Admin Guide**: How to manage health score configuration
5. **Analytics Guide**: How to query and analyze logs