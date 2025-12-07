<script setup lang="ts">
import type { Card } from '~/types/card'
import { useAutoAnimate } from '@formkit/auto-animate/vue'

const props = defineProps<{
  cards: Card[]
  emptyMessage?: string
  ownedCardIds?: string[] // List of card IDs that the user owns
}>()

// Check if a card is owned
const isCardOwned = (cardId: string): boolean => {
  if (!props.ownedCardIds) return true
  return props.ownedCardIds.includes(cardId)
}

// Auto-animate for the grid (for filtering only)
const [gridRef] = useAutoAnimate({
  duration: 400,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
})

// Selected card state
const selectedCard = ref<Card | null>(null)
const selectedCardKey = ref<string | null>(null)
const isModalOpen = ref(false)
const cardOriginRect = ref<DOMRect | null>(null)

// Floating card animation state
const floatingCard = ref<Card | null>(null)
const floatingCardStyle = ref<Record<string, string>>({})
const showFloatingCard = ref(false)

// Hidden card key (to hide the original card during animation)
const hiddenCardKey = ref<string | null>(null)

// Store refs to card elements
const cardRefs = ref<Map<string, HTMLElement>>(new Map())

const setCardRef = (el: HTMLElement | null, key: string) => {
  if (el) {
    cardRefs.value.set(key, el)
  }
}

const getCardKey = (card: Card, index: number) => `${card.id}-${card.uid}-${index}`

// Open modal with smooth animation
const openCardModal = async (card: Card, index: number) => {
  if (!isCardOwned(card.id)) return
  
  const key = getCardKey(card, index)
  const cardEl = cardRefs.value.get(key)
  
  if (!cardEl) return
  
  // Get the card's current position
  const rect = cardEl.getBoundingClientRect()
  cardOriginRect.value = rect
  
  selectedCard.value = card
  selectedCardKey.value = key
  floatingCard.value = card
  
  // Position floating card exactly where the original is
  floatingCardStyle.value = {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '1000',
    transition: 'none',
    opacity: '1',
    pointerEvents: 'none',
  }
  
  // Show floating card and hide original simultaneously
  showFloatingCard.value = true
  hiddenCardKey.value = key
  
  await nextTick()
  
  // Animate floating card to center
  requestAnimationFrame(() => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const targetWidth = Math.min(360, viewportWidth - 40)
    const aspectRatio = rect.height / rect.width
    const targetHeight = targetWidth * aspectRatio
    
    const centerX = (viewportWidth - targetWidth) / 2
    const centerY = (viewportHeight - targetHeight) / 2
    
    floatingCardStyle.value = {
      position: 'fixed',
      top: `${centerY}px`,
      left: `${centerX}px`,
      width: `${targetWidth}px`,
      height: `${targetHeight}px`,
      zIndex: '1001',
      transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
      opacity: '1',
      pointerEvents: 'none',
    }
    
    // Open modal when floating card animation is done
    setTimeout(() => {
      // Open modal - it will appear instantly (no opacity transition)
      isModalOpen.value = true
      
      // Hide floating card INSTANTLY (no fade) - modal takes over
      showFloatingCard.value = false
      floatingCard.value = null
    }, 450)
  })
}

// Close modal with smooth animation
const closeCardModal = async () => {
  if (!selectedCard.value || !cardOriginRect.value || !selectedCardKey.value) {
    isModalOpen.value = false
    hiddenCardKey.value = null
    selectedCard.value = null
    selectedCardKey.value = null
    return
  }
  
  // Find the original card element's current position
  const cardEl = cardRefs.value.get(selectedCardKey.value)
  if (!cardEl) {
    isModalOpen.value = false
    hiddenCardKey.value = null
    selectedCard.value = null
    selectedCardKey.value = null
    return
  }
  
  const rect = cardEl.getBoundingClientRect()
  
  // Show floating card at center (matching modal position)
  floatingCard.value = selectedCard.value
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const modalWidth = Math.min(360, viewportWidth - 40)
  const aspectRatio = rect.height / rect.width
  const modalHeight = modalWidth * aspectRatio
  const centerX = (viewportWidth - modalWidth) / 2
  const centerY = (viewportHeight - modalHeight) / 2
  
  floatingCardStyle.value = {
    position: 'fixed',
    top: `${centerY}px`,
    left: `${centerX}px`,
    width: `${modalWidth}px`,
    height: `${modalHeight}px`,
    zIndex: '1001',
    transition: 'none',
    opacity: '0',
    pointerEvents: 'none',
  }
  
  showFloatingCard.value = true
  
  // Close modal
  isModalOpen.value = false
  
  await nextTick()
  
  // Fade in floating card as modal fades out
  requestAnimationFrame(() => {
    floatingCardStyle.value = {
      ...floatingCardStyle.value,
      opacity: '1',
      transition: 'opacity 0.15s ease-in',
    }
    
    // Then animate back to original position
    setTimeout(() => {
      floatingCardStyle.value = {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: '999',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: '1',
        pointerEvents: 'none',
      }
      
      // Show original card and hide floating card
      setTimeout(() => {
        hiddenCardKey.value = null
        
        // Brief delay then clean up floating card
        setTimeout(() => {
          showFloatingCard.value = false
          floatingCard.value = null
          selectedCard.value = null
          selectedCardKey.value = null
          cardOriginRect.value = null
        }, 50)
      }, 350)
    }, 150)
  })
}
</script>

<template>
  <div class="card-grid-wrapper">
    <!-- Main grid with auto-animate (for filtering) -->
    <div
      v-if="cards.length > 0"
      ref="gridRef"
      class="card-grid"
    >
      <div
        v-for="(card, index) in cards"
        :key="`${card.id}-${card.uid}`"
        :ref="(el) => setCardRef(el as HTMLElement, getCardKey(card, index))"
        class="card-grid__item"
        :class="{ 'card-grid__item--hidden': hiddenCardKey === getCardKey(card, index) }"
      >
        <GameCard
          :card="card"
          :show-flavour="false"
          :owned="isCardOwned(card.id)"
          @click="isCardOwned(card.id) ? openCardModal(card, index) : null"
        />
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-else class="card-grid__empty">
      <div class="card-grid__empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <p class="card-grid__empty-text">{{ emptyMessage || 'Aucune carte trouvée' }}</p>
    </div>

    <!-- Floating card for smooth transition -->
    <Teleport to="body">
      <div 
        v-if="showFloatingCard && floatingCard" 
        class="floating-card"
        :style="floatingCardStyle"
      >
        <GameCard
          :card="floatingCard"
          :show-flavour="false"
          :owned="true"
        />
      </div>
    </Teleport>

    <!-- Card detail modal -->
    <CardModal 
      :card="selectedCard" 
      :is-open="isModalOpen"
      :origin-rect="cardOriginRect"
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
  /* Initial animation on page load */
  animation: card-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  transition: opacity 0.15s ease-out, visibility 0.15s ease-out;
}

.card-grid__item--hidden {
  opacity: 0;
  visibility: hidden;
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

<style>
/* Global style for floating card (not scoped) */
.floating-card {
  pointer-events: none;
  will-change: transform, top, left, width, height, opacity;
}

.floating-card > * {
  width: 100% !important;
  height: 100% !important;
}
</style>
