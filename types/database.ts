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
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
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
        }
        Returns: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
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

// Typed app settings
export interface AltarOpenSetting {
  enabled: boolean
}

export interface DataSourceSetting {
  source: 'mock' | 'api'
}

export interface ActivityLogsEnabledSetting {
  enabled: boolean
}

export interface DevTestModeSetting {
  enabled: boolean
}

