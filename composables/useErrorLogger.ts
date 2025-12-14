/**
 * Error Logger Composable
 * 
 * Vue composable for easy error logging in components
 */

import { logError, logWarning, logInfo, logApiError } from '~/services/errorLogger.service'
import type { ErrorContext } from '~/types/errorLog'

export function useErrorLogger() {
  /**
   * Log an error
   */
  const error = async (
    message: string,
    error?: unknown,
    context?: ErrorContext
  ): Promise<void> => {
    await logError(message, error, context, 'client')
  }

  /**
   * Log a warning
   */
  const warn = async (
    message: string,
    context?: ErrorContext
  ): Promise<void> => {
    await logWarning(message, context, 'client')
  }

  /**
   * Log an info message
   */
  const info = async (
    message: string,
    context?: ErrorContext
  ): Promise<void> => {
    await logInfo(message, context, 'client')
  }

  /**
   * Log an API error
   */
  const apiError = async (
    message: string,
    endpoint: string,
    statusCode?: number,
    error?: unknown,
    context?: ErrorContext
  ): Promise<void> => {
    await logApiError(message, endpoint, statusCode, error, context)
  }

  /**
   * Wrap a function with error logging
   */
  const wrap = <T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext
  ): T => {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args)
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch(async (err) => {
            await error(`Error in wrapped function: ${fn.name || 'anonymous'}`, err, {
              ...context,
              functionName: fn.name || 'anonymous',
              args: args.length > 0 ? JSON.stringify(args).slice(0, 200) : undefined,
            })
            throw err
          })
        }
        return result
      } catch (err) {
        error(`Error in wrapped function: ${fn.name || 'anonymous'}`, err, {
          ...context,
          functionName: fn.name || 'anonymous',
          args: args.length > 0 ? JSON.stringify(args).slice(0, 200) : undefined,
        })
        throw err
      }
    }) as T
  }

  return {
    error,
    warn,
    info,
    apiError,
    wrap,
  }
}
