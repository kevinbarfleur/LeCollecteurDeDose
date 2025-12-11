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
      live_rooms: {
        Row: {
          id: string
          host_id: string
          host_name: string
          host_avatar: string | null
          room_code: string
          is_active: boolean
          spectator_count: number
          created_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          host_id: string
          host_name: string
          host_avatar?: string | null
          room_code?: string
          is_active?: boolean
          spectator_count?: number
          created_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          host_id?: string
          host_name?: string
          host_avatar?: string | null
          room_code?: string
          is_active?: boolean
          spectator_count?: number
          created_at?: string | null
          closed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_short_id: { Args: never; Returns: string }
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

export type LiveRoom = Database['public']['Tables']['live_rooms']['Row']
export type LiveRoomInsert = Database['public']['Tables']['live_rooms']['Insert']

