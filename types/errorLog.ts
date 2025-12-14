/**
 * Error Log Types
 * 
 * Types for error logging and tracking system
 */

export type ErrorLevel = 'error' | 'warn' | 'info'
export type ErrorSource = 'client' | 'server'

export interface ErrorContext {
  [key: string]: unknown
  // Common context fields
  url?: string
  userAgent?: string
  timestamp?: string
  component?: string
  action?: string
  store?: string
  service?: string
  // Additional context
  [key: string]: unknown
}

export interface ErrorLogInsert {
  level: ErrorLevel
  message: string
  stack?: string | null
  context?: ErrorContext
  user_id?: string | null
  username?: string | null
  source: ErrorSource
  endpoint?: string | null
  status_code?: number | null
  created_at?: string | null
}

export interface ErrorLog {
  id: string
  level: ErrorLevel
  message: string
  stack: string | null
  context: ErrorContext
  user_id: string | null
  username: string | null
  source: ErrorSource
  endpoint: string | null
  status_code: number | null
  created_at: string
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
}
