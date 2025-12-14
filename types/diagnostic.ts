/**
 * Diagnostic Log Types
 * 
 * Types for diagnostic logging and application behavior tracking
 */

export type DiagnosticCategory = 'altar' | 'admin'

export type AltarActionType = 'vaal_outcome' | 'load_collection'

export type AdminActionType = 'toggle_altar' | 'toggle_activity_logs' | 'switch_data_source'

export type ValidationStatus = 'ok' | 'warning' | 'error'

export type DataMode = 'api' | 'test'

export type VaalOutcomeType = 'nothing' | 'foil' | 'duplicate' | 'destroyed' | 'transform'

// State structures for altar diagnostics
export interface AltarState {
  vaal_orbs_count: number
  total_cards_count: number
  cards_by_tier: {
    common?: number
    rare?: number
    epic?: number
    legendary?: number
  }
  cards_hash?: string // Hash MD5 of the card list for quick comparison
}

// State structures for admin diagnostics
export interface AdminState {
  altar_open?: boolean
  activity_logs_enabled?: boolean
  data_source?: 'api' | 'test'
}

// Action details for altar
export interface AltarActionDetails {
  card_id?: string
  card_tier?: string
  card_foil?: boolean
  outcome_type?: VaalOutcomeType
  api_response_time_ms?: number
}

// Action details for admin
export interface AdminActionDetails {
  data_mode?: DataMode
  admin_user_id?: string
}

// Union type for action details
export type ActionDetails = AltarActionDetails | AdminActionDetails

// Union type for state
export type DiagnosticState = AltarState | AdminState

export interface DiagnosticLogInsert {
  category: DiagnosticCategory
  action_type: string
  user_id?: string | null
  username?: string | null
  state_before?: DiagnosticState
  state_after?: DiagnosticState
  action_details?: ActionDetails
  validation_status?: ValidationStatus | null
  validation_notes?: string | null
  api_response_time_ms?: number | null
  data_mode?: DataMode | null
  created_at?: string | null
}

export interface DiagnosticLog {
  id: string
  category: DiagnosticCategory
  action_type: string
  user_id: string | null
  username: string | null
  state_before: DiagnosticState
  state_after: DiagnosticState
  action_details: ActionDetails
  validation_status: ValidationStatus | null
  validation_notes: string | null
  api_response_time_ms: number | null
  data_mode: DataMode | null
  created_at: string
}
