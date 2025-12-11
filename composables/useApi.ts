import type { ApiResponse, PlayerCollection, CatalogueResponse, ApiError } from '~/types/api'

/**
 * Composable for interacting with Le Collecteur de Dose API
 * 
 * Provides methods to fetch:
 * - Global card catalogue
 * - Player collections
 * - Health check
 */
export function useApi() {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  // State
  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Generic fetch wrapper with error handling
   */
  async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    isLoading.value = true
    error.value = null

    // Normalize the URL (remove trailing slash from base, ensure leading slash on endpoint)
    const baseUrl = apiUrl.replace(/\/$/, '')
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${baseUrl}${normalizedEndpoint}`

    try {
      const response = await $fetch<T>(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          // Required for ngrok free tier
          'ngrok-skip-browser-warning': 'true',
          ...options.headers,
        },
      })

      return response
    } catch (err: any) {
      console.error(`[API Error] ${endpoint}:`, err)
      
      error.value = {
        status: err.status || err.statusCode || 500,
        message: err.message || 'Une erreur est survenue',
        code: err.data?.code,
      }

      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch the global card catalogue
   */
  async function fetchCatalogue(): Promise<CatalogueResponse | null> {
    console.log('[API] Fetching catalogue...')
    const result = await apiFetch<CatalogueResponse>('/catalogue')
    
    if (result) {
      console.log('[API] Catalogue fetched:', result)
    }
    
    return result
  }

  /**
   * Fetch a player's collection by their ID or username
   */
  async function fetchPlayerCollection(playerIdOrUsername: string): Promise<PlayerCollection | null> {
    console.log(`[API] Fetching collection for: ${playerIdOrUsername}`)
    const result = await apiFetch<PlayerCollection>(`/collection/${playerIdOrUsername}`)
    
    if (result) {
      console.log('[API] Player collection fetched:', result)
    }
    
    return result
  }

  /**
   * Fetch all collections (if the API supports it)
   */
  async function fetchAllCollections(): Promise<PlayerCollection[] | null> {
    console.log('[API] Fetching all collections...')
    const result = await apiFetch<PlayerCollection[]>('/collections')
    
    if (result) {
      console.log('[API] All collections fetched:', result)
    }
    
    return result
  }

  /**
   * Health check endpoint
   */
  async function healthCheck(): Promise<boolean> {
    console.log('[API] Health check...')
    const result = await apiFetch<{ status: string }>('/health')
    
    const isHealthy = result?.status === 'ok' || !!result
    console.log(`[API] Health check result: ${isHealthy ? '✓ OK' : '✗ FAILED'}`)
    
    return isHealthy
  }

  /**
   * Test the API connection and log available data
   * Useful for development and debugging
   */
  async function testConnection(): Promise<void> {
    console.group('🔌 [API] Testing connection to:', apiUrl)
    
    // Test health first
    const healthy = await healthCheck()
    
    if (!healthy) {
      console.warn('[API] Health check failed, API might not be available')
      console.groupEnd()
      return
    }

    // Try fetching catalogue
    console.log('[API] Attempting to fetch catalogue...')
    const catalogue = await fetchCatalogue()
    
    if (catalogue) {
      console.log(`[API] ✓ Catalogue available with ${catalogue.totalCards || catalogue.cards?.length || 0} cards`)
    } else {
      console.log('[API] ✗ Catalogue not available or endpoint different')
    }

    // Try fetching a test collection
    console.log('[API] Attempting to fetch test collection...')
    const collection = await fetchPlayerCollection('test')
    
    if (collection) {
      console.log(`[API] ✓ Collection endpoint working`)
    } else {
      console.log('[API] ✗ Collection not available (this might be expected)')
    }

    console.groupEnd()
  }

  /**
   * Get the raw API response for any endpoint (for debugging)
   */
  async function fetchRaw<T = any>(endpoint: string): Promise<T | null> {
    console.log(`[API] Raw fetch: ${endpoint}`)
    return await apiFetch<T>(endpoint)
  }

  return {
    // State
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    apiUrl,

    // Methods
    fetchCatalogue,
    fetchPlayerCollection,
    fetchAllCollections,
    healthCheck,
    testConnection,
    fetchRaw,
  }
}
