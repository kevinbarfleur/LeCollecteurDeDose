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

export function useDataSource() {
  const supabase = useSupabaseClient()

  // Initialize from localStorage if available
  if (import.meta.client) {
    const stored = localStorage.getItem('dataSource') as DataSource | null
    if (stored && (stored === 'mock' || stored === 'api')) {
      dataSource.value = stored
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
    checkIsAdmin,
    clearAdminCache,
  }
}
