/**
 * Composable to manage the data source (API vs Test)
 * 
 * This allows admins to toggle between the real API and test data from Supabase
 * for testing purposes.
 * 
 * Admin users are now managed in Supabase (admin_users table) instead of hardcoded.
 * We use the Twitch user ID (unique and permanent) to identify admins.
 */

import type { AdminUser } from '~/types/database'

export type DataSource = 'api' | 'test'

// Initialize dataSource from localStorage ONCE at module load
// This ensures it's only read once, not on every composable instance
let initialDataSource: DataSource = 'api'
if (import.meta.client) {
  const stored = localStorage.getItem('dataSource') as DataSource | null
  if (stored && (stored === 'api' || stored === 'test')) {
    initialDataSource = stored
  }
}

// Shared state across all components
const dataSource = ref<DataSource>(initialDataSource)

// Cache for admin status to avoid repeated DB calls
const adminCache = ref<Map<string, boolean>>(new Map())
const adminCacheExpiry = ref<Map<string, number>>(new Map())
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Track if data source is being initialized
const isInitializing = ref(true)

export function useDataSource() {
  const supabase = useSupabaseClient()
  const { user } = useUserSession()
  
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

  // Track admin status
  const isAdminUser = ref(false)

  // Track if we're currently setting dataSource (to prevent watch from overriding)
  const isSettingDataSource = ref(false)

  // Track the last user ID to avoid re-running the watch unnecessarily
  let lastUserId: string | undefined = undefined

  // Sync dataSource to localStorage whenever it changes (for admins)
  // This ensures localStorage is always up-to-date
  if (import.meta.client) {
    watch(dataSource, (newValue) => {
      // Only sync if we're not currently setting (to avoid loops)
      if (!isSettingDataSource.value && isAdminUser.value) {
        localStorage.setItem('dataSource', newValue)
      }
    })
  }

  // Check admin status on user change
  // This watch ONLY checks admin status and forces API for non-admins
  // It does NOT read from localStorage - that's done once at module load
  if (import.meta.client) {
    watch(() => user.value?.id, async (twitchUserId) => {
      // Don't override if we're currently setting dataSource
      if (isSettingDataSource.value) {
        return
      }
      
      // Only run if user ID actually changed
      if (twitchUserId === lastUserId) {
        return
      }
      
      lastUserId = twitchUserId
      
      if (twitchUserId) {
        isAdminUser.value = await checkIsAdmin(twitchUserId)
        // Force API mode for non-admins
        if (!isAdminUser.value) {
          dataSource.value = 'api'
          localStorage.removeItem('dataSource')
        }
        // For admins: do NOT read from localStorage here
        // The localStorage was already read at module load
        // Respect whatever value dataSource currently has (user's choice)
      } else {
        isAdminUser.value = false
        // Not logged in, default to API
        dataSource.value = 'api'
        localStorage.removeItem('dataSource')
      }
    }, { immediate: true })
  }


  /**
   * Set the data source and persist to localStorage
   * Only works for admins - non-admins are always forced to 'api'
   * This is a LOCAL setting per admin session, NOT synced to Supabase
   */
  const setDataSource = async (source: DataSource, userId?: string) => {
    // Set flag to prevent watch from overriding
    isSettingDataSource.value = true
    
    try {
      // Check if user is admin before allowing change
      if (userId) {
        const isAdmin = await checkIsAdmin(userId)
        if (!isAdmin) {
          console.warn('[DataSource] Only admins can change data source')
          dataSource.value = 'api'
          localStorage.removeItem('dataSource')
          return
        }
        // Update isAdminUser for future calls
        isAdminUser.value = true
      } else {
        // No userId provided, check current admin status
        // If not set yet, try to get it from user session
        if (!isAdminUser.value && user.value?.id) {
          isAdminUser.value = await checkIsAdmin(user.value.id)
        }
        if (!isAdminUser.value) {
          console.warn('[DataSource] Only admins can change data source')
          dataSource.value = 'api'
          localStorage.removeItem('dataSource')
          return
        }
      }
      
      // Admin confirmed, allow change
      dataSource.value = source
      if (import.meta.client) {
        localStorage.setItem('dataSource', source)
      }
    } finally {
      // Reset flag after a delay to allow the change to propagate
      // Use a longer delay to ensure watch doesn't override
      setTimeout(() => {
        isSettingDataSource.value = false
      }, 500)
    }
  }

  /**
   * Toggle between API and Test
   */
  const toggleDataSource = () => {
    setDataSource(dataSource.value === 'api' ? 'test' : 'api')
  }

  /**
   * Check if we're using test data (Supabase)
   * Returns true if dataSource is 'test' (regardless of admin status for reading)
   * Admin check is only for SETTING the data source, not reading it
   */
  const isTestData = computed(() => {
    return dataSource.value === 'test'
  })

  /**
   * Check if we're using the real API
   * Returns true if dataSource is 'api'
   */
  const isApiData = computed(() => {
    return dataSource.value === 'api'
  })

  // Mark as initialized after a short delay to allow admin check
  if (import.meta.client) {
    watch(isAdminUser, () => {
      if (!isInitializing.value) return
      // Small delay to ensure admin check completes
      setTimeout(() => {
        isInitializing.value = false
      }, 100)
    }, { immediate: true })
    
    // Also mark as initialized if no user (defaults to API)
    if (!user.value?.id) {
      setTimeout(() => {
        isInitializing.value = false
      }, 100)
    }
  }

  return {
    dataSource: computed(() => {
      // Force API for non-admins
      if (!isAdminUser.value) return 'api'
      return dataSource.value
    }),
    isTestData,
    isApiData,
    isInitializing: computed(() => isInitializing.value),
    setDataSource,
    toggleDataSource,
    checkIsAdmin,
    clearAdminCache,
    isAdmin: computed(() => isAdminUser.value),
  }
}
