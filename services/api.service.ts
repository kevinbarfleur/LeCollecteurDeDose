/**
 * API Service
 * 
 * Wrapper around Supabase collection service
 * Provides a consistent API interface for the application
 */

import { logError } from './logger.service'
import * as SupabaseCollectionService from './supabase-collection.service'

export interface ApiServiceConfig {
  // Kept for backward compatibility, but not used anymore
  apiUrl?: string | null
  isTestMode?: boolean
  isSupabaseMode?: boolean
  supabaseKey?: string
}

/**
 * Fetch all user collections from Supabase
 */
export async function fetchUserCollections(config: ApiServiceConfig = {}): Promise<Record<string, any> | null> {
  try {
    const result = await SupabaseCollectionService.getAllUserCollections()
    return result
  } catch (error) {
    logError('Failed to fetch user collections', error, { service: 'API', action: 'fetchUserCollections' })
    return null
  }
}

/**
 * Fetch a specific user's collection
 */
export async function fetchUserCollection(
  user: string,
  config: ApiServiceConfig = {}
): Promise<Record<string, any> | null> {
  const result = await SupabaseCollectionService.getUserCollection(user)
  return result
}

/**
 * Fetch a specific user's cards (booster history)
 */
export async function fetchUserCards(
  user: string,
  config: ApiServiceConfig = {}
): Promise<any[] | null> {
  try {
    const result = await SupabaseCollectionService.getUserCards(user)
    return result
  } catch (error) {
    logError('Failed to fetch user cards', error, { service: 'ApiService' })
    return null
  }
}

/**
 * Fetch all unique cards (catalogue)
 */
export async function fetchUniques(config: ApiServiceConfig = {}): Promise<any[] | null> {
  try {
    const result = await SupabaseCollectionService.getAllUniqueCards()
    return result
  } catch (error) {
    logError('Failed to fetch uniques', error, { service: 'ApiService' })
    return null
  }
}

/**
 * Update a player's collection
 */
export async function updateUserCollection(
  username: string,
  collectionData: Record<string, any>,
  config: ApiServiceConfig = {}
): Promise<boolean> {
  const result = await SupabaseCollectionService.updateUserCollection(username, collectionData)
  return result
}

