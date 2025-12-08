<script setup lang="ts">
import type { Card, CardVariation } from "~/types/card";
import { useAutoAnimate } from "@formkit/auto-animate/vue";

const { t } = useI18n();

// Type for variation groups within a card group
interface VariationGroup {
  variation: CardVariation;
  cards: Card[];
  count: number;
}

// Type for grouped cards with variation info
interface CardGroup {
  cards: Card[];
  count: number;
  variations?: VariationGroup[];
  hasMultipleVariations?: boolean;
}

const props = defineProps<{
  cards?: Card[];
  groupedCards?: CardGroup[];
  emptyMessage?: string;
  ownedCardIds?: string[];
}>();

const displayEmptyMessage = computed(
  () => props.emptyMessage || t("cards.empty")
);

const isCardOwned = (cardId: string): boolean => {
  if (!props.ownedCardIds) return true;
  return props.ownedCardIds.includes(cardId);
};

const isGroupedMode = computed(
  () =>
    props.groupedCards !== undefined &&
    props.groupedCards !== null &&
    props.groupedCards.length > 0
);

const hasItems = computed(() => {
  if (isGroupedMode.value) {
    return props.groupedCards && props.groupedCards.length > 0;
  }
  return (
    props.cards !== undefined && props.cards !== null && props.cards.length > 0
  );
});

const safeGroupedCards = computed(() => props.groupedCards || []);
const safeCards = computed(() => props.cards || []);

const [gridRef] = useAutoAnimate({
  duration: 400,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
});
</script>

<template>
  <div class="relative">
    <div v-if="isGroupedMode && hasItems" ref="gridRef" class="card-grid">
      <div
        v-for="group in safeGroupedCards"
        :key="group.cards[0].id"
        class="card-grid__item"
      >
        <GameCard
          v-if="group.count === 1"
          :card="group.cards[0]"
          :show-flavour="false"
          :owned="isCardOwned(group.cards[0].id)"
        />
        <CardStack
          v-else
          :cards="group.cards"
          :count="group.count"
          :variations="group.variations"
          :has-multiple-variations="group.hasMultipleVariations ?? false"
        />
      </div>
    </div>

    <div v-else-if="!isGroupedMode && hasItems" ref="gridRef" class="card-grid">
      <div
        v-for="(card, index) in safeCards"
        :key="`${card.id}-${card.uid}`"
        class="card-grid__item"
      >
        <GameCard
          :card="card"
          :show-flavour="false"
          :owned="isCardOwned(card.id)"
        />
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div class="w-20 h-20 mb-6 text-poe-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          class="w-full h-full"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <p class="font-body text-lg text-poe-text-dim">
        {{ displayEmptyMessage }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  justify-items: center;
  padding: 0.75rem 0;
  padding-top: 1rem;
}

@media (min-width: 480px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.25rem;
  }
}

@media (min-width: 640px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.5rem;
    padding-top: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 2rem;
  }
}

.card-grid__item {
  animation: card-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  overflow: visible;
  width: 100%;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
