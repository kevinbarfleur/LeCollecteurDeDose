import type { PitCardDef, PitSlotFamily } from '~/types/pit'
import { PIT_CARD_MAP } from '~/game/pit/content/cardMap'
import { PIT_STARTER_RACK } from '~/game/pit/content/starterRack'

/**
 * The Pit V1 — Draft System
 * Spec section 11: 20 cards, quotas by slot family, starter rack fills
 */

const DRAFT_QUOTAS: Record<PitSlotFamily, number> = {
  mainhand: 3,
  offhand: 2,
  body: 2,
  minor: 3,
  charm: 7,
  focus: 2,
  tactical: 1,
}

const DRAFT_SIZE = 20

export interface DraftResult {
  cards: PitCardDef[]
  starterFills: number // how many came from starter rack
}

/**
 * Build a daily draft from the player's collection.
 * @param playerCardUids - UIDs the player owns
 * @param seed - daily seed for determinism
 */
export function buildDraft(playerCardUids: Set<number>, seed: number): DraftResult {
  const rng = seededRng(seed)

  // Build player pool: cards they own from the card map
  const playerPool = PIT_CARD_MAP.filter(c => playerCardUids.has(c.uid))

  // Group by slot family
  const byFamily = groupByFamily(playerPool)

  // Fill quotas
  const draft: PitCardDef[] = []
  const usedUids = new Set<number>()
  let starterFills = 0

  for (const [family, quota] of Object.entries(DRAFT_QUOTAS) as [PitSlotFamily, number][]) {
    let available = shuffle(byFamily[family] ?? [], rng).filter(c => !usedUids.has(c.uid))
    let filled = 0

    // Take from player pool
    for (const card of available) {
      if (filled >= quota) break
      draft.push(card)
      usedUids.add(card.uid)
      filled++
    }

    // Fill gaps from starter rack
    if (filled < quota) {
      const starters = PIT_STARTER_RACK.filter(c =>
        c.allowedSlots.includes(family) && !usedUids.has(c.uid)
      )
      for (const starter of starters) {
        if (filled >= quota) break
        draft.push(starter)
        usedUids.add(starter.uid)
        filled++
        starterFills++
      }
    }
  }

  return { cards: shuffle(draft.slice(0, DRAFT_SIZE), rng), starterFills }
}

/**
 * Group cards by their primary slot family.
 * A card with allowedSlots=['mainhand', 'offhand'] goes into both groups.
 */
function groupByFamily(cards: PitCardDef[]): Record<PitSlotFamily, PitCardDef[]> {
  const groups: Record<PitSlotFamily, PitCardDef[]> = {
    mainhand: [], offhand: [], body: [], minor: [],
    charm: [], focus: [], tactical: [],
  }
  for (const card of cards) {
    for (const slot of card.allowedSlots) {
      groups[slot]?.push(card)
    }
  }
  return groups
}

// ============================================================================
// SEEDED RNG
// ============================================================================

function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
