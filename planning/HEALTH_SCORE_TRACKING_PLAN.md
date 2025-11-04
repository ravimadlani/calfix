# Health Score Tracking Implementation Plan

## Executive Summary
Enhance the logging system to track calendar health scores across multiple time horizons, monitor how each user action impacts health scores, and provide insights into calendar health improvements over time.

---

## 1. HEALTH SCORE CONCEPT

### 1.1 Current Health Score Algorithm
The existing health score starts at 100 and adjusts based on:
- **-15 points** per back-to-back meeting
- **-8 points** per insufficient buffer (< 10 min)
- **+8 points** per focus block (60-120 min gaps)
- **-10 points** if > 6 hours of meetings
- **-20 points** if > 8 hours of meetings (cumulative)
- Score capped between 0-100

### 1.2 Enhanced Health Score Components

#### Time Horizon Health Scores
Track health scores for each time period:
- **Today**: Current day's health
- **Tomorrow**: Next day's health
- **This Week**: Current week aggregate
- **Next Week**: Following week aggregate
- **This Month**: Current month aggregate
- **Next Month**: Following month aggregate

#### Health Score Factors (Flags)
Each flag type contributes to health score changes:

| Flag Type | Health Impact | Description |
|-----------|--------------|-------------|
| Back-to-back meetings | -15 per occurrence | No buffer between meetings |
| Insufficient buffer | -8 per occurrence | < 10 min between meetings |
| Focus block available | +8 per block | 60-120 min deep work time |
| Meeting overload (6+ hrs) | -10 | Too many meetings in day |
| Meeting overload (8+ hrs) | -20 additional | Extreme meeting load |
| Out-of-hours meetings | -12 per meeting | Meetings outside business hours |
| Double bookings | -25 per conflict | Overlapping meetings |
| Missing video links | -3 per meeting | Meetings without conference links |
| Declined meetings present | -5 per meeting | Declined meetings not removed |
| International flight without location | -10 per flight | Missing timezone context |
| Flight without travel blocks | -8 per flight | No buffer for airport time |
| Fragmented schedule | -10 | Too many context switches |
| No lunch break | -15 | No break scheduled for lunch |
| Late night meetings | -20 per meeting | Meetings after 8 PM local |
| Early morning meetings | -15 per meeting | Meetings before 8 AM local |

---

## 2. DATABASE SCHEMA ADDITIONS

### 2.1 New Table: `health_scores`
Track health scores at different time horizons:

```sql
CREATE TABLE health_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    calendar_id TEXT NOT NULL,

    -- Time horizon identification
    calculation_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_horizon TEXT NOT NULL, -- 'today', 'tomorrow', 'this_week', 'next_week', 'this_month', 'next_month'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Health metrics
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    previous_score INTEGER, -- Score from last calculation for this horizon
    score_change INTEGER GENERATED ALWAYS AS (health_score - COALESCE(previous_score, health_score)) STORED,

    -- Flag counts (what contributed to the score)
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
    flags JSONB, -- Detailed flag information
    recommendations JSONB, -- Specific recommendations based on score

    -- Indexes
    INDEX idx_health_scores_user_calendar (user_id, calendar_id),
    INDEX idx_health_scores_time (calculation_time),
    INDEX idx_health_scores_horizon (time_horizon),
    INDEX idx_health_scores_period (period_start, period_end),
    UNIQUE KEY unique_health_score_snapshot (user_id, calendar_id, time_horizon, calculation_time)
);
```

### 2.2 New Table: `health_score_sessions`
Track health scores at session boundaries:

```sql
CREATE TABLE health_score_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES user_sessions(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    calendar_id TEXT NOT NULL,

    -- Session timing
    session_type TEXT NOT NULL CHECK (session_type IN ('start', 'end')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Health scores for each horizon at this point
    health_today INTEGER,
    health_tomorrow INTEGER,
    health_this_week INTEGER,
    health_next_week INTEGER,
    health_this_month INTEGER,
    health_next_month INTEGER,

    -- Aggregate improvements during session (only for 'end' type)
    total_health_improvement INTEGER, -- Sum of all positive changes
    total_actions_taken INTEGER, -- Count of actions that affected health
    time_saved_minutes INTEGER, -- Total time saved in session

    -- Top issues at this point
    top_issues JSONB, -- Array of main health issues

    INDEX idx_health_sessions_session (session_id),
    INDEX idx_health_sessions_user (user_id),
    INDEX idx_health_sessions_time (recorded_at)
);
```

### 2.3 New Table: `action_health_impacts`
Track how each action impacts health scores:

```sql
CREATE TABLE action_health_impacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_id UUID NOT NULL REFERENCES user_actions(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    calendar_id TEXT NOT NULL,

    -- Impact details
    impact_type TEXT NOT NULL, -- 'add_buffer', 'remove_double_booking', etc.
    time_horizon TEXT NOT NULL, -- Which horizon was affected

    -- Score changes
    score_before INTEGER NOT NULL,
    score_after INTEGER NOT NULL,
    score_delta INTEGER GENERATED ALWAYS AS (score_after - score_before) STORED,

    -- What changed
    flag_type TEXT, -- Which flag was addressed
    flag_count_before INTEGER,
    flag_count_after INTEGER,
    events_modified INTEGER DEFAULT 0,

    -- Metadata
    details JSONB, -- Additional context about the impact

    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_action_impacts_action (action_id),
    INDEX idx_action_impacts_user (user_id),
    INDEX idx_action_impacts_type (impact_type),
    INDEX idx_action_impacts_time (created_at)
);
```

### 2.4 Enhanced `user_actions` Table
Add health score tracking columns:

```sql
ALTER TABLE user_actions
    ADD COLUMN health_impact_score INTEGER, -- Net health score change
    ADD COLUMN health_horizons_affected TEXT[], -- Array of affected horizons
    ADD COLUMN health_flags_resolved TEXT[], -- Which health flags were resolved
    ADD COLUMN health_flags_created TEXT[]; -- Which new health flags were created
```

---

## 3. HEALTH SCORE SERVICE IMPLEMENTATION

### 3.1 Health Score Calculator Service (`/src/services/healthScoreTracker.ts`)

```typescript
interface HealthScoreSnapshot {
  userId: string;
  calendarId: string;
  timeHorizon: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'next_month';
  periodStart: Date;
  periodEnd: Date;
  score: number;
  flags: HealthFlags;
  recommendations: string[];
}

interface HealthFlags {
  backToBackCount: number;
  insufficientBufferCount: number;
  focusBlockCount: number;
  doubleBookingCount: number;
  outOfHoursCount: number;
  declinedMeetingCount: number;
  missingVideoCount: number;
  flightWithoutLocationCount: number;
  flightWithoutTravelCount: number;
  meetingHours: number;
  totalMeetings: number;
}

interface HealthImpact {
  scoreDelta: number;
  flagsResolved: string[];
  flagsCreated: string[];
  affectedHorizons: string[];
  details: Record<string, any>;
}

class HealthScoreTracker {
  private baselineScores: Map<string, HealthScoreSnapshot> = new Map();

  // Calculate health scores for all time horizons
  async calculateAllHorizons(
    userId: string,
    calendarId: string,
    events: CalendarEvent[]
  ): Promise<Map<string, HealthScoreSnapshot>> {
    const now = new Date();
    const scores = new Map<string, HealthScoreSnapshot>();

    // Define time horizons
    const horizons = [
      { key: 'today', start: startOfDay(now), end: endOfDay(now) },
      { key: 'tomorrow', start: startOfDay(addDays(now, 1)), end: endOfDay(addDays(now, 1)) },
      { key: 'this_week', start: startOfWeek(now), end: endOfWeek(now) },
      { key: 'next_week', start: startOfWeek(addWeeks(now, 1)), end: endOfWeek(addWeeks(now, 1)) },
      { key: 'this_month', start: startOfMonth(now), end: endOfMonth(now) },
      { key: 'next_month', start: startOfMonth(addMonths(now, 1)), end: endOfMonth(addMonths(now, 1)) }
    ];

    for (const horizon of horizons) {
      const periodEvents = events.filter(event => {
        const eventStart = getEventStartTime(event);
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

  // Calculate health score for a specific period
  private async calculateHealthScore(
    userId: string,
    calendarId: string,
    events: CalendarEvent[],
    timeHorizon: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HealthScoreSnapshot> {
    // Calculate all health flags
    const flags: HealthFlags = {
      backToBackCount: countBackToBack(events),
      insufficientBufferCount: countInsufficientBuffers(events),
      focusBlockCount: countFocusBlocks(events),
      doubleBookingCount: detectDoubleBookings(events).length,
      outOfHoursCount: findOutOfHoursMeetings(events).length,
      declinedMeetingCount: findDeclinedMeetings(events).length,
      missingVideoCount: findMeetingsWithoutVideo(events).length,
      flightWithoutLocationCount: findInternationalFlightsWithoutLocation(events).length,
      flightWithoutTravelCount: findFlightsWithoutTravelBlocks(events).length,
      meetingHours: calculateTotalMeetingTime(events),
      totalMeetings: events.filter(e => isMeeting(e)).length
    };

    // Calculate score with enhanced algorithm
    let score = 100;

    // Original penalties
    score -= flags.backToBackCount * 15;
    score -= flags.insufficientBufferCount * 8;
    score += flags.focusBlockCount * 8;

    // Additional penalties
    score -= flags.doubleBookingCount * 25;
    score -= flags.outOfHoursCount * 12;
    score -= flags.declinedMeetingCount * 5;
    score -= flags.missingVideoCount * 3;
    score -= flags.flightWithoutLocationCount * 10;
    score -= flags.flightWithoutTravelCount * 8;

    // Meeting overload penalties
    if (flags.meetingHours > 6) score -= 10;
    if (flags.meetingHours > 8) score -= 20;

    // No lunch break penalty (for day horizons)
    if (['today', 'tomorrow'].includes(timeHorizon)) {
      const hasLunchBreak = events.some(e =>
        e.summary?.toLowerCase().includes('lunch') ||
        hasMidDayGap(events)
      );
      if (!hasLunchBreak) score -= 15;
    }

    // Cap score
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Generate recommendations
    const recommendations = this.generateRecommendations(flags, score);

    return {
      userId,
      calendarId,
      timeHorizon,
      periodStart,
      periodEnd,
      score,
      flags,
      recommendations
    };
  }

  // Track health impact of an action
  async trackActionImpact(
    actionId: string,
    userId: string,
    calendarId: string,
    actionType: string,
    eventsBefore: CalendarEvent[],
    eventsAfter: CalendarEvent[]
  ): Promise<HealthImpact> {
    // Calculate scores before and after
    const scoresBefore = await this.calculateAllHorizons(userId, calendarId, eventsBefore);
    const scoresAfter = await this.calculateAllHorizons(userId, calendarId, eventsAfter);

    const impact: HealthImpact = {
      scoreDelta: 0,
      flagsResolved: [],
      flagsCreated: [],
      affectedHorizons: [],
      details: {}
    };

    // Compare each horizon
    for (const [horizon, afterScore] of scoresAfter) {
      const beforeScore = scoresBefore.get(horizon);
      if (!beforeScore) continue;

      const delta = afterScore.score - beforeScore.score;
      if (delta !== 0) {
        impact.affectedHorizons.push(horizon);
        impact.scoreDelta += delta;

        // Track which flags changed
        const flagChanges = this.compareFla gs(beforeScore.flags, afterScore.flags);
        impact.flagsResolved.push(...flagChanges.resolved);
        impact.flagsCreated.push(...flagChanges.created);

        // Store in database
        await this.storeActionImpact(
          actionId,
          userId,
          calendarId,
          actionType,
          horizon,
          beforeScore.score,
          afterScore.score,
          flagChanges
        );
      }
    }

    return impact;
  }

  // Record health scores at session start
  async recordSessionStart(sessionId: string, userId: string, calendarId: string, events: CalendarEvent[]) {
    const scores = await this.calculateAllHorizons(userId, calendarId, events);

    // Store baseline for comparison
    this.baselineScores.set(sessionId, scores);

    // Save to database
    await supabase.from('health_score_sessions').insert({
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
    });

    // Also store individual horizon snapshots
    for (const [horizon, snapshot] of scores) {
      await this.storeHealthSnapshot(snapshot);
    }
  }

  // Record health scores at session end
  async recordSessionEnd(
    sessionId: string,
    userId: string,
    calendarId: string,
    events: CalendarEvent[],
    totalActions: number,
    timeSaved: number
  ) {
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

    // Save session end snapshot
    await supabase.from('health_score_sessions').insert({
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
    });

    // Clean up baseline
    this.baselineScores.delete(sessionId);
  }

  // Generate recommendations based on health flags
  private generateRecommendations(flags: HealthFlags, score: number): string[] {
    const recommendations: string[] = [];

    if (flags.backToBackCount > 0) {
      recommendations.push(`Add ${flags.backToBackCount} buffer blocks between back-to-back meetings`);
    }

    if (flags.doubleBookingCount > 0) {
      recommendations.push(`Resolve ${flags.doubleBookingCount} double-booked time slots`);
    }

    if (flags.outOfHoursCount > 0) {
      recommendations.push(`Consider rescheduling ${flags.outOfHoursCount} out-of-hours meetings`);
    }

    if (flags.meetingHours > 6) {
      recommendations.push('Meeting load is high - consider declining non-essential meetings');
    }

    if (flags.focusBlockCount < 2) {
      recommendations.push('Schedule more focus blocks for deep work');
    }

    if (flags.missingVideoCount > 0) {
      recommendations.push(`Add video links to ${flags.missingVideoCount} meetings`);
    }

    return recommendations;
  }

  // Compare flags to identify what was resolved/created
  private compareFlags(before: HealthFlags, after: HealthFlags) {
    const resolved: string[] = [];
    const created: string[] = [];

    const flagMap = {
      backToBackCount: 'back_to_back',
      insufficientBufferCount: 'insufficient_buffer',
      doubleBookingCount: 'double_booking',
      outOfHoursCount: 'out_of_hours',
      declinedMeetingCount: 'declined_meeting',
      missingVideoCount: 'missing_video',
      flightWithoutLocationCount: 'flight_without_location',
      flightWithoutTravelCount: 'flight_without_travel'
    };

    for (const [key, label] of Object.entries(flagMap)) {
      const beforeCount = before[key] || 0;
      const afterCount = after[key] || 0;

      if (beforeCount > afterCount) {
        resolved.push(label);
      } else if (afterCount > beforeCount) {
        created.push(label);
      }
    }

    return { resolved, created };
  }

  // Identify top issues for session tracking
  private identifyTopIssues(scores: Map<string, HealthScoreSnapshot>): any[] {
    const issues: any[] = [];
    const todayScore = scores.get('today');

    if (todayScore) {
      const flags = todayScore.flags;

      if (flags.backToBackCount > 0) {
        issues.push({
          type: 'back_to_back',
          count: flags.backToBackCount,
          impact: flags.backToBackCount * 15
        });
      }

      if (flags.doubleBookingCount > 0) {
        issues.push({
          type: 'double_booking',
          count: flags.doubleBookingCount,
          impact: flags.doubleBookingCount * 25
        });
      }

      if (flags.meetingHours > 6) {
        issues.push({
          type: 'meeting_overload',
          hours: flags.meetingHours,
          impact: flags.meetingHours > 8 ? 30 : 10
        });
      }
    }

    return issues.sort((a, b) => b.impact - a.impact).slice(0, 3);
  }

  // Store health snapshot in database
  private async storeHealthSnapshot(snapshot: HealthScoreSnapshot) {
    await supabase.from('health_scores').insert({
      user_id: snapshot.userId,
      calendar_id: snapshot.calendarId,
      time_horizon: snapshot.timeHorizon,
      period_start: snapshot.periodStart,
      period_end: snapshot.periodEnd,
      health_score: snapshot.score,
      back_to_back_count: snapshot.flags.backToBackCount,
      insufficient_buffer_count: snapshot.flags.insufficientBufferCount,
      focus_block_count: snapshot.flags.focusBlockCount,
      double_booking_count: snapshot.flags.doubleBookingCount,
      out_of_hours_count: snapshot.flags.outOfHoursCount,
      declined_meeting_count: snapshot.flags.declinedMeetingCount,
      missing_video_count: snapshot.flags.missingVideoCount,
      flight_without_location_count: snapshot.flags.flightWithoutLocationCount,
      flight_without_travel_count: snapshot.flags.flightWithoutTravelCount,
      meeting_hours: snapshot.flags.meetingHours,
      total_meetings: snapshot.flags.totalMeetings,
      flags: snapshot.flags,
      recommendations: snapshot.recommendations
    });
  }

  // Store action impact in database
  private async storeActionImpact(
    actionId: string,
    userId: string,
    calendarId: string,
    impactType: string,
    timeHorizon: string,
    scoreBefore: number,
    scoreAfter: number,
    flagChanges: any
  ) {
    await supabase.from('action_health_impacts').insert({
      action_id: actionId,
      user_id: userId,
      calendar_id: calendarId,
      impact_type: impactType,
      time_horizon: timeHorizon,
      score_before: scoreBefore,
      score_after: scoreAfter,
      details: flagChanges
    });
  }
}

export const healthScoreTracker = new HealthScoreTracker();
```

---

## 4. INTEGRATION WITH ACTIVITY LOGGER

### 4.1 Enhanced Activity Logger Integration

```typescript
// In activityLogger.ts
import { healthScoreTracker } from '@/services/healthScoreTracker';

class ActivityLogger {
  // Enhanced logAction with health tracking
  async logAction(params: LogActionParams): Promise<void> {
    const actionId = crypto.randomUUID();

    // Store events before action (if applicable)
    const eventsBefore = params.eventsBefore;

    // Add to queue with action ID
    this.actionQueue.push({
      ...params,
      id: actionId,
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: Date.now()
    });

    // Schedule batch send
    this.scheduleBatchSend();

    // If action modifies calendar, track health impact
    if (eventsBefore && params.eventsAfter) {
      const impact = await healthScoreTracker.trackActionImpact(
        actionId,
        this.userId,
        params.calendarId,
        params.actionType,
        eventsBefore,
        params.eventsAfter
      );

      // Update action with health impact
      const actionIndex = this.actionQueue.findIndex(a => a.id === actionId);
      if (actionIndex >= 0) {
        this.actionQueue[actionIndex] = {
          ...this.actionQueue[actionIndex],
          health_impact_score: impact.scoreDelta,
          health_horizons_affected: impact.affectedHorizons,
          health_flags_resolved: impact.flagsResolved,
          health_flags_created: impact.flagsCreated
        };
      }
    }
  }

  // Initialize session with health tracking
  private async initializeSession(): Promise<void> {
    if (!this.userId) return;

    try {
      // Create session
      await supabase.from('user_sessions').insert({
        id: this.sessionId,
        user_id: this.userId,
        user_agent: navigator.userAgent,
        ip_hash: await this.getIpHash()
      });

      // Record initial health scores
      const events = await this.getCurrentEvents();
      await healthScoreTracker.recordSessionStart(
        this.sessionId,
        this.userId,
        this.managedCalendarId,
        events
      );
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  // End session with health tracking
  async endSession(): Promise<void> {
    if (!this.userId || !this.sessionId) return;

    try {
      // Send any remaining logs
      await this.sendBatch();

      // Record final health scores
      const events = await this.getCurrentEvents();
      const sessionStats = await this.getSessionStats();

      await healthScoreTracker.recordSessionEnd(
        this.sessionId,
        this.userId,
        this.managedCalendarId,
        events,
        sessionStats.totalActions,
        sessionStats.timeSaved
      );

      // Update session end time
      await supabase
        .from('user_sessions')
        .update({ ended_at: new Date() })
        .eq('id', this.sessionId);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }
}
```

### 4.2 Integration Points in Calendar Operations

```typescript
// Example: Adding buffer before meeting
export const handleAddBufferBefore = async (event: CalendarEvent) => {
  // Get events before action
  const eventsBefore = await fetchEvents({ /* params */ });

  // Perform action
  const buffer = await createBufferEvent(/* params */);

  // Get events after action
  const eventsAfter = await fetchEvents({ /* params */ });

  // Log with health impact
  await activityLogger.logAction({
    category: 'event',
    actionType: 'create_buffer_before',
    calendarId: managedCalendarId,
    eventId: buffer.id,
    timeSavedMinutes: 15,
    eventsBefore, // Include for health tracking
    eventsAfter,  // Include for health tracking
    metadata: {
      targetEventId: event.id,
      bufferDuration: 15
    }
  });
};
```

---

## 5. ANALYTICS & REPORTING

### 5.1 Health Score Analytics Queries

```sql
-- Average health score by time horizon
SELECT
    time_horizon,
    AVG(health_score) as avg_score,
    MIN(health_score) as min_score,
    MAX(health_score) as max_score,
    COUNT(*) as sample_count
FROM health_scores
WHERE user_id = $1
    AND calculation_time >= NOW() - INTERVAL '30 days'
GROUP BY time_horizon;

-- Health score trends over time
SELECT
    DATE(calculation_time) as date,
    time_horizon,
    AVG(health_score) as avg_daily_score
FROM health_scores
WHERE user_id = $1
    AND time_horizon IN ('today', 'this_week')
    AND calculation_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(calculation_time), time_horizon
ORDER BY date DESC;

-- Top health issues
SELECT
    CASE
        WHEN back_to_back_count > 0 THEN 'Back-to-back meetings'
        WHEN double_booking_count > 0 THEN 'Double bookings'
        WHEN meeting_hours > 6 THEN 'Meeting overload'
        WHEN out_of_hours_count > 0 THEN 'Out-of-hours meetings'
    END as issue_type,
    COUNT(*) as occurrence_count,
    AVG(health_score) as avg_score_with_issue
FROM health_scores
WHERE user_id = $1
    AND time_horizon = 'today'
    AND calculation_time >= NOW() - INTERVAL '7 days'
GROUP BY issue_type
HAVING issue_type IS NOT NULL
ORDER BY occurrence_count DESC;

-- Health improvement by action type
SELECT
    ahi.impact_type,
    COUNT(*) as action_count,
    AVG(ahi.score_delta) as avg_improvement,
    SUM(CASE WHEN ahi.score_delta > 0 THEN 1 ELSE 0 END) as positive_impacts,
    SUM(CASE WHEN ahi.score_delta < 0 THEN 1 ELSE 0 END) as negative_impacts
FROM action_health_impacts ahi
WHERE ahi.user_id = $1
    AND ahi.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ahi.impact_type
ORDER BY avg_improvement DESC;

-- Session health improvements
SELECT
    DATE(hss.recorded_at) as session_date,
    SUM(CASE WHEN session_type = 'end' THEN total_health_improvement ELSE 0 END) as daily_improvement,
    SUM(CASE WHEN session_type = 'end' THEN total_actions_taken ELSE 0 END) as daily_actions,
    SUM(CASE WHEN session_type = 'end' THEN time_saved_minutes ELSE 0 END) as daily_time_saved
FROM health_score_sessions hss
WHERE hss.user_id = $1
    AND hss.recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(hss.recorded_at)
ORDER BY session_date DESC;
```

### 5.2 Health Score Dashboard Components

```typescript
// Health Score Widget Component
interface HealthScoreWidgetProps {
  horizon: string;
  score: number;
  previousScore?: number;
  flags: HealthFlags;
}

const HealthScoreWidget: React.FC<HealthScoreWidgetProps> = ({
  horizon,
  score,
  previousScore,
  flags
}) => {
  const change = previousScore ? score - previousScore : 0;
  const interpretation = getHealthScoreInterpretation(score);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-900">
          {horizon.replace('_', ' ').toUpperCase()}
        </h3>
        {change !== 0 && (
          <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="text-2xl font-bold">{score}</div>
          <div className={`text-xs ${interpretation.textColor}`}>
            {interpretation.label}
          </div>
        </div>

        <div className="w-16 h-16">
          <CircularProgress value={score} color={interpretation.color} />
        </div>
      </div>

      {/* Top issues for this horizon */}
      <div className="mt-3 space-y-1">
        {flags.backToBackCount > 0 && (
          <div className="flex items-center text-xs text-red-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            {flags.backToBackCount} back-to-back meetings
          </div>
        )}
        {flags.doubleBookingCount > 0 && (
          <div className="flex items-center text-xs text-red-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            {flags.doubleBookingCount} double bookings
          </div>
        )}
        {flags.focusBlockCount > 0 && (
          <div className="flex items-center text-xs text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            {flags.focusBlockCount} focus blocks available
          </div>
        )}
      </div>
    </div>
  );
};

// Health Trends Chart Component
const HealthTrendsChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium mb-4">Health Score Trends</h3>
      <LineChart
        data={data}
        lines={[
          { key: 'today', color: '#4F46E5', label: 'Daily' },
          { key: 'this_week', color: '#10B981', label: 'Weekly' }
        ]}
        xAxis="date"
        yAxis="score"
      />
    </div>
  );
};
```

---

## 6. IMPLEMENTATION PHASES

### Phase 1: Database Setup (Days 1-2)
1. Create health score tables
2. Add indexes and constraints
3. Set up RLS policies
4. Create initial migration scripts

### Phase 2: Health Score Service (Days 3-5)
1. Implement HealthScoreTracker class
2. Add enhanced health score algorithm
3. Create flag detection methods
4. Build recommendation engine

### Phase 3: Integration (Days 6-8)
1. Integrate with ActivityLogger
2. Add health tracking to all calendar operations
3. Implement session start/end tracking
4. Connect to existing workflows

### Phase 4: Analytics & UI (Days 9-11)
1. Build health score widgets
2. Create trend charts
3. Implement analytics queries
4. Add to dashboard

### Phase 5: Testing & Optimization (Days 12-14)
1. Test health score calculations
2. Verify impact tracking
3. Optimize query performance
4. Load testing

---

## 7. SUCCESS METRICS

1. **Accuracy**: Health scores correctly reflect calendar state
2. **Performance**: Score calculation < 100ms per horizon
3. **Coverage**: 100% of calendar actions track health impact
4. **Insights**: Users can see health improvements from actions
5. **Trends**: Historical health data shows improvement patterns

---

## 8. FUTURE ENHANCEMENTS

1. **Machine Learning**: Predict future health scores based on patterns
2. **Personalization**: Adjust weights based on user preferences
3. **Team Health**: Aggregate health scores for teams
4. **Recommendations AI**: Smart suggestions based on health patterns
5. **Health Goals**: Set and track health score targets
6. **Notifications**: Alert when health drops below threshold
7. **Comparative Analysis**: Compare with peer averages
8. **Export**: Health reports for managers/executives