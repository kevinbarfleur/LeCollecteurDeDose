/**
 * Composable for forcing page reload on critical errors
 * Uses the existing confirmation modal system but with a single "Reload" button
 */

import { ref, computed } from 'vue'

export interface ReloadModalOptions {
  title?: string
  message: string
  reloadText?: string
}

interface ReloadModalState {
  isOpen: boolean
  title: string
  message: string
  reloadText: string
}

const reloadModalState = ref<ReloadModalState>({
  isOpen: false,
  title: 'Oups, quelque chose a mal tourné',
  message: '',
  reloadText: 'Rafraîchir',
})

/**
 * Show a reload modal that forces the user to reload the page
 * @param options - Configuration for the reload modal
 * 
 * @example
 * showReloadModal({
 *   message: 'Une erreur critique s\'est produite. Veuillez recharger la page pour continuer.',
 * })
 */
export function showReloadModal(options: ReloadModalOptions): void {
  reloadModalState.value = {
    isOpen: true,
    title: options.title || 'Oups, quelque chose a mal tourné',
    message: options.message,
    reloadText: options.reloadText || 'Rafraîchir',
  }
}

/**
 * Handle reload button click
 */
export function handleReload(): void {
  reloadModalState.value.isOpen = false
  window.location.reload()
}

/**
 * Close the modal (shouldn't normally be possible, but for safety)
 */
export function closeReloadModal(): void {
  // Don't allow closing - user must reload
  // This ensures data integrity
}

export function useReloadModal() {
  return {
    reloadModalState: computed(() => reloadModalState.value),
    showReloadModal,
    handleReload,
    closeReloadModal,
  }
}

