/**
 * Diagnostic Logger Service
 * 
 * Centralized diagnostic logging service that sends diagnostic information to Supabase
 * Works on both client and server side
 * Includes automatic validation for altar actions
 */

import type {
  DiagnosticLogInsert,
  DiagnosticCategory,
  AltarActionType,
  AdminActionType,
  ValidationStatus,
  AltarState,
  AdminState,
  AltarActionDetails,
  AdminActionDetails,
  VaalOutcomeType,
  DataMode,
} from '~/types/diagnostic'
import type { Database } from '~/types/database'
import type { Card } from '~/types/card'

// Queue for diagnostic logs (client-side only)
const diagnosticQueue: DiagnosticLogInsert[] = []
const MAX_QUEUE_SIZE = 50
let isProcessingQueue = false

/**
 * Get user info from session (client-side only)
 */
function getUserInfo(): { user_id?: string; username?: string } {
  if (!import.meta.client) return {}

  try {
    const { user } = useUserSession()
    if (user.value) {
      return {
        user_id: user.value.id,
        username: user.value.name || user.value.displayName || undefined,
      }
    }
  } catch {
    // Session not available
  }

  return {}
}

/**
 * Get data mode (client-side only)
 * Returns 'api' for both 'api' and 'supabase' modes (both are production)
 */
function getDataMode(): DataMode | undefined {
  if (!import.meta.client) return undefined

  try {
    const { isApiData, isSupabaseData } = useDataSource()
    // Both 'api' and 'supabase' are production modes, return 'api' for logging
    return (isApiData.value || isSupabaseData.value) ? 'api' : 'test'
  } catch {
    return undefined
  }
}

/**
 * Calculate cards hash for quick comparison
 * Cards are stored as individual Card objects, so we need to group by id and count normal/foil
 */
function calculateCardsHash(cards: Card[]): string {
  // Group cards by id and count normal/foil
  const cardCounts = new Map<string, { normal: number; foil: number }>()
  
  for (const card of cards) {
    if (!cardCounts.has(card.id)) {
      cardCounts.set(card.id, { normal: 0, foil: 0 })
    }
    const counts = cardCounts.get(card.id)!
    if (card.foil) {
      counts.foil++
    } else {
      counts.normal++
    }
  }
  
  // Create summary string from grouped counts
  const summary = Array.from(cardCounts.entries())
    .map(([id, counts]) => `${id}:${counts.normal}:${counts.foil}`)
    .sort()
    .join('|')
  
  // Simple hash function (not cryptographically secure, but fast)
  let hash = 0
  for (let i = 0; i < summary.length; i++) {
    const char = summary.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Calculate cards summary by tier
 * Cards are stored as individual Card objects, so we just count them
 */
function calculateCardsByTier(cards: Card[]): AltarState['cards_by_tier'] {
  const byTier: AltarState['cards_by_tier'] = {}
  
  for (const card of cards) {
    const tier = card.tier.toLowerCase()
    
    if (!byTier[tier as keyof typeof byTier]) {
      byTier[tier as keyof typeof byTier] = 0
    }
    byTier[tier as keyof typeof byTier]! += 1 // Each card counts as 1
  }
  
  return byTier
}

/**
 * Create altar state from collection
 * Cards are stored as individual Card objects in an array
 */
export function createAltarState(cards: Card[], vaalOrbs: number): AltarState {
  // Simply count the number of cards in the array
  const totalCardsCount = cards.length
  
  return {
    vaal_orbs_count: vaalOrbs,
    total_cards_count: totalCardsCount,
    cards_by_tier: calculateCardsByTier(cards),
    cards_hash: calculateCardsHash(cards),
  }
}

/**
 * Validate altar action and return validation status
 */
function validateAltarAction(
  stateBefore: AltarState,
  stateAfter: AltarState,
  actionDetails: AltarActionDetails
): { status: ValidationStatus; notes: string } {
  const notes: string[] = []
  let status: ValidationStatus = 'ok'

  // Validate vaal orbs delta
  const vaalOrbsDelta = stateAfter.vaal_orbs_count - stateBefore.vaal_orbs_count
  const expectedVaalOrbsDelta = -1 // Always consume 1 vaal orb
  
  if (vaalOrbsDelta !== expectedVaalOrbsDelta) {
    status = 'error'
    notes.push(`Vaal orbs delta incorrect: expected ${expectedVaalOrbsDelta}, got ${vaalOrbsDelta}`)
  }

  // Validate cards delta based on outcome
  const cardsDelta = stateAfter.total_cards_count - stateBefore.total_cards_count
  const outcomeType = actionDetails.outcome_type

  if (outcomeType) {
    let expectedCardsDelta = 0
    switch (outcomeType) {
      case 'foil':
      case 'transform':
      case 'nothing':
        expectedCardsDelta = 0
        break
      case 'duplicate':
        expectedCardsDelta = 1
        break
      case 'destroyed':
        expectedCardsDelta = -1
        break
    }

    if (cardsDelta !== expectedCardsDelta) {
      if (status === 'ok') status = 'warning'
      notes.push(`Cards delta incorrect for ${outcomeType}: expected ${expectedCardsDelta}, got ${cardsDelta}`)
    }
  }

  // Validate API response time
  if (actionDetails.api_response_time_ms && actionDetails.api_response_time_ms > 2000) {
    if (status === 'ok') status = 'warning'
    notes.push(`Slow API response: ${actionDetails.api_response_time_ms}ms`)
  }

  // Validate cards hash consistency (if hash changed unexpectedly)
  if (outcomeType === 'nothing' && stateBefore.cards_hash && stateAfter.cards_hash) {
    if (stateBefore.cards_hash !== stateAfter.cards_hash) {
      if (status === 'ok') status = 'warning'
      notes.push('Cards hash changed for "nothing" outcome (unexpected)')
    }
  }

  return {
    status,
    notes: notes.join('; ') || 'All validations passed',
  }
}

/**
 * Send diagnostic log to Supabase (client-side)
 */
async function sendDiagnosticLogClient(log: DiagnosticLogInsert): Promise<void> {
  if (!import.meta.client) return

  try {
    // Check if Supabase is available
    if (typeof useSupabaseClient === 'undefined') {
      console.warn('[DiagnosticLogger] useSupabaseClient not available')
      return
    }

    const supabase = useSupabaseClient<Database>()
    if (!supabase) {
      console.warn('[DiagnosticLogger] Supabase client not initialized')
      return
    }

    const { error } = await supabase
      .from('diagnostic_logs')
      .insert(log)

    if (error) {
      console.error('[DiagnosticLogger] Failed to send diagnostic log:', error)
    }
  } catch (err) {
    console.error('[DiagnosticLogger] Exception while sending diagnostic log:', err)
  }
}

/**
 * Send diagnostic log to Supabase (server-side)
 */
async function sendDiagnosticLogServer(log: DiagnosticLogInsert): Promise<void> {
  if (import.meta.client) return

  try {
    const config = useRuntimeConfig()
    const { createClient } = await import('@supabase/supabase-js')

    const supabase = createClient<Database>(
      config.supabaseUrl,
      config.supabaseServiceRoleKey || config.supabaseKey
    )

    const { error } = await supabase
      .from('diagnostic_logs')
      .insert(log)

    if (error) {
      console.error('[DiagnosticLogger] Failed to send diagnostic log:', error)
    }
  } catch (err) {
    console.error('[DiagnosticLogger] Exception while sending diagnostic log:', err)
  }
}

/**
 * Process diagnostic queue (client-side only)
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || diagnosticQueue.length === 0) return

  isProcessingQueue = true

  while (diagnosticQueue.length > 0) {
    const log = diagnosticQueue.shift()
    if (log) {
      await sendDiagnosticLogClient(log)
    }
  }

  isProcessingQueue = false
}

/**
 * Add diagnostic log to queue (client-side only)
 */
function queueDiagnosticLog(log: DiagnosticLogInsert): void {
  if (!import.meta.client) return

  // Limit queue size
  if (diagnosticQueue.length >= MAX_QUEUE_SIZE) {
    diagnosticQueue.shift() // Remove oldest
  }

  diagnosticQueue.push(log)

  // Process queue asynchronously
  processQueue().catch(err => {
    console.error('[DiagnosticLogger] Error processing queue:', err)
  })
}

/**
 * Log a diagnostic entry
 */
export async function logDiagnostic(
  category: DiagnosticCategory,
  actionType: string,
  stateBefore: AltarState | AdminState,
  stateAfter: AltarState | AdminState,
  actionDetails: AltarActionDetails | AdminActionDetails,
  validationStatus?: ValidationStatus,
  validationNotes?: string
): Promise<void> {
  const userInfo = import.meta.client ? getUserInfo() : {}
  const dataMode = import.meta.client ? getDataMode() : undefined

  const log: DiagnosticLogInsert = {
    category,
    action_type: actionType,
    user_id: userInfo.user_id || null,
    username: userInfo.username || null,
    state_before: stateBefore,
    state_after: stateAfter,
    action_details: actionDetails,
    validation_status: validationStatus || null,
    validation_notes: validationNotes || null,
    data_mode: dataMode || null,
    created_at: new Date().toISOString(),
  }

  if (import.meta.client) {
    // Queue for async sending (non-blocking)
    queueDiagnosticLog(log)
  } else {
    // Server-side: send immediately
    await sendDiagnosticLogServer(log)
  }
}

/**
 * Log an altar action with automatic validation
 */
export async function logAltarAction(
  actionType: AltarActionType,
  stateBefore: AltarState,
  stateAfter: AltarState,
  actionDetails: AltarActionDetails
): Promise<void> {
  // Perform automatic validation for altar actions
  const validation = validateAltarAction(stateBefore, stateAfter, actionDetails)

  await logDiagnostic(
    'altar',
    actionType,
    stateBefore,
    stateAfter,
    actionDetails,
    validation.status,
    validation.notes
  )
}

/**
 * Log an admin action
 */
export async function logAdminAction(
  actionType: AdminActionType,
  stateBefore: AdminState,
  stateAfter: AdminState,
  actionDetails?: AdminActionDetails
): Promise<void> {
  const userInfo = import.meta.client ? getUserInfo() : {}
  const dataMode = import.meta.client ? getDataMode() : undefined

  const details: AdminActionDetails = {
    ...actionDetails,
    admin_user_id: userInfo.user_id,
    data_mode: dataMode || actionDetails?.data_mode,
  }

  await logDiagnostic(
    'admin',
    actionType,
    stateBefore,
    stateAfter,
    details,
    'ok', // Admin actions are always considered valid
    'Admin action logged'
  )
}
