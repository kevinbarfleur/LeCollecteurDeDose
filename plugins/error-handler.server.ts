/**
 * Server Error Handler Plugin
 * 
 * Captures server-side errors and logs them to Supabase
 */

import { logError, logApiError } from '~/services/errorLogger.service'

export default defineNuxtPlugin({
  name: 'server-error-handler',
  setup() {
    // Only run on server side
    if (!import.meta.server) return

    const app = useNuxtApp()

    // Hook into Nuxt error events
    app.hook('app:error', async (err) => {
      await logError(
        'Server app error',
        err,
        {
          component: 'ServerErrorHandler',
          action: 'nuxt.app.error',
        },
        'server'
      ).catch(() => {
        // Silently fail if logging fails
      })
    })

    // Hook into request errors
    app.hook('request', async (event) => {
      // This runs before the request handler
      // We'll catch errors in the middleware instead
    })

    // Hook into response errors
    app.hook('render:route', async (url, result, context) => {
      // Check if there's an error in the result
      if (result.error) {
        await logError(
          `Route render error: ${url}`,
          result.error,
          {
            component: 'ServerErrorHandler',
            action: 'render.route.error',
            url: url.toString(),
          },
          'server'
        ).catch(() => {
          // Silently fail if logging fails
        })
      }
    })
  },
})
