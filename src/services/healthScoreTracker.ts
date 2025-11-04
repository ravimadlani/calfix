/**
 * Health Score Tracker Service
 *
 * Manages health score tracking with:
 * - Multi-horizon scoring (today, tomorrow, week, etc.)
 * - Snooze support (actual vs unsnoozed scores)
 * - Configurable factors and aggregation
 * - Real-time score updates
 * - Pattern-based auto-snoozing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Json } from '../types/supabase';
import type { CalendarEvent } from '../types/calendar';

// Types
export type TimeHorizon = 'today' | 'tomorrow' | 'week' | 'next_week' | 'month' | 'next_month';
export type AggregationType = 'per_occurrence' | 'once_per_period' | 'capped';

export interface HealthFactor {
  id: string;
  factorCode: string;
  factorName: string;
  category: string;
  description: string;
  defaultPoints: number;
  aggregationType: AggregationType;
  maxOccurrences?: number;
  isEnabled: boolean;
  isPenalty: boolean;
  implementationStatus: 'implemented' | 'detected_only' | 'planned';
}

export interface HealthScore {
  timeHorizon: TimeHorizon;
  periodStart: Date;
  periodEnd: Date;
  baseScore: number;
  actualScore: number;
  unsnoozedScore: number;
  snoozedDeductions: number;
  totalEvents: number;
  totalMeetings: number;
  totalHours: number;
  breakdown: HealthScoreBreakdown[];
}

export interface HealthScoreBreakdown {
  factorId: string;
  factorCode: string;
  factorName: string;
  occurrences: number;
  pointsPerOccurrence: number;
  totalImpact: number;
  snoozedOccurrences: number;
  snoozedImpact: number;
  affectedEventIds: string[];
}

export interface SnoozeRequest {
  eventId: string;
  factorId?: string;
  reason?: string;
  expiresAt?: Date;
}

export interface SnoozePattern {
  id: string;
  patternName: string;
  patternType: 'event_title' | 'attendee' | 'time_range' | 'location' | 'recurring' | 'custom';
  factorId?: string;
  patternConfig: Json;
  isEnabled: boolean;
}

class HealthScoreTracker {
  private supabase: SupabaseClient | null = null;
  private userId: string | null = null;
  private factors: Map<string, HealthFactor> = new Map();
  private userOverrides: Map<string, Json> = new Map();
  private activeSnoozes: Map<string, Set<string>> = new Map(); // eventId -> factorIds
  private snoozePatterns: SnoozePattern[] = [];
  private isInitialized = false;

  /**
   * Initialize the Health Score Tracker
   */
  async initialize(supabaseUrl: string, supabaseKey: string, userId: string): Promise<void> {
    if (this.isInitialized) {
      console.warn('HealthScoreTracker already initialized');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.userId = userId;

    // Load configuration
    await Promise.all([
      this.loadHealthFactors(),
      this.loadUserOverrides(),
      this.loadActiveSnoozes(),
      this.loadSnoozePatterns()
    ]);

    this.isInitialized = true;
    console.log('HealthScoreTracker initialized successfully');
  }

  /**
   * Load health factors configuration
   */
  private async loadHealthFactors(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: factors } = await this.supabase
        .from('health_score_factors')
        .select('*')
        .eq('is_enabled', true);

      if (factors) {
        factors.forEach(factor => {
          this.factors.set(factor.factor_code, {
            id: factor.id,
            factorCode: factor.factor_code,
            factorName: factor.factor_name,
            category: factor.category,
            description: factor.description,
            defaultPoints: parseFloat(factor.default_points),
            aggregationType: factor.aggregation_type as AggregationType,
            maxOccurrences: factor.max_occurrences,
            isEnabled: factor.is_enabled,
            isPenalty: factor.is_penalty,
            implementationStatus: factor.implementation_status
          });
        });
      }
    } catch (error) {
      console.error('Failed to load health factors:', error);
    }
  }

  /**
   * Load user-specific overrides
   */
  private async loadUserOverrides(): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      const { data: overrides } = await this.supabase
        .from('user_health_factor_overrides')
        .select('*')
        .eq('user_id', this.userId);

      if (overrides) {
        overrides.forEach(override => {
          const key = `${override.calendar_id || 'all'}_${override.factor_id}`;
          this.userOverrides.set(key, override);
        });
      }
    } catch (error) {
      console.error('Failed to load user overrides:', error);
    }
  }

  /**
   * Load active snoozes
   */
  private async loadActiveSnoozes(): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      const { data: snoozes } = await this.supabase
        .from('health_alert_snoozes')
        .select('event_id, factor_id')
        .eq('user_id', this.userId)
        .eq('is_active', true);

      if (snoozes) {
        snoozes.forEach(snooze => {
          if (!this.activeSnoozes.has(snooze.event_id)) {
            this.activeSnoozes.set(snooze.event_id, new Set());
          }
          if (snooze.factor_id) {
            this.activeSnoozes.get(snooze.event_id)!.add(snooze.factor_id);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load active snoozes:', error);
    }
  }

  /**
   * Load snooze patterns
   */
  private async loadSnoozePatterns(): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      const { data: patterns } = await this.supabase
        .from('health_snooze_patterns')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_enabled', true)
        .order('priority', { ascending: false });

      if (patterns) {
        this.snoozePatterns = patterns.map(pattern => ({
          id: pattern.id,
          patternName: pattern.pattern_name,
          patternType: pattern.pattern_type as 'event_title' | 'attendee' | 'time_range' | 'location' | 'recurring' | 'custom',
          factorId: pattern.factor_id,
          patternConfig: pattern.pattern_config,
          isEnabled: pattern.is_enabled
        }));
      }
    } catch (error) {
      console.error('Failed to load snooze patterns:', error);
    }
  }

  /**
   * Calculate health scores for all time horizons
   */
  async calculateHealthScores(
    events: CalendarEvent[],
    calendarId: string
  ): Promise<Map<TimeHorizon, HealthScore>> {
    const scores = new Map<TimeHorizon, HealthScore>();
    const now = new Date();

    // Define time periods
    const periods = this.getTimePeriods(now);

    // Calculate score for each period
    for (const [horizon, { start, end }] of Object.entries(periods)) {
      // Filter events for this period
      const periodEvents = this.filterEventsForPeriod(events, start, end);

      // Calculate score
      const score = await this.calculatePeriodScore(
        periodEvents,
        horizon as TimeHorizon,
        start,
        end,
        calendarId
      );

      scores.set(horizon as TimeHorizon, score);
    }

    // Save scores to database
    await this.saveHealthScores(scores, calendarId);

    return scores;
  }

  /**
   * Calculate score for a specific time period
   */
  private async calculatePeriodScore(
    events: CalendarEvent[],
    horizon: TimeHorizon,
    periodStart: Date,
    periodEnd: Date,
    calendarId: string
  ): Promise<HealthScore> {
    const baseScore = 100;
    let unsnoozedScore = baseScore;
    let actualScore = baseScore;
    const breakdown: HealthScoreBreakdown[] = [];

    // Apply each enabled factor
    for (const [factorCode, factor] of this.factors) {
      if (!factor.isEnabled || factor.implementationStatus === 'planned') continue;

      // Detect occurrences based on factor
      const detections = this.detectFactorOccurrences(events, factorCode);
      if (detections.length === 0) continue;

      // Get effective points (with user overrides)
      const effectivePoints = this.getEffectivePoints(factor, calendarId);

      // Calculate impact based on aggregation type
      let occurrences = detections.length;
      let totalImpact = 0;

      switch (factor.aggregationType) {
        case 'per_occurrence':
          if (factor.maxOccurrences) {
            occurrences = Math.min(occurrences, factor.maxOccurrences);
          }
          totalImpact = effectivePoints * occurrences;
          break;

        case 'once_per_period':
          occurrences = 1;
          totalImpact = effectivePoints;
          break;

        case 'capped':
          if (factor.maxOccurrences) {
            occurrences = Math.min(occurrences, factor.maxOccurrences);
          }
          totalImpact = effectivePoints * occurrences;
          break;
      }

      // Calculate snoozed impact
      const snoozedEvents = detections.filter(eventId =>
        this.isEventSnoozed(eventId, factor.id)
      );
      const snoozedOccurrences = snoozedEvents.length;
      const snoozedImpact = effectivePoints * snoozedOccurrences;

      // Apply to scores
      unsnoozedScore += totalImpact;
      actualScore += (totalImpact - snoozedImpact);

      // Add to breakdown
      breakdown.push({
        factorId: factor.id,
        factorCode: factor.factorCode,
        factorName: factor.factorName,
        occurrences,
        pointsPerOccurrence: effectivePoints,
        totalImpact,
        snoozedOccurrences,
        snoozedImpact,
        affectedEventIds: detections
      });
    }

    // Cap scores between 0 and 100
    unsnoozedScore = Math.max(0, Math.min(100, unsnoozedScore));
    actualScore = Math.max(0, Math.min(100, actualScore));

    // Calculate metadata
    const totalEvents = events.length;
    const totalMeetings = events.filter(e => this.isMeeting(e)).length;
    const totalHours = this.calculateTotalHours(events);

    return {
      timeHorizon: horizon,
      periodStart,
      periodEnd,
      baseScore,
      actualScore,
      unsnoozedScore,
      snoozedDeductions: unsnoozedScore - actualScore,
      totalEvents,
      totalMeetings,
      totalHours,
      breakdown
    };
  }

  /**
   * Detect occurrences of a specific factor
   */
  private detectFactorOccurrences(events: CalendarEvent[], factorCode: string): string[] {
    const eventIds: string[] = [];

    // This is a simplified version - in production, you'd call the actual detection functions
    // from healthCalculator.ts based on the factor code
    switch (factorCode) {
      case 'back_to_back':
        // Detect back-to-back meetings
        for (let i = 0; i < events.length - 1; i++) {
          if (this.isMeeting(events[i]) && this.isMeeting(events[i + 1])) {
            const gap = this.calculateGap(events[i], events[i + 1]);
            if (gap === 0) {
              eventIds.push(events[i].id);
            }
          }
        }
        break;

      case 'insufficient_buffer':
        // Detect insufficient buffer between meetings
        for (let i = 0; i < events.length - 1; i++) {
          if (this.isMeeting(events[i]) && this.isMeeting(events[i + 1])) {
            const gap = this.calculateGap(events[i], events[i + 1]);
            if (gap > 0 && gap < 10) {
              eventIds.push(events[i].id);
            }
          }
        }
        break;

      case 'focus_block':
        // Detect focus time blocks (60-120 min gaps)
        for (let i = 0; i < events.length - 1; i++) {
          const gap = this.calculateGap(events[i], events[i + 1]);
          if (gap >= 60 && gap <= 120) {
            eventIds.push(`gap_${i}`); // Pseudo ID for gaps
          }
        }
        break;

      case 'meeting_overload_6h': {
        // Check if total meeting time > 6 hours
        const totalHours = this.calculateTotalMeetingHours(events);
        if (totalHours > 6) {
          eventIds.push('day_overload_6h');
        }
        break;
      }

      case 'meeting_overload_8h': {
        // Check if total meeting time > 8 hours
        const totalHours8 = this.calculateTotalMeetingHours(events);
        if (totalHours8 > 8) {
          eventIds.push('day_overload_8h');
        }
        break;
      }

      // Add other factor detections as needed
    }

    return eventIds;
  }

  /**
   * Get effective points for a factor (with overrides)
   */
  private getEffectivePoints(factor: HealthFactor, calendarId: string): number {
    // Check for user override
    const overrideKey = `${calendarId}_${factor.id}`;
    const globalOverrideKey = `all_${factor.id}`;

    const override = this.userOverrides.get(overrideKey) || this.userOverrides.get(globalOverrideKey);

    if (override && typeof override === 'object' && !Array.isArray(override)) {
      const overrideObj = override as Record<string, unknown>;
      if (overrideObj.is_disabled) return 0;
      if (overrideObj.override_points !== null && overrideObj.override_points !== undefined) {
        return Number(overrideObj.override_points);
      }
    }

    return factor.defaultPoints;
  }

  /**
   * Check if an event is snoozed for a factor
   */
  private isEventSnoozed(eventId: string, factorId: string): boolean {
    const snoozes = this.activeSnoozes.get(eventId);
    if (!snoozes) return false;

    // Check if this specific factor is snoozed, or if all factors are snoozed
    return snoozes.has(factorId) || snoozes.has('all');
  }

  /**
   * Snooze an alert for an event
   */
  async snoozeAlert(request: SnoozeRequest, calendarId: string): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      // Create snooze record
      const { error } = await this.supabase
        .from('health_alert_snoozes')
        .insert({
          user_id: this.userId,
          calendar_id: calendarId,
          event_id: request.eventId,
          factor_id: request.factorId || null,
          snooze_reason: request.reason || 'Manual snooze',
          snooze_type: 'manual',
          expires_at: request.expiresAt || null
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update local cache
      if (!this.activeSnoozes.has(request.eventId)) {
        this.activeSnoozes.set(request.eventId, new Set());
      }
      this.activeSnoozes.get(request.eventId)!.add(request.factorId || 'all');

      console.log(`Snoozed alert for event ${request.eventId}`);
    } catch (error) {
      console.error('Failed to snooze alert:', error);
      throw error;
    }
  }

  /**
   * Apply snooze patterns to events
   */
  async applySnoozePatterns(events: CalendarEvent[], calendarId: string): Promise<number> {
    let snoozesCreated = 0;

    for (const event of events) {
      for (const pattern of this.snoozePatterns) {
        if (this.eventMatchesPattern(event, pattern)) {
          // Check if already snoozed
          if (this.isEventSnoozed(event.id, pattern.factorId || 'all')) continue;

          // Apply snooze
          await this.snoozeAlert({
            eventId: event.id,
            factorId: pattern.factorId,
            reason: `Auto-snoozed by pattern: ${pattern.patternName}`
          }, calendarId);

          snoozesCreated++;
        }
      }
    }

    return snoozesCreated;
  }

  /**
   * Check if an event matches a snooze pattern
   */
  private eventMatchesPattern(event: CalendarEvent, pattern: SnoozePattern): boolean {
    const config = pattern.patternConfig as Record<string, unknown>;

    switch (pattern.patternType) {
      case 'event_title': {
        if (!event.summary) return false;
        const titleLower = event.summary.toLowerCase();
        const titlePatterns = (config.title_contains as string[]) || [];
        return titlePatterns.some((p: string) =>
          titleLower.includes(p.toLowerCase())
        );
      }

      case 'attendee':
        if (!event.attendees) return false;
        if (config.attendee_count_gt) {
          return event.attendees.length > (config.attendee_count_gt as number);
        }
        if (config.attendee_emails) {
          const emails = config.attendee_emails as string[];
          return event.attendees.some(a =>
            emails.includes(a.email)
          );
        }
        return false;

      case 'time_range':
        // Implement time range matching
        return false;

      case 'location': {
        if (!event.location) return false;
        const locationPatterns = (config.location_contains as string[]) || [];
        return locationPatterns.some((p: string) =>
          event.location.toLowerCase().includes(p.toLowerCase())
        );
      }

      case 'recurring':
        return !!event.recurringEventId;

      case 'custom':
        // Custom pattern matching would be implemented here
        return false;

      default:
        return false;
    }
  }

  /**
   * Save health scores to database
   */
  private async saveHealthScores(
    scores: Map<TimeHorizon, HealthScore>,
    calendarId: string
  ): Promise<void> {
    if (!this.supabase || !this.userId) return;

    try {
      for (const [horizon, score] of scores) {
        // Save main score record
        const { data: scoreRecord, error: scoreError } = await this.supabase
          .from('health_scores')
          .insert({
            user_id: this.userId,
            calendar_id: calendarId,
            time_horizon: horizon,
            period_start: score.periodStart,
            period_end: score.periodEnd,
            base_score: score.baseScore,
            actual_score: score.actualScore,
            unsnoozed_score: score.unsnoozedScore,
            snoozed_deductions: score.snoozedDeductions,
            total_events: score.totalEvents,
            total_meetings: score.totalMeetings,
            total_hours: score.totalHours,
            calculation_metadata: {
              calculated_at: new Date(),
              factors_applied: score.breakdown.length
            }
          })
          .select('id')
          .single();

        if (scoreError) throw scoreError;

        // Save breakdown records
        if (scoreRecord && score.breakdown.length > 0) {
          const breakdownRecords = score.breakdown.map(item => ({
            health_score_id: scoreRecord.id,
            factor_id: item.factorId,
            occurrences: item.occurrences,
            points_per_occurrence: item.pointsPerOccurrence,
            total_impact: item.totalImpact,
            snoozed_occurrences: item.snoozedOccurrences,
            snoozed_impact: item.snoozedImpact,
            affected_event_ids: item.affectedEventIds,
            calculation_details: {}
          }));

          const { error: breakdownError } = await this.supabase
            .from('health_score_breakdowns')
            .insert(breakdownRecords);

          if (breakdownError) throw breakdownError;
        }
      }
    } catch (error) {
      console.error('Failed to save health scores:', error);
    }
  }

  /**
   * Get time periods for each horizon
   */
  private getTimePeriods(now: Date): Record<TimeHorizon, { start: Date; end: Date }> {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const nextWeekStart = new Date(weekEnd);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    nextWeekStart.setHours(0, 0, 0, 0);

    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    nextMonthEnd.setHours(23, 59, 59, 999);

    return {
      today: {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      },
      tomorrow: {
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1)
      },
      week: {
        start: weekStart,
        end: weekEnd
      },
      next_week: {
        start: nextWeekStart,
        end: nextWeekEnd
      },
      month: {
        start: monthStart,
        end: monthEnd
      },
      next_month: {
        start: nextMonthStart,
        end: nextMonthEnd
      }
    };
  }

  /**
   * Filter events for a specific period
   */
  private filterEventsForPeriod(
    events: CalendarEvent[],
    start: Date,
    end: Date
  ): CalendarEvent[] {
    return events.filter(event => {
      const eventStart = this.getEventStartTime(event);
      // const eventEnd = this.getEventEndTime(event); // Not currently used

      return eventStart >= start && eventStart <= end;
    });
  }

  /**
   * Helper: Check if event is a meeting
   */
  private isMeeting(event: CalendarEvent): boolean {
    return !!(event.attendees && event.attendees.length > 0);
  }

  /**
   * Helper: Calculate gap between events in minutes
   */
  private calculateGap(event1: CalendarEvent, event2: CalendarEvent): number {
    const end1 = this.getEventEndTime(event1);
    const start2 = this.getEventStartTime(event2);
    return (start2.getTime() - end1.getTime()) / (1000 * 60);
  }

  /**
   * Helper: Calculate total hours of events
   */
  private calculateTotalHours(events: CalendarEvent[]): number {
    return events.reduce((total, event) => {
      const start = this.getEventStartTime(event);
      const end = this.getEventEndTime(event);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  }

  /**
   * Helper: Calculate total meeting hours
   */
  private calculateTotalMeetingHours(events: CalendarEvent[]): number {
    return events
      .filter(event => this.isMeeting(event))
      .reduce((total, event) => {
        const start = this.getEventStartTime(event);
        const end = this.getEventEndTime(event);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);
  }

  /**
   * Helper: Get event start time
   */
  private getEventStartTime(event: CalendarEvent): Date {
    if (event.start.dateTime) {
      return new Date(event.start.dateTime);
    } else if (event.start.date) {
      return new Date(event.start.date);
    }
    return new Date();
  }

  /**
   * Helper: Get event end time
   */
  private getEventEndTime(event: CalendarEvent): Date {
    if (event.end.dateTime) {
      return new Date(event.end.dateTime);
    } else if (event.end.date) {
      return new Date(event.end.date);
    }
    return new Date();
  }

  /**
   * Get latest health scores from cache
   */
  getLatestScores(): Map<TimeHorizon, HealthScore> | null {
    // This would be implemented with local caching
    return null;
  }

  /**
   * Clean up and shut down the tracker
   */
  async shutdown(): Promise<void> {
    this.isInitialized = false;
    this.factors.clear();
    this.userOverrides.clear();
    this.activeSnoozes.clear();
    this.snoozePatterns = [];
    console.log('HealthScoreTracker shut down successfully');
  }
}

// Export singleton instance
export const healthScoreTracker = new HealthScoreTracker();

// Helper function to track health impact of an action
export async function trackHealthImpact(
  actionId: string,
  beforeScore: number,
  afterScore: number,
  horizon: TimeHorizon
  // factorsAffected: unknown[] // Commented out - will be used when implementation is complete
): Promise<void> {
  // Implementation would save to action_health_impacts table
  console.log(`Health impact tracked: ${beforeScore} -> ${afterScore} for ${horizon}`);
}