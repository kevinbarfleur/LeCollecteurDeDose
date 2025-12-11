/**
 * Composable to persist values in localStorage
 * Values persist across browser sessions
 */
export function useLocalStorageRef<T>(key: string, defaultValue: T) {
  const storageKey = `pref_${key}`
  
  // Initialize with default value
  const value = ref<T>(defaultValue) as Ref<T>
  
  // Only run on client side
  if (import.meta.client) {
    // Try to restore from localStorage on mount
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) {
      try {
        value.value = JSON.parse(stored)
      } catch {
        // If parsing fails, use default value
        value.value = defaultValue
      }
    }
    
    // Watch for changes and persist to localStorage
    watch(value, (newValue) => {
      localStorage.setItem(storageKey, JSON.stringify(newValue))
    }, { deep: true })
  }
  
  return value
}

