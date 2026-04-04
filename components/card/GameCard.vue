<script setup lang="ts">
import type { Card, CardTier, CardVariation } from "~/types/card";
import { TIER_CONFIG, isCardSynthesised, getCardVariation } from "~/types/card";
import { useFoilEffect } from "~/composables/useFoilEffect";
import gsap from "gsap";

const { t } = useI18n();

// Get the selected foil effect
const { selectedFoilEffect } = useFoilEffect();

// Variation option interface for the radio selector
interface VariationOption {
  value: string;
  label: string;
  color?: string;
}

const props = defineProps<{
  card: Card;
  showFlavour?: boolean;
  owned?: boolean;
  previewOnly?: boolean; // When true, disables click to open detail view
  // Variation selector props (optional - for stack multi-variation support)
  variationOptions?: VariationOption[];
  selectedVariation?: string;
  // Right panel offset for centering in admin view (optional)
  centerOffset?: number;
}>();

const emit = defineEmits<{
  click: [card: Card];
  close: [card: Card];
  "update:selectedVariation": [value: string];
}>();

// Has multiple variations?
const hasVariationSelector = computed(
  () => props.variationOptions && props.variationOptions.length > 1
);

// Handle variation change
const handleVariationChange = (value: string) => {
  emit("update:selectedVariation", value);
};

const cardRef = ref<HTMLElement | null>(null);
const floatingCardRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const previewViewRef = ref<HTMLElement | null>(null);
const detailViewRef = ref<HTMLElement | null>(null);

const isOwned = computed(() => props.owned !== false);
const isLimited = computed(() => props.card.isLimited === true);
const cardBackLogoUrl = "/images/orb.png";

// State for limited card revelation
const isLimitedRevealed = ref(false);

type AnimationState = "idle" | "animating" | "expanded";
const animationState = ref<AnimationState>("idle");
const originalRect = ref<DOMRect | null>(null);
let currentTimeline: gsap.core.Timeline | null = null;

// Zoom functionality
const zoomLevel = ref(1);
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

const openCard = async () => {
  if (!isOwned.value || !cardRef.value) return;

  if (currentTimeline) {
    currentTimeline.kill();
  }

  const rect = cardRef.value.getBoundingClientRect();
  originalRect.value = rect;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const offset = props.centerOffset || 0;
  const availableWidth = viewportWidth - offset;
  const targetWidth = Math.min(360, availableWidth - 40);
  const targetHeight = targetWidth * 1.4;
  const centerX = (availableWidth - targetWidth) / 2;
  const centerY = (viewportHeight - targetHeight) / 2;

  animationState.value = "animating";

  await nextTick();

  const card = floatingCardRef.value;
  const overlay = overlayRef.value;
  const previewView = previewViewRef.value;
  const detailView = detailViewRef.value;

  if (!card || !overlay || !previewView || !detailView) return;

  const staggerElements = detailView.querySelectorAll(".detail__stagger");

  gsap.set(card, {
    position: "fixed",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: 1000,
  });

  gsap.set(overlay, { opacity: 0, backdropFilter: "blur(0px)" });
  gsap.set(previewView, { opacity: 1 });
  gsap.set(detailView, { opacity: 1 });
  gsap.set(staggerElements, { opacity: 0, y: 8 });

  currentTimeline = gsap.timeline({
    onComplete: () => {
      animationState.value = "expanded";
    },
  });

  currentTimeline
    .to(
      overlay,
      {
        opacity: 1,
        backdropFilter: "blur(12px)",
        duration: 0.4,
        ease: "power2.out",
      },
      0
    )
    .to(
      card,
      {
        top: centerY,
        left: centerX,
        width: targetWidth,
        height: targetHeight,
        duration: 0.45,
        ease: "power3.out",
      },
      0
    )
    .to(
      previewView,
      {
        opacity: 0,
        duration: 0.25,
        ease: "power2.inOut",
      },
      0.1
    )
    .to(
      staggerElements,
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.04,
      },
      0.15
    );
};

const closeCard = async () => {
  if (animationState.value !== "expanded") return;

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

  const staggerElements = detailView.querySelectorAll(".detail__stagger");

  animationState.value = "animating";

  // Calculate dezoom duration based on current zoom level
  const currentZoom = zoomLevel.value;
  const needsDezoom = currentZoom > 1;
  const dezoomDuration = needsDezoom ? 0.25 : 0;

  zoomLevel.value = 1;

  currentTimeline = gsap.timeline({
    onComplete: () => {
      resetToIdle();
    },
  });

  // If zoomed, first animate back to scale 1 with rotation reset
  if (needsDezoom) {
    currentTimeline.to(
      card,
      {
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        duration: dezoomDuration,
        ease: "power2.out",
      },
      0
    );
  }

  // For limited cards, flip back synchronized with dezoom
  if (isLimited.value && !isOwned.value) {
    // Force border to disappear immediately - use both inline style and class
    card.classList.add("game-card--border-hidden");
    card.style.setProperty("border", "none", "important");
    card.style.setProperty("border-color", "transparent", "important");
    card.style.setProperty("border-width", "0", "important");
    
    currentTimeline
      // Overlay disappears immediately, before flip/dezoom starts
      .to(
        overlay,
        {
          opacity: 0,
          backdropFilter: "blur(0px)",
          duration: 0.15,
          ease: "power2.in",
        },
        0
      )
      .to(
        staggerElements,
        {
          opacity: 0,
          duration: 0.15,
          ease: "power2.in",
        },
        dezoomDuration
      )
      // Synchronize flip back and dezoom: both happen simultaneously
      // Keep border invisible during entire animation
      .set(card, {
        border: "none",
        borderColor: "transparent",
        borderWidth: 0,
      }, dezoomDuration)
      .to(
        card,
        {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          rotationY: 0, // Flip back synchronized with dezoom
          duration: 0.4,
          ease: "power3.out",
        },
        dezoomDuration
      )
      // Switch faces during flip back (synchronized with dezoom)
      .to(
        detailView,
        {
          opacity: 0,
          rotationY: 180,
          duration: 0.4,
          ease: "power3.out",
        },
        dezoomDuration
      )
      .to(
        previewView,
        {
          opacity: 1,
          rotationY: 0,
          display: "flex",
          duration: 0.4,
          ease: "power3.out",
        },
        dezoomDuration
      )
      .set(previewView, { display: "flex" }, dezoomDuration + 0.4)
      .set(detailView, { display: "none" }, dezoomDuration + 0.4);
  } else {
    // Normal close for owned cards
    currentTimeline
      .to(
        staggerElements,
        {
          opacity: 0,
          duration: 0.15,
          ease: "power2.in",
        },
        dezoomDuration
      )
      .to(
        previewView,
        {
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
        },
        dezoomDuration + 0.05
      )
      .to(
        card,
        {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          duration: 0.4,
          ease: "power3.out",
        },
        dezoomDuration + 0.05
      )
      .to(
        overlay,
        {
          opacity: 0,
          backdropFilter: "blur(0px)",
          duration: 0.35,
          ease: "power2.in",
        },
        dezoomDuration + 0.1
      );
  }
};

const resetToIdle = () => {
  animationState.value = "idle";
  originalRect.value = null;
  currentTimeline = null;
  zoomLevel.value = 1;
  isLimitedRevealed.value = false;

  if (floatingCardRef.value) {
    // Remove border-hidden class and clear all inline styles
    floatingCardRef.value.classList.remove("game-card--border-hidden");
    gsap.set(floatingCardRef.value, { 
      clearProps: "all",
      border: "",
      borderColor: "",
      borderWidth: "",
    });
  }
  if (previewViewRef.value) {
    gsap.set(previewViewRef.value, { clearProps: "all" });
  }
  if (detailViewRef.value) {
    gsap.set(detailViewRef.value, { clearProps: "all" });
  }
};

// Handle mouse wheel zoom
const onFloatingWheel = (e: WheelEvent) => {
  if (animationState.value !== "expanded") return;

  e.preventDefault();

  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const newZoom = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, zoomLevel.value + delta)
  );

  if (newZoom !== zoomLevel.value) {
    zoomLevel.value = newZoom;

    if (floatingCardRef.value) {
      gsap.to(floatingCardRef.value, {
        scale: newZoom,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }
};

const openLimitedCard = async () => {
  if (!isLimited.value || !cardRef.value) return;

  if (currentTimeline) {
    currentTimeline.kill();
  }

  const rect = cardRef.value.getBoundingClientRect();
  originalRect.value = rect;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const offset = props.centerOffset || 0;
  const availableWidth = viewportWidth - offset;
  const targetWidth = Math.min(360, availableWidth - 40);
  const targetHeight = targetWidth * 1.4;
  const centerX = (availableWidth - targetWidth) / 2;
  const centerY = (viewportHeight - targetHeight) / 2;

  animationState.value = "animating";
  isLimitedRevealed.value = true;

  await nextTick();

  const card = floatingCardRef.value;
  const overlay = overlayRef.value;
  const previewView = previewViewRef.value;
  const detailView = detailViewRef.value;

  if (!card || !overlay || !previewView || !detailView) return;

  gsap.set(card, {
    position: "fixed",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: 1000,
    rotationY: 0, // Start from back (0 degrees)
  });

  gsap.set(overlay, { opacity: 0, backdropFilter: "blur(0px)" });
  gsap.set(previewView, { opacity: 1, rotationY: 0, display: "flex" }); // Back face visible
  gsap.set(detailView, { opacity: 0, rotationY: 180, display: "flex" }); // Front face hidden initially

  currentTimeline = gsap.timeline({
    onComplete: () => {
      animationState.value = "expanded";
    },
  });

  // Animate overlay and card position/scale
  currentTimeline
    .to(
      overlay,
      {
        opacity: 1,
        backdropFilter: "blur(12px)",
        duration: 0.45,
        ease: "power2.out",
      },
      0
    )
    // Synchronize zoom and flip: both happen simultaneously
    .to(
      card,
      {
        top: centerY,
        left: centerX,
        width: targetWidth,
        height: targetHeight,
        rotationY: 180, // Flip synchronized with zoom
        duration: 0.45,
        ease: "power3.out",
      },
      0
    )
    // Switch faces during flip (synchronized with zoom/flip)
    .to(
      previewView,
      {
        opacity: 0,
        rotationY: 180,
        duration: 0.45,
        ease: "power3.out",
      },
      0
    )
    .to(
      detailView,
      {
        opacity: 1,
        rotationY: 0,
        duration: 0.45,
        ease: "power3.out",
      },
      0
    )
    // Ensure detail view is visible after flip
    .set(detailView, { display: "flex" }, 0.45)
    .set(previewView, { display: "none" }, 0.45);
};

const handleClick = () => {
  // Handle limited card revelation with animation
  if (isLimited.value && !isOwned.value) {
    if (animationState.value === "idle") {
      openLimitedCard();
    } else if (animationState.value === "expanded") {
      closeCard();
    }
    emit("click", props.card);
    return;
  }

  if (!isOwned.value) return;

  // In preview-only mode, don't open detail view (parent handles it)
  if (props.previewOnly) {
    emit("click", props.card);
    return;
  }

  if (animationState.value === "idle") {
    openCard();
  }
  emit("click", props.card);
};

const handleClose = () => {
  if (animationState.value === "expanded") {
    closeCard();
    emit("close", props.card);
  }
};

onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && animationState.value === "expanded") {
      handleClose();
    }
  };
  window.addEventListener("keydown", handleEscape);
  onUnmounted(() => {
    window.removeEventListener("keydown", handleEscape);
  });
});

watch(animationState, (state) => {
  if (import.meta.client) {
    const isOpen = state !== "idle";
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
});

// Check if card is foil - supports both foil: true and variation: 'foil'
const isFoil = computed(() => {
  // New format: foil: true
  if (props.card.foil === true) return true;
  // Legacy format: variation: 'foil'
  if (props.card.variation === "foil") return true;
  return false;
});

// Check if card is synthesised - only from Vaal orb on foil
const isSynthesised = computed(() => {
  return isCardSynthesised(props.card);
});

// Get card variation for backwards compatibility
const cardVariation = computed<CardVariation>(() =>
  getCardVariation(props.card)
);

// Hover state for cards
const isHovering = ref(false);

// Pointer tracking for foil effects
const pointerX = ref(50);
const pointerY = ref(50);
const pointerFromCenter = ref(0.5);
const pointerFromLeft = ref(0.5);
const pointerFromTop = ref(0.5);

// Preview tilt intensity (slightly less than detail view which uses 8)
const PREVIEW_TILT_INTENSITY = 6;

const onMouseEnter = () => {
  isHovering.value = true;
};

const onMouseLeave = () => {
  isHovering.value = false;
  // Reset to center on leave
  pointerX.value = 50;
  pointerY.value = 50;
  pointerFromCenter.value = 0.5;
  pointerFromLeft.value = 0.5;
  pointerFromTop.value = 0.5;

  // Reset tilt with GSAP
  if (cardRef.value) {
    gsap.to(cardRef.value, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
    });
  }
};

// Track mouse position for foil effect AND apply tilt
const onMouseMove = (e: MouseEvent) => {
  if (!cardRef.value) return;

  const rect = cardRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Percentage values (0-100)
  pointerX.value = (x / rect.width) * 100;
  pointerY.value = (y / rect.height) * 100;

  // Normalized values (0-1)
  pointerFromLeft.value = x / rect.width;
  pointerFromTop.value = y / rect.height;

  // Distance from center (0-1, where 0 is center, 1 is corner)
  const distFromCenter =
    Math.sqrt(
      Math.pow((x - centerX) / centerX, 2) +
        Math.pow((y - centerY) / centerY, 2)
    ) / Math.sqrt(2); // Normalize to 0-1
  pointerFromCenter.value = Math.min(1, distFromCenter);

  // Apply GSAP tilt (same logic as detail view, slightly less intense)
  const rotateY = ((x - centerX) / centerX) * PREVIEW_TILT_INTENSITY;
  const rotateX = ((centerY - y) / centerY) * PREVIEW_TILT_INTENSITY;

  gsap.to(cardRef.value, {
    rotateX,
    rotateY,
    scale: 1.02,
    duration: 0.25,
    ease: "power2.out",
    overwrite: "auto",
  });
};

// CSS variables for foil effect
const foilStyles = computed(() => {
  if (!isFoil.value) return {};
  return {
    "--pointer-x": pointerX.value,
    "--pointer-y": pointerY.value,
    "--pointer-from-center": pointerFromCenter.value,
    "--pointer-from-left": pointerFromLeft.value,
    "--pointer-from-top": pointerFromTop.value,
  };
});

// CSS variables for synthesised glitch effect - random timing per card
const glitchStyles = computed(() => {
  if (!isSynthesised.value) return {};

  // Generate pseudo-random values based on card id for consistent but unique timing
  const hash = props.card.id.split('').reduce((acc, char, i) => {
    return acc + char.charCodeAt(0) * (i + 1);
  }, 0);

  // Random delay between 0 and 2 seconds
  const delay = (hash % 200) / 100;
  // Random duration between 2 and 3.5 seconds
  const duration = 2 + (hash % 150) / 100;
  // Random secondary offset for more variation
  const offset = ((hash * 7) % 100) / 100;

  return {
    "--glitch-delay": `${delay}s`,
    "--glitch-duration": `${duration}s`,
    "--glitch-offset": offset,
  };
});

const isFloatingHovering = ref(false);

// Floating card pointer tracking for foil effects
const floatingPointerX = ref(50);
const floatingPointerY = ref(50);
const floatingPointerFromCenter = ref(0.5);
const floatingPointerFromLeft = ref(0.5);
const floatingPointerFromTop = ref(0.5);

const onFloatingMouseMove = (e: MouseEvent) => {
  if (animationState.value !== "expanded" || !floatingCardRef.value) return;

  const card = floatingCardRef.value;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Update pointer tracking for foil effect
  floatingPointerX.value = (x / rect.width) * 100;
  floatingPointerY.value = (y / rect.height) * 100;
  floatingPointerFromLeft.value = x / rect.width;
  floatingPointerFromTop.value = y / rect.height;

  const distFromCenter =
    Math.sqrt(
      Math.pow((x - centerX) / centerX, 2) +
        Math.pow((y - centerY) / centerY, 2)
    ) / Math.sqrt(2);
  floatingPointerFromCenter.value = Math.min(1, distFromCenter);

  // Reduce tilt intensity when zoomed for better UX
  const tiltIntensity = zoomLevel.value > 1 ? 5 : 8;
  const tiltRotateY = ((x - centerX) / centerX) * tiltIntensity;
  const rotateX = ((centerY - y) / centerY) * tiltIntensity;

  // For limited cards, preserve the 180° flip rotation and only apply tilt on X axis
  // For owned cards, apply normal tilt on both axes
  const baseRotationY = isLimited.value && !isOwned.value ? 180 : 0;
  const rotateY = baseRotationY + tiltRotateY;

  // Apply slight scale boost on top of current zoom
  const hoverScale = zoomLevel.value * 1.02;

  gsap.to(card, {
    rotateX,
    rotateY,
    scale: hoverScale,
    duration: 0.3,
    ease: "power2.out",
    overwrite: "auto",
  });
};

// CSS variables for floating card foil effect
const floatingFoilStyles = computed(() => {
  if (!isFoil.value) return {};
  return {
    "--pointer-x": floatingPointerX.value,
    "--pointer-y": floatingPointerY.value,
    "--pointer-from-center": floatingPointerFromCenter.value,
    "--pointer-from-left": floatingPointerFromLeft.value,
    "--pointer-from-top": floatingPointerFromTop.value,
  };
});

const onFloatingMouseEnter = () => {
  isFloatingHovering.value = true;
};

const onFloatingMouseLeave = () => {
  isFloatingHovering.value = false;
  if (floatingCardRef.value && animationState.value === "expanded") {
    // For limited cards, preserve the 180° flip rotation when resetting tilt
    const baseRotationY = isLimited.value && !isOwned.value ? 180 : 0;
    gsap.to(floatingCardRef.value, {
      rotateX: 0,
      rotateY: baseRotationY, // Preserve flip rotation for limited cards
      scale: zoomLevel.value, // Keep current zoom level
      duration: 0.5,
      ease: "power2.out",
    });
  }
};

const tierConfig = computed(() => TIER_CONFIG[props.card.tier as CardTier]);
const tierClass = computed(() => `game-card--${props.card.tier.toLowerCase()}`);

const imageStatus = ref<"loading" | "loaded" | "error">("loading");
const hasImageUrl = computed(() => !!props.card.gameData?.img);

// Check if image is a GIF (for soft edge effect)
const isGif = computed(() => {
  const imgUrl = props.card.gameData?.img?.toLowerCase() || '';
  return imgUrl.endsWith('.gif');
});

onMounted(() => {
  if (!hasImageUrl.value) {
    imageStatus.value = "error";
    return;
  }
  const img = new Image();
  img.onload = () => {
    imageStatus.value = "loaded";
  };
  img.onerror = () => {
    imageStatus.value = "error";
  };
  img.src = props.card.gameData.img;
});

const showImage = computed(() => imageStatus.value === "loaded");
const showPlaceholder = computed(
  () => imageStatus.value === "error" || !hasImageUrl.value
);

const isFloating = computed(() => animationState.value !== "idle");

const tierStyles = computed(() => ({
  "--tier-color": tierConfig.value?.color ?? "#2a2a2d",
  "--tier-glow": tierConfig.value?.glowColor ?? "#3a3a3d",
}));

// Card classes including foil/synthesised state
const cardClasses = computed(() => [
  tierClass.value,
  {
    "game-card--hovering": isHovering.value,
    "game-card--foil": isFoil.value,
    "game-card--synthesised": isSynthesised.value,
  },
]);

const showOverlay = computed(() => animationState.value !== "idle");

// Expose methods for parent control
defineExpose({
  close: handleClose,
  isExpanded: computed(() => animationState.value === "expanded"),
});
</script>

<template>
  <div class="game-card-container">
    <Teleport to="body">
      <div v-if="showOverlay" class="floating-card-wrapper">
        <div ref="overlayRef" class="card-overlay" @click="handleClose" />

        <!-- Variation selector header (when multiple variations) -->
        <div
          v-if="
            hasVariationSelector &&
            selectedVariation &&
            animationState !== 'idle'
          "
          class="floating-variation-selector"
          @click.stop
        >
          <RunicRadio
            :options="variationOptions"
            :model-value="selectedVariation as string"
            size="sm"
            @update:model-value="(val: string | boolean) => handleVariationChange(String(val))"
          />
        </div>

        <article
          ref="floatingCardRef"
          class="game-card game-card--floating"
          :class="[
            tierClass,
            {
              'game-card--hovering': isFloatingHovering,
              'game-card--zoomed': zoomLevel > 1,
              'game-card--foil': isFoil,
              'game-card--synthesised': isSynthesised,
            },
          ]"
          :style="{ ...tierStyles, ...floatingFoilStyles, ...glitchStyles }"
          :data-foil-effect="isFoil ? selectedFoilEffect : undefined"
          @mousemove="onFloatingMouseMove"
          @mouseenter="onFloatingMouseEnter"
          @mouseleave="onFloatingMouseLeave"
          @wheel.prevent="onFloatingWheel"
        >
          <!-- Foil overlay for floating card -->
          <div v-if="isFoil" class="game-card__foil-overlay"></div>

          <!-- Synthesised glitch overlay for floating card -->
          <div v-if="isSynthesised" class="game-card__synthesised-overlay"></div>

          <div class="game-card__tilt-wrapper">
            <button
              v-if="animationState === 'expanded'"
              class="game-card__close"
              @click.stop="handleClose"
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
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <!-- Preview view for owned cards -->
            <div v-if="isOwned" ref="previewViewRef" class="card-view card-view--preview">
              <div class="game-card__frame">
                <div class="game-card__bg"></div>
              </div>

              <div class="game-card__image-wrapper">
                <img
                  v-show="showImage"
                  :src="card.gameData.img"
                  :alt="card.name"
                  class="game-card__image"
                  :class="{ 'game-card__image--gif': isGif }"
                />
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
              <div class="game-card__info">
                <h3 class="game-card__name">
                  <span class="game-card__name-text">{{ card.name }}</span>
                </h3>
                <p class="game-card__class">{{ card.itemClass }}</p>
              </div>
            </div>

            <!-- Preview view for limited cards (back face) -->
            <div v-else-if="isLimited" ref="previewViewRef" class="card-view card-view--preview card-view--back">
              <div class="game-card__frame game-card__frame--back">
                <div class="game-card__bg game-card__bg--back"></div>
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

            <!-- Detail view for owned cards -->
            <div v-if="isOwned" ref="detailViewRef" class="card-view card-view--detail">
              <div
                class="detail__title-bar detail__stagger"
                style="--stagger: 0"
              >
                <span class="detail__name">{{ card.name }}</span>
                <span class="detail__tier-badge">{{ card.tier }}</span>
              </div>

              <div
                class="detail__artwork detail__stagger"
                :class="{ 'detail__artwork--foil': isFoil, 'detail__artwork--synthesised': isSynthesised }"
                style="--stagger: 1"
              >
                <!-- Cosmos holo layers for foil cards -->
                <template v-if="isFoil">
                  <div class="cosmos-layer-2"></div>
                  <div class="cosmos-layer-3"></div>
                  <div class="cosmos-glare"></div>
                </template>

                <img
                  v-if="showImage"
                  :src="card.gameData.img"
                  :alt="card.name"
                  class="detail__image"
                  :class="{ 'detail__image--gif': isGif }"
                />
                <div v-else class="detail__image-placeholder">
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
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                </div>
              </div>

              <div
                class="detail__type-line detail__stagger"
                style="--stagger: 2"
              >
                <span class="detail__type">{{ card.itemClass }}</span>
                <span class="detail__divider">◆</span>
                <span class="detail__rarity">{{ card.rarity }}</span>
              </div>

              <div
                class="detail__separator detail__stagger"
                style="--stagger: 3"
              >
                <span class="detail__separator-line"></span>
                <span class="detail__separator-rune">✧</span>
                <span class="detail__separator-line"></span>
              </div>

              <div class="detail__flavour detail__stagger" style="--stagger: 4">
                <p v-if="card.flavourText">"{{ card.flavourText }}"</p>
                <p v-else class="detail__no-flavour">
                  Aucune description disponible
                </p>
              </div>

              <div
                class="detail__separator detail__stagger"
                style="--stagger: 5"
              >
                <span class="detail__separator-line"></span>
                <span class="detail__separator-rune">◇</span>
                <span class="detail__separator-line"></span>
              </div>

              <div
                class="detail__bottom-info detail__stagger"
                style="--stagger: 6"
              >
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

            <!-- Limited card detail view (no image, reorganized structure) -->
            <div v-else-if="isLimited" ref="detailViewRef" class="card-view card-view--detail card-view--limited">
              <!-- Wrapper to compensate for rotationY: 180 inversion -->
              <div class="card-view__content-wrapper">
                <!-- Type at the top as title -->
                <div class="detail__limited-title detail__stagger" style="--stagger: 0">
                  <span class="detail__limited-type">{{ card.itemClass }}</span>
                </div>

                <!-- Flavour text centered in the middle -->
                <div class="detail__limited-flavour detail__stagger" style="--stagger: 1">
                  <p v-if="card.flavourText" class="detail__limited-flavour-text">"{{ card.flavourText }}"</p>
                  <p v-else class="detail__limited-flavour-empty">—</p>
                </div>

                <!-- Tier and rarity at the bottom, minimal -->
                <div class="detail__limited-footer detail__stagger" style="--stagger: 2">
                  <span class="detail__limited-tier">{{ card.tier }}</span>
                  <span class="detail__limited-divider">◆</span>
                  <span class="detail__limited-rarity">{{ card.rarity }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </Teleport>

    <div v-if="isFloating && isOwned" class="game-card-placeholder" />

    <!-- Back card (not owned or limited not revealed) - Custom tilt like detail view -->
    <div v-if="!isOwned && (!isLimited || !isLimitedRevealed)" class="card-tilt-container">
      <article
        ref="cardRef"
        role="button"
        tabindex="0"
        :aria-label="isLimited ? t('common.clickToReveal') : t('common.unknownCard')"
        class="game-card game-card--back game-card--preview"
        :class="{ 'game-card--limited': isLimited }"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @mousemove="onMouseMove"
        @click="handleClick"
        @keydown.enter="handleClick"
        @keydown.space="handleClick"
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
      </article>
    </div>


    <!-- Front card (owned) - Custom tilt like detail view -->
    <div v-if="isOwned && !isFloating" class="card-tilt-container">
      <article
        ref="cardRef"
        role="button"
        tabindex="0"
        :aria-label="`Carte ${card.name}${isFoil ? ' (Foil)' : ''}`"
        class="game-card game-card--preview"
        :class="cardClasses"
        :style="{ ...tierStyles, ...foilStyles, ...glitchStyles }"
        :data-foil-effect="isFoil ? selectedFoilEffect : undefined"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @mousemove="onMouseMove"
        @click="handleClick"
        @keydown.enter="handleClick"
        @keydown.space="handleClick"
      >
        <div class="game-card__frame">
          <div class="game-card__bg"></div>
        </div>

        <!-- Runic corners -->
        <div class="game-card__corner game-card__corner--tl"></div>
        <div class="game-card__corner game-card__corner--tr"></div>
        <div class="game-card__corner game-card__corner--bl"></div>
        <div class="game-card__corner game-card__corner--br"></div>

        <!-- Foil overlay effect -->
        <div v-if="isFoil" class="game-card__foil-overlay"></div>

        <!-- Synthesised glitch overlay effect -->
        <div v-if="isSynthesised" class="game-card__synthesised-overlay"></div>

        <div class="game-card__image-wrapper">
          <div
            v-if="imageStatus === 'loading' && hasImageUrl"
            class="game-card__image-loading"
          >
            <div class="game-card__spinner"></div>
          </div>
          <img
            v-show="showImage"
            :src="card.gameData.img"
            :alt="card.name"
            class="game-card__image"
            :class="{ 'game-card__image--gif': isGif }"
          />
          <div v-if="showPlaceholder" class="game-card__image-placeholder">
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
        <div class="game-card__info">
          <h3 class="game-card__name">
            <span class="game-card__name-text">{{ card.name }}</span>
          </h3>
          <p class="game-card__class">{{ card.itemClass }}</p>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/*
 * GameCard Component Styles
 * 
 * Base card styling (frame, corners, tier colors) is in assets/css/cards.css (globally loaded).
 * This scoped CSS contains component-specific styles for:
 * - Detail view / floating card presentation
 * - 3D tilt effects
 * - Preview mode
 * - Variation selector
 */
.game-card-container {
  position: relative;
}

/* Container for custom 3D tilt - same behavior as floating card */
.card-tilt-container {
  display: block;
  width: 100%;
  perspective: 1000px;
}

/* Preview cards with custom tilt */
.game-card--preview {
  transform-style: preserve-3d;
  transform-origin: center center;
  will-change: transform;
  transition: box-shadow 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
}

.game-card--preview:hover {
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 5px 15px rgba(0, 0, 0, 0.4);
}

.game-card-placeholder {
  width: 100%;
  aspect-ratio: 2.5/3.5;
  background: transparent;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
}

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

.floating-card-wrapper {
  perspective: 1000px;
}

.game-card {
  position: relative;
  width: 100%;
  aspect-ratio: 2.5/3.5;
  cursor: pointer;
  border-radius: var(--card-border-radius, 8px);
  overflow: hidden;
  background: linear-gradient(160deg, #12110f 0%, #0a0908 50%, #0d0c0a 100%);
  transform-style: preserve-3d;
  will-change: transform;
}

.game-card--floating {
  cursor: default;
  z-index: 1001; /* Above overlay */
  aspect-ratio: unset;
}

.game-card__tilt-wrapper {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

.card-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  will-change: opacity, transform;
}

.card-view--detail {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 6px;
}

.detail__stagger {
  will-change: opacity, transform;
}

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

.game-card__frame {
  position: absolute;
  inset: 0;
}

.game-card__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(16, 15, 14, 0.98) 0%,
    rgba(12, 11, 10, 0.99) 30%,
    rgba(14, 13, 12, 0.98) 70%,
    rgba(10, 9, 8, 1) 100%
  );
  border-radius: inherit;
}

/* Subtle texture overlay */
.game-card__bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
      ellipse at 30% 0%,
      rgba(60, 55, 50, 0.04) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 100%,
      rgba(40, 35, 30, 0.03) 0%,
      transparent 40%
    );
  pointer-events: none;
  border-radius: inherit;
}

.game-card__bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.025;
  mix-blend-mode: overlay;
  border-radius: inherit;
}

/* ==========================================
   DETAIL HEADER - Runic engraved metal panel
   ========================================== */
.detail__title-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;

  /* Deep carved stone/metal look */
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );

  border-radius: 6px;

  /* Multi-layered carved effect */
  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(0, 0, 0, 0.7), inset 0 -1px 3px rgba(50, 45, 40, 0.08),
    0 1px 0 rgba(50, 45, 40, 0.2);

  /* Stone border */
  border: 1px solid rgba(40, 38, 35, 0.6);
  border-top-color: rgba(30, 28, 25, 0.7);
  border-bottom-color: rgba(60, 55, 50, 0.25);
}

/* Corner decorations for header */
.detail__title-bar::before,
.detail__title-bar::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.detail__title-bar::before {
  top: 6px;
  left: 6px;
  background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(80, 70, 55, 0.35) 50%,
      transparent 100%
    ),
    linear-gradient(
      180deg,
      transparent 0%,
      rgba(80, 70, 55, 0.35) 50%,
      transparent 100%
    );
  background-size: 100% 1px, 1px 100%;
  background-position: 0 0, 0 0;
  background-repeat: no-repeat;
}

.detail__title-bar::after {
  bottom: 6px;
  right: 6px;
  background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(80, 70, 55, 0.35) 50%,
      transparent 100%
    ),
    linear-gradient(
      180deg,
      transparent 0%,
      rgba(80, 70, 55, 0.35) 50%,
      transparent 100%
    );
  background-size: 100% 1px, 1px 100%;
  background-position: 0 100%, 100% 0;
  background-repeat: no-repeat;
}

.detail__name {
  font-family: "Cinzel", serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--tier-glow, #e8e8e8);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
  letter-spacing: 0.02em;
}

.detail__tier-badge {
  font-family: "Cinzel", serif;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 3px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(10, 10, 12, 0.7) 100%
  );
  color: var(--tier-glow, #94a3b8);
  border: 1px solid rgba(60, 55, 50, 0.3);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ==========================================
   FLOATING VARIATION SELECTOR - Above the card in overlay
   ========================================== */
.floating-variation-selector {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1002;
  padding: 8px 16px;
  background: linear-gradient(
    180deg,
    rgba(18, 18, 22, 0.95) 0%,
    rgba(12, 12, 15, 0.98) 100%
  );
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(80, 75, 70, 0.1);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;

  /* Fade down animation synced with card */
  animation: fadeDown 0.4s ease-out 0.3s both;
}

@keyframes fadeDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.floating-variation-selector :deep(.runic-radio) {
  min-width: 200px;
}

.floating-variation-selector :deep(.runic-radio__label),
.floating-variation-selector :deep(.runic-radio__slider-label) {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .floating-variation-selector {
    top: 16px;
    left: 16px;
    right: 16px;
    transform: none;
    padding: 6px 12px;
  }

  .floating-variation-selector :deep(.runic-radio) {
    width: 100%;
    min-width: unset;
  }
}

/* ==========================================
   DETAIL ARTWORK - Deep carved inset panel
   ========================================== */
.detail__artwork {
  position: relative;
  flex: 1;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;

  /* Deep recessed background */
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(12, 12, 14, 0.95) 20%,
    rgba(10, 10, 12, 0.97) 80%,
    rgba(6, 6, 8, 0.99) 100%
  );

  border-radius: 5px;

  /* Deep carved inset effect */
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 -2px 6px rgba(50, 45, 40, 0.06),
    0 1px 0 rgba(50, 45, 40, 0.15);

  /* Subtle metal border */
  border: 1px solid rgba(35, 32, 28, 0.7);
  border-top-color: rgba(25, 22, 18, 0.8);
  border-bottom-color: rgba(55, 50, 45, 0.2);
}

/* Subtle texture overlay */
.detail__artwork::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
      ellipse at 50% 30%,
      rgba(60, 55, 50, 0.04) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 50% 70%,
      rgba(40, 35, 30, 0.03) 0%,
      transparent 50%
    );
  pointer-events: none;
  border-radius: inherit;
}

/* Inner frame lines */
.detail__artwork::after {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(50, 45, 40, 0.12);
  border-radius: 3px;
  pointer-events: none;
}

.detail__image {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}


/* ==========================================
   GIF IRREGULAR EDGE EFFECT (Detail view)
   Cloudy/organic edges using overlapping gradients
   ========================================== */
.detail__image--gif {
  /* Multiple offset radial gradients - aggressive irregular edges */
  mask-image:
    /* Core ellipses */
    radial-gradient(ellipse 65% 80% at 35% 35%, black 25%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 65% 70%, black 20%, transparent 50%),
    radial-gradient(ellipse 55% 70% at 30% 65%, black 25%, transparent 52%),
    radial-gradient(ellipse 60% 85% at 50% 50%, black 30%, transparent 58%),
    /* Extra bumps sides & bottom */
    radial-gradient(ellipse 40% 50% at 15% 50%, black 15%, transparent 45%),
    radial-gradient(ellipse 45% 40% at 85% 60%, black 15%, transparent 42%),
    radial-gradient(ellipse 45% 40% at 45% 90%, black 15%, transparent 45%),
    /* TOP edge - more irregular */
    radial-gradient(ellipse 35% 30% at 30% 10%, black 10%, transparent 40%),
    radial-gradient(ellipse 40% 35% at 55% 8%, black 12%, transparent 42%),
    radial-gradient(ellipse 30% 28% at 45% 5%, black 8%, transparent 38%),
    /* TOP-RIGHT corner - break the angle */
    radial-gradient(ellipse 45% 50% at 80% 20%, black 12%, transparent 45%),
    radial-gradient(ellipse 35% 40% at 90% 15%, black 10%, transparent 40%),
    radial-gradient(ellipse 40% 35% at 75% 10%, black 10%, transparent 38%),
    radial-gradient(ellipse 30% 45% at 85% 30%, black 12%, transparent 42%);
  -webkit-mask-image:
    radial-gradient(ellipse 65% 80% at 35% 35%, black 25%, transparent 55%),
    radial-gradient(ellipse 70% 60% at 65% 70%, black 20%, transparent 50%),
    radial-gradient(ellipse 55% 70% at 30% 65%, black 25%, transparent 52%),
    radial-gradient(ellipse 60% 85% at 50% 50%, black 30%, transparent 58%),
    radial-gradient(ellipse 40% 50% at 15% 50%, black 15%, transparent 45%),
    radial-gradient(ellipse 45% 40% at 85% 60%, black 15%, transparent 42%),
    radial-gradient(ellipse 45% 40% at 45% 90%, black 15%, transparent 45%),
    radial-gradient(ellipse 35% 30% at 30% 10%, black 10%, transparent 40%),
    radial-gradient(ellipse 40% 35% at 55% 8%, black 12%, transparent 42%),
    radial-gradient(ellipse 30% 28% at 45% 5%, black 8%, transparent 38%),
    radial-gradient(ellipse 45% 50% at 80% 20%, black 12%, transparent 45%),
    radial-gradient(ellipse 35% 40% at 90% 15%, black 10%, transparent 40%),
    radial-gradient(ellipse 40% 35% at 75% 10%, black 10%, transparent 38%),
    radial-gradient(ellipse 30% 45% at 85% 30%, black 12%, transparent 42%);
  mask-composite: add;
  -webkit-mask-composite: source-over;
}

.detail__image-placeholder {
  position: relative;
  z-index: 1;
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
  opacity: 0.3;
}

/* ==========================================
   DETAIL TYPE LINE - Item class & rarity
   ========================================== */
.detail__type-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

.detail__type {
  font-family: "Cinzel", serif;
  font-size: 13px;
  font-weight: 600;
  color: #8a8a8a;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.detail__divider {
  font-size: 8px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.6;
}

.detail__rarity {
  font-family: "Crimson Text", serif;
  font-size: 15px;
  color: var(--tier-glow, #7a7a7a);
  font-style: italic;
}

/* ==========================================
   DETAIL SEPARATORS - Engraved divider lines
   ========================================== */
.detail__separator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 4px 0;
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
  font-size: 10px;
  color: var(--tier-color, #4a4a4a);
  opacity: 0.5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* ==========================================
   DETAIL FLAVOUR TEXT - Quote section
   ========================================== */
.detail__flavour {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px 12px;
  min-height: 40px;
}

.detail__flavour p {
  font-family: "Crimson Text", serif;
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: #888888;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.detail__no-flavour {
  color: #4a4a4a;
  font-size: 14px;
}

/* ==========================================
   DETAIL FOOTER - Runic engraved metal panel
   ========================================== */
.detail__bottom-info {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;

  /* Carved panel look */
  background: linear-gradient(
    180deg,
    rgba(14, 14, 16, 0.92) 0%,
    rgba(18, 18, 20, 0.88) 50%,
    rgba(12, 12, 14, 0.95) 100%
  );

  border-radius: 5px;

  /* Subtle carved effect */
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(0, 0, 0, 0.5), inset 0 -1px 2px rgba(50, 45, 40, 0.06),
    0 1px 0 rgba(50, 45, 40, 0.15);

  border: 1px solid rgba(40, 38, 35, 0.5);
  border-top-color: rgba(30, 28, 25, 0.6);
  border-bottom-color: rgba(55, 50, 45, 0.2);
}

/* Corner decorations for footer */
.detail__bottom-info::before,
.detail__bottom-info::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
}

.detail__bottom-info::before {
  top: 5px;
  left: 5px;
  background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(80, 70, 55, 0.3) 50%,
      transparent 100%
    ),
    linear-gradient(
      180deg,
      transparent 0%,
      rgba(80, 70, 55, 0.3) 50%,
      transparent 100%
    );
  background-size: 100% 1px, 1px 100%;
  background-position: 0 0, 0 0;
  background-repeat: no-repeat;
}

.detail__bottom-info::after {
  bottom: 5px;
  right: 5px;
  background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(80, 70, 55, 0.3) 50%,
      transparent 100%
    ),
    linear-gradient(
      180deg,
      transparent 0%,
      rgba(80, 70, 55, 0.3) 50%,
      transparent 100%
    );
  background-size: 100% 1px, 1px 100%;
  background-position: 0 100%, 100% 0;
  background-repeat: no-repeat;
}

.detail__collector-number {
  font-family: "Crimson Text", serif;
  font-size: 14px;
  color: #5a5a5a;
  letter-spacing: 0.02em;
}

.detail__wiki-link {
  font-family: "Cinzel", serif;
  font-size: 11px;
  font-weight: 600;
  color: #7a6a5a;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  background: linear-gradient(
    180deg,
    rgba(80, 70, 55, 0.08) 0%,
    rgba(60, 50, 40, 0.06) 100%
  );
  border: 1px solid rgba(80, 70, 55, 0.2);
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.detail__wiki-link:hover {
  background: linear-gradient(
    180deg,
    rgba(175, 96, 37, 0.12) 0%,
    rgba(175, 96, 37, 0.08) 100%
  );
  border-color: rgba(175, 96, 37, 0.3);
  color: #af6025;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.detail__weight {
  font-family: "Cinzel", serif;
  font-size: 13px;
  color: var(--tier-glow, #5a5a5a);
  letter-spacing: 0.02em;
}

.game-card--floating {
  border: 1px solid var(--tier-color, #2a2a30);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.5);
  transform-origin: center center;
  will-change: transform;
}

.game-card--floating.game-card--border-hidden {
  border: none !important;
  border-width: 0 !important;
  border-color: transparent !important;
}

/* Override tier-specific border colors when border is hidden */
.game-card--floating.game-card--border-hidden.game-card--t0,
.game-card--floating.game-card--border-hidden.game-card--t1,
.game-card--floating.game-card--border-hidden.game-card--t2,
.game-card--floating.game-card--border-hidden.game-card--t3 {
  border: none !important;
  border-color: transparent !important;
  border-width: 0 !important;
}

/* Zoomed state indicator */
.game-card--floating.game-card--zoomed {
  cursor: zoom-out;
}

.game-card--floating.game-card--t0 {
  border-color: #6d5a2a;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(201, 162, 39, 0.15);
}

.game-card--floating.game-card--t1 {
  border-color: #3a3445;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 20px rgba(122, 106, 138, 0.12);
}

.game-card--floating.game-card--t2 {
  border-color: #3a4550;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 15px rgba(90, 112, 128, 0.1);
}

.game-card--floating.game-card--t3 {
  border-color: #2a2a2d;
}

.game-card--back {
  cursor: default;
}

.game-card__bg--back {
  background: linear-gradient(
    160deg,
    #0a0908 0%,
    #060505 30%,
    #030303 60%,
    #080706 100%
  );
}

.game-card__bg--back::before {
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

.card-back__rune--tl {
  top: 14px;
  left: 14px;
}
.card-back__rune--tr {
  top: 14px;
  right: 14px;
}
.card-back__rune--bl {
  bottom: 14px;
  left: 14px;
}
.card-back__rune--br {
  bottom: 14px;
  right: 14px;
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
  padding: 30%;
}

.card-back__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.5;
  filter: brightness(0.7);
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

/* Limited card styles */
.game-card--limited {
  cursor: pointer;
  position: relative;
}

.game-card--limited:hover {
  transform: scale(1.02);
  transition: transform 0.2s ease;
}

/* Limited card view in floating detail */
.card-view--limited {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  justify-content: space-between;
}

/* Wrapper to compensate for rotationY: 180 inversion - flip text back */
.card-view--limited .card-view__content-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: scaleX(-1); /* Compensate for parent rotationY: 180 to fix text mirroring */
  transform-style: preserve-3d;
}

.detail__limited-title {
  padding: 8px 0;
  text-align: center;
}

.detail__limited-type {
  font-family: "Cinzel", serif;
  font-size: 14px;
  font-weight: 700;
  color: rgba(175, 135, 80, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 8px rgba(175, 135, 80, 0.3);
}

.detail__limited-flavour {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  min-height: 0;
}

.detail__limited-flavour-text {
  font-family: "Crimson Text", serif;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(175, 135, 80, 0.85);
  font-style: italic;
  text-align: center;
  max-width: 100%;
  word-wrap: break-word;
}

.detail__limited-flavour-empty {
  font-family: "Crimson Text", serif;
  font-size: 11px;
  color: rgba(175, 135, 80, 0.4);
  font-style: italic;
  text-align: center;
}

.detail__limited-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  opacity: 0.7;
}

.detail__limited-tier {
  font-family: "Cinzel", serif;
  font-size: 9px;
  font-weight: 600;
  color: rgba(175, 135, 80, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail__limited-divider {
  font-size: 7px;
  color: rgba(175, 135, 80, 0.5);
}

.detail__limited-rarity {
  font-family: "Crimson Text", serif;
  font-size: 9px;
  color: rgba(175, 135, 80, 0.8);
  text-transform: capitalize;
}

/* Back face in floating view for limited cards */
.card-view--back {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}
</style>
