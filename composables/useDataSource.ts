/**
 * Composable to manage the data source (Mock vs API)
 * 
 * This allows admins to toggle between mock data and the real API
 * for testing purposes.
 * 
 * Admin users are now managed in Supabase (admin_users table) instead of hardcoded.
 * We use the Twitch user ID (unique and permanent) to identify admins.
 */

import type { AdminUser } from '~/types/database'

export type DataSource = 'mock' | 'api'

// Shared state across all components
const dataSource = ref<DataSource>('mock')

// Cache for admin status to avoid repeated DB calls
const adminCache = ref<Map<string, boolean>>(new Map())
const adminCacheExpiry = ref<Map<string, number>>(new Map())
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Track if data source is being initialized
const isInitializing = ref(true)

export function useDataSource() {
  const supabase = useSupabaseClient()
  
  // Lazy load useAppSettings to avoid circular dependency
  let appSettingsDataSource: ComputedRef<DataSource> | null = null
  let appSettingsIsLoading: ComputedRef<boolean> | null = null
  try {
    const appSettings = useAppSettings()
    appSettingsDataSource = appSettings.dataSource
    appSettingsIsLoading = appSettings.isLoading
  } catch (e) {
    // useAppSettings might not be available yet
    console.warn('[DataSource] useAppSettings not available:', e)
  }

  // Initialize from localStorage first (fastest, synchronous)
  if (import.meta.client) {
    const stored = localStorage.getItem('dataSource') as DataSource | null
    if (stored && (stored === 'mock' || stored === 'api')) {
      dataSource.value = stored
    }
  }

  // Sync with app settings (from Supabase) if available
  if (appSettingsDataSource && appSettingsIsLoading) {
    // Watch for loading state - when settings finish loading, we're initialized
    watch(appSettingsIsLoading, (loading) => {
      if (!loading) {
        // Settings loaded, sync the data source
        if (appSettingsDataSource) {
          const newValue = appSettingsDataSource.value
          if (newValue && (newValue === 'mock' || newValue === 'api')) {
            dataSource.value = newValue
            if (import.meta.client) {
              localStorage.setItem('dataSource', newValue)
            }
          }
        }
        isInitializing.value = false
      }
    }, { immediate: true })

    // Also watch for data source changes
    if (appSettingsDataSource) {
      watch(appSettingsDataSource, (newValue) => {
        if (newValue && (newValue === 'mock' || newValue === 'api')) {
          dataSource.value = newValue
          if (import.meta.client) {
            localStorage.setItem('dataSource', newValue)
          }
        }
      }, { immediate: true })
    }
  } else {
    // No app settings available, use localStorage value and mark as initialized
    if (import.meta.client) {
      isInitializing.value = false
    }
  }

  /**
   * Check if a user is an active admin by their Twitch user ID
   * Uses caching to avoid repeated database calls
   */
  const checkIsAdmin = async (twitchUserId: string | undefined | null): Promise<boolean> => {
    if (!twitchUserId) return false

    // Check cache first
    const now = Date.now()
    const cachedExpiry = adminCacheExpiry.value.get(twitchUserId)
    if (cachedExpiry && cachedExpiry > now) {
      return adminCache.value.get(twitchUserId) ?? false
    }

    // Query Supabase for active admin
    const { data, error } = await supabase
      .from('admin_users')
      .select('is_active')
      .eq('twitch_user_id', twitchUserId)
      .eq('is_active', true)
      .single()

    const isAdmin = !error && data?.is_active === true

    // Update cache
    adminCache.value.set(twitchUserId, isAdmin)
    adminCacheExpiry.value.set(twitchUserId, now + CACHE_DURATION)

    return isAdmin
  }

  /**
   * Clear the admin cache (useful when admin status changes)
   */
  const clearAdminCache = () => {
    adminCache.value.clear()
    adminCacheExpiry.value.clear()
  }

  /**
   * Set the data source and persist to localStorage
   * Also updates Supabase settings if user is admin
   */
  const setDataSource = async (source: DataSource, userId?: string) => {
    dataSource.value = source
    if (import.meta.client) {
      localStorage.setItem('dataSource', source)
    }
    
    // Update Supabase settings if userId provided (admin only)
    if (userId) {
      try {
        const { setDataSourceSetting } = useAppSettings()
        await setDataSourceSetting(source, userId)
      } catch (e) {
        console.warn('[DataSource] Could not update app settings:', e)
      }
    }
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
    isInitializing: computed(() => isInitializing.value),
    setDataSource,
    toggleDataSource,
    checkIsAdmin,
    clearAdminCache,
  }
}
