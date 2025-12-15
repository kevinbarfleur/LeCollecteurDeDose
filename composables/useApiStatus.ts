/**
 * Composable to track API availability status
 * 
 * Detects when the external API is offline and provides
 * a reactive state for displaying "game offline" messages
 * 
 * Updated to use Pinia stores
 */

import { useApi } from './useApiStore'
import { useDataSource } from './useDataSourceStore'
import { useApiStore } from '~/stores/api.store'
import { useMaintenanceMode } from './useMaintenanceMode'

// Track API status
const isApiOffline = ref(false)
const lastApiCheck = ref<Date | null>(null)
const checkInterval = ref<NodeJS.Timeout | null>(null)

// Check interval: every 30 seconds when API mode is active
const CHECK_INTERVAL_MS = 30000

export function useApiStatus() {
  const { isSupabaseData } = useDataSource()
  const { fetchUserCollections } = useApi()
  const apiStore = useApiStore()
  const { isMaintenanceMode } = useMaintenanceMode()

  /**
   * Check if API is available by making a lightweight request
   */
  const checkApiStatus = async (): Promise<boolean> => {
    // Only check if we're in API mode (not test mode)
    // In test mode, we don't need to check API status
    if (!isSupabaseData) {
      isApiOffline.value = false
      return true
    }

    try {
      // Try to fetch user collections (lightweight endpoint)
      const result = await fetchUserCollections()
      const isOnline = result !== null

      isApiOffline.value = !isOnline
      lastApiCheck.value = new Date()

      return isOnline
    } catch (error) {
      isApiOffline.value = true
      lastApiCheck.value = new Date()
      return false
    }
  }

  /**
   * Update offline status based on API store error
   * Called immediately when an API error occurs
   */
  const updateOfflineStatusFromError = () => {
    // Only update if we're in API mode (not test mode)
    if (!isSupabaseData) {
      isApiOffline.value = false
      return
    }

    // Check if there's an error in the API store
    const error = apiStore.error
    if (error) {
      // Consider API offline for:
      // - Server errors (500+)
      // - Network errors (status 0, no status, or network-related messages)
      // - Timeout errors
      // - Connection refused/ECONNREFUSED
      const isServerError = error.status >= 500 || error.status === 0 || !error.status
      const isNetworkError = error.status === 0 || 
                            error.message?.toLowerCase().includes('fetch') || 
                            error.message?.toLowerCase().includes('network') ||
                            error.message?.toLowerCase().includes('timeout') ||
                            error.message?.toLowerCase().includes('econnrefused') ||
                            error.message?.toLowerCase().includes('failed to fetch')
      
      // Also consider offline for 503 (Service Unavailable) and 502 (Bad Gateway)
      const isServiceUnavailable = error.status === 503 || error.status === 502
      
      if (isServerError || isNetworkError || isServiceUnavailable) {
        isApiOffline.value = true
        lastApiCheck.value = new Date()
      }
    }
  }

  /**
   * Start periodic API status checks
   * Only works on client side
   */
  const startMonitoring = () => {
    // Only run on client side
    if (!import.meta.client) {
      return
    }

    // Clear existing interval
    if (checkInterval.value) {
      clearInterval(checkInterval.value)
    }

    // Only monitor if in API mode
    if (!isSupabaseData) {
      isApiOffline.value = false
      return
    }

    // Initial check
    checkApiStatus()

    // Set up periodic checks
    checkInterval.value = setInterval(() => {
      checkApiStatus()
    }, CHECK_INTERVAL_MS)
  }

  /**
   * Stop periodic API status checks
   */
  const stopMonitoring = () => {
    if (checkInterval.value) {
      clearInterval(checkInterval.value)
      checkInterval.value = null
    }
  }

  // Auto-start monitoring when in API mode (only on client)
  // Skip monitoring in test mode to avoid unnecessary API calls
  if (import.meta.client) {
    watch(() => isSupabaseData, (isApi) => {
      if (isApi) {
        // Only start monitoring if we're actually in API mode (not test mode)
        startMonitoring()
      } else {
        // Stop monitoring when switching to test mode
        stopMonitoring()
        isApiOffline.value = false
      }
    }, { immediate: false }) // Don't run immediately to avoid initial call in test mode

    // Watch for API errors and immediately update offline status
    watch(() => apiStore.error, (error) => {
      if (error) {
        updateOfflineStatusFromError()
      } else {
        // If error is cleared and we're in API mode, check status again
        if (isSupabaseData) {
          checkApiStatus()
        }
      }
    }, { immediate: true })
  }

  // Cleanup on unmount
  if (import.meta.client) {
    onBeforeUnmount(() => {
      stopMonitoring()
    })
  }

  // Computed that combines API offline status with maintenance mode
  // Maintenance mode takes priority - if enabled, show offline message
  const shouldShowOfflineMessage = computed(() => {
    return isMaintenanceMode.value || isApiOffline.value
  })

  return {
    isApiOffline: computed(() => isApiOffline.value),
    isMaintenanceMode,
    shouldShowOfflineMessage,
    lastApiCheck: computed(() => lastApiCheck.value),
    checkApiStatus,
    startMonitoring,
    stopMonitoring,
  }
}
