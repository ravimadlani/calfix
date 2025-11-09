export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      action_errors: {
        Row: {
          action_name: string
          action_type_id: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          error_metadata: Json | null
          error_stack: string | null
          id: string
          recovery_action: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          action_name: string
          action_type_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          error_metadata?: Json | null
          error_stack?: string | null
          id?: string
          recovery_action?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          action_name?: string
          action_type_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          error_metadata?: Json | null
          error_stack?: string | null
          id?: string
          recovery_action?: string | null
          session_id?: string | null
          user_id?: string
        }
      }
      action_types: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          severity_level: string | null
          updated_at: string | null
        }
      }
      user_actions: {
        Row: {
          action_category: string
          action_metadata: Json | null
          action_name: string
          action_type_id: string | null
          attendee_count: number | null
          calendar_id: string | null
          client_timestamp: string | null
          created_at: string | null
          event_id: string | null
          health_score_impact: number | null
          id: string
          server_timestamp: string | null
          session_id: string | null
          time_horizon: string | null
          user_id: string
        }
        Insert: {
          action_category: string
          action_metadata?: Json | null
          action_name: string
          action_type_id?: string | null
          attendee_count?: number | null
          calendar_id?: string | null
          client_timestamp?: string | null
          created_at?: string | null
          event_id?: string | null
          health_score_impact?: number | null
          id?: string
          server_timestamp?: string | null
          session_id?: string | null
          time_horizon?: string | null
          user_id: string
        }
      }
      user_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          ip_address: unknown
          last_activity_at: string | null
          session_metadata: Json | null
          started_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          session_metadata?: Json | null
          started_at?: string | null
          user_agent?: string | null
          user_id: string
        }
      }
      health_scores: {
        Row: {
          actual_score: number
          base_score: number
          calculation_metadata: Json | null
          calendar_id: string
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          snoozed_deductions: number | null
          time_horizon: string
          total_events: number | null
          total_hours: number | null
          total_meetings: number | null
          unsnoozed_score: number
          updated_at: string | null
          user_id: string
        }
      }
      health_score_factors: {
        Row: {
          aggregation_type: string
          category: string
          created_at: string | null
          default_points: number
          description: string | null
          detection_logic: string | null
          factor_code: string
          factor_name: string
          id: string
          implementation_status: string | null
          is_enabled: boolean | null
          is_penalty: boolean | null
          max_occurrences: number | null
          updated_at: string | null
        }
      }
      health_alert_snoozes: {
        Row: {
          calendar_id: string
          created_at: string | null
          event_id: string
          expires_at: string | null
          factor_id: string | null
          id: string
          is_active: boolean | null
          pattern_id: string | null
          snooze_reason: string | null
          snooze_type: string
          snoozed_at: string | null
          updated_at: string | null
          user_id: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']