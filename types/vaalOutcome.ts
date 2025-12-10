/**
 * Vaal Orb Outcome System
 * 
 * Centralized configuration for all Vaal outcomes.
 * Easy to add new outcomes, configure probabilities, and define UI content.
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
  label: string;       // Display label for settings
  emoji: string;       // Emoji for UI
  
  // Share modal content
  shareModal: {
    icon: string;
    title: string;
    text: string;
    linkText: string;
    theme: string;
    buttonClass: string; // CSS class for themed button
  };
  
  // For forced outcome selector
  forcedLabel: string;
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
    label: 'Rien',
    emoji: '😐',
    forcedLabel: '😐 Rien ne se passe',
    shareModal: {
      icon: '😐',
      title: 'Rien ne s\'est passé...',
      text: 'La Vaal Orb a été absorbée sans effet. Pas très excitant, mais tu peux quand même partager ce moment de suspense.',
      linkText: 'Voir le non-événement',
      theme: 'nothing',
      buttonClass: 'share-btn--nothing',
    },
  },
  
  foil: {
    id: 'foil',
    probability: 20, // 20% chance
    label: 'Foil',
    emoji: '✨',
    forcedLabel: '✨ Transformation Foil',
    shareModal: {
      icon: '✨',
      title: 'Transformation légendaire !',
      text: 'La corruption Vaal a béni ta carte d\'un éclat prismatique. Partage ce moment de gloire avec le monde !',
      linkText: 'Admirer le chef-d\'œuvre',
      theme: 'foil',
      buttonClass: 'share-btn--foil',
    },
  },
  
  destroyed: {
    id: 'destroyed',
    probability: 15, // 15% chance
    label: 'Destruction',
    emoji: '💀',
    forcedLabel: '💀 Destruction',
    shareModal: {
      icon: '💀',
      title: 'Destruction immortalisée',
      text: 'Ta carte a été réduite en cendres par la corruption Vaal. Partage ce désastre pour que tous puissent contempler ta chute.',
      linkText: 'Revivre le cauchemar',
      theme: 'destroyed',
      buttonClass: 'share-btn--destroyed',
    },
  },
  
  transform: {
    id: 'transform',
    probability: 15, // 15% chance
    label: 'Transformation',
    emoji: '🔄',
    forcedLabel: '🔄 Transformation en autre carte',
    shareModal: {
      icon: '🔄',
      title: 'Métamorphose Vaal !',
      text: 'La corruption a transformé ta carte en une autre du même tier. Le destin est capricieux... Partage cette mutation !',
      linkText: 'Découvrir la transformation',
      theme: 'transform',
      buttonClass: 'share-btn--transform',
    },
  },
  
  duplicate: {
    id: 'duplicate',
    probability: 10, // 10% chance - rare!
    label: 'Duplication',
    emoji: '👯',
    forcedLabel: '👯 Duplication',
    shareModal: {
      icon: '👯',
      title: 'Duplication miraculeuse !',
      text: 'La Vaal Orb a créé une copie parfaite de ta carte ! Un événement extrêmement rare. Montre au monde cette bénédiction !',
      linkText: 'Voir le miracle',
      theme: 'duplicate',
      buttonClass: 'share-btn--duplicate',
    },
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

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
 * Get forced outcome options for settings dropdown
 */
export function getForcedOutcomeOptions(): Array<{ value: VaalOutcome | 'random'; label: string }> {
  return [
    { value: 'random', label: '🎲 Aléatoire (défaut)' },
    ...getAllOutcomes().map(outcome => ({
      value: outcome.id,
      label: outcome.forcedLabel,
    })),
  ];
}

/**
 * Simulate a random Vaal outcome based on configured probabilities
 */
export function rollVaalOutcome(): VaalOutcome {
  const outcomes = getAllOutcomes();
  const totalWeight = outcomes.reduce((sum, o) => sum + o.probability, 0);
  
  let random = Math.random() * totalWeight;
  
  for (const outcome of outcomes) {
    random -= outcome.probability;
    if (random <= 0) {
      return outcome.id;
    }
  }
  
  // Fallback (shouldn't happen)
  return 'nothing';
}

/**
 * Get share modal content for an outcome
 */
export function getShareModalContent(outcome: VaalOutcome | null) {
  if (!outcome) {
    return {
      icon: '🎬',
      title: 'Session enregistrée !',
      text: 'Ta session a été enregistrée. Partage ce lien pour que d\'autres puissent voir ta Vaal Orb !',
      linkText: 'Voir le replay →',
      theme: 'default',
      buttonClass: 'share-btn--default',
    };
  }
  
  return VAAL_OUTCOMES[outcome].shareModal;
}

