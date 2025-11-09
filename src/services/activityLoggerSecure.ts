/**
 * Secure Activity Logger Service
 *
 * Handles all user action logging through secure backend API routes
 * - Uses Clerk authentication tokens
 * - Server-side validation and authorization
 * - Batch processing for performance
 * - Automatic retry on failures
 */

// Clerk auth will be passed from the component

// Types (same as before for compatibility)
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
const MAX_RETRIES = 3;

class SecureActivityLogger {
  private userId: string | null = null;
  private sessionId: string | null = null;
  private actionQueue: UserAction[] = [];
  private errorQueue: ActionError[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;
  private getToken: (() => Promise<string | null>) | null = null;

  /**
   * Initialize the Secure Activity Logger
   */
  async initialize(userId: string, getToken: () => Promise<string | null>): Promise<void> {
    if (this.isInitialized) {
      console.warn('SecureActivityLogger already initialized');
      return;
    }

    this.userId = userId;
    this.getToken = getToken;

    // Create or retrieve session
    await this.initializeSession();

    // Start batch processing
    this.startBatchProcessing();

    this.isInitialized = true;
    console.log('SecureActivityLogger initialized successfully');
  }

  /**
   * Initialize or retrieve user session through API
   */
  private async initializeSession(): Promise<void> {
    if (!this.getToken) return;

    try {
      const token = await this.getToken();
      if (!token) {
        console.error('Failed to get authentication token');
        return;
      }

      const response = await fetch('/api/activity/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation: 'create',
          metadata: {
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.sessionId = data.session?.id;
      } else {
        console.error('Failed to initialize session:', await response.text());
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  /**
   * Update session activity
   */
  private async updateSessionActivity(): Promise<void> {
    if (!this.sessionId || !this.getToken) return;

    try {
      const token = await this.getToken();
      if (!token) return;

      await fetch('/api/activity/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation: 'update',
          sessionId: this.sessionId,
        }),
      });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.sessionId || !this.getToken) return;

    // Flush any pending actions before ending
    await this.flushQueues();

    try {
      const token = await this.getToken();
      if (!token) return;

      await fetch('/api/activity/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation: 'end',
          sessionId: this.sessionId,
        }),
      });

      this.sessionId = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Log a user action
   */
  logAction(action: UserAction): void {
    if (!this.isInitialized) {
      console.warn('SecureActivityLogger not initialized');
      return;
    }

    // Sanitize metadata to remove PII
    const sanitizedAction = {
      ...action,
      metadata: this.sanitizeMetadata(action.metadata),
      clientTimestamp: action.clientTimestamp || new Date(),
    };

    this.actionQueue.push(sanitizedAction);

    // Process immediately if batch size reached
    if (this.actionQueue.length >= BATCH_SIZE) {
      this.processBatch();
    }
  }

  /**
   * Log an error
   */
  logError(error: ActionError): void {
    if (!this.isInitialized) {
      console.warn('SecureActivityLogger not initialized');
      return;
    }

    // Sanitize error data
    const sanitizedError = {
      ...error,
      metadata: this.sanitizeMetadata(error.metadata),
      errorStack: error.errorStack ? this.truncateString(error.errorStack, 5000) : undefined,
    };

    this.errorQueue.push(sanitizedError);

    // Process immediately if batch size reached
    if (this.errorQueue.length >= BATCH_SIZE / 2) {
      this.processErrorBatch();
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      this.processBatch();
      this.processErrorBatch();
    }, BATCH_INTERVAL);
  }

  /**
   * Process action batch through API
   */
  private async processBatch(): Promise<void> {
    if (this.actionQueue.length === 0 || !this.getToken) return;

    const batch = this.actionQueue.splice(0, BATCH_SIZE);

    try {
      const token = await this.getToken();
      if (!token) {
        // Put items back in queue if no token
        this.actionQueue.unshift(...batch);
        return;
      }

      const response = await this.retryableRequest(
        '/api/activity/log',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ actions: batch }),
        },
        MAX_RETRIES
      );

      if (!response.ok) {
        console.error('Failed to log actions:', await response.text());
        // Put items back in queue for retry
        this.actionQueue.unshift(...batch);
      } else {
        // Update session activity on successful batch
        this.updateSessionActivity();
      }
    } catch (error) {
      console.error('Failed to process action batch:', error);
      // Put items back in queue for retry
      this.actionQueue.unshift(...batch);
    }
  }

  /**
   * Process error batch through API
   */
  private async processErrorBatch(): Promise<void> {
    if (this.errorQueue.length === 0 || !this.getToken) return;

    const batch = this.errorQueue.splice(0, BATCH_SIZE / 2);

    try {
      const token = await this.getToken();
      if (!token) {
        // Put items back in queue if no token
        this.errorQueue.unshift(...batch);
        return;
      }

      const response = await this.retryableRequest(
        '/api/activity/error',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ errors: batch }),
        },
        MAX_RETRIES
      );

      if (!response.ok) {
        console.error('Failed to log errors:', await response.text());
        // Don't retry error logging to avoid infinite loops
      }
    } catch (error) {
      console.error('Failed to process error batch:', error);
      // Don't retry error logging to avoid infinite loops
    }
  }

  /**
   * Retry logic for API requests
   */
  private async retryableRequest(
    url: string,
    options: RequestInit,
    retries: number
  ): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx) or success
        if (response.ok || attempt === retries - 1) {
          return response;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
      }
    }

    throw new Error(`Failed after ${retries} retries`);
  }

  /**
   * Flush all pending queues
   */
  async flushQueues(): Promise<void> {
    await Promise.all([
      this.processBatch(),
      this.processErrorBatch(),
    ]);
  }

  /**
   * Sanitize metadata to remove PII
   */
  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    if (!metadata) return {};

    const sanitized: Record<string, unknown> = {};
    const piiKeys = ['email', 'name', 'phone', 'ssn', 'password', 'token', 'key', 'secret'];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();

      // Skip PII fields
      if (piiKeys.some(piiKey => lowerKey.includes(piiKey))) {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        // Truncate long strings
        sanitized[key] = this.truncateString(value, 1000);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Truncate string to max length
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Track calendar delegate access
   */
  async trackCalendarAccess(
    calendarId: string,
    calendarName?: string,
    accessLevel: string = 'write'
  ): Promise<void> {
    if (!this.isInitialized || !this.getToken) {
      console.warn('SecureActivityLogger not initialized');
      return;
    }

    // Log as a regular action - the API will handle the delegate access tracking
    this.logAction({
      actionName: 'calendar_access_tracked',
      actionCategory: 'system',
      calendarId,
      metadata: {
        calendarName,
        accessLevel,
      },
    });
  }

  /**
   * Check if logger is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.sessionId !== null;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush any remaining data
    this.flushQueues().finally(() => {
      this.endSession();
    });

    this.isInitialized = false;
  }
}

// Export singleton instance
const secureActivityLogger = new SecureActivityLogger();
export default secureActivityLogger;

// Helper function for easy action logging (compatible with existing code)
export function logUserAction(
  actionName: string,
  options?: Partial<UserAction>
): void {
  secureActivityLogger.logAction({
    actionName,
    actionCategory: options?.actionCategory || 'general',
    ...options
  });
}

// Helper function for easy error logging (compatible with existing code)
export function logUserError(
  actionName: string,
  errorMessage: string,
  options?: Partial<ActionError>
): void {
  secureActivityLogger.logError({
    actionName,
    errorMessage,
    ...options
  });
}