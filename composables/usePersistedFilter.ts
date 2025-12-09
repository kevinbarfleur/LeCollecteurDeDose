/**
 * Composable to persist filter values in sessionStorage
 * Values persist during navigation but reset when the browser/tab is closed
 */
export function usePersistedFilter<T>(key: string, defaultValue: T) {
  const storageKey = `filter_${key}`
  
  // Initialize with default value
  const value = ref<T>(defaultValue) as Ref<T>
  
  // Only run on client side
  if (import.meta.client) {
    // Try to restore from sessionStorage on mount
    const stored = sessionStorage.getItem(storageKey)
    if (stored !== null) {
      try {
        value.value = JSON.parse(stored)
      } catch {
        // If parsing fails, use default value
        value.value = defaultValue
      }
    }
    
    // Watch for changes and persist to sessionStorage
    watch(value, (newValue) => {
      sessionStorage.setItem(storageKey, JSON.stringify(newValue))
    }, { deep: true })
  }
  
  return value
}

