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
  foilImg?: string  // Optional foil image URL from POE wiki
}

export interface Card {
  uid: number
  id: string
  name: string
  itemClass: string
  rarity: CardRarity
  tier: CardTier
  flavourText: string | null  // Can be null in POE wiki data
  wikiUrl: string
  gameData: CardGameData
  weight?: number
  foil?: boolean  // true if foil variant
  variation?: CardVariation  // DEPRECATED: use foil instead - kept for backwards compatibility
  relevanceScore?: number  // Optional score from POE wiki data
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

// Re-export tier config from centralized colors
export { TIER_STYLE_CONFIG as TIER_CONFIG } from '~/constants/colors'
export type { TierStyleConfig as TierConfig } from '~/constants/colors'

