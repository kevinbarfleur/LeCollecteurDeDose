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
import { logInfo, logError, logWarn } from '~/services/logger.service'

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
      logInfo('Operation enqueued', { store: 'Sync', action: 'enqueue', operationId: operation.id, queueSize: queue.value.length, username: operation.username })

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

    // Skip if not using API mode (test mode)
    // Access isApiData computed value correctly
    // isApiData is a computed ref, so we need to access its value
    let isApiMode = false
    try {
      const apiDataValue = dataSourceStore.isApiData
      isApiMode = typeof apiDataValue === 'boolean' 
        ? apiDataValue 
        : (apiDataValue as any).value ?? false
    } catch (e) {
      // If we can't access isApiData, assume API mode for safety
      isApiMode = true
    }
    
    if (!isApiMode) {
      logInfo('Skipping sync (test mode)', { store: 'Sync', action: 'processQueue', queueSize: queue.value.length })
      // Clear queue and resolve all operations as successful immediately
      // Process all operations synchronously to avoid blocking
      const operations = [...queue.value]
      queue.value = []
      
      // IMPORTANT: Reset processing state BEFORE resolving operations
      // This ensures isSyncProcessing becomes false immediately
      isProcessing.value = false
      apiStore.setLoading(false)
      
      // Resolve all operations immediately (synchronously)
      for (const op of operations) {
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

        logInfo('Processing operation', { store: 'Sync', action: 'processQueue', operationId: operation.id, username: operation.username, cardUpdates: operation.cardUpdates.size, vaalOrbs: operation.vaalOrbsNewValue })

        try {
          const config = apiStore.getApiConfig()
          const success = await CollectionService.updateCardCounts(
            operation.username,
            operation.cardUpdates,
            operation.vaalOrbsNewValue,
            config
          )

          if (success) {
            logInfo('Operation completed', { store: 'Sync', action: 'processQueue', operationId: operation.id })
            lastSyncTime.value = Date.now()
            syncError.value = null
            operation.onSuccess?.()
          } else {
            const error: SyncError = {
              message: 'Échec de la synchronisation',
              retryable: true,
            }
            logError('Operation failed', undefined, { store: 'Sync', action: 'processQueue', operationId: operation.id })
            syncError.value = error
            operation.onError?.(error)
          }
        } catch (error: any) {
          const syncErr: SyncError = {
            message: error.message || 'Erreur lors de la synchronisation',
            retryable: true,
            code: error.code,
          }
          logError('Operation error', error, { store: 'Sync', action: 'processQueue', operationId: operation.id })
          syncError.value = syncErr
          operation.onError?.(syncErr)
        }

        currentOperation.value = null
      }
    } finally {
      isProcessing.value = false
      apiStore.setLoading(false)
      logInfo('Queue processing completed', { store: 'Sync', action: 'processQueue', remainingQueue: queue.value.length })
    }
  }

  function clearQueue(): void {
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

