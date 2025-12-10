// ==========================================
// TEMPLATE TYPES - Full Step 1 State
// ==========================================

export interface TemplateParticipant {
  displayName: string;
  email: string;
  timezone: string;
  startHour: string;        // "HH:MM" format, e.g. "08:30"
  endHour: string;          // "HH:MM" format, e.g. "17:30"
  sendInvite: boolean;
  role: 'host' | 'required' | 'optional';
  flexibleHours: boolean;
}

export interface TemplateTimezoneGuardrail {
  timezone: string;
  label: string;
}

export interface TemplateConfig {
  // Core scheduling parameters
  meetingPurpose: string;
  duration: number;           // minutes (30, 45, 60, 75, 90)
  searchWindowDays: number;   // days (7, 10, 14, 21, 30)

  // Participants with full working hours
  participants: TemplateParticipant[];

  // Timezone guardrails
  respectedTimezones: TemplateTimezoneGuardrail[];

  // Calendar selection (optional - defaults to user's primary)
  calendarId?: string;
}

export interface ScheduleTemplate {
  id: string;
  user_id: string;
  name: string;
  config: TemplateConfig;
  created_at: string;
}

// ==========================================
// HOLD TYPES
// ==========================================

export interface HoldParticipant {
  email: string;
  name: string;
  timezone?: string;
  sendInvite?: boolean;
}

export interface CalendarHold {
  id: string;
  user_id: string;
  event_id: string;
  calendar_id: string;
  meeting_purpose: string;
  participants: HoldParticipant[] | null;
  start_time: string;
  end_time: string;
  status: 'active' | 'confirmed' | 'canceled';
  created_at: string;
}

// ==========================================
// INPUT TYPES for API calls
// ==========================================

export interface CreateHoldInput {
  event_id: string;
  calendar_id: string;
  meeting_purpose: string;
  participants: HoldParticipant[] | null;
  start_time: string;
  end_time: string;
}
