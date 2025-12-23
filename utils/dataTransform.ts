/**
 * Utility functions to transform bot API data into Card format
 */

import type { Card } from '~/types/card'
import { allCards } from '~/data/mockCards'

/**
 * Transform a userCollection entry (from userCollection.json) into Card[]
 * 
 * userCollection structure:
 * {
 *   "HoloBird": {
 *     "23": { uid: 23, id: "...", name: "...", quantity: 1, foil: 0, normal: 1, ... },
 *     "35": { uid: 35, ... },
 *     "vaalOrbs": 16
 *   }
 * }
 * 
 * Note: The UIDs are stored as string keys in the JSON
 */
export function transformUserCollectionToCards(
  userCollection: Record<string, any>,
  username: string
): Card[] {
  // Try both lowercase and original case for username
  const userData = userCollection[username.toLowerCase()] || userCollection[username]
  if (!userData) return []

  const cards: Card[] = []
  
  // Iterate through all entries (excluding vaalOrbs)
  for (const [key, value] of Object.entries(userData)) {
    if (key === 'vaalOrbs') continue
    
    const cardData = value as any
    
    // Ensure we have a valid card with uid
    // The key might be the UID as a string, or cardData.uid might exist
    let cardUid = cardData.uid
    if (!cardUid) {
      // Try to parse the key as UID if cardData doesn't have uid
      const uidFromKey = parseInt(key, 10)
      if (!isNaN(uidFromKey)) {
        cardUid = uidFromKey
        cardData.uid = cardUid
      } else {
        continue // Skip invalid entries
      }
    }
    
    // Ensure uid is a number
    if (typeof cardUid === 'string') {
      cardUid = parseInt(cardUid, 10)
      cardData.uid = cardUid
    }
    
    // Try to find the base card from allCards to get complete data
    const baseCard = allCards.find(c => c.uid === cardUid)
    
    // Merge base card data with user's card data (user data takes precedence)
    // Remove quantity/normal/foil/synthesised from merged card as they're metadata, not card properties
    const { quantity, normal, foil, synthesised, ...cardProps } = cardData
    const mergedCard = baseCard
      ? { ...baseCard, ...cardProps }
      : cardProps

    // Ensure uid is set correctly
    mergedCard.uid = cardUid

    // Get counts (handle both number and string formats)
    const normalCount = typeof normal === 'number'
      ? normal
      : parseInt(String(normal || '0'), 10)
    const foilCount = typeof foil === 'number'
      ? foil
      : parseInt(String(foil || '0'), 10)
    const synthesisedCount = typeof synthesised === 'number'
      ? synthesised
      : parseInt(String(synthesised || '0'), 10)

    // Generate unique UIDs for duplicates by appending an index
    // Use a counter that increments per card instance
    let instanceCounter = 0

    // Add synthesised cards FIRST (rarest, most valuable)
    for (let i = 0; i < synthesisedCount; i++) {
      cards.push({
        ...mergedCard,
        uid: cardUid + (instanceCounter++ * 0.0001), // Add small decimal to make unique
        foil: true,
        synthesised: true,
      } as Card)
    }

    // Add foil cards second
    for (let i = 0; i < foilCount; i++) {
      cards.push({
        ...mergedCard,
        uid: cardUid + (instanceCounter++ * 0.0001), // Add small decimal to make unique
        foil: true,
        synthesised: false,
      } as Card)
    }

    // Add normal cards last
    for (let i = 0; i < normalCount; i++) {
      cards.push({
        ...mergedCard,
        uid: cardUid + (instanceCounter++ * 0.0001), // Add small decimal to make unique
        foil: false,
        synthesised: false,
      } as Card)
    }
  }
  
  return cards
}

/**
 * Transform userCards entries (from userCards.json) into Card[]
 * 
 * userCards structure:
 * {
 *   "username": [
 *     {
 *       "booster": true,
 *       "timestamp": "...",
 *       "content": [ ...cards ]
 *     }
 *   ]
 * }
 */
export function transformUserCardsToCards(
  userCards: Record<string, any[]>,
  username: string
): Card[] {
  // Try both lowercase and original case for username
  const userData = userCards[username.toLowerCase()] || userCards[username]
  if (!userData || !Array.isArray(userData)) return []

  const cards: Card[] = []
  
  // Flatten all booster content
  for (const entry of userData) {
    if (entry.booster && Array.isArray(entry.content)) {
      for (const cardData of entry.content) {
        // Ensure card has proper structure
        const baseCard = allCards.find(c => c.uid === cardData.uid) || cardData
        
        cards.push({
          ...baseCard,
          uid: cardData.uid || baseCard.uid,
          foil: cardData.foil === true,
        })
      }
    }
  }
  
  return cards
}

/**
 * Get all unique cards from uniques.json
 * This is already in the correct format, just ensure it's an array
 */
export function transformUniquesToCards(uniques: any[]): Card[] {
  if (!Array.isArray(uniques)) return []
  
  return uniques.map(card => ({
    ...card,
    foil: false, // Default to non-foil for catalogue
  }))
}

/**
 * Merge userCollection and userCards to get complete collection
 * userCollection has aggregated data, userCards has individual entries
 * We prefer userCollection as it's more accurate for quantities
 * 
 * @param userCollection - Either the full collection object { "HoloBird": {...}, ... } 
 *                        or a single user's collection { "23": {...}, "vaalOrbs": 16 }
 * @param userCards - Either the full userCards object { "HoloBird": [...], ... }
 *                   or a single user's cards array [...]
 * @param username - The username to extract data for
 */
export function mergeUserDataToCards(
  userCollection: Record<string, any> | any,
  userCards: Record<string, any[]> | any[] | null,
  username: string
): Card[] {
  // Check if userCollection is already a single user's data (has numeric keys or vaalOrbs)
  // vs the full collection (has username keys)
  let userCollectionData: Record<string, any>
  
  if (userCollection && typeof userCollection === 'object') {
    // Check if this looks like a single user's collection (has vaalOrbs or numeric keys)
    const hasVaalOrbs = 'vaalOrbs' in userCollection
    const hasNumericKeys = Object.keys(userCollection).some(key => 
      key !== 'vaalOrbs' && !isNaN(parseInt(key, 10))
    )
    
    if (hasVaalOrbs || hasNumericKeys) {
      // This is already a single user's collection, wrap it
      userCollectionData = { [username.toLowerCase()]: userCollection }
    } else {
      // This is the full collection object
      userCollectionData = userCollection
    }
  } else {
    userCollectionData = {}
  }
  
  // Check if userCards is already an array (single user) or object (full collection)
  let userCardsData: Record<string, any[]>
  
  if (userCards) {
    if (Array.isArray(userCards)) {
      // This is already a single user's cards array, wrap it
      userCardsData = { [username.toLowerCase()]: userCards }
    } else {
      // This is the full userCards object
      userCardsData = userCards
    }
  } else {
    userCardsData = {}
  }
  
  // Use userCollection as primary source (more accurate)
  const collectionCards = transformUserCollectionToCards(userCollectionData, username)
  
  // If userCollection is empty, fall back to userCards
  if (collectionCards.length === 0) {
    return transformUserCardsToCards(userCardsData, username)
  }
  
  return collectionCards
}

/**
 * Sanitize a card for catalogue display
 * For non-owned cards, removes sensitive information (name, image, wikiUrl) to prevent spoilers
 * 
 * @param card - The card to sanitize
 * @param isOwned - Whether the card is owned by the user
 * @returns The card with limited information if not owned, full card if owned
 */
export function sanitizeCardForCatalogue(card: Card, isOwned: boolean): Card {
  if (isOwned) {
    // Return full card for owned cards
    return card
  }

  // For non-owned cards, create a limited version
  // Remove: name, gameData.img, wikiUrl
  // Keep: uid, id, tier, rarity, itemClass, flavourText, gameData (without img), relevanceScore
  const sanitizedGameData: CardGameData = {
    ...card.gameData,
    img: '', // Remove image URL
    foilImg: undefined, // Remove foil image URL
  }

  return {
    ...card,
    name: '', // Remove name
    wikiUrl: '', // Remove wiki URL
    gameData: sanitizedGameData,
    isLimited: true, // Mark as limited
  }
}

