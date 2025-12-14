/**
 * API Service
 * 
 * Handles all external API calls (Data API and Supabase Edge Functions)
 * This service is stateless and uses stores for configuration
 */

import type { ApiError } from '~/types/api'
import { logInfo, logError } from './logger.service'

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
    logInfo('API call', { service: 'API', action: 'apiFetch', method, endpoint, isTestMode })

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // For test mode, add Supabase anon key for authentication
    if (isTestMode) {
      if (!supabaseKey) {
        logError('Missing Supabase key for test mode', undefined, { service: 'API', action: 'apiFetch', endpoint, isTestMode })
        throw new Error('Missing Supabase key for test mode API calls')
      }
      headers['Authorization'] = `Bearer ${supabaseKey}`
      logInfo('Added auth header', { service: 'API', action: 'apiFetch', endpoint, hasKey: !!supabaseKey })
    }

    // Always use native fetch to ensure consistent behavior
    // For relative URLs, construct full URL using window.location.origin in browser
    let finalUrl = url
    if (!url.startsWith('http') && typeof window !== 'undefined') {
      // Relative URL in browser - construct full URL
      finalUrl = `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
    }

    const bodyData = options.body
      ? typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      : undefined

    const fetchResponse = await fetch(finalUrl, {
      method,
      headers,
      body: bodyData,
    })

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text().catch(() => 'Unknown error')
      logError('API call failed', undefined, { service: 'API', action: 'apiFetch', endpoint, finalUrl, status: fetchResponse.status })
      const error = new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText} - ${errorText}`) as any
      error.status = fetchResponse.status
      error.statusCode = fetchResponse.status
      throw error
    }

    const response = await fetchResponse.json()

    logInfo('API call succeeded', { service: 'API', action: 'apiFetch', endpoint, finalUrl, method })
    return response as T
  } catch (err: any) {
    // Enhance error with status if missing (common for network errors)
    if (!err.status && !err.statusCode) {
      // Network errors typically have status 0 or no status
      err.status = 0
      err.statusCode = 0
    }
    logError('API call failed', err, { service: 'API', action: 'apiFetch', endpoint, status: err.status || err.statusCode, finalUrl })
    throw err
  }
}

/**
 * Fetch all user collections from the Data API
 */
export async function fetchUserCollections(config: ApiServiceConfig): Promise<Record<string, any> | null> {
  try {
    const result = await apiFetch<Record<string, any>>('userCollection', config)
    logInfo('User collections fetched', { service: 'API', action: 'fetchUserCollections', userCount: result ? Object.keys(result).length : 0 })
    return result
  } catch (error) {
    logError('Failed to fetch user collections', error, { service: 'API', action: 'fetchUserCollections' })
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
  logInfo('Fetching user collection', { service: 'API', action: 'fetchUserCollection', user })
  const allCollections = await fetchUserCollections(config)

  if (!allCollections) return null

  // Try to find the user's data (case-insensitive)
  const userLower = user.toLowerCase()

  // Prefer lowercase key if it exists (this is what we use for updates)
  if (allCollections[userLower]) {
    logInfo('User collection found', { service: 'API', action: 'fetchUserCollection', user, found: true })
    return allCollections[userLower]
  }

  // Fallback to case-insensitive search
  const userKey = Object.keys(allCollections).find(
    key => key.toLowerCase() === userLower
  )

  if (userKey) {
    logInfo('User collection found (case-insensitive)', { service: 'API', action: 'fetchUserCollection', user, found: true })
    return allCollections[userKey]
  }

  logInfo('User collection not found', { service: 'API', action: 'fetchUserCollection', user, found: false })
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
    logError('Failed to fetch user cards', error, { service: 'ApiService' })
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
    logError('Failed to fetch uniques', error, { service: 'ApiService' })
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
  const cardCount = Object.keys(collectionData).filter(k => k !== 'vaalOrbs').length
  logInfo('Updating user collection', { service: 'API', action: 'updateUserCollection', username, cardCount, vaalOrbs: collectionData.vaalOrbs })
  
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
    const success = !!result
    logInfo('User collection updated', { service: 'API', action: 'updateUserCollection', username, success })
    return success
  } catch (error) {
    logError('Failed to update user collection', error, { service: 'API', action: 'updateUserCollection', username })
    return false
  }
}

