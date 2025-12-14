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

// Track API status
const isApiOffline = ref(false)
const lastApiCheck = ref<Date | null>(null)
const checkInterval = ref<NodeJS.Timeout | null>(null)

// Check interval: every 30 seconds when API mode is active
const CHECK_INTERVAL_MS = 30000

export function useApiStatus() {
  const { isApiData } = useDataSource()
  const { fetchUserCollections } = useApi()
  const apiStore = useApiStore()

  /**
   * Check if API is available by making a lightweight request
   */
  const checkApiStatus = async (): Promise<boolean> => {
    // Only check if we're in API mode (not test mode)
    // In test mode, we don't need to check API status
    if (!isApiData) {
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
    if (!isApiData) {
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
    watch(() => isApiData, (isApi) => {
      if (isApi) {
        // Only start monitoring if we're actually in API mode (not test mode)
        startMonitoring()
      } else {
        // Stop monitoring when switching to test mode
        stopMonitoring()
        isApiOffline.value = false
      }
    }, { immediate: false }) // Don't run immediately to avoid initial call in test mode
  }

  // Cleanup on unmount
  if (import.meta.client) {
    onBeforeUnmount(() => {
      stopMonitoring()
    })
  }

  return {
    isApiOffline: computed(() => isApiOffline.value),
    lastApiCheck: computed(() => lastApiCheck.value),
    checkApiStatus,
    startMonitoring,
    stopMonitoring,
  }
}
