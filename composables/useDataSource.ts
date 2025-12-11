/**
 * Composable to manage the data source (Mock vs API)
 * 
 * This allows admins to toggle between mock data and the real API
 * for testing purposes.
 */

export type DataSource = 'mock' | 'api'

// Shared state across all components
const dataSource = ref<DataSource>('mock')

// List of allowed users who can see the settings button
const ALLOWED_USERS = [
  'Orange_mecanique', 
  // 'HoloBird', 
  // 'Les_Doseurs',
]

export function useDataSource() {
  // Initialize from localStorage if available
  if (import.meta.client) {
    const stored = localStorage.getItem('dataSource') as DataSource | null
    if (stored && (stored === 'mock' || stored === 'api')) {
      dataSource.value = stored
    }
  }

  /**
   * Check if the current user is allowed to see the settings
   */
  const isAllowedUser = (username: string | undefined | null): boolean => {
    if (!username) return false
    return ALLOWED_USERS.includes(username)
  }

  /**
   * Set the data source and persist to localStorage
   */
  const setDataSource = (source: DataSource) => {
    dataSource.value = source
    if (import.meta.client) {
      localStorage.setItem('dataSource', source)
    }
    console.log(`[DataSource] Switched to: ${source}`)
  }

  /**
   * Toggle between mock and API
   */
  const toggleDataSource = () => {
    setDataSource(dataSource.value === 'mock' ? 'api' : 'mock')
  }

  /**
   * Check if we're using mock data
   */
  const isMockData = computed(() => dataSource.value === 'mock')

  /**
   * Check if we're using the API
   */
  const isApiData = computed(() => dataSource.value === 'api')

  return {
    dataSource: computed(() => dataSource.value),
    isMockData,
    isApiData,
    setDataSource,
    toggleDataSource,
    isAllowedUser,
    ALLOWED_USERS,
  }
}
