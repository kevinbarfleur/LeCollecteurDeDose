<script setup lang="ts">
import gsap from "gsap";
import poeUniques from "~/data/poe_uniques.json";
import type { Card } from "~/types/card";

// Configuration
const CARD_COUNT = 9;
const DRAW_INTERVAL = 2500; // 2.5 seconds between draws
const ANIMATION_DURATION = 0.85; // Animation takes 0.85s, well within the interval

// Card with stored rotation (stable, doesn't change when array shifts)
interface CardWithRotation {
  card: Card;
  rotation: number;
  id: string;
}

// Seeded random for consistent rotations
const seededRandom = (seed: number): number => {
  return Math.sin(seed * 9999.1234) * 0.5 + 0.5;
};

// Get rotation for a card at given index
const getCardRotation = (index: number, baseMultiplier: number = 3): number => {
  return (seededRandom(index + 1) - 0.5) * 2 * baseMultiplier;
};

// Create a realistic card distribution with mixed tiers and some foils
// Each card gets a FIXED rotation assigned at creation (won't change when array shifts)
const createRealisticDeck = (
  count: number,
  rotationMultiplier: number = 2.5
): CardWithRotation[] => {
  const allCards = [...poeUniques] as Card[];

  const t0Cards = allCards.filter((c) => c.tier === "T0");
  const t1Cards = allCards.filter((c) => c.tier === "T1");
  const t2Cards = allCards.filter((c) => c.tier === "T2");
  const t3Cards = allCards.filter((c) => c.tier === "T3");

  const deck: Card[] = [];

  const addRandomCards = (source: Card[], num: number, foilChance: number) => {
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(num, shuffled.length); i++) {
      const card = { ...shuffled[i] };
      if (Math.random() < foilChance) {
        card.foil = true;
      }
      deck.push(card);
    }
  };

  addRandomCards(t0Cards, 2, 0.4);
  addRandomCards(t1Cards, 3, 0.25);
  addRandomCards(t2Cards, 4, 0.15);
  addRandomCards(t3Cards, count - deck.length, 0.05);

  // Shuffle and assign fixed rotations
  const shuffled = deck.sort(() => Math.random() - 0.5);
  const timestamp = Date.now();

  return shuffled.map((card, index) => ({
    card,
    rotation: getCardRotation(index, rotationMultiplier),
    id: `card-${card.uid}-${index}-${timestamp}`,
  }));
};

// State
const deckCards = ref<CardWithRotation[]>([]);
const drawnCards = ref<CardWithRotation[]>([]);
const flyingCard = ref<CardWithRotation | null>(null);
const isAnimating = ref(false);
const showFlyingCard = ref(false);
const isRenewing = ref(false);

// Cards being ejected (for renewal animation)
const ejectingCards = ref<CardWithRotation[]>([]);
// Cards arriving from right (for renewal animation)
const arrivingCards = ref<CardWithRotation[]>([]);

// Foil effect animation state
const flyingPointerX = ref(90);
const flyingPointerY = ref(50);

// Ambient foil animation for stacks
const ambientPointer = ref({ x: 50, y: 50 });
let ambientTween: gsap.core.Tween | null = null;

// Refs
const containerRef = ref<HTMLElement | null>(null);
const flyingCardRef = ref<HTMLElement | null>(null);
const leftStackRef = ref<HTMLElement | null>(null);
const rightStackRef = ref<HTMLElement | null>(null);

// Delayed call for next draw (replaces setInterval for more reliable timing)
let nextDrawCall: gsap.core.Tween | null = null;

// GSAP context for grouped animations (allows clean kill)
let renewalContext: gsap.Context | null = null;

// Safety timeout duration (prevents infinite blocking)
const SAFETY_TIMEOUT = 15000; // 15 seconds max for any animation sequence

// Start ambient foil animation
const startAmbientAnimation = () => {
  const animateAmbient = () => {
    ambientTween = gsap.to(ambientPointer.value, {
      duration: 4 + Math.random() * 2,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      ease: "sine.inOut",
      onComplete: animateAmbient,
    });
  };
  animateAmbient();
};

// Get random exit point for ejection (towards left, random angle)
const getRandomEjectPoint = () => {
  // Random angle biased towards left (±60° around 180°)
  const baseAngle = Math.PI; // 180° = left
  const angleVariation = ((Math.random() - 0.5) * Math.PI) / 1.5; // ±60°
  const angle = baseAngle + angleVariation;

  // Very far distance to ensure cards exit any screen size
  const distance = 4000;
  const spin = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720);

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    rotation: spin,
  };
};

// Get random entry point for arriving cards (from RIGHT side)
const getRandomEntryPoint = () => {
  // Very far distance from the right
  const distance = 4000;

  // Random Y variation
  const yOffset = (Math.random() - 0.5) * 200;
  const spin = (Math.random() - 0.5) * 180;

  return {
    x: distance, // Positive = from right
    y: yOffset,
    rotation: spin,
  };
};

// Schedule next draw using gsap.delayedCall (more reliable than setInterval)
const scheduleNextDraw = (delaySeconds: number = DRAW_INTERVAL / 1000) => {
  if (nextDrawCall) {
    nextDrawCall.kill();
  }
  nextDrawCall = gsap.delayedCall(delaySeconds, drawCard);
};

// Initial animation - cards arrive from right on first load
const initialArrival = async () => {
  const { startX } = getStackPositions();

  // Create new deck with fixed rotations
  const newDeck = createRealisticDeck(CARD_COUNT);

  // Use the deck as arriving cards
  arrivingCards.value = newDeck;

  await nextTick();

  // Pre-calculate entry points for each card
  const entryPoints = newDeck.map(() => getRandomEntryPoint());

  // Collect DOM elements and set initial positions
  const arriveElements: HTMLElement[] = [];
  arrivingCards.value.forEach((cardData, index) => {
    const el = document.querySelector(
      `[data-arrive-id="${cardData.id}"]`
    ) as HTMLElement;

    if (el) {
      arriveElements.push(el);
      const entry = entryPoints[index];
      gsap.set(el, {
        x: entry.x,
        y: entry.y,
        rotation: entry.rotation,
        scale: 1,
        force3D: true,
      });
    }
  });

  // Small delay to ensure DOM is ready
  await gsapDelay(0.05);

  // Create GSAP Timeline with stagger for arrival
  const arriveTimeline = gsap.timeline();

  arriveElements.forEach((el, index) => {
    const cardData = arrivingCards.value[index];
    arriveTimeline.to(
      el,
      {
        x: startX,
        y: 0,
        rotation: cardData.rotation,
        duration: 0.6,
        ease: "expo.out",
      },
      index * 0.1 // Stagger: 0.1s between each card
    );
  });

  // Wait for arrival to complete
  await waitForTimeline(arriveTimeline, 8000);

  // Transfer arriving cards to deck
  deckCards.value = newDeck;
  arrivingCards.value = [];

  // Small delay before first draw
  await gsapDelay(0.5);
  drawCard();
};

// Initialize
onMounted(() => {
  // Start with empty deck (no cards visible)
  deckCards.value = [];
  startAmbientAnimation();

  // Cards arrive from right after a short delay
  gsap.delayedCall(0.5, initialArrival);
});

// Cleanup
onUnmounted(() => {
  // Stop scheduled draw
  if (nextDrawCall) {
    nextDrawCall.kill();
    nextDrawCall = null;
  }

  // Kill ambient animation
  if (ambientTween) ambientTween.kill();

  // Kill renewal context (kills all animations in that group)
  if (renewalContext) {
    renewalContext.kill();
    renewalContext = null;
  }

  // Kill flying card animations
  if (flyingCardRef.value) {
    gsap.killTweensOf(flyingCardRef.value);
    const flipCard = flyingCardRef.value.querySelector(".flip-card");
    if (flipCard) gsap.killTweensOf(flipCard);
  }

  // Kill any remaining ejecting/arriving card animations
  document.querySelectorAll(".ejecting-card, .arriving-card").forEach((el) => {
    gsap.killTweensOf(el);
  });
});

// Calculate positions dynamically
const getStackPositions = () => {
  const container = containerRef.value;
  const leftStack = leftStackRef.value;
  const rightStack = rightStackRef.value;

  if (!container || !leftStack || !rightStack) {
    return { startX: 100, endX: -100 };
  }

  const containerRect = container.getBoundingClientRect();
  const leftRect = leftStack.getBoundingClientRect();
  const rightRect = rightStack.getBoundingClientRect();

  const containerCenterX = containerRect.left + containerRect.width / 2;

  const leftCenterX = leftRect.left + leftRect.width / 2 - containerCenterX;
  const rightCenterX = rightRect.left + rightRect.width / 2 - containerCenterX;

  return {
    startX: rightCenterX,
    endX: leftCenterX,
  };
};

// Helper: Wait for a GSAP timeline to complete with safety timeout
const waitForTimeline = (
  timeline: gsap.core.Timeline,
  maxDuration: number = SAFETY_TIMEOUT
): Promise<void> => {
  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Normal completion
    timeline.eventCallback("onComplete", safeResolve);

    // Safety timeout - force resolve if animation takes too long
    setTimeout(() => {
      if (!resolved) {
        console.warn("Animation safety timeout triggered");
        timeline.kill();
        safeResolve();
      }
    }, maxDuration);
  });
};

// Helper: Small delay using GSAP's delayedCall (more reliable than setTimeout)
const gsapDelay = (seconds: number): Promise<void> => {
  return new Promise((resolve) => {
    gsap.delayedCall(seconds, resolve);
  });
};

// Renewal animation - eject drawn cards, then bring new ones
const renewDeck = async () => {
  if (isRenewing.value) return;
  isRenewing.value = true;

  // Kill any scheduled draw
  if (nextDrawCall) {
    nextDrawCall.kill();
    nextDrawCall = null;
  }

  // Kill any previous renewal context
  if (renewalContext) {
    renewalContext.kill();
    renewalContext = null;
  }

  // Create a new GSAP context for this renewal sequence
  renewalContext = gsap.context(() => {});

  try {
    // Get stack positions
    const { endX, startX } = getStackPositions();

    // ========================================
    // PHASE 1: EJECT DRAWN CARDS
    // ========================================
    const cardsToEject = [...drawnCards.value];

    if (cardsToEject.length > 0) {
      // Set ejecting cards FIRST, then clear drawnCards on same tick
      // This prevents visual flash/change
      ejectingCards.value = cardsToEject;
      drawnCards.value = [];

      await nextTick();

      // Pre-calculate exit points for each card
      const exitPoints = cardsToEject.map(() => getRandomEjectPoint());

      // Collect DOM elements and set initial positions
      // Cards are in order: index 0 = top of pile (most recently drawn)
      const ejectElements: { wrapper: HTMLElement; flipCard: HTMLElement }[] =
        [];
      const totalCards = ejectingCards.value.length;

      ejectingCards.value.forEach((cardData, index) => {
        const wrapper = document.querySelector(
          `[data-eject-id="${cardData.id}"]`
        ) as HTMLElement;

        if (wrapper) {
          const flipCard = wrapper.querySelector(".flip-card") as HTMLElement;
          if (flipCard) {
            ejectElements.push({ wrapper, flipCard });

            // Calculate visual offset like in getDrawnStyle
            const visualIndex = index;
            const offset = visualIndex * 3;

            // Set wrapper position with z-index (index 0 = highest = on top)
            gsap.set(wrapper, {
              x: endX + offset,
              y: -offset,
              zIndex: 100 + (totalCards - index), // index 0 gets highest z-index
              scale: 1,
              force3D: true,
            });

            // Set flip card rotation - rotateY: 180 to keep face VISIBLE
            gsap.set(flipCard, {
              rotateZ: cardData.rotation,
              rotateY: 180, // Keep the card face-up (visible side)
              force3D: true,
            });
          }
        }
      });

      // Small delay to ensure DOM is ready
      await gsapDelay(0.05);

      // Create GSAP Timeline with stagger for ejection
      // Eject from TOP to BOTTOM: index 0 (top) first
      const ejectTimeline = gsap.timeline();

      ejectElements.forEach(({ wrapper, flipCard }, index) => {
        const exit = exitPoints[index];
        // Animate wrapper position
        ejectTimeline.to(
          wrapper,
          {
            x: exit.x,
            y: exit.y,
            duration: 0.6,
            ease: "power2.in",
          },
          index * 0.1 // Stagger: 0.1s between each card (top first)
        );
        // Animate flipCard rotation (keep rotateY: 180 to stay face-up)
        ejectTimeline.to(
          flipCard,
          {
            rotateZ: exit.rotation,
            rotateY: 180, // Keep face visible throughout
            duration: 0.6,
            ease: "power2.in",
          },
          index * 0.1
        );
      });

      // Wait for ejection to complete (with safety timeout)
      await waitForTimeline(ejectTimeline, 8000);

      // Clear ejecting cards
      ejectingCards.value = [];
    }

    // Pause between phases
    await gsapDelay(0.3);

    // ========================================
    // PHASE 2: BRING NEW CARDS FROM RIGHT
    // ========================================
    // Create new deck with fixed rotations
    const newDeck = createRealisticDeck(CARD_COUNT);

    // Use the new deck directly as arriving cards (same structure)
    arrivingCards.value = newDeck;

    await nextTick();

    // Pre-calculate entry points for each card
    const entryPoints = newDeck.map(() => getRandomEntryPoint());

    // Collect DOM elements and set initial positions
    const arriveElements: HTMLElement[] = [];
    arrivingCards.value.forEach((cardData, index) => {
      const el = document.querySelector(
        `[data-arrive-id="${cardData.id}"]`
      ) as HTMLElement;

      if (el) {
        arriveElements.push(el);
        const entry = entryPoints[index];
        gsap.set(el, {
          x: entry.x,
          y: entry.y,
          rotation: entry.rotation,
          scale: 1,
          force3D: true,
        });
      }
    });

    // Small delay to ensure DOM is ready
    await gsapDelay(0.05);

    // Create GSAP Timeline with stagger for arrival
    // Cards arrive to their FINAL position with their STORED rotation
    const arriveTimeline = gsap.timeline();

    arriveElements.forEach((el, index) => {
      // Use the rotation stored in the card (same as deck will use)
      const cardData = arrivingCards.value[index];
      arriveTimeline.to(
        el,
        {
          x: startX,
          y: 0,
          rotation: cardData.rotation, // Use stored rotation
          duration: 0.6,
          ease: "expo.out",
        },
        index * 0.1 // Stagger: 0.1s between each card
      );
    });

    // Wait for arrival to complete (with safety timeout)
    await waitForTimeline(arriveTimeline, 8000);

    // Transfer arriving cards to deck SIMULTANEOUSLY
    // This prevents blink because both use the same rotation values
    deckCards.value = newDeck;
    arrivingCards.value = [];

    // Clean up context
    if (renewalContext) {
      renewalContext.kill();
      renewalContext = null;
    }
  } catch (error) {
    console.error("Renewal animation error:", error);
    // Force cleanup on error
    ejectingCards.value = [];
    arrivingCards.value = [];
    if (renewalContext) {
      renewalContext.kill();
      renewalContext = null;
    }
  }

  // Resume normal animation
  isRenewing.value = false;

  // Small delay before first draw, then schedule next
  await gsapDelay(0.5);
  drawCard();
};

// Draw animation
const drawCard = () => {
  if (isAnimating.value || isRenewing.value) return;

  // If deck is empty, trigger renewal animation
  if (deckCards.value.length === 0) {
    renewDeck();
    return;
  }

  isAnimating.value = true;
  const cardData = deckCards.value.pop()!;

  // Create a new rotation for when this card lands in the drawn pile
  const drawnRotation = getCardRotation(
    drawnCards.value.length + (Date.now() % 100),
    3
  );
  const cardWithNewRotation: CardWithRotation = {
    ...cardData,
    rotation: drawnRotation, // New rotation for the drawn pile
  };

  flyingCard.value = cardData;
  showFlyingCard.value = true;

  // Reset foil pointer
  flyingPointerX.value = 90;
  flyingPointerY.value = 40;

  nextTick(() => {
    const wrapper = flyingCardRef.value;
    if (!wrapper) {
      isAnimating.value = false;
      showFlyingCard.value = false;
      // Schedule next draw even on failure
      scheduleNextDraw();
      return;
    }

    const flipCard = wrapper.querySelector(".flip-card") as HTMLElement;
    if (!flipCard) {
      isAnimating.value = false;
      showFlyingCard.value = false;
      // Schedule next draw even on failure
      scheduleNextDraw();
      return;
    }

    const { startX, endX } = getStackPositions();

    // Use the stored rotation from the card (deck rotation)
    const startRotation = cardData.rotation;
    // Use the new rotation for the drawn pile
    const endRotation = drawnRotation;

    // Initial state
    gsap.set(wrapper, {
      x: startX,
      y: 0,
      scale: 1,
      opacity: 1,
      force3D: true,
    });

    gsap.set(flipCard, {
      rotateZ: startRotation,
      rotateY: 0,
      force3D: true,
    });

    // Main animation timeline
    const tl = gsap.timeline({
      onComplete: () => {
        // Add the card with its NEW rotation to drawn pile
        drawnCards.value.unshift(cardWithNewRotation);
        showFlyingCard.value = false;
        flyingCard.value = null;
        isAnimating.value = false;

        // Schedule next draw AFTER animation completes (consistent timing)
        scheduleNextDraw();
      },
    });

    // Position animation
    tl.to(
      wrapper,
      {
        duration: ANIMATION_DURATION,
        x: endX,
        ease: "power2.inOut",
      },
      0
    );

    // 3D flip animation
    tl.to(
      flipCard,
      {
        duration: ANIMATION_DURATION,
        rotateZ: endRotation,
        rotateY: 180,
        ease: "power2.inOut",
      },
      0
    );

    // Animate foil effect - pointer follows the rotation
    tl.to(
      flyingPointerX,
      {
        value: 10,
        duration: ANIMATION_DURATION,
        ease: "power2.inOut",
      },
      0
    );

    tl.to(
      flyingPointerY,
      {
        value: 60,
        duration: ANIMATION_DURATION,
        ease: "sine.inOut",
      },
      0
    );

    // Vertical arc
    tl.to(
      wrapper,
      {
        duration: ANIMATION_DURATION * 0.5,
        y: -35,
        scale: 1.05,
        ease: "power2.out",
      },
      0
    );

    tl.to(
      wrapper,
      {
        duration: ANIMATION_DURATION * 0.5,
        y: 0,
        scale: 1,
        ease: "power2.in",
      },
      ANIMATION_DURATION * 0.5
    );
  });
};

// Stack layer offset (deck - right side)
const getDeckStyle = (index: number, total: number) => {
  const offset = (total - 1 - index) * 3;
  return {
    transform: `translate3d(${-offset}px, ${-offset}px, 0)`,
    zIndex: index + 1,
  };
};

// Drawn card offset (left side)
const getDrawnStyle = (index: number) => {
  const offset = index * 3;
  return {
    transform: `translate3d(${offset}px, ${-offset}px, 0)`,
    zIndex: 50 - index,
  };
};
</script>

<template>
  <div ref="containerRef" class="card-draw">
    <!-- Drawn stack (LEFT) - uses stored rotations -->
    <div ref="leftStackRef" class="card-draw__stack card-draw__stack--left">
      <!-- Placeholder always visible in background -->
      <div class="stack-placeholder">
        <span>✧</span>
      </div>
      <!-- Cards on top of placeholder -->
      <div
        v-for="(cardData, i) in drawnCards.slice(0, 5)"
        :key="cardData.id"
        class="stack-card-wrapper"
        :style="getDrawnStyle(i)"
      >
        <HomeFlipCard
          :card="cardData.card"
          :flipped="true"
          :rotation="cardData.rotation"
          :pointer-x="ambientPointer.x"
          :pointer-y="ambientPointer.y"
        />
      </div>
    </div>

    <!-- Ejecting cards (during renewal) - GSAP controls all transforms -->
    <div
      v-for="cardData in ejectingCards"
      :key="cardData.id"
      :data-eject-id="cardData.id"
      class="ejecting-card"
    >
      <HomeFlipCard
        :card="cardData.card"
        :flipped="true"
        :rotation="0"
        :animated="true"
        :pointer-x="ambientPointer.x"
        :pointer-y="ambientPointer.y"
      />
    </div>

    <!-- Arriving cards (during renewal) - GSAP controls all transforms -->
    <div
      v-for="cardData in arrivingCards"
      :key="cardData.id"
      :data-arrive-id="cardData.id"
      class="arriving-card"
    >
      <HomeFlipCard
        :card="cardData.card"
        :flipped="false"
        :rotation="0"
        :animated="true"
        :pointer-x="ambientPointer.x"
        :pointer-y="ambientPointer.y"
      />
    </div>

    <!-- Flying card (CENTER) - GSAP controls rotation -->
    <div
      ref="flyingCardRef"
      class="flying-card"
      :class="{ 'flying-card--hidden': !showFlyingCard }"
    >
      <HomeFlipCard
        v-if="flyingCard"
        :card="flyingCard.card"
        :flipped="false"
        :animated="true"
        :pointer-x="flyingPointerX"
        :pointer-y="flyingPointerY"
      />
    </div>

    <!-- Deck stack (RIGHT) - uses stored rotations -->
    <div ref="rightStackRef" class="card-draw__stack card-draw__stack--right">
      <!-- Placeholder always visible in background -->
      <div class="stack-placeholder">
        <span>✧</span>
      </div>
      <!-- Cards on top of placeholder (hidden during renewal to avoid overlap with arriving cards) -->
      <template v-if="!isRenewing">
        <div
          v-for="(cardData, i) in deckCards.slice(-5)"
          :key="cardData.id"
          class="stack-card-wrapper"
          :style="getDeckStyle(i, Math.min(deckCards.length, 5))"
        >
          <HomeFlipCard
            :card="cardData.card"
            :flipped="false"
            :rotation="cardData.rotation"
            :pointer-x="ambientPointer.x"
            :pointer-y="ambientPointer.y"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.card-draw {
  position: relative;
  width: 100%;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  z-index: 1;
  perspective: 1000px;
  /* Disable all mouse interactions */
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

@media (min-width: 640px) {
  .card-draw {
    height: 280px;
  }
}

@media (min-width: 1024px) {
  .card-draw {
    height: 280px;
  }
}

@media (min-width: 1280px) {
  .card-draw {
    height: 320px;
  }
}

/* ==========================================
   STACKS - Larger cards
   ========================================== */
.card-draw__stack {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  --card-w: 120px;
  --card-h: 168px;
  width: var(--card-w);
  height: var(--card-h);
  perspective: 800px;
}

@media (min-width: 640px) {
  .card-draw__stack {
    --card-w: 140px;
    --card-h: 196px;
  }
}

@media (min-width: 1024px) {
  .card-draw__stack {
    --card-w: 150px;
    --card-h: 210px;
  }
}

@media (min-width: 1280px) {
  .card-draw__stack {
    --card-w: 170px;
    --card-h: 238px;
  }
}

.card-draw__stack--left {
  left: calc(50% - var(--card-w) - 30px);
}

.card-draw__stack--right {
  right: calc(50% - var(--card-w) - 30px);
}

@media (min-width: 640px) {
  .card-draw__stack--left {
    left: calc(50% - var(--card-w) - 50px);
  }
  .card-draw__stack--right {
    right: calc(50% - var(--card-w) - 50px);
  }
}

@media (min-width: 1024px) {
  .card-draw__stack--left {
    left: calc(50% - var(--card-w) - 70px);
  }
  .card-draw__stack--right {
    right: calc(50% - var(--card-w) - 70px);
  }
}

/* ==========================================
   STACK CARDS
   ========================================== */
.stack-card-wrapper {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.stack-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 2px dashed rgba(60, 55, 50, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(80, 70, 60, 0.15);
  font-size: 2rem;
  z-index: 0; /* Always behind cards */
}

/* ==========================================
   FLYING CARD - Same size as stack cards
   ========================================== */
.flying-card {
  position: absolute;
  top: 50%;
  left: 50%;
  --card-w: 120px;
  --card-h: 168px;
  width: var(--card-w);
  height: var(--card-h);
  margin-top: calc(var(--card-h) / -2);
  margin-left: calc(var(--card-w) / -2);
  z-index: 100;
  will-change: transform, opacity;
  pointer-events: none;
}

.flying-card--hidden {
  opacity: 0;
  visibility: hidden;
}

@media (min-width: 640px) {
  .flying-card {
    --card-w: 140px;
    --card-h: 196px;
  }
}

@media (min-width: 1024px) {
  .flying-card {
    --card-w: 150px;
    --card-h: 210px;
  }
}

@media (min-width: 1280px) {
  .flying-card {
    --card-w: 170px;
    --card-h: 238px;
  }
}

/* ==========================================
   EJECTING CARDS (renewal animation)
   GSAP controls all transforms - Same size as stack cards
   ========================================== */
.ejecting-card {
  position: absolute;
  top: 50%;
  left: 50%;
  --card-w: 120px;
  --card-h: 168px;
  width: var(--card-w);
  height: var(--card-h);
  margin-top: calc(var(--card-h) / -2);
  margin-left: calc(var(--card-w) / -2);
  z-index: 90;
  will-change: transform;
  pointer-events: none;
}

@media (min-width: 640px) {
  .ejecting-card {
    --card-w: 140px;
    --card-h: 196px;
  }
}

@media (min-width: 1024px) {
  .ejecting-card {
    --card-w: 150px;
    --card-h: 210px;
  }
}

@media (min-width: 1280px) {
  .ejecting-card {
    --card-w: 170px;
    --card-h: 238px;
  }
}

/* ==========================================
   ARRIVING CARDS (renewal animation)
   GSAP controls all transforms - Same size as stack cards
   ========================================== */
.arriving-card {
  position: absolute;
  top: 50%;
  left: 50%;
  --card-w: 120px;
  --card-h: 168px;
  width: var(--card-w);
  height: var(--card-h);
  margin-top: calc(var(--card-h) / -2);
  margin-left: calc(var(--card-w) / -2);
  z-index: 80;
  will-change: transform;
  pointer-events: none;
}

@media (min-width: 640px) {
  .arriving-card {
    --card-w: 140px;
    --card-h: 196px;
  }
}

@media (min-width: 1024px) {
  .arriving-card {
    --card-w: 150px;
    --card-h: 210px;
  }
}

@media (min-width: 1280px) {
  .arriving-card {
    --card-w: 170px;
    --card-h: 238px;
  }
}
</style>
