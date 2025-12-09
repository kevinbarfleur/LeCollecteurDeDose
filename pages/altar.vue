<script setup lang="ts">
import { mockUserCollection } from "~/data/mockCards";
import type { Card, CardTier, CardVariation } from "~/types/card";
import { VARIATION_CONFIG, getCardVariation } from "~/types/card";
import gsap from "gsap";

const { t } = useI18n();

useHead({ title: "Autel" });

const { loggedIn } = useUserSession();

// ==========================================
// USER DATA - Vaal Orbs & Collection
// ==========================================

// Mock user Vaal Orbs (in real app, this would come from user state/API)
const vaalOrbs = ref(5);

// User's collection
const collection = computed(() => mockUserCollection);

// ==========================================
// CARD GROUPING WITH VARIATIONS
// ==========================================

interface VariationGroup {
  variation: CardVariation;
  cards: Card[];
  count: number;
}

interface CardGroupWithVariations {
  cardId: string;
  name: string;
  tier: CardTier;
  itemClass: string;
  cards: Card[];
  count: number;
  variations: VariationGroup[];
  hasMultipleVariations: boolean;
}

const groupedCards = computed(() => {
  const groups = new Map<string, CardGroupWithVariations>();

  collection.value.forEach((card) => {
    const variation: CardVariation = getCardVariation(card);
    const existing = groups.get(card.id);

    if (existing) {
      existing.cards.push(card);
      existing.count++;

      const existingVariation = existing.variations.find(
        (v) => v.variation === variation
      );
      if (existingVariation) {
        existingVariation.cards.push(card);
        existingVariation.count++;
      } else {
        existing.variations.push({
          variation,
          cards: [card],
          count: 1,
        });
      }
    } else {
      groups.set(card.id, {
        cardId: card.id,
        name: card.name,
        tier: card.tier,
        itemClass: card.itemClass,
        cards: [card],
        count: 1,
        variations: [
          {
            variation,
            cards: [card],
            count: 1,
          },
        ],
        hasMultipleVariations: false,
      });
    }
  });

  // Sort variations and update hasMultipleVariations flag
  groups.forEach((group) => {
    group.variations.sort(
      (a, b) =>
        VARIATION_CONFIG[a.variation].priority -
        VARIATION_CONFIG[b.variation].priority
    );
    group.hasMultipleVariations = group.variations.length > 1;
  });

  // Sort by tier then name
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
  return Array.from(groups.values()).sort((a, b) => {
    if (tierOrder[a.tier] !== tierOrder[b.tier]) {
      return tierOrder[a.tier] - tierOrder[b.tier];
    }
    return a.name.localeCompare(b.name);
  });
});

// Card selector options
const cardOptions = computed(() =>
  groupedCards.value.map((group) => ({
    value: group.cardId,
    label: group.name,
    description: `${group.itemClass} • ${group.tier}`,
    count: group.count,
  }))
);

// ==========================================
// ALTAR STATE
// ==========================================

const selectedCardId = ref<string>("");
const selectedVariation = ref<CardVariation>("standard");
const isCardFlipped = ref(false);
const isCardOnAltar = ref(false);
const isAnimating = ref(false);

// Get the selected card group
const selectedCardGroup = computed(() =>
  groupedCards.value.find((g) => g.cardId === selectedCardId.value)
);

// Get variation options for the selected card
const variationOptions = computed(() => {
  if (!selectedCardGroup.value) return [];
  return selectedCardGroup.value.variations.map((v) => ({
    value: v.variation,
    label: v.variation === "foil" ? "✦ Foil" : "Standard",
    count: v.count,
  }));
});

// Get the actual card to display
const displayCard = computed<Card | null>(() => {
  if (!selectedCardGroup.value) return null;
  const variationGroup = selectedCardGroup.value.variations.find(
    (v) => v.variation === selectedVariation.value
  );
  if (variationGroup && variationGroup.cards.length > 0) {
    return variationGroup.cards[0];
  }
  // Fallback to first card
  return selectedCardGroup.value.cards[0] || null;
});

// Watch for card selection changes
watch(selectedCardId, (newId) => {
  if (newId) {
    const group = groupedCards.value.find((g) => g.cardId === newId);
    if (group && group.variations.length > 0) {
      selectedVariation.value = group.variations[0].variation;
    }
    // Animate card onto altar
    placeCardOnAltar();
  } else {
    isCardOnAltar.value = false;
    isCardFlipped.value = false;
  }
});

// ==========================================
// ALTAR ANIMATIONS
// ==========================================

const altarCardRef = ref<HTMLElement | null>(null);
const cardBackLogoUrl = "/images/card-back-logo.png";

const placeCardOnAltar = async () => {
  isAnimating.value = true;
  isCardOnAltar.value = false;
  isCardFlipped.value = false;

  await nextTick();

  isCardOnAltar.value = true;

  if (altarCardRef.value) {
    gsap.fromTo(
      altarCardRef.value,
      {
        scale: 0.3,
        opacity: 0,
        rotateY: 180,
        y: -50,
      },
      {
        scale: 1,
        opacity: 1,
        rotateY: 0,
        y: 0,
        duration: 0.6,
        ease: "back.out(1.4)",
        onComplete: () => {
          isAnimating.value = false;
        },
      }
    );
  } else {
    isAnimating.value = false;
  }
};

const flipCard = async () => {
  if (!altarCardRef.value || isAnimating.value) return;

  isAnimating.value = true;
  isCardFlipped.value = !isCardFlipped.value;

  // Dramatic flip animation
  gsap.to(altarCardRef.value, {
    rotateY: isCardFlipped.value ? 180 : 0,
    duration: 0.5,
    ease: "power2.inOut",
    onComplete: () => {
      isAnimating.value = false;
    },
  });
};

// Remove card from altar with animation
const removeCardFromAltar = async () => {
  if (!altarCardRef.value || isAnimating.value || !isCardOnAltar.value) return;

  isAnimating.value = true;

  // Animate card leaving the altar
  await new Promise<void>((resolve) => {
    gsap.to(altarCardRef.value, {
      scale: 0.3,
      opacity: 0,
      y: 50,
      rotateY: -180,
      duration: 0.5,
      ease: "power2.in",
      onComplete: resolve,
    });
  });

  // Reset state
  isCardOnAltar.value = false;
  isCardFlipped.value = false;
  selectedCardId.value = "";
  isAnimating.value = false;
};

// ==========================================
// VAAL ORB DRAG & DROP
// ==========================================

const isDraggingOrb = ref(false);
const isReturningOrb = ref(false);
const draggedOrbIndex = ref<number | null>(null);
const isOrbOverCard = ref(false);
const altarAreaRef = ref<HTMLElement | null>(null);
const floatingOrbRef = ref<HTMLElement | null>(null);
const orbRefs = ref<HTMLElement[]>([]);

// Store origin position for return animation
let originX = 0;
let originY = 0;
let currentX = 0;
let currentY = 0;

// Set orb ref
const setOrbRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    orbRefs.value[index] = el;
  }
};

const startDragOrb = (event: MouseEvent | TouchEvent, index: number) => {
  if (vaalOrbs.value <= 0 || !isCardOnAltar.value || isAnimating.value || isReturningOrb.value) return;

  event.preventDefault();
  
  // Get the origin position of the orb element
  const orbElement = orbRefs.value[index];
  if (orbElement) {
    const rect = orbElement.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
  }

  isDraggingOrb.value = true;
  draggedOrbIndex.value = index;

  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
  currentX = clientX;
  currentY = clientY;

  // Wait for floating orb to be rendered, then set initial position
  nextTick(() => {
    if (floatingOrbRef.value) {
      gsap.set(floatingOrbRef.value, {
        left: clientX,
        top: clientY,
        xPercent: -50,
        yPercent: -50,
      });
    }
  });

  document.addEventListener("mousemove", onDragOrb);
  document.addEventListener("mouseup", endDragOrb);
  document.addEventListener("touchmove", onDragOrb, { passive: false });
  document.addEventListener("touchend", endDragOrb);
};

const onDragOrb = (event: MouseEvent | TouchEvent) => {
  if (!isDraggingOrb.value || !floatingOrbRef.value) return;

  if ("touches" in event) {
    event.preventDefault();
  }

  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
  
  currentX = clientX;
  currentY = clientY;

  // Instant position update using GSAP set (no animation)
  gsap.set(floatingOrbRef.value, {
    left: clientX,
    top: clientY,
  });

  // Check if orb is over the card
  if (altarCardRef.value) {
    const cardRect = altarCardRef.value.getBoundingClientRect();
    const isOver =
      clientX >= cardRect.left &&
      clientX <= cardRect.right &&
      clientY >= cardRect.top &&
      clientY <= cardRect.bottom;
    isOrbOverCard.value = isOver;
  }
};

const endDragOrb = async () => {
  if (!isDraggingOrb.value) return;

  document.removeEventListener("mousemove", onDragOrb);
  document.removeEventListener("mouseup", endDragOrb);
  document.removeEventListener("touchmove", onDragOrb);
  document.removeEventListener("touchend", endDragOrb);

  // If orb was dropped on card, consume it and flip the card
  if (isOrbOverCard.value && vaalOrbs.value > 0) {
    // Consume animation - orb shrinks and disappears with dramatic effect
    if (floatingOrbRef.value) {
      await new Promise<void>((resolve) => {
        gsap.to(floatingOrbRef.value, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power3.in",
          onComplete: resolve,
        });
      });
    }
    
    vaalOrbs.value--;
    isDraggingOrb.value = false;
    draggedOrbIndex.value = null;
    isOrbOverCard.value = false;
    
    await flipCard();
  } else {
    // Return to origin with smooth GSAP animation directly on DOM element
    isReturningOrb.value = true;
    
    if (floatingOrbRef.value) {
      await new Promise<void>((resolve) => {
        gsap.to(floatingOrbRef.value, {
          left: originX,
          top: originY,
          scale: 0.8,
          duration: 0.4,
          ease: "power2.out",
          onComplete: resolve,
        });
      });
      
      // Quick fade out at origin
      await new Promise<void>((resolve) => {
        gsap.to(floatingOrbRef.value, {
          opacity: 0,
          scale: 0.6,
          duration: 0.15,
          ease: "power2.in",
          onComplete: resolve,
        });
      });
    }
    
    isDraggingOrb.value = false;
    draggedOrbIndex.value = null;
    isOrbOverCard.value = false;
    isReturningOrb.value = false;
  }
};
</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <!-- Auth required -->
      <div
        v-if="!loggedIn"
        class="min-h-[60vh] flex items-center justify-center"
      >
        <RunicBox padding="lg" max-width="400px" centered>
          <div class="w-40 h-40 mx-auto mb-6">
            <img
              src="/images/logo.png"
              alt="Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <h1 class="font-display text-2xl text-poe-text mb-3">
            Connexion requise
          </h1>
          <p class="font-body text-poe-text-dim mb-8 leading-relaxed">
            Connectez-vous avec Twitch pour accéder à l'Autel.
          </p>
          <RunicButton
            href="/auth/twitch"
            :external="false"
            variant="twitch"
            icon="twitch"
            rune-left="✦"
            rune-right="✦"
          >
            Se connecter avec Twitch
          </RunicButton>
        </RunicBox>
      </div>

      <!-- Main altar content -->
      <div v-if="loggedIn" class="altar-page">
        <!-- Header -->
        <div class="altar-header">
          <RunicHeader
            title="Autel"
            subtitle="Vaal or no balls, Exile."  
          />
        </div>

        <!-- Card selector -->
        <div class="altar-selector">
          <RunicBox padding="md">
            <div class="selector-grid">
              <!-- Card selection -->
              <div class="selector-field">
                <label class="selector-label">Choisir une carte</label>
                <RunicSelect
                  v-model="selectedCardId"
                  :options="cardOptions"
                  placeholder="Sélectionnez une carte..."
                  size="md"
                  :searchable="true"
                />
              </div>

              <!-- Variation selection (if multiple) -->
              <div
                v-if="selectedCardGroup?.hasMultipleVariations"
                class="selector-field"
              >
                <label class="selector-label">Variante</label>
                <RunicSelect
                  v-model="selectedVariation"
                  :options="variationOptions"
                  placeholder="Choisir la variante..."
                  size="md"
                />
              </div>

              <!-- Remove card button -->
              <div
                v-if="isCardOnAltar && !isAnimating"
                class="selector-field selector-field--action"
              >
                <RunicButton
                  size="md"
                  rune-left="✕"
                  rune-right="✕"
                  @click="removeCardFromAltar"
                >
                  Retirer
                </RunicButton>
              </div>
            </div>
          </RunicBox>
        </div>

        <!-- Altar area -->
        <div ref="altarAreaRef" class="altar-area">
          <!-- The altar platform -->
          <div class="altar-platform">
            <!-- Runic circles decoration -->
            <div class="altar-circle altar-circle--outer"></div>
            <div class="altar-circle altar-circle--middle"></div>
            <div class="altar-circle altar-circle--inner"></div>

            <!-- Corner runes -->
            <span class="altar-rune altar-rune--n">✧</span>
            <span class="altar-rune altar-rune--e">✧</span>
            <span class="altar-rune altar-rune--s">✧</span>
            <span class="altar-rune altar-rune--w">✧</span>

            <!-- Card slot -->
            <div
              class="altar-card-slot"
              :class="{
                'altar-card-slot--active': isCardOnAltar,
                'altar-card-slot--highlight': isOrbOverCard,
              }"
            >
              <!-- Empty state -->
              <div v-if="!displayCard" class="altar-empty">
                <div class="altar-empty__icon">◈</div>
                <p class="altar-empty__text">Placez une carte sur l'autel</p>
              </div>

              <!-- Card display with 3D flip -->
              <div
                v-if="displayCard && isCardOnAltar"
                ref="altarCardRef"
                class="altar-card"
                :class="{ 'altar-card--flipped': isCardFlipped }"
              >
                <!-- Front face - GameCard with full interactivity -->
                <div class="altar-card__face altar-card__face--front">
                  <div class="altar-card__game-card-wrapper">
                    <GameCard
                      :card="displayCard"
                      :owned="true"
                    />
                  </div>
                </div>

                <!-- Back face - Card back design -->
                <div class="altar-card__face altar-card__face--back">
                  <div class="card-back">
                    <div class="card-back__bg"></div>
                    <div class="card-back__frame">
                      <div class="card-back__border"></div>
                      <span class="card-back__rune card-back__rune--tl">✧</span>
                      <span class="card-back__rune card-back__rune--tr">✧</span>
                      <span class="card-back__rune card-back__rune--bl">✧</span>
                      <span class="card-back__rune card-back__rune--br">✧</span>
                    </div>
                    <div class="card-back__logo-wrapper">
                      <img
                        :src="cardBackLogoUrl"
                        alt="Le Collecteur de Dose"
                        class="card-back__logo"
                      />
                    </div>
                    <div class="card-back__decoration">
                      <div class="card-back__line card-back__line--top"></div>
                      <div class="card-back__line card-back__line--bottom"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Altar glow effect when orb hovers -->
            <div class="altar-glow" :class="{ 'altar-glow--active': isOrbOverCard }"></div>
          </div>
        </div>

        <!-- Vaal Orbs inventory -->
        <div class="vaal-orbs-section">
          <RunicBox padding="md">
            <div class="vaal-orbs-header">
              <h3 class="vaal-orbs-title">
                <span class="vaal-orbs-icon">◈</span>
                Vaal Orbs
                <span class="vaal-orbs-count">{{ vaalOrbs }}</span>
              </h3>
              <p class="vaal-orbs-hint">
                Glissez une Vaal Orb sur la carte pour la retourner
              </p>
            </div>

            <div class="vaal-orbs-inventory">
              <button
                v-for="(_, index) in vaalOrbs"
                :key="index"
                :ref="(el) => setOrbRef(el as HTMLElement, index)"
                class="vaal-orb"
                :class="{
                  'vaal-orb--disabled': !isCardOnAltar || isAnimating || isReturningOrb,
                  'vaal-orb--dragging': draggedOrbIndex === index,
                }"
                @mousedown="(e) => startDragOrb(e, index)"
                @touchstart="(e) => startDragOrb(e, index)"
              >
                <div class="vaal-orb__inner">
                  <img
                    :src="cardBackLogoUrl"
                    alt="Vaal Orb"
                    class="vaal-orb__image"
                  />
                </div>
                <div class="vaal-orb__glow"></div>
              </button>

              <!-- Empty state -->
              <div v-if="vaalOrbs === 0" class="vaal-orbs-empty">
                <span class="vaal-orbs-empty__icon">◇</span>
                <span class="vaal-orbs-empty__text"
                  >Vous n'avez plus de Vaal Orbs</span
                >
              </div>
            </div>
          </RunicBox>
        </div>

        <!-- Dragged orb (follows cursor) - position controlled by GSAP -->
        <Teleport to="body">
          <div
            v-if="isDraggingOrb"
            ref="floatingOrbRef"
            class="vaal-orb vaal-orb--floating"
            :class="{ 
              'vaal-orb--over-card': isOrbOverCard,
              'vaal-orb--returning': isReturningOrb 
            }"
          >
            <div class="vaal-orb__inner">
              <img
                :src="cardBackLogoUrl"
                alt="Vaal Orb"
                class="vaal-orb__image"
              />
            </div>
            <div class="vaal-orb__glow vaal-orb__glow--active"></div>
          </div>
        </Teleport>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* ==========================================
   ALTAR PAGE LAYOUT
   ========================================== */
.altar-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 4rem;
}

.altar-header {
  text-align: center;
}

/* ==========================================
   CARD SELECTOR
   ========================================== */
.altar-selector {
  max-width: 750px;
  margin: 0 auto;
  width: 100%;
}

.selector-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 640px) {
  .selector-grid {
    flex-direction: row;
    align-items: flex-end;
    justify-content: center;
    gap: 1rem;
  }
}

.selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

@media (min-width: 640px) {
  .selector-field {
    width: auto;
    flex: 1;
    max-width: 280px;
  }
  
  .selector-field--action {
    flex: 0 0 auto;
    width: auto;
    min-width: 120px;
  }
}

.selector-label {
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(140, 130, 120, 0.8);
}

/* ==========================================
   ALTAR AREA
   ========================================== */
.altar-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 450px;
  padding: 2rem;
}

/* ==========================================
   ALTAR PLATFORM - The ritual circle
   ========================================== */
.altar-platform {
  position: relative;
  width: 320px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Stone platform base */
  background: radial-gradient(
      ellipse at center,
      rgba(30, 28, 25, 0.6) 0%,
      rgba(20, 18, 15, 0.8) 50%,
      rgba(12, 10, 8, 0.95) 100%
    ),
    linear-gradient(180deg, rgba(25, 22, 18, 0.9) 0%, rgba(15, 12, 10, 0.95) 100%);

  border-radius: 50%;
  
  /* Deep carved effect */
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.8),
    inset 0 -4px 20px rgba(60, 50, 40, 0.1),
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 80px rgba(175, 96, 37, 0.05);
}

/* ==========================================
   ALTAR CIRCLES - Runic decorations
   ========================================== */
.altar-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(80, 70, 55, 0.2);
  pointer-events: none;
}

.altar-circle--outer {
  width: 95%;
  height: 95%;
  border-style: dashed;
  animation: rotateCircle 60s linear infinite;
}

.altar-circle--middle {
  width: 85%;
  height: 85%;
  border-width: 2px;
  border-color: rgba(175, 96, 37, 0.15);
  animation: rotateCircle 45s linear infinite reverse;
}

.altar-circle--inner {
  width: 75%;
  height: 75%;
  border-style: dotted;
  border-color: rgba(120, 100, 70, 0.25);
  animation: rotateCircle 30s linear infinite;
}

@keyframes rotateCircle {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ==========================================
   ALTAR RUNES - Corner decorations
   ========================================== */
.altar-rune {
  position: absolute;
  font-size: 1.25rem;
  color: rgba(175, 96, 37, 0.4);
  text-shadow: 0 0 10px rgba(175, 96, 37, 0.3);
  animation: pulseRune 3s ease-in-out infinite;
}

.altar-rune--n { top: 8%; left: 50%; transform: translateX(-50%); animation-delay: 0s; }
.altar-rune--e { top: 50%; right: 8%; transform: translateY(-50%); animation-delay: 0.75s; }
.altar-rune--s { bottom: 8%; left: 50%; transform: translateX(-50%); animation-delay: 1.5s; }
.altar-rune--w { top: 50%; left: 8%; transform: translateY(-50%); animation-delay: 2.25s; }

@keyframes pulseRune {
  0%, 100% {
    opacity: 0.4;
    text-shadow: 0 0 10px rgba(175, 96, 37, 0.3);
  }
  50% {
    opacity: 0.8;
    text-shadow: 0 0 20px rgba(175, 96, 37, 0.6);
  }
}

/* ==========================================
   ALTAR CARD SLOT
   ========================================== */
.altar-card-slot {
  position: relative;
  width: 180px;
  height: 252px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  
  /* Inset groove */
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.9) 0%,
    rgba(12, 12, 14, 0.8) 50%,
    rgba(8, 8, 10, 0.9) 100%
  );
  
  box-shadow: 
    inset 0 4px 15px rgba(0, 0, 0, 0.7),
    inset 0 -2px 10px rgba(60, 50, 40, 0.05),
    0 2px 8px rgba(0, 0, 0, 0.3);
  
  border: 1px solid rgba(50, 45, 40, 0.3);
  
  transition: all 0.4s ease;
}

.altar-card-slot--active {
  box-shadow: 
    inset 0 4px 15px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(175, 96, 37, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.3);
  border-color: rgba(175, 96, 37, 0.3);
}

.altar-card-slot--highlight {
  box-shadow: 
    inset 0 4px 15px rgba(0, 0, 0, 0.5),
    0 0 50px rgba(175, 96, 37, 0.4),
    0 0 100px rgba(175, 96, 37, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.3);
  border-color: rgba(175, 96, 37, 0.6);
}

/* ==========================================
   ALTAR EMPTY STATE
   ========================================== */
.altar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: rgba(100, 90, 80, 0.5);
}

.altar-empty__icon {
  font-size: 2.5rem;
  opacity: 0.4;
  animation: pulseIcon 2s ease-in-out infinite;
}

@keyframes pulseIcon {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.05); opacity: 0.6; }
}

.altar-empty__text {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  font-style: italic;
  text-align: center;
}

/* ==========================================
   ALTAR CARD - 3D flip card
   ========================================== */
.altar-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.altar-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 8px;
  /* No overflow hidden - let GameCard effects work */
}

.altar-card__face--front {
  transform: rotateY(0deg);
  transform-style: preserve-3d;
}

.altar-card__face--back {
  transform: rotateY(180deg);
  overflow: hidden;
}

/* Wrapper for GameCard to ensure proper sizing */
.altar-card__game-card-wrapper {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

/* Ensure GameCard fills the space and has pointer events */
.altar-card__game-card-wrapper :deep(.game-card-container) {
  width: 100%;
  height: 100%;
}

.altar-card__game-card-wrapper :deep(.card-tilt-container) {
  width: 100%;
  height: 100%;
}

.altar-card__game-card-wrapper :deep(.game-card) {
  width: 100%;
  height: 100%;
}

/* ==========================================
   CARD BACK DESIGN
   ========================================== */
.card-back {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.card-back__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    #0a0908 0%,
    #060505 30%,
    #030303 60%,
    #080706 100%
  );
  border-radius: inherit;
}

.card-back__bg::before {
  content: "";
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

.card-back__frame {
  position: absolute;
  inset: 0;
  z-index: 1;
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
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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

.card-back__line--top { top: 45px; }
.card-back__line--bottom { bottom: 45px; }

/* ==========================================
   ALTAR GLOW EFFECT
   ========================================== */
.altar-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(175, 96, 37, 0) 40%,
    rgba(175, 96, 37, 0) 100%
  );
  pointer-events: none;
  transition: all 0.4s ease;
  z-index: -1;
}

.altar-glow--active {
  background: radial-gradient(
    circle at center,
    rgba(175, 96, 37, 0.15) 20%,
    rgba(175, 96, 37, 0.05) 50%,
    rgba(175, 96, 37, 0) 80%
  );
  animation: glowPulse 1s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

/* ==========================================
   VAAL ORBS SECTION
   ========================================== */
.vaal-orbs-section {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.vaal-orbs-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.vaal-orbs-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e8e8e8;
}

.vaal-orbs-icon {
  color: var(--color-accent);
  font-size: 1.25rem;
}

.vaal-orbs-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: linear-gradient(180deg, rgba(175, 96, 37, 0.2) 0%, rgba(175, 96, 37, 0.1) 100%);
  border: 1px solid rgba(175, 96, 37, 0.4);
  border-radius: 14px;
  font-size: 0.875rem;
  color: var(--color-accent);
}

.vaal-orbs-hint {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  font-style: italic;
  color: rgba(140, 130, 120, 0.6);
}

/* ==========================================
   VAAL ORBS INVENTORY
   ========================================== */
.vaal-orbs-inventory {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  min-height: 80px;
}

.vaal-orbs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: rgba(100, 90, 80, 0.5);
}

.vaal-orbs-empty__icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.vaal-orbs-empty__text {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  font-style: italic;
}

/* ==========================================
   VAAL ORB ITEM
   ========================================== */
.vaal-orb {
  position: relative;
  width: 64px;
  height: 64px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: grab;
  transition: transform 0.3s ease;
}

.vaal-orb:active {
  cursor: grabbing;
}

.vaal-orb--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vaal-orb--dragging {
  opacity: 0.3;
}

.vaal-orb__inner {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  
  /* Deep carved orb effect */
  background: linear-gradient(
    160deg,
    #1a1815 0%,
    #0d0c0a 40%,
    #080706 100%
  );
  
  box-shadow: 
    inset 0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 -2px 8px rgba(80, 60, 40, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(175, 96, 37, 0.1);
  
  border: 2px solid rgba(80, 60, 40, 0.3);
  
  transition: all 0.3s ease;
}

.vaal-orb:not(.vaal-orb--disabled):hover .vaal-orb__inner {
  transform: scale(1.1);
  border-color: rgba(175, 96, 37, 0.5);
  box-shadow: 
    inset 0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 -2px 8px rgba(175, 96, 37, 0.2),
    0 6px 20px rgba(0, 0, 0, 0.6),
    0 0 30px rgba(175, 96, 37, 0.3);
}

.vaal-orb__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  padding: 12px;
  opacity: 0.8;
  filter: sepia(30%) brightness(0.9);
}

.vaal-orb__glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(175, 96, 37, 0) 30%,
    rgba(175, 96, 37, 0) 100%
  );
  pointer-events: none;
  transition: all 0.3s ease;
}

.vaal-orb:not(.vaal-orb--disabled):hover .vaal-orb__glow,
.vaal-orb__glow--active {
  background: radial-gradient(
    circle at center,
    rgba(175, 96, 37, 0.3) 0%,
    rgba(175, 96, 37, 0.1) 40%,
    rgba(175, 96, 37, 0) 70%
  );
}

/* ==========================================
   FLOATING/DRAGGED ORB - Position controlled by GSAP
   ========================================== */
.vaal-orb--floating {
  position: fixed;
  width: 80px;
  height: 80px;
  z-index: 10000;
  pointer-events: none;
  /* GSAP controls left/top - no CSS transitions on position */
  will-change: transform, left, top;
}

.vaal-orb--floating .vaal-orb__inner {
  transform: scale(1.2);
  border-color: rgba(175, 96, 37, 0.6);
  box-shadow: 
    inset 0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 -2px 8px rgba(175, 96, 37, 0.3),
    0 8px 30px rgba(0, 0, 0, 0.7),
    0 0 50px rgba(175, 96, 37, 0.4);
  /* Only transition visual properties, not position */
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

/* Returning animation - shrink slightly */
.vaal-orb--returning .vaal-orb__inner {
  transform: scale(0.9);
  border-color: rgba(175, 96, 37, 0.3);
  box-shadow: 
    inset 0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 -2px 8px rgba(175, 96, 37, 0.1),
    0 4px 15px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(175, 96, 37, 0.2);
}

.vaal-orb--over-card .vaal-orb__inner {
  transform: scale(1.4);
  border-color: rgba(175, 96, 37, 0.9);
  box-shadow: 
    inset 0 3px 10px rgba(0, 0, 0, 0.7),
    inset 0 -2px 8px rgba(175, 96, 37, 0.5),
    0 12px 50px rgba(0, 0, 0, 0.8),
    0 0 100px rgba(175, 96, 37, 0.7);
}

.vaal-orb--over-card .vaal-orb__glow {
  background: radial-gradient(
    circle at center,
    rgba(175, 96, 37, 0.6) 0%,
    rgba(175, 96, 37, 0.25) 40%,
    rgba(175, 96, 37, 0) 70%
  );
  animation: pulseGlow 0.4s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.85;
  }
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .altar-platform {
    width: 280px;
    height: 350px;
  }

  .altar-card-slot {
    width: 150px;
    height: 210px;
  }

  .vaal-orb {
    width: 56px;
    height: 56px;
  }

  .vaal-orb--floating {
    width: 70px;
    height: 70px;
  }
}
</style>

