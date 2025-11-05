/**
 * Zod validation schemas for API input validation
 * Ensures type safety and data integrity for all API endpoints
 */

import { z } from 'zod';

// ============================================
// Activity Logging Schemas
// ============================================

export const LogActionSchema = z.object({
  actionName: z.string().min(1).max(100),
  actionCategory: z.string().min(1).max(50),
  calendarId: z.string().max(255).optional(),
  eventId: z.string().max(255).optional(),
  attendeeCount: z.number().int().min(0).optional(),
  healthScoreImpact: z.number().optional(),
  timeHorizon: z.enum(['today', 'tomorrow', 'week', 'next_week', 'month', 'next_month']).optional(),
  metadata: z.record(z.unknown()).optional(),
  clientTimestamp: z.string().datetime().optional(),
});

export const BatchLogActionsSchema = z.object({
  actions: z.array(LogActionSchema).min(1).max(100), // Max 100 actions per batch
});

export const LogErrorSchema = z.object({
  actionName: z.string().min(1).max(100),
  errorCode: z.string().max(50).optional(),
  errorMessage: z.string().min(1).max(1000),
  errorStack: z.string().max(5000).optional(),
  recoveryAction: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const BatchLogErrorsSchema = z.object({
  errors: z.array(LogErrorSchema).min(1).max(50), // Max 50 errors per batch
});

export const SessionOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'end']),
  sessionId: z.string().uuid().optional(), // Required for update/end
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Health Score Tracking Schemas
// ============================================

export const SaveHealthScoreSchema = z.object({
  calendarId: z.string().max(255),
  timeHorizon: z.string().max(50),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  baseScore: z.number().min(0).max(100),
  actualScore: z.number().min(0).max(100),
  unsnoozedScore: z.number().min(0).max(100),
  snoozedDeductions: z.number().min(0).optional(),
  totalEvents: z.number().int().min(0).optional(),
  totalMeetings: z.number().int().min(0).optional(),
  totalHours: z.number().min(0).optional(),
  calculationMetadata: z.record(z.unknown()).optional(),
  breakdowns: z.array(z.object({
    factorId: z.string().uuid(),
    occurrences: z.number().int().min(0),
    pointsPerOccurrence: z.number(),
    totalImpact: z.number(),
    snoozedOccurrences: z.number().int().min(0).optional(),
    snoozedImpact: z.number().optional(),
    affectedEventIds: z.array(z.string()).optional(),
    calculationDetails: z.record(z.unknown()).optional(),
  })).optional(),
});

export const CreateSnoozeSchema = z.object({
  calendarId: z.string().max(255),
  eventId: z.string().max(255),
  factorId: z.string().uuid().optional(),
  snoozeReason: z.string().max(500).optional(),
  snoozeType: z.enum(['manual', 'pattern', 'auto']),
  patternId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateSnoozeSchema = z.object({
  snoozeId: z.string().uuid(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  snoozeReason: z.string().max(500).optional(),
});

export const LoadHealthFactorsSchema = z.object({
  calendarId: z.string().max(255).optional(),
  includeOverrides: z.boolean().default(true),
  includeSnoozes: z.boolean().default(true),
  includePatterns: z.boolean().default(true),
});

// ============================================
// Calendar Access Tracking Schemas
// ============================================

export const TrackCalendarAccessSchema = z.object({
  calendarId: z.string().max(255),
  calendarName: z.string().max(255).optional(),
  accessLevel: z.string().max(50),
  isPrimary: z.boolean().optional(),
});

// ============================================
// Rate Limiting Schema
// ============================================

export const RateLimitConfig = z.object({
  windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
  maxRequests: z.number().default(100),
  message: z.string().default('Too many requests'),
});

// ============================================
// Helper Types
// ============================================

export type LogAction = z.infer<typeof LogActionSchema>;
export type BatchLogActions = z.infer<typeof BatchLogActionsSchema>;
export type LogError = z.infer<typeof LogErrorSchema>;
export type BatchLogErrors = z.infer<typeof BatchLogErrorsSchema>;
export type SessionOperation = z.infer<typeof SessionOperationSchema>;
export type SaveHealthScore = z.infer<typeof SaveHealthScoreSchema>;
export type CreateSnooze = z.infer<typeof CreateSnoozeSchema>;
export type UpdateSnooze = z.infer<typeof UpdateSnoozeSchema>;
export type LoadHealthFactors = z.infer<typeof LoadHealthFactorsSchema>;
export type TrackCalendarAccess = z.infer<typeof TrackCalendarAccessSchema>;