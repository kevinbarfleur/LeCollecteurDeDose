/**
 * Global Error Handler Plugin
 * 
 * Captures unhandled errors and promise rejections automatically
 */

import { logError } from '~/services/errorLogger.service'

export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client side
  if (!import.meta.client) return

  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    // Don't log errors from extensions or other sources
    if (event.filename && !event.filename.startsWith(window.location.origin)) {
      return
    }

    logError(
      `Unhandled error: ${event.message}`,
      event.error || new Error(event.message),
      {
        component: 'GlobalErrorHandler',
        action: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      'client'
    ).catch(() => {
      // Silently fail if logging fails
    })
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      `Unhandled promise rejection: ${event.reason}`,
      event.reason,
      {
        component: 'GlobalErrorHandler',
        action: 'unhandledrejection',
      },
      'client'
    ).catch(() => {
      // Silently fail if logging fails
    })
  })

  // Handle Vue errors
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    logError(
      `Vue error: ${info}`,
      err,
      {
        component: 'GlobalErrorHandler',
        action: 'vue.errorHandler',
        vueInfo: info,
        componentName: instance?.$options?.name || instance?.$options?.__name || 'Unknown',
      },
      'client'
    ).catch(() => {
      // Silently fail if logging fails
    })

    // Still log to console in development
    if (import.meta.dev) {
      console.error('[Vue Error]', err, info)
    }
  }

  // Handle Nuxt errors
  nuxtApp.hook('app:error', (err) => {
    logError(
      'Nuxt app error',
      err,
      {
        component: 'GlobalErrorHandler',
        action: 'nuxt.app.error',
      },
      'client'
    ).catch(() => {
      // Silently fail if logging fails
    })
  })

  nuxtApp.hook('app:chunkError', ({ error }) => {
    logError(
      'Nuxt chunk error',
      error,
      {
        component: 'GlobalErrorHandler',
        action: 'nuxt.chunkError',
      },
      'client'
    ).catch(() => {
      // Silently fail if logging fails
    })
  })
})
