/**
 * Composable to manage dev/test mode (localhost only)
 * 
 * When in dev/test mode, the app uses Supabase Edge Function instead of the real API
 * This allows testing without affecting production data
 */

export type DevTestMode = 'real' | 'test'

// Shared state
const devTestMode = ref<DevTestMode>('test') // Default to test mode
const isLocalhost = ref(false)

export function useDevTestMode() {
  // Check if we're on localhost
  if (import.meta.client) {
    isLocalhost.value = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === '[::1]'
    
    // Only enable dev/test mode on localhost
    if (isLocalhost.value) {
      // Load from localStorage
      const stored = localStorage.getItem('devTestMode') as DevTestMode | null
      if (stored && (stored === 'real' || stored === 'test')) {
        devTestMode.value = stored
      } else {
        // Default to test mode
        devTestMode.value = 'test'
        localStorage.setItem('devTestMode', 'test')
      }
    } else {
      // Not localhost, always use real mode
      devTestMode.value = 'real'
    }
  }

  /**
   * Set the dev/test mode
   */
  const setDevTestMode = (mode: DevTestMode) => {
    if (!isLocalhost.value) {
      console.warn('[DevTestMode] Cannot change mode: not on localhost')
      return
    }
    
    devTestMode.value = mode
    if (import.meta.client) {
      localStorage.setItem('devTestMode', mode)
    }
  }

  /**
   * Check if we're using test mode
   */
  const isTestMode = computed(() => {
    return isLocalhost.value && devTestMode.value === 'test'
  })

  /**
   * Check if we're using real mode
   */
  const isRealMode = computed(() => {
    return !isLocalhost.value || devTestMode.value === 'real'
  })

  return {
    devTestMode: computed(() => devTestMode.value),
    isLocalhost: computed(() => isLocalhost.value),
    isTestMode,
    isRealMode,
    setDevTestMode,
  }
}

