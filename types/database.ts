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
      unique_cards: {
        Row: {
          uid: number
          id: string
          name: string
          item_class: string
          rarity: string
          tier: string
          flavour_text: string | null
          wiki_url: string | null
          game_data: Json
          relevance_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          uid: number
          id: string
          name: string
          item_class: string
          rarity: string
          tier: string
          flavour_text?: string | null
          wiki_url?: string | null
          game_data?: Json
          relevance_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          uid?: number
          id?: string
          name?: string
          item_class?: string
          rarity?: string
          tier?: string
          flavour_text?: string | null
          wiki_url?: string | null
          game_data?: Json
          relevance_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          twitch_username: string
          twitch_user_id: string | null
          display_name: string | null
          avatar_url: string | null
          vaal_orbs: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          twitch_username: string
          twitch_user_id?: string | null
          display_name?: string | null
          avatar_url?: string | null
          vaal_orbs?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          twitch_username?: string
          twitch_user_id?: string | null
          display_name?: string | null
          avatar_url?: string | null
          vaal_orbs?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_collections: {
        Row: {
          id: string
          user_id: string
          card_uid: number
          quantity: number
          normal_count: number
          foil_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_uid: number
          quantity?: number
          normal_count?: number
          foil_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_uid?: number
          quantity?: number
          normal_count?: number
          foil_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collections_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collections_card_uid_fkey"
            columns: ["card_uid"]
            referencedRelation: "unique_cards"
            referencedColumns: ["uid"]
          }
        ]
      }
      user_boosters: {
        Row: {
          id: string
          user_id: string
          opened_at: string
          booster_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          opened_at?: string
          booster_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          opened_at?: string
          booster_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_boosters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      booster_cards: {
        Row: {
          id: string
          booster_id: string
          card_uid: number
          is_foil: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          booster_id: string
          card_uid: number
          is_foil?: boolean
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          booster_id?: string
          card_uid?: number
          is_foil?: boolean
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booster_cards_booster_id_fkey"
            columns: ["booster_id"]
            referencedRelation: "user_boosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booster_cards_card_uid_fkey"
            columns: ["card_uid"]
            referencedRelation: "unique_cards"
            referencedColumns: ["uid"]
          }
        ]
      }
      backup: {
        Row: {
          id: string
          backup_date: string
          backup_time: string
          user_collection: Json
          user_cards: Json
          uniques: Json
          bot_config: Json | null
          app_settings: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          backup_date?: string
          backup_time?: string
          user_collection?: Json
          user_cards?: Json
          uniques?: Json
          bot_config?: Json | null
          app_settings?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          backup_date?: string
          backup_time?: string
          user_collection?: Json
          user_cards?: Json
          uniques?: Json
          bot_config?: Json | null
          app_settings?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      bot_config: {
        Row: {
          key: string
          value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_messages: {
        Row: {
          id: string
          category: string
          item_key: string
          message_type: string
          messages: string[]
          description: string | null
          variables: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          category: string
          item_key: string
          message_type: string
          messages?: string[]
          description?: string | null
          variables?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          item_key?: string
          message_type?: string
          messages?: string[]
          description?: string | null
          variables?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      batch_event_presets: {
        Row: {
          id: string
          category: string
          display_name: string
          emoji: string
          description: string | null
          announcement: string
          completion_message: string
          delay_between_events_ms: number
          actions: Json
          is_enabled: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          category: string
          display_name: string
          emoji?: string
          description?: string | null
          announcement: string
          completion_message: string
          delay_between_events_ms?: number
          actions?: Json
          is_enabled?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          display_name?: string
          emoji?: string
          description?: string | null
          announcement?: string
          completion_message?: string
          delay_between_events_ms?: number
          actions?: Json
          is_enabled?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      batch_event_categories: {
        Row: {
          id: string
          label: string
          emoji: string
          sort_order: number
        }
        Insert: {
          id: string
          label: string
          emoji?: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          emoji?: string
          sort_order?: number
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
      get_or_create_user: {
        Args: {
          p_twitch_username: string
          p_twitch_user_id?: string | null
          p_display_name?: string | null
          p_avatar_url?: string | null
        }
        Returns: string
      }
      add_card_to_collection: {
        Args: {
          p_user_id: string
          p_card_uid: number
          p_is_foil?: boolean
        }
        Returns: undefined
      }
      update_vaal_orbs: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: undefined
      }
      set_card_collection_counts: {
        Args: {
          p_user_id: string
          p_card_uid: number
          p_normal_count?: number
          p_foil_count?: number
        }
        Returns: undefined
      }
      set_vaal_orbs: {
        Args: {
          p_user_id: string
          p_count: number
        }
        Returns: undefined
      }
      refresh_user_collection_summary: {
        Args: never
        Returns: undefined
      }
      refresh_recent_boosters_summary: {
        Args: never
        Returns: undefined
      }
      get_ladder_stats: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          twitch_username: string
          display_name: string
          avatar_url: string | null
          unique_cards: number
          total_cards: number
          foil_count: number
          t0_count: number
          t1_count: number
          t2_count: number
          t3_count: number
        }[]
      }
      get_ladder_global_stats: {
        Args: Record<string, never>
        Returns: {
          total_players: number
          total_cards_distributed: number
          total_unique_cards: number
        }[]
      }
      upsert_unique_card: {
        Args: {
          p_uid: number | null
          p_id: string
          p_name: string
          p_item_class: string
          p_rarity: string
          p_tier: string
          p_flavour_text?: string | null
          p_wiki_url?: string | null
          p_game_data?: Json
          p_relevance_score?: number
        }
        Returns: Database['public']['Tables']['unique_cards']['Row']
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

// Ladder and stats types
export type LadderPlayerRow = Database['public']['Functions']['get_ladder_stats']['Returns'][number]
export type LadderGlobalStatsRow = Database['public']['Functions']['get_ladder_global_stats']['Returns'][number]

// Bot configuration types
export type BotConfig = Database['public']['Tables']['bot_config']['Row']
export type BotConfigInsert = Database['public']['Tables']['bot_config']['Insert']

export type BotMessage = Database['public']['Tables']['bot_messages']['Row']
export type BotMessageInsert = Database['public']['Tables']['bot_messages']['Insert']

export type BatchEventPreset = Database['public']['Tables']['batch_event_presets']['Row']
export type BatchEventPresetInsert = Database['public']['Tables']['batch_event_presets']['Insert']

export type BatchEventCategory = Database['public']['Tables']['batch_event_categories']['Row']
export type BatchEventCategoryInsert = Database['public']['Tables']['batch_event_categories']['Insert']

