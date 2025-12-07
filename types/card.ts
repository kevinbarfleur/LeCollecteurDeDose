export type CardTier = 'T0' | 'T1' | 'T2' | 'T3'

export type CardRarity = 'Unique' | 'Rare' | 'Magic' | 'Normal'

export interface CardGameData {
  weight: number
  img: string
}

export interface Card {
  uid: number
  id: string
  name: string
  itemClass: string
  rarity: CardRarity
  tier: CardTier
  flavourText: string
  wikiUrl: string
  gameData: CardGameData
  weight?: number
}

export interface UserCollection {
  username: string
  twitchId: string
  cards: Card[]
  totalValue?: number
}

// Helper type for tier styling
export interface TierConfig {
  color: string
  glowColor: string
  holoIntensity: number
  label: string
}

export const TIER_CONFIG: Record<CardTier, TierConfig> = {
  T0: {
    color: '#b8860b',
    glowColor: '#ffd700',
    holoIntensity: 0.45,
    label: 'Légendaire'
  },
  T1: {
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    holoIntensity: 0.35,
    label: 'Rare'
  },
  T2: {
    color: '#38bdf8',
    glowColor: '#7dd3fc',
    holoIntensity: 0.25,
    label: 'Peu commun'
  },
  T3: {
    color: '#94a3b8',
    glowColor: '#cbd5e1',
    holoIntensity: 0,
    label: 'Commun'
  }
}

