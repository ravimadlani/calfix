# Supabase User Action Logging Implementation Plan

## Executive Summary
Implement comprehensive user action logging in Supabase to track all user interactions with the Calendar Dashboard application. This will enable analytics, debugging, usage insights, and audit trails while respecting privacy by using only IDs (no PII).

---

## 1. DATABASE SCHEMA DESIGN

### 1.1 Enhanced `user_actions` Table
The existing `user_actions` table will be enhanced with additional columns and proper indexing:

```sql
-- Enhanced user_actions table
CREATE TABLE user_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- User & Calendar Context (IDs only)
    user_id TEXT NOT NULL REFERENCES users(id),
    calendar_id TEXT,  -- Which calendar was being managed

    -- Action Details
    action_category TEXT NOT NULL,  -- 'auth', 'view', 'event', 'workflow', 'team_scheduling', etc.
    action_type TEXT NOT NULL,      -- Specific action like 'sign_in', 'create_buffer', 'change_view'
    action_status TEXT NOT NULL DEFAULT 'initiated',  -- 'initiated', 'success', 'failed', 'partial'

    -- Resource Identifiers (no PII, just IDs)
    event_id TEXT,                  -- Google Calendar event ID if applicable
    target_calendar_id TEXT,        -- Target calendar for cross-calendar operations
    workflow_id TEXT,               -- For workflow executions
    session_id TEXT,                -- To group actions in same session

    -- Performance & Impact
    time_saved_minutes INTEGER DEFAULT 0,
    events_affected INTEGER DEFAULT 0,  -- Number of events created/modified/deleted
    duration_ms INTEGER,             -- How long the action took

    -- Error Tracking
    error_code TEXT,                -- Standardized error codes
    error_message TEXT,             -- Sanitized error message (no PII)
    retry_count INTEGER DEFAULT 0,  -- Number of retry attempts

    -- Additional Context (JSONB for flexibility)
    metadata JSONB,                  -- Flexible field for action-specific data
    request_params JSONB,            -- Sanitized request parameters (IDs only)
    response_data JSONB,             -- Sanitized response data (counts, IDs only)

    -- User Context
    user_agent TEXT,                 -- Browser/device info
    ip_hash TEXT,                    -- Hashed IP for geographic analytics

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,        -- When action completed (for duration tracking)

    -- Indexes for performance
    INDEX idx_user_actions_user_id (user_id),
    INDEX idx_user_actions_calendar_id (calendar_id),
    INDEX idx_user_actions_action_type (action_type),
    INDEX idx_user_actions_created_at (created_at),
    INDEX idx_user_actions_session_id (session_id),
    INDEX idx_user_actions_status (action_status)
);
```

### 1.2 New `action_types` Reference Table
Create a reference table for standardized action types:

```sql
CREATE TABLE action_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    action_type TEXT NOT NULL UNIQUE,
    description TEXT,
    expected_duration_ms INTEGER,  -- For performance monitoring
    time_saved_minutes INTEGER,    -- Default time saved for this action
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(category, action_type)
);
```

### 1.3 New `user_sessions` Table
Track user sessions for better analytics:

```sql
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,  -- Session ID
    user_id TEXT NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_actions INTEGER DEFAULT 0,
    total_time_saved_minutes INTEGER DEFAULT 0,
    ip_hash TEXT,
    user_agent TEXT,
    metadata JSONB,

    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_started_at (started_at)
);
```

### 1.4 New `action_errors` Table
Detailed error tracking for debugging:

```sql
CREATE TABLE action_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_id UUID REFERENCES user_actions(id),
    error_type TEXT NOT NULL,  -- 'auth', 'api', 'network', 'validation', 'permission'
    error_code TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,  -- Sanitized stack trace
    context JSONB,     -- Additional debugging context
    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_action_errors_action_id (action_id),
    INDEX idx_action_errors_error_type (error_type),
    INDEX idx_action_errors_created_at (created_at)
);
```

---

## 2. ACTION CATEGORIES & TYPES

### 2.1 Authentication Actions
```javascript
{
  category: 'auth',
  types: [
    'sign_in_initiated',
    'sign_in_success',
    'sign_in_failed',
    'sign_out',
    'token_refresh',
    'token_refresh_failed',
    'session_expired'
  ]
}
```

### 2.2 View & Navigation Actions
```javascript
{
  category: 'view',
  types: [
    'change_view',        // today, tomorrow, week, month
    'select_day',         // filter to specific day
    'clear_day_filter',
    'switch_calendar',    // change managed calendar
    'load_events',
    'refresh_events'
  ]
}
```

### 2.3 Event Management Actions
```javascript
{
  category: 'event',
  types: [
    'create_buffer_before',
    'create_buffer_after',
    'create_focus_block',
    'create_travel_block',
    'create_location_event',
    'create_event',
    'update_event',
    'delete_event',
    'delete_placeholder',
    'move_event',
    'add_conference_link',
    'batch_add_buffers',
    'batch_add_conference_links'
  ]
}
```

### 2.4 Workflow Actions
```javascript
{
  category: 'workflow',
  types: [
    'workflow_opened',
    'workflow_executed',
    'workflow_cancelled',
    'back_to_back_buffers',
    'insufficient_buffer_extension',
    'international_flights_location',
    'flights_travel_blocks',
    'declined_meetings_cleanup',
    'out_of_hours_foreign_cleanup',
    'missing_video_links',
    'double_booking_resolution'
  ]
}
```

### 2.5 Team Scheduling Actions
```javascript
{
  category: 'team_scheduling',
  types: [
    'modal_opened',
    'participant_added',
    'participant_removed',
    'participant_updated',
    'timezone_guardrail_added',
    'timezone_guardrail_removed',
    'duration_set',
    'search_window_set',
    'free_busy_search',
    'slot_selected',
    'slot_deselected',
    'email_generated',
    'email_copied',
    'holds_created',
    'hold_title_updated'
  ]
}
```

### 2.6 Analytics Actions
```javascript
{
  category: 'analytics',
  types: [
    'analytics_viewed',
    'recommendation_viewed',
    'insight_viewed',
    'health_score_calculated'
  ]
}
```

### 2.7 System Actions
```javascript
{
  category: 'system',
  types: [
    'calendars_synced',
    'subscription_checked',
    'upgrade_modal_opened',
    'error_retry',
    'api_rate_limited'
  ]
}
```

---

## 3. LOGGING SERVICE IMPLEMENTATION

### 3.1 Core Logging Service (`/src/services/activityLogger.ts`)

```typescript
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
}

class ActivityLogger {
  private sessionId: string;
  private userId: string | null;
  private actionQueue: LogActionParams[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.initializeSession();
  }

  // Main logging method
  async logAction(params: LogActionParams): Promise<void> {
    // Add to queue for batching
    this.actionQueue.push({
      ...params,
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: Date.now()
    });

    // Batch send after 1 second of inactivity
    this.scheduleBatchSend();
  }

  // Log with timing
  async logTimedAction<T>(
    params: LogActionParams,
    action: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const actionId = crypto.randomUUID();

    try {
      // Log initiation
      await this.logAction({
        ...params,
        status: 'initiated',
        metadata: { ...params.metadata, actionId }
      });

      // Execute action
      const result = await action();

      // Log success
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
      // Log failure
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
  private async sendBatch(): Promise<void> {
    if (this.actionQueue.length === 0) return;

    const batch = [...this.actionQueue];
    this.actionQueue = [];

    try {
      const { error } = await supabase
        .from('user_actions')
        .insert(batch.map(action => ({
          user_id: action.userId,
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
          duration_ms: action.durationMs,
          error_code: action.errorCode,
          error_message: action.errorMessage,
          metadata: this.sanitizeMetadata(action.metadata),
          request_params: this.sanitizeMetadata(action.requestParams),
          response_data: this.sanitizeMetadata(action.responseData),
          user_agent: navigator.userAgent,
          ip_hash: await this.getIpHash()
        })));

      if (error) {
        console.error('Failed to send activity logs:', error);
        // Store failed logs in localStorage for retry
        this.storeFailedLogs(batch);
      }
    } catch (error) {
      console.error('Error sending activity logs:', error);
      this.storeFailedLogs(batch);
    }
  }

  // Sanitize metadata to remove PII
  private sanitizeMetadata(data: any): any {
    if (!data) return null;

    const sanitized = { ...data };
    const piiFields = ['email', 'name', 'phone', 'address', 'summary', 'description', 'title'];

    for (const field of piiFields) {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    }

    // Keep only IDs, counts, timestamps, and non-PII data
    return sanitized;
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get user ID from auth
  private getUserId(): string | null {
    // Get from Clerk or wherever auth is stored
    return localStorage.getItem('user_id');
  }

  // Initialize session in Supabase
  private async initializeSession(): Promise<void> {
    if (!this.userId) return;

    try {
      await supabase.from('user_sessions').insert({
        id: this.sessionId,
        user_id: this.userId,
        user_agent: navigator.userAgent,
        ip_hash: await this.getIpHash()
      });
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  // Schedule batch send
  private scheduleBatchSend(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.sendBatch();
    }, 1000); // Send after 1 second of inactivity
  }

  // Store failed logs for retry
  private storeFailedLogs(logs: LogActionParams[]): void {
    const existingLogs = JSON.parse(localStorage.getItem('failed_activity_logs') || '[]');
    const allLogs = [...existingLogs, ...logs];

    // Keep only last 100 failed logs
    const trimmedLogs = allLogs.slice(-100);
    localStorage.setItem('failed_activity_logs', JSON.stringify(trimmedLogs));
  }

  // Retry failed logs
  async retryFailedLogs(): Promise<void> {
    const failedLogs = JSON.parse(localStorage.getItem('failed_activity_logs') || '[]');
    if (failedLogs.length === 0) return;

    localStorage.removeItem('failed_activity_logs');

    for (const log of failedLogs) {
      this.actionQueue.push(log);
    }

    await this.sendBatch();
  }

  // Get hashed IP for geographic analytics (no PII)
  private async getIpHash(): Promise<string> {
    // This would need an API call to get IP and hash it
    // For now, return a placeholder
    return 'ip_hash_placeholder';
  }

  // Sanitize error messages
  private sanitizeError(message: string): string {
    // Remove any potential PII from error messages
    return message
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]');
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();
```

---

## 4. INTEGRATION POINTS

### 4.1 Authentication Integration

```typescript
// In googleAuth.ts
import { activityLogger } from '@/services/activityLogger';

export const signIn = async () => {
  await activityLogger.logAction({
    category: 'auth',
    actionType: 'sign_in_initiated'
  });

  try {
    // ... existing sign in logic ...

    await activityLogger.logAction({
      category: 'auth',
      actionType: 'sign_in_success',
      metadata: { provider: 'google' }
    });
  } catch (error) {
    await activityLogger.logAction({
      category: 'auth',
      actionType: 'sign_in_failed',
      errorCode: error.code,
      errorMessage: error.message
    });
    throw error;
  }
};
```

### 4.2 Calendar Operations Integration

```typescript
// In googleCalendar.ts
export const createBufferEvent = async (startTime, duration, calendarId) => {
  return activityLogger.logTimedAction(
    {
      category: 'event',
      actionType: 'create_buffer_before',
      calendarId,
      timeSavedMinutes: duration,
      requestParams: { startTime, duration }
    },
    async () => {
      // ... existing create buffer logic ...
      const event = await createEvent(eventData, calendarId);

      // Add response data (IDs only)
      await activityLogger.logAction({
        category: 'event',
        actionType: 'create_buffer_before',
        status: 'success',
        eventId: event.id,
        responseData: { eventId: event.id }
      });

      return event;
    }
  );
};
```

### 4.3 View Changes Integration

```typescript
// In CalendarDashboard.tsx
const handleViewChange = async (newView: string) => {
  await activityLogger.logAction({
    category: 'view',
    actionType: 'change_view',
    metadata: {
      fromView: currentView,
      toView: newView
    }
  });

  setCurrentView(newView);
  await loadEvents();
};
```

### 4.4 Workflow Execution Integration

```typescript
// In CalendarDashboard.tsx
const handleExecuteWorkflow = async (workflowType: string, selectedEvents: any[]) => {
  const workflowId = crypto.randomUUID();

  await activityLogger.logAction({
    category: 'workflow',
    actionType: 'workflow_executed',
    workflowId,
    metadata: {
      workflowType,
      eventsCount: selectedEvents.length
    }
  });

  try {
    // ... existing workflow execution logic ...

    await activityLogger.logAction({
      category: 'workflow',
      actionType: workflowType,
      status: 'success',
      workflowId,
      eventsAffected: selectedEvents.length,
      timeSavedMinutes: calculateTimeSaved(workflowType, selectedEvents.length)
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
    throw error;
  }
};
```

---

## 5. PRIVACY & SECURITY CONSIDERATIONS

### 5.1 Data Minimization
- **Only store IDs**, never store actual event titles, descriptions, or attendee information
- Hash IP addresses for geographic analytics without storing actual IPs
- Sanitize all error messages to remove potential PII
- Use generic counters and metrics instead of specific data

### 5.2 Data Retention
- Implement automatic cleanup of logs older than 90 days
- Aggregate older data into summary tables before deletion
- Allow users to request deletion of their activity logs

### 5.3 Access Control
- Enable Row Level Security (RLS) on all logging tables
- Users can only see their own activity logs
- Implement admin role for viewing aggregate analytics

### 5.4 Compliance
- Document what data is logged in privacy policy
- Provide data export functionality for GDPR compliance
- Implement opt-out mechanism for detailed logging

---

## 6. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
1. Create enhanced database schema
2. Implement core ActivityLogger service
3. Add basic authentication logging
4. Test logging pipeline

### Phase 2: Core Actions (Week 2)
1. Integrate view/navigation logging
2. Add event management logging
3. Implement workflow logging
4. Add error tracking

### Phase 3: Advanced Features (Week 3)
1. Add team scheduling logging
2. Implement analytics tracking
3. Add session management
4. Create retry mechanism

### Phase 4: Analytics & Monitoring (Week 4)
1. Build analytics dashboard
2. Create usage reports
3. Implement alerting for errors
4. Add performance monitoring

---

## 7. MONITORING & ANALYTICS

### 7.1 Key Metrics to Track
- **User Engagement**: Actions per session, session duration
- **Feature Adoption**: Usage of different features
- **Performance**: Action completion times, error rates
- **Time Savings**: Total time saved per user/action type
- **Error Patterns**: Common failure points

### 7.2 Dashboards to Create
1. **User Activity Dashboard**: Real-time user actions
2. **Feature Usage Dashboard**: Which features are most/least used
3. **Error Monitoring Dashboard**: Track errors and failures
4. **Performance Dashboard**: API response times, success rates

### 7.3 Alerts to Implement
- High error rate alerts
- Performance degradation alerts
- Unusual activity patterns
- Failed authentication attempts

---

## 8. TESTING STRATEGY

### 8.1 Unit Tests
- Test ActivityLogger methods
- Test data sanitization
- Test error handling
- Test batching logic

### 8.2 Integration Tests
- Test end-to-end logging flow
- Test Supabase integration
- Test retry mechanism
- Test session management

### 8.3 Load Testing
- Test logging under high load
- Test batch processing performance
- Test queue management
- Test error recovery

---

## 9. SUCCESS CRITERIA

1. **Coverage**: 100% of identified user actions are logged
2. **Performance**: Logging adds < 50ms latency to actions
3. **Reliability**: 99.9% of logs successfully stored
4. **Privacy**: Zero PII exposed in logs
5. **Analytics**: Actionable insights available within 24 hours

---

## 10. ROLLBACK PLAN

If issues arise:
1. Disable logging via feature flag
2. Queue logs locally until fixed
3. Maintain backward compatibility
4. Keep existing analytics working

---

## APPENDIX A: Sample Log Entries

### Successful Buffer Creation
```json
{
  "user_id": "user_abc123",
  "calendar_id": "cal_xyz789",
  "action_category": "event",
  "action_type": "create_buffer_before",
  "action_status": "success",
  "event_id": "evt_def456",
  "time_saved_minutes": 15,
  "events_affected": 1,
  "duration_ms": 342,
  "metadata": {
    "bufferDuration": 15,
    "targetEventId": "evt_original123"
  },
  "session_id": "1234567890-abc",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Failed Workflow Execution
```json
{
  "user_id": "user_abc123",
  "calendar_id": "cal_xyz789",
  "action_category": "workflow",
  "action_type": "back_to_back_buffers",
  "action_status": "failed",
  "workflow_id": "wf_ghi789",
  "error_code": "PERMISSION_DENIED",
  "error_message": "Insufficient permissions to modify calendar",
  "events_affected": 0,
  "duration_ms": 1245,
  "retry_count": 2,
  "metadata": {
    "targetEventsCount": 5,
    "failedAtEvent": 3
  },
  "session_id": "1234567890-abc",
  "created_at": "2024-01-15T10:35:00Z"
}
```

---

## APPENDIX B: Error Codes

| Code | Description |
|------|-------------|
| AUTH_FAILED | Authentication failure |
| TOKEN_EXPIRED | Access token expired |
| PERMISSION_DENIED | Insufficient permissions |
| RATE_LIMITED | API rate limit exceeded |
| NETWORK_ERROR | Network connection failed |
| VALIDATION_ERROR | Invalid input data |
| RESOURCE_NOT_FOUND | Resource doesn't exist |
| CONFLICT | Resource conflict (e.g., double booking) |
| INTERNAL_ERROR | Server error |
| TIMEOUT | Operation timed out |

---

## Next Steps

1. Review and approve this plan
2. Create database migrations
3. Implement ActivityLogger service
4. Begin integration with existing code
5. Set up monitoring dashboards
6. Deploy to development environment
7. Test thoroughly
8. Roll out to production

---

*Document Version: 1.0*
*Last Updated: 2024-11-04*
*Author: Calendar Dashboard Team*