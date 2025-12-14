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
  const { isTestData, dataSource } = useDataSource() // Get both isTestData and dataSource
  
  // Determine which API to use
  // In test mode, use Supabase Edge Function
  // Otherwise, use the real API via local proxy
  const supabaseUrl = config.public.supabase?.url || ''
  
  // Use local proxy to avoid CORS issues
  // External API: /api/userCollection -> Local proxy: /api/data/userCollection
  // Test API: Supabase Edge Function -> /functions/v1/dev-test-api/api/...
  const apiUrl = computed(() => {
    // Use dataSource directly to avoid reactivity issues with isTestData
    // dataSource is 'test' when localStorage says test, regardless of admin status
    const useTest = dataSource.value === 'test'
    return useTest
      ? `${supabaseUrl}/functions/v1/dev-test-api`
      : '/api/data'
  })

  // Log when API mode changes
  if (import.meta.client) {
    watch([isTestData, dataSource], ([isTest, source]) => {
      console.log('[API] Data source mode changed:', { 
        isTestData: isTest, 
        dataSource: source,
        apiUrl: apiUrl.value 
      })
    })
  }

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
    const currentApiUrl = apiUrl.value
    // Use dataSource directly to avoid reactivity timing issues
    // This ensures we use test API even if isTestData hasn't updated yet
    const useTestApi = dataSource.value === 'test'
    
    let cleanEndpoint: string
    if (useTestApi) {
      // Test mode: endpoint should be like "/api/userCollection"
      cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`
    } else {
      // Real mode: remove /api/ prefix, endpoint should be like "userCollection"
      cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '')
    }
    
    // Ensure proper URL construction with slash separator
    // apiUrl is either '/api/data' or 'https://.../functions/v1/dev-test-api'
    const url = currentApiUrl.endsWith('/') 
      ? `${currentApiUrl}${cleanEndpoint.replace(/^\//, '')}`
      : `${currentApiUrl}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`

    // Debug logging - ALWAYS log to debug
    if (import.meta.client) {
      console.log('[API] apiFetch called:', {
        endpoint,
        cleanEndpoint,
        currentApiUrl,
        finalUrl: url,
        useTestApi,
        isTestData: isTestData.value,
        dataSource: dataSource.value,
        urlStartsWithHttp: url.startsWith('http'),
        method: options.method || 'GET'
      })
    }

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
      
      // Use native fetch for absolute URLs (always), $fetch for relative URLs only
      // This avoids Nuxt URL resolution issues with absolute URLs
      let response: any
      if (url.startsWith('http')) {
        // Absolute URL - use native fetch to avoid Nuxt URL resolution issues
        console.log('[API] Using native fetch for absolute URL:', url)
        const bodyData = options.body 
          ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
          : undefined
        
        const fetchResponse = await fetch(url, {
          method,
          headers,
          body: bodyData,
        })
        
        console.log('[API] Fetch response:', {
          ok: fetchResponse.ok,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          headers: Object.fromEntries(fetchResponse.headers.entries())
        })
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text().catch(() => 'Unknown error')
          console.error('[API] Fetch failed:', {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            errorText
          })
          throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText} - ${errorText}`)
        }
        
        response = await fetchResponse.json()
        console.log('[API] Fetch response parsed:', {
          responseType: typeof response,
          responseKeys: response && typeof response === 'object' ? Object.keys(response).slice(0, 10) : [],
          responseIsArray: Array.isArray(response)
        })
      } else {
        // Relative URL - use $fetch (production mode)
        console.log('[API] Using $fetch for relative URL:', url)
        response = await $fetch(url, {
          method,
          headers,
          body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
        })
        console.log('[API] $fetch response:', {
          responseType: typeof response,
          responseKeys: response && typeof response === 'object' ? Object.keys(response).slice(0, 10) : [],
          responseIsArray: Array.isArray(response)
        })
      }

      console.log('[API] apiFetch returning:', {
        hasResponse: !!response,
        responseType: typeof response
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
    console.log('[API] fetchUserCollections called')
    const result = await apiFetch<Record<string, any>>('userCollection')
    console.log('[API] fetchUserCollections result:', {
      hasResult: !!result,
      resultType: typeof result,
      resultKeys: result ? Object.keys(result).slice(0, 5) : [],
      resultCount: result ? Object.keys(result).length : 0
    })
    return result
  }

  /**
   * Fetch a specific user's collection
   * Uses fetchUserCollections and extracts the user's data to handle case-insensitive matching
   * Endpoint: GET /api/userCollection (then extract user data)
   */
  async function fetchUserCollection(user: string): Promise<Record<string, any> | null> {
    console.log('[API] fetchUserCollection called for user:', user)
    
    // Fetch all collections and extract the user's data
    // This handles case-insensitive matching since the bot server lowercases usernames
    const allCollections = await fetchUserCollections()
    
    console.log('[API] fetchUserCollection - allCollections:', {
      hasAllCollections: !!allCollections,
      allCollectionsType: typeof allCollections,
      allCollectionsKeys: allCollections ? Object.keys(allCollections).slice(0, 10) : [],
      allCollectionsCount: allCollections ? Object.keys(allCollections).length : 0
    })
    
    if (!allCollections) {
      console.log('[API] fetchUserCollection - No collections found, returning null')
      return null
    }
    
    // Try to find the user's data (case-insensitive)
    const userLower = user.toLowerCase()
    console.log('[API] fetchUserCollection - Looking for user:', {
      originalUser: user,
      userLower,
      hasExactMatch: !!allCollections[userLower]
    })
    
    // Prefer lowercase key if it exists (this is what we use for updates)
    // This ensures we read the same entry we write to
    if (allCollections[userLower]) {
      const result = allCollections[userLower]
      console.log('[API] fetchUserCollection - Found exact match:', {
        key: userLower,
        hasData: !!result,
        dataKeys: result ? Object.keys(result).slice(0, 10) : [],
        dataCount: result ? Object.keys(result).length : 0
      })
      return result
    }
    
    // Fallback to case-insensitive search
    const userKey = Object.keys(allCollections).find(
      key => key.toLowerCase() === userLower
    )
    
    console.log('[API] fetchUserCollection - Case-insensitive search:', {
      foundKey: userKey || null,
      searchedKeys: Object.keys(allCollections).slice(0, 10)
    })
    
    if (userKey) {
      const result = allCollections[userKey]
      console.log('[API] fetchUserCollection - Found case-insensitive match:', {
        key: userKey,
        hasData: !!result,
        dataKeys: result ? Object.keys(result).slice(0, 10) : [],
        dataCount: result ? Object.keys(result).length : 0
      })
      return result
    }
    
    console.log('[API] fetchUserCollection - No match found, returning null')
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
    
    const result = await apiFetch<any>(
      'userCollection/update',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true // requiresAuth
    )
    
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
    await fetchUserCollections()
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
