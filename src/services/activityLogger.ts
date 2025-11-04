/**
 * Activity Logger Service
 *
 * Handles all user action logging to Supabase with:
 * - Privacy-first design (only IDs, no PII)
 * - Batch processing for performance
 * - Retry mechanism for failed logs
 * - Session management
 * - Health score impact tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface UserAction {
  actionName: string;
  actionCategory: string;
  calendarId?: string;
  eventId?: string;
  attendeeCount?: number;
  healthScoreImpact?: number;
  timeHorizon?: 'today' | 'tomorrow' | 'week' | 'next_week' | 'month' | 'next_month';
  metadata?: Record<string, unknown>;
  clientTimestamp?: Date;
}

export interface ActionError {
  actionName: string;
  errorCode?: string;
  errorMessage: string;
  errorStack?: string;
  recoveryAction?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
}

// Configuration
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 5000; // 5 seconds
const RETRY_DELAY = 1000; // 1 second

class ActivityLogger {
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private actionQueue: UserAction[] = [];
  private errorQueue: ActionError[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private actionTypeCache = new Map<string, string>();

  /**
   * Initialize the Activity Logger
   */
  async initialize(supabaseUrl: string, supabaseKey: string, userId: string): Promise<void> {
    if (this.isInitialized) {
      console.warn('ActivityLogger already initialized');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.userId = userId;

    // Create or retrieve session
    await this.initializeSession();

    // Load action types into cache
    await this.loadActionTypes();

    // Start batch processing
    this.startBatchProcessing();

    this.isInitialized = true;
    console.log('ActivityLogger initialized successfully');
  }

  /**
   * Initialize or retrieve user session
   */
  private async initializeSession(): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      // Check for existing active session
      const { data: existingSession } = await this.supabase
        .from('user_sessions')
        .select('id, started_at, last_activity_at')
        .eq('user_id', this.userId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (existingSession) {
        // Use existing session if last activity was within 30 minutes
        const lastActivity = new Date(existingSession.last_activity_at);
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        if (lastActivity > thirtyMinutesAgo) {
          this.sessionId = existingSession.id;
          await this.updateSessionActivity();
          return;
        } else {
          // End the old session
          await this.endSession(existingSession.id);
        }
      }

      // Create new session
      const { data: newSession, error } = await this.supabase
        .from('user_sessions')
        .insert({
          user_id: this.userId,
          user_agent: navigator.userAgent,
          session_metadata: {
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        })
        .select('id')
        .single();

      if (error) throw error;
      this.sessionId = newSession.id;

    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  /**
   * Load action types into cache for validation
   */
  private async loadActionTypes(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: actionTypes } = await this.supabase
        .from('action_types')
        .select('id, name')
        .eq('is_active', true);

      if (actionTypes) {
        actionTypes.forEach(type => {
          this.actionTypeCache.set(type.name, type.id);
        });
      }
    } catch (error) {
      console.error('Failed to load action types:', error);
    }
  }

  /**
   * Log a user action
   */
  logAction(action: UserAction): void {
    if (!this.isInitialized) {
      console.warn('ActivityLogger not initialized');
      return;
    }

    // Sanitize metadata to remove PII
    const sanitizedAction = this.sanitizeAction(action);

    // Add to queue
    this.actionQueue.push(sanitizedAction);

    // Process immediately if queue is full
    if (this.actionQueue.length >= BATCH_SIZE) {
      this.processBatch();
    }
  }

  /**
   * Log an error
   */
  logError(error: ActionError): void {
    if (!this.isInitialized) {
      console.warn('ActivityLogger not initialized');
      return;
    }

    // Sanitize error data
    const sanitizedError = this.sanitizeError(error);

    // Add to error queue
    this.errorQueue.push(sanitizedError);

    // Process immediately if queue is full
    if (this.errorQueue.length >= BATCH_SIZE) {
      this.processErrorBatch();
    }
  }

  /**
   * Sanitize action to remove PII
   */
  private sanitizeAction(action: UserAction): UserAction {
    const sanitized = { ...action };

    // Remove any PII from metadata
    if (sanitized.metadata) {
      const sanitizedMetadata: Record<string, any> = {};

      for (const [key, value] of Object.entries(sanitized.metadata)) {
        // Skip fields that might contain PII
        if (this.isPIIField(key)) continue;

        // Sanitize string values
        if (typeof value === 'string') {
          sanitizedMetadata[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively sanitize nested objects
          sanitizedMetadata[key] = this.sanitizeObject(value);
        } else {
          sanitizedMetadata[key] = value;
        }
      }

      sanitized.metadata = sanitizedMetadata;
    }

    return sanitized;
  }

  /**
   * Sanitize error to remove PII
   */
  private sanitizeError(error: ActionError): ActionError {
    const sanitized = { ...error };

    // Sanitize error message
    if (sanitized.errorMessage) {
      sanitized.errorMessage = this.sanitizeString(sanitized.errorMessage);
    }

    // Sanitize error stack
    if (sanitized.errorStack) {
      // Remove file paths that might contain usernames
      sanitized.errorStack = sanitized.errorStack.replace(/\/Users\/[^/]+/g, '/Users/***');
    }

    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }

    return sanitized;
  }

  /**
   * Check if a field name might contain PII
   */
  private isPIIField(fieldName: string): boolean {
    const piiFields = [
      'email', 'name', 'phone', 'address', 'ssn', 'password',
      'first_name', 'last_name', 'full_name', 'username',
      'credit_card', 'bank_account', 'social_security',
      'description', 'summary', 'title', 'notes', 'comment'
    ];

    const lowerField = fieldName.toLowerCase();
    return piiFields.some(pii => lowerField.includes(pii));
  }

  /**
   * Sanitize string value
   */
  private sanitizeString(value: string): string {
    // Remove email addresses
    let sanitized = value.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Remove phone numbers (basic pattern)
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

    // Remove names (if they appear to be in the string)
    // This is a simple heuristic - in production, you'd use a more sophisticated approach
    sanitized = sanitized.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]');

    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map(item =>
        typeof item === 'object' ? this.sanitizeObject(item) : item
      );
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (this.isPIIField(key)) continue;

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.actionQueue.length > 0) {
        this.processBatch();
      }
      if (this.errorQueue.length > 0) {
        this.processErrorBatch();
      }
    }, BATCH_INTERVAL);
  }

  /**
   * Process queued actions
   */
  private async processBatch(): Promise<void> {
    if (!this.supabase || !this.userId || this.actionQueue.length === 0) return;

    const batch = this.actionQueue.splice(0, BATCH_SIZE);

    try {
      // Prepare batch for insertion
      const records = batch.map(action => ({
        user_id: this.userId,
        session_id: this.sessionId,
        action_type_id: this.actionTypeCache.get(action.actionName) || null,
        action_name: action.actionName,
        action_category: action.actionCategory,
        calendar_id: action.calendarId || null,
        event_id: action.eventId || null,
        attendee_count: action.attendeeCount || null,
        health_score_impact: action.healthScoreImpact || null,
        time_horizon: action.timeHorizon || null,
        action_metadata: action.metadata || {},
        client_timestamp: action.clientTimestamp || new Date(),
      }));

      // Insert batch
      const { error } = await this.supabase
        .from('user_actions')
        .insert(records);

      if (error) throw error;

      // Update session activity
      await this.updateSessionActivity();

    } catch (error) {
      console.error('Failed to process action batch:', error);

      // Re-queue failed actions for retry
      this.actionQueue.unshift(...batch);

      // Implement exponential backoff for retries
      setTimeout(() => {
        if (this.actionQueue.length > 0) {
          this.processBatch();
        }
      }, RETRY_DELAY * 2);
    }
  }

  /**
   * Process queued errors
   */
  private async processErrorBatch(): Promise<void> {
    if (!this.supabase || !this.userId || this.errorQueue.length === 0) return;

    const batch = this.errorQueue.splice(0, BATCH_SIZE);

    try {
      // Prepare batch for insertion
      const records = batch.map(error => ({
        user_id: this.userId,
        session_id: this.sessionId,
        action_type_id: this.actionTypeCache.get(error.actionName) || null,
        action_name: error.actionName,
        error_code: error.errorCode || null,
        error_message: error.errorMessage,
        error_stack: error.errorStack || null,
        recovery_action: error.recoveryAction || null,
        error_metadata: error.metadata || {},
      }));

      // Insert batch
      const { error } = await this.supabase
        .from('action_errors')
        .insert(records);

      if (error) throw error;

    } catch (error) {
      console.error('Failed to process error batch:', error);

      // Don't re-queue error logs to avoid infinite loops
    }
  }

  /**
   * Update session last activity timestamp
   */
  private async updateSessionActivity(): Promise<void> {
    if (!this.supabase || !this.sessionId) return;

    try {
      await this.supabase
        .from('user_sessions')
        .update({ last_activity_at: new Date() })
        .eq('id', this.sessionId);
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * End a session
   */
  private async endSession(sessionId: string): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('user_sessions')
        .update({ ended_at: new Date() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Flush all queued actions and errors
   */
  async flush(): Promise<void> {
    if (this.actionQueue.length > 0) {
      await this.processBatch();
    }
    if (this.errorQueue.length > 0) {
      await this.processErrorBatch();
    }
  }

  /**
   * Clean up and shut down the logger
   */
  async shutdown(): Promise<void> {
    // Stop batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining queues
    await this.flush();

    // End current session
    if (this.sessionId) {
      await this.endSession(this.sessionId);
    }

    // Reset state
    this.isInitialized = false;
    this.userId = null;
    this.sessionId = null;
    this.actionQueue = [];
    this.errorQueue = [];
    this.actionTypeCache.clear();

    console.log('ActivityLogger shut down successfully');
  }

  /**
   * Get current session info
   */
  getSessionInfo(): SessionInfo | null {
    if (!this.sessionId || !this.userId) return null;

    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startedAt: new Date(), // Would track this properly
      lastActivityAt: new Date(),
    };
  }

  /**
   * Track calendar delegate access
   */
  async trackCalendarAccess(calendarId: string, calendarName?: string, accessLevel: string = 'write'): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      await this.supabase
        .from('calendar_delegate_access')
        .upsert({
          user_id: this.userId,
          calendar_id: calendarId,
          calendar_name: calendarName || calendarId,
          access_level: accessLevel,
          last_accessed_at: new Date(),
        }, {
          onConflict: 'user_id,calendar_id'
        });
    } catch (error) {
      console.error('Failed to track calendar access:', error);
    }
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();

// Helper function for easy action logging
export function logUserAction(
  actionName: string,
  options?: Partial<UserAction>
): void {
  activityLogger.logAction({
    actionName,
    actionCategory: options?.actionCategory || 'general',
    ...options
  });
}

// Helper function for easy error logging
export function logUserError(
  actionName: string,
  errorMessage: string,
  options?: Partial<ActionError>
): void {
  activityLogger.logError({
    actionName,
    errorMessage,
    ...options
  });
}