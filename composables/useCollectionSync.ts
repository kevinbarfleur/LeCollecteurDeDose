/**
 * Composable for synchronizing collection changes with the API
 * Handles optimistic updates, error handling, and retry logic
 */

import { ref, computed, watch } from 'vue'
import type { Card } from '~/types/card'
import { cardsToApiFormat, apiFormatToCards, createCardUpdate } from '~/utils/collectionSync'
import { logCollectionState } from '~/utils/collectionLogger'

export interface SyncError {
  message: string
  retryable: boolean
  code?: string
}

interface CardUpdate {
  normalDelta: number
  foilDelta: number
  currentNormal?: number
  currentFoil?: number
  cardData?: Partial<Card>
}

export function useCollectionSync() {
  const { updateUserCollection } = useApi()
  const { isApiData } = useDataSource()
  
  const isSyncing = ref(false)
  const syncError = ref<SyncError | null>(null)
  const lastSyncTime = ref<number | null>(null)
  
  /**
   * Sync complete collection to API
   * @param username - Username (will be lowercased)
   * @param cards - Array of Card instances
   * @param vaalOrbs - Number of vaal orbs
   */
  async function syncCollectionToApi(
    username: string,
    cards: Card[],
    vaalOrbs: number
  ): Promise<boolean> {
    if (!isApiData.value) {
      // Not using API, skip sync
      return true
    }
    
    isSyncing.value = true
    syncError.value = null
    
    try {
      const apiFormat = cardsToApiFormat(cards, vaalOrbs)
      const success = await updateUserCollection(username, apiFormat)
      
      if (success) {
        lastSyncTime.value = Date.now()
        return true
      } else {
        syncError.value = {
          message: 'Échec de la synchronisation',
          retryable: true,
        }
        return false
      }
    } catch (error: any) {
      syncError.value = {
        message: error.message || 'Erreur lors de la synchronisation',
        retryable: true,
        code: error.code,
      }
      return false
    } finally {
      isSyncing.value = false
    }
  }
  
  /**
   * Update specific card counts (incremental update)
   * Note: The server does a simple merge, so we need to calculate absolute values from deltas
   * @param username - Username
   * @param cardUpdates - Map of UID to count deltas and current counts
   * @param vaalOrbsNewValue - New absolute value for vaalOrbs (not delta)
   */
  async function updateCardCounts(
    username: string,
    cardUpdates: Map<number, CardUpdate>,
    vaalOrbsNewValue?: number
  ): Promise<boolean> {
    if (!isApiData.value) {
      console.log('[CollectionSync] Skipping sync (mock mode)')
      return true
    }
    
    const updateInfo = {
      username,
      cardUpdatesCount: cardUpdates.size,
      vaalOrbsNewValue,
      updates: Array.from(cardUpdates.entries()).map(([uid, ch]) => ({
        uid,
        normalDelta: ch.normalDelta,
        foilDelta: ch.foilDelta,
        currentNormal: ch.currentNormal,
        currentFoil: ch.currentFoil,
      }))
    };
    console.log('[CollectionSync] Starting card counts update:')
    console.log(JSON.stringify(updateInfo, null, 2))
    
    isSyncing.value = true
    syncError.value = null
    
    try {
      // IMPORTANT: The server does a shallow merge, so we need to send ALL cards
      // with their updated counts, not just the changed ones.
      // Fetch current collection first to get all existing cards
      const { fetchUserCollection } = useApi()
      const currentCollectionData = await fetchUserCollection(username)
      
      if (!currentCollectionData) {
        console.error('[CollectionSync] ❌ Could not fetch current collection')
        syncError.value = {
          message: 'Impossible de récupérer la collection actuelle',
          retryable: true,
        }
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
      // IMPORTANT: Use the provided absolute value directly, don't rely on fetched value
      // This ensures consistency even if server hasn't propagated previous updates yet
      if (vaalOrbsNewValue !== undefined) {
        update.vaalOrbs = vaalOrbsNewValue
        // Log if there's a mismatch with fetched value (informational only)
        if (currentCollectionData.vaalOrbs !== vaalOrbsNewValue) {
          console.log(`[CollectionSync] Using optimistic vaalOrbs value: ${vaalOrbsNewValue} (fetched: ${currentCollectionData.vaalOrbs})`)
        }
      }
      
      // Remove vaalOrbs from the object before sending (it's a top-level property)
      const { vaalOrbs: vaalOrbsValue, ...cardsData } = update
      const finalUpdate: Record<string, any> = { ...cardsData }
      if (vaalOrbsNewValue !== undefined) {
        finalUpdate.vaalOrbs = vaalOrbsNewValue
      }
      
      const sendInfo = {
        vaalOrbs: finalUpdate.vaalOrbs,
        cardCount: Object.keys(finalUpdate).filter(k => k !== 'vaalOrbs').length,
        updatedCards: Array.from(cardUpdates.keys()),
        cardKeys: Object.keys(finalUpdate).filter(k => k !== 'vaalOrbs').slice(0, 10) // First 10 keys only
      };
      console.log('[CollectionSync] Sending complete update to API:')
      console.log(JSON.stringify(sendInfo, null, 2))
      const success = await updateUserCollection(username, finalUpdate)
      
      if (success) {
        console.log('[CollectionSync] ✅ Update successful')
        
        // Log collection state AFTER API update (what we sent)
        const updatedCards = apiFormatToCards(finalUpdate)
        logCollectionState('API Update: After (sent)', updatedCards, finalUpdate.vaalOrbs || 0, {
          username,
          updatesCount: cardUpdates.size,
        })
        
        lastSyncTime.value = Date.now()
        return true
      } else {
        console.error('[CollectionSync] ❌ Update failed')
        syncError.value = {
          message: 'Échec de la mise à jour',
          retryable: true,
        }
        return false
      }
    } catch (error: any) {
      console.error('[CollectionSync] ❌ Update error:', error)
      syncError.value = {
        message: error.message || 'Erreur lors de la mise à jour',
        retryable: true,
        code: error.code,
      }
      return false
    } finally {
      isSyncing.value = false
    }
  }
  
  /**
   * Update only vaalOrbs count
   * @param username - Username
   * @param newCount - New vaalOrbs count (absolute value)
   */
  async function updateVaalOrbs(username: string, newCount: number): Promise<boolean> {
    if (!isApiData.value) {
      return true
    }
    
    return await syncCollectionToApi(username, [], newCount)
  }
  
  /**
   * Clear sync error
   */
  const clearError = () => {
    syncError.value = null
  }
  
  return {
    isSyncing: computed(() => isSyncing.value),
    syncError: computed(() => syncError.value),
    lastSyncTime: computed(() => lastSyncTime.value),
    syncCollectionToApi,
    updateCardCounts,
    updateVaalOrbs,
    clearError,
  }
}

