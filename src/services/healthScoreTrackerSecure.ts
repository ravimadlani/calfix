/**
 * Secure Health Score Tracker Service
 *
 * Handles health score calculations and tracking through secure backend API routes
 * - Uses Clerk authentication tokens
 * - Server-side validation and authorization
 * - Factor-based scoring with user overrides
 * - Snooze management
 */

import type { CalendarAnalytics } from '../types';

// Types
export interface HealthFactor {
  id: string;
  factor_code: string;
  factor_name: string;
  category: string;
  description?: string;
  default_points: number;
  aggregation_type: 'per_occurrence' | 'once_per_period' | 'capped';
  max_occurrences?: number;
  is_enabled: boolean;
  is_penalty: boolean;
  has_override?: boolean;
  override_reason?: string;
}

export interface HealthScoreBreakdown {
  factorId: string;
  factorCode: string;
  factorName: string;
  occurrences: number;
  pointsPerOccurrence: number;
  totalImpact: number;
  snoozedOccurrences?: number;
  snoozedImpact?: number;
  affectedEventIds?: string[];
}

export interface HealthScoreResult {
  healthScoreId?: string;
  baseScore: number;
  actualScore: number;
  unsnoozedScore: number;
  snoozedDeductions: number;
  breakdowns: HealthScoreBreakdown[];
  totalEvents: number;
  totalMeetings: number;
  totalHours: number;
  timeHorizon: string;
}

export interface Snooze {
  id: string;
  eventId: string;
  factorId?: string;
  reason?: string;
  expiresAt?: string;
  isActive: boolean;
}

class SecureHealthScoreTracker {
  private isInitialized = false;
  private userId: string | null = null;
  private getToken: (() => Promise<string | null>) | null = null;

  // Cached data
  private healthFactors: HealthFactor[] = [];
  private activeSnoozes: Snooze[] = [];
  private lastFactorsFetch: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the Secure Health Score Tracker
   */
  async initialize(userId: string, getToken: () => Promise<string | null>): Promise<void> {
    if (this.isInitialized) {
      console.warn('SecureHealthScoreTracker already initialized');
      return;
    }

    this.userId = userId;
    this.getToken = getToken;

    // Load initial configuration
    await this.loadHealthFactors();

    this.isInitialized = true;
    console.log('SecureHealthScoreTracker initialized successfully');
  }

  /**
   * Load health factors with user overrides from API
   */
  async loadHealthFactors(calendarId?: string, forceRefresh = false): Promise<void> {
    if (!this.getToken) return;

    // Use cache if available and not forcing refresh
    if (!forceRefresh && this.healthFactors.length > 0 &&
        Date.now() - this.lastFactorsFetch < this.CACHE_DURATION) {
      return;
    }

    try {
      const token = await this.getToken();
      if (!token) {
        console.error('Failed to get authentication token');
        return;
      }

      const params = new URLSearchParams({
        includeOverrides: 'true',
        includeSnoozes: 'true',
        includePatterns: 'true',
      });

      if (calendarId) {
        params.append('calendarId', calendarId);
      }

      const response = await fetch(`/api/health/factors?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.healthFactors = data.factors || [];
        this.activeSnoozes = data.snoozes || [];
        this.lastFactorsFetch = Date.now();
      } else {
        console.error('Failed to load health factors:', await response.text());
      }
    } catch (error) {
      console.error('Failed to load health factors:', error);
    }
  }

  /**
   * Calculate health score for analytics data
   */
  async calculateHealthScore(
    analytics: CalendarAnalytics,
    calendarId: string,
    timeHorizon: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<HealthScoreResult> {
    // Ensure factors are loaded for this calendar
    await this.loadHealthFactors(calendarId);

    // Start with base score
    const baseScore = 100;
    let actualScore = 100;
    let unsnoozedScore = 100;
    let snoozedDeductions = 0;

    const breakdowns: HealthScoreBreakdown[] = [];

    // Calculate deductions based on factors
    for (const factor of this.healthFactors) {
      if (!factor.is_enabled || factor.has_override) continue;

      let occurrences = 0;
      let affectedEventIds: string[] = [];

      // Map factor codes to analytics properties
      switch (factor.factor_code) {
        case 'back_to_back':
          occurrences = analytics.backToBackCount || 0;
          break;
        case 'insufficient_buffer':
          occurrences = analytics.insufficientBufferCount || 0;
          break;
        case 'double_booking':
          occurrences = analytics.doubleBookings?.length || 0;
          affectedEventIds = analytics.doubleBookings?.map(db => [db.event1.id!, db.event2.id!]).flat() || [];
          break;
        case 'out_of_hours':
          occurrences = analytics.meetingsOutsideBusinessHours?.length || 0;
          affectedEventIds = analytics.meetingsOutsideBusinessHours?.map(m => m.id!) || [];
          break;
        case 'no_lunch':
          // TODO: Add lunch break detection to analytics
          occurrences = 0;
          break;
        case 'meeting_overload':
          if ((analytics.totalMeetingHours || 0) > 6) {
            occurrences = 1;
          }
          break;
        case 'extreme_meeting_overload':
          if ((analytics.totalMeetingHours || 0) > 8) {
            occurrences = 1;
          }
          break;
        // Add more factor mappings as needed
      }

      if (occurrences === 0) continue;

      // Apply aggregation rules
      let effectiveOccurrences = occurrences;
      if (factor.aggregation_type === 'once_per_period') {
        effectiveOccurrences = 1;
      } else if (factor.aggregation_type === 'capped' && factor.max_occurrences) {
        effectiveOccurrences = Math.min(occurrences, factor.max_occurrences);
      }

      // Calculate impact
      const pointsPerOccurrence = factor.default_points;
      const totalImpact = pointsPerOccurrence * effectiveOccurrences;

      // Check for snoozes
      let snoozedOccurrences = 0;
      let snoozedImpact = 0;

      if (this.activeSnoozes.length > 0 && affectedEventIds.length > 0) {
        for (const eventId of affectedEventIds) {
          const snooze = this.activeSnoozes.find(s =>
            s.eventId === eventId &&
            (!s.factorId || s.factorId === factor.id)
          );
          if (snooze) {
            snoozedOccurrences++;
            snoozedImpact += pointsPerOccurrence;
          }
        }
      }

      // Apply deductions
      if (factor.is_penalty) {
        unsnoozedScore -= totalImpact;
        actualScore -= (totalImpact - snoozedImpact);
        snoozedDeductions += snoozedImpact;
      } else {
        // Bonus factors add points
        unsnoozedScore += totalImpact;
        actualScore += (totalImpact - snoozedImpact);
      }

      // Add to breakdowns
      breakdowns.push({
        factorId: factor.id,
        factorCode: factor.factor_code,
        factorName: factor.factor_name,
        occurrences,
        pointsPerOccurrence,
        totalImpact,
        snoozedOccurrences,
        snoozedImpact,
        affectedEventIds: affectedEventIds.slice(0, 10), // Limit for performance
      });
    }

    // Ensure scores stay within bounds
    actualScore = Math.max(0, Math.min(100, actualScore));
    unsnoozedScore = Math.max(0, Math.min(100, unsnoozedScore));

    const result: HealthScoreResult = {
      baseScore,
      actualScore,
      unsnoozedScore,
      snoozedDeductions,
      breakdowns,
      totalEvents: analytics.totalEvents || 0,
      totalMeetings: analytics.totalMeetings || 0,
      totalHours: analytics.totalMeetingHours || 0,
      timeHorizon,
    };

    // Save the score to the backend
    await this.saveHealthScore(result, calendarId, periodStart, periodEnd);

    return result;
  }

  /**
   * Save health score through API
   */
  private async saveHealthScore(
    score: HealthScoreResult,
    calendarId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    if (!this.getToken) return;

    try {
      const token = await this.getToken();
      if (!token) return;

      const response = await fetch('/api/health/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          calendarId,
          timeHorizon: score.timeHorizon,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          baseScore: score.baseScore,
          actualScore: score.actualScore,
          unsnoozedScore: score.unsnoozedScore,
          snoozedDeductions: score.snoozedDeductions,
          totalEvents: score.totalEvents,
          totalMeetings: score.totalMeetings,
          totalHours: score.totalHours,
          calculationMetadata: {},
          breakdowns: score.breakdowns.map(b => ({
            factorId: b.factorId,
            occurrences: b.occurrences,
            pointsPerOccurrence: b.pointsPerOccurrence,
            totalImpact: b.totalImpact,
            snoozedOccurrences: b.snoozedOccurrences,
            snoozedImpact: b.snoozedImpact,
            affectedEventIds: b.affectedEventIds,
            calculationDetails: {},
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        score.healthScoreId = data.healthScoreId;
      } else {
        console.error('Failed to save health score:', await response.text());
      }
    } catch (error) {
      console.error('Failed to save health score:', error);
    }
  }

  /**
   * Create a snooze for a specific event
   */
  async createSnooze(
    calendarId: string,
    eventId: string,
    factorId?: string,
    reason?: string,
    expiresAt?: Date
  ): Promise<void> {
    if (!this.getToken) return;

    try {
      const token = await this.getToken();
      if (!token) return;

      const response = await fetch('/api/health/snooze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          calendarId,
          eventId,
          factorId,
          snoozeReason: reason,
          snoozeType: 'manual',
          expiresAt: expiresAt?.toISOString(),
        }),
      });

      if (response.ok) {
        // Refresh snoozes
        await this.loadHealthFactors(calendarId, true);
      } else {
        console.error('Failed to create snooze:', await response.text());
      }
    } catch (error) {
      console.error('Failed to create snooze:', error);
    }
  }

  /**
   * Update a snooze
   */
  async updateSnooze(
    snoozeId: string,
    updates: { isActive?: boolean; expiresAt?: Date; reason?: string }
  ): Promise<void> {
    if (!this.getToken) return;

    try {
      const token = await this.getToken();
      if (!token) return;

      const response = await fetch('/api/health/snooze', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          snoozeId,
          isActive: updates.isActive,
          expiresAt: updates.expiresAt?.toISOString(),
          snoozeReason: updates.reason,
        }),
      });

      if (response.ok) {
        // Update local cache
        const snooze = this.activeSnoozes.find(s => s.id === snoozeId);
        if (snooze) {
          if (updates.isActive !== undefined) snooze.isActive = updates.isActive;
          if (updates.expiresAt) snooze.expiresAt = updates.expiresAt.toISOString();
          if (updates.reason) snooze.reason = updates.reason;
        }
      } else {
        console.error('Failed to update snooze:', await response.text());
      }
    } catch (error) {
      console.error('Failed to update snooze:', error);
    }
  }

  /**
   * Get active snoozes for a calendar
   */
  async getActiveSnoozes(calendarId: string): Promise<Snooze[]> {
    if (!this.getToken) return [];

    try {
      const token = await this.getToken();
      if (!token) return [];

      const response = await fetch(`/api/health/snooze?calendarId=${calendarId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.activeSnoozes = data.snoozes || [];
        return this.activeSnoozes;
      } else {
        console.error('Failed to get snoozes:', await response.text());
        return [];
      }
    } catch (error) {
      console.error('Failed to get snoozes:', error);
      return [];
    }
  }

  /**
   * Check if tracker is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.healthFactors = [];
    this.activeSnoozes = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
const secureHealthScoreTracker = new SecureHealthScoreTracker();
export default secureHealthScoreTracker;