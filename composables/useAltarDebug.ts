/**
 * Composable for managing Altar debug/admin settings
 * These settings are persisted in localStorage and shared between Altar and Admin pages
 */

import type { VaalOutcome } from '~/types/vaalOutcome'

type ForcedOutcome = 'random' | VaalOutcome

export function useAltarDebug() {
  // Forced outcome - persisted in localStorage
  const forcedOutcome = ref<ForcedOutcome>('random')
  
  // Load from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem('altar_forcedOutcome') as ForcedOutcome | null
    if (stored && (stored === 'random' || ['nothing', 'foil', 'destroyed', 'transform', 'duplicate'].includes(stored))) {
      forcedOutcome.value = stored
    }
  }
  
  // Watch and save to localStorage
  watch(forcedOutcome, (value) => {
    if (import.meta.client) {
      localStorage.setItem('altar_forcedOutcome', value)
    }
  })
  
  return {
    forcedOutcome: computed({
      get: () => forcedOutcome.value,
      set: (value: ForcedOutcome) => {
        forcedOutcome.value = value
      }
    }),
  }
}

