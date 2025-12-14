/**
 * Error Logger Service
 * 
 * Centralized error logging service that sends errors to Supabase
 * Works on both client and server side
 */

import type { ErrorLogInsert, ErrorContext, ErrorLevel, ErrorSource } from '~/types/errorLog'
import type { Database } from '~/types/database'

// Queue for error logs (client-side only)
const errorQueue: ErrorLogInsert[] = []
const MAX_QUEUE_SIZE = 50
let isProcessingQueue = false

/**
 * Sanitize context to remove sensitive information
 */
function sanitizeContext(context: ErrorContext): ErrorContext {
  const sanitized: ErrorContext = { ...context }
  
  // Remove sensitive fields
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie']
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      delete sanitized[key]
    }
  }
  
  return sanitized
}

/**
 * Get client-side context automatically
 */
function getClientContext(): ErrorContext {
  if (!import.meta.client) return {}
  
  const context: ErrorContext = {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }
  
  // Add viewport info
  if (window.innerWidth && window.innerHeight) {
    context.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  
  return context
}

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
 * Extract stack trace from error
 */
function extractStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack
  }
  if (typeof error === 'object' && error !== null && 'stack' in error) {
    return String(error.stack)
  }
  return undefined
}

/**
 * Format error message
 */
function formatErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message || defaultMessage
  }
  if (typeof error === 'string') {
    return error
  }
  return defaultMessage
}

/**
 * Send error log to Supabase (client-side)
 */
async function sendErrorLogClient(log: ErrorLogInsert): Promise<void> {
  if (!import.meta.client) return
  
  try {
    // Check if Supabase is available
    if (typeof useSupabaseClient === 'undefined') {
      console.warn('[ErrorLogger] useSupabaseClient not available')
      return
    }
    
    const supabase = useSupabaseClient<Database>()
    if (!supabase) {
      console.warn('[ErrorLogger] Supabase client not initialized')
      return
    }
    
    const { error } = await supabase
      .from('error_logs')
      .insert(log)
    
    if (error) {
      console.error('[ErrorLogger] Failed to send error log:', error)
    }
  } catch (err) {
    console.error('[ErrorLogger] Exception while sending error log:', err)
  }
}

/**
 * Send error log to Supabase (server-side)
 */
async function sendErrorLogServer(log: ErrorLogInsert): Promise<void> {
  if (import.meta.client) return
  
  try {
    const config = useRuntimeConfig()
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabase = createClient<Database>(
      config.supabaseUrl,
      config.supabaseKey
    )
    
    const { error } = await supabase
      .from('error_logs')
      .insert(log)
    
    if (error) {
      console.error('[ErrorLogger] Failed to send error log:', error)
    }
  } catch (err) {
    console.error('[ErrorLogger] Exception while sending error log:', err)
  }
}

/**
 * Process error queue (client-side only)
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || errorQueue.length === 0) return
  
  isProcessingQueue = true
  
  while (errorQueue.length > 0) {
    const log = errorQueue.shift()
    if (log) {
      await sendErrorLogClient(log)
    }
  }
  
  isProcessingQueue = false
}

/**
 * Add error log to queue (client-side only)
 */
function queueErrorLog(log: ErrorLogInsert): void {
  if (!import.meta.client) return
  
  // Limit queue size
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    errorQueue.shift() // Remove oldest
  }
  
  errorQueue.push(log)
  
  // Process queue asynchronously
  processQueue().catch(err => {
    console.error('[ErrorLogger] Error processing queue:', err)
  })
}

/**
 * Log an error
 */
export async function logError(
  message: string,
  error?: unknown,
  context: ErrorContext = {},
  source: ErrorSource = import.meta.client ? 'client' : 'server'
): Promise<void> {
  const baseContext = import.meta.client ? getClientContext() : {}
  const userInfo = import.meta.client ? getUserInfo() : {}
  const sanitizedContext = sanitizeContext({ ...baseContext, ...context })
  
  const log: ErrorLogInsert = {
    level: 'error',
    message: formatErrorMessage(error, message),
    stack: error ? extractStack(error) : undefined,
    context: sanitizedContext,
    user_id: userInfo.user_id || null,
    username: userInfo.username || null,
    source,
    created_at: new Date().toISOString(),
  }
  
  if (import.meta.client) {
    // Queue for async sending (non-blocking)
    queueErrorLog(log)
  } else {
    // Server-side: send immediately
    await sendErrorLogServer(log)
  }
}

/**
 * Log a warning
 */
export async function logWarning(
  message: string,
  context: ErrorContext = {},
  source: ErrorSource = import.meta.client ? 'client' : 'server'
): Promise<void> {
  const baseContext = import.meta.client ? getClientContext() : {}
  const userInfo = import.meta.client ? getUserInfo() : {}
  const sanitizedContext = sanitizeContext({ ...baseContext, ...context })
  
  const log: ErrorLogInsert = {
    level: 'warn',
    message,
    context: sanitizedContext,
    user_id: userInfo.user_id || null,
    username: userInfo.username || null,
    source,
    created_at: new Date().toISOString(),
  }
  
  if (import.meta.client) {
    queueErrorLog(log)
  } else {
    await sendErrorLogServer(log)
  }
}

/**
 * Log an info message
 */
export async function logInfo(
  message: string,
  context: ErrorContext = {},
  source: ErrorSource = import.meta.client ? 'client' : 'server'
): Promise<void> {
  const baseContext = import.meta.client ? getClientContext() : {}
  const userInfo = import.meta.client ? getUserInfo() : {}
  const sanitizedContext = sanitizeContext({ ...baseContext, ...context })
  
  const log: ErrorLogInsert = {
    level: 'info',
    message,
    context: sanitizedContext,
    user_id: userInfo.user_id || null,
    username: userInfo.username || null,
    source,
    created_at: new Date().toISOString(),
  }
  
  if (import.meta.client) {
    queueErrorLog(log)
  } else {
    await sendErrorLogServer(log)
  }
}

/**
 * Log an error with endpoint info (for API errors)
 */
export async function logApiError(
  message: string,
  endpoint: string,
  statusCode?: number,
  error?: unknown,
  context: ErrorContext = {}
): Promise<void> {
  const baseContext = import.meta.client ? getClientContext() : {}
  const userInfo = import.meta.client ? getUserInfo() : {}
  const sanitizedContext = sanitizeContext({ ...baseContext, ...context })
  
  const log: ErrorLogInsert = {
    level: 'error',
    message: formatErrorMessage(error, message),
    stack: error ? extractStack(error) : undefined,
    context: sanitizedContext,
    user_id: userInfo.user_id || null,
    username: userInfo.username || null,
    source: import.meta.client ? 'client' : 'server',
    endpoint,
    status_code: statusCode || null,
    created_at: new Date().toISOString(),
  }
  
  if (import.meta.client) {
    queueErrorLog(log)
  } else {
    await sendErrorLogServer(log)
  }
}
