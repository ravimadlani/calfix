import type { CalendarEvent, EventWithGap } from './calendar';
import type { CalendarAnalytics } from './analytics';

export type IntentType =
  | 'find_availability'
  | 'check_conflicts'
  | 'respond_to_request'
  | 'bulk_action'
  | 'create_focus_block'
  | 'multi_timezone_query'
  | 'suggest_reschedule';

export interface TimezoneConstraint {
  timezone: string;
  label: string;
  hoursStart: number;
  hoursEnd: number;
}

export type BulkActionType =
  | 'add_buffers_after'
  | 'add_buffers_before'
  | 'clear_after_hours'
  | 'add_focus_blocks'
  | 'remove_after_hours'
  | 'unknown';

export interface ProposedTime {
  label?: string;
  start: string;
  end?: string;
  durationMinutes?: number;
  timezone?: string;
}

export interface IntentParameters {
  duration?: number;
  date_range?: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'next_month' | 'custom';
  custom_dates?: string[];
  timezone_constraints?: TimezoneConstraint[];
  working_hours_only?: boolean;
  proposed_times?: ProposedTime[];
  action_type?: BulkActionType;
  focus_preferences?: 'morning' | 'afternoon' | 'evening' | 'any';
  preview_mode?: boolean;
  target_day?: string;
}

export interface Intent {
  type: IntentType;
  params: IntentParameters;
  confidence: number;
  rawCommand: string;
}

export interface NaturalLanguageContext {
  currentDate: Date;
  userTimezone: string;
  availableIntents: IntentType[];
  currentView?: string;
}

export interface ParsedIntentResult {
  intent: Intent | null;
  source: 'openai' | 'fallback';
  confidence: number;
  warnings?: string[];
  error?: string;
  rawResponse?: unknown;
}

export interface SlotSuggestion {
  start: string;
  end: string;
  durationMinutes: number;
  label?: string;
  isWithinConstraints: boolean;
  timezoneSummaries: Array<{ timezone: string; formatted: string }>;
  notes?: string;
}

export interface ConflictCheck {
  proposed: ProposedTime;
  status: 'free' | 'conflict';
  conflictingEvents: Array<Pick<CalendarEvent, 'id' | 'summary' | 'start' | 'end'>>;
}

export interface ActionPreviewItem {
  eventId: string;
  summary: string;
  originalStart: string;
  originalEnd: string;
  proposedChange: string;
}

export interface BufferActionInput {
  position: 'before' | 'after';
  events: CalendarEvent[];
  bufferMinutes?: number;
}

export interface BufferActionResult {
  appliedCount: number;
}

export interface IntentActionHandlers {
  applyBuffers?(input: BufferActionInput): Promise<BufferActionResult>;
  createFocusBlock?(slot: SlotSuggestion): Promise<void>;
}

export interface IntentExecutionContext {
  events: CalendarEvent[];
  eventsWithGaps?: EventWithGap[];
  currentDate: Date;
  timezone: string;
  calendarOwnerEmail?: string | null;
  managedCalendarId?: string;
  currentView?: string;
  timeRange?: { timeMin: string; timeMax: string } | null;
  analytics?: CalendarAnalytics | null;
  actions?: IntentActionHandlers;
}

export interface IntentExecutionResult {
  intentType: IntentType;
  status: 'success' | 'error';
  title: string;
  summary: string;
  slots?: SlotSuggestion[];
  conflicts?: ConflictCheck[];
  draftResponse?: string;
  actionPreview?: ActionPreviewItem[];
  suggestions?: string[];
  meta?: Record<string, unknown>;
  warnings?: string[];
}

export interface FormattedIntentResponse {
  text: string;
  details?: {
    slots?: SlotSuggestion[];
    conflicts?: ConflictCheck[];
    draftResponse?: string;
    actionPreview?: ActionPreviewItem[];
    suggestions?: string[];
  };
}

export interface NaturalLanguageMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'pending' | 'complete';
  meta?: Record<string, unknown>;
}
