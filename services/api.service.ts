/**
 * API Service
 * 
 * Handles all external API calls (Data API and Supabase Edge Functions)
 * This service is stateless and uses stores for configuration
 */

import type { ApiError } from '~/types/api'

export interface ApiServiceConfig {
  apiUrl: string
  isTestMode: boolean
  supabaseKey?: string
}

/**
 * Generic fetch wrapper for API calls
 */
async function apiFetch<T>(
  endpoint: string,
  config: ApiServiceConfig,
  options: RequestInit = {}
): Promise<T | null> {
  const { apiUrl, isTestMode, supabaseKey } = config

  // For test mode, use the full path with /api prefix
  // For real mode, remove /api/ prefix since our proxy adds it
  let cleanEndpoint: string
  if (isTestMode) {
    // Test mode: endpoint should be like "/api/userCollection"
    cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`
  } else {
    // Real mode: remove /api/ prefix, endpoint should be like "userCollection"
    cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '')
  }

  // Ensure proper URL construction with slash separator
  const url = apiUrl.endsWith('/')
    ? `${apiUrl}${cleanEndpoint.replace(/^\//, '')}`
    : `${apiUrl}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`

  try {
    const method = (options.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'GET'

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // For test mode, add Supabase anon key for authentication
    if (isTestMode && supabaseKey) {
      headers['Authorization'] = `Bearer ${supabaseKey}`
    }

    // Use native fetch for absolute URLs (always), $fetch for relative URLs only
    let response: any
    if (url.startsWith('http')) {
      // Absolute URL - use native fetch to avoid Nuxt URL resolution issues
      const bodyData = options.body
        ? typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
        : undefined

      const fetchResponse = await fetch(url, {
        method,
        headers,
        body: bodyData,
      })

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text().catch(() => 'Unknown error')
        throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText} - ${errorText}`)
      }

      response = await fetchResponse.json()
    } else {
      // Relative URL - use $fetch (production mode)
      response = await $fetch(url, {
        method,
        headers,
        body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
      })
    }

    return response as T
  } catch (err: any) {
    console.error('[ApiService] API call failed:', {
      endpoint,
      url,
      error: err.message,
      status: err.status || err.statusCode
    })
    throw err
  }
}

/**
 * Fetch all user collections from the Data API
 */
export async function fetchUserCollections(config: ApiServiceConfig): Promise<Record<string, any> | null> {
  try {
    return await apiFetch<Record<string, any>>('userCollection', config)
  } catch (error) {
    console.error('[ApiService] Failed to fetch user collections:', error)
    return null
  }
}

/**
 * Fetch a specific user's collection
 * Uses fetchUserCollections and extracts the user's data to handle case-insensitive matching
 */
export async function fetchUserCollection(
  user: string,
  config: ApiServiceConfig
): Promise<Record<string, any> | null> {
  const allCollections = await fetchUserCollections(config)

  if (!allCollections) return null

  // Try to find the user's data (case-insensitive)
  const userLower = user.toLowerCase()

  // Prefer lowercase key if it exists (this is what we use for updates)
  if (allCollections[userLower]) {
    return allCollections[userLower]
  }

  // Fallback to case-insensitive search
  const userKey = Object.keys(allCollections).find(
    key => key.toLowerCase() === userLower
  )

  if (userKey) {
    return allCollections[userKey]
  }

  return null
}

/**
 * Fetch a specific user's cards (booster history)
 */
export async function fetchUserCards(
  user: string,
  config: ApiServiceConfig
): Promise<any[] | null> {
  try {
    return await apiFetch<any[]>(`usercards/${user}`, config)
  } catch (error) {
    console.error('[ApiService] Failed to fetch user cards:', error)
    return null
  }
}

/**
 * Fetch all unique cards (catalogue)
 */
export async function fetchUniques(config: ApiServiceConfig): Promise<any[] | null> {
  try {
    return await apiFetch<any[]>('uniques', config)
  } catch (error) {
    console.error('[ApiService] Failed to fetch uniques:', error)
    return null
  }
}

/**
 * Update a player's collection
 * Requires x-api-key header (handled by server proxy in production)
 */
export async function updateUserCollection(
  username: string,
  collectionData: Record<string, any>,
  config: ApiServiceConfig
): Promise<boolean> {
  // Lowercase username to match server behavior
  const userKey = username.toLowerCase()

  const payload = {
    [userKey]: collectionData
  }

  try {
    const result = await apiFetch<any>(
      'userCollection/update',
      config,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    return !!result
  } catch (error) {
    console.error('[ApiService] Failed to update user collection:', error)
    return false
  }
}

