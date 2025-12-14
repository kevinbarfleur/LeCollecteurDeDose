/**
 * Logger Service
 * 
 * Provides a custom logging utility that only logs when:
 * - User is an administrator
 * - Data source is set to 'test' mode
 * 
 * Logs are minimal and concise to avoid console clutter
 */

import { useAuthStore } from '~/stores/auth.store'
import { useDataSourceStore } from '~/stores/dataSource.store'

interface LogContext {
  store?: string
  service?: string
  action?: string
  [key: string]: unknown
}

/**
 * Check if logging is enabled (admin + test mode)
 * Uses computed values to avoid circular dependencies
 */
function isLoggingEnabled(): boolean {
  if (!import.meta.client) return false
  
  try {
    const authStore = useAuthStore()
    const dataSourceStore = useDataSourceStore()
    
    // Access computed values - they're already computed refs
    // Use .value to get the actual boolean value
    const isAdmin = (authStore.isAdmin as any).value ?? false
    const isTestData = (dataSourceStore.isTestData as any).value ?? false
    
    return isAdmin && isTestData
  } catch {
    return false
  }
}

/**
 * Format a value for logging (truncate if too long)
 */
function formatValue(value: unknown, maxLength: number = 50): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  
  const str = typeof value === 'object' 
    ? JSON.stringify(value).slice(0, maxLength)
    : String(value).slice(0, maxLength)
  
  return str.length >= maxLength ? `${str}...` : str
}

/**
 * Format context object for logging
 */
function formatContext(context: LogContext): string {
  const parts: string[] = []
  
  if (context.store) parts.push(`[${context.store}]`)
  if (context.service) parts.push(`[${context.service}]`)
  if (context.action) parts.push(context.action)
  
  // Add other key-value pairs (excluding store/service/action)
  const otherKeys = Object.keys(context).filter(
    k => !['store', 'service', 'action'].includes(k)
  )
  
  if (otherKeys.length > 0) {
    const values = otherKeys
      .slice(0, 5) // Limit to 5 additional fields
      .map(k => `${k}: ${formatValue(context[k], 30)}`)
      .join(', ')
    parts.push(`(${values})`)
  }
  
  return parts.join(' ')
}

/**
 * Log an info message
 */
export function logInfo(message: string, context: LogContext = {}): void {
  if (!isLoggingEnabled()) return
  
  const formatted = formatContext({ ...context, message })
  console.log(`[LOG] ${formatted}`)
}

/**
 * Log a warning message
 */
export function logWarn(message: string, context: LogContext = {}): void {
  if (!isLoggingEnabled()) return
  
  const formatted = formatContext({ ...context, message })
  console.warn(`[LOG] ${formatted}`)
}

/**
 * Log an error message
 */
export function logError(message: string, error?: unknown, context: LogContext = {}): void {
  if (!isLoggingEnabled()) return
  
  const formatted = formatContext({ ...context, message })
  const errorMsg = error instanceof Error ? error.message : formatValue(error)
  console.error(`[LOG] ${formatted}`, errorMsg ? `Error: ${errorMsg}` : '')
}

/**
 * Log a debug message (for detailed debugging)
 */
export function logDebug(message: string, data?: unknown, context: LogContext = {}): void {
  if (!isLoggingEnabled()) return
  
  const formatted = formatContext({ ...context, message })
  if (data !== undefined) {
    console.log(`[LOG] ${formatted}`, data)
  } else {
    console.log(`[LOG] ${formatted}`)
  }
}

