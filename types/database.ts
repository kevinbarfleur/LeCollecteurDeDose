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
      admin_users: {
        Row: {
          id: string
          twitch_user_id: string
          twitch_display_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          twitch_user_id: string
          twitch_display_name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          twitch_user_id?: string
          twitch_display_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          username: string
          user_avatar: string | null
          card_id: string
          card_tier: string
          outcome: string
          result_card_id: string | null
          replay_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          username: string
          user_avatar?: string | null
          card_id: string
          card_tier: string
          outcome: string
          result_card_id?: string | null
          replay_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          user_avatar?: string | null
          card_id?: string
          card_tier?: string
          outcome?: string
          result_card_id?: string | null
          replay_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          data_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: Json
          data_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          data_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      replays: {
        Row: {
          card_foil: boolean | null
          card_id: string
          card_tier: string
          card_unique_id: number
          card_variation: string
          created_at: string | null
          id: string
          mouse_positions: Json
          outcome: string
          result_card_id: string | null
          user_avatar: string | null
          username: string
          views: number | null
        }
        Insert: {
          card_foil?: boolean | null
          card_id: string
          card_tier: string
          card_unique_id: number
          card_variation: string
          created_at?: string | null
          id?: string
          mouse_positions: Json
          outcome: string
          result_card_id?: string | null
          user_avatar?: string | null
          username: string
          views?: number | null
        }
        Update: {
          card_foil?: boolean | null
          card_id?: string
          card_tier?: string
          card_unique_id?: number
          card_variation?: string
          created_at?: string | null
          id?: string
          mouse_positions?: Json
          outcome?: string
          result_card_id?: string | null
          user_avatar?: string | null
          username?: string
          views?: number | null
        }
        Relationships: []
      }
      dev_test_data: {
        Row: {
          id: string
          test_set_name: string
          user_collection: Json
          user_cards: Json
          uniques: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          test_set_name?: string
          user_collection?: Json
          user_cards?: Json
          uniques?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          test_set_name?: string
          user_collection?: Json
          user_cards?: Json
          uniques?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          id: string
          level: string
          message: string
          stack: string | null
          context: Json
          user_id: string | null
          username: string | null
          source: string
          endpoint: string | null
          status_code: number | null
          created_at: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          level: string
          message: string
          stack?: string | null
          context?: Json
          user_id?: string | null
          username?: string | null
          source: string
          endpoint?: string | null
          status_code?: number | null
          created_at?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          level?: string
          message?: string
          stack?: string | null
          context?: Json
          user_id?: string | null
          username?: string | null
          source?: string
          endpoint?: string | null
          status_code?: number | null
          created_at?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      diagnostic_logs: {
        Row: {
          id: string
          category: string
          action_type: string
          user_id: string | null
          username: string | null
          state_before: Json
          state_after: Json
          action_details: Json
          validation_status: string | null
          validation_notes: string | null
          api_response_time_ms: number | null
          data_mode: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          action_type: string
          user_id?: string | null
          username?: string | null
          state_before?: Json
          state_after?: Json
          action_details?: Json
          validation_status?: string | null
          validation_notes?: string | null
          api_response_time_ms?: number | null
          data_mode?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          category?: string
          action_type?: string
          user_id?: string | null
          username?: string | null
          state_before?: Json
          state_after?: Json
          action_details?: Json
          validation_status?: string | null
          validation_notes?: string | null
          api_response_time_ms?: number | null
          data_mode?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_short_id: { Args: never; Returns: string }
      update_app_setting: {
        Args: {
          setting_key: string
          setting_value: Json
          twitch_user_id: string
          setting_data_mode?: string
        }
        Returns: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
      }
      mark_error_resolved: {
        Args: {
          error_id: string
          resolved_by_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Replay = Database['public']['Tables']['replays']['Row']
export type ReplayInsert = Database['public']['Tables']['replays']['Insert']

export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert']

export type AdminUser = Database['public']['Tables']['admin_users']['Row']
export type AdminUserInsert = Database['public']['Tables']['admin_users']['Insert']

export type AppSetting = Database['public']['Tables']['app_settings']['Row']

export type ErrorLog = Database['public']['Tables']['error_logs']['Row']
export type ErrorLogInsert = Database['public']['Tables']['error_logs']['Insert']

export type DiagnosticLog = Database['public']['Tables']['diagnostic_logs']['Row']
export type DiagnosticLogInsert = Database['public']['Tables']['diagnostic_logs']['Insert']

// Typed app settings
export interface AltarOpenSetting {
  enabled: boolean
}

export interface DataSourceSetting {
  source: 'api' | 'test'
}

export interface ActivityLogsEnabledSetting {
  enabled: boolean
}

export interface DevTestModeSetting {
  enabled: boolean
}

