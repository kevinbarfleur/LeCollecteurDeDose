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
  try {
    const apiFormat = cardsToApiFormat(cards, vaalOrbs)
    return await ApiService.updateUserCollection(username, apiFormat, config)
  } catch (error: any) {
    console.error('[CollectionService] Failed to sync collection:', error)
    return false
  }
}

/**
 * Update specific card counts (incremental update)
 * Note: The server does a simple merge, so we need to calculate absolute values from deltas
 */
export async function updateCardCounts(
  username: string,
  cardUpdates: Map<number, CardUpdate>,
  vaalOrbsNewValue: number | undefined,
  config: ApiServiceConfig
): Promise<boolean> {
  try {
    // IMPORTANT: The server does a shallow merge, so we need to send ALL cards
    // with their updated counts, not just the changed ones.
    // Fetch current collection first to get all existing cards
    const currentCollectionData = await ApiService.fetchUserCollection(username, config)

    if (!currentCollectionData) {
      console.error('[CollectionService] Could not fetch current collection')
      return false
    }

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
    for (const [uid, changes] of cardUpdates.entries()) {
      const currentNormal = changes.currentNormal ?? 0
      const currentFoil = changes.currentFoil ?? 0
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
      if (currentCollectionData.vaalOrbs !== vaalOrbsNewValue) {
        console.log(`[CollectionService] Using optimistic vaalOrbs value: ${vaalOrbsNewValue} (fetched: ${currentCollectionData.vaalOrbs})`)
      }
    }

    // Remove vaalOrbs from the object before sending (it's a top-level property)
    const { vaalOrbs: vaalOrbsValue, ...cardsData } = update
    const finalUpdate: Record<string, any> = { ...cardsData }
    if (vaalOrbsNewValue !== undefined) {
      finalUpdate.vaalOrbs = vaalOrbsNewValue
    }

    const success = await ApiService.updateUserCollection(username, finalUpdate, config)

    if (success) {
      // Log collection state AFTER API update (what we sent)
      const updatedCards = apiFormatToCards(finalUpdate)
      logCollectionState('API Update: After (sent)', updatedCards, finalUpdate.vaalOrbs || 0, {
        username,
        updatesCount: cardUpdates.size,
      })
      return true
    }

    return false
  } catch (error: any) {
    console.error('[CollectionService] Update error:', error)
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

