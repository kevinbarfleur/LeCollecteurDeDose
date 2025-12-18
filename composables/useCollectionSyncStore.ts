/**
 * Composable wrapper for Collection Sync
 * 
 * Provides a composable interface that uses the Pinia store and services
 */

import { useSyncStore } from '~/stores/sync.store'
import { useApiStore } from '~/stores/api.store'
import { useDataSourceStore } from '~/stores/dataSource.store'
import * as CollectionService from '~/services/collection.service'
import type { Card } from '~/types/card'

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
  const syncStore = useSyncStore()
  const apiStore = useApiStore()
  const dataSourceStore = useDataSourceStore()

  async function syncCollectionToApi(
    username: string,
    cards: Card[],
    vaalOrbs: number
  ): Promise<boolean> {
    if (!dataSourceStore.isSupabaseData) {
      return true
    }

    try {
      const config = apiStore.getApiConfig()
      return await CollectionService.syncCollectionToApi(username, cards, vaalOrbs, config)
    } catch (error: any) {
      syncStore.setSyncError({
        message: error.message || 'Erreur lors de la synchronisation',
        retryable: true,
        code: error.code,
      })
      return false
    }
  }

  async function updateCardCounts(
    username: string,
    cardUpdates: Map<number, CardUpdate>,
    vaalOrbsDelta: number = 0,
    consumeAtlasInfluence: boolean = false
  ): Promise<boolean> {
    if (!dataSourceStore.isSupabaseData) {
      return true
    }

    // Use sync store queue
    const operationId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return new Promise((resolve, reject) => {
      syncStore.enqueue({
        id: operationId,
        username,
        cardUpdates,
        vaalOrbsDelta,
        consumeAtlasInfluence,
        rollbackData: {
          vaalOrbsBefore: 0,
          localCollectionBefore: [],
        },
        onSuccess: () => resolve(true),
        onError: (error) => {
          syncStore.setSyncError(error)
          reject(error)
        },
      })
    })
  }

  async function updateVaalOrbs(username: string, newCount: number): Promise<boolean> {
    return await syncCollectionToApi(username, [], newCount)
  }

  function clearError() {
    syncStore.setSyncError(null)
  }

  return {
    isSyncing: computed(() => syncStore.isProcessing),
    syncError: computed(() => syncStore.syncError),
    lastSyncTime: computed(() => syncStore.lastSyncTime),
    syncCollectionToApi,
    updateCardCounts,
    updateVaalOrbs,
    clearError,
  }
}

