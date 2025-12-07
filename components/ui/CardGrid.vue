<script setup lang="ts">
import type { Card } from '~/types/card'

const props = defineProps<{
  cards: Card[]
  emptyMessage?: string
  ownedCardIds?: string[] // List of card IDs that the user owns
}>()

// Check if a card is owned
const isCardOwned = (cardId: string): boolean => {
  // If ownedCardIds is not provided, assume all cards are owned (collection page)
  if (!props.ownedCardIds) return true
  return props.ownedCardIds.includes(cardId)
}

// Modal state
const selectedCard = ref<Card | null>(null)
const isModalOpen = ref(false)
const cardRect = ref<DOMRect | null>(null)

// Store refs to card elements for animation
const cardRefs = ref<Map<string, HTMLElement>>(new Map())

const setCardRef = (el: HTMLElement | null, cardId: string, index: number) => {
  if (el) {
    cardRefs.value.set(`${cardId}-${index}`, el)
  }
}

const openCardModal = (card: Card, index: number) => {
  // Get the card element's position
  const cardEl = cardRefs.value.get(`${card.id}-${index}`)
  if (cardEl) {
    cardRect.value = cardEl.getBoundingClientRect()
  }
  selectedCard.value = card
  isModalOpen.value = true
}

const closeCardModal = () => {
  isModalOpen.value = false
  setTimeout(() => {
    selectedCard.value = null
    cardRect.value = null
  }, 400)
}

// FLIP animation hooks for TransitionGroup
const onBeforeLeave = (el: Element) => {
  const htmlEl = el as HTMLElement
  const rect = htmlEl.getBoundingClientRect()
  htmlEl.style.position = 'absolute'
  htmlEl.style.top = `${rect.top}px`
  htmlEl.style.left = `${rect.left}px`
  htmlEl.style.width = `${rect.width}px`
}

const onLeave = (el: Element, done: () => void) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'scale(0.8)'
  setTimeout(done, 300)
}

const onEnter = (el: Element, done: () => void) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'scale(0.8)'
  requestAnimationFrame(() => {
    htmlEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    htmlEl.style.opacity = '1'
    htmlEl.style.transform = 'scale(1)'
  })
  setTimeout(done, 400)
}
</script>

<template>
  <div class="card-grid-wrapper">
    <TransitionGroup
      v-if="cards.length > 0"
      name="card-grid"
      tag="div"
      class="card-grid"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @enter="onEnter"
      move-class="card-grid-move"
    >
      <div
        v-for="(card, index) in cards"
        :key="`${card.id}-${index}`"
        :ref="(el) => setCardRef(el as HTMLElement, card.id, index)"
        class="card-grid__item"
        :style="{ '--delay': `${Math.min(index * 30, 300)}ms` }"
      >
        <GameCard
          :card="card"
          :show-flavour="false"
          :owned="isCardOwned(card.id)"
          @click="isCardOwned(card.id) ? openCardModal(card, index) : null"
        />
      </div>
    </TransitionGroup>
    
    <div v-else class="card-grid__empty">
      <div class="card-grid__empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <p class="card-grid__empty-text">{{ emptyMessage || 'Aucune carte trouvée' }}</p>
    </div>

    <!-- Card detail modal with position-aware animation -->
    <CardModal 
      :card="selectedCard" 
      :is-open="isModalOpen"
      :origin-rect="cardRect"
      @close="closeCardModal"
    />
  </div>
</template>

<style scoped>
.card-grid-wrapper {
  position: relative;
}

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
  animation: card-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* FLIP animation for grid reordering */
.card-grid-move {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-grid-enter-active,
.card-grid-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-grid-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.card-grid-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.card-grid-leave-active {
  position: absolute;
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
