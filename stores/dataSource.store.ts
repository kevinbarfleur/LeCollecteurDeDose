/**
 * Data Source Store
 * 
 * Manages the data source mode (API vs Test)
 * Only admins can use test mode
 */

import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'

export type DataSource = 'api' | 'test'

export const useDataSourceStore = defineStore('dataSource', () => {
  // Initialize from localStorage
  let initialSource: DataSource = 'api'
  if (import.meta.client) {
    const stored = localStorage.getItem('dataSource') as DataSource | null
    if (stored && (stored === 'api' || stored === 'test')) {
      initialSource = stored
    }
  }

  // State
  const source = ref<DataSource>(initialSource)
  const isInitialized = ref(false)

  // Get auth store
  const authStore = useAuthStore()

  // Getters
  const isTestData = computed(() => {
    // Non-admins can NEVER use test data
    if (!authStore.isAdmin) {
      return false
    }
    return source.value === 'test'
  })

  const isApiData = computed(() => {
    // Non-admins ALWAYS use API
    if (!authStore.isAdmin) {
      return true
    }
    return source.value === 'api'
  })

  const apiUrl = computed(() => {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabase?.url || ''
    
    if (source.value === 'test') {
      return `${supabaseUrl}/functions/v1/dev-test-api`
    }
    return '/api/data'
  })

  // Actions
  async function setDataSource(newSource: DataSource): Promise<void> {
    // Check if user is admin before allowing change
    const { user } = useUserSession()
    const userId = user.value?.id
    const authStore = useAuthStore()

    if (userId) {
      // Ensure admin status is checked
      if (!authStore.isInitialized) {
        await authStore.initialize()
      }
      
      const isAdmin = await authStore.checkAdmin(userId)
      if (!isAdmin) {
        console.warn('[DataSourceStore] Only admins can change data source')
        source.value = 'api'
        if (import.meta.client) {
          localStorage.removeItem('dataSource')
        }
        return
      }
    } else {
      // No user ID available, reject change
      console.warn('[DataSourceStore] No user ID available, cannot change data source')
      return
    }

    // Admin confirmed, allow change
    source.value = newSource
    if (import.meta.client) {
      localStorage.setItem('dataSource', newSource)
    }
  }

  async function toggleDataSource(): Promise<void> {
    await setDataSource(source.value === 'api' ? 'test' : 'api')
  }

  async function initialize() {
    if (isInitialized.value) return

    // Initialize auth store first
    const authStore = useAuthStore()
    await authStore.initialize()

    // Force API for non-admins
    if (!authStore.isAdmin && source.value === 'test') {
      console.log('[DataSourceStore] Non-admin user detected, forcing API mode')
      source.value = 'api'
      if (import.meta.client) {
        localStorage.removeItem('dataSource')
      }
    }

    // Watch for admin status changes
    watch(() => authStore.isAdmin, (isAdmin) => {
      if (!isAdmin && source.value === 'test') {
        console.log('[DataSourceStore] User lost admin status, forcing API mode')
        source.value = 'api'
        if (import.meta.client) {
          localStorage.removeItem('dataSource')
        }
      }
    })

    isInitialized.value = true
  }

  return {
    // State - expose as computed for reactivity
    source: computed(() => source.value),
    isInitialized: computed(() => isInitialized.value),

    // Getters
    isTestData,
    isApiData,
    apiUrl,

    // Actions
    setDataSource,
    toggleDataSource,
    initialize,
  }
})

