export type CardTier = 'T0' | 'T1' | 'T2' | 'T3'

export type CardRarity = 'Unique' | 'Rare' | 'Magic' | 'Normal'

// Card variations (extensible for future variations)
export type CardVariation = 'standard' | 'foil' | 'synthesised'

// Configuration for card variations - lower priority = rarer
export interface VariationConfig {
  priority: number
  label: string
}

export const VARIATION_CONFIG: Record<CardVariation, VariationConfig> = {
  synthesised: { priority: 0, label: 'Synthesised' }, // Rarest - only from Vaal orb on foil
  foil: { priority: 1, label: 'Foil' },
  standard: { priority: 2, label: 'Standard' }
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
  synthesised?: boolean  // true if synthesised variant (obtained by Vaal orb on foil)
  variation?: CardVariation  // DEPRECATED: use foil/synthesised instead - kept for backwards compatibility
  relevanceScore?: number  // Optional score from POE wiki data
  isLimited?: boolean  // true if card has limited information (no name, img, wikiUrl) - for non-owned cards in catalogue
}

// Helper function to check if a card is foil (supports both formats)
export function isCardFoil(card: Card): boolean {
  return card.foil === true || card.variation === 'foil'
}

// Helper function to check if a card is synthesised
export function isCardSynthesised(card: Card): boolean {
  return card.synthesised === true || card.variation === 'synthesised'
}

// Helper function to get the variation of a card
export function getCardVariation(card: Card): CardVariation {
  if (isCardSynthesised(card)) return 'synthesised'
  if (isCardFoil(card)) return 'foil'
  return 'standard'
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

// Import colors from centralized source
import { TIER_COLORS } from '~/constants/colors'

// "Glyphes Éteints" palette - Dark, runic aesthetic
// Colors are imported from constants/colors.ts for consistency
export const TIER_CONFIG: Record<CardTier, TierConfig> = {
  T0: {
    color: TIER_COLORS.T0.bg,
    glowColor: TIER_COLORS.T0.primary,
    label: 'T0'
  },
  T1: {
    color: TIER_COLORS.T1.bg,
    glowColor: TIER_COLORS.T1.primary,
    label: 'T1'
  },
  T2: {
    color: TIER_COLORS.T2.bg,
    glowColor: TIER_COLORS.T2.primary,
    label: 'T2'
  },
  T3: {
    color: TIER_COLORS.T3.bg,
    glowColor: TIER_COLORS.T3.primary,
    label: 'T3'
  }
}

