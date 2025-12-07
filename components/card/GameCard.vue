<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";
import { useCardTilt } from "~/composables/useCardTilt";
import gsap from "gsap";

const props = defineProps<{
  card: Card;
  showFlavour?: boolean;
  owned?: boolean;
  previewOnly?: boolean; // When true, disables click to open detail view
}>();

const emit = defineEmits<{
  click: [card: Card];
}>();

const cardRef = ref<HTMLElement | null>(null);

// Refs for GSAP animations
const floatingCardRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const previewViewRef = ref<HTMLElement | null>(null);
const detailViewRef = ref<HTMLElement | null>(null);

// Default to owned if not specified
const isOwned = computed(() => props.owned !== false);

// Card back logo path
const cardBackLogoUrl = '/images/card-back-logo.png';

// ===========================================
// ANIMATION STATE
// ===========================================
type AnimationState = 'idle' | 'animating' | 'expanded';
const animationState = ref<AnimationState>('idle');

// Store original position for return animation
const originalRect = ref<DOMRect | null>(null);

// Current timeline (to kill if needed)
let currentTimeline: gsap.core.Timeline | null = null;

// ===========================================
// OPEN CARD (GSAP Timeline)
// ===========================================
const openCard = async () => {
  if (!isOwned.value || !cardRef.value) return;
  
  // Kill any existing animation
  if (currentTimeline) {
    currentTimeline.kill();
  }
  
  // Get current position
  const rect = cardRef.value.getBoundingClientRect();
  originalRect.value = rect;
  
  // Calculate target position
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const targetWidth = Math.min(360, viewportWidth - 40);
  const targetHeight = targetWidth * 1.4;
  const centerX = (viewportWidth - targetWidth) / 2;
  const centerY = (viewportHeight - targetHeight) / 2;
  
  animationState.value = 'animating';
  
  await nextTick();
  
  const card = floatingCardRef.value;
  const overlay = overlayRef.value;
  const previewView = previewViewRef.value;
  const detailView = detailViewRef.value;
  
  if (!card || !overlay || !previewView || !detailView) return;
  
  // Get stagger elements
  const staggerElements = detailView.querySelectorAll('.detail__stagger');
  
  // Set initial states
  gsap.set(card, {
    position: 'fixed',
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: 1000,
  });
  
  gsap.set(overlay, { opacity: 0, backdropFilter: 'blur(0px)' });
  gsap.set(previewView, { opacity: 1 });
  gsap.set(detailView, { opacity: 1 });
  gsap.set(staggerElements, { opacity: 0, y: 8 });
  
  // Create synchronized timeline
  currentTimeline = gsap.timeline({
    onComplete: () => {
      animationState.value = 'expanded';
    }
  });
  
  // All animations happen together with slight offsets
  currentTimeline
    // Overlay fades in
    .to(overlay, {
      opacity: 1,
      backdropFilter: 'blur(12px)',
      duration: 0.4,
      ease: 'power2.out',
    }, 0)
    // Card moves to center
    .to(card, {
      top: centerY,
      left: centerX,
      width: targetWidth,
      height: targetHeight,
      duration: 0.45,
      ease: 'power3.out',
    }, 0)
    // Preview fades out (starts slightly after)
    .to(previewView, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.inOut',
    }, 0.1)
    // Detail elements stagger in (starts during movement)
    .to(staggerElements, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power2.out',
      stagger: 0.04,
    }, 0.15);
};

// ===========================================
// CLOSE CARD (GSAP Timeline)
// ===========================================
const closeCard = async () => {
  if (animationState.value !== 'expanded') return;
  
  // Kill any existing animation
  if (currentTimeline) {
    currentTimeline.kill();
  }
  
  const rect = originalRect.value;
  if (!rect) {
    resetToIdle();
    return;
  }
  
  const card = floatingCardRef.value;
  const overlay = overlayRef.value;
  const previewView = previewViewRef.value;
  const detailView = detailViewRef.value;
  
  if (!card || !overlay || !previewView || !detailView) {
    resetToIdle();
    return;
  }
  
  const staggerElements = detailView.querySelectorAll('.detail__stagger');
  
  animationState.value = 'animating';
  
  // Create synchronized close timeline
  currentTimeline = gsap.timeline({
    onComplete: () => {
      resetToIdle();
    }
  });
  
  currentTimeline
    // Detail elements fade out quickly (all together)
    .to(staggerElements, {
      opacity: 0,
      duration: 0.15,
      ease: 'power2.in',
    }, 0)
    // Preview fades back in
    .to(previewView, {
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out',
    }, 0.05)
    // Card moves back to grid
    .to(card, {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      duration: 0.4,
      ease: 'power3.out',
    }, 0.05)
    // Overlay fades out
    .to(overlay, {
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
  
  // Reset GSAP styles
  if (floatingCardRef.value) {
    gsap.set(floatingCardRef.value, { clearProps: 'all' });
  }
};

// Handle click on card
const handleClick = () => {
  if (!isOwned.value) return;
  
  // In preview-only mode, don't open detail view (parent handles it)
  if (props.previewOnly) {
    emit('click', props.card);
    return;
  }
  
  if (animationState.value === 'idle') {
    openCard();
  }
  emit('click', props.card);
};

// Handle close (escape or click outside)
const handleClose = () => {
  if (animationState.value === 'expanded') {
    closeCard();
  }
};

// Close on escape key
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

// ===========================================
// CARD TILT EFFECT (for grid card)
// ===========================================
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

// ===========================================
// CARD TILT EFFECT (for floating/detail card using GSAP)
// ===========================================
const isFloatingHovering = ref(false);

const onFloatingMouseMove = (e: MouseEvent) => {
  if (animationState.value !== 'expanded' || !floatingCardRef.value) return;
  
  const card = floatingCardRef.value;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateY = ((x - centerX) / centerX) * 8; // max 8 degrees
  const rotateX = ((centerY - y) / centerY) * 8;
  
  gsap.to(card, {
    rotateX,
    rotateY,
    scale: 1.02,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto',
  });
};

const onFloatingMouseEnter = () => {
  isFloatingHovering.value = true;
};

const onFloatingMouseLeave = () => {
  isFloatingHovering.value = false;
  if (floatingCardRef.value && animationState.value === 'expanded') {
    gsap.to(floatingCardRef.value, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.5,
      ease: 'power2.out',
    });
  }
};

// ===========================================
// COMPUTED STYLES
// ===========================================
const tierConfig = computed(() => TIER_CONFIG[props.card.tier as CardTier]);
const tierClass = computed(() => `game-card--${props.card.tier.toLowerCase()}`);

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

// Is the card currently animating or expanded?
const isFloating = computed(() => animationState.value !== 'idle');

// Tier styles
const tierStyles = computed(() => ({
  "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
  "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
}));

// Card styles for grid (non-floating)
const cardStyles = computed(() => ({
  ...tierStyles.value,
  transform: cardTransform.value,
  transition: cardTransition.value,
}));

// Is overlay/floating card visible?
const showOverlay = computed(() => animationState.value !== 'idle');
</script>

<template>
  <div class="game-card-container">
    <!-- Teleport for overlay + floating card -->
    <Teleport to="body">
      <div v-if="showOverlay" class="floating-card-wrapper">
        <!-- Overlay (GSAP animated) -->
        <div 
          ref="overlayRef"
          class="card-overlay"
          @click="handleClose"
        />
        
        <!-- Floating card (GSAP animated position + tilt) -->
        <article
          ref="floatingCardRef"
          class="game-card game-card--floating"
          :class="[tierClass, { 'game-card--hovering': isFloatingHovering }]"
          :style="tierStyles"
          @mousemove="onFloatingMouseMove"
          @mouseenter="onFloatingMouseEnter"
          @mouseleave="onFloatingMouseLeave"
        >
          <!-- Card content wrapper -->
          <div class="game-card__tilt-wrapper">
            <!-- Close button (only when expanded) -->
            <button 
              v-if="animationState === 'expanded'"
              class="game-card__close" 
              @click.stop="handleClose"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- PREVIEW VIEW (GSAP fades this out) -->
            <div 
              ref="previewViewRef"
              class="card-view card-view--preview"
            >
            <div class="game-card__frame">
              <div class="game-card__bg"></div>
            </div>
            <div class="game-card__image-wrapper">
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
          </div>

          <!-- DETAIL VIEW (GSAP animates each stagger element) -->
          <div 
            ref="detailViewRef"
            class="card-view card-view--detail"
          >
            <div class="detail__title-bar detail__stagger" style="--stagger: 0">
              <span class="detail__name">{{ card.name }}</span>
              <span class="detail__tier-badge">{{ card.tier }}</span>
            </div>

            <div class="detail__artwork detail__stagger" style="--stagger: 1">
              <img v-if="showImage" :src="card.gameData.img" :alt="card.name" class="detail__image" />
              <div v-else class="detail__image-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            </div>

            <div class="detail__type-line detail__stagger" style="--stagger: 2">
              <span class="detail__type">{{ card.itemClass }}</span>
              <span class="detail__divider">◆</span>
              <span class="detail__rarity">{{ card.rarity }}</span>
            </div>

            <div class="detail__separator detail__stagger" style="--stagger: 3">
              <span class="detail__separator-line"></span>
              <span class="detail__separator-rune">✧</span>
              <span class="detail__separator-line"></span>
            </div>

            <div class="detail__flavour detail__stagger" style="--stagger: 4">
              <p v-if="card.flavourText">"{{ card.flavourText }}"</p>
              <p v-else class="detail__no-flavour">Aucune description disponible</p>
            </div>

            <div class="detail__separator detail__stagger" style="--stagger: 5">
              <span class="detail__separator-line"></span>
              <span class="detail__separator-rune">◇</span>
              <span class="detail__separator-line"></span>
            </div>

            <div class="detail__bottom-info detail__stagger" style="--stagger: 6">
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
          </div><!-- End tilt wrapper -->
        </article>
      </div>
    </Teleport>

    <!-- Placeholder to keep grid space when card is floating -->
    <div 
      v-if="isFloating && isOwned" 
      class="game-card-placeholder"
    />

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

    <!-- MAIN CARD in grid (owned, not floating) - PREVIEW ONLY -->
    <article
      v-else-if="!isFloating"
      ref="cardRef"
      role="button"
      tabindex="0"
      :aria-label="`Carte ${card.name}`"
      class="game-card"
      :class="[
        tierClass,
        { 'game-card--hovering': isHovering },
      ]"
      :style="cardStyles"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.space="handleClick"
    >
      <div class="game-card__frame">
        <div class="game-card__bg"></div>
      </div>
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
  </div>
</template>

<style scoped>
/* ===========================================
   CONTAINER & PLACEHOLDER
   =========================================== */
.game-card-container {
  position: relative;
}

.game-card-placeholder {
  width: 100%;
  aspect-ratio: 2.5/3.5;
  background: transparent;
}

/* ===========================================
   OVERLAY (GSAP controls opacity/blur)
   =========================================== */
.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  /* Note: backdrop-filter is set by GSAP */
}

/* ===========================================
   FLOATING CARD WRAPPER
   =========================================== */
.floating-card-wrapper {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
}

.floating-card-wrapper .card-overlay {
  pointer-events: auto;
}

.floating-card-wrapper .game-card {
  pointer-events: auto;
  transform-style: preserve-3d;
}

/* Perspective container for 3D tilt effect */
.floating-card-wrapper {
  perspective: 1000px;
}

/* ===========================================
   MAIN CARD
   =========================================== */
.game-card {
  position: relative;
  width: 100%;
  aspect-ratio: 2.5/3.5;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(160deg, #12110f 0%, #0a0908 50%, #0d0c0a 100%);
}

.game-card--floating {
  cursor: default;
  z-index: 1001; /* Above overlay */
  aspect-ratio: unset; /* Use explicit width/height when floating */
}

/* Tilt wrapper for hover effect */
.game-card__tilt-wrapper {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

/* ===========================================
   CARD VIEWS (GSAP controls animations)
   =========================================== */
.card-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  will-change: opacity, transform;
}

.card-view--preview {
  /* GSAP will animate opacity */
}

.card-view--detail {
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 8px;
  /* GSAP will animate opacity of children */
}

/* ===========================================
   STAGGER ELEMENTS (GSAP animates these)
   =========================================== */
.detail__stagger {
  /* Initial state - GSAP sets opacity:0, y:8 */
  will-change: opacity, transform;
}

/* ===========================================
   CLOSE BUTTON
   =========================================== */
.game-card__close {
  position: absolute;
  top: -45px;
  right: 0;
  width: 36px;
  height: 36px;
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
}

.game-card__close svg {
  width: 16px;
  height: 16px;
}

/* ===========================================
   PREVIEW VIEW STYLES
   =========================================== */
.game-card__frame {
  position: absolute;
  inset: 0;
}

.game-card__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(18, 17, 15, 0.95) 0%, rgba(10, 9, 8, 0.98) 50%, rgba(13, 12, 10, 1) 100%);
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

.detail__artwork {
  flex: 1;
  min-height: 120px;
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
  width: 48px;
  height: 48px;
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
  font-size: 12px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.7;
}

.detail__flavour {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6px 8px;
  min-height: 36px;
}

.detail__flavour p {
  font-family: 'Crimson Text', serif;
  font-style: italic;
  font-size: 15px;
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
   FLOATING STATE ENHANCEMENTS
   =========================================== */
.game-card--floating {
  border: 2px solid var(--tier-color, #2a2a30);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.5);
}

.game-card--floating.game-card--t0 {
  border-color: #6d5a2a;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(201, 162, 39, 0.15);
}

.game-card--floating.game-card--t1 {
  border-color: #3a3445;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 20px rgba(122, 106, 138, 0.12);
}

.game-card--floating.game-card--t2 {
  border-color: #3a4550;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 15px rgba(90, 112, 128, 0.1);
}

.game-card--floating.game-card--t3 {
  border-color: #2a2a2d;
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
