<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";
import { useCardTilt } from "~/composables/useCardTilt";

const props = defineProps<{
  card: Card;
  showFlavour?: boolean;
  owned?: boolean;
  // New: expanded mode control
  isExpanded?: boolean;
}>();

const emit = defineEmits<{
  click: [card: Card];
  close: [];
}>();

const cardRef = ref<HTMLElement | null>(null);
const cardContainerRef = ref<HTMLElement | null>(null);
const detailCardRef = ref<HTMLElement | null>(null);

// Default to owned if not specified
const isOwned = computed(() => props.owned !== false);

// Card back logo path
const cardBackLogoUrl = '/images/card-back-logo.png';

// Expanded state (controlled by parent or internal)
const internalExpanded = ref(false);
const isExpanded = computed(() => props.isExpanded ?? internalExpanded.value);

// Animation state
const animationPhase = ref<'idle' | 'expanding' | 'expanded' | 'collapsing'>('idle');

// Store original position for animation
const originalRect = ref<DOMRect | null>(null);
const currentStyle = ref<Record<string, string>>({});

// Handle card click
const handleClick = () => {
  if (!isOwned.value) return;
  
  // Get current position before expanding
  if (cardContainerRef.value && !isExpanded.value) {
    originalRect.value = cardContainerRef.value.getBoundingClientRect();
    expandCard();
  }
  
  emit('click', props.card);
};

// Expand card to center
const expandCard = async () => {
  if (!originalRect.value) return;
  
  animationPhase.value = 'expanding';
  
  const rect = originalRect.value;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Target size for expanded card
  const targetWidth = Math.min(360, viewportWidth - 40);
  const targetHeight = targetWidth * 1.5; // Aspect ratio for detail view
  
  const centerX = (viewportWidth - targetWidth) / 2;
  const centerY = (viewportHeight - targetHeight) / 2;
  
  // Start position (current position in grid)
  currentStyle.value = {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '1000',
    transition: 'none',
  };
  
  await nextTick();
  
  // Animate to center
  requestAnimationFrame(() => {
    currentStyle.value = {
      position: 'fixed',
      top: `${centerY}px`,
      left: `${centerX}px`,
      width: `${targetWidth}px`,
      height: `${targetHeight}px`,
      zIndex: '1000',
      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    };
    
    // Mark as expanded when animation completes
    setTimeout(() => {
      animationPhase.value = 'expanded';
      internalExpanded.value = true;
    }, 500);
  });
};

// Collapse card back to grid
const collapseCard = async () => {
  if (!originalRect.value) {
    animationPhase.value = 'idle';
    internalExpanded.value = false;
    currentStyle.value = {};
    emit('close');
    return;
  }
  
  animationPhase.value = 'collapsing';
  
  // Re-read position in case grid changed
  const gridCard = cardContainerRef.value;
  const rect = gridCard?.getBoundingClientRect() ?? originalRect.value;
  
  // Animate back to original position
  currentStyle.value = {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '1000',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };
  
  // Clean up after animation
  setTimeout(() => {
    animationPhase.value = 'idle';
    internalExpanded.value = false;
    currentStyle.value = {};
    originalRect.value = null;
    emit('close');
  }, 400);
};

// Handle close (escape key or click outside)
const handleClose = () => {
  if (animationPhase.value === 'expanded') {
    collapseCard();
  }
};

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && animationPhase.value === 'expanded') {
      handleClose();
    }
  };
  window.addEventListener('keydown', handleEscape);
  onUnmounted(() => window.removeEventListener('keydown', handleEscape));
});

// Prevent body scroll when expanded
watch(() => animationPhase.value, (phase) => {
  if (import.meta.client) {
    document.body.style.overflow = (phase === 'expanding' || phase === 'expanded') ? 'hidden' : '';
  }
});

// Card tilt effect for preview mode
const {
  isHovering,
  cardTransform,
  imageTransform,
  cardTransition,
  onMouseEnter,
  onMouseLeave,
} = useCardTilt(cardRef, {
  maxTilt: 15,
  scale: 1.02,
});

// Card tilt effect for detail mode (slightly reduced effect)
const {
  isHovering: isDetailHovering,
  cardTransform: detailCardTransform,
  imageTransform: detailImageTransform,
  cardTransition: detailCardTransition,
  onMouseEnter: onDetailMouseEnter,
  onMouseLeave: onDetailMouseLeave,
} = useCardTilt(detailCardRef, {
  maxTilt: 8,
  scale: 1.01,
});

// Get tier config
const tierConfig = computed(() => TIER_CONFIG[props.card.tier as CardTier]);

// Image loading state
const imageStatus = ref<'loading' | 'loaded' | 'error'>('loading');
const hasImageUrl = computed(() => !!props.card.gameData?.img);

onMounted(() => {
  if (!hasImageUrl.value) {
    imageStatus.value = 'error';
    return;
  }
  
  const img = new Image();
  img.onload = () => { imageStatus.value = 'loaded'; };
  img.onerror = () => { imageStatus.value = 'error'; };
  img.src = props.card.gameData.img;
});

const showImage = computed(() => imageStatus.value === 'loaded');
const showPlaceholder = computed(() => imageStatus.value === 'error' || !hasImageUrl.value);

// Computed classes and styles
const tierClass = computed(() => `game-card--${props.card.tier.toLowerCase()}`);

const isAnimating = computed(() => 
  animationPhase.value === 'expanding' || 
  animationPhase.value === 'collapsing'
);

const isDetailMode = computed(() => 
  animationPhase.value === 'expanding' || 
  animationPhase.value === 'expanded' ||
  animationPhase.value === 'collapsing'
);

// Preview card styles (in grid)
const previewCardStyles = computed(() => {
  if (isAnimating.value) return { opacity: 0, visibility: 'hidden' as const };
  return {
    transform: cardTransform.value,
    transition: cardTransition.value,
    "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
    "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
  };
});

// Expanded card styles (floating)
const expandedCardStyles = computed(() => ({
  ...currentStyle.value,
  "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
  "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
}));

// Detail card styles with tilt (only apply tilt when fully expanded, not during animation)
const detailCardStylesWithTilt = computed(() => {
  const baseStyles = expandedCardStyles.value;
  
  // During animation phases, don't apply tilt - use base animation styles
  if (animationPhase.value === 'expanding' || animationPhase.value === 'collapsing') {
    return baseStyles;
  }
  
  // When fully expanded, apply tilt effect
  if (animationPhase.value === 'expanded') {
    return {
      ...baseStyles,
      transform: detailCardTransform.value,
      transition: detailCardTransition.value,
    };
  }
  
  return baseStyles;
});

// Halo intensity based on animation phase
const haloOpacity = computed(() => {
  switch (animationPhase.value) {
    case 'expanding': return 1;
    case 'expanded': return 1;
    case 'collapsing': return 0;
    default: return 0;
  }
});
</script>

<template>
  <div ref="cardContainerRef" class="game-card-container">
    <!-- CARD BACK (not owned) -->
    <article
      v-if="!isOwned"
      ref="cardRef"
      tabindex="-1"
      aria-label="Carte inconnue"
      class="game-card game-card--back"
      :style="{
        transform: cardTransform,
        transition: cardTransition,
      }"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <div class="game-card__frame game-card__frame--back">
        <div class="game-card__bg game-card__bg--back"></div>
        <div class="card-back__border"></div>
        <span class="card-back__rune card-back__rune--tl">✧</span>
        <span class="card-back__rune card-back__rune--tr">✧</span>
        <span class="card-back__rune card-back__rune--bl">✧</span>
        <span class="card-back__rune card-back__rune--br">✧</span>
      </div>
      <div class="card-back__logo-wrapper">
        <img :src="cardBackLogoUrl" alt="Le Collecteur de Dose" class="card-back__logo" />
      </div>
      <div class="card-back__decoration">
        <div class="card-back__line card-back__line--top"></div>
        <div class="card-back__line card-back__line--bottom"></div>
      </div>
    </article>

    <!-- CARD FRONT (owned) - PREVIEW MODE (in grid) -->
    <article
      v-else-if="!isDetailMode"
      ref="cardRef"
      role="button"
      tabindex="0"
      :aria-label="`Carte ${card.name}`"
      class="game-card game-card--preview"
      :class="[tierClass, { 'game-card--hovering': isHovering }]"
      :style="previewCardStyles"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.space="handleClick"
    >
      <div class="game-card__frame">
        <div class="game-card__bg"></div>
      </div>
      <span class="game-card__tier">{{ card.tier }}</span>
      <div class="game-card__image-wrapper" :style="{ transform: imageTransform }">
        <div v-if="imageStatus === 'loading' && hasImageUrl" class="game-card__image-loading">
          <div class="game-card__spinner"></div>
        </div>
        <img v-show="showImage" :src="card.gameData.img" :alt="card.name" class="game-card__image" />
        <div v-if="showPlaceholder" class="game-card__image-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
      </div>
      <div class="game-card__info">
        <h3 class="game-card__name">{{ card.name }}</h3>
        <p class="game-card__class">{{ card.itemClass }}</p>
      </div>
    </article>

    <!-- PLACEHOLDER when card is in detail mode (keeps grid space) -->
    <div 
      v-else 
      class="game-card-placeholder"
      :style="{ opacity: 0 }"
    >
      <!-- Invisible placeholder to maintain grid space -->
    </div>

    <!-- EXPANDED CARD (floating, with halo) - uses Teleport to body -->
    <Teleport to="body">
      <div 
        v-if="isDetailMode && isOwned" 
        class="expanded-card-wrapper"
        :class="{
          'expanded-card-wrapper--expanding': animationPhase === 'expanding',
          'expanded-card-wrapper--expanded': animationPhase === 'expanded',
          'expanded-card-wrapper--collapsing': animationPhase === 'collapsing',
        }"
        @click.self="handleClose"
      >
        <!-- Halo/Glow effect emanating from card -->
        <div 
          class="card-halo"
          :style="{
            ...expandedCardStyles,
            opacity: haloOpacity,
          }"
        ></div>

        <!-- The actual expanded card -->
        <article
          ref="detailCardRef"
          class="game-card game-card--detail"
          :class="[tierClass, { 'game-card--hovering': isDetailHovering && animationPhase === 'expanded' }]"
          :style="detailCardStylesWithTilt"
          @mouseenter="onDetailMouseEnter"
          @mouseleave="onDetailMouseLeave"
        >
          <!-- Close button -->
          <button class="game-card__close" @click="handleClose">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Card content with crossfade between preview and detail -->
          <div class="game-card__frame game-card__frame--detail">
            <!-- Title bar (detail mode) -->
            <div class="detail__title-bar">
              <span class="detail__name">{{ card.name }}</span>
              <span class="detail__tier-badge">{{ card.tier }}</span>
            </div>

            <!-- Artwork -->
            <div class="detail__artwork">
              <img 
                v-if="showImage" 
                :src="card.gameData.img" 
                :alt="card.name" 
                class="detail__image"
                :style="{ transform: detailImageTransform }"
              />
              <div v-else class="detail__image-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            </div>

            <!-- Type line -->
            <div class="detail__type-line">
              <span class="detail__type">{{ card.itemClass }}</span>
              <span class="detail__divider">◆</span>
              <span class="detail__rarity">{{ card.rarity }}</span>
            </div>

            <!-- Separator -->
            <div class="detail__separator">
              <span class="detail__separator-line"></span>
              <span class="detail__separator-rune">✧</span>
              <span class="detail__separator-line"></span>
            </div>

            <!-- Flavour text -->
            <div class="detail__flavour">
              <p v-if="card.flavourText">"{{ card.flavourText }}"</p>
              <p v-else class="detail__no-flavour">Aucune description disponible</p>
            </div>

            <!-- Separator -->
            <div class="detail__separator">
              <span class="detail__separator-line"></span>
              <span class="detail__separator-rune">◇</span>
              <span class="detail__separator-line"></span>
            </div>

            <!-- Bottom info -->
            <div class="detail__bottom-info">
              <span class="detail__collector-number">#{{ card.uid }}</span>
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
          </div>
        </article>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===========================================
   CONTAINER
   =========================================== */
.game-card-container {
  position: relative;
}

.game-card-placeholder {
  width: 100%;
  aspect-ratio: 2.5/3.5;
}

/* ===========================================
   PREVIEW MODE (in grid)
   =========================================== */
.game-card--preview {
  cursor: pointer;
}

.game-card__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    145deg,
    rgba(30, 30, 35, 0.9) 0%,
    rgba(15, 15, 18, 0.95) 50%,
    rgba(10, 10, 12, 1) 100%
  );
  border-radius: inherit;
}

.game-card__bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
  border-radius: inherit;
}

/* ===========================================
   EXPANDED CARD WRAPPER (dark overlay with blur)
   =========================================== */
.expanded-card-wrapper {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Start transparent */
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  
  /* Synchronized transition - same as card animation (0.5s open, 0.4s close) */
  transition: background 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), 
              backdrop-filter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Opening and opened states */
.expanded-card-wrapper--expanding,
.expanded-card-wrapper--expanded {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Closing state - synchronized with card return animation (0.4s) */
.expanded-card-wrapper--collapsing {
  background: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
  transition: background 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
              backdrop-filter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ===========================================
   HALO EFFECT - Disabled, using box-shadow on card instead
   =========================================== */
.card-halo {
  display: none;
}

/* ===========================================
   DETAIL MODE CARD
   =========================================== */
.game-card--detail {
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--tier-color, #2a2a30);
  box-shadow: 
    0 25px 80px rgba(0, 0, 0, 0.9),
    0 0 50px var(--tier-glow, transparent);
  background: linear-gradient(180deg, #18181c 0%, #0e0e12 100%);
}

/* Detail frame content transition - synchronized with card movement */
.game-card--detail .game-card__frame--detail {
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); /* Same timing as card */
}

/* Show content during opening and when expanded */
.expanded-card-wrapper--expanding .game-card--detail .game-card__frame--detail,
.expanded-card-wrapper--expanded .game-card--detail .game-card__frame--detail {
  opacity: 1;
}

/* Hide content smoothly when collapsing - synchronized with card return */
.expanded-card-wrapper--collapsing .game-card--detail .game-card__frame--detail {
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* Same timing as card */
}

.game-card--detail.game-card--t0 {
  border-color: #6d5a2a;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(201, 162, 39, 0.15);
}

.game-card--detail.game-card--t1 {
  border-color: #3a3445;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 20px rgba(122, 106, 138, 0.12);
}

.game-card--detail.game-card--t2 {
  border-color: #3a4550;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 15px rgba(90, 112, 128, 0.1);
}

.game-card--detail.game-card--t3 {
  border-color: #2a2a2d;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95);
}

/* Close button */
.game-card__close {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 35, 0.9);
  border: 1px solid rgba(60, 60, 65, 0.5);
  border-radius: 50%;
  color: #7f7f7f;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
}

.game-card__close:hover {
  background: rgba(50, 50, 55, 0.95);
  color: #fff;
  border-color: rgba(100, 100, 105, 0.6);
}

.game-card__close svg {
  width: 18px;
  height: 18px;
}

/* Detail frame */
.game-card__frame--detail {
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 10px;
  height: 100%;
}

/* Title bar */
.detail__title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(40, 40, 48, 0.6) 0%, rgba(25, 25, 30, 0.8) 100%);
  border-radius: 8px;
}

.detail__name {
  font-family: 'Cinzel', serif;
  font-size: 18px;
  font-weight: 700;
  color: #f0f0f0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.detail__tier-badge {
  font-family: 'Cinzel', serif;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--tier-glow, #94a3b8);
}

/* Artwork */
.detail__artwork {
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
  background: linear-gradient(180deg, #14141a 0%, #0a0a0e 100%);
  border-radius: 4px;
}

.detail__image-placeholder svg {
  width: 48px;
  height: 48px;
  color: var(--tier-color, #3a3a45);
  opacity: 0.35;
}

/* Type line */
.detail__type-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.detail__type {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  font-weight: 600;
  color: #9a9a9a;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.detail__divider {
  font-size: 10px;
  color: var(--tier-color, #4a4a4a);
}

.detail__rarity {
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  color: var(--tier-glow, #7f7f7f);
  font-style: italic;
}

/* Separators */
.detail__separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}

.detail__separator-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--tier-color, #3a3a40) 50%, transparent 100%);
}

.detail__separator-rune {
  font-size: 12px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.7;
}

/* Flavour text */
.detail__flavour {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  min-height: 40px;
}

.detail__flavour p {
  font-family: 'Crimson Text', serif;
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: #9a9a9a;
  margin: 0;
}

.detail__no-flavour {
  color: #5a5a5a;
}

/* Bottom info */
.detail__bottom-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 8px 0;
  margin-top: auto;
}

.detail__collector-number {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #6a6a6a;
}

.detail__wiki-link {
  font-family: 'Cinzel', serif;
  font-size: 11px;
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
  font-size: 13px;
  color: var(--tier-glow, #6a6a6a);
}

/* ===========================================
   CARD BACK STYLES
   =========================================== */
.game-card--back {
  cursor: default;
}

.game-card__bg--back {
  background: linear-gradient(160deg, #0a0908 0%, #060505 30%, #030303 60%, #080706 100%);
}

.game-card__bg--back::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(20, 15, 12, 0.3) 0%, transparent 70%);
  border-radius: inherit;
}

.game-card__bg--back::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.04;
  mix-blend-mode: overlay;
  border-radius: inherit;
}

.card-back__border {
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(60, 50, 45, 0.25);
  border-radius: 6px;
  pointer-events: none;
}

.card-back__border::before {
  content: "";
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(50, 40, 35, 0.2);
  border-radius: 4px;
}

.card-back__border::after {
  content: "";
  position: absolute;
  inset: -4px;
  border: 1px solid rgba(40, 30, 25, 0.15);
  border-radius: 8px;
}

.card-back__rune {
  position: absolute;
  font-size: 12px;
  color: rgba(80, 65, 55, 0.4);
  z-index: 2;
}

.card-back__rune--tl { top: 14px; left: 14px; }
.card-back__rune--tr { top: 14px; right: 14px; }
.card-back__rune--bl { bottom: 14px; left: 14px; }
.card-back__rune--br { bottom: 14px; right: 14px; }

.card-back__logo-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  padding: 20%;
}

.card-back__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.9;
}

.card-back__decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.card-back__line {
  position: absolute;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(50, 40, 35, 0.3) 20%, rgba(60, 50, 45, 0.4) 50%, rgba(50, 40, 35, 0.3) 80%, transparent 100%);
}

.card-back__line--top { top: 45px; }
.card-back__line--bottom { bottom: 45px; }
</style>
