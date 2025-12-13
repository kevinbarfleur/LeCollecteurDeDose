/**
 * Composable for managing a sync queue to prevent race conditions
 * Handles queuing sync operations and executing them sequentially
 */

import { ref, computed } from 'vue'
import type { Card } from '~/types/card'
import type { SyncError } from '~/composables/useCollectionSync'

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

export function useSyncQueue() {
  const queue = ref<SyncOperation[]>([])
  const isProcessing = ref(false)
  const currentOperation = ref<SyncOperation | null>(null)

  /**
   * Add a sync operation to the queue
   */
  const enqueue = (operation: SyncOperation): Promise<boolean> => {
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
      console.log(`[SyncQueue] Enqueued operation: ${operation.id} (queue size: ${queue.value.length})`)
      
      // Start processing if not already processing
      if (!isProcessing.value) {
        processQueue()
      }
    })
  }

  /**
   * Process the queue sequentially
   */
  const processQueue = async () => {
    if (isProcessing.value || queue.value.length === 0) {
      return
    }

    isProcessing.value = true

    while (queue.value.length > 0) {
      const operation = queue.value.shift()!
      currentOperation.value = operation

      console.log(`[SyncQueue] Processing operation: ${operation.id}`)

      try {
        // Import here to avoid circular dependency
        const { updateCardCounts } = useCollectionSync()
        
        const success = await updateCardCounts(
          operation.username,
          operation.cardUpdates,
          operation.vaalOrbsNewValue
        )

        if (success) {
          console.log(`[SyncQueue] ✅ Operation ${operation.id} completed successfully`)
          operation.onSuccess?.()
        } else {
          const error: SyncError = {
            message: 'Échec de la synchronisation',
            retryable: true,
          }
          console.error(`[SyncQueue] ❌ Operation ${operation.id} failed`)
          operation.onError?.(error)
        }
      } catch (error: any) {
        const syncError: SyncError = {
          message: error.message || 'Erreur lors de la synchronisation',
          retryable: true,
          code: error.code,
        }
        console.error(`[SyncQueue] ❌ Operation ${operation.id} error:`, error)
        operation.onError?.(syncError)
      }

      currentOperation.value = null
    }

    isProcessing.value = false
    console.log('[SyncQueue] Queue processing completed')
  }

  /**
   * Clear the queue (useful for error recovery)
   */
  const clearQueue = () => {
    console.log(`[SyncQueue] Clearing queue (${queue.value.length} operations)`)
    queue.value = []
    currentOperation.value = null
    isProcessing.value = false
  }

  /**
   * Get queue status
   */
  const queueStatus = computed(() => ({
    size: queue.value.length,
    isProcessing: isProcessing.value,
    currentOperation: currentOperation.value?.id || null,
  }))

  return {
    enqueue,
    clearQueue,
    queueStatus,
    isProcessing: computed(() => isProcessing.value),
  }
}

