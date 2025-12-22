/**
 * Data Source Store
 *
 * Manages the data source mode (Supabase vs Mock)
 * Mock mode is for local development only
 *
 * When switching to mock mode, the user's current Supabase collection
 * is copied to in-memory mock data for safe testing.
 * Mock mode automatically resets on page reload.
 */

import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'
import { logWarn, logInfo } from '~/services/logger.service'
import { logAdminAction } from '~/services/diagnosticLogger.service'
import { initializeMockFromSupabase, resetMockData } from '~/services/supabase-mock.service'

export type DataSource = 'supabase' | 'mock'

export const useDataSourceStore = defineStore('dataSource', () => {
  // Always start with Supabase - mock mode is session-only (no localStorage persistence)
  const source = ref<DataSource>('supabase')
  const isInitialized = ref(false)
  const isLoadingMockData = ref(false)

  // Get auth store
  const authStore = useAuthStore()

  // Getters
  const isMockData = computed(() => {
    // NEVER allow mock mode in production, even if localStorage says so
    if (!import.meta.dev) return false
    return source.value === 'mock'
  })

  const isSupabaseData = computed(() => {
    // Always use Supabase in production
    if (!import.meta.dev) return true
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
    const authStore = useAuthStore()

    // Allow mock mode only in development
    if (newSource === 'mock' && !import.meta.dev) {
      logWarn('Mock mode not allowed in production', { store: 'DataSource', action: 'setDataSource' })
      return
    }

    // In production, force Supabase mode
    if (!import.meta.dev && newSource !== 'supabase') {
      logWarn('Only Supabase mode allowed in production', { store: 'DataSource', action: 'setDataSource' })
      source.value = 'supabase'
      return
    }

    const oldSource = source.value

    // When switching TO mock mode, copy Supabase data first
    if (newSource === 'mock' && oldSource === 'supabase') {
      isLoadingMockData.value = true
      try {
        await copySupabaseToMock()
        logInfo('Supabase data copied to mock mode', { store: 'DataSource' })
      } catch (error) {
        console.error('[DataSource] Failed to copy data to mock:', error)
        logWarn('Failed to copy Supabase data to mock', { store: 'DataSource', error })
        isLoadingMockData.value = false
        return // Don't switch if copy failed
      }
      isLoadingMockData.value = false
    }

    // When switching FROM mock mode, reset mock data
    if (newSource === 'supabase' && oldSource === 'mock') {
      resetMockData()
      logInfo('Mock data cleared, returning to Supabase', { store: 'DataSource' })
    }

    source.value = newSource

    // Log diagnostic (don't persist to localStorage - mock mode is session-only)
    if (import.meta.client) {
      await logAdminAction(
        'switch_data_source' as any,
        { data_source: oldSource } as any,
        { data_source: newSource } as any,
        { data_mode: newSource } as any
      )
    }
  }

  /**
   * Copy current user's Supabase collection to mock data
   */
  async function copySupabaseToMock(): Promise<void> {
    const { user } = useUserSession()
    const username = (user.value as any)?.name || (user.value as any)?.displayName

    if (!username) {
      throw new Error('No user logged in - cannot copy collection')
    }

    const supabase = useSupabaseClient()

    // Get user's ID and vaal orbs (case-insensitive search)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, vaal_orbs')
      .ilike('twitch_username', username.toLowerCase())
      .maybeSingle()

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`)
    }

    if (!userData?.id) {
      throw new Error(`User ${username} not found in database`)
    }

    const userId = userData.id
    const vaalOrbs = userData?.vaal_orbs ?? 0

    // Get user's collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('user_collections')
      .select('card_uid, normal_count, foil_count')
      .eq('user_id', userId)

    if (collectionError) {
      throw new Error(`Failed to fetch collection: ${collectionError.message}`)
    }

    // Convert to mock format
    const collectionMap: Record<string, any> = {}
    for (const item of (collectionData || []) as any[]) {
      collectionMap[item.card_uid] = {
        normal: item.normal_count || 0,
        foil: item.foil_count || 0,
        synthesised: 0
      }
    }

    initializeMockFromSupabase(username, collectionMap, vaalOrbs)
    console.log(`[DataSource] Copied ${collectionData?.length || 0} cards to mock mode (${vaalOrbs} vaal orbs)`)
  }

  async function toggleDataSource(): Promise<void> {
    await setDataSource(source.value === 'supabase' ? 'mock' : 'supabase')
  }

  async function initialize() {
    if (isInitialized.value) return

    // Initialize auth store first
    const authStore = useAuthStore()
    await authStore.initialize()

    // Always start with Supabase - mock mode is session-only
    // (No localStorage reading - mock data resets on reload)
    source.value = 'supabase'

    isInitialized.value = true
  }

  return {
    // State - expose as computed for reactivity
    source: computed(() => source.value),
    isInitialized: computed(() => isInitialized.value),
    isLoadingMockData: computed(() => isLoadingMockData.value),

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

