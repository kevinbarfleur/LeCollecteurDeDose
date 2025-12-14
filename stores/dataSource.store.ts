/**
 * Data Source Store
 * 
 * Manages the data source mode (API vs Test)
 * Only admins can use test mode
 */

import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'
import { logInfo, logWarn } from '~/services/logger.service'
import { logAdminAction } from '~/services/diagnosticLogger.service'

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
    // Access isAdmin computed value - it's a computed ref, so use .value
    const isAdmin = typeof authStore.isAdmin === 'boolean' 
      ? authStore.isAdmin 
      : (authStore.isAdmin as any).value ?? false
    if (!isAdmin) {
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
    logInfo('Setting data source', { store: 'DataSource', action: 'setDataSource', from: source.value, to: newSource })
    
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
        logWarn('Data source change denied', { store: 'DataSource', action: 'setDataSource', reason: 'not admin' })
        source.value = 'api'
        if (import.meta.client) {
          localStorage.removeItem('dataSource')
        }
        return
      }
    } else {
      // No user ID available, reject change
      logWarn('Data source change denied', { store: 'DataSource', action: 'setDataSource', reason: 'no userId' })
      return
    }

    // Admin confirmed, allow change
    const oldSource = source.value
    source.value = newSource
    if (import.meta.client) {
      localStorage.setItem('dataSource', newSource)
      
      // Log diagnostic before change
      await logAdminAction(
        'switch_data_source',
        { data_source: oldSource },
        { data_source: newSource },
        { data_mode: newSource }
      )
    }
    logInfo('Data source changed', { store: 'DataSource', action: 'setDataSource', source: newSource })
  }

  async function toggleDataSource(): Promise<void> {
    await setDataSource(source.value === 'api' ? 'test' : 'api')
  }

  async function initialize() {
    if (isInitialized.value) return

    logInfo('Initializing data source store', { store: 'DataSource', action: 'initialize', initialSource: source.value })

    // Initialize auth store first
    const authStore = useAuthStore()
    await authStore.initialize()

    // Force API for non-admins
    if (!authStore.isAdmin && source.value === 'test') {
      logWarn('Forcing API mode for non-admin', { store: 'DataSource', action: 'initialize' })
      source.value = 'api'
      if (import.meta.client) {
        localStorage.removeItem('dataSource')
      }
    }

    // Watch for admin status changes
    watch(() => authStore.isAdmin, (isAdmin) => {
      if (!isAdmin && source.value === 'test') {
        logWarn('Forcing API mode after admin loss', { store: 'DataSource', action: 'adminStatusChange' })
        source.value = 'api'
        if (import.meta.client) {
          localStorage.removeItem('dataSource')
        }
      }
    })

    isInitialized.value = true
    logInfo('Data source store initialized', { store: 'DataSource', action: 'initialize', source: source.value, isTestData: authStore.isAdmin && source.value === 'test' })
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

