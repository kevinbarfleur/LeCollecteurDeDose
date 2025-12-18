/**
 * Collection Service
 *
 * Business logic for collection synchronization
 * Uses api.service for API calls and sync.store for state management
 */

import type { Card } from '~/types/card'
import { cardsToApiFormat, apiFormatToCards, createCardUpdate } from '~/utils/collectionSync'
import { logCollectionState } from '~/utils/collectionLogger'
import type { ApiServiceConfig } from './api.service'
import * as ApiService from './api.service'
import { logInfo, logError } from './logger.service'
import { applyAltarOutcome } from './supabase-collection.service'

export interface SyncError {
  message: string
  retryable: boolean
  code?: string
}

export interface CardUpdate {
  normalDelta: number
  foilDelta: number
  currentNormal?: number
  currentFoil?: number
  cardData?: Partial<Card>
}

/**
 * Sync complete collection to API
 */
export async function syncCollectionToApi(
  username: string,
  cards: Card[],
  vaalOrbs: number,
  config: ApiServiceConfig
): Promise<boolean> {
  logInfo('Syncing collection to API', { service: 'Collection', action: 'syncCollectionToApi', username, cardCount: cards.length, vaalOrbs })
  try {
    const apiFormat = cardsToApiFormat(cards, vaalOrbs)
    const success = await ApiService.updateUserCollection(username, apiFormat, config)
    logInfo('Collection synced', { service: 'Collection', action: 'syncCollectionToApi', username, success })
    return success
  } catch (error: any) {
    logError('Failed to sync collection', error, { service: 'Collection', action: 'syncCollectionToApi', username })
    return false
  }
}

/**
 * Update card counts using atomic altar outcome function
 * This is the optimized version that reduces ~5-7 calls to exactly 1 call
 *
 * @param username - Twitch username
 * @param cardUpdates - Map of card UID to update info (with currentNormal/currentFoil as absolute values)
 * @param vaalOrbsDelta - Change in vaal orbs (negative = consume, 0 = no change)
 * @param consumeAtlasInfluence - Whether to consume Atlas Influence buff
 * @param config - API config (kept for backward compatibility, not used)
 */
export async function updateCardCounts(
  username: string,
  cardUpdates: Map<number, CardUpdate>,
  vaalOrbsDelta: number,
  consumeAtlasInfluence: boolean = false,
  config: ApiServiceConfig = {}
): Promise<boolean> {
  logInfo('Updating card counts (atomic)', {
    service: 'Collection',
    action: 'updateCardCounts',
    username,
    cardUpdates: cardUpdates.size,
    vaalOrbsDelta,
    consumeAtlasInfluence,
  })

  try {
    // Transform Map to array for RPC
    const cardUpdatesArray: Array<{
      cardUid: number
      normalCount: number
      foilCount: number
    }> = []

    for (const [uid, changes] of cardUpdates.entries()) {
      // currentNormal and currentFoil are already the NEW absolute values
      const normalCount = changes.currentNormal ?? 0
      const foilCount = changes.currentFoil ?? 0

      console.log(`[Collection] updateCardCounts: Card UID ${uid} - normal: ${normalCount}, foil: ${foilCount}`)

      cardUpdatesArray.push({
        cardUid: uid,
        normalCount,
        foilCount,
      })
    }

    console.log(`[Collection] updateCardCounts: Calling atomic RPC for ${username} with ${cardUpdatesArray.length} card updates, vaal delta: ${vaalOrbsDelta}`)

    // Single atomic call - replaces fetch + get_user + set_vaal_orbs + N*set_card_counts + consume_buff
    const result = await applyAltarOutcome({
      username,
      cardUpdates: cardUpdatesArray,
      vaalOrbsDelta,
      consumeAtlasInfluence,
    })

    if (result.success) {
      logInfo('Card counts updated atomically', {
        service: 'Collection',
        action: 'updateCardCounts',
        username,
        success: true,
        vaalOrbs: result.vaalOrbs,
        cardsUpdated: result.cardsUpdated,
        atlasInfluenceConsumed: result.atlasInfluenceConsumed,
      })
      console.log(`[Collection] updateCardCounts: Success - vaalOrbs: ${result.vaalOrbs}, cards updated: ${result.cardsUpdated}`)
      return true
    }

    logError('Atomic card counts update failed', undefined, {
      service: 'Collection',
      action: 'updateCardCounts',
      username,
      error: result.error,
      errorCode: result.errorCode,
    })
    console.error(`[Collection] updateCardCounts: Failed - ${result.error}`)
    return false
  } catch (error: any) {
    logError('Card counts update error', error, {
      service: 'Collection',
      action: 'updateCardCounts',
      username,
    })
    return false
  }
}

/**
 * Legacy version of updateCardCounts (fetch-then-merge pattern)
 * Kept for backward compatibility and fallback
 * @deprecated Use updateCardCounts instead
 */
export async function updateCardCountsLegacy(
  username: string,
  cardUpdates: Map<number, CardUpdate>,
  vaalOrbsNewValue: number | undefined,
  config: ApiServiceConfig
): Promise<boolean> {
  logInfo('Updating card counts (legacy)', { service: 'Collection', action: 'updateCardCountsLegacy', username, cardUpdates: cardUpdates.size, vaalOrbs: vaalOrbsNewValue })
  try {
    // IMPORTANT: The server does a shallow merge, so we need to send ALL cards
    // with their updated counts, not just the changed ones.
    // Fetch current collection first to get all existing cards
    console.log(`[Collection] updateCardCountsLegacy: Fetching current collection for ${username}`)
    const currentCollectionData = await ApiService.fetchUserCollection(username, config)

    if (!currentCollectionData) {
      console.error(`[Collection] updateCardCountsLegacy: Could not fetch current collection for ${username}`)
      logError('Could not fetch current collection', undefined, { service: 'Collection', action: 'updateCardCountsLegacy', username })
      return false
    }

    console.log(`[Collection] updateCardCountsLegacy: Fetched current collection, ${Object.keys(currentCollectionData).length} entries`)

    // Log collection state BEFORE API update
    const currentCards = apiFormatToCards(currentCollectionData)
    const currentVaalOrbs = currentCollectionData.vaalOrbs || 0
    logCollectionState('API Update: Before', currentCards, currentVaalOrbs, {
      username,
      updatesCount: cardUpdates.size,
    })

    // Start with current collection data
    const update: Record<string, any> = { ...currentCollectionData }

    // Apply card updates (overwrite with new counts)
    console.log(`[Collection] updateCardCountsLegacy: Applying ${cardUpdates.size} card updates`)
    for (const [uid, changes] of cardUpdates.entries()) {
      const currentNormal = changes.currentNormal ?? 0
      const currentFoil = changes.currentFoil ?? 0
      console.log(`[Collection] updateCardCountsLegacy: Updating card UID ${uid} - normal: ${currentNormal}, foil: ${currentFoil}`)
      const cardUpdate = createCardUpdate(
        uid,
        changes.normalDelta,
        changes.foilDelta,
        currentNormal,
        currentFoil,
        changes.cardData
      )
      Object.assign(update, cardUpdate)
    }

    // Add vaalOrbs update if provided (absolute value)
    if (vaalOrbsNewValue !== undefined) {
      update.vaalOrbs = vaalOrbsNewValue
      console.log(`[Collection] updateCardCountsLegacy: Setting vaalOrbs to ${vaalOrbsNewValue}`)
    }

    // Remove vaalOrbs from the object before sending (it's a top-level property)
    const { vaalOrbs: vaalOrbsValue, ...cardsData } = update
    const finalUpdate: Record<string, any> = { ...cardsData }
    if (vaalOrbsNewValue !== undefined) {
      finalUpdate.vaalOrbs = vaalOrbsNewValue
    }

    console.log(`[Collection] updateCardCountsLegacy: Sending update with ${Object.keys(finalUpdate).length} entries`)
    const success = await ApiService.updateUserCollection(username, finalUpdate, config)
    console.log(`[Collection] updateCardCountsLegacy: Update result: ${success}`)

    if (success) {
      // Log collection state AFTER API update (what we sent)
      const updatedCards = apiFormatToCards(finalUpdate)
      logCollectionState('API Update: After (sent)', updatedCards, finalUpdate.vaalOrbs || 0, {
        username,
        updatesCount: cardUpdates.size,
      })
      logInfo('Card counts updated', { service: 'Collection', action: 'updateCardCountsLegacy', username, success: true })
      return true
    }

    logError('Card counts update failed', undefined, { service: 'Collection', action: 'updateCardCountsLegacy', username })
    return false
  } catch (error: any) {
    logError('Card counts update error', error, { service: 'Collection', action: 'updateCardCountsLegacy', username })
    return false
  }
}

/**
 * Update only vaalOrbs count
 */
export async function updateVaalOrbs(
  username: string,
  newCount: number,
  config: ApiServiceConfig
): Promise<boolean> {
  return await syncCollectionToApi(username, [], newCount, config)
}

