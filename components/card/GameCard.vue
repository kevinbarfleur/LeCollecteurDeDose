<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";
import { useCardTilt } from "~/composables/useCardTilt";
import { useHolographic } from "~/composables/useHolographic";

const props = defineProps<{
  card: Card;
  showFlavour?: boolean;
}>();

const cardRef = ref<HTMLElement | null>(null);

// Card tilt effect
const {
  isHovering,
  mouseXPercent,
  mouseYPercent,
  cardTransform,
  imageTransform,
  cardTransition,
  onMouseEnter,
  onMouseLeave,
} = useCardTilt(cardRef, {
  maxTilt: 15,
  scale: 1.05,
});

// Get tier config
const tierConfig = computed(() => TIER_CONFIG[props.card.tier as CardTier]);

// Holographic effect (disabled for T3)
const holoEnabled = computed(() => props.card.tier !== "T3");
const holoIntensity = computed(() => tierConfig.value?.holoIntensity ?? 0.35);

const { holoStyles } = useHolographic(
  mouseXPercent,
  mouseYPercent,
  isHovering,
  {
    intensity: holoIntensity.value,
    enabled: holoEnabled.value,
  }
);

// Has valid image
const hasImage = computed(() => !!props.card.gameData?.img);

// Tier CSS class
const tierClass = computed(() => `game-card--${props.card.tier.toLowerCase()}`);

// Combined styles for the card
const cardStyles = computed(() => ({
  transform: cardTransform.value,
  transition: cardTransition.value,
  "--tier-color": tierConfig.value?.color ?? "#94a3b8",
  ...holoStyles.value,
}));
</script>

<template>
  <div class="game-card-container">
    <article
      ref="cardRef"
      class="game-card"
      :class="tierClass"
      :style="cardStyles"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Card frame with ornate borders -->
      <div class="game-card__frame">
        <!-- Background gradient based on tier -->
        <div class="game-card__bg"></div>
      </div>

      <!-- Tier badge -->
      <span class="game-card__tier">{{ card.tier }}</span>

      <!-- Item image with parallax -->
      <img
        v-if="hasImage"
        :src="card.gameData.img"
        :alt="card.name"
        class="game-card__image"
        :style="{ transform: imageTransform }"
        loading="lazy"
      />

      <!-- Placeholder for missing images -->
      <div
        v-else
        class="game-card__image-placeholder"
        :style="{ transform: imageTransform }"
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

      <!-- Card info -->
      <div class="game-card__info">
        <h3 class="game-card__name">{{ card.name }}</h3>
        <p class="game-card__class">{{ card.itemClass }}</p>
      </div>

      <!-- Holographic overlay -->
      <div
        v-if="holoEnabled"
        class="game-card__holo"
        :class="{ active: isHovering }"
        :style="{
          background: holoStyles['--holo-bg'],
          opacity: holoStyles['--holo-opacity'],
        }"
      ></div>

      <!-- Glare/shine effect -->
      <div
        class="game-card__glare"
        :style="{
          background: holoStyles['--glare-bg'],
          opacity: holoStyles['--glare-opacity'],
        }"
      ></div>

      <!-- Flavour text tooltip -->
      <div
        v-if="showFlavour !== false && card.flavourText"
        class="game-card__flavour"
      >
        "{{ card.flavourText }}"
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
</style>
