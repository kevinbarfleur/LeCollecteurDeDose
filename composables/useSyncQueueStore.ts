/**
 * Composable wrapper for Sync Queue Store
 * 
 * Provides a composable interface that uses the Pinia store
 */

import { useSyncStore } from '~/stores/sync.store'
import type { Card } from '~/types/card'

export interface SyncOperation {
  id: string
  username: string
  cardUpdates: Map<number, {
    normalDelta: number
    foilDelta: number
    currentNormal?: number
    currentFoil?: number
    cardData?: Partial<Card>
  }>
  vaalOrbsDelta: number  // Delta (change), not absolute value - allows concurrent operations
  outcomeType?: string
  consumeAtlasInfluence?: boolean  // Whether to consume Atlas Influence buff in this operation
  rollbackData: {
    vaalOrbsBefore: number
    localCollectionBefore: Card[]
  }
  onSuccess?: () => void
  onError?: (error: { message: string; retryable: boolean; code?: string }) => void
}

export function useSyncQueue() {
  const syncStore = useSyncStore()

  return {
    enqueue: syncStore.enqueue,
    clearQueue: syncStore.clearQueue,
    queueStatus: computed(() => syncStore.queueStatus),
    // isProcessing is already a computed from the store, return it directly
    isProcessing: syncStore.isProcessing,
    syncError: computed(() => syncStore.syncError),
  }
}

