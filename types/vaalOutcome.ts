/**
 * Vaal Orb Outcome System
 * 
 * Centralized configuration for all Vaal outcomes.
 * Easy to add new outcomes, configure probabilities, and define UI content.
 * 
 * Note: Labels and texts use i18n keys. Use the helper functions with a 
 * translation function (t) to get translated content.
 */

// ==========================================
// OUTCOME TYPES
// ==========================================

export type VaalOutcome = 
  | 'nothing' 
  | 'foil' 
  | 'destroyed' 
  | 'transform' 
  | 'duplicate';

// ==========================================
// OUTCOME CONFIGURATION
// ==========================================

export interface VaalOutcomeConfig {
  id: VaalOutcome;
  probability: number; // Weight for random selection (not percentage)
  label: string;       // i18n key for display label
  emoji: string;       // Emoji for UI
  
  // Share modal content (i18n keys)
  shareModal: {
    icon: string;
    titleKey: string;
    textKey: string;
    linkTextKey: string;
    theme: string;
    buttonClass: string; // CSS class for themed button
  };
}

/**
 * Complete configuration for all Vaal outcomes
 * Probabilities are weights, not percentages
 * Total weight doesn't need to equal 100
 */
export const VAAL_OUTCOMES: Record<VaalOutcome, VaalOutcomeConfig> = {
  nothing: {
    id: 'nothing',
    probability: 40, // 40% base chance
    label: 'vaalOutcomes.nothing.label',
    emoji: '😐',
    shareModal: {
      icon: '😐',
      titleKey: 'vaalOutcomes.nothing.shareTitle',
      textKey: 'vaalOutcomes.nothing.shareText',
      linkTextKey: 'vaalOutcomes.nothing.shareLinkText',
      theme: 'nothing',
      buttonClass: 'share-btn--nothing',
    },
  },
  
  foil: {
    id: 'foil',
    probability: 20, // 20% chance
    label: 'vaalOutcomes.foil.label',
    emoji: '✨',
    shareModal: {
      icon: '✨',
      titleKey: 'vaalOutcomes.foil.shareTitle',
      textKey: 'vaalOutcomes.foil.shareText',
      linkTextKey: 'vaalOutcomes.foil.shareLinkText',
      theme: 'foil',
      buttonClass: 'share-btn--foil',
    },
  },
  
  destroyed: {
    id: 'destroyed',
    probability: 15, // 15% chance
    label: 'vaalOutcomes.destroyed.label',
    emoji: '💀',
    shareModal: {
      icon: '💀',
      titleKey: 'vaalOutcomes.destroyed.shareTitle',
      textKey: 'vaalOutcomes.destroyed.shareText',
      linkTextKey: 'vaalOutcomes.destroyed.shareLinkText',
      theme: 'destroyed',
      buttonClass: 'share-btn--destroyed',
    },
  },
  
  transform: {
    id: 'transform',
    probability: 15, // 15% chance
    label: 'vaalOutcomes.transform.label',
    emoji: '🔄',
    shareModal: {
      icon: '🔄',
      titleKey: 'vaalOutcomes.transform.shareTitle',
      textKey: 'vaalOutcomes.transform.shareText',
      linkTextKey: 'vaalOutcomes.transform.shareLinkText',
      theme: 'transform',
      buttonClass: 'share-btn--transform',
    },
  },
  
  duplicate: {
    id: 'duplicate',
    probability: 10, // 10% chance - rare!
    label: 'vaalOutcomes.duplicate.label',
    emoji: '👯',
    shareModal: {
      icon: '👯',
      titleKey: 'vaalOutcomes.duplicate.shareTitle',
      textKey: 'vaalOutcomes.duplicate.shareText',
      linkTextKey: 'vaalOutcomes.duplicate.shareLinkText',
      theme: 'duplicate',
      buttonClass: 'share-btn--duplicate',
    },
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

type TranslationFunction = (key: string) => string;

/**
 * Get outcome configuration by ID
 */
export function getOutcomeConfig(outcome: VaalOutcome): VaalOutcomeConfig {
  return VAAL_OUTCOMES[outcome];
}

/**
 * Get all outcomes as array for iteration
 */
export function getAllOutcomes(): VaalOutcomeConfig[] {
  return Object.values(VAAL_OUTCOMES);
}

/**
 * Get forced outcome options for settings dropdown (with translations)
 * @param t - Translation function from useI18n()
 */
export function getForcedOutcomeOptions(t: TranslationFunction): Array<{ value: VaalOutcome | 'random'; label: string }> {
  return [
    { value: 'random', label: `🎲 ${t('vaalOutcomes.random')}` },
    ...getAllOutcomes().map(outcome => ({
      value: outcome.id,
      label: `${outcome.emoji} ${t(outcome.label)}`,
    })),
  ];
}

/**
 * Simulate a random Vaal outcome based on configured probabilities
 * @param foilBoost - Optional boost to foil probability (0.10 = +10% weight added to foil)
 */
export function rollVaalOutcome(foilBoost: number = 0): VaalOutcome {
  const outcomes = getAllOutcomes();

  // Apply foil boost if provided (convert decimal to weight: 0.10 = +10 weight)
  const adjustedOutcomes = foilBoost > 0
    ? outcomes.map(o => ({
        ...o,
        probability: o.id === 'foil' ? o.probability + (foilBoost * 100) : o.probability
      }))
    : outcomes;

  const totalWeight = adjustedOutcomes.reduce((sum, o) => sum + o.probability, 0);

  let random = Math.random() * totalWeight;

  for (const outcome of adjustedOutcomes) {
    random -= outcome.probability;
    if (random <= 0) {
      return outcome.id;
    }
  }

  // Fallback (shouldn't happen)
  return 'nothing';
}

/**
 * Get share modal content for an outcome (with translations)
 * @param outcome - The Vaal outcome
 * @param t - Translation function from useI18n()
 */
export function getShareModalContent(outcome: VaalOutcome | null, t: TranslationFunction) {
  if (!outcome) {
    return {
      icon: '🎬',
      title: t('vaalOutcomes.nothing.shareTitle'),
      text: t('vaalOutcomes.nothing.shareText'),
      linkText: t('vaalOutcomes.nothing.shareLinkText'),
      theme: 'default',
      buttonClass: 'share-btn--default',
    };
  }

  const config = VAAL_OUTCOMES[outcome].shareModal;
  return {
    icon: config.icon,
    title: t(config.titleKey),
    text: t(config.textKey),
    linkText: t(config.linkTextKey),
    theme: config.theme,
    buttonClass: config.buttonClass,
  };
}

// ==========================================
// EDGE FUNCTION TYPES
// ==========================================

export type CardTier = 'T0' | 'T1' | 'T2' | 'T3';

/**
 * Request payload for the vaal-outcome Edge Function
 */
export interface VaalOutcomeRequest {
  username: string;
  cardUid: number;
  cardTier: CardTier;
  isFoil: boolean;
}

/**
 * Card data returned by the Edge Function for transform outcomes
 */
export interface VaalOutcomeNewCard {
  uid: number;
  id: string;
  name: string;
  tier: string;
  game_data: {
    img?: string;
    foilImg?: string;
    weight?: number;
  };
}

/**
 * Error codes from the Edge Function
 */
export type VaalOutcomeErrorCode =
  | 'INSUFFICIENT_ORBS'
  | 'CARD_NOT_FOUND'
  | 'FOIL_CARD'
  | 'INVALID_USER'
  | 'INTERNAL_ERROR';

/**
 * Response from the vaal-outcome Edge Function
 */
export interface VaalOutcomeResponse {
  success: boolean;
  outcome?: VaalOutcome;
  newCard?: VaalOutcomeNewCard;
  vaalOrbs?: number;
  atlasInfluenceConsumed?: boolean;
  error?: string;
  errorCode?: VaalOutcomeErrorCode;
}

