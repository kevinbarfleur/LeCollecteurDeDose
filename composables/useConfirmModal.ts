/**
 * Composable for programmatic confirmation modals
 * Provides a global confirm() function that can be awaited
 */

import { ref, computed } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
}

interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  variant: 'default' | 'danger' | 'warning'
  resolve: ((value: boolean) => void) | null
}

const confirmState = ref<ConfirmState>({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  variant: 'default',
  resolve: null,
})

/**
 * Show a confirmation modal and return a Promise that resolves to true/false
 * @param options - Configuration for the confirmation modal
 * @returns Promise<boolean> - true if confirmed, false if cancelled
 * 
 * @example
 * const confirmed = await confirm({
 *   title: 'Changer la source de données',
 *   message: 'Cette action affectera tous les utilisateurs. Continuer ?',
 *   variant: 'warning'
 * })
 * if (confirmed) {
 *   // User confirmed, proceed with action
 * }
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.value = {
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirmer',
      cancelText: options.cancelText || 'Annuler',
      variant: options.variant || 'default',
      resolve,
    }
  })
}

/**
 * Handle confirmation (user clicked confirm)
 */
function handleConfirm() {
  if (confirmState.value.resolve) {
    confirmState.value.resolve(true)
  }
  confirmState.value.isOpen = false
  confirmState.value.resolve = null
}

/**
 * Handle cancellation (user clicked cancel or closed modal)
 */
function handleCancel() {
  if (confirmState.value.resolve) {
    confirmState.value.resolve(false)
  }
  confirmState.value.isOpen = false
  confirmState.value.resolve = null
}

export function useConfirmModal() {
  return {
    confirmState: computed(() => confirmState.value),
    confirm,
    handleConfirm,
    handleCancel,
  }
}

