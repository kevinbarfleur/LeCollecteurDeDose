import type { PitCardDef, PitSlotId, PitLoadout, PitLoadoutSlot, PitSlotFamily } from '~/types/pit'
import { PIT_ALL_SLOTS } from '~/types/pit'

/**
 * The Pit V1 — Loadout Legality
 * Spec section 1: slot rules, 2H disable, bow+quiver, etc.
 */

const TWO_HAND_CLASSES = new Set(['axe_2h', 'staff', 'warstaff'])
const ONE_HAND_WEAPONS = new Set(['sword_1h', 'rapier_1h', 'axe_1h', 'mace_1h', 'claw', 'dagger', 'rune_dagger', 'wand', 'sceptre'])

const SLOT_FAMILIES: Record<PitSlotId, PitSlotFamily[]> = {
  mainhand: ['mainhand'],
  offhand: ['offhand'],
  body: ['body'],
  minor: ['minor'],
  charm1: ['charm'],
  charm2: ['charm'],
  focus: ['focus'],
  tactical: ['tactical'],
}

const SLOT_LABELS: Record<PitSlotId, string> = {
  mainhand: 'Arme principale',
  offhand: 'Main secondaire',
  body: 'Armure',
  minor: 'Casque / Bottes / Gants',
  charm1: 'Charm A',
  charm2: 'Charm B',
  focus: 'Focus',
  tactical: 'Tactique',
}

const SLOT_ICONS: Record<PitSlotId, string> = {
  mainhand: '&#9876;',
  offhand: '&#9711;',
  body: '&#9899;',
  minor: '&#9872;',
  charm1: '&#9830;',
  charm2: '&#9830;',
  focus: '&#9733;',
  tactical: '&#9883;',
}

export function createEmptyLoadoutSlots(): Record<PitSlotId, PitLoadoutSlot> {
  const slots: Record<string, PitLoadoutSlot> = {}
  for (const slotId of PIT_ALL_SLOTS) {
    slots[slotId] = {
      id: slotId,
      label: SLOT_LABELS[slotId],
      icon: SLOT_ICONS[slotId],
      acceptsFamily: SLOT_FAMILIES[slotId],
      card: null,
      isDisabled: false,
    }
  }
  return slots as Record<PitSlotId, PitLoadoutSlot>
}

/**
 * Check if a card can go in a specific slot, considering current loadout state.
 */
export function canPlaceCard(card: PitCardDef, slotId: PitSlotId, slots: Record<PitSlotId, PitLoadoutSlot>): boolean {
  const slot = slots[slotId]
  if (!slot || slot.isDisabled) return false

  // Check if card's allowed_slots match the slot's accepted families
  const accepts = slot.acceptsFamily
  const cardFits = card.allowedSlots.some(f => accepts.includes(f))
  if (!cardFits) return false

  // Special rules for offhand
  if (slotId === 'offhand') {
    const mainhand = slots.mainhand.card
    if (!mainhand) return true // Can place before mainhand

    // If mainhand is 2H, offhand is disabled
    if (TWO_HAND_CLASSES.has(mainhand.normalizedClass)) return false

    // If mainhand is Bow, offhand only accepts Quiver
    if (mainhand.normalizedClass === 'bow') {
      return card.normalizedClass === 'quiver'
    }

    // Otherwise: Shield, Quiver, or 1H weapon
    return card.normalizedClass === 'shield' ||
           card.normalizedClass === 'quiver' ||
           ONE_HAND_WEAPONS.has(card.normalizedClass)
  }

  return true
}

/**
 * Update slot disabled states based on mainhand.
 */
export function updateSlotStates(slots: Record<PitSlotId, PitLoadoutSlot>): void {
  const mainhand = slots.mainhand.card

  // Reset offhand state
  slots.offhand.isDisabled = false
  slots.offhand.disabledReason = undefined

  if (mainhand && TWO_HAND_CLASSES.has(mainhand.normalizedClass)) {
    slots.offhand.isDisabled = true
    slots.offhand.disabledReason = 'Arme a deux mains equipee'
    slots.offhand.card = null // Force clear
  }
}

/**
 * Check if a loadout is valid (all core slots filled).
 */
export function isLoadoutValid(slots: Record<PitSlotId, PitLoadoutSlot>): boolean {
  const coreSlots: PitSlotId[] = ['mainhand', 'body', 'minor', 'charm1', 'charm2', 'focus']
  return coreSlots.every(s => slots[s].card !== null)
}

/**
 * Extract a PitLoadout from slots.
 */
export function extractLoadout(slots: Record<PitSlotId, PitLoadoutSlot>): PitLoadout {
  return {
    mainhand: slots.mainhand.card!.uid,
    offhand: slots.offhand.card?.uid ?? null,
    body: slots.body.card!.uid,
    minor: slots.minor.card!.uid,
    charm1: slots.charm1.card!.uid,
    charm2: slots.charm2.card!.uid,
    focus: slots.focus.card!.uid,
    tactical: slots.tactical.card?.uid ?? null,
  }
}
