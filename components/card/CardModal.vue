<script setup lang="ts">
import type { Card } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";

const props = defineProps<{
  card: Card | null;
  isOpen: boolean;
  originRect: DOMRect | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Get tier config
const tierConfig = computed(() => 
  props.card ? TIER_CONFIG[props.card.tier] : null
);

// Animation state
const animationPhase = ref<'closed' | 'opening' | 'open' | 'closing'>('closed');

// Watch for open state changes - modal appears instantly (floating card handles animation)
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    // Open immediately - no delay, no transition (floating card already did the animation)
    animationPhase.value = 'open';
  } else if (!isOpen && (animationPhase.value === 'open' || animationPhase.value === 'opening')) {
    animationPhase.value = 'closing';
    
    // Give time for overlay to fade out
    setTimeout(() => {
      animationPhase.value = 'closed';
    }, 300);
  }
});

// Image loading state
const imageStatus = ref<'loading' | 'loaded' | 'error'>('loading');

watch(() => props.card, (newCard) => {
  if (!newCard?.gameData?.img) {
    imageStatus.value = 'error';
    return;
  }
  
  imageStatus.value = 'loading';
  const img = new Image();
  img.onload = () => { imageStatus.value = 'loaded'; };
  img.onerror = () => { imageStatus.value = 'error'; };
  img.src = newCard.gameData.img;
}, { immediate: true });

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.isOpen) {
      emit('close');
    }
  };
  window.addEventListener('keydown', handleEscape);
  onUnmounted(() => window.removeEventListener('keydown', handleEscape));
});

// Prevent body scroll when modal is open
watch(() => props.isOpen, (isOpen) => {
  if (import.meta.client) {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
});
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="animationPhase !== 'closed' && card" 
      class="card-modal-overlay"
      :class="{
        'card-modal-overlay--opening': animationPhase === 'opening',
        'card-modal-overlay--open': animationPhase === 'open',
        'card-modal-overlay--closing': animationPhase === 'closing',
      }"
      @click.self="emit('close')"
    >
      <!-- Close button -->
      <button class="card-modal__close" @click="emit('close')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Magic-style card -->
      <div 
        class="mtg-card"
        :class="`mtg-card--${card.tier.toLowerCase()}`"
        :style="{
          '--tier-color': tierConfig?.color,
          '--tier-glow': tierConfig?.glowColor,
        }"
      >
        <!-- Card frame -->
        <div class="mtg-card__frame">
          <!-- Title bar -->
          <div class="mtg-card__title-bar">
            <span class="mtg-card__name">{{ card.name }}</span>
            <span class="mtg-card__tier-badge">{{ card.tier }}</span>
          </div>

          <!-- Artwork -->
          <div class="mtg-card__artwork">
            <img
              v-if="imageStatus === 'loaded'"
              :src="card.gameData.img"
              :alt="card.name"
              class="mtg-card__image"
            />
            <div v-else class="mtg-card__image-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          </div>

          <!-- Card content (no individual backgrounds) -->
          <div class="mtg-card__content">
            <!-- Type line -->
            <div class="mtg-card__type-line">
              <span class="mtg-card__type">{{ card.itemClass }}</span>
              <span class="mtg-card__divider-dot">◆</span>
              <span class="mtg-card__rarity">{{ card.rarity }}</span>
            </div>

            <!-- Runic separator -->
            <div class="mtg-card__separator">
              <span class="mtg-card__separator-line"></span>
              <span class="mtg-card__separator-rune">✧</span>
              <span class="mtg-card__separator-line"></span>
            </div>

            <!-- Flavour text -->
            <div class="mtg-card__flavour">
              <p v-if="card.flavourText">"{{ card.flavourText }}"</p>
              <p v-else class="mtg-card__no-flavour">Aucune description disponible</p>
            </div>

            <!-- Runic separator -->
            <div class="mtg-card__separator">
              <span class="mtg-card__separator-line"></span>
              <span class="mtg-card__separator-rune">◇</span>
              <span class="mtg-card__separator-line"></span>
            </div>

            <!-- Bottom info -->
            <div class="mtg-card__bottom-info">
              <span class="mtg-card__collector-number">#{{ card.uid }}</span>
              <a 
                v-if="card.wikiUrl" 
                :href="card.wikiUrl" 
                target="_blank" 
                rel="noopener noreferrer"
                class="mtg-card__wiki-link"
                @click.stop
              >
                Wiki ↗
              </a>
              <span class="mtg-card__weight" v-if="card.gameData.weight">
                ◆ {{ card.gameData.weight }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Modal overlay */
.card-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0);
  transition: background 0.4s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.card-modal-overlay--opening,
.card-modal-overlay--open {
  background: rgba(0, 0, 0, 0.92);
}

.card-modal-overlay--closing {
  background: rgba(0, 0, 0, 0);
}

/* Close button */
.card-modal__close {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 35, 0.9);
  border: 1px solid rgba(60, 60, 65, 0.5);
  border-radius: 50%;
  color: #7f7f7f;
  cursor: pointer;
  z-index: 1001;
  transition: all 0.2s ease;
  opacity: 0;
  transform: scale(0.8);
}

.card-modal-overlay--open .card-modal__close {
  opacity: 1;
  transform: scale(1);
}

.card-modal__close:hover {
  background: rgba(50, 50, 55, 0.95);
  color: #fff;
  border-color: rgba(100, 100, 105, 0.6);
}

.card-modal__close svg {
  width: 20px;
  height: 20px;
}

/* ===========================================
   MAGIC-STYLE CARD - DARK THEME
   =========================================== */

.mtg-card {
  position: relative;
  width: 360px;
  max-width: calc(100vw - 40px);
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--tier-color, #2a2a30);
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.9),
    0 0 50px var(--tier-glow, transparent);
  /* No transition - appears instantly (floating card handles animation) */
  opacity: 1;
}

/* Tier-specific glow */
.mtg-card--t0 {
  border-color: #6d5a2a;
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.9),
    0 0 70px rgba(201, 162, 39, 0.35);
}

.mtg-card--t1 {
  border-color: #3a3445;
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.9),
    0 0 60px rgba(122, 106, 138, 0.25);
}

.mtg-card--t2 {
  border-color: #3a4550;
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.9),
    0 0 50px rgba(90, 112, 128, 0.2);
}

.mtg-card--t3 {
  border-color: #2a2a2d;
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.9);
}

/* Card frame */
.mtg-card__frame {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #18181c 0%, #0e0e12 100%);
  padding: 14px;
  gap: 10px;
}

/* Title bar */
.mtg-card__title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(40, 40, 48, 0.6) 0%, rgba(25, 25, 30, 0.8) 100%);
  border-radius: 8px;
}

.mtg-card__name {
  font-family: 'Cinzel', serif;
  font-size: 18px;
  font-weight: 700;
  color: #f0f0f0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mtg-card__tier-badge {
  flex-shrink: 0;
  font-family: 'Cinzel', serif;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--tier-glow, #94a3b8);
  margin-left: 10px;
}

/* Artwork */
.mtg-card__artwork {
  flex: 0 0 auto;
  aspect-ratio: 4 / 3;
  background: linear-gradient(180deg, #0c0c10 0%, #08080a 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
}

.mtg-card__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.mtg-card__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #14141a 0%, #0a0a0e 100%);
  border-radius: 4px;
}

.mtg-card__image-placeholder svg {
  width: 48px;
  height: 48px;
  color: var(--tier-color, #3a3a45);
  opacity: 0.35;
}

/* Card content area (below artwork) */
.mtg-card__content {
  display: flex;
  flex-direction: column;
  padding: 8px 8px 4px;
}

/* Type line */
.mtg-card__type-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.mtg-card__type {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  font-weight: 600;
  color: #9a9a9a;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.mtg-card__divider-dot {
  font-size: 10px;
  color: var(--tier-color, #4a4a4a);
}

.mtg-card__rarity {
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  color: var(--tier-glow, #7f7f7f);
  font-style: italic;
}

/* Runic separators */
.mtg-card__separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}

.mtg-card__separator-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--tier-color, #3a3a40) 50%, transparent 100%);
}

.mtg-card__separator-rune {
  font-size: 12px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.7;
}

/* Flavour text */
.mtg-card__flavour {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px 8px;
  min-height: 40px;
}

.mtg-card__flavour p {
  font-family: 'Crimson Text', serif;
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: #9a9a9a;
  margin: 0;
}

.mtg-card__flavour .mtg-card__no-flavour {
  color: #5a5a5a;
}

/* Bottom info */
.mtg-card__bottom-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 8px 0;
}

.mtg-card__collector-number {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #6a6a6a;
}

.mtg-card__wiki-link {
  font-family: 'Cinzel', serif;
  font-size: 11px;
  color: #af6025;
  text-decoration: none;
  padding: 4px 10px;
  background: rgba(175, 96, 37, 0.15);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.mtg-card__wiki-link:hover {
  background: rgba(175, 96, 37, 0.25);
  color: #c97030;
}

.mtg-card__weight {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  color: var(--tier-glow, #6a6a6a);
}
</style>
