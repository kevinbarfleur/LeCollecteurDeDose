/**
 * Composable to track API availability status
 * 
 * Detects when the external API is offline and provides
 * a reactive state for displaying "game offline" messages
 */

import { useApi } from './useApi'
import { useDataSource } from './useDataSource'

// Track API status
const isApiOffline = ref(false)
const lastApiCheck = ref<Date | null>(null)
const checkInterval = ref<NodeJS.Timeout | null>(null)

// Check interval: every 30 seconds when API mode is active
const CHECK_INTERVAL_MS = 30000

export function useApiStatus() {
  const { isApiData } = useDataSource()
  const { fetchUserCollections } = useApi()

  /**
   * Check if API is available by making a lightweight request
   */
  const checkApiStatus = async (): Promise<boolean> => {
    // Only check if we're in API mode
    if (!isApiData.value) {
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
      console.warn('[ApiStatus] API check failed:', error)
      isApiOffline.value = true
      lastApiCheck.value = new Date()
      return false
    }
  }

  /**
   * Start periodic API status checks
   */
  const startMonitoring = () => {
    // Clear existing interval
    if (checkInterval.value) {
      clearInterval(checkInterval.value)
    }

    // Only monitor if in API mode
    if (!isApiData.value) {
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

  // Auto-start monitoring when in API mode
  watch(isApiData, (isApi) => {
    if (isApi) {
      startMonitoring()
    } else {
      stopMonitoring()
      isApiOffline.value = false
    }
  }, { immediate: true })

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

