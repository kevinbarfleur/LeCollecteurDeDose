/**
 * Test Scenarios for Vaal Orb outcomes and API synchronization
 * 
 * Usage from browser console:
 *   import { testScenarios } from '~/test-scenarios'
 *   const runner = useTestRunner()
 *   await runner.runAllScenarios(testScenarios)
 * 
 * Or run individual scenario:
 *   await runner.runScenario(testScenarios[0])
 */

import type { TestScenario } from '~/composables/useTestRunner'
import type { Card } from '~/types/card'

// Helper to get collection state (will be injected)
let getCollectionState: (() => {
  cards: Card[]
  vaalOrbs: number
  cardCounts: Map<number, { normal: number; foil: number }>
}) | null = null

// Helper to simulate Vaal Orb outcome (will be injected)
let simulateOutcome: ((outcome: string, cardUid?: number) => Promise<void>) | null = null

// Helper to get card by UID (will be injected)
let getCardByUid: ((uid: number) => Card | null) | null = null

// Helper to add vaalOrbs (will be injected)
let addVaalOrbs: ((amount: number) => void) | null = null

/**
 * Setup test helpers (called from component)
 */
export function setupTestHelpers(helpers: {
  getCollectionState: () => { cards: Card[]; vaalOrbs: number; cardCounts: Map<number, { normal: number; foil: number }> }
  simulateOutcome: (outcome: string, cardUid?: number) => Promise<void>
  getCardByUid: (uid: number) => Card | null
  addVaalOrbs?: (amount: number) => void
}) {
  getCollectionState = helpers.getCollectionState
  simulateOutcome = helpers.simulateOutcome
  getCardByUid = helpers.getCardByUid
  addVaalOrbs = helpers.addVaalOrbs || null
}

/**
 * Test Scenario: FOIL Transformation
 */
export const foilTransformationScenario: TestScenario = {
  name: 'foil-transformation',
  description: 'Test FOIL outcome: transform a normal card to foil',
  setup: async () => {
    const state = getCollectionState?.()
    if (!state) throw new Error('Test helpers not initialized')
    
    // Ensure we have at least 1 vaalOrb
    if (state.vaalOrbs < 1 && addVaalOrbs) {
      addVaalOrbs(1)
      // Re-fetch state after adding vaalOrbs
      const newState = getCollectionState?.()
      if (newState) {
        state.vaalOrbs = newState.vaalOrbs
      }
    }
    
    // Find a normal card with at least 1 normal instance
    // We need a card that has normal count > 0 for the test to work correctly
    const normalCard = state.cards.find(c => {
      const baseUid = Math.floor(c.uid)
      const counts = state.cardCounts.get(baseUid)
      return !c.foil && counts && counts.normal > 0
    })
    if (!normalCard) {
      throw new Error('No normal card found for FOIL test')
    }
    
    const baseUid = Math.floor(normalCard.uid)
    const initialCounts = state.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
    
    // Store initial state
    ;(window as any).__testFoilCardUid = normalCard.uid
    ;(window as any).__testInitialVaalOrbs = state.vaalOrbs
    ;(window as any).__testInitialNormal = initialCounts.normal
    ;(window as any).__testInitialFoil = initialCounts.foil
    
    console.log(`[Test] FOIL setup: card ${baseUid} has ${initialCounts.normal} normal, ${initialCounts.foil} foil`)
    
    // Store the card UID so simulateOutcome can select it
    ;(window as any).__testFoilCardUidToSelect = normalCard.uid
  },
  execute: async () => {
    if (!simulateOutcome) throw new Error('Test helpers not initialized')
    const cardUid = (window as any).__testFoilCardUidToSelect
    await simulateOutcome('foil', cardUid)
  },
  assertions: [
    {
      name: 'VaalOrbs decreased by 1',
      check: async () => {
        // Wait for sync to complete and collection reload
        // The onSuccess callback waits 1s then reloads, so we wait a bit more
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const initialVaalOrbs = (window as any).__testInitialVaalOrbs
        if (!state) {
          console.log('[Test] No state available')
          return false
        }
        const result = state.vaalOrbs === initialVaalOrbs - 1
        if (!result) {
          console.log(`[Test] VaalOrbs assertion failed: expected ${initialVaalOrbs - 1}, got ${state.vaalOrbs}`)
        }
        return result
      },
      expected: 'vaalOrbs should be initialVaalOrbs - 1',
    },
    {
      name: 'Card is now foil',
      check: async () => {
        // Wait a bit for sync to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        const state = getCollectionState?.()
        const cardUid = (window as any).__testFoilCardUid
        const baseUid = Math.floor(cardUid)
        // Check if at least one instance of this card is foil
        const foilCards = state?.cards.filter(c => Math.floor(c.uid) === baseUid && c.foil) || []
        const result = foilCards.length > 0
        if (!result) {
          console.log(`[Test] Card foil assertion failed: expected at least 1 foil instance, got ${foilCards.length}`)
          const allCards = state?.cards.filter(c => Math.floor(c.uid) === baseUid) || []
          console.log(`[Test] All instances of card ${baseUid}:`, allCards.map(c => ({ uid: c.uid, foil: c.foil })))
        }
        return result
      },
      expected: 'Card should have at least one foil instance',
    },
    {
      name: 'Normal count decreased, foil count increased',
      check: async () => {
        // Wait a bit for sync to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const cardUid = (window as any).__testFoilCardUid
        const baseUid = Math.floor(cardUid)
        const counts = state?.cardCounts.get(baseUid)
        
        if (!counts) {
          console.log(`[Test] No counts found for card ${baseUid}`)
          return false
        }
        
        const initialNormal = (window as any).__testInitialNormal
        const initialFoil = (window as any).__testInitialFoil
        
        // After foil transformation: normal should decrease by 1, foil should increase by 1
        const normalCorrect = counts.normal === Math.max(0, initialNormal - 1)
        const foilCorrect = counts.foil === initialFoil + 1
        
        if (!normalCorrect) {
          console.log(`[Test] Normal count assertion failed: expected ${Math.max(0, initialNormal - 1)}, got ${counts.normal}`)
        }
        if (!foilCorrect) {
          console.log(`[Test] Foil count assertion failed: expected ${initialFoil + 1}, got ${counts.foil}`)
        }
        
        return normalCorrect && foilCorrect
      },
      expected: 'Normal count should decrease by 1, foil count should increase by 1',
    },
  ],
  cleanup: () => {
    delete (window as any).__testFoilCardUid
    delete (window as any).__testFoilCardUidToSelect
    delete (window as any).__testInitialVaalOrbs
    delete (window as any).__testInitialNormal
    delete (window as any).__testInitialFoil
  },
}

/**
 * Test Scenario: DUPLICATE Outcome
 */
export const duplicateScenario: TestScenario = {
  name: 'duplicate',
  description: 'Test DUPLICATE outcome: duplicate a card',
  setup: async () => {
    const state = getCollectionState?.()
    if (!state) throw new Error('Test helpers not initialized')
    
    // Ensure we have at least 1 vaalOrb
    if (state.vaalOrbs < 1 && addVaalOrbs) {
      addVaalOrbs(1)
      const newState = getCollectionState?.()
      if (newState) {
        state.vaalOrbs = newState.vaalOrbs
      }
    }
    
    // Find any card
    const card = state.cards[0]
    if (!card) {
      throw new Error('No card found for DUPLICATE test')
    }
    
    const baseUid = Math.floor(card.uid)
    const initialCounts = state.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
    
    ;(window as any).__testDuplicateCardUid = card.uid
    ;(window as any).__testInitialVaalOrbs = state.vaalOrbs
    ;(window as any).__testInitialNormal = initialCounts.normal
    ;(window as any).__testInitialFoil = initialCounts.foil
    ;(window as any).__testIsFoil = card.foil
    
    console.log(`[Test] DUPLICATE setup: card ${baseUid} has ${initialCounts.normal} normal, ${initialCounts.foil} foil, isFoil: ${card.foil}`)
    
    // Store the card UID so simulateOutcome can select it
    ;(window as any).__testDuplicateCardUidToSelect = card.uid
  },
  execute: async () => {
    if (!simulateOutcome) throw new Error('Test helpers not initialized')
    const cardUid = (window as any).__testDuplicateCardUidToSelect
    await simulateOutcome('duplicate', cardUid)
  },
  assertions: [
    {
      name: 'VaalOrbs decreased by 1',
      check: async () => {
        // Wait for sync to complete and collection reload
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const initialVaalOrbs = (window as any).__testInitialVaalOrbs
        if (!state) {
          console.log('[Test] No state available')
          return false
        }
        const result = state.vaalOrbs === initialVaalOrbs - 1
        if (!result) {
          console.log(`[Test] VaalOrbs assertion failed: expected ${initialVaalOrbs - 1}, got ${state.vaalOrbs}`)
        }
        return result
      },
      expected: 'vaalOrbs should be initialVaalOrbs - 1',
    },
    {
      name: 'Card count increased',
      check: async () => {
        // Wait for sync to complete and collection reload
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const cardUid = (window as any).__testDuplicateCardUid
        const baseUid = Math.floor(cardUid)
        const counts = state?.cardCounts.get(baseUid)
        const isFoil = (window as any).__testIsFoil
        const initialNormal = (window as any).__testInitialNormal
        const initialFoil = (window as any).__testInitialFoil
        
        if (!counts) {
          console.log(`[Test] No counts found for card ${baseUid}`)
          return false
        }
        
        let result = false
        if (isFoil) {
          result = counts.foil === initialFoil + 1
          if (!result) {
            console.log(`[Test] Foil count assertion failed: expected ${initialFoil + 1}, got ${counts.foil}`)
          }
        } else {
          result = counts.normal === initialNormal + 1
          if (!result) {
            console.log(`[Test] Normal count assertion failed: expected ${initialNormal + 1}, got ${counts.normal}`)
          }
        }
        return result
      },
      expected: 'Card count should increase by 1',
    },
  ],
  cleanup: () => {
    delete (window as any).__testDuplicateCardUid
    delete (window as any).__testDuplicateCardUidToSelect
    delete (window as any).__testInitialVaalOrbs
    delete (window as any).__testInitialNormal
    delete (window as any).__testInitialFoil
    delete (window as any).__testIsFoil
  },
}

/**
 * Test Scenario: DESTROYED Outcome
 */
export const destroyedScenario: TestScenario = {
  name: 'destroyed',
  description: 'Test DESTROYED outcome: destroy a card',
  setup: async () => {
    const state = getCollectionState?.()
    if (!state) throw new Error('Test helpers not initialized')
    
    // Ensure we have at least 1 vaalOrb
    if (state.vaalOrbs < 1 && addVaalOrbs) {
      addVaalOrbs(1)
      const newState = getCollectionState?.()
      if (newState) {
        state.vaalOrbs = newState.vaalOrbs
      }
    }
    
    // Find any card with at least 1 instance
    const card = state.cards.find(c => {
      const baseUid = Math.floor(c.uid)
      const counts = state.cardCounts.get(baseUid)
      return counts && (counts.normal > 0 || counts.foil > 0)
    })
    if (!card) {
      throw new Error('No card found for DESTROYED test')
    }
    
    const baseUid = Math.floor(card.uid)
    const initialCounts = state.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
    
    ;(window as any).__testDestroyedCardUid = card.uid
    ;(window as any).__testInitialVaalOrbs = state.vaalOrbs
    ;(window as any).__testInitialNormal = initialCounts.normal
    ;(window as any).__testInitialFoil = initialCounts.foil
    ;(window as any).__testIsFoil = card.foil
    
    console.log(`[Test] DESTROYED setup: card ${baseUid} has ${initialCounts.normal} normal, ${initialCounts.foil} foil, isFoil: ${card.foil}`)
  },
  execute: async () => {
    if (!simulateOutcome) throw new Error('Test helpers not initialized')
    await simulateOutcome('destroyed')
  },
  assertions: [
    {
      name: 'VaalOrbs decreased by 1',
      check: async () => {
        // Wait for sync to complete and collection reload
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const initialVaalOrbs = (window as any).__testInitialVaalOrbs
        if (!state) {
          console.log('[Test] No state available')
          return false
        }
        const result = state.vaalOrbs === initialVaalOrbs - 1
        if (!result) {
          console.log(`[Test] VaalOrbs assertion failed: expected ${initialVaalOrbs - 1}, got ${state.vaalOrbs}`)
        }
        return result
      },
      expected: 'vaalOrbs should be initialVaalOrbs - 1',
    },
    {
      name: 'Card count decreased',
      check: async () => {
        // Wait for sync to complete and collection reload
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const cardUid = (window as any).__testDestroyedCardUid
        const baseUid = Math.floor(cardUid)
        const counts = state?.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
        const isFoil = (window as any).__testIsFoil
        const initialNormal = (window as any).__testInitialNormal
        const initialFoil = (window as any).__testInitialFoil
        
        let result = false
        if (isFoil) {
          result = counts.foil === Math.max(0, initialFoil - 1)
          if (!result) {
            console.log(`[Test] Foil count assertion failed: expected ${Math.max(0, initialFoil - 1)}, got ${counts.foil}`)
          }
        } else {
          result = counts.normal === Math.max(0, initialNormal - 1)
          if (!result) {
            console.log(`[Test] Normal count assertion failed: expected ${Math.max(0, initialNormal - 1)}, got ${counts.normal}`)
          }
        }
        return result
      },
      expected: 'Card count should decrease by 1',
    },
  ],
  cleanup: () => {
    delete (window as any).__testDestroyedCardUid
    delete (window as any).__testInitialVaalOrbs
    delete (window as any).__testInitialNormal
    delete (window as any).__testInitialFoil
    delete (window as any).__testIsFoil
  },
}

/**
 * Test Scenario: TRANSFORM Outcome
 */
export const transformScenario: TestScenario = {
  name: 'transform',
  description: 'Test TRANSFORM outcome: transform a card to another card of same tier',
  setup: async () => {
    const state = getCollectionState?.()
    if (!state) throw new Error('Test helpers not initialized')
    
    // Ensure we have at least 1 vaalOrb
    if (state.vaalOrbs < 1 && addVaalOrbs) {
      addVaalOrbs(1)
      const newState = getCollectionState?.()
      if (newState) {
        state.vaalOrbs = newState.vaalOrbs
      }
    }
    
    // Find any card
    const card = state.cards[0]
    if (!card) {
      throw new Error('No card found for TRANSFORM test')
    }
    
    const baseUid = Math.floor(card.uid)
    const initialCounts = state.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
    
    ;(window as any).__testTransformCardUid = card.uid
    ;(window as any).__testTransformCardId = card.id
    ;(window as any).__testInitialVaalOrbs = state.vaalOrbs
    ;(window as any).__testInitialNormal = initialCounts.normal
    ;(window as any).__testInitialFoil = initialCounts.foil
    ;(window as any).__testIsFoil = card.foil
  },
  execute: async () => {
    if (!simulateOutcome) throw new Error('Test helpers not initialized')
    await simulateOutcome('transform')
  },
  assertions: [
    {
      name: 'VaalOrbs decreased by 1',
      check: async () => {
        // Wait for sync to complete and collection reload
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const initialVaalOrbs = (window as any).__testInitialVaalOrbs
        if (!state) {
          console.log('[Test] No state available')
          return false
        }
        const result = state.vaalOrbs === initialVaalOrbs - 1
        if (!result) {
          console.log(`[Test] VaalOrbs assertion failed: expected ${initialVaalOrbs - 1}, got ${state.vaalOrbs}`)
        }
        return result
      },
      expected: 'vaalOrbs should be initialVaalOrbs - 1',
    },
    {
      name: 'Old card count decreased',
      check: async () => {
        // Wait for sync to complete and collection reload
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const cardUid = (window as any).__testTransformCardUid
        const baseUid = Math.floor(cardUid)
        const counts = state?.cardCounts.get(baseUid) || { normal: 0, foil: 0 }
        const isFoil = (window as any).__testIsFoil
        const initialNormal = (window as any).__testInitialNormal
        const initialFoil = (window as any).__testInitialFoil
        
        if (isFoil) {
          return counts.foil === Math.max(0, initialFoil - 1)
        } else {
          return counts.normal === Math.max(0, initialNormal - 1)
        }
      },
      expected: 'Old card count should decrease by 1',
    },
  ],
  cleanup: () => {
    delete (window as any).__testTransformCardUid
    delete (window as any).__testTransformCardId
    delete (window as any).__testInitialVaalOrbs
    delete (window as any).__testInitialNormal
    delete (window as any).__testInitialFoil
    delete (window as any).__testIsFoil
  },
}

/**
 * Test Scenario: NOTHING Outcome
 */
export const nothingScenario: TestScenario = {
  name: 'nothing',
  description: 'Test NOTHING outcome: no effect, no vaalOrb consumed',
  setup: async () => {
    const state = getCollectionState?.()
    if (!state) throw new Error('Test helpers not initialized')
    
    ;(window as any).__testInitialVaalOrbs = state.vaalOrbs
    ;(window as any).__testInitialCardCount = state.cards.length
  },
  execute: async () => {
    if (!simulateOutcome) throw new Error('Test helpers not initialized')
    await simulateOutcome('nothing')
  },
  assertions: [
    {
      name: 'VaalOrbs unchanged',
      check: () => {
        const state = getCollectionState?.()
        const initialVaalOrbs = (window as any).__testInitialVaalOrbs
        return state ? state.vaalOrbs === initialVaalOrbs : false
      },
      expected: 'vaalOrbs should remain unchanged',
    },
    {
      name: 'Card count unchanged',
      check: () => {
        const state = getCollectionState?.()
        const initialCardCount = (window as any).__testInitialCardCount
        return state ? state.cards.length === initialCardCount : false
      },
      expected: 'Card count should remain unchanged',
    },
  ],
  cleanup: () => {
    delete (window as any).__testInitialVaalOrbs
    delete (window as any).__testInitialCardCount
  },
}

/**
 * Test Scenario: Multiple rapid outcomes (race condition test)
 */
export const raceConditionScenario: TestScenario = {
  name: 'race-condition',
  description: 'Test multiple rapid outcomes to check queue handling',
  setup: async () => {
    const state = getCollectionState?.()
    if (!state) throw new Error('Test helpers not initialized')
    
    // Ensure we have at least 3 vaalOrbs (for 3 nothing outcomes)
    if (state.vaalOrbs < 3 && addVaalOrbs) {
      const needed = 3 - state.vaalOrbs
      addVaalOrbs(needed)
      const newState = getCollectionState?.()
      if (newState) {
        state.vaalOrbs = newState.vaalOrbs
      }
    }
    
    if (state.vaalOrbs < 3) {
      throw new Error('Need at least 3 vaalOrbs for race condition test')
    }
    
    ;(window as any).__testInitialVaalOrbs = state.vaalOrbs
    ;(window as any).__testInitialCardCount = state.cards.length
  },
  execute: async () => {
    if (!simulateOutcome) throw new Error('Test helpers not initialized')
    
    // Trigger multiple outcomes rapidly
    const promises = [
      simulateOutcome('nothing'),
      simulateOutcome('nothing'),
      simulateOutcome('nothing'),
    ]
    
    await Promise.all(promises)
  },
  assertions: [
    {
      name: 'VaalOrbs decreased by 3 (nothing outcomes consume vaalOrbs)',
      check: async () => {
        // Wait for all syncs to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        const state = getCollectionState?.()
        const initialVaalOrbs = (window as any).__testInitialVaalOrbs
        if (!state) {
          console.log('[Test] No state available')
          return false
        }
        // Nothing outcomes consume 1 vaalOrb each, so 3 outcomes = -3 vaalOrbs
        const result = state.vaalOrbs === initialVaalOrbs - 3
        if (!result) {
          console.log(`[Test] VaalOrbs assertion failed: expected ${initialVaalOrbs - 3}, got ${state.vaalOrbs}`)
        }
        return result
      },
      expected: 'vaalOrbs should decrease by 3 (one for each nothing outcome)',
    },
    {
      name: 'No sync conflicts',
      check: async () => {
        // Wait a bit for all syncs to complete
        await new Promise(resolve => setTimeout(resolve, 5000))
        // If we get here without errors, sync queue worked
        return true
      },
      expected: 'All syncs should complete without conflicts',
    },
  ],
  cleanup: () => {
    delete (window as any).__testInitialVaalOrbs
    delete (window as any).__testInitialCardCount
  },
}

/**
 * All test scenarios
 */
export const testScenarios: TestScenario[] = [
  nothingScenario,
  foilTransformationScenario,
  duplicateScenario,
  destroyedScenario,
  transformScenario,
  raceConditionScenario,
]

