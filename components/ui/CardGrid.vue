<script setup lang="ts">
import type { Card } from '~/types/card'

defineProps<{
  cards: Card[]
  emptyMessage?: string
}>()
</script>

<template>
  <div v-if="cards.length > 0" class="card-grid">
    <GameCard
      v-for="(card, index) in cards"
      :key="`${card.id}-${index}`"
      :card="card"
      class="card-grid__item"
      :style="{ '--delay': `${index * 50}ms` }"
    />
  </div>
  
  <div v-else class="card-grid__empty">
    <div class="card-grid__empty-icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    </div>
    <p class="card-grid__empty-text">{{ emptyMessage || 'Aucune carte trouvée' }}</p>
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2rem;
  justify-items: center;
  padding: 1rem 0;
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

.card-grid__item {
  animation: card-enter 0.5s ease-out backwards;
  animation-delay: var(--delay, 0ms);
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

.card-grid__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.card-grid__empty-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  color: #3a3a45;
}

.card-grid__empty-icon svg {
  width: 100%;
  height: 100%;
}

.card-grid__empty-text {
  font-family: 'Crimson Text', serif;
  font-size: 1.125rem;
  color: #7f7f7f;
}
</style>

