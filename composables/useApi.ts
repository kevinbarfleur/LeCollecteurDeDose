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
  const { isTestMode, isLocalhost } = useDevTestMode()
  
  // Determine which API to use
  // In test mode (localhost only), use Supabase Edge Function
  // Otherwise, use the real API via local proxy
  const supabaseUrl = config.public.supabase?.url || ''
  const useTestApi = isLocalhost.value && isTestMode.value
  
  // Use local proxy to avoid CORS issues
  // External API: /api/userCollection -> Local proxy: /api/data/userCollection
  // Test API: Supabase Edge Function -> /functions/v1/dev-test-api/api/...
  const apiUrl = useTestApi 
    ? `${supabaseUrl}/functions/v1/dev-test-api`
    : '/api/data'

  // State
  const isLoading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Generic fetch wrapper with error handling
   * Uses the local server proxy to avoid CORS issues (or Supabase Edge Function in test mode)
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

    // For test mode, use the full path with /api prefix
    // For real mode, remove /api/ prefix since our proxy adds it
    const cleanEndpoint = useTestApi
      ? endpoint.startsWith('/api') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`
      : endpoint.replace(/^\/api\//, '').replace(/^\//, '')
    
    const url = `${apiUrl}${cleanEndpoint}`

    try {
      const method = (options.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'GET'
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // For test mode, add Supabase anon key for authentication
      if (useTestApi) {
        const supabaseKey = config.public.supabase?.key || ''
        if (supabaseKey) {
          headers['Authorization'] = `Bearer ${supabaseKey}`
        }
      }
      
      const response = await $fetch(url, {
        method,
        headers,
        body: options.body ? JSON.parse(options.body as string) : undefined,
      })

      return response as T
    } catch (err: any) {
      
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
    
    // Prefer lowercase key if it exists (this is what we use for updates)
    // This ensures we read the same entry we write to
    if (allCollections[userLower]) {
      return allCollections[userLower]
    }
    
    // Fallback to case-insensitive search
    const userKey = Object.keys(allCollections).find(
      key => key.toLowerCase() === userLower
    )
    
    if (userKey) {
      console.warn(`[API] Found user collection with non-lowercase key: "${userKey}" (expected "${userLower}"). Server may have duplicate entries.`)
      return allCollections[userKey]
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
   * Endpoint: POST /api/userCollection/update
   * Requires x-api-key header
   * 
   * Format: { "username": { "uid": {...}, "vaalOrbs": N } }
   * The server merges this with existing data
   */
  async function updateUserCollection(
    username: string,
    collectionData: Record<string, any>
  ): Promise<boolean> {
    // Lowercase username to match server behavior
    const userKey = username.toLowerCase()
    
    const payload = {
      [userKey]: collectionData
    }
    
    console.log('[API] Sending update payload:', {
      userKey,
      payload,
      vaalOrbs: collectionData.vaalOrbs,
      cardKeys: Object.keys(collectionData).filter(k => k !== 'vaalOrbs')
    })
    
    const result = await apiFetch<any>(
      'userCollection/update',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true // requiresAuth
    )
    
    console.log('[API] Update response:', result)
    if (result?.updated) {
      console.log('[API] Updated object keys:', Object.keys(result.updated))
      if (result.updated[userKey]) {
        const userData = result.updated[userKey]
        console.log('[API] Updated user data:', {
          vaalOrbs: userData.vaalOrbs,
          cardCount: Object.keys(userData).filter(k => k !== 'vaalOrbs').length,
          cardKeys: Object.keys(userData).filter(k => k !== 'vaalOrbs').slice(0, 5)
        })
      } else {
        console.warn('[API] ⚠️ User key not found in updated response:', userKey)
      }
    }
    
    return !!result
  }

  /**
   * Update a player's collection (legacy function, kept for compatibility)
   * @deprecated Use updateUserCollection instead
   */
  async function updatePlayerCollection(
    pseudo: string,
    data: { cards: any[]; vaalOrb?: number }
  ): Promise<boolean> {
    // Convert legacy format to new format
    const collectionData: Record<string, any> = {}
    if (data.vaalOrb !== undefined) {
      collectionData.vaalOrbs = data.vaalOrb
    }
    // Note: cards array is not used in the new format
    return await updateUserCollection(pseudo, collectionData)
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
    updateUserCollection,
    updatePlayerCollection, // Legacy, deprecated
  }
}
