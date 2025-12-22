/**
 * Supabase Mock Service
 * 
 * Mock implementation of Supabase collection service for local development
 * Simulates the Supabase database structure and RPC functions
 */

import { logError } from './logger.service'
import { allCards, mockUserCollection } from '~/data/mockCards'
import type { Card } from '~/types/card'

// Mock data structures
interface MockUser {
  id: string
  twitch_username: string
  vaal_orbs: number
}

interface MockCollection {
  user_id: string
  card_uid: number
  quantity: number
  normal_count: number
  foil_count: number
}

interface MockBooster {
  id: string
  user_id: string
  opened_at: string
  booster_type: string
  cards: Array<{
    position: number
    is_foil: boolean
    card: Card
  }>
}

// In-memory storage
const mockUsers = new Map<string, MockUser>()
const mockCollections = new Map<string, MockCollection[]>() // key: user_id
const mockBoosters = new Map<string, MockBooster[]>() // key: user_id

// Initialize mock data from mockUserCollection
function initializeMockData() {
  // Create a default mock user
  const defaultUsername = 'testuser'
  const defaultUserId = 'mock-user-1'
  
  if (!mockUsers.has(defaultUserId)) {
    mockUsers.set(defaultUserId, {
      id: defaultUserId,
      twitch_username: defaultUsername,
      vaal_orbs: 14
    })
    
    // Convert mockUserCollection to mock collections format
    const collections: MockCollection[] = []
    const cardMap = new Map<number, { normal: number; foil: number }>()
    
    // Group cards by uid and count normal/foil
    for (const card of mockUserCollection) {
      if (!card.uid) continue
      
      const existing = cardMap.get(card.uid) || { normal: 0, foil: 0 }
      if (card.foil) {
        existing.foil++
      } else {
        existing.normal++
      }
      cardMap.set(card.uid, existing)
    }
    
    // Create collection entries
    for (const [uid, counts] of cardMap.entries()) {
      collections.push({
        user_id: defaultUserId,
        card_uid: uid,
        quantity: counts.normal + counts.foil,
        normal_count: counts.normal,
        foil_count: counts.foil
      })
    }
    
    mockCollections.set(defaultUserId, collections)
  }
}

// Initialize on module load
initializeMockData()

/**
 * Mock RPC: get_or_create_user
 */
function getOrCreateUser(twitchUsername: string): string {
  const usernameLower = twitchUsername.toLowerCase()
  
  // Find existing user
  for (const [userId, user] of mockUsers.entries()) {
    if (user.twitch_username.toLowerCase() === usernameLower) {
      return userId
    }
  }
  
  // Create new user
  const newUserId = `mock-user-${mockUsers.size + 1}`
  mockUsers.set(newUserId, {
    id: newUserId,
    twitch_username: twitchUsername,
    vaal_orbs: 1
  })
  mockCollections.set(newUserId, [])
  mockBoosters.set(newUserId, [])
  
  return newUserId
}

/**
 * Mock RPC: add_card_to_collection
 */
function addCardToCollection(userId: string, cardUid: number, isFoil: boolean): void {
  const collections = mockCollections.get(userId) || []
  
  // Find existing collection entry
  const existingIndex = collections.findIndex(c => c.card_uid === cardUid)
  
  if (existingIndex >= 0) {
    // Update existing
    const existing = collections[existingIndex]
    existing.quantity++
    if (isFoil) {
      existing.foil_count++
    } else {
      existing.normal_count++
    }
  } else {
    // Create new entry
    collections.push({
      user_id: userId,
      card_uid: cardUid,
      quantity: 1,
      normal_count: isFoil ? 0 : 1,
      foil_count: isFoil ? 1 : 0
    })
  }
  
  mockCollections.set(userId, collections)
}

/**
 * Mock RPC: update_vaal_orbs
 */
function updateVaalOrbs(userId: string, amount: number): void {
  const user = mockUsers.get(userId)
  if (user) {
    user.vaal_orbs = Math.max(0, user.vaal_orbs + amount)
  }
}

/**
 * Get all user collections
 * Returns format compatible with existing API: { [username]: { [cardUid]: cardData, vaalOrbs: number } }
 */
export async function getAllUserCollections(): Promise<Record<string, any>> {
  try {
    const result: Record<string, any> = {}
    
    for (const [userId, user] of mockUsers.entries()) {
      const username = user.twitch_username
      result[username] = { vaalOrbs: user.vaal_orbs ?? 0 }
      
      const collections = mockCollections.get(userId) || []
      
      for (const col of collections) {
        // Find card in allCards by uid
        const card = allCards.find(c => c.uid === col.card_uid)
        if (!card) continue
        
        result[username][col.card_uid] = {
          uid: col.card_uid,
          id: card.id,
          name: card.name,
          itemClass: card.itemClass,
          rarity: card.rarity,
          tier: card.tier,
          flavourText: card.flavourText,
          wikiUrl: card.wikiUrl,
          gameData: card.gameData,
          relevanceScore: card.relevanceScore,
          quantity: col.quantity,
          normal: col.normal_count,
          foil: col.foil_count
        }
      }
    }
    
    return result
  } catch (error) {
    logError('Error fetching all user collections', error, { service: 'SupabaseMock' })
    return {}
  }
}

/**
 * Get a specific user's collection
 * Returns format compatible with existing API: { [cardUid]: cardData, vaalOrbs: number }
 */
export async function getUserCollection(username: string): Promise<Record<string, any> | null> {
  try {
    const usernameLower = username.toLowerCase()
    
    // Find user
    let userId: string | null = null
    for (const [id, user] of mockUsers.entries()) {
      if (user.twitch_username.toLowerCase() === usernameLower) {
        userId = id
        break
      }
    }
    
    if (!userId) {
      return { vaalOrbs: 0 }
    }
    
    const user = mockUsers.get(userId)!
    const result: Record<string, any> = { vaalOrbs: user.vaal_orbs ?? 0 }
    
    const collections = mockCollections.get(userId) || []
    
    for (const col of collections) {
      const card = allCards.find(c => c.uid === col.card_uid)
      if (!card) continue
      
      result[col.card_uid] = {
        uid: col.card_uid,
        id: card.id,
        name: card.name,
        itemClass: card.itemClass,
        rarity: card.rarity,
        tier: card.tier,
        flavourText: card.flavourText,
        wikiUrl: card.wikiUrl,
        gameData: card.gameData,
        relevanceScore: card.relevanceScore,
        quantity: col.quantity,
        normal: col.normal_count,
        foil: col.foil_count
      }
    }
    
    return result
  } catch (error) {
    logError('Error fetching user collection', error, { service: 'SupabaseMock', username })
    return null
  }
}

/**
 * Get a specific user's booster history
 * Returns format compatible with existing API: Array<{ booster: true, timestamp: string, content: Card[] }>
 */
export async function getUserCards(username: string): Promise<any[] | null> {
  try {
    const usernameLower = username.toLowerCase()
    
    // Find user
    let userId: string | null = null
    for (const [id, user] of mockUsers.entries()) {
      if (user.twitch_username.toLowerCase() === usernameLower) {
        userId = id
        break
      }
    }
    
    if (!userId) {
      return []
    }
    
    const boosters = mockBoosters.get(userId) || []
    
    const result = boosters.map(booster => {
      const cards = booster.cards
        .sort((a, b) => a.position - b.position)
        .map(bc => ({
          uid: bc.card.uid,
          id: bc.card.id,
          name: bc.card.name,
          itemClass: bc.card.itemClass,
          rarity: bc.card.rarity,
          tier: bc.card.tier,
          flavourText: bc.card.flavourText,
          wikiUrl: bc.card.wikiUrl,
          gameData: bc.card.gameData,
          relevanceScore: bc.card.relevanceScore,
          foil: bc.is_foil
        }))
      
      return {
        booster: true,
        timestamp: booster.opened_at,
        content: cards
      }
    })
    
    return result
  } catch (error) {
    logError('Error fetching user cards', error, { service: 'SupabaseMock', username })
    return null
  }
}

/**
 * Get all unique cards (catalogue)
 * Returns format compatible with existing API: Array<Card>
 */
export async function getAllUniqueCards(): Promise<any[] | null> {
  try {
    const result = allCards.map(card => ({
      uid: card.uid,
      id: card.id,
      name: card.name,
      itemClass: card.itemClass,
      rarity: card.rarity,
      tier: card.tier,
      flavourText: card.flavourText,
      wikiUrl: card.wikiUrl,
      gameData: card.gameData,
      relevanceScore: card.relevanceScore
    }))
    
    return result
  } catch (error) {
    logError('Error fetching unique cards', error, { service: 'SupabaseMock' })
    return null
  }
}

/**
 * Update a user's collection
 * Accepts format: { [cardUid]: cardData, vaalOrbs: number }
 */
export async function updateUserCollection(
  username: string,
  collectionData: Record<string, any>
): Promise<boolean> {
  try {
    const userId = getOrCreateUser(username)
    
    // Update vaal orbs if provided
    if (collectionData.vaalOrbs !== undefined) {
      const user = mockUsers.get(userId)
      if (user) {
        user.vaal_orbs = collectionData.vaalOrbs
      }
    }
    
    // Update collections
    const collections: MockCollection[] = []
    
    for (const [key, value] of Object.entries(collectionData)) {
      if (key === 'vaalOrbs') continue
      
      const cardUid = parseInt(key)
      if (isNaN(cardUid)) continue
      
      const card = value as any
      const normalCount = card.normal || 0
      const foilCount = card.foil || 0
      
      collections.push({
        user_id: userId,
        card_uid: cardUid,
        quantity: card.quantity || (normalCount + foilCount),
        normal_count: normalCount,
        foil_count: foilCount
      })
    }
    
    mockCollections.set(userId, collections)
    
    return true
  } catch (error) {
    logError('Error updating user collection', error, { service: 'SupabaseMock', username })
    return false
  }
}

/**
 * Reset all mock data to empty state
 */
export function resetMockData(): void {
  mockUsers.clear()
  mockCollections.clear()
  mockBoosters.clear()
  console.log('[MockService] All mock data cleared')
}

/**
 * Initialize mock data from a Supabase collection snapshot
 * This copies the user's real data into the mock service for safe testing
 */
export function initializeMockFromSupabase(
  username: string,
  collectionData: Record<string, any>,
  vaalOrbs: number = 0
): void {
  // Reset existing mock data first
  resetMockData()

  // Create mock user
  const userId = `mock-${username.toLowerCase()}`
  mockUsers.set(userId, {
    id: userId,
    twitch_username: username,
    vaal_orbs: vaalOrbs
  })

  // Convert collection data to mock format
  const collections: MockCollection[] = []

  for (const [key, cardData] of Object.entries(collectionData)) {
    // Skip non-card entries like 'vaalOrbs'
    if (key === 'vaalOrbs' || typeof cardData !== 'object' || !cardData) continue

    const cardUid = parseInt(key)
    if (isNaN(cardUid)) continue

    const normalCount = cardData.normal || 0
    const foilCount = cardData.foil || 0
    const synthesisedCount = cardData.synthesised || 0

    // Only add if there's at least one copy
    if (normalCount > 0 || foilCount > 0 || synthesisedCount > 0) {
      collections.push({
        user_id: userId,
        card_uid: cardUid,
        quantity: normalCount + foilCount + synthesisedCount,
        normal_count: normalCount,
        foil_count: foilCount
      })
    }
  }

  mockCollections.set(userId, collections)
  mockBoosters.set(userId, [])

  console.log(`[MockService] Initialized mock data for ${username}:`, {
    vaalOrbs,
    cardCount: collections.length,
    totalCards: collections.reduce((sum, c) => sum + c.quantity, 0)
  })
}

/**
 * Check if mock data is initialized for a user
 */
export function isMockInitialized(username: string): boolean {
  const userId = `mock-${username.toLowerCase()}`
  return mockUsers.has(userId)
}

// Export mock RPC functions for internal use
export const mockRpc = {
  getOrCreateUser,
  addCardToCollection,
  updateVaalOrbs
}
