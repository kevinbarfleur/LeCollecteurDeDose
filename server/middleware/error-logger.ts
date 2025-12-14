/**
 * Server Error Logger Middleware
 * 
 * Captures errors from API routes and logs them to Supabase
 * This middleware runs on all server requests
 * 
 * Note: This middleware logs errors but doesn't prevent them from propagating.
 * Actual error handling should be done in individual route handlers.
 */

import { logError, logApiError } from '~/services/errorLogger.service'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const method = getMethod(event)
  
  // Set up error handler for this request
  event.context.errorLogger = {
    logError: async (error: unknown, context?: Record<string, unknown>) => {
      await logApiError(
        `API error: ${method} ${url.pathname}`,
        url.pathname,
        undefined,
        error,
        {
          component: 'ServerMiddleware',
          action: 'api.error',
          method,
          query: Object.keys(getQuery(event)).length > 0 ? getQuery(event) : undefined,
          ...context,
        }
      ).catch((logErr) => {
        // Silently fail if logging fails to avoid infinite loops
        console.error('[ErrorLogger] Failed to log error:', logErr)
      })
    }
  }
  
  // The actual error handling will be done by Nuxt's error handler
  // which will call our plugin error-handler.server.ts
})
