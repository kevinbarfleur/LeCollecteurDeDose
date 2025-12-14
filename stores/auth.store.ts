/**
 * Auth Store
 * 
 * Manages authentication state and admin status
 */

import { defineStore } from 'pinia'
import { checkAdminStatus, clearAdminCache, clearAdminCacheForUser } from '~/services/supabase.service'
import { logInfo, logWarn } from '~/services/logger.service'

export const useAuthStore = defineStore('auth', () => {
  // State
  const isAdmin = ref(false)
  const isInitialized = ref(false)

  // Getters
  const isAuthenticated = computed(() => {
    const { user } = useUserSession()
    return !!user.value
  })

  const canUseTestMode = computed(() => isAdmin.value)

  // Actions
  async function checkAdmin(userId: string | undefined | null): Promise<boolean> {
    if (!userId) {
      isAdmin.value = false
      logInfo('Admin check skipped', { store: 'Auth', action: 'checkAdmin', reason: 'no userId' })
      return false
    }

    const adminStatus = await checkAdminStatus(userId)
    isAdmin.value = adminStatus
    logInfo('Admin status checked', { store: 'Auth', action: 'checkAdmin', userId: userId.slice(0, 8), isAdmin: adminStatus })
    return adminStatus
  }

  function clearCache() {
    clearAdminCache()
    isAdmin.value = false
  }

  function clearCacheForUser(userId: string) {
    clearAdminCacheForUser(userId)
    if (useUserSession().user.value?.id === userId) {
      isAdmin.value = false
    }
  }

  async function initialize() {
    if (isInitialized.value) return

    logInfo('Initializing auth store', { store: 'Auth', action: 'initialize' })

    const { user } = useUserSession()

    if (user.value?.id) {
      await checkAdmin(user.value.id)
    }

    // Watch for user changes
    if (import.meta.client) {
      watch(() => user.value?.id, async (userId) => {
        if (userId) {
          await checkAdmin(userId)
        } else {
          isAdmin.value = false
          logInfo('User logged out', { store: 'Auth', action: 'userChange' })
        }
      }, { immediate: true })
    }

    isInitialized.value = true
    logInfo('Auth store initialized', { store: 'Auth', action: 'initialize', isAdmin: isAdmin.value })
  }

  return {
    // State - expose as computed for reactivity
    isAdmin: computed(() => isAdmin.value),
    isInitialized: computed(() => isInitialized.value),

    // Getters
    isAuthenticated,
    canUseTestMode,

    // Actions
    checkAdmin,
    clearCache,
    clearCacheForUser,
    initialize,
  }
})

