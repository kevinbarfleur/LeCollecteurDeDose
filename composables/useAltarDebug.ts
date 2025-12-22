/**
 * Composable for managing Altar debug/admin settings
 * These settings are persisted in localStorage and shared between Altar and Admin pages
 */

import type { VaalOutcome, FoilVaalOutcome, AnyVaalOutcome } from '~/types/vaalOutcome'

type ForcedOutcome = 'random' | AnyVaalOutcome

const VALID_OUTCOMES = [
  'nothing', 'foil', 'destroyed', 'transform', 'duplicate', // Normal outcomes
  'synthesised', 'lose_foil' // Foil-specific outcomes
]

export function useAltarDebug() {
  // Forced outcome - persisted in localStorage
  const forcedOutcome = ref<ForcedOutcome>('random')

  // Load from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem('altar_forcedOutcome') as ForcedOutcome | null
    if (stored && (stored === 'random' || VALID_OUTCOMES.includes(stored))) {
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

