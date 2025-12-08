<script setup lang="ts">
import type { Card } from "~/types/card";
import { useAutoAnimate } from "@formkit/auto-animate/vue";

// Type for grouped cards
interface CardGroup {
  cards: Card[];
  count: number;
}

const props = defineProps<{
  cards?: Card[];
  groupedCards?: CardGroup[];
  emptyMessage?: string;
  ownedCardIds?: string[];
}>();

// Check if a card is owned
const isCardOwned = (cardId: string): boolean => {
  if (!props.ownedCardIds) return true;
  return props.ownedCardIds.includes(cardId);
};

// Determine if we're in grouped mode
const isGroupedMode = computed(
  () =>
    props.groupedCards !== undefined &&
    props.groupedCards !== null &&
    props.groupedCards.length > 0
);

// Check if we have any items to display
const hasItems = computed(() => {
  if (isGroupedMode.value) {
    return props.groupedCards && props.groupedCards.length > 0;
  }
  return (
    props.cards !== undefined && props.cards !== null && props.cards.length > 0
  );
});

// Safe accessors for template
const safeGroupedCards = computed(() => props.groupedCards || []);
const safeCards = computed(() => props.cards || []);

// Auto-animate for filtering
const [gridRef] = useAutoAnimate({
  duration: 400,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
});
</script>

<template>
  <div class="relative">
    <!-- Grouped mode (with stacks) -->
    <div v-if="isGroupedMode && hasItems" ref="gridRef" class="card-grid">
      <div
        v-for="group in safeGroupedCards"
        :key="group.cards[0].id"
        class="card-grid__item"
      >
        <!-- Single card: use GameCard -->
        <GameCard
          v-if="group.count === 1"
          :card="group.cards[0]"
          :show-flavour="false"
          :owned="isCardOwned(group.cards[0].id)"
        />
        <!-- Multiple cards: use CardStack -->
        <CardStack v-else :cards="group.cards" :count="group.count" />
      </div>
    </div>

    <!-- Individual cards mode -->
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

    <!-- Empty state -->
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
        {{ emptyMessage || "Aucune carte trouvée" }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Grid layout with auto-fill (requires CSS for minmax) */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2rem;
  justify-items: center;
  padding: 1rem 0;
  /* Allow stack layers to overflow */
  padding-top: 1.5rem;
}

@media (min-width: 640px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 3rem;
  }
}

/* Card item with entrance animation */
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
