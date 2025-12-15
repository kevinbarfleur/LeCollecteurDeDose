/**
 * API Store
 * 
 * Manages API call state (loading, errors, etc.)
 * The actual API calls are in services/api.service.ts
 */

import { defineStore } from 'pinia'
import type { ApiError } from '~/types/api'
import { useDataSourceStore } from './dataSource.store'

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
  }

  /**
   * Get API service configuration
   * This is used by services to get the current mode
   */
  function getApiConfig(): { apiUrl: string | null; isTestMode: boolean; isSupabaseMode?: boolean; supabaseKey?: string } {
    const config = useRuntimeConfig()
    const supabaseKey = config.public.supabase?.key
    
      // Get current data source
    let dataSource = 'supabase'
    try {
      const sourceComputed = dataSourceStore.source
      if (typeof sourceComputed === 'string') {
        dataSource = sourceComputed
      } else {
        dataSource = (sourceComputed as any).value ?? 'supabase'
      }
    } catch {
      dataSource = 'supabase'
    }
    
    const isMockMode = dataSource === 'mock'
    
    return {
      apiUrl: null, // Always null now - direct Supabase usage
      isTestMode: isMockMode, // Keep for backward compatibility
      isSupabaseMode: true, // Always true now
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

