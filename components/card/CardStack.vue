<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";

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

// Hover state for top card lift effect
const isHovering = ref(false);

// ===========================================
// STACK OFFSET CALCULATION
// ===========================================
// The BASE card (visually at bottom of pile) is at position (0,0) - aligned with grid
// Cards stacked ON TOP are offset towards up-left

// Generate consistent random rotations for each layer (seeded by card ID)
const layerRotations = computed(() => {
  const rotations: number[] = [];
  const seed = topCard.value.id.charCodeAt(0) + topCard.value.id.length;
  
  for (let i = 0; i < visualStackCount.value; i++) {
    const pseudoRandom = Math.sin(seed * (i + 1) * 9999) * 10000;
    const rotation = (pseudoRandom - Math.floor(pseudoRandom) - 0.5) * 5;
    rotations.push(rotation);
  }
  return rotations;
});

const getLayerOffset = (layerIndex: number) => {
  const offset = layerIndex * 4;
  const rotation = layerRotations.value[layerIndex] || 0;
  return {
    transform: `translate(${-offset}px, ${-offset}px) rotate(${rotation}deg)`,
    zIndex: layerIndex + 1,
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
</script>

<template>
  <div class="card-stack-container">
    <!-- Stack preview -->
    <div 
      ref="stackRef"
      class="card-stack"
      :class="tierClass"
      :style="tierStyles"
    >
      <!-- Stack layers (underneath the top card) -->
      <div 
        v-for="i in (visualStackCount - 1)" 
        :key="`stack-layer-${i}`"
        class="card-stack__layer"
        :class="tierClass"
        :style="getLayerOffset(i - 1)"
      >
        <div 
          class="card-stack__layer-frame"
          :style="{ borderColor: tierConfig?.color }"
        >
          <div class="card-stack__layer-bg"></div>
          <div class="card-stack__layer-corner card-stack__layer-corner--tl" :style="{ borderColor: tierConfig?.color }"></div>
          <div class="card-stack__layer-corner card-stack__layer-corner--br" :style="{ borderColor: tierConfig?.color }"></div>
        </div>
        <div class="card-stack__layer-bottom-shadow"></div>
      </div>
      
      <!-- Top card (actual GameCard) -->
      <div 
        class="card-stack__top-wrapper"
        :class="{ 'card-stack__top-wrapper--hovering': isHovering }"
        :style="topCardOffset"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <!-- GameCard handles its own click and detail view -->
        <GameCard
          :card="topCard"
          :owned="true"
        />
        <!-- Count badge -->
        <div class="card-stack__count">
          <span>x{{ count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===========================================
   CONTAINER
   =========================================== */
.card-stack-container {
  position: relative;
}

/* ===========================================
   STACK PREVIEW
   =========================================== */
.card-stack {
  position: relative;
  display: inline-block;
}

/* ===========================================
   STACK LAYERS (background cards)
   =========================================== */
.card-stack__layer {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  pointer-events: none;
}

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

.card-stack__layer-frame::before,
.card-stack__layer-frame::after {
  content: '';
  position: absolute;
  width: 30px;
  height: 30px;
  border: 2px solid var(--tier-color, #3a3a40);
  opacity: 0.5;
  transition: opacity 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99), border-color 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99);
}

.card-stack__layer-frame::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
  border-radius: 10px 0 0 0;
}

.card-stack__layer-frame::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 10px 0;
}

.card-stack__layer-bg {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(135deg, 
      rgba(255, 255, 255, 0.03) 0%, 
      transparent 50%, 
      rgba(0, 0, 0, 0.1) 100%
    ),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: cover, 128px 128px;
  opacity: 0.02;
}

.card-stack__layer-bottom-shadow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to top, 
    rgba(0, 0, 0, 0.85) 0%, 
    rgba(0, 0, 0, 0.5) 40%, 
    transparent 100%
  );
  border-radius: 0 0 12px 12px;
  z-index: 20;
  pointer-events: none;
}

/* ===========================================
   TOP CARD WRAPPER
   =========================================== */
.card-stack__top-wrapper {
  position: relative;
  transition: transform 0.2s ease-out;
  z-index: 10;
}

.card-stack__top-wrapper--hovering {
  z-index: 100;
}

/* ===========================================
   COUNT BADGE
   =========================================== */
.card-stack__count {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 32px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2a2a2f 0%, #1a1a1f 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-family: 'Cinzel', serif;
  font-size: 12px;
  font-weight: 600;
  color: #c8c8c8;
  padding: 0 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  z-index: 20;
  pointer-events: none;
}

/* ===========================================
   TIER-SPECIFIC COLORS
   =========================================== */
.card-stack--t0 {
  --tier-color: #c9a227;
  --tier-glow: rgba(201, 162, 39, 0.4);
}

.card-stack--t1 {
  --tier-color: #7a6a8a;
  --tier-glow: rgba(122, 106, 138, 0.3);
}

.card-stack--t2 {
  --tier-color: #5a7080;
  --tier-glow: rgba(90, 112, 128, 0.25);
}

.card-stack--t3 {
  --tier-color: #4a4a50;
  --tier-glow: rgba(74, 74, 80, 0.2);
}
</style>
