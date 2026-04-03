import type { PitKeywordDef, PitKeywordId } from '~/types/pit'

/**
 * The Pit V1 — 11 Keywords
 * Spec section 7
 */
export const PIT_KEYWORDS: Record<PitKeywordId, PitKeywordDef> = {
  Strength: {
    id: 'Strength', name: 'Force', category: 'offensive', color: '#e74c3c', icon: '&#9876;',
    description: '+ATK additif. Stack permanent jusqu\'a la fin de la vague.',
    baseValues: [1, 2, 3, 4], // T3, T2, T1, T0
  },
  Block: {
    id: 'Block', name: 'Blocage', category: 'defensive', color: '#3498db', icon: '&#9711;',
    description: 'Absorbe les degats directs. Cap 40. Expire fin de vague.',
    baseValues: [4, 7, 10, 13], cap: 40,
  },
  Plating: {
    id: 'Plating', name: 'Blindage', category: 'defensive', color: '#5dade2', icon: '&#9726;',
    description: 'Block permanent. Ne disparait pas au tick.',
    baseValues: [3, 5, 7, 9],
  },
  Regen: {
    id: 'Regen', name: 'Regen', category: 'defensive', color: '#27ae60', icon: '&#10010;',
    description: 'Toutes les 2s, soigne le montant indique.',
    baseValues: [2, 3, 4, 5],
  },
  Poison: {
    id: 'Poison', name: 'Poison', category: 'offensive', color: '#2ecc71', icon: '&#9762;',
    description: 'Toutes les 2s, inflige X degats puis perd 1 stack. Max 20.',
    baseValues: [1, 2, 3, 4], cap: 20,
  },
  Burn: {
    id: 'Burn', name: 'Brulure', category: 'offensive', color: '#e67e22', icon: '&#9832;',
    description: 'Toutes les 2s, inflige X degats, ignore Block. 6s, refresh. Max 15.',
    baseValues: [2, 3, 4, 5], cap: 15,
  },
  Vulnerable: {
    id: 'Vulnerable', name: 'Vulnerable', category: 'offensive', color: '#e91e63', icon: '&#9888;',
    description: 'Cible subit +30% degats directs.',
    baseValues: [1.5, 2.5, 3.5, 4.5], // duration in seconds
  },
  Lifesteal: {
    id: 'Lifesteal', name: 'Vol de vie', category: 'utility', color: '#c0392b', icon: '&#10084;',
    description: 'Soigne un % des degats directs infliges.',
    baseValues: [4, 6, 8, 10], // percentage
  },
  Dodge: {
    id: 'Dodge', name: 'Esquive', category: 'utility', color: '#1abc9c', icon: '&#10137;',
    description: 'Chance d\'esquiver un hit direct. Cap 40%.',
    baseValues: [5, 8, 11, 14], cap: 40,
  },
  Foresight: {
    id: 'Foresight', name: 'Prevoyance', category: 'utility', color: '#9b59b6', icon: '&#9673;',
    description: 'Revele la prochaine speciale ennemie. +5 SPD pendant le telegraph.',
    baseValues: [2, 3, 4, 5], // seconds of anticipation
  },
  Stagger: {
    id: 'Stagger', name: 'Chancellement', category: 'utility', color: '#f39c12', icon: '&#9733;',
    description: 'Reduit la vitesse d\'action cible de 15% pendant 2s.',
    baseValues: [1, 1, 2, 2], // stacks
  },
}

export function getKeywordDef(id: PitKeywordId | string): PitKeywordDef | undefined {
  return PIT_KEYWORDS[id as PitKeywordId]
}

export function getKeywordBaseValue(id: PitKeywordId, tier: string): number {
  const kw = PIT_KEYWORDS[id]
  if (!kw) return 0
  const idx = tier === 'T3' ? 0 : tier === 'T2' ? 1 : tier === 'T1' ? 2 : 3
  return kw.baseValues[idx] ?? 0
}
