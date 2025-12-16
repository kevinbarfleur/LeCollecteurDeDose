/**
 * Data Source Store
 * 
 * Manages the data source mode (Supabase vs Mock)
 * Mock mode is for local development only
 */

import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'
import { logWarn } from '~/services/logger.service'
import { logAdminAction } from '~/services/diagnosticLogger.service'

export type DataSource = 'supabase' | 'mock'

export const useDataSourceStore = defineStore('dataSource', () => {
  // Initialize from localStorage
  let initialSource: DataSource = 'supabase'
  if (import.meta.client) {
    const stored = localStorage.getItem('dataSource') as DataSource | null
    if (stored && (stored === 'supabase' || stored === 'mock')) {
      initialSource = stored
    }
  }

  // State
  const source = ref<DataSource>(initialSource)
  const isInitialized = ref(false)

  // Get auth store
  const authStore = useAuthStore()

  // Getters
  const isMockData = computed(() => {
    // NEVER allow mock mode in production, even if localStorage says so
    if (import.meta.prod) return false
    return source.value === 'mock'
  })

  const isSupabaseData = computed(() => {
    // Always use Supabase in production
    if (import.meta.prod) return true
    return source.value === 'supabase'
  })

  const apiUrl = computed(() => {
      // Return null to indicate direct Supabase usage (not via API)
    // Mock mode also uses null as it's handled internally
      return null
  })

  // Actions
  async function setDataSource(newSource: DataSource): Promise<void> {
    // Check if user is admin before allowing change
    const { user } = useUserSession()
    const userId = user.value?.id
    const authStore = useAuthStore()

    // Allow mock mode only in development
    if (newSource === 'mock' && import.meta.prod) {
      logWarn('Mock mode not allowed in production', { store: 'DataSource', action: 'setDataSource' })
      return
    }
    
    // In production, force Supabase mode
    if (import.meta.prod && newSource !== 'supabase') {
      logWarn('Only Supabase mode allowed in production', { store: 'DataSource', action: 'setDataSource' })
      source.value = 'supabase'
        if (import.meta.client) {
        localStorage.setItem('dataSource', 'supabase')
        }
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
  }

  async function toggleDataSource(): Promise<void> {
    await setDataSource(source.value === 'supabase' ? 'mock' : 'supabase')
  }

  async function initialize() {
    if (isInitialized.value) return

    // Initialize auth store first
    const authStore = useAuthStore()
    await authStore.initialize()

    // Force Supabase in production
    if (import.meta.prod && source.value !== 'supabase') {
      source.value = 'supabase'
      if (import.meta.client) {
        localStorage.setItem('dataSource', 'supabase')
      }
    }

    isInitialized.value = true
  }

  return {
    // State - expose as computed for reactivity
    source: computed(() => source.value),
    isInitialized: computed(() => isInitialized.value),

    // Getters
    isMockData,
    isSupabaseData,
    apiUrl,

    // Actions
    setDataSource,
    toggleDataSource,
    initialize,
  }
})

