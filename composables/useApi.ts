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
    const result = await apiFetch<Record<string, any>>('userCollection')
    
    if (result) {
      console.log('[API] User collections fetched:', result)
    }
    
    return result
  }

  /**
   * Fetch a specific user's collection
   * Uses fetchUserCollections and extracts the user's data to handle case-insensitive matching
   * Endpoint: GET /api/userCollection (then extract user data)
   */
  async function fetchUserCollection(user: string): Promise<Record<string, any> | null> {
    console.log(`[API] Fetching collection for user: ${user}`)
    
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
      console.log(`[API] User collection fetched for ${user}:`, userData)
      return userData
    }
    
    console.log(`[API] User ${user} not found in collections`)
    return null
  }

  /**
   * Fetch a specific user's cards (booster history)
   * Endpoint: GET /api/usercards/:user
   */
  async function fetchUserCards(user: string): Promise<any[] | null> {
    console.log(`[API] Fetching cards for user: ${user}`)
    const result = await apiFetch<any[]>(`usercards/${user}`)
    
    if (result) {
      console.log(`[API] User cards fetched for ${user}:`, result)
    }
    
    return result
  }

  /**
   * Fetch all unique cards (catalogue)
   * Endpoint: GET /api/uniques
   */
  async function fetchUniques(): Promise<any[] | null> {
    console.log('[API] Fetching uniques...')
    const result = await apiFetch<any[]>('uniques')
    
    if (result) {
      console.log('[API] Uniques fetched:', result)
    }
    
    return result
  }

  /**
   * Fetch the global card catalogue from uniques endpoint
   */
  async function fetchCatalogue(): Promise<CatalogueResponse | null> {
    console.log('[API] Fetching catalogue...')
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
    const result = await apiFetch<any>('userCollection')
    
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
    console.log('[API] Fetching user collections from userCollection...')
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
