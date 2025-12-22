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

// Standard Vaal outcomes (for normal cards)
export type VaalOutcome =
  | 'nothing'
  | 'foil'
  | 'destroyed'
  | 'transform'
  | 'duplicate';

// Foil Vaal outcomes (for foil cards only)
export type FoilVaalOutcome =
  | 'synthesised'  // 10% - Card becomes synthesised (rarest)
  | 'lose_foil'    // 50% - Card loses foil, becomes normal
  | 'destroyed';   // 40% - Card is destroyed

// Combined type for all possible outcomes
export type AnyVaalOutcome = VaalOutcome | FoilVaalOutcome;

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
// FOIL VAAL OUTCOMES CONFIGURATION
// Special outcomes when using Vaal Orb on a foil card
// ==========================================

export interface FoilVaalOutcomeConfig {
  id: FoilVaalOutcome;
  probability: number;
  label: string;
  emoji: string;
  shareModal: {
    icon: string;
    titleKey: string;
    textKey: string;
    linkTextKey: string;
    theme: string;
    buttonClass: string;
  };
}

export const FOIL_VAAL_OUTCOMES: Record<FoilVaalOutcome, FoilVaalOutcomeConfig> = {
  synthesised: {
    id: 'synthesised',
    probability: 10, // 10% chance - VERY rare!
    label: 'vaalOutcomes.synthesised.label',
    emoji: '⚡',
    shareModal: {
      icon: '⚡',
      titleKey: 'vaalOutcomes.synthesised.shareTitle',
      textKey: 'vaalOutcomes.synthesised.shareText',
      linkTextKey: 'vaalOutcomes.synthesised.shareLinkText',
      theme: 'synthesised',
      buttonClass: 'share-btn--synthesised',
    },
  },

  lose_foil: {
    id: 'lose_foil',
    probability: 50, // 50% chance - most common
    label: 'vaalOutcomes.lose_foil.label',
    emoji: '💫',
    shareModal: {
      icon: '💫',
      titleKey: 'vaalOutcomes.lose_foil.shareTitle',
      textKey: 'vaalOutcomes.lose_foil.shareText',
      linkTextKey: 'vaalOutcomes.lose_foil.shareLinkText',
      theme: 'lose_foil',
      buttonClass: 'share-btn--lose_foil',
    },
  },

  destroyed: {
    id: 'destroyed',
    probability: 40, // 40% chance - risky!
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
 * Includes both normal and foil-specific outcomes for debug testing
 * @param t - Translation function from useI18n()
 */
export function getForcedOutcomeOptions(t: TranslationFunction): Array<{ value: AnyVaalOutcome | 'random'; label: string; group?: string }> {
  const normalOutcomes = getAllOutcomes().map(outcome => ({
    value: outcome.id as AnyVaalOutcome,
    label: `${outcome.emoji} ${t(outcome.label)}`,
    group: 'normal',
  }));

  // Get foil-specific outcomes (synthesised, lose_foil) - skip 'destroyed' as it's already in normal
  const foilOnlyOutcomes = getAllFoilOutcomes()
    .filter(o => o.id !== 'destroyed')
    .map(outcome => ({
      value: outcome.id as AnyVaalOutcome,
      label: `${outcome.emoji} ${t(outcome.label)} (Foil)`,
      group: 'foil',
    }));

  return [
    { value: 'random', label: `🎲 ${t('vaalOutcomes.random')}` },
    ...normalOutcomes,
    ...foilOnlyOutcomes,
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
 * Get all foil Vaal outcomes as array for iteration
 */
export function getAllFoilOutcomes(): FoilVaalOutcomeConfig[] {
  return Object.values(FOIL_VAAL_OUTCOMES);
}

/**
 * Get foil outcome configuration by ID
 */
export function getFoilOutcomeConfig(outcome: FoilVaalOutcome): FoilVaalOutcomeConfig {
  return FOIL_VAAL_OUTCOMES[outcome];
}

/**
 * Simulate a random Vaal outcome for a FOIL card
 * Different probabilities: 10% synthesised, 50% lose foil, 40% destroyed
 */
export function rollFoilVaalOutcome(): FoilVaalOutcome {
  const outcomes = getAllFoilOutcomes();
  const totalWeight = outcomes.reduce((sum, o) => sum + o.probability, 0);

  let random = Math.random() * totalWeight;

  for (const outcome of outcomes) {
    random -= outcome.probability;
    if (random <= 0) {
      return outcome.id;
    }
  }

  // Fallback (shouldn't happen)
  return 'lose_foil';
}

/**
 * Get share modal content for an outcome (with translations)
 * @param outcome - The Vaal outcome
 * @param t - Translation function from useI18n()
 */
export function getShareModalContent(outcome: AnyVaalOutcome | null, t: TranslationFunction) {
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

  // Check if it's a foil-specific outcome
  const isFoilOutcome = outcome === 'synthesised' || outcome === 'lose_foil';
  const config = isFoilOutcome
    ? FOIL_VAAL_OUTCOMES[outcome as FoilVaalOutcome].shareModal
    : VAAL_OUTCOMES[outcome as VaalOutcome].shareModal;

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
  | 'INVALID_USER'
  | 'INTERNAL_ERROR';

/**
 * Response from the vaal-outcome Edge Function
 */
export interface VaalOutcomeResponse {
  success: boolean;
  outcome?: AnyVaalOutcome;
  newCard?: VaalOutcomeNewCard;
  vaalOrbs?: number;
  atlasInfluenceConsumed?: boolean;
  isFoilOutcome?: boolean;  // True if this was a foil card outcome
  error?: string;
  errorCode?: VaalOutcomeErrorCode;
}

