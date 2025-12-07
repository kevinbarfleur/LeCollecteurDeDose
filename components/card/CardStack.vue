<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";
import gsap from "gsap";

const props = defineProps<{
  cards: Card[];
  count: number;
}>();

// Visual stack count (max 5)
const visualStackCount = computed(() => Math.min(props.count, 5));

// The "top" card (visible one - first in array)
const topCard = computed(() => props.cards[0]);

// Tier config for styling
const tierConfig = computed(() => TIER_CONFIG[topCard.value.tier as CardTier]);
const tierClass = computed(() => `card-stack--${topCard.value.tier.toLowerCase()}`);

// Stack styles
const tierStyles = computed(() => ({
  "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
  "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
}));

// Refs
const stackRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const floatingCardsRef = ref<HTMLElement[]>([]);
const cardListRef = ref<HTMLElement | null>(null);

// Animation state
type AnimationState = 'idle' | 'animating' | 'expanded';
const animationState = ref<AnimationState>('idle');
const originalRect = ref<DOMRect | null>(null);
let currentTimeline: gsap.core.Timeline | null = null;

// Image loading states for floating cards only (detail view)
const imageStatuses = ref<Map<string, 'loading' | 'loaded' | 'error'>>(new Map());

const loadImagesForFloating = () => {
  props.cards.forEach(card => {
    if (imageStatuses.value.has(card.id)) return;
    
    const hasUrl = !!card.gameData?.img;
    if (!hasUrl) {
      imageStatuses.value.set(card.id, 'error');
      return;
    }
    imageStatuses.value.set(card.id, 'loading');
    const img = new Image();
    img.onload = () => { imageStatuses.value.set(card.id, 'loaded'); };
    img.onerror = () => { imageStatuses.value.set(card.id, 'error'); };
    img.src = card.gameData.img;
  });
};

const getImageStatus = (cardId: string) => imageStatuses.value.get(cardId) || 'loading';

// ===========================================
// STACK OFFSET CALCULATION
// ===========================================
// The BASE card (visually at bottom of pile) is at position (0,0) - aligned with grid
// Cards stacked ON TOP are offset towards up-left
// layerIndex 0 = base (0,0), layerIndex 1 = first card on top (-4px,-4px), etc.

// Generate consistent random rotations for each layer (seeded by card ID)
const layerRotations = computed(() => {
  const rotations: number[] = [];
  const seed = topCard.value.id.charCodeAt(0) + topCard.value.id.length;
  
  for (let i = 0; i < visualStackCount.value; i++) {
    // Seeded pseudo-random: use card ID + layer index for consistency
    const pseudoRandom = Math.sin(seed * (i + 1) * 9999) * 10000;
    // Very subtle rotation: between -2.5 and +2.5 degrees
    const rotation = (pseudoRandom - Math.floor(pseudoRandom) - 0.5) * 5;
    rotations.push(rotation);
  }
  return rotations;
});

const getLayerOffset = (layerIndex: number) => {
  const offset = layerIndex * 4; // 4px per layer
  const rotation = layerRotations.value[layerIndex] || 0;
  return {
    transform: `translate(${-offset}px, ${-offset}px) rotate(${rotation}deg)`,
    zIndex: layerIndex + 1, // Higher layer = higher z-index (base is 1, top is highest)
  };
};

// The GameCard (top of pile) gets the maximum offset + hover lift
const topCardOffset = computed(() => {
  const offset = (visualStackCount.value - 1) * 4;
  const lift = isHovering.value ? -4 : 0;
  return {
    transform: `translate(${-offset}px, ${-offset + lift}px)`,
  };
});

// ===========================================
// OPEN STACK - Show detail cards
// ===========================================
const openStack = async () => {
  if (!stackRef.value) return;
  
  if (currentTimeline) {
    currentTimeline.kill();
  }
  
  // Load images for floating detail cards
  loadImagesForFloating();
  
  const rect = stackRef.value.getBoundingClientRect();
  originalRect.value = rect;
  
  animationState.value = 'animating';
  
  await nextTick();
  
  const overlay = overlayRef.value;
  const cardList = cardListRef.value;
  
  if (!overlay || !cardList) return;
  
  const floatingCards = floatingCardsRef.value;
  
  // Calculate target positions for cards - detail view size
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  // Target size for detail cards (larger like GameCard detail view)
  const targetWidth = Math.min(320, viewportWidth - 60);
  const targetHeight = targetWidth * 1.4;
  const gap = 24;
  const totalWidth = props.cards.length * targetWidth + (props.cards.length - 1) * gap;
  const startX = Math.max(30, (viewportWidth - totalWidth) / 2);
  const centerY = (viewportHeight - targetHeight) / 2;
  
  // Set initial states - all cards start from the stack position
  // Cards in stack are offset up-left, so we subtract offset
  floatingCards.forEach((card, i) => {
    const stackOffset = Math.min(visualStackCount.value - 1 - i, 4) * 4;
    gsap.set(card, {
      position: 'fixed',
      top: rect.top - stackOffset,
      left: rect.left - stackOffset,
      width: rect.width,
      height: rect.height,
      zIndex: 1000 + i,
      opacity: 1,
      rotateY: 0,
      rotateX: 0,
    });
  });
  
  gsap.set(overlay, { opacity: 0, backdropFilter: 'blur(0px)' });
  
  // Create timeline
  currentTimeline = gsap.timeline({
    onComplete: () => {
      animationState.value = 'expanded';
    }
  });
  
  // Overlay fade in
  currentTimeline.to(overlay, {
    opacity: 1,
    backdropFilter: 'blur(12px)',
    duration: 0.4,
    ease: 'power2.out',
  }, 0);
  
  // Each card follows its own trajectory
  floatingCards.forEach((card, i) => {
    const targetX = startX + i * (targetWidth + gap);
    const delay = i * 0.06;
    
    // Unique trajectory per card
    const arcHeight = 30 + (i % 3) * 15;
    const rotationVariance = (i % 2 === 0 ? 1 : -1) * (5 + i * 2);
    
    // First phase: lift and rotate slightly
    currentTimeline.to(card, {
      y: -arcHeight,
      rotateY: rotationVariance,
      rotateX: -5,
      scale: 1.05,
      duration: 0.25,
      ease: 'power2.out',
    }, delay);
    
    // Second phase: move to final position
    currentTimeline.to(card, {
      top: centerY,
      left: targetX,
      width: targetWidth,
      height: targetHeight,
      y: 0,
      rotateY: 0,
      rotateX: 0,
      scale: 1,
      duration: 0.45,
      ease: 'power3.out',
    }, delay + 0.15);
  });
};

// ===========================================
// CLOSE STACK
// ===========================================
const closeStack = async () => {
  if (animationState.value !== 'expanded') return;
  
  if (currentTimeline) {
    currentTimeline.kill();
  }
  
  const rect = originalRect.value;
  if (!rect) {
    resetToIdle();
    return;
  }
  
  const overlay = overlayRef.value;
  const floatingCards = floatingCardsRef.value;
  
  if (!overlay) {
    resetToIdle();
    return;
  }
  
  animationState.value = 'animating';
  
  currentTimeline = gsap.timeline({
    onComplete: () => {
      resetToIdle();
    }
  });
  
  // Cards return to stack with reverse trajectories
  floatingCards.forEach((card, i) => {
    const stackOffset = Math.min(visualStackCount.value - 1 - i, 4) * 4;
    const delay = (floatingCards.length - 1 - i) * 0.04;
    
    currentTimeline.to(card, {
      top: rect.top - stackOffset,
      left: rect.left - stackOffset,
      width: rect.width,
      height: rect.height,
      rotateY: 0,
      rotateX: 0,
      scale: 1,
      duration: 0.4,
      ease: 'power3.inOut',
    }, delay);
  });
  
  // Overlay fade out
  currentTimeline.to(overlay, {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    duration: 0.35,
    ease: 'power2.in',
  }, 0.1);
};

const resetToIdle = () => {
  animationState.value = 'idle';
  originalRect.value = null;
  currentTimeline = null;
  
  floatingCardsRef.value.forEach(card => {
    if (card) gsap.set(card, { clearProps: 'all' });
  });
};

// Click handler
const handleClick = () => {
  if (animationState.value === 'idle') {
    openStack();
  }
};

const handleClose = () => {
  if (animationState.value === 'expanded') {
    closeStack();
  }
};

// Escape key handler
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && animationState.value === 'expanded') {
      handleClose();
    }
  };
  window.addEventListener('keydown', handleEscape);
  onUnmounted(() => window.removeEventListener('keydown', handleEscape));
});

// Prevent body scroll when expanded
watch(animationState, (state) => {
  if (import.meta.client) {
    const isOpen = state !== 'idle';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
});

// Is floating?
const isFloating = computed(() => animationState.value !== 'idle');

// Set refs for floating cards
const setFloatingCardRef = (el: any, index: number) => {
  if (el) floatingCardsRef.value[index] = el;
};

// Hovering state (for stack layer styling)
const isHovering = ref(false);
</script>

<template>
  <div class="card-stack-container">
    <!-- Teleport for overlay + floating cards -->
    <Teleport to="body">
      <div v-if="isFloating" class="floating-stack-wrapper">
        <!-- Overlay -->
        <div 
          ref="overlayRef"
          class="stack-overlay"
          @click="handleClose"
        />
        
        <!-- Close button -->
        <button 
          v-if="animationState === 'expanded'"
          class="stack-close-btn"
          @click="handleClose"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <!-- Stack count badge -->
        <div 
          v-if="animationState === 'expanded'"
          class="stack-count-badge"
        >
          {{ count }} exemplaire{{ count > 1 ? 's' : '' }}
        </div>
        
        <!-- Floating cards list - DETAIL VIEW -->
        <div ref="cardListRef" class="floating-cards-list">
          <article
            v-for="(card, index) in cards"
            :key="`floating-${card.id}-${index}`"
            :ref="(el) => setFloatingCardRef(el, index)"
            class="floating-card"
            :class="[`floating-card--${card.tier.toLowerCase()}`]"
            :style="{
              '--tier-color': TIER_CONFIG[card.tier as CardTier]?.color ?? '#2a2a2d',
              '--tier-glow': TIER_CONFIG[card.tier as CardTier]?.glowColor ?? '#3a3a3d',
            }"
          >
            <!-- DETAIL VIEW CONTENT -->
            <div class="detail__title-bar">
              <span class="detail__name">{{ card.name }}</span>
              <span class="detail__tier-badge">{{ card.tier }}</span>
            </div>

            <div class="detail__artwork">
              <img 
                v-if="getImageStatus(card.id) === 'loaded'" 
                :src="card.gameData.img" 
                :alt="card.name" 
                class="detail__image" 
              />
              <div v-else class="detail__image-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            </div>

            <div class="detail__type-line">
              <span class="detail__type">{{ card.itemClass }}</span>
              <span class="detail__divider">◆</span>
              <span class="detail__rarity">{{ card.rarity }}</span>
            </div>

            <div class="detail__separator">
              <span class="detail__separator-line"></span>
              <span class="detail__separator-rune">✧</span>
              <span class="detail__separator-line"></span>
            </div>

            <div class="detail__flavour">
              <p v-if="card.flavourText">"{{ card.flavourText }}"</p>
              <p v-else class="detail__no-flavour">Aucune description disponible</p>
            </div>

            <div class="detail__separator">
              <span class="detail__separator-line"></span>
              <span class="detail__separator-rune">◇</span>
              <span class="detail__separator-line"></span>
            </div>

            <div class="detail__bottom-info">
              <span class="detail__collector-number">#{{ index + 1 }}/{{ count }}</span>
              <a 
                v-if="card.wikiUrl" 
                :href="card.wikiUrl" 
                target="_blank" 
                rel="noopener noreferrer"
                class="detail__wiki-link"
                @click.stop
              >
                Wiki ↗
              </a>
              <span class="detail__weight" v-if="card.gameData.weight">
                ◆ {{ card.gameData.weight }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </Teleport>

    <!-- Placeholder when floating -->
    <div 
      v-if="isFloating" 
      class="card-stack-placeholder"
    />

    <!-- Stack in grid - uses actual GameCard component -->
    <div
      v-else
      ref="stackRef"
      class="card-stack"
      :class="[tierClass, { 'card-stack--hovering': isHovering }]"
      :style="tierStyles"
      @click="handleClick"
    >
      <!-- Stack layers: base at 0,0, others stacked on top going up-left -->
      <!-- Layer 0 = base (at grid position), Layer 1+ = on top, offset up-left -->
      <div 
        v-for="i in (visualStackCount - 1)" 
        :key="`stack-layer-${i}`"
        class="card-stack__layer"
        :style="getLayerOffset(i - 1)"
      >
        <div 
          class="card-stack__layer-frame"
          :style="{ borderColor: tierConfig?.color }"
        >
          <div class="card-stack__layer-bg"></div>
          <!-- Corner decorations with same color -->
          <div class="card-stack__layer-corner card-stack__layer-corner--tl" :style="{ borderColor: tierConfig?.color }"></div>
          <div class="card-stack__layer-corner card-stack__layer-corner--br" :style="{ borderColor: tierConfig?.color }"></div>
        </div>
        <!-- Dark gradient OVER the border to darken the bottom including the border -->
        <div class="card-stack__layer-bottom-shadow"></div>
      </div>
      
      <!-- Top card (GameCard) - offset to be at the top of the stack -->
      <div 
        class="card-stack__top-wrapper"
        :class="{ 'card-stack__top-wrapper--hovering': isHovering }"
        :style="topCardOffset"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <GameCard
          :card="topCard"
          :owned="true"
          :preview-only="true"
        />
        <!-- Count badge overlay -->
        <div class="card-stack__count">
          <span>x{{ count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===========================================
   CONTAINER & PLACEHOLDER
   =========================================== */
.card-stack-container {
  position: relative;
  width: 100%;
}

.card-stack-placeholder {
  width: 100%;
  aspect-ratio: 2.5/3.5;
  background: transparent;
}

/* ===========================================
   OVERLAY
   =========================================== */
.stack-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
}

/* ===========================================
   FLOATING WRAPPER
   =========================================== */
.floating-stack-wrapper {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
  perspective: 1200px;
}

.floating-stack-wrapper .stack-overlay {
  pointer-events: auto;
}

.floating-cards-list {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 40px;
  pointer-events: none;
  overflow-x: auto;
}

/* ===========================================
   CLOSE BUTTON
   =========================================== */
.stack-close-btn {
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
  z-index: 1010;
  pointer-events: auto;
  transition: all 0.2s ease;
}

.stack-close-btn:hover {
  background: rgba(50, 50, 55, 0.95);
  color: #fff;
}

.stack-close-btn svg {
  width: 20px;
  height: 20px;
}

/* ===========================================
   COUNT BADGE (overlay)
   =========================================== */
.stack-count-badge {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  background: rgba(30, 30, 35, 0.9);
  border: 1px solid rgba(60, 60, 65, 0.5);
  border-radius: 20px;
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: #c8c8c8;
  text-transform: uppercase;
  letter-spacing: 1px;
  z-index: 1010;
  pointer-events: none;
}

/* ===========================================
   FLOATING CARD - DETAIL VIEW
   =========================================== */
.floating-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 8px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(160deg, #12110f 0%, #0a0908 50%, #0d0c0a 100%);
  border: 2px solid var(--tier-color, #2a2a30);
  pointer-events: auto;
  transform-style: preserve-3d;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.5);
}

.floating-card--t0 {
  border-color: #6d5a2a;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(201, 162, 39, 0.15);
}

.floating-card--t1 {
  border-color: #3a3445;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 20px rgba(122, 106, 138, 0.12);
}

.floating-card--t2 {
  border-color: #3a4550;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 15px rgba(90, 112, 128, 0.1);
}

.floating-card--t3 {
  border-color: #2a2a2d;
}

/* ===========================================
   DETAIL VIEW STYLES
   =========================================== */
.detail__title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(18, 16, 14, 0.8) 0%, rgba(10, 9, 8, 0.9) 100%);
  border-radius: 8px;
}

.detail__name {
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: 700;
  color: #f0f0f0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.detail__tier-badge {
  font-family: 'Cinzel', serif;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--tier-glow, #94a3b8);
}

.detail__artwork {
  flex: 1;
  min-height: 100px;
  background: linear-gradient(160deg, #050504 0%, #030303 50%, #040403 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
}

.detail__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.detail__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail__image-placeholder svg {
  width: 40px;
  height: 40px;
  color: var(--tier-color, #3a3a45);
  opacity: 0.35;
}

.detail__type-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.detail__type {
  font-family: 'Cinzel', serif;
  font-size: 12px;
  font-weight: 600;
  color: #9a9a9a;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.detail__divider {
  font-size: 9px;
  color: var(--tier-color, #4a4a4a);
}

.detail__rarity {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: var(--tier-glow, #7f7f7f);
  font-style: italic;
}

.detail__separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 2px 0;
}

.detail__separator-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--tier-color, #3a3a40) 50%, transparent 100%);
}

.detail__separator-rune {
  font-size: 11px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.7;
}

.detail__flavour {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6px 8px;
  min-height: 32px;
}

.detail__flavour p {
  font-family: 'Crimson Text', serif;
  font-style: italic;
  font-size: 13px;
  line-height: 1.4;
  color: #9a9a9a;
  margin: 0;
}

.detail__no-flavour {
  color: #5a5a5a;
}

.detail__bottom-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px 0;
}

.detail__collector-number {
  font-family: 'Crimson Text', serif;
  font-size: 12px;
  color: #6a6a6a;
}

.detail__wiki-link {
  font-family: 'Cinzel', serif;
  font-size: 10px;
  color: #af6025;
  text-decoration: none;
  padding: 4px 10px;
  background: rgba(175, 96, 37, 0.15);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.detail__wiki-link:hover {
  background: rgba(175, 96, 37, 0.25);
  color: #c97030;
}

.detail__weight {
  font-family: 'Cinzel', serif;
  font-size: 12px;
  color: var(--tier-glow, #6a6a6a);
}

/* ===========================================
   CARD STACK (in grid)
   =========================================== */
.card-stack {
  position: relative;
  width: 100%;
  cursor: pointer;
  overflow: visible; /* Allow stack layers to show */
}

.card-stack--hovering {
  z-index: 10;
}

/* ===========================================
   STACK LAYERS (peek out behind, up-left)
   Identical styling to GameCard frame
   =========================================== */
.card-stack__layer {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: visible;
  pointer-events: none;
}

/* Frame - matches .game-card__frame from cards.css */
.card-stack__layer-frame {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(145deg, #1a1a1f 0%, #0d0d10 100%);
  border: 2px solid var(--tier-color, #2a2a30);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transition: border-color 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99);
}

/* Background inside frame - matches .game-card__bg */
.card-stack__layer-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(18, 17, 15, 0.95) 0%, rgba(10, 9, 8, 0.98) 50%, rgba(13, 12, 10, 1) 100%);
  border-radius: inherit;
}

/* Noise overlay - matches .game-card__bg::after */
.card-stack__layer-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
  border-radius: inherit;
}

/* Dark gradient OVER the entire card including border */
/* This creates the darkened bottom effect seen on GameCard */
.card-stack__layer-bottom-shadow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.5) 40%, transparent 100%);
  border-radius: 0 0 12px 12px;
  z-index: 20; /* Above the frame and border */
  pointer-events: none;
}

/* Corner decorations - using actual elements for dynamic color */
.card-stack__layer-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 2px solid;
  opacity: 0.5;
  z-index: 1;
  pointer-events: none;
}

.card-stack__layer-corner--tl {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}

.card-stack__layer-corner--br {
  bottom: 8px;
  right: 8px;
  border-left: none;
  border-top: none;
}

/* ===========================================
   TOP WRAPPER - Contains GameCard (top of stack) + badge
   =========================================== */
.card-stack__top-wrapper {
  position: relative;
  z-index: 10; /* Always on top of all layers */
  width: 100%;
  /* Smooth transition for the lift effect on hover */
  transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}

/* GameCard inside stack receives hover events for tilt + scale effect */
/* The click is still handled by CardStack via previewOnly prop on GameCard */
.card-stack__top-wrapper :deep(.game-card-container) {
  pointer-events: auto;
  cursor: pointer;
}

/* ===========================================
   COUNT BADGE (on card)
   =========================================== */
.card-stack__count {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid var(--tier-color, #3a3a3d);
  border-radius: 12px;
  font-family: 'Cinzel', serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--tier-glow, #7f7f7f);
  z-index: 20;
  pointer-events: none;
  /* Badge is inside base-wrapper, so it lifts automatically with parent */
}
</style>


