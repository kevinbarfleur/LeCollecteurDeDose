import type { ApiResponse, PlayerCollection, CatalogueResponse, ApiError } from '~/types/api'
import { logApiResponse, logApiError } from '~/utils/apiLogger'

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
      const method = (options.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'GET'
      const response = await $fetch(url, {
        method,
        body: options.body ? JSON.parse(options.body as string) : undefined,
      })

      const result = response as T
      
      // Log API response for documentation (temporary)
      // Use the original endpoint (with /api/ prefix) for clarity
      const docEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint}`
      logApiResponse(docEndpoint, method, result, 200)
      
      return result
    } catch (err: any) {
      // Log API error for documentation (temporary)
      const method = (options.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'GET'
      const docEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint}`
      logApiError(docEndpoint, method, err)
      
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
    const result = await apiFetch<Record<string, any>>('userCollection')
    return result
  }

  /**
   * Fetch a specific user's collection
   * Uses fetchUserCollections and extracts the user's data to handle case-insensitive matching
   * Endpoint: GET /api/userCollection (then extract user data)
   */
  async function fetchUserCollection(user: string): Promise<Record<string, any> | null> {
    // Fetch all collections and extract the user's data
    // This handles case-insensitive matching since the bot server lowercases usernames
    const allCollections = await fetchUserCollections()
    
    if (!allCollections) return null
    
    // Try to find the user's data (case-insensitive)
    const userLower = user.toLowerCase()
    const userKey = Object.keys(allCollections).find(
      key => key.toLowerCase() === userLower
    )
    
    if (userKey) {
      const userData = allCollections[userKey]
      // Log the extracted user data for documentation
      logApiResponse(`userCollection/${user}`, 'GET', userData)
      return userData
    }
    
    return null
  }

  /**
   * Fetch a specific user's cards (booster history)
   * Endpoint: GET /api/usercards/:user
   */
  async function fetchUserCards(user: string): Promise<any[] | null> {
    const result = await apiFetch<any[]>(`usercards/${user}`)
    return result
  }

  /**
   * Fetch all unique cards (catalogue)
   * Endpoint: GET /api/uniques
   */
  async function fetchUniques(): Promise<any[] | null> {
    const result = await apiFetch<any[]>('uniques')
    return result
  }

  /**
   * Fetch the global card catalogue from uniques endpoint
   */
  async function fetchCatalogue(): Promise<CatalogueResponse | null> {
    const uniques = await fetchUniques()
    
    if (!uniques) return null
    
    return {
      cards: uniques,
      totalCards: uniques.length,
    }
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
    // Try the user collection endpoint as a health check
    const result = await apiFetch<any>('userCollection')
    return result !== null
  }

  /**
   * Test the API connection and log available data
   * Useful for development and debugging
   */
  async function testConnection(): Promise<void> {
    // Try fetching user collections
    const collections = await fetchUserCollections()
    
    if (collections) {
      const userCount = Object.keys(collections).length
      console.log(`[API Test] ✓ User collections available with ${userCount} users`)
    } else {
      console.log('[API Test] ✗ Could not fetch user collections')
    }
  }

  /**
   * Get the raw API response for any endpoint (for debugging)
   */
  async function fetchRaw<T = any>(endpoint: string): Promise<T | null> {
    return await apiFetch<T>(endpoint)
  }

  return {
    // State
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    apiUrl: externalApiUrl, // Expose external URL for debugging

    // Methods - Read operations
    fetchUserCollections,
    fetchUserCollection,
    fetchUserCards,
    fetchUniques,
    fetchCatalogue,
    healthCheck,
    testConnection,
    fetchRaw,

    // Methods - Write operations (require auth)
    updatePlayerCollection,
  }
}
