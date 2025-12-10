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
          user_avatar?: string | null
          username?: string
          views?: number | null
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

