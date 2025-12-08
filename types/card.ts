export type CardTier = 'T0' | 'T1' | 'T2' | 'T3'

export type CardRarity = 'Unique' | 'Rare' | 'Magic' | 'Normal'

// Card variations (extensible for future variations)
export type CardVariation = 'standard' | 'foil'

// Configuration for card variations - lower priority = rarer
export interface VariationConfig {
  priority: number
  label: string
}

export const VARIATION_CONFIG: Record<CardVariation, VariationConfig> = {
  foil: { priority: 0, label: 'Foil' },
  standard: { priority: 1, label: 'Standard' }
}

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
  foil?: boolean  // true if foil variant
  variation?: CardVariation  // DEPRECATED: use foil instead - kept for backwards compatibility
}

// Helper function to check if a card is foil (supports both formats)
export function isCardFoil(card: Card): boolean {
  return card.foil === true || card.variation === 'foil'
}

// Helper function to get the variation of a card
export function getCardVariation(card: Card): CardVariation {
  return isCardFoil(card) ? 'foil' : 'standard'
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
  label: string
}

// "Glyphes Éteints" palette - Dark, runic aesthetic
export const TIER_CONFIG: Record<CardTier, TierConfig> = {
  T0: {
    color: '#6d5a2a',      // Ambre sombre
    glowColor: '#c9a227',  // Lueur chaude
    label: 'T0'
  },
  T1: {
    color: '#3a3445',      // Obsidienne
    glowColor: '#7a6a8a',  // Lueur froide
    label: 'T1'
  },
  T2: {
    color: '#3a4550',      // Ardoise
    glowColor: '#5a7080',  // Éclat subtil
    label: 'T2'
  },
  T3: {
    color: '#2a2a2d',      // Basalte
    glowColor: '#4a4a4d',
    label: 'T3'
  }
}

