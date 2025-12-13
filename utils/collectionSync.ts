/**
 * Utility functions to convert between Card[] format (frontend) and API format (counters)
 * 
 * Frontend format: Card[] with individual instances
 * API format: { "uid": { cardData, normal: X, foil: Y }, "vaalOrbs": N }
 */

import type { Card } from '~/types/card'
import { allCards } from '~/data/mockCards'

/**
 * Calculate card counts from Card[] array
 * Groups cards by base UID and counts normal/foil instances
 */
export function calculateCardCounts(cards: Card[]): Map<number, { normal: number; foil: number }> {
  const counts = new Map<number, { normal: number; foil: number }>()
  
  for (const card of cards) {
    // Get base UID (remove decimal part added for uniqueness)
    const baseUid = Math.floor(card.uid)
    
    if (!counts.has(baseUid)) {
      counts.set(baseUid, { normal: 0, foil: 0 })
    }
    
    const count = counts.get(baseUid)!
    if (card.foil) {
      count.foil++
    } else {
      count.normal++
    }
  }
  
  return counts
}

/**
 * Convert Card[] array to API format
 * @param cards - Array of Card instances
 * @param vaalOrbs - Number of vaal orbs
 * @returns API format object ready to send to the server
 */
export function cardsToApiFormat(
  cards: Card[],
  vaalOrbs: number
): Record<string, any> {
  const counts = calculateCardCounts(cards)
  const result: Record<string, any> = {}
  
  // Group cards by base UID to get card data
  const cardDataMap = new Map<number, Card>()
  for (const card of cards) {
    const baseUid = Math.floor(card.uid)
    if (!cardDataMap.has(baseUid)) {
      cardDataMap.set(baseUid, card)
    }
  }
  
  // Build API format
  for (const [uid, count] of counts.entries()) {
    const card = cardDataMap.get(uid)
    if (!card) continue
    
    // Get base card data from allCards if available
    const baseCard = allCards.find(c => Math.floor(c.uid) === uid) || card
    
    // Create card entry in API format
    const cardEntry: any = {
      uid: uid,
      id: baseCard.id,
      name: baseCard.name,
      itemClass: baseCard.itemClass,
      rarity: baseCard.rarity,
      tier: baseCard.tier,
      flavourText: baseCard.flavourText,
      wikiUrl: baseCard.wikiUrl,
      gameData: baseCard.gameData,
      relevanceScore: baseCard.relevanceScore || card.relevanceScore,
      quantity: count.normal + count.foil,
      normal: count.normal,
      foil: count.foil,
    }
    
    // Use UID as string key (as per API format)
    result[String(uid)] = cardEntry
  }
  
  // Add vaalOrbs
  result.vaalOrbs = vaalOrbs
  
  return result
}

/**
 * Convert API format to Card[] array
 * This is essentially the same as transformUserCollectionToCards but more focused
 * @param apiData - API format object from server
 * @returns Array of Card instances
 */
export function apiFormatToCards(apiData: Record<string, any>): Card[] {
  const cards: Card[] = []
  
  for (const [key, value] of Object.entries(apiData)) {
    if (key === 'vaalOrbs') continue
    
    const cardData = value as any
    const cardUid = typeof cardData.uid === 'number' ? cardData.uid : parseInt(String(key), 10)
    
    if (isNaN(cardUid)) continue
    
    // Find base card from allCards
    const baseCard = allCards.find(c => c.uid === cardUid)
    const mergedCard = baseCard ? { ...baseCard, ...cardData } : cardData
    
    // Remove metadata fields
    const { quantity, normal, foil, ...cardProps } = mergedCard
    
    // Get counts
    const normalCount = typeof normal === 'number' ? normal : parseInt(String(normal || '0'), 10)
    const foilCount = typeof foil === 'number' ? foil : parseInt(String(foil || '0'), 10)
    
    // Generate instances with unique UIDs
    let instanceCounter = 0
    
    for (let i = 0; i < normalCount; i++) {
      cards.push({
        ...cardProps,
        uid: cardUid + (instanceCounter++ * 0.0001),
        foil: false,
      } as Card)
    }
    
    for (let i = 0; i < foilCount; i++) {
      cards.push({
        ...cardProps,
        uid: cardUid + (instanceCounter++ * 0.0001),
        foil: true,
      } as Card)
    }
  }
  
  return cards
}

/**
 * Extract vaalOrbs from API format
 */
export function extractVaalOrbs(apiData: Record<string, any>): number {
  return typeof apiData.vaalOrbs === 'number' ? apiData.vaalOrbs : 0
}

/**
 * Create a partial update object for a specific card
 * Used for incremental updates (e.g., after a vaal outcome)
 * 
 * IMPORTANT: The server does a simple merge, so we need to send absolute values, not deltas.
 * 
 * NOTE: currentNormal and currentFoil are already the NEW values (after local modification),
 * so we use them directly as absolute values. The deltas are only for logging/debugging.
 * 
 * @param uid - Card UID
 * @param normalDelta - Change in normal count (for logging only, not used in calculation)
 * @param foilDelta - Change in foil count (for logging only, not used in calculation)
 * @param currentNormal - NEW normal count (already includes the delta, use as absolute value)
 * @param currentFoil - NEW foil count (already includes the delta, use as absolute value)
 * @param cardData - Optional card data to include in update
 */
export function createCardUpdate(
  uid: number,
  normalDelta: number,
  foilDelta: number,
  currentNormal: number = 0,
  currentFoil: number = 0,
  cardData?: Partial<Card>
): Record<string, any> {
  const update: Record<string, any> = {}
  
  // currentNormal and currentFoil are already the NEW values (after local modification)
  // So we use them directly as absolute values (no need to add deltas)
  const newNormal = Math.max(0, currentNormal)
  const newFoil = Math.max(0, currentFoil)
  
  // If we have card data, include it
  if (cardData) {
    const baseCard = allCards.find(c => c.uid === uid) || cardData as Card
    
    update[String(uid)] = {
      uid: uid,
      id: baseCard.id,
      name: baseCard.name,
      itemClass: baseCard.itemClass,
      rarity: baseCard.rarity,
      tier: baseCard.tier,
      flavourText: baseCard.flavourText,
      wikiUrl: baseCard.wikiUrl,
      gameData: baseCard.gameData,
      relevanceScore: baseCard.relevanceScore,
      normal: newNormal,
      foil: newFoil,
      quantity: newNormal + newFoil,
    }
  } else {
    // Just update counts (server will merge with existing card data)
    update[String(uid)] = {
      uid: uid,
      normal: newNormal,
      foil: newFoil,
    }
  }
  
  return update
}

