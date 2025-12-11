<script setup lang="ts">
import type { Card, CardTier } from "~/types/card";
import { TIER_CONFIG } from "~/types/card";

interface Props {
  card: Card;
  flipped?: boolean;
  rotation?: number;
  // Simulated pointer position for foil effect (0-100)
  pointerX?: number;
  pointerY?: number;
  // If true, GSAP will control rotation - don't apply inline transform
  animated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  flipped: false,
  rotation: 0,
  pointerX: 50,
  pointerY: 50,
  animated: false,
});

// Card back logo (same as real cards)
const cardBackLogoUrl = "/images/orb.png";

// Card image
const cardImage = computed(() => props.card?.gameData?.img || "");

// Check if foil
const isFoil = computed(() => props.card?.foil === true);

// Tier config
const tierConfig = computed(() => TIER_CONFIG[props.card?.tier as CardTier]);
const tierClass = computed(
  () => `flip-card--${props.card?.tier?.toLowerCase() || "t3"}`
);

// Tier styles + foil effect variables (no transform when animated by GSAP)
const cardStyles = computed(() => {
  const pointerFromLeft = props.pointerX / 100;
  const pointerFromTop = props.pointerY / 100;
  const centerX = (props.pointerX - 50) / 50;
  const centerY = (props.pointerY - 50) / 50;
  const pointerFromCenter = Math.min(
    1,
    Math.sqrt(centerX * centerX + centerY * centerY) / Math.sqrt(2)
  );

  const styles: Record<string, string | number> = {
    "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
    "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
    "--pointer-x": props.pointerX,
    "--pointer-y": props.pointerY,
    "--pointer-from-center": pointerFromCenter,
    "--pointer-from-left": pointerFromLeft,
    "--pointer-from-top": pointerFromTop,
  };

  // Only apply transform if NOT animated by GSAP
  if (!props.animated) {
    const flipY = props.flipped ? 180 : 0;
    styles.transform = `rotateZ(${props.rotation}deg) rotateY(${flipY}deg)`;
  }

  return styles;
});

// Truncate flavour text for small cards
const truncatedFlavour = computed(() => {
  const text = props.card?.flavourText;
  if (!text) return null;
  if (text.length > 80) {
    return text.substring(0, 77) + "...";
  }
  return text;
});
</script>

<template>
  <div
    class="flip-card"
    :class="[tierClass, { 'flip-card--foil': isFoil }]"
    :style="cardStyles"
  >
    <!-- Back face (visible when not flipped) - NO tier border, NO foil effect -->
    <div class="flip-card__face flip-card__face--back">
      <div class="card-back">
        <div class="card-back__frame"></div>
        <div class="card-back__bg"></div>
        <div class="card-back__border"></div>
        <span class="card-back__rune card-back__rune--tl">✧</span>
        <span class="card-back__rune card-back__rune--tr">✧</span>
        <span class="card-back__rune card-back__rune--bl">✧</span>
        <span class="card-back__rune card-back__rune--br">✧</span>
        <div class="card-back__logo-wrapper">
          <img
            :src="cardBackLogoUrl"
            alt="Le Collecteur de Dose"
            class="card-back__logo"
          />
        </div>
        <div class="card-back__line card-back__line--top"></div>
        <div class="card-back__line card-back__line--bottom"></div>
        <!-- NO foil overlay on back - card identity should be hidden -->
      </div>
    </div>

    <!-- Front face (visible when flipped) - Detail view style -->
    <div class="flip-card__face flip-card__face--front">
      <div class="card-front">
        <!-- Title bar -->
        <div class="detail__title-bar">
          <span class="detail__name">{{ card.name }}</span>
          <span class="detail__tier-badge">{{ card.tier }}</span>
        </div>

        <!-- Artwork -->
        <div
          class="detail__artwork"
          :class="{ 'detail__artwork--foil': isFoil }"
        >
          <!-- Cosmos layers for foil -->
          <template v-if="isFoil">
            <div class="cosmos-layer"></div>
            <div class="cosmos-glare"></div>
          </template>
          <img
            v-if="cardImage"
            :src="cardImage"
            :alt="card.name"
            class="detail__image"
          />
          <div v-else class="detail__image-placeholder">
            <span>?</span>
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
          <p v-if="truncatedFlavour">"{{ truncatedFlavour }}"</p>
          <p v-else class="detail__no-flavour">—</p>
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
          <span class="detail__wiki-link">Wiki ↗</span>
          <span v-if="card.gameData?.weight" class="detail__weight">
            ◆ {{ card.gameData.weight }}
          </span>
        </div>

        <!-- Foil overlay for front -->
        <div v-if="isFoil" class="foil-overlay"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
  /* Disable all mouse interactions */
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.flip-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4);
}

.flip-card__face--back {
  transform: rotateY(0deg);
}

.flip-card__face--front {
  transform: rotateY(180deg);
}

/* ==========================================
   CARD BACK - Matches GameCard back style
   ========================================== */
.card-back {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    160deg,
    #0a0908 0%,
    #060505 30%,
    #030303 60%,
    #080706 100%
  );
  border-radius: 10px;
  /* Transparent border - keeps same size as front, no visible border */
  border: 1px solid transparent;
}

.card-back__frame {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.card-back__bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(20, 15, 12, 0.3) 0%,
    transparent 70%
  );
  border-radius: inherit;
}

.card-back__bg::after {
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

.card-back__rune {
  position: absolute;
  font-size: 10px;
  /* Neutral color - no tier hint on back */
  color: rgba(80, 65, 55, 0.5);
  opacity: 0.7;
  z-index: 2;
}

.card-back__rune--tl {
  top: 12px;
  left: 12px;
}
.card-back__rune--tr {
  top: 12px;
  right: 12px;
}
.card-back__rune--bl {
  bottom: 12px;
  left: 12px;
}
.card-back__rune--br {
  bottom: 12px;
  right: 12px;
}

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
  padding: 25%;
}

.card-back__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.6;
  filter: brightness(0.8) saturate(0.9);
}

.card-back__line {
  position: absolute;
  left: 18%;
  right: 18%;
  height: 1px;
  /* Neutral color - no tier hint on back */
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(50, 40, 35, 0.3) 20%,
    rgba(60, 50, 45, 0.4) 50%,
    rgba(50, 40, 35, 0.3) 80%,
    transparent 100%
  );
  z-index: 2;
}

.card-back__line--top {
  top: 40px;
}
.card-back__line--bottom {
  bottom: 40px;
}

/* ==========================================
   CARD FRONT - Detail view style (exact match)
   ========================================== */
.card-front {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #12110f 0%, #0a0908 50%, #0d0c0a 100%);
  border-radius: 10px;
  /* Thinner, more subtle tier border */
  border: 1px solid var(--tier-color, #2a2a30);
  display: flex;
  flex-direction: column;
  padding: 5px;
  gap: 2px;
}

/* Title bar */
.detail__title-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );
  border-radius: 3px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(0, 0, 0, 0.7), inset 0 -1px 2px rgba(50, 45, 40, 0.08),
    0 1px 0 rgba(50, 45, 40, 0.2);
  border: 1px solid rgba(40, 38, 35, 0.6);
}

.detail__name {
  font-family: "Cinzel", serif;
  font-size: 9px;
  font-weight: 700;
  color: var(--tier-glow, #e8e8e8);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.detail__tier-badge {
  font-family: "Cinzel", serif;
  font-size: 7px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(10, 10, 12, 0.7) 100%
  );
  color: var(--tier-glow, #94a3b8);
  border: 1px solid rgba(60, 55, 50, 0.3);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  flex-shrink: 0;
  margin-left: 4px;
}

/* Artwork */
.detail__artwork {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 4px;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(12, 12, 14, 0.95) 20%,
    rgba(10, 10, 12, 0.97) 80%,
    rgba(6, 6, 8, 0.99) 100%
  );
  border-radius: 3px;
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 -2px 4px rgba(50, 45, 40, 0.06),
    0 1px 0 rgba(50, 45, 40, 0.15);
  border: 1px solid rgba(35, 32, 28, 0.7);
}

.detail__artwork::after {
  content: "";
  position: absolute;
  inset: 2px;
  border: 1px solid rgba(50, 45, 40, 0.12);
  border-radius: 2px;
  pointer-events: none;
}

.detail__image {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
}

.detail__image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tier-color, #4a4a50);
  font-size: 20px;
  opacity: 0.3;
}

/* Type line */
.detail__type-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 1px 0;
}

.detail__type {
  font-family: "Cinzel", serif;
  font-size: 6px;
  font-weight: 600;
  color: #8a8a8a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail__divider {
  font-size: 4px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.6;
}

.detail__rarity {
  font-family: "Crimson Text", serif;
  font-size: 7px;
  color: var(--tier-glow, #7a7a7a);
  font-style: italic;
}

/* Separator */
.detail__separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 1px 0;
}

.detail__separator-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(60, 55, 50, 0.25) 30%,
    var(--tier-color, rgba(60, 55, 50, 0.4)) 50%,
    rgba(60, 55, 50, 0.25) 70%,
    transparent 100%
  );
}

.detail__separator-rune {
  font-size: 5px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.5;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
}

/* Flavour */
.detail__flavour {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1px 4px;
  min-height: 16px;
}

.detail__flavour p {
  font-family: "Crimson Text", serif;
  font-style: italic;
  font-size: 7px;
  line-height: 1.3;
  color: #888888;
  margin: 0;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
}

.detail__no-flavour {
  color: #4a4a4a;
  font-size: 7px;
}

/* Bottom info */
.detail__bottom-info {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  background: linear-gradient(
    180deg,
    rgba(14, 14, 16, 0.92) 0%,
    rgba(18, 18, 20, 0.88) 50%,
    rgba(12, 12, 14, 0.95) 100%
  );
  border-radius: 2px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(0, 0, 0, 0.5), inset 0 -1px 2px rgba(50, 45, 40, 0.06),
    0 1px 0 rgba(50, 45, 40, 0.15);
  border: 1px solid rgba(40, 38, 35, 0.5);
}

.detail__collector-number {
  font-family: "Crimson Text", serif;
  font-size: 6px;
  color: #5a5a5a;
  letter-spacing: 0.02em;
}

.detail__wiki-link {
  font-family: "Cinzel", serif;
  font-size: 6px;
  font-weight: 600;
  color: #6a5a4a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 3px;
  background: linear-gradient(
    180deg,
    rgba(80, 70, 55, 0.08) 0%,
    rgba(60, 50, 40, 0.06) 100%
  );
  border: 1px solid rgba(80, 70, 55, 0.2);
  border-radius: 2px;
}

.detail__weight {
  font-family: "Cinzel", serif;
  font-size: 6px;
  color: var(--tier-glow, #5a5a5a);
  letter-spacing: 0.02em;
}

/* ==========================================
   FOIL EFFECT OVERLAY - Reactive to rotation
   ========================================== */
.foil-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  border-radius: inherit;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.flip-card--foil .foil-overlay {
  opacity: 0.5;

  --space: 6%;
  --angle: -24deg;

  background-image: repeating-linear-gradient(
    var(--angle),
    hsla(
        var(--foil-hue, 220),
        var(--foil-sat, 25%),
        var(--foil-light, 45%),
        0.6
      )
      calc(var(--space) * 1),
    hsla(
        calc(var(--foil-hue, 220) - 20),
        var(--foil-sat, 25%),
        var(--foil-light, 45%),
        0.6
      )
      calc(var(--space) * 2),
    hsla(
        calc(var(--foil-hue, 220) + 20),
        var(--foil-sat, 25%),
        var(--foil-light, 45%),
        0.6
      )
      calc(var(--space) * 3),
    hsla(
        calc(var(--foil-hue, 220) - 10),
        var(--foil-sat, 25%),
        var(--foil-light, 45%),
        0.6
      )
      calc(var(--space) * 4),
    hsla(
        calc(var(--foil-hue, 220) + 10),
        var(--foil-sat, 25%),
        var(--foil-light, 45%),
        0.6
      )
      calc(var(--space) * 5),
    hsla(
        var(--foil-hue, 220),
        var(--foil-sat, 25%),
        var(--foil-light, 45%),
        0.6
      )
      calc(var(--space) * 6)
  );

  background-blend-mode: color-dodge;
  background-size: 250% 350%;
  background-position: calc(var(--pointer-x, 50) * 1%)
    calc(var(--pointer-y, 50) * 1%);

  filter: brightness(calc(0.6 + var(--pointer-from-center, 0.5) * 0.15))
    contrast(1.6) saturate(1.2);
  mix-blend-mode: color-dodge;
}

.foil-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: radial-gradient(
    farthest-corner ellipse at calc(var(--pointer-x, 50) * 1%)
      calc(var(--pointer-y, 50) * 1%),
    hsla(var(--foil-hue, 220), calc(var(--foil-sat, 25%) + 10%), 65%, 0.25) 0%,
    hsla(var(--foil-hue, 220), var(--foil-sat, 25%), 45%, 0.12) 35%,
    transparent 60%
  );
  mix-blend-mode: soft-light;
}

/* Tier-specific foil colors */
.flip-card--t0 .foil-overlay {
  --foil-hue: 56;
  --foil-sat: 65%;
  --foil-light: 50%;
  --angle: -20deg;
}

.flip-card--t1 .foil-overlay {
  --foil-hue: 278;
  --foil-sat: 55%;
  --foil-light: 45%;
  --angle: -28deg;
}

.flip-card--t2 .foil-overlay {
  --foil-hue: 210;
  --foil-sat: 40%;
  --foil-light: 42%;
  --angle: -22deg;
}

.flip-card--t3 .foil-overlay {
  --foil-hue: 220;
  --foil-sat: 12%;
  --foil-light: 48%;
  --angle: -24deg;
}

/* ==========================================
   COSMOS EFFECT (Artwork only for foil)
   ========================================== */
.cosmos-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;

  --space: 8%;

  background-image: radial-gradient(
      ellipse at 20% 30%,
      rgba(
          var(--cosmos-r, 200),
          var(--cosmos-g, 200),
          var(--cosmos-b, 220),
          0.15
        )
        0%,
      transparent 3%
    ),
    radial-gradient(
      ellipse at 70% 20%,
      rgba(
          var(--cosmos-r, 200),
          var(--cosmos-g, 200),
          var(--cosmos-b, 220),
          0.12
        )
        0%,
      transparent 2.5%
    ),
    radial-gradient(
      ellipse at 40% 70%,
      rgba(
          var(--cosmos-r, 200),
          var(--cosmos-g, 200),
          var(--cosmos-b, 220),
          0.1
        )
        0%,
      transparent 3%
    ),
    radial-gradient(
      ellipse at 85% 60%,
      rgba(
          var(--cosmos-r, 200),
          var(--cosmos-g, 200),
          var(--cosmos-b, 220),
          0.12
        )
        0%,
      transparent 2%
    ),
    repeating-conic-gradient(
      from 0deg at calc(var(--pointer-from-left, 0.5) * 100%)
        calc(var(--pointer-from-top, 0.5) * 100%),
      hsla(var(--cosmos-hue, 220), 30%, 50%, 0.3) calc(var(--space) * 1),
      hsla(calc(var(--cosmos-hue, 220) - 10), 30%, 53%, 0.3)
        calc(var(--space) * 2),
      hsla(calc(var(--cosmos-hue, 220) + 10), 30%, 50%, 0.3)
        calc(var(--space) * 3),
      hsla(calc(var(--cosmos-hue, 220) - 5), 30%, 55%, 0.3)
        calc(var(--space) * 4),
      hsla(calc(var(--cosmos-hue, 220) + 5), 30%, 48%, 0.3)
        calc(var(--space) * 5),
      hsla(var(--cosmos-hue, 220), 30%, 50%, 0.3) calc(var(--space) * 6)
    );

  filter: brightness(1.1) contrast(1.15) saturate(1.1);
  mix-blend-mode: screen;
  opacity: 0.5;
}

.cosmos-glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;

  background-image: radial-gradient(
    farthest-corner ellipse at calc(var(--pointer-x, 50) * 1%)
      calc(var(--pointer-y, 50) * 1%),
    hsla(var(--cosmos-hue, 220), 50%, 85%, 0.5) 0%,
    hsla(var(--cosmos-hue, 220), 40%, 65%, 0.3) 18%,
    hsla(var(--cosmos-hue, 220), 30%, 50%, 0.15) 40%,
    transparent 70%
  );

  mix-blend-mode: soft-light;
  opacity: 0.55;
}

/* Tier-specific cosmos colors */
.flip-card--t0 .cosmos-layer,
.flip-card--t0 .cosmos-glare {
  --cosmos-hue: 56;
  --cosmos-r: 255;
  --cosmos-g: 235;
  --cosmos-b: 40;
}

.flip-card--t1 .cosmos-layer,
.flip-card--t1 .cosmos-glare {
  --cosmos-hue: 275;
  --cosmos-r: 200;
  --cosmos-g: 130;
  --cosmos-b: 255;
}

.flip-card--t2 .cosmos-layer,
.flip-card--t2 .cosmos-glare {
  --cosmos-hue: 210;
  --cosmos-r: 150;
  --cosmos-g: 190;
  --cosmos-b: 255;
}

.flip-card--t3 .cosmos-layer,
.flip-card--t3 .cosmos-glare {
  --cosmos-hue: 220;
  --cosmos-r: 200;
  --cosmos-g: 200;
  --cosmos-b: 210;
}

/* ==========================================
   TIER COLORS - Only applied to front face
   ========================================== */
.flip-card--t0 {
  --tier-color: #6d5a2a;
  --tier-glow: #c9a227;
}

/* Front face only - subtle tier border */
.flip-card--t0 .card-front {
  border-color: rgba(109, 90, 42, 0.6);
  box-shadow: 0 0 12px rgba(201, 162, 39, 0.08);
}

.flip-card--t1 {
  --tier-color: #5a4a6a;
  --tier-glow: #7a6a8a;
}

.flip-card--t1 .card-front {
  border-color: rgba(90, 74, 106, 0.6);
}

.flip-card--t2 {
  --tier-color: #4a5a6a;
  --tier-glow: #5a7080;
}

.flip-card--t2 .card-front {
  border-color: rgba(74, 90, 106, 0.6);
}

.flip-card--t3 {
  --tier-color: #3a3a40;
  --tier-glow: #4a4a50;
}

.flip-card--t3 .card-front {
  border-color: rgba(58, 58, 64, 0.6);
}

/* Foil cards get subtle glow - front face only */
.flip-card--foil .card-front {
  box-shadow: 0 0 15px rgba(201, 162, 39, 0.12), 0 4px 16px rgba(0, 0, 0, 0.5);
}
</style>
