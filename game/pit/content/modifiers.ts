import type { PitModifierDef } from '~/types/pit'

/**
 * The Pit V1 — 8 Daily Modifiers
 * Spec section 14
 */
export const PIT_MODIFIERS: PitModifierDef[] = [
  // Positive
  { id: 'adrenaline', name: 'Adrenaline', description: '+12 SPD', type: 'positive',
    apply: s => ({ ...s, spd: s.spd + 12 }) },
  { id: 'sanctified', name: 'Sanctifie', description: 'Regen +2 permanent', type: 'positive',
    apply: s => s, applyKeywords: [{ id: 'Regen', value: 2 }] },
  { id: 'sharpened', name: 'Affute', description: '+15% degats directs', type: 'positive',
    apply: s => ({ ...s, atk: Math.round(s.atk * 1.15) }) },
  { id: 'warded', name: 'Protege', description: 'Debut de vague: Block 6', type: 'positive',
    apply: s => s, applyKeywords: [{ id: 'Block', value: 6 }] },
  // Negative
  { id: 'heavy_air', name: 'Air Lourd', description: '-10 SPD', type: 'negative',
    apply: s => ({ ...s, spd: Math.max(0, s.spd - 10) }) },
  { id: 'cursed_ground', name: 'Sol Maudit', description: '-15 DEF', type: 'negative',
    apply: s => ({ ...s, def: Math.max(0, s.def - 15) }) },
  { id: 'volatile', name: 'Volatile', description: 'Debut de vague: Burn 2 sur le joueur', type: 'negative',
    apply: s => s, applyKeywords: [{ id: 'Burn', value: 2 }] },
  { id: 'frailty', name: 'Fragilite', description: '-15 max HP', type: 'negative',
    apply: s => ({ ...s, hp: Math.max(10, s.hp - 15) }) },
]

export const PIT_MODIFIERS_BY_ID = new Map(PIT_MODIFIERS.map(m => [m.id, m]))
