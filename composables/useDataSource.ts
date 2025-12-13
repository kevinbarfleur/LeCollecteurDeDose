/**
 * Composable to manage the data source (API vs Test)
 * 
 * Simple implementation: reads from localStorage on mount, allows admins to change it.
 * The value NEVER changes automatically - only when the admin explicitly changes it.
 */

import type { AdminUser } from '~/types/database'

export type DataSource = 'api' | 'test'

// Initialize dataSource from localStorage ONCE at module load
let initialDataSource: DataSource = 'api'
if (import.meta.client) {
  const stored = localStorage.getItem('dataSource') as DataSource | null
  if (stored && (stored === 'api' || stored === 'test')) {
    initialDataSource = stored
    console.log('[DataSource] Initialized from localStorage:', stored)
  } else {
    console.log('[DataSource] No localStorage value, defaulting to:', initialDataSource)
  }
}

// Shared state across all components
const dataSource = ref<DataSource>(initialDataSource)

// Cache for admin status to avoid repeated DB calls
const adminCache = ref<Map<string, boolean>>(new Map())
const adminCacheExpiry = ref<Map<string, number>>(new Map())
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useDataSource() {
  const supabase = useSupabaseClient()
  const { user } = useUserSession()
  
  /**
   * Check if a user is an active admin by their Twitch user ID
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
   * Clear the admin cache
   */
  const clearAdminCache = () => {
    adminCache.value.clear()
    adminCacheExpiry.value.clear()
  }

  /**
   * Set the data source and persist to localStorage
   * Only works for admins - non-admins are always forced to 'api'
   */
  const setDataSource = async (source: DataSource, userId?: string): Promise<void> => {
    console.log('[DataSource] setDataSource called:', { source, userId, currentValue: dataSource.value })
    
    // Check if user is admin before allowing change
    const userIdToCheck = userId || user.value?.id
    if (userIdToCheck) {
      const isAdmin = await checkIsAdmin(userIdToCheck)
      if (!isAdmin) {
        console.warn('[DataSource] Only admins can change data source')
        dataSource.value = 'api'
        if (import.meta.client) {
          localStorage.removeItem('dataSource')
        }
        return
      }
    } else {
      // No user ID available, reject change
      console.warn('[DataSource] No user ID available, cannot change data source')
      return
    }
    
    // Admin confirmed, allow change
    const oldValue = dataSource.value
    dataSource.value = source
    if (import.meta.client) {
      localStorage.setItem('dataSource', source)
      console.log('[DataSource] Value set successfully:', { oldValue, newValue: source })
    }
  }

  /**
   * Toggle between API and Test
   */
  const toggleDataSource = async () => {
    await setDataSource(dataSource.value === 'api' ? 'test' : 'api')
  }

  // Track admin status (will be checked when needed)
  const isAdminUser = ref(false)

  // Check admin status on mount and whenever user changes
  if (import.meta.client) {
    // Initial check
    if (user.value?.id) {
      checkIsAdmin(user.value.id).then(isAdmin => {
        isAdminUser.value = isAdmin
        // Force API for non-admins - ALWAYS
        if (!isAdmin) {
          if (dataSource.value === 'test') {
            console.log('[DataSource] Non-admin user detected, forcing API mode')
            dataSource.value = 'api'
            localStorage.removeItem('dataSource')
          }
        }
      })
    }

    // Watch for user changes
    watch(() => user.value?.id, async (twitchUserId) => {
      if (twitchUserId) {
        const isAdmin = await checkIsAdmin(twitchUserId)
        isAdminUser.value = isAdmin
        // Force API for non-admins - ALWAYS
        if (!isAdmin) {
          if (dataSource.value === 'test') {
            console.log('[DataSource] Non-admin user detected, forcing API mode')
            dataSource.value = 'api'
            localStorage.removeItem('dataSource')
          }
        }
      } else {
        isAdminUser.value = false
        // Not logged in, force API
        if (dataSource.value === 'test') {
          dataSource.value = 'api'
          localStorage.removeItem('dataSource')
        }
      }
    }, { immediate: true })
  }

  /**
   * Check if we're using test data (Supabase)
   * CRITICAL: Only returns true if user is admin AND dataSource is 'test'
   * Non-admins ALWAYS get false, even if localStorage is manipulated
   */
  const isTestData = computed(() => {
    // Non-admins can NEVER use test data
    if (!isAdminUser.value) {
      return false
    }
    return dataSource.value === 'test'
  })

  /**
   * Check if we're using the real API
   * CRITICAL: Returns true if dataSource is 'api' OR if user is not admin
   * Non-admins ALWAYS use API
   */
  const isApiData = computed(() => {
    // Non-admins ALWAYS use API
    if (!isAdminUser.value) {
      return true
    }
    return dataSource.value === 'api'
  })

  return {
    // CRITICAL: Non-admins ALWAYS get 'api', even if localStorage is manipulated
    dataSource: computed(() => {
      if (!isAdminUser.value) {
        return 'api'
      }
      return dataSource.value
    }),
    isTestData,
    isApiData,
    isInitializing: computed(() => false), // No initialization needed, value is ready immediately
    setDataSource,
    toggleDataSource,
    checkIsAdmin,
    clearAdminCache,
    isAdmin: computed(() => isAdminUser.value),
  }
}
