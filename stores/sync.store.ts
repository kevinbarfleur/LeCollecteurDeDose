/**
 * Sync Store
 * 
 * Manages the synchronization queue for collection updates
 * Prevents race conditions by processing operations sequentially
 */

import { defineStore } from 'pinia'
import type { Card } from '~/types/card'
import type { SyncError } from '~/services/collection.service'
import * as CollectionService from '~/services/collection.service'
import { useApiStore } from './api.store'
import { useDataSourceStore } from './dataSource.store'

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
  vaalOrbsNewValue?: number
  outcomeType?: string
  // Rollback data
  rollbackData: {
    vaalOrbsBefore: number
    localCollectionBefore: Card[]
  }
  // Callbacks
  onSuccess?: () => void
  onError?: (error: SyncError) => void
}

export const useSyncStore = defineStore('sync', () => {
  // State
  const queue = ref<SyncOperation[]>([])
  const isProcessing = ref(false)
  const currentOperation = ref<SyncOperation | null>(null)
  const lastSyncTime = ref<number | null>(null)
  const syncError = ref<SyncError | null>(null)

  // Get stores
  const apiStore = useApiStore()
  const dataSourceStore = useDataSourceStore()

  // Getters
  const queueStatus = computed(() => {
    return {
      size: queue.value.length,
      isProcessing: isProcessing.value,
      currentOperation: currentOperation.value?.id || null,
    }
  })

  // Actions
  function enqueue(operation: SyncOperation): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const operationWithCallbacks: SyncOperation = {
        ...operation,
        onSuccess: () => {
          operation.onSuccess?.()
          resolve(true)
        },
        onError: (error) => {
          operation.onError?.(error)
          reject(error)
        },
      }

      queue.value.push(operationWithCallbacks)
      console.log(`[SyncStore] Enqueued operation: ${operation.id} (queue size: ${queue.value.length})`)

      // Start processing if not already processing
      if (!isProcessing.value) {
        processQueue()
      }
    })
  }

  async function processQueue(): Promise<void> {
    if (isProcessing.value || queue.value.length === 0) {
      return
    }

    // Skip if not using API mode
    if (!dataSourceStore.isApiData) {
      console.log('[SyncStore] Skipping sync (test mode - no sync needed)')
      // Clear queue and resolve all operations as successful
      while (queue.value.length > 0) {
        const op = queue.value.shift()!
        op.onSuccess?.()
      }
      return
    }

    isProcessing.value = true
    apiStore.setLoading(true)

    try {
      while (queue.value.length > 0) {
        const operation = queue.value.shift()!
        currentOperation.value = operation

        console.log(`[SyncStore] Processing operation: ${operation.id}`)

        try {
          const config = apiStore.getApiConfig()
          const success = await CollectionService.updateCardCounts(
            operation.username,
            operation.cardUpdates,
            operation.vaalOrbsNewValue,
            config
          )

          if (success) {
            console.log(`[SyncStore] ✅ Operation ${operation.id} completed successfully`)
            lastSyncTime.value = Date.now()
            syncError.value = null
            operation.onSuccess?.()
          } else {
            const error: SyncError = {
              message: 'Échec de la synchronisation',
              retryable: true,
            }
            console.error(`[SyncStore] ❌ Operation ${operation.id} failed`)
            syncError.value = error
            operation.onError?.(error)
          }
        } catch (error: any) {
          const syncErr: SyncError = {
            message: error.message || 'Erreur lors de la synchronisation',
            retryable: true,
            code: error.code,
          }
          console.error(`[SyncStore] ❌ Operation ${operation.id} error:`, error)
          syncError.value = syncErr
          operation.onError?.(syncErr)
        }

        currentOperation.value = null
      }
    } finally {
      isProcessing.value = false
      apiStore.setLoading(false)
      console.log('[SyncStore] Queue processing completed')
    }
  }

  function clearQueue(): void {
    console.log(`[SyncStore] Clearing queue (${queue.value.length} operations)`)
    queue.value = []
    currentOperation.value = null
    isProcessing.value = false
    syncError.value = null
  }

  function setSyncError(error: SyncError | null): void {
    syncError.value = error
  }

  return {
    // State - expose as computed for reactivity
    queueStatus,
    isProcessing: computed(() => isProcessing.value),
    lastSyncTime: computed(() => lastSyncTime.value),
    syncError: computed(() => syncError.value),

    // Actions
    enqueue,
    processQueue,
    clearQueue,
    setSyncError,
  }
})

