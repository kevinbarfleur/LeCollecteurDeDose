/**
 * Diagnostic Log Types
 * 
 * Types for diagnostic logging and application behavior tracking
 */

export type DiagnosticCategory = 'altar' | 'admin' | 'reward' | 'trigger'

export type AltarActionType = 'vaal_outcome' | 'load_collection'

export type AdminActionType = 'toggle_altar' | 'toggle_activity_logs' | 'switch_data_source'

export type RewardActionType = 'booster_purchase' | 'vaal_orbs_purchase'

export type TriggerActionType = 
  | 'blessingRNGesus' 
  | 'cartographersGift' 
  | 'mirrorTier' 
  | 'einharApproved' 
  | 'heistTax' 
  | 'sirusVoice' 
  | 'alchMisclick' 
  | 'tradeScam' 
  | 'chrisVision' 
  | 'atlasInfluence'

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

// State structures for reward diagnostics
export interface RewardState {
  vaal_orbs_count?: number
  total_cards_count?: number
  booster_count?: number
}

// State structures for trigger diagnostics
export interface TriggerState {
  vaal_orbs_count?: number
  total_cards_count?: number
  foil_count?: number
  normal_count?: number
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

// Action details for reward
export interface RewardActionDetails {
  reward_id?: string
  reward_type?: 'booster' | 'vaal_orbs'
  cards_received?: Array<{ card_uid: number; card_name: string; is_foil: boolean }>
  vaal_orbs_added?: number
  booster_id?: string
  bot_message_sent?: boolean
  bot_message_error?: string
}

// Action details for trigger
export interface TriggerActionDetails {
  trigger_type?: string
  target_username?: string
  success?: boolean
  message?: string
  error?: string
  is_manual?: boolean
}

// Union type for action details
export type ActionDetails = AltarActionDetails | AdminActionDetails | RewardActionDetails | TriggerActionDetails

// Union type for state
export type DiagnosticState = AltarState | AdminState | RewardState | TriggerState

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
