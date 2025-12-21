/**
 * Database Message Loader for Twitch Bot
 *
 * Loads customizable messages from Supabase database.
 * Falls back to hardcoded messages if DB is unavailable.
 */

import { triggerMessages, type TriggerMessageType, formatCardName } from './triggerMessages.ts'
import { BATCH_MESSAGES, getRandomMessage as getRandomBatchMessage, formatMessage } from './batchEvents/messages.ts'

// Types for event messages
interface EventMessageRow {
  id: number
  category: string
  item_key: string
  message_type: string
  messages: string[]
  variables?: string[]
  is_enabled: boolean
}

// Cache for loaded messages
let cachedMessages: Record<string, Record<string, string[]>> | null = null
let cachedEventMessages: EventMessageRow[] | null = null
let cacheLoadTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Supabase client reference (set during init)
let supabaseClient: any = null

/**
 * Initialize the message loader with Supabase client
 */
export function initMessageLoader(supabase: any) {
  supabaseClient = supabase
}

/**
 * Load messages from database
 */
async function loadMessagesFromDB(): Promise<Record<string, Record<string, string[]>>> {
  if (!supabaseClient) {
    console.warn('[DB_MESSAGES] Supabase client not initialized, using fallback')
    return {}
  }

  try {
    const { data, error } = await supabaseClient
      .from('bot_messages')
      .select('id, category, item_key, message_type, messages')

    if (error) {
      console.error('[DB_MESSAGES] Failed to load messages:', error)
      return {}
    }

    // Transform to the same format as triggerMessages
    const result: Record<string, Record<string, string[]>> = {}

    for (const row of data || []) {
      if (row.category === 'trigger') {
        if (!result[row.item_key]) {
          result[row.item_key] = {}
        }
        result[row.item_key][row.message_type] = row.messages || []
      }
    }

    console.log(`[DB_MESSAGES] Loaded ${data?.length || 0} messages from database`)
    return result
  } catch (err) {
    console.error('[DB_MESSAGES] Error loading messages:', err)
    return {}
  }
}

/**
 * Get messages, using cache with TTL
 */
async function getMessages(): Promise<Record<string, Record<string, string[]>>> {
  const now = Date.now()

  // Return cached if still valid
  if (cachedMessages && (now - cacheLoadTime) < CACHE_TTL_MS) {
    return cachedMessages
  }

  // Try to load from DB
  const dbMessages = await loadMessagesFromDB()

  // Merge with hardcoded fallbacks
  cachedMessages = { ...triggerMessages }

  for (const [key, value] of Object.entries(dbMessages)) {
    if (cachedMessages[key]) {
      cachedMessages[key] = { ...cachedMessages[key], ...value }
    } else {
      cachedMessages[key] = value
    }
  }

  cacheLoadTime = now
  return cachedMessages
}

/**
 * Force refresh of message cache
 */
export async function refreshMessageCache(): Promise<void> {
  cachedMessages = null
  cachedEventMessages = null
  cacheLoadTime = 0
  await getMessages()
  await getEventMessages()
  console.log('[DB_MESSAGES] Message cache refreshed')
}

/**
 * Load event messages from database
 */
async function loadEventMessagesFromDB(): Promise<EventMessageRow[]> {
  if (!supabaseClient) {
    console.warn('[DB_MESSAGES] Supabase client not initialized, using fallback for events')
    return []
  }

  try {
    const { data, error } = await supabaseClient
      .from('bot_messages')
      .select('*')
      .eq('category', 'event')

    if (error) {
      console.error('[DB_MESSAGES] Failed to load event messages:', error)
      return []
    }

    // Filter by is_enabled if the column exists (added in migration 20251221120000)
    const filtered = data?.filter(m => m.is_enabled !== false) || []

    console.log(`[DB_MESSAGES] Loaded ${filtered.length} event messages from database`)
    return filtered
  } catch (err) {
    console.error('[DB_MESSAGES] Exception loading event messages:', err)
    return []
  }
}

/**
 * Get event messages with caching
 */
async function getEventMessages(): Promise<EventMessageRow[]> {
  const now = Date.now()

  // Return cached if still valid
  if (cachedEventMessages && (now - cacheLoadTime) < CACHE_TTL_MS) {
    return cachedEventMessages
  }

  cachedEventMessages = await loadEventMessagesFromDB()
  return cachedEventMessages
}

/**
 * Get a random event action message (for batch events)
 * Falls back to hardcoded BATCH_MESSAGES if not in DB
 *
 * @param eventKey - The event key (e.g., 'buffBow', 'nerfMelee', 'vaalRoulette')
 * @param messageType - The message type (e.g., 'success', 'noCards', 'brick', 'upgrade')
 * @param variables - Variables to replace in the message
 * @returns The formatted message
 */
export async function getEventActionMessage(
  eventKey: string,
  messageType: string,
  variables: {
    username?: string
    card?: string
    count?: number
    version?: string
    targetUsername?: string
    tier?: string
  }
): Promise<string> {
  const eventMessages = await getEventMessages()

  // Look for message in database
  const found = eventMessages.find(
    m => m.item_key === eventKey && m.message_type === messageType
  )

  if (found && found.messages.length > 0) {
    const template = found.messages[Math.floor(Math.random() * found.messages.length)]
    return formatMessage(template, variables)
  }

  // Fallback to hardcoded messages
  const hardcoded = BATCH_MESSAGES[eventKey as keyof typeof BATCH_MESSAGES]
  if (hardcoded && messageType in hardcoded) {
    const messages = (hardcoded as Record<string, string[]>)[messageType]
    if (messages && messages.length > 0) {
      const template = getRandomBatchMessage(messages)
      return formatMessage(template, variables)
    }
  }

  console.warn(`[DB_MESSAGES] No event message found for ${eventKey}/${messageType}`)
  return `❌ Message non configuré pour ${eventKey}/${messageType}`
}

/**
 * Get event completion message
 */
export async function getEventCompletionMessage(
  eventKey: string,
  variables: { count: number; version?: string }
): Promise<string> {
  const eventMessages = await getEventMessages()

  // Look for completion message in database
  const found = eventMessages.find(
    m => m.item_key === eventKey && m.message_type === 'completion'
  )

  if (found && found.messages.length > 0) {
    const template = found.messages[Math.floor(Math.random() * found.messages.length)]
    return formatMessage(template, variables)
  }

  // Fallback to hardcoded completion messages
  const completionMessages = BATCH_MESSAGES.completion
  const completionKey = eventKey as keyof typeof completionMessages
  if (completionMessages[completionKey]) {
    return formatMessage(completionMessages[completionKey], variables)
  }

  return `✅ Event terminé. ${variables.count} joueurs affectés.`
}

/**
 * Get event announcement message
 */
export async function getEventAnnouncementMessage(
  announcementKey: string,
  variables?: { version?: string }
): Promise<string> {
  const eventMessages = await getEventMessages()

  // Look for announcement in database
  const found = eventMessages.find(
    m => m.item_key === announcementKey && m.message_type === 'announcement'
  )

  if (found && found.messages.length > 0) {
    const template = found.messages[Math.floor(Math.random() * found.messages.length)]
    return variables ? formatMessage(template, variables) : template
  }

  // Fallback to hardcoded announcements
  const announcements = BATCH_MESSAGES.announcements
  const announcementText = announcements[announcementKey as keyof typeof announcements]
  if (announcementText) {
    return variables ? formatMessage(announcementText, variables) : announcementText
  }

  return `📢 Event ${announcementKey} commence !`
}

/**
 * Get a random message for a trigger (async version with DB support)
 *
 * @param trigger - The trigger type (e.g., 'blessingRNGesus', 'mirrorTier')
 * @param type - The message type ('success', 'failure', etc.)
 * @param replacements - Variables to replace in the message
 * @returns The formatted message with variables replaced
 */
export async function getRandomMessageAsync(
  trigger: string,
  type: TriggerMessageType,
  replacements: Record<string, string>
): Promise<string> {
  const allMessages = await getMessages()
  const messages = allMessages[trigger]?.[type]

  if (!messages || messages.length === 0) {
    // Fall back to hardcoded
    const fallback = triggerMessages[trigger]?.[type]
    if (!fallback || fallback.length === 0) {
      console.warn(`[DB_MESSAGES] No messages found for trigger="${trigger}" type="${type}"`)
      return `❌ Message non configuré pour ${trigger}/${type}`
    }
    const template = fallback[Math.floor(Math.random() * fallback.length)]
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return replacements[key] !== undefined ? replacements[key] : match
    })
  }

  const template = messages[Math.floor(Math.random() * messages.length)]
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return replacements[key] !== undefined ? replacements[key] : match
  })
}

/**
 * Get a random message synchronously (uses cache, falls back to hardcoded if cache empty)
 *
 * @param trigger - The trigger type
 * @param type - The message type
 * @param replacements - Variables to replace
 * @returns The formatted message
 */
export function getRandomMessage(
  trigger: string,
  type: TriggerMessageType,
  replacements: Record<string, string>
): string {
  // Use cached messages if available
  const allMessages = cachedMessages || triggerMessages
  const messages = allMessages[trigger]?.[type]

  if (!messages || messages.length === 0) {
    // Fall back to hardcoded
    const fallback = triggerMessages[trigger]?.[type]
    if (!fallback || fallback.length === 0) {
      console.warn(`[DB_MESSAGES] No messages found for trigger="${trigger}" type="${type}"`)
      return `❌ Message non configuré pour ${trigger}/${type}`
    }
    const template = fallback[Math.floor(Math.random() * fallback.length)]
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return replacements[key] !== undefined ? replacements[key] : match
    })
  }

  const template = messages[Math.floor(Math.random() * messages.length)]
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return replacements[key] !== undefined ? replacements[key] : match
  })
}

/**
 * Check if a command is enabled (from bot_config)
 */
export async function isCommandEnabled(command: string): Promise<boolean> {
  if (!supabaseClient) return true

  try {
    const { data, error } = await supabaseClient
      .from('bot_config')
      .select('value')
      .eq('key', `command_${command}_enabled`)
      .single()

    if (error) return true
    return data?.value !== 'false'
  } catch {
    return true
  }
}

/**
 * Check if a trigger is enabled (from bot_config)
 */
export async function isTriggerEnabled(trigger: string): Promise<boolean> {
  if (!supabaseClient) return true

  try {
    // Check master toggle
    const { data: masterData } = await supabaseClient
      .from('bot_config')
      .select('value')
      .eq('key', 'auto_triggers_enabled')
      .single()

    if (masterData?.value !== 'true') return false

    // Check individual toggle
    const { data: triggerData } = await supabaseClient
      .from('bot_config')
      .select('value')
      .eq('key', `trigger_${trigger}_enabled`)
      .single()

    return triggerData?.value !== 'false'
  } catch {
    return true
  }
}

// Re-export formatCardName for convenience
export { formatCardName }
