import { computed, type Ref } from 'vue';
import type { Card, CardTier, CardVariation } from '~/types/card';
import { VARIATION_CONFIG, getCardVariation } from '~/types/card';

/**
 * Represents a group of cards with the same variation
 */
export interface VariationGroup {
  variation: CardVariation;
  cards: Card[];
  count: number;
}

/**
 * Represents a group of cards with the same base card ID but potentially different variations
 */
export interface CardGroupWithVariations {
  cardId: string;
  name: string;
  tier: CardTier;
  itemClass: string;
  cards: Card[];
  count: number;
  variations: VariationGroup[];
  hasMultipleVariations: boolean;
}

/**
 * Options for sorting grouped cards
 */
export interface GroupingOptions {
  /** Whether to also sort by name within the same tier (default: true) */
  sortByNameWithinTier?: boolean;
}

/** Standard tier ordering (T0 = most rare, T3 = most common) */
export const TIER_ORDER: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

/**
 * Groups a collection of cards by their base ID, tracking variations (standard/foil)
 * 
 * @param collection - Reactive reference to the card collection
 * @param options - Grouping options
 * @returns Computed array of card groups sorted by tier
 */
export function useCardGrouping(
  collection: Ref<Card[]>,
  options: GroupingOptions = {}
) {
  const { sortByNameWithinTier = true } = options;

  const groupedCards = computed<CardGroupWithVariations[]>(() => {
    const groups = new Map<string, CardGroupWithVariations>();

    collection.value.forEach((card) => {
      const variation: CardVariation = getCardVariation(card);
      const existing = groups.get(card.id);

      if (existing) {
        existing.cards.push(card);
        existing.count++;

        // Update variation groups
        const existingVariation = existing.variations.find(
          (v) => v.variation === variation
        );
        if (existingVariation) {
          existingVariation.cards.push(card);
          existingVariation.count++;
        } else {
          existing.variations.push({
            variation,
            cards: [card],
            count: 1,
          });
        }
      } else {
        groups.set(card.id, {
          cardId: card.id,
          name: card.name,
          tier: card.tier,
          itemClass: card.itemClass,
          cards: [card],
          count: 1,
          variations: [
            {
              variation,
              cards: [card],
              count: 1,
            },
          ],
          hasMultipleVariations: false,
        });
      }
    });

    // Sort variations by priority (foil first) and update hasMultipleVariations flag
    groups.forEach((group) => {
      group.variations.sort(
        (a, b) =>
          VARIATION_CONFIG[a.variation].priority -
          VARIATION_CONFIG[b.variation].priority
      );
      group.hasMultipleVariations = group.variations.length > 1;
    });

    // Sort by tier (and optionally by name within tier)
    return Array.from(groups.values()).sort((a, b) => {
      if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) {
        return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
      }
      return sortByNameWithinTier ? a.name.localeCompare(b.name) : 0;
    });
  });

  /**
   * Get the first card of the best (rarest) variation for a given group
   */
  const getBestVariationCard = (group: CardGroupWithVariations): Card | null => {
    if (group.variations.length === 0 || group.variations[0].cards.length === 0) {
      return null;
    }
    return group.variations[0].cards[0];
  };

  /**
   * Generate options for a select component from grouped cards
   */
  const cardOptions = computed(() =>
    groupedCards.value.map((group) => ({
      value: group.cardId,
      label: group.name,
      description: `${group.itemClass} • ${group.tier}`,
      count: group.count,
    }))
  );

  return {
    groupedCards,
    cardOptions,
    getBestVariationCard,
    TIER_ORDER,
  };
}

