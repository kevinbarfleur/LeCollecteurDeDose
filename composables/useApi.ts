import type { ApiResponse, PlayerCollection, CatalogueResponse, ApiError } from '~/types/api'

/**
 * Composable for interacting with Le Collecteur de Dose Data API
 * 
 * Provides methods to fetch:
 * - User collections
 * - Global card catalogue (future)
 * 
 * Note: Write operations require the x-api-key header
 */
export function useApi() {
  const config = useRuntimeConfig()
  const externalApiUrl = config.public.dataApiUrl as string
  
  // Use local proxy to avoid CORS issues
  // External API: /api/userCollection -> Local proxy: /api/data/userCollection
  const apiUrl = '/api/data'

  // State
  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Generic fetch wrapper with error handling
   * Uses the local server proxy to avoid CORS issues
   * 
   * @param endpoint - API endpoint (e.g., '/api/userCollection' or 'userCollection')
   * @param options - Fetch options
   * @param requiresAuth - If true, the server proxy will include x-api-key header
   */
  async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<T | null> {
    isLoading.value = true
    error.value = null

    // Remove /api/ prefix if present since our proxy adds it
    const cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '')
    const url = `${apiUrl}/${cleanEndpoint}`

    try {
      const response = await $fetch(url, {
        method: (options.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'GET',
        body: options.body ? JSON.parse(options.body as string) : undefined,
      })

      return response as T
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
   * Fetch all user collections from the Data API
   * Endpoint: GET /api/userCollection
   */
  async function fetchUserCollections(): Promise<Record<string, any> | null> {
    console.log('[API] Fetching user collections...')
    const result = await apiFetch<Record<string, any>>('/api/userCollection')
    
    if (result) {
      console.log('[API] User collections fetched:', result)
    }
    
    return result
  }

  /**
   * Fetch the global card catalogue (future endpoint)
   */
  async function fetchCatalogue(): Promise<CatalogueResponse | null> {
    console.log('[API] Fetching catalogue...')
    const result = await apiFetch<CatalogueResponse>('/api/catalogue')
    
    if (result) {
      console.log('[API] Catalogue fetched:', result)
    }
    
    return result
  }

  /**
   * Update a player's collection
   * Endpoint: POST /api/collection/update
   * Requires x-api-key header
   * 
   * Note: This should be called from a server route for security
   */
  async function updatePlayerCollection(
    pseudo: string,
    data: { cards: any[]; vaalOrb?: number }
  ): Promise<boolean> {
    console.log(`[API] Updating collection for: ${pseudo}`)
    
    const result = await apiFetch<any>(
      '/api/collection/update',
      {
        method: 'POST',
        body: JSON.stringify({
          [pseudo]: data
        }),
      },
      true // requiresAuth
    )
    
    return !!result
  }

  /**
   * Health check - try to reach the API
   */
  async function healthCheck(): Promise<boolean> {
    console.log('[API] Health check...')
    
    // Try the user collection endpoint as a health check
    const result = await apiFetch<any>('/api/userCollection')
    
    const isHealthy = result !== null
    console.log(`[API] Health check result: ${isHealthy ? '✓ OK' : '✗ FAILED'}`)
    
    return isHealthy
  }

  /**
   * Test the API connection and log available data
   * Useful for development and debugging
   */
  async function testConnection(): Promise<void> {
    console.group('🔌 [API] Testing connection to:', apiUrl)
    
    // Try fetching user collections
    console.log('[API] Fetching user collections from /api/userCollection...')
    const collections = await fetchUserCollections()
    
    if (collections) {
      const userCount = Object.keys(collections).length
      console.log(`[API] ✓ User collections available with ${userCount} users`)
      
      // Log structure for debugging
      console.log('[API] Data structure:', collections)
    } else {
      console.log('[API] ✗ Could not fetch user collections')
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
    apiUrl: externalApiUrl, // Expose external URL for debugging

    // Methods - Read operations
    fetchUserCollections,
    fetchCatalogue,
    healthCheck,
    testConnection,
    fetchRaw,

    // Methods - Write operations (require auth)
    updatePlayerCollection,
  }
}
