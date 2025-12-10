import type { Card, CardTier } from '~/types/card';
import type { CardGroupWithVariations } from '~/composables/useCardGrouping';
import { TIER_ORDER } from '~/composables/useCardGrouping';

/**
 * Available sort options for cards
 */
export type SortOption = 
  | 'rarity-asc' 
  | 'rarity-desc' 
  | 'alpha-asc' 
  | 'alpha-desc' 
  | 'category-asc' 
  | 'category-desc';

/**
 * Sort option configuration for UI
 */
export interface SortOptionConfig {
  value: SortOption;
  label: string;
}

/**
 * Default sort options - can be used directly or translated via i18n
 */
export const SORT_OPTIONS: SortOptionConfig[] = [
  { value: 'rarity-asc', label: 'Rareté (T0 → T3)' },
  { value: 'rarity-desc', label: 'Rareté (T3 → T0)' },
  { value: 'alpha-asc', label: 'Alphabétique (A → Z)' },
  { value: 'alpha-desc', label: 'Alphabétique (Z → A)' },
  { value: 'category-asc', label: 'Catégorie (A → Z)' },
  { value: 'category-desc', label: 'Catégorie (Z → A)' },
];

/**
 * Interface for sortable items (must have at least these properties)
 */
interface Sortable {
  name: string;
  tier: CardTier;
  itemClass: string;
}

/**
 * Generic sort function that works with both Card and CardGroupWithVariations
 */
function sortByOption<T extends Sortable>(items: T[], sortType: SortOption): T[] {
  return [...items].sort((a, b) => {
    switch (sortType) {
      case 'rarity-asc':
        // T0 first (most rare)
        if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) {
          return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
        }
        return a.name.localeCompare(b.name);

      case 'rarity-desc':
        // T3 first (most common)
        if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) {
          return TIER_ORDER[b.tier] - TIER_ORDER[a.tier];
        }
        return a.name.localeCompare(b.name);

      case 'alpha-asc':
        return a.name.localeCompare(b.name);

      case 'alpha-desc':
        return b.name.localeCompare(a.name);

      case 'category-asc':
        if (a.itemClass !== b.itemClass) {
          return a.itemClass.localeCompare(b.itemClass);
        }
        return a.name.localeCompare(b.name);

      case 'category-desc':
        if (a.itemClass !== b.itemClass) {
          return b.itemClass.localeCompare(a.itemClass);
        }
        return a.name.localeCompare(b.name);

      default:
        return 0;
    }
  });
}

/**
 * Composable for card sorting utilities
 */
export function useCardSorting() {
  /**
   * Sort an array of cards by the specified option
   */
  const sortCards = (cards: Card[], sortType: SortOption): Card[] => {
    return sortByOption(cards, sortType);
  };

  /**
   * Sort an array of grouped cards by the specified option
   */
  const sortGroupedCards = (
    groups: CardGroupWithVariations[], 
    sortType: SortOption
  ): CardGroupWithVariations[] => {
    return sortByOption(groups, sortType);
  };

  return {
    sortCards,
    sortGroupedCards,
    SORT_OPTIONS,
    TIER_ORDER,
  };
}

// Also export the sort function directly for use without the composable
export { sortByOption };

