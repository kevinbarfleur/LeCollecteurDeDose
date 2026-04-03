import type { PitCardDef } from '~/types/pit'

/**
 * The Pit V1 — Starter Rack
 * Spec section 12: 10 starter cards for players with small collections
 */
export const PIT_STARTER_RACK: PitCardDef[] = [
  {
    uid: 800001, id: 'pit_rustblade', name: 'Pit Rustblade',
    rawItemClass: 'One-Handed Sword', normalizedClass: 'sword_1h', tier: 'T3',
    allowedSlots: ['mainhand'], profileId: 'assault_balanced', motif: 'neutral',
    stats: { atk: 6, def: 1, hp: 0, spd: 2, pwr: 0 },
    primaryKeyword: 'Strength', effectTier: 'simple', archetypeTags: ['assault'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800002, id: 'pit_fang_knife', name: 'Pit Fang Knife',
    rawItemClass: 'Dagger', normalizedClass: 'dagger', tier: 'T3',
    allowedSlots: ['mainhand', 'offhand'], profileId: 'venom_burst', motif: 'venom',
    stats: { atk: 3, def: 0, hp: 0, spd: 4, pwr: 2 },
    primaryKeyword: 'Poison', effectTier: 'simple', archetypeTags: ['venom'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800003, id: 'pit_splinterguard', name: 'Pit Splinterguard',
    rawItemClass: 'Shield', normalizedClass: 'shield', tier: 'T3',
    allowedSlots: ['offhand'], profileId: 'bastion_guard', motif: 'bastion',
    stats: { atk: 0, def: 7, hp: 3, spd: 0, pwr: 2 },
    primaryKeyword: 'Block', effectTier: 'simple', archetypeTags: ['bastion'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800004, id: 'pit_split_quiver', name: 'Pit Split Quiver',
    rawItemClass: 'Quiver', normalizedClass: 'quiver', tier: 'T3',
    allowedSlots: ['offhand'], profileId: 'hunter_support', motif: 'tempo',
    stats: { atk: 2, def: 0, hp: 0, spd: 2, pwr: 1 },
    primaryKeyword: 'Vulnerable', effectTier: 'simple', archetypeTags: ['hunter'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800005, id: 'pit_patchcoat', name: 'Pit Patchcoat',
    rawItemClass: 'Body Armour', normalizedClass: 'body', tier: 'T3',
    allowedSlots: ['body'], profileId: 'bastion_shell', motif: 'bastion',
    stats: { atk: 0, def: 7, hp: 5, spd: 0, pwr: 0 },
    primaryKeyword: 'Plating', effectTier: 'simple', archetypeTags: ['bastion'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800006, id: 'pit_raghelm', name: 'Pit Raghelm',
    rawItemClass: 'Helmet', normalizedClass: 'helmet', tier: 'T3',
    allowedSlots: ['minor'], profileId: 'seer_helm', motif: 'insight',
    stats: { atk: 0, def: 3, hp: 2, spd: 0, pwr: 2 },
    primaryKeyword: 'Foresight', effectTier: 'simple', archetypeTags: ['insight'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800007, id: 'pit_copper_loop', name: 'Pit Copper Loop',
    rawItemClass: 'Ring', normalizedClass: 'ring', tier: 'T3',
    allowedSlots: ['charm'], profileId: 'volatile_charm', motif: 'neutral',
    stats: { atk: 2, def: 0, hp: 0, spd: 1, pwr: 3 },
    primaryKeyword: 'Strength', effectTier: 'simple', archetypeTags: ['assault'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800008, id: 'pit_pilgrim_knot', name: 'Pit Pilgrim Knot',
    rawItemClass: 'Amulet', normalizedClass: 'amulet', tier: 'T3',
    allowedSlots: ['charm'], profileId: 'support_charm', motif: 'neutral',
    stats: { atk: 2, def: 2, hp: 2, spd: 1, pwr: 4 },
    primaryKeyword: 'Regen', effectTier: 'simple', archetypeTags: ['sustain'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800009, id: 'pit_plain_idol', name: 'Pit Plain Idol',
    rawItemClass: 'Jewel', normalizedClass: 'jewel', tier: 'T3',
    allowedSlots: ['focus'], profileId: 'focus_engine', motif: 'insight',
    stats: { atk: 0, def: 0, hp: 0, spd: 0, pwr: 7 },
    primaryKeyword: 'Foresight', effectTier: 'simple', archetypeTags: ['focus'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
  {
    uid: 800010, id: 'pit_dull_phial', name: 'Pit Dull Phial',
    rawItemClass: 'Utility Flask', normalizedClass: 'flask', tier: 'T3',
    allowedSlots: ['tactical'], profileId: 'flask_tactical', motif: 'bastion',
    stats: { atk: 0, def: 0, hp: 2, spd: 1, pwr: 2 },
    primaryKeyword: 'Tactical', effectTier: 'simple', archetypeTags: ['bastion'],
    isMarquee: false, wikiUrl: '', relevanceScore: 0,
  },
]

export const STARTER_UIDS = new Set(PIT_STARTER_RACK.map(c => c.uid))

export function isStarterCard(uid: number): boolean {
  return STARTER_UIDS.has(uid)
}
