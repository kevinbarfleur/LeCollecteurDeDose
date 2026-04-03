/**
 * The Pit V1 — Card Map
 * Parses the_pit_v1_card_map.csv (506 cards) into PitCardDef[]
 * This runs at build time / app init — the CSV is a static asset.
 */

import type { PitCardDef, PitTier, PitEffectTier, PitKeywordId, PitSlotFamily } from '~/types/pit'
import cardMapRaw from '~/docs/the_pit_v1_card_map.csv?raw'

const KEYWORD_IDS = new Set([
  'Strength', 'Block', 'Plating', 'Regen', 'Poison', 'Burn',
  'Vulnerable', 'Lifesteal', 'Dodge', 'Foresight', 'Stagger',
])

function parseKeyword(val: string): PitKeywordId | 'MapMod' | 'Tactical' {
  if (KEYWORD_IDS.has(val)) return val as PitKeywordId
  if (val === 'MapMod' || val === 'Tactical') return val
  return 'Strength' // fallback
}

function parseTier(val: string): PitTier {
  if (val === 'T0' || val === 'T1' || val === 'T2' || val === 'T3') return val
  return 'T3'
}

function parseEffectTier(val: string): PitEffectTier {
  if (val === 'legendary' || val === 'elite' || val === 'major' || val === 'simple') return val
  return 'simple'
}

function parseSlotFamily(val: string): PitSlotFamily[] {
  return val.split('|').filter(Boolean).map(s => s.trim()) as PitSlotFamily[]
}

function parseCSV(raw: string): PitCardDef[] {
  const lines = raw.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const cards: PitCardDef[] = []

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',')
    if (vals.length < header.length) continue

    const get = (col: string) => {
      const idx = header.indexOf(col)
      return idx >= 0 ? vals[idx]?.trim() ?? '' : ''
    }

    const card: PitCardDef = {
      uid: parseInt(get('uid'), 10),
      id: get('id'),
      name: get('name'),
      rawItemClass: get('item_class'),
      normalizedClass: get('normalized_class'),
      tier: parseTier(get('tier')),
      allowedSlots: parseSlotFamily(get('allowed_slots')),
      profileId: get('profile_id'),
      motif: get('motif'),
      stats: {
        atk: parseInt(get('atk'), 10) || 0,
        def: parseInt(get('def'), 10) || 0,
        hp: parseInt(get('hp'), 10) || 0,
        spd: parseInt(get('spd'), 10) || 0,
        pwr: parseInt(get('pwr'), 10) || 0,
      },
      primaryKeyword: parseKeyword(get('primary_keyword')),
      secondaryKeyword: get('secondary_keyword') ? parseKeyword(get('secondary_keyword')) : undefined,
      effectTier: parseEffectTier(get('effect_tier')),
      archetypeTags: get('archetype_tags').split('|').filter(Boolean),
      isMarquee: get('is_marquee') === '1',
      overrideEffectId: get('override_effect_id') || undefined,
      wikiUrl: get('wiki_url'),
      relevanceScore: parseInt(get('relevance_score'), 10) || 0,
    }

    cards.push(card)
  }

  return cards
}

/** All 506 cards parsed from the CSV */
export const PIT_CARD_MAP: PitCardDef[] = parseCSV(cardMapRaw)

/** Lookup by uid */
export const PIT_CARDS_BY_UID = new Map<number, PitCardDef>(
  PIT_CARD_MAP.map(c => [c.uid, c])
)

/** Lookup by id */
export const PIT_CARDS_BY_ID = new Map<string, PitCardDef>(
  PIT_CARD_MAP.map(c => [c.id, c])
)

/** Get cards that fit a slot family */
export function getCardsForSlot(family: PitSlotFamily): PitCardDef[] {
  return PIT_CARD_MAP.filter(c => c.allowedSlots.includes(family))
}

/** Get cards by tier */
export function getCardsByTier(tier: PitTier): PitCardDef[] {
  return PIT_CARD_MAP.filter(c => c.tier === tier)
}

/**
 * Convert a PitCardDef to a Card object compatible with GameCard.vue
 */
export function pitCardToGameCard(pitCard: PitCardDef): import('~/types/card').Card {
  const imgName = pitCard.name.replace(/ /g, '_')
  const imgUrl = pitCard.wikiUrl
    ? `https://www.poewiki.net/wiki/Special:FilePath/${encodeURIComponent(imgName)}_inventory_icon.png`
    : ''

  return {
    uid: pitCard.uid,
    id: pitCard.id,
    name: pitCard.name,
    itemClass: pitCard.rawItemClass,
    rarity: 'Unique' as any,
    tier: pitCard.tier as any,
    flavourText: null,
    wikiUrl: pitCard.wikiUrl,
    gameData: {
      weight: 0.05,
      img: imgUrl,
    },
  }
}
