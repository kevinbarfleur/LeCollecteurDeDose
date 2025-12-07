<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";
import { useCardTilt } from "~/composables/useCardTilt";

const props = defineProps<{
  card: Card;
  showFlavour?: boolean;
  owned?: boolean; // If false, show card back
}>();

const emit = defineEmits<{
  click: [card: Card];
}>();

const cardRef = ref<HTMLElement | null>(null);

// Default to owned if not specified
const isOwned = computed(() => props.owned !== false);

// Card back logo path (from public folder)
const cardBackLogoUrl = '/images/card-back-logo.png';

// Handle card click
const handleClick = () => {
  emit('click', props.card);
};

// Card tilt effect
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

// Get tier config
const tierConfig = computed(() => TIER_CONFIG[props.card.tier as CardTier]);

// Image loading state
const imageStatus = ref<'loading' | 'loaded' | 'error'>('loading');

// Has valid image URL
const hasImageUrl = computed(() => !!props.card.gameData?.img);

// Check image validity on client side
onMounted(() => {
  if (!hasImageUrl.value) {
    imageStatus.value = 'error';
    return;
  }
  
  // Create a new image to test if URL is valid
  const img = new Image();
  img.onload = () => {
    imageStatus.value = 'loaded';
  };
  img.onerror = () => {
    imageStatus.value = 'error';
  };
  img.src = props.card.gameData.img;
});

// Show image only if loaded successfully
const showImage = computed(() => imageStatus.value === 'loaded');
const showPlaceholder = computed(() => imageStatus.value === 'error' || !hasImageUrl.value);

// Tier CSS class
const tierClass = computed(() => `game-card--${props.card.tier.toLowerCase()}`);

// Combined styles for the card front (with tier colors)
const cardStyles = computed(() => ({
  transform: cardTransform.value,
  transition: cardTransition.value,
  "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
  "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
}));

// Styles for card back (no tier colors - all backs are identical)
const cardBackStyles = computed(() => ({
  transform: cardTransform.value,
  transition: cardTransition.value,
}));
</script>

<template>
  <div class="game-card-container">
    <!-- CARD FRONT (owned) -->
    <article
      v-if="isOwned"
      ref="cardRef"
      role="button"
      tabindex="0"
      :aria-label="`Carte ${card.name}`"
      class="game-card"
      :class="[tierClass, { 'game-card--hovering': isHovering }]"
      :style="cardStyles"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.space="handleClick"
    >
      <!-- Card frame with ornate borders -->
      <div class="game-card__frame">
        <!-- Background gradient based on tier -->
        <div class="game-card__bg"></div>
      </div>

      <!-- Tier badge -->
      <span class="game-card__tier">{{ card.tier }}</span>

      <!-- Image container for proper centering -->
      <div class="game-card__image-wrapper" :style="{ transform: imageTransform }">
        <!-- Loading spinner while checking image -->
        <div v-if="imageStatus === 'loading' && hasImageUrl" class="game-card__image-loading">
          <div class="game-card__spinner"></div>
        </div>
        
        <!-- Item image with parallax -->
        <img
          v-show="showImage"
          :src="card.gameData.img"
          :alt="card.name"
          class="game-card__image"
        />

        <!-- Placeholder for missing/broken images -->
        <div
          v-if="showPlaceholder"
          class="game-card__image-placeholder"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
        </div>
      </div>

      <!-- Card info -->
      <div class="game-card__info">
        <h3 class="game-card__name">{{ card.name }}</h3>
        <p class="game-card__class">{{ card.itemClass }}</p>
      </div>

      <!-- Flavour text tooltip -->
      <div
        v-if="showFlavour !== false && card.flavourText"
        class="game-card__flavour"
      >
        "{{ card.flavourText }}"
      </div>
    </article>

    <!-- CARD BACK (not owned) - all backs are identical, no tier styling -->
    <article
      v-else
      ref="cardRef"
      tabindex="-1"
      aria-label="Carte inconnue"
      class="game-card game-card--back"
      :style="cardBackStyles"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Card back frame -->
      <div class="game-card__frame game-card__frame--back">
        <div class="game-card__bg game-card__bg--back"></div>
        
        <!-- Runic border pattern -->
        <div class="card-back__border"></div>
        
        <!-- Corner runes -->
        <span class="card-back__rune card-back__rune--tl">✧</span>
        <span class="card-back__rune card-back__rune--tr">✧</span>
        <span class="card-back__rune card-back__rune--bl">✧</span>
        <span class="card-back__rune card-back__rune--br">✧</span>
      </div>

      <!-- Centered logo (no parallax) -->
      <div class="card-back__logo-wrapper">
        <img
          :src="cardBackLogoUrl"
          alt="Le Collecteur de Dose"
          class="card-back__logo"
        />
      </div>

      <!-- Decorative lines -->
      <div class="card-back__decoration">
        <div class="card-back__line card-back__line--top"></div>
        <div class="card-back__line card-back__line--bottom"></div>
      </div>
    </article>
  </div>
</template>

<style scoped>
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

/* Add subtle noise texture */
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
   CARD BACK STYLES - Ancient/Runic Theme
   =========================================== */

.game-card--back {
  cursor: default;
}

/* Much darker background to highlight the red logo */
.game-card__bg--back {
  background: linear-gradient(
    160deg,
    #0a0908 0%,
    #060505 30%,
    #030303 60%,
    #080706 100%
  );
}

/* Very subtle texture overlay */
.game-card__bg--back::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 50% 50%, rgba(20, 15, 12, 0.3) 0%, transparent 70%);
  border-radius: inherit;
}

/* Worn/damaged edges effect - more subtle */
.game-card__bg--back::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.04;
  mix-blend-mode: overlay;
  border-radius: inherit;
}

/* Runic border pattern - subtle */
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

/* Corner runes - subtle */
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

/* Logo wrapper - centered without parallax */
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

/* Logo image - keep the red colors vibrant */
.card-back__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.9;
}

/* Decorative lines - subtle */
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
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(50, 40, 35, 0.3) 20%,
    rgba(60, 50, 45, 0.4) 50%,
    rgba(50, 40, 35, 0.3) 80%,
    transparent 100%
  );
}

.card-back__line--top {
  top: 45px;
}

.card-back__line--bottom {
  bottom: 45px;
}

/* No hover effects on card back */
</style>
