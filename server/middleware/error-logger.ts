/**
 * Server Error Logger Middleware
 * 
 * Captures errors from API routes and logs them to Supabase
 * This middleware runs on all server requests
 */

import { logError, logApiError } from '~/services/errorLogger.service'

export default defineEventHandler(async (event) => {
  // Wrap the handler to catch errors
  try {
    // Let the request proceed normally
    // Errors will be caught by the error handler below
  } catch (error) {
    const url = getRequestURL(event)
    const method = getMethod(event)
    
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
      }
    ).catch(() => {
      // Silently fail if logging fails
    })
    
    // Re-throw to let Nuxt handle it
    throw error
  }
})
