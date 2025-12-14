/**
 * API Store
 * 
 * Manages API call state (loading, errors, etc.)
 * The actual API calls are in services/api.service.ts
 */

import { defineStore } from 'pinia'
import type { ApiError } from '~/types/api'
import { useDataSourceStore } from './dataSource.store'
import { logInfo, logError } from '~/services/logger.service'

export const useApiStore = defineStore('api', () => {
  // State
  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)
  const lastRequestTime = ref<number | null>(null)

  // Get dataSource store for API URL
  const dataSourceStore = useDataSourceStore()

  // Getters
  const apiUrl = computed(() => dataSourceStore.apiUrl)

  const isOnline = computed(() => {
    // Simple check: if last request was recent and no error, assume online
    if (!lastRequestTime.value) return true
    const timeSinceLastRequest = Date.now() - lastRequestTime.value
    return timeSinceLastRequest < 60000 && !error.value // Online if last request < 1 min ago and no error
  })

  // Actions
  function setLoading(loading: boolean) {
    isLoading.value = loading
    if (loading) {
      lastRequestTime.value = Date.now()
      logInfo('API loading started', { store: 'API', action: 'setLoading' })
    } else {
      logInfo('API loading finished', { store: 'API', action: 'setLoading' })
    }
  }

  function setError(err: ApiError | null) {
    error.value = err
    if (err) {
      logError('API error', undefined, { store: 'API', action: 'setError', status: err.status, message: err.message })
    }
  }

  function clearError() {
    error.value = null
    logInfo('API error cleared', { store: 'API', action: 'clearError' })
  }

  /**
   * Get API service configuration
   * This is used by services to get the current API URL and mode
   */
  function getApiConfig(): { apiUrl: string | null; isTestMode: boolean; isSupabaseMode?: boolean; supabaseKey?: string } {
    const config = useRuntimeConfig()
    const supabaseKey = config.public.supabase?.key
    
    // Access isTestData and isSupabaseData computed values correctly
    // These are computed refs, so we need to access .value
    let isTestMode = false
    let isSupabaseMode = false
    let dataSource = 'unknown'
    
    try {
      // Get current data source
      const sourceComputed = dataSourceStore.source
      if (typeof sourceComputed === 'string') {
        dataSource = sourceComputed
      } else {
        dataSource = (sourceComputed as any).value ?? 'unknown'
      }
      
      // isTestData is a computed ref from Pinia, access its value
      const testDataComputed = dataSourceStore.isTestData
      // Check if it's already a boolean (shouldn't happen, but safety check)
      if (typeof testDataComputed === 'boolean') {
        isTestMode = testDataComputed
      } else {
        // It's a computed ref, access .value
        isTestMode = (testDataComputed as any).value ?? false
      }
      
      // Check Supabase mode
      const supabaseDataComputed = dataSourceStore.isSupabaseData
      if (typeof supabaseDataComputed === 'boolean') {
        isSupabaseMode = supabaseDataComputed
      } else {
        isSupabaseMode = (supabaseDataComputed as any).value ?? false
      }
    } catch (e) {
      // Fallback: check source directly
      try {
        const source = (dataSourceStore.source as any).value
        dataSource = source || 'unknown'
        isTestMode = source === 'test'
        isSupabaseMode = source === 'supabase'
      } catch {
        isTestMode = false
        isSupabaseMode = false
      }
    }
    
    logInfo('🟡 [STORE] Getting API config', { 
      store: 'API', 
      action: 'getApiConfig', 
      dataSource,
      isTestMode, 
      isSupabaseMode, 
      hasSupabaseKey: !!supabaseKey, 
      apiUrl: apiUrl.value,
      supabaseUrl: config.public.supabase?.url
    })
    
    return {
      apiUrl: apiUrl.value,
      isTestMode,
      isSupabaseMode,
      supabaseKey,
    }
  }

  return {
    // State - expose as computed for reactivity
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    lastRequestTime: computed(() => lastRequestTime.value),

    // Getters
    apiUrl,
    isOnline,

    // Actions
    setLoading,
    setError,
    clearError,
    getApiConfig,
  }
})

