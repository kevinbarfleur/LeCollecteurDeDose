<script setup lang="ts">
import { useReplayPlayer } from "~/composables/useReplayPlayer";
import { useAltarEffects } from "~/composables/useAltarEffects";
import { useAltarAura } from "~/composables/useAltarAura";
import { useDisintegrationEffect } from "~/composables/useDisintegrationEffect";
import { getCardById } from "~/data/mockCards";
import { TIER_CONFIG, isCardFoil } from "~/types/card";
import type { CardTier } from "~/types/card";
import gsap from "gsap";
import html2canvas from "html2canvas";

// Tier-based colors for animations (consistent with useVaalOutcomes)
const TIER_COLORS = {
  T0: {
    primary: "#c9a227",
    secondary: "#f5d76e",
    glow: "rgba(201, 162, 39, 0.8)",
  },
  T1: {
    primary: "#7a6a8a",
    secondary: "#a294b0",
    glow: "rgba(122, 106, 138, 0.7)",
  },
  T2: {
    primary: "#5a7080",
    secondary: "#8aa0b0",
    glow: "rgba(90, 112, 128, 0.6)",
  },
  T3: {
    primary: "#5a5a5d",
    secondary: "#7a7a7d",
    glow: "rgba(90, 90, 93, 0.5)",
  },
} as const;

const getTierColors = (tier?: string) => {
  if (!tier) return TIER_COLORS.T3;
  const key = tier.toUpperCase() as keyof typeof TIER_COLORS;
  return TIER_COLORS[key] || TIER_COLORS.T3;
};

useHead({ title: "Replay - Le Collecteur de Dose" });

const route = useRoute();
const router = useRouter();

const {
  isLoading,
  isPlaying,
  cursorX,
  cursorY,
  username,
  userAvatar,
  cardInfo,
  outcome,
  resultCardId,
  views,
  createdAt,
  error: playerError,
  setCardRef,
  loadFromId,
  play,
  reset,
} = useReplayPlayer();

const altarCardRef = ref<HTMLElement | null>(null);
const cardFrontRef = ref<HTMLElement | null>(null);
const cardSlotRef = ref<HTMLElement | null>(null);
const vaalOrbRef = ref<HTMLElement | null>(null);
const altarPlatformRef = ref<HTMLElement | null>(null);

const isLoaded = ref(false);
const hasError = ref(false);
const showOutcome = ref(false);
const cardData = ref<any>(null);
const isCardBeingDestroyed = ref(false);

// Use shared altar effects composable
const {
  heartbeatIntensity,
  isOrbOverCard,
  heartbeatStyles,
  getAltarClasses,
  getCardClasses,
  resetEffects,
  lockEffects,
  unlockEffects,
  // Earthquake effect styles
  earthquakeHeaderStyles,
  earthquakeVaalStyles,
  earthquakeBodyStyles,
  getEarthquakeClasses,
} = useAltarEffects({
  cardRef: altarCardRef,
  cursorX,
  cursorY,
  isActive: isPlaying,
  isDestroying: isCardBeingDestroyed,
});

// Computed classes for earthquake effect on different UI sections
const headerEarthquakeClasses = computed(() => getEarthquakeClasses("header"));
const outcomeEarthquakeClasses = computed(() =>
  getEarthquakeClasses("vaalSection")
);
const bodyEarthquakeClasses = computed(() => getEarthquakeClasses("body"));

// Global earthquake on #app-wrapper (not html, to avoid breaking position:fixed)
watch(isOrbOverCard, (isOver) => {
  if (typeof document !== "undefined") {
    const appWrapper = document.getElementById("app-wrapper");
    if (appWrapper) {
      if (isOver) {
        appWrapper.classList.add("earthquake-global");
      } else {
        appWrapper.classList.remove("earthquake-global");
      }
    }
  }
});

// Prevent scrollbar flicker during replay (earthquake effect can cause overflow)
watch(isPlaying, (playing) => {
  if (typeof document !== "undefined") {
    if (playing) {
      document.documentElement.classList.add("no-scroll-during-drag");
      document.body.classList.add("no-scroll-during-drag");
    } else {
      document.documentElement.classList.remove("no-scroll-during-drag");
      document.body.classList.remove("no-scroll-during-drag");
    }
  }
});

onBeforeUnmount(() => {
  const appWrapper = document.getElementById("app-wrapper");
  if (appWrapper) {
    appWrapper.classList.remove("earthquake-global");
  }
  // Clean up scroll lock classes
  document.documentElement.classList.remove("no-scroll-during-drag");
  document.body.classList.remove("no-scroll-during-drag");
});

// Use shared disintegration effect composable
const {
  cardSnapshot,
  imageSnapshot,
  capturedImageDimensions,
  capturedCardDimensions,
  canvasHasContent,
  createDisintegrationEffect,
  findCardImageElement: findCardImageElementBase,
  captureCardSnapshot: captureCardSnapshotBase,
  clearSnapshots,
} = useDisintegrationEffect();

// Wrapper to use the composable with our ref
const findCardImageElement = () => findCardImageElementBase(cardFrontRef);
const captureCardSnapshot = () => captureCardSnapshotBase(cardFrontRef);

const tierConfig = computed(() => {
  if (!cardData.value) return TIER_CONFIG.T3;
  return (
    TIER_CONFIG[cardData.value.tier as keyof typeof TIER_CONFIG] ||
    TIER_CONFIG.T3
  );
});

const isCurrentCardFoil = computed(() => {
  if (!cardData.value) return false;
  return isCardFoil(cardData.value);
});

// Use the shared getAltarClasses function
const altarClasses = computed(() =>
  getAltarClasses(
    { tier: cardData.value?.tier, foil: isCurrentCardFoil.value },
    isLoaded.value
  )
);

// Card classes using the shared function
const cardClasses = computed(() => getCardClasses(isLoaded.value, false));

// Altar Aura Effect - outer glow, rays, and particles
useAltarAura({
  containerRef: altarPlatformRef,
  isActive: isLoaded,
  isVaalMode: isOrbOverCard,
  tier: computed(() => cardData.value?.tier),
  isFoil: isCurrentCardFoil,
});

const formattedDate = computed(() => {
  if (!createdAt.value) return "";
  return new Date(createdAt.value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

onMounted(async () => {
  const replayId = route.params.id as string;

  if (!replayId) {
    hasError.value = true;
    return;
  }

  const success = await loadFromId(replayId);
  if (!success) {
    hasError.value = true;
    return;
  }

  if (cardInfo.value) {
    const card = getCardById(cardInfo.value.id);
    if (card) {
      cardData.value = {
        ...card,
        foil: cardInfo.value.foil,
      };
    }
  }

  isLoaded.value = true;

  // Set the card reference for position calculations
  setCardRef(altarCardRef);

  setTimeout(() => {
    startReplay();
  }, 1500);
});

const startReplay = async () => {
  showOutcome.value = false;
  isCardBeingDestroyed.value = false;
  unlockEffects(); // Ensure effects are unlocked for new replay
  resetEffects();

  cardSnapshot.value = null;
  imageSnapshot.value = null;
  capturedImageDimensions.value = null;
  capturedCardDimensions.value = null;

  if (vaalOrbRef.value) {
    gsap.set(vaalOrbRef.value, { opacity: 1, scale: 1 });
  }

  if (altarCardRef.value) {
    gsap.set(altarCardRef.value, {
      opacity: 1,
      scale: 1,
      filter: "brightness(1) saturate(1)",
      x: 0,
      y: 0,
    });
  }

  await captureCardSnapshot();

  play(() => {
    triggerOutcome();
  });
};

const triggerOutcome = async () => {
  if (!outcome.value || !altarCardRef.value) return;

  // Lock effects IMMEDIATELY to prevent recalculation from cursor position updates
  // This ensures the altar stops vibrating/glowing at the exact moment of the drop
  // lockEffects() also resets visual states (heartbeat, isOrbOverCard)
  lockEffects();

  if (vaalOrbRef.value) {
    await new Promise<void>((resolve) => {
      gsap.to(vaalOrbRef.value, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
        onComplete: resolve,
      });
    });
  }

  switch (outcome.value) {
    case "nothing":
      await showNothingEffect();
      break;

    case "foil":
      await transformToFoilEffect();
      break;

    case "destroyed":
      await destroyCardEffect();
      break;

    case "transform":
      await showTransformEffect();
      break;

    case "duplicate":
      await showDuplicateEffect();
      break;
  }

  setTimeout(() => {
    showOutcome.value = true;
  }, 800);
};

const showNothingEffect = async () => {
  if (!altarCardRef.value) return;

  gsap.to(altarCardRef.value, {
    filter: "brightness(1.3) saturate(0.8)",
    duration: 0.15,
    ease: "power2.out",
    onComplete: () => {
      gsap.to(altarCardRef.value, {
        filter: "brightness(1) saturate(1)",
        duration: 0.3,
        ease: "power2.out",
      });
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 400));
};

const transformToFoilEffect = async () => {
  if (!altarCardRef.value) return;

  const tierColors = getTierColors(cardInfo.value?.tier);
  const glowShadow = `0 0 30px ${tierColors.glow}, 0 0 60px ${tierColors.glow}`;

  gsap.to(altarCardRef.value, {
    filter: "brightness(1.8) saturate(1.5)",
    scale: 1.05,
    boxShadow: glowShadow,
    duration: 0.2,
    ease: "power2.in",
  });

  await new Promise((resolve) => setTimeout(resolve, 200));

  gsap.to(altarCardRef.value, {
    filter: "brightness(3) saturate(2)",
    scale: 1.1,
    boxShadow: `0 0 50px ${tierColors.glow}, 0 0 90px ${tierColors.glow}`,
    duration: 0.1,
    ease: "power2.out",
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  if (cardData.value) {
    cardData.value = { ...cardData.value, foil: true };
  }

  gsap.to(altarCardRef.value, {
    filter: "brightness(1) saturate(1)",
    scale: 1,
    boxShadow: "none",
    duration: 0.4,
    ease: "power2.out",
  });

  await new Promise((resolve) => setTimeout(resolve, 400));
};

const destroyCardEffect = async () => {
  if (!altarCardRef.value) return;

  isCardBeingDestroyed.value = true;

  const shakeTl = gsap.timeline();
  for (let i = 0; i < 6; i++) {
    shakeTl.to(altarCardRef.value, {
      x: (i % 2 === 0 ? -1 : 1) * (4 + i),
      duration: 0.04,
      ease: "none",
    });
  }
  shakeTl.to(altarCardRef.value, { x: 0, duration: 0.03 });

  gsap.to(altarCardRef.value, {
    filter: "brightness(1.5) sepia(0.4) saturate(1.2)",
    duration: 0.25,
  });

  await new Promise((resolve) => setTimeout(resolve, 300));

  const cardSlot = cardSlotRef.value;
  if (!cardSlot) {
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  try {
    const containers: HTMLElement[] = [];
    const imageElement = findCardImageElement();
    const hasImageSnapshot =
      imageSnapshot.value && canvasHasContent(imageSnapshot.value);

    if (hasImageSnapshot && imageElement && altarCardRef.value) {
      const imgTag = imageElement.querySelector(
        ".game-card__image"
      ) as HTMLImageElement | null;
      const imgRect = imgTag?.getBoundingClientRect();
      const actualWidth = imgRect?.width || imageElement.clientWidth;
      const actualHeight = imgRect?.height || imageElement.clientHeight;
      const altarRect = altarCardRef.value.getBoundingClientRect();
      const relativeTop = imgRect
        ? imgRect.top - altarRect.top
        : imageElement.getBoundingClientRect().top - altarRect.top;
      const relativeLeft = imgRect
        ? imgRect.left - altarRect.left
        : imageElement.getBoundingClientRect().left - altarRect.left;

      const imgContainer = document.createElement("div");
      imgContainer.className = "disintegration-container";
      imgContainer.style.cssText = `
        position: absolute;
        top: ${relativeTop}px;
        left: ${relativeLeft}px;
        width: ${actualWidth}px;
        height: ${actualHeight}px;
        pointer-events: none;
        z-index: 101;
        overflow: visible;
      `;

      altarCardRef.value.appendChild(imgContainer);
      containers.push(imgContainer);

      await createDisintegrationEffect(imageSnapshot.value!, imgContainer, {
        frameCount: 48,
        direction: "up",
        duration: 0.8,
        delayMultiplier: 0.4,
        targetWidth: actualWidth,
        targetHeight: actualHeight,
      });

      if (imgTag) imgTag.style.opacity = "0";

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    let cardCanvas = cardSnapshot.value;
    if (!cardCanvas && cardFrontRef.value) {
      try {
        cardCanvas = await html2canvas(cardFrontRef.value, {
          backgroundColor: null,
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
        });
      } catch (e) {}
    }

    if (cardCanvas && altarCardRef.value && capturedCardDimensions.value) {
      const { width: cardWidth, height: cardHeight } =
        capturedCardDimensions.value;

      const cardContainer = document.createElement("div");
      cardContainer.className = "disintegration-container";
      cardContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        pointer-events: none;
        z-index: 100;
        overflow: visible;
      `;

      cardSlot.appendChild(cardContainer);
      containers.push(cardContainer);

      gsap.set(altarCardRef.value, { opacity: 0 });

      await createDisintegrationEffect(cardCanvas, cardContainer, {
        frameCount: 64,
        direction: "out",
        duration: 0.9,
        delayMultiplier: 0.7,
        targetWidth: cardWidth,
        targetHeight: cardHeight,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
    containers.forEach((c) => c.remove());
  } catch (error) {
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

// Helper to preload an image
const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

// Helper to find all image elements in the card
const findCardImages = (element: HTMLElement): HTMLImageElement[] => {
  return Array.from(
    element.querySelectorAll("img.game-card__image, img.detail__image")
  );
};

// Transform effect - heartbeat vibration with synchronized transformation at peak
const showTransformEffect = async () => {
  if (!altarCardRef.value) return;

  const tierColors = getTierColors(cardInfo.value?.tier);
  const glowShadow = `0 0 20px ${tierColors.glow}, 0 0 40px ${tierColors.glow}`;
  const cardElement = altarCardRef.value;

  // IMPORTANT: Disable CSS animations that conflict with GSAP transforms
  cardElement.classList.remove(
    "altar-card--heartbeat",
    "altar-card--panicking"
  );
  cardElement.style.animation = "none";

  // Get the new card data and PRELOAD its image BEFORE animation
  let newCard: ReturnType<typeof getCardById> | null = null;
  let newImageUrl: string | null = null;

  if (resultCardId.value) {
    newCard = getCardById(resultCardId.value);
    if (newCard?.gameData?.img) {
      newImageUrl = newCard.gameData.img;
      try {
        await preloadImage(newImageUrl);
      } catch (e) {
        console.warn(
          "Failed to preload transform card image, continuing anyway"
        );
      }
    }
  }

  // Find all image elements to swap them directly at peak
  const cardImages = findCardImages(cardElement);

  // Phase 1: Heartbeat vibration effect with synchronized transformation
  const timeline = gsap.timeline();

  // First heartbeat pulse - systole (contract)
  timeline.to(cardElement, {
    scale: 0.92,
    x: -3,
    boxShadow: glowShadow,
    duration: 0.1,
    ease: "power2.in",
  });
  // Diastole (expand)
  timeline.to(cardElement, {
    scale: 1.06,
    x: 3,
    duration: 0.12,
    ease: "power2.out",
  });

  // Second heartbeat - stronger
  timeline.to(cardElement, {
    scale: 0.88,
    x: -4,
    filter: "brightness(1.2)",
    duration: 0.1,
    ease: "power2.in",
  });
  timeline.to(cardElement, {
    scale: 1.1,
    x: 4,
    filter: "brightness(1.4)",
    duration: 0.12,
    ease: "power2.out",
  });

  // Third heartbeat - building to climax (contract)
  timeline.to(cardElement, {
    scale: 0.82,
    x: -5,
    filter: "brightness(1.8)",
    boxShadow: `0 0 40px ${tierColors.glow}, 0 0 70px ${tierColors.glow}`,
    duration: 0.1,
    ease: "power2.in",
  });

  // TRANSFORMATION happens at the PEAK of the final heartbeat
  // Maximum expansion with flash - card transforms HERE
  timeline.to(cardElement, {
    scale: 1.25,
    x: 0,
    filter: "brightness(3) blur(4px)",
    boxShadow: `0 0 60px ${tierColors.glow}, 0 0 100px ${tierColors.glow}`,
    duration: 0.08,
    ease: "power2.out",
    onComplete: () => {
      // INSTANT image swap in DOM at peak brightness (hidden by blur/brightness)
      if (newImageUrl) {
        cardImages.forEach((img) => {
          img.src = newImageUrl!;
        });
      }

      // Update the reactive card data
      if (newCard) {
        cardData.value = {
          ...newCard,
          foil: cardInfo.value?.foil || false,
        };
      }
    },
  });

  // Quick contraction after the flash (new card visible)
  timeline.to(cardElement, {
    scale: 0.95,
    filter: "brightness(1.5) blur(0px)",
    boxShadow: `0 0 30px ${tierColors.glow}`,
    duration: 0.1,
    ease: "power2.in",
  });

  // Settle to normal with a gentle bounce
  timeline.to(cardElement, {
    scale: 1,
    filter: "brightness(1)",
    boxShadow: "none",
    duration: 0.35,
    ease: "elastic.out(1, 0.5)",
  });

  await timeline.then();
};

// Duplicate effect - clone appears on top, then both translate apart side by side
const showDuplicateEffect = async () => {
  if (!altarCardRef.value || !cardSlotRef.value) return;

  const tierColors = getTierColors(cardInfo.value?.tier);
  const glowShadow = `0 0 25px ${tierColors.glow}, 0 0 50px ${tierColors.glow}`;
  const cardElement = altarCardRef.value;
  const cardSlot = cardSlotRef.value;

  // IMPORTANT: Disable CSS animations that conflict with GSAP transforms
  cardElement.classList.remove(
    "altar-card--heartbeat",
    "altar-card--panicking"
  );
  cardElement.style.animation = "none";

  const cardRect = cardElement.getBoundingClientRect();
  const cardWidth = cardRect.width;

  // Temporarily allow overflow on parent containers for the animation
  const replayContent = document.querySelector(
    ".replay-content"
  ) as HTMLElement;
  const replayStage = document.querySelector(".replay-stage") as HTMLElement;
  const altarPlatform = altarPlatformRef.value;

  const originalOverflows: { el: HTMLElement; overflow: string }[] = [];
  [replayContent, replayStage, altarPlatform, cardSlot].forEach((el) => {
    if (el) {
      originalOverflows.push({ el, overflow: el.style.overflow });
      el.style.overflow = "visible";
    }
  });

  // Phase 1: Energy gathering - heartbeat-like pulses
  const timeline = gsap.timeline();

  timeline.to(cardElement, {
    scale: 0.95,
    filter: "brightness(1.2)",
    boxShadow: glowShadow,
    duration: 0.1,
    ease: "power2.in",
  });
  timeline.to(cardElement, {
    scale: 1.08,
    filter: "brightness(1.5)",
    duration: 0.12,
    ease: "power2.out",
  });
  timeline.to(cardElement, {
    scale: 0.92,
    filter: "brightness(1.3)",
    duration: 0.08,
    ease: "power2.in",
  });
  timeline.to(cardElement, {
    scale: 1.12,
    filter: "brightness(1.8)",
    boxShadow: `0 0 40px ${tierColors.glow}, 0 0 70px ${tierColors.glow}`,
    duration: 0.15,
    ease: "power2.out",
  });

  await timeline.then();

  // Phase 2: Create clone using the pre-captured snapshot (avoids scoped CSS issues)
  const cloneElement = document.createElement("div");
  cloneElement.id = "duplicate-clone-replay";
  cloneElement.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: ${cardRect.width}px;
    height: ${cardRect.height}px;
    top: ${cardRect.top}px;
    left: ${cardRect.left}px;
    margin: 0;
    box-shadow: ${glowShadow};
    border-radius: 8px;
    overflow: hidden;
  `;

  // Deep clone with inline styles - preserves appearance outside scoped CSS
  const cloneWithStyles = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(false) as HTMLElement;

    // Copy computed styles as inline styles
    const computed = window.getComputedStyle(element);
    const importantStyles = [
      "width",
      "height",
      "padding",
      "margin",
      "border",
      "border-radius",
      "background",
      "background-color",
      "background-image",
      "background-size",
      "color",
      "font-size",
      "font-family",
      "font-weight",
      "text-align",
      "display",
      "flex-direction",
      "align-items",
      "justify-content",
      "gap",
      "position",
      "top",
      "left",
      "right",
      "bottom",
      "overflow",
      "opacity",
      "box-shadow",
      "transform",
    ];

    importantStyles.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== "none" && value !== "auto" && value !== "normal") {
        clone.style.setProperty(prop, value);
      }
    });

    // Handle images specially - copy src directly
    if (element.tagName === "IMG") {
      const imgEl = element as HTMLImageElement;
      const imgClone = clone as HTMLImageElement;
      imgClone.src = imgEl.src;
      imgClone.style.width = computed.width;
      imgClone.style.height = computed.height;
      imgClone.style.objectFit = computed.objectFit || "cover";
    }

    // Recursively clone children
    element.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        clone.appendChild(cloneWithStyles(child as HTMLElement));
      } else if (child.nodeType === Node.TEXT_NODE) {
        clone.appendChild(child.cloneNode(true));
      }
    });

    return clone;
  };

  // Clone the card with all styles preserved
  if (cardFrontRef.value) {
    try {
      const cardClone = cloneWithStyles(cardFrontRef.value);
      cardClone.style.width = "100%";
      cardClone.style.height = "100%";
      cardClone.style.transform = "none";
      cardClone.style.animation = "none";
      cloneElement.appendChild(cardClone);
    } catch (e) {
      console.error("Clone failed:", e);
      cloneElement.style.background = `linear-gradient(135deg, ${tierColors.primary}, ${tierColors.secondary})`;
    }
  } else {
    cloneElement.style.background = `linear-gradient(135deg, ${tierColors.primary}, ${tierColors.secondary})`;
  }

  document.body.appendChild(cloneElement);
  const clone = cloneElement;

  // Initialize clone with GSAP (hidden and scaled)
  gsap.set(clone, {
    opacity: 0,
    scale: 1.12,
  });

  // Flash effect for "split" - both cards flash together
  gsap.to(cardElement, {
    scale: 1.2,
    filter: "brightness(2.5)",
    duration: 0.1,
    ease: "power2.out",
  });

  // Make clone visible at same moment
  gsap.to(clone, {
    opacity: 1,
    scale: 1.2,
    duration: 0.1,
    ease: "power2.out",
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Calculate translation distance (half card width + small gap)
  const translateDistance = cardWidth / 2 + 12;

  // Phase 3: Both cards translate apart - original left, clone right
  const splitTimeline = gsap.timeline();

  // Original card translates left using transform
  splitTimeline.to(
    cardElement,
    {
      x: -translateDistance,
      scale: 1,
      filter: "brightness(1)",
      boxShadow: glowShadow,
      duration: 0.4,
      ease: "power2.out",
    },
    0
  );

  // Clone translates right
  splitTimeline.to(
    clone,
    {
      x: translateDistance,
      scale: 1,
      filter: "brightness(1)",
      duration: 0.4,
      ease: "power2.out",
    },
    0
  );

  await splitTimeline.then();

  // Phase 4: Hold position - show both cards side by side for 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Phase 5: Clone (duplicate) exits to the right, original returns to center
  const exitTimeline = gsap.timeline();

  // Clone flies off to the right
  exitTimeline.to(clone, {
    x: window.innerWidth,
    opacity: 0,
    scale: 0.7,
    rotation: 20,
    duration: 0.6,
    ease: "power2.in",
  });

  // Original card returns to center position
  exitTimeline.to(
    cardElement,
    {
      x: 0,
      boxShadow: "none",
      duration: 0.5,
      ease: "power2.out",
    },
    0.15
  );

  await exitTimeline.then();

  // Cleanup clone
  clone.remove();

  // Restore overflow on parent containers
  originalOverflows.forEach(({ el, overflow }) => {
    el.style.overflow = overflow;
  });

  // Ensure card is fully reset
  gsap.set(cardElement, {
    clearProps: "all",
  });
};

const restartReplay = () => {
  window.location.reload();
};

const goToAltar = () => {
  router.push("/altar");
};

const outcomeText = computed(() => {
  switch (outcome.value) {
    case "nothing":
      return "Rien ne s'est passé";
    case "foil":
      return "Transformation en Foil !";
    case "destroyed":
      return "Carte détruite...";
    case "transform":
      return "Carte transformée !";
    case "duplicate":
      return "Duplication miraculeuse !";
    default:
      return "";
  }
});

const outcomeClass = computed(() => {
  switch (outcome.value) {
    case "nothing":
      return "outcome--nothing";
    case "foil":
      return "outcome--foil";
    case "destroyed":
      return "outcome--destroyed";
    case "transform":
      return "outcome--transform";
    case "duplicate":
      return "outcome--duplicate";
    default:
      return "";
  }
});

// Get the appropriate card name based on outcome
// For transform: show the NEW card name
// For others: show the original card name
const getCardName = () => {
  if (!cardInfo.value) return "";

  // For transformation, show the transformed (new) card name
  if (outcome.value === "transform" && resultCardId.value) {
    const newCard = getCardById(resultCardId.value);
    return newCard?.name || resultCardId.value;
  }

  // For all other outcomes, show the original card name
  const card = getCardById(cardInfo.value.id);
  return card?.name || cardInfo.value.id;
};

// Get original card name (for showing "before" state)
const getOriginalCardName = () => {
  if (!cardInfo.value) return "";
  const card = getCardById(cardInfo.value.id);
  return card?.name || cardInfo.value.id;
};

const getTierColor = (): "default" | "t0" | "t1" | "t2" | "t3" => {
  if (!cardInfo.value?.tier) return "default";
  const tier = cardInfo.value.tier.toLowerCase();
  if (tier === "t0" || tier === "t1" || tier === "t2" || tier === "t3") {
    return tier as "t0" | "t1" | "t2" | "t3";
  }
  return "default";
};
</script>

<template>
  <NuxtLayout name="replay">
    <div class="replay-page">
      <!-- Loading State -->
      <div v-if="isLoading" class="replay-state">
        <div class="flex flex-col items-center gap-5">
          <div class="replay-loading__spinner"></div>
          <p class="font-serif text-base text-stone-400/60">
            Chargement du replay...
          </p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="hasError || playerError" class="replay-state">
        <div class="flex flex-col items-center text-center max-w-[400px]">
          <img
            src="/images/card-back-logo.png"
            alt="Vaal Orb"
            class="w-16 h-16 object-contain mb-6 grayscale-[40%] opacity-60"
          />
          <h2 class="font-display text-2xl text-stone-300/90 mb-3">
            Replay introuvable
          </h2>
          <p
            class="font-serif text-base text-stone-400/50 mb-8 leading-relaxed"
          >
            {{ playerError || "Ce replay n'existe pas ou a été supprimé." }}
          </p>
          <RunicButton variant="primary" @click="goToAltar">
            Découvrir l'autel
          </RunicButton>
        </div>
      </div>

      <!-- Replay Content -->
      <div
        v-else-if="isLoaded"
        class="replay-content"
        :class="bodyEarthquakeClasses"
        :style="earthquakeBodyStyles"
      >
        <!-- Compact Header -->
        <RunicBox
          padding="sm"
          class="w-full"
          :class="headerEarthquakeClasses"
          :style="earthquakeHeaderStyles"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img
                v-if="userAvatar"
                :src="userAvatar"
                :alt="username"
                class="replay-header__avatar"
              />
              <div class="flex items-baseline gap-2 flex-wrap">
                <span class="replay-header__name">{{ username }}</span>
                <span class="replay-header__label">a utilisé une Vaal Orb</span>
              </div>
            </div>
            <RunicNumber v-if="views" :value="views" label="vues" size="sm" />
          </div>
        </RunicBox>

        <!-- Main Stage -->
        <main class="replay-stage">
          <div
            ref="altarPlatformRef"
            class="altar-platform"
            :class="altarClasses"
          >
            <div class="altar-circle altar-circle--outer"></div>
            <div class="altar-circle altar-circle--middle"></div>
            <div class="altar-circle altar-circle--inner"></div>

            <span class="altar-rune altar-rune--n">✧</span>
            <span class="altar-rune altar-rune--e">✧</span>
            <span class="altar-rune altar-rune--s">✧</span>
            <span class="altar-rune altar-rune--w">✧</span>

            <div
              ref="cardSlotRef"
              class="altar-card-slot altar-card-slot--active"
            >
              <div
                v-if="cardData"
                ref="altarCardRef"
                class="altar-card"
                :class="cardClasses"
                :style="heartbeatStyles"
              >
                <div
                  ref="cardFrontRef"
                  class="altar-card__face altar-card__face--front"
                >
                  <div class="altar-card__game-card-wrapper">
                    <GameCard
                      :card="cardData"
                      :owned="true"
                      :interactive="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Outcome Panel - Fixed position, above footer -->
      <Transition name="outcome">
        <div
          v-if="showOutcome"
          class="fixed bottom-20 left-0 right-0 z-[100] pointer-events-none flex justify-center px-4"
        >
          <div
            class="replay-outcome-panel w-full max-w-[420px] pointer-events-auto"
            :class="outcomeClass"
          >
            <RunicBox padding="md">
              <div class="flex flex-col gap-3">
                <!-- Header row: badge + title + card info -->
                <div class="flex items-center gap-4">
                  <div
                    class="w-11 h-11 flex-shrink-0 flex items-center justify-center"
                  >
                    <img
                      src="/images/card-back-logo.png"
                      alt="Vaal Orb"
                      class="w-full h-full object-contain replay-outcome__badge-img"
                    />
                  </div>

                  <div class="flex-1 min-w-0">
                    <h3 class="replay-outcome__title">{{ outcomeText }}</h3>

                    <div class="flex items-center gap-2 flex-wrap">
                      <!-- For transform: show before → after -->
                      <template v-if="outcome === 'transform' && resultCardId">
                        <span class="replay-outcome__card-name--old">{{
                          getOriginalCardName()
                        }}</span>
                        <span class="text-[#50b0e0] text-sm font-semibold"
                          >→</span
                        >
                        <span class="replay-outcome__card-name--new">{{
                          getCardName()
                        }}</span>
                      </template>

                      <!-- For other outcomes: show single card -->
                      <template v-else>
                        <span class="replay-outcome__card-name">{{
                          getCardName()
                        }}</span>
                        <RunicNumber
                          :value="cardInfo?.tier || ''"
                          :color="getTierColor()"
                          size="sm"
                        />
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Actions row -->
                <div
                  class="flex gap-2 justify-end pt-2 border-t border-white/5"
                >
                  <RunicButton variant="ghost" size="sm" @click="restartReplay">
                    Revoir
                  </RunicButton>
                  <RunicButton variant="primary" size="sm" @click="goToAltar">
                    Essayer l'autel
                  </RunicButton>
                </div>
              </div>
            </RunicBox>
          </div>
        </div>
      </Transition>

      <!-- Animated Cursor with Vaal Orb - OUTSIDE replay-content to avoid earthquake transform interference -->
      <div
        v-if="isPlaying && isLoaded"
        ref="vaalOrbRef"
        class="replay-cursor"
        :style="{
          left: `${cursorX}px`,
          top: `${cursorY}px`,
        }"
      >
        <div class="replay-cursor__tag">
          <img
            v-if="userAvatar"
            :src="userAvatar"
            :alt="username"
            class="replay-cursor__tag-avatar"
          />
          <span class="replay-cursor__tag-name">{{ username }}</span>
        </div>
        <div class="replay-cursor__orb">
          <img
            src="/images/card-back-logo.png"
            alt="Vaal Orb"
            class="replay-cursor__orb-img"
          />
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* ===== PAGE LAYOUT ===== */
.replay-page {
  height: 100%;
  min-height: 500px; /* Ensures minimum visibility */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.replay-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.replay-content {
  flex: 1;
  min-height: 0; /* Important for flex shrinking */
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  overflow: hidden;
}

/* ===== LOADING STATE ===== */
/* Layout handled by Tailwind */

.replay-loading__spinner {
  @apply w-12 h-12 rounded-full;
  border: 2px solid rgba(60, 55, 50, 0.2);
  border-top-color: rgba(175, 96, 37, 0.8);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== HEADER ===== */
/* Layout handled by Tailwind - only visual styles here */

.replay-header__avatar {
  @apply w-10 h-10 rounded-full object-cover;
  border: 2px solid rgba(175, 96, 37, 0.5);
  box-shadow: 0 0 8px rgba(175, 96, 37, 0.2);
}

.replay-header__name {
  @apply font-display;
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(200, 180, 160, 0.95);
}

.replay-header__label {
  font-family: "Crimson Text", serif;
  font-size: 0.9rem;
  color: rgba(200, 180, 160, 0.5);
}

/* ===== STAGE ===== */
.replay-stage {
  flex: 1;
  min-height: 0; /* Allow shrinking */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 
 * ALTAR STYLES: Most altar styling comes from assets/css/altar.css (globally loaded)
 * Below are only replay-specific overrides for responsive sizing
 */

/* Replay-specific altar sizing - override for responsive layout */
.altar-platform {
  width: min(320px, 90vw);
  height: min(400px, 100%);
  aspect-ratio: 320 / 400;
  flex-shrink: 1;
}

/* Card slot simplified sizing for replay */
.altar-card-slot {
  width: 180px;
  height: 252px;
}

/* Game card wrapper sizing for replay context */
.altar-card__game-card-wrapper :deep(.game-card-container) {
  width: 100%;
  height: 100%;
}

/* ===== OUTCOME PANEL ===== */
/* Visual styles only - layout handled by Tailwind */

.replay-outcome-panel {
  position: relative;
  border-radius: 6px;
}

.replay-outcome__badge-img {
  filter: drop-shadow(0 0 6px rgba(180, 50, 50, 0.4));
}

.replay-outcome__title {
  @apply font-display text-base font-semibold leading-tight mb-1;
  color: rgba(200, 180, 160, 0.9);
}

.replay-outcome__card-name {
  @apply font-display text-sm;
  color: rgba(180, 165, 150, 0.8);
}

.replay-outcome__card-name--old {
  @apply text-xs line-through;
  color: rgba(150, 140, 130, 0.6);
}

.replay-outcome__card-name--new {
  @apply text-sm font-semibold;
  color: #50b0e0;
}

/* ===== OUTCOME THEMES ===== */

/* Nothing - Muted grey */
.outcome--nothing .replay-outcome__badge-img {
  filter: grayscale(0.5) opacity(0.6);
}

.outcome--nothing .replay-outcome__title {
  color: rgba(140, 135, 130, 0.75);
}

/* Destroyed - Blood red */
.outcome--destroyed .replay-outcome-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(200, 50, 50, 0.08) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.outcome--destroyed .replay-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(200, 50, 50, 0.7)) saturate(1.5);
}

.outcome--destroyed .replay-outcome__title {
  color: #e05050;
  text-shadow: 0 0 10px rgba(200, 50, 50, 0.3);
}

.outcome--destroyed .replay-outcome__card-name {
  text-decoration: line-through;
  opacity: 0.5;
}

/* Foil - Prismatic rainbow effect */
.outcome--foil .replay-outcome-panel {
  overflow: hidden;
}

.outcome--foil .replay-outcome-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(192, 160, 255, 0.1) 0%,
    rgba(255, 160, 192, 0.08) 25%,
    rgba(160, 255, 192, 0.1) 50%,
    rgba(160, 192, 255, 0.08) 75%,
    rgba(192, 160, 255, 0.1) 100%
  );
  background-size: 200% 200%;
  animation: outcomeFoilShimmer 6s ease-in-out infinite;
  pointer-events: none;
}

.outcome--foil .replay-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(192, 160, 255, 0.6))
    drop-shadow(0 0 4px rgba(255, 160, 192, 0.4)) brightness(1.15);
}

.outcome--foil .replay-outcome__title {
  background: linear-gradient(
    90deg,
    #c0a0ff,
    #ffa0c0,
    #a0ffc0,
    #a0c0ff,
    #c0a0ff
  );
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: outcomeFoilTextShimmer 4s linear infinite;
}

@keyframes outcomeFoilShimmer {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes outcomeFoilTextShimmer {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 300% 50%;
  }
}

/* Transform - Blue/Cyan mystical */
.outcome--transform .replay-outcome-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(80, 176, 224, 0.08) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.outcome--transform .replay-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(80, 176, 224, 0.7)) brightness(1.1);
}

.outcome--transform .replay-outcome__title {
  color: #50b0e0;
  text-shadow: 0 0 10px rgba(80, 176, 224, 0.3);
}

/* Duplicate - Green miracle */
.outcome--duplicate .replay-outcome-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(80, 224, 160, 0.08) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.outcome--duplicate .replay-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(80, 224, 160, 0.7)) brightness(1.2);
}

.outcome--duplicate .replay-outcome__title {
  color: #50e0a0;
  text-shadow: 0 0 10px rgba(80, 224, 160, 0.3);
}

/* ===== CURSOR ===== */
.replay-cursor {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.replay-cursor__tag {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(15, 13, 11, 0.95);
  border: 1px solid rgba(175, 96, 37, 0.5);
  border-radius: 20px;
  padding: 0.2rem 0.625rem 0.2rem 0.2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.replay-cursor__tag-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(175, 96, 37, 0.4);
}

.replay-cursor__tag-name {
  font-family: "Cinzel", serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(175, 96, 37, 0.95);
  white-space: nowrap;
}

.replay-cursor__orb {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.replay-cursor__orb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(180, 50, 50, 0.7))
    drop-shadow(0 0 20px rgba(180, 50, 50, 0.3));
  animation: orbPulse 0.8s ease-in-out infinite;
}

@keyframes orbPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* ===== TRANSITIONS ===== */
.outcome-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.outcome-leave-active {
  transition: all 0.2s ease-out;
}

.outcome-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.outcome-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ===== RESPONSIVE ===== */
/* Most responsive styles now handled by Tailwind classes in template */
@media (max-width: 640px) {
  .replay-content {
    padding: 1rem;
    gap: 1rem;
  }
}
</style>
