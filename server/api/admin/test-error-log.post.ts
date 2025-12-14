/**
 * Test Error Log Endpoint
 * 
 * Admin-only endpoint to test error logging functionality
 * This helps verify that error logging is working correctly
 */

import { logError, logWarning, logInfo } from '~/services/errorLogger.service'

export default defineEventHandler(async (event) => {
  // Check if user is admin (you can add your admin check here)
  // For now, we'll allow it but you should add proper admin middleware
  
  const body = await readBody(event).catch(() => ({}))
  const { level = 'error', message = 'Test error log' } = body as { level?: string; message?: string }
  
  try {
    switch (level) {
      case 'error':
        await logError(
          message,
          new Error('This is a test error'),
          {
            component: 'AdminTest',
            action: 'test.error',
            test: true,
          },
          'server'
        )
        break
      case 'warn':
        await logWarning(
          message,
          {
            component: 'AdminTest',
            action: 'test.warning',
            test: true,
          },
          'server'
        )
        break
      case 'info':
        await logInfo(
          message,
          {
            component: 'AdminTest',
            action: 'test.info',
            test: true,
          },
          'server'
        )
        break
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid level. Use error, warn, or info',
        })
    }
    
    return {
      success: true,
      message: `Test ${level} log created successfully`,
      level,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create test log',
    })
  }
})
