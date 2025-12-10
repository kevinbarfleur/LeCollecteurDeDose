<script setup lang="ts">
import { mockUserCollection } from "~/data/mockCards";
import type { Card, CardTier, CardVariation } from "~/types/card";
import { VARIATION_CONFIG, TIER_CONFIG, getCardVariation, isCardFoil } from "~/types/card";
import gsap from "gsap";
import html2canvas from "html2canvas";
import { useReplayRecorder } from "~/composables/useReplayRecorder";

const { t } = useI18n();

useHead({ title: "Autel - Le Collecteur de Dose" });

const { loggedIn, user: authUser } = useUserSession();

const user = computed(() => ({
  name: authUser.value?.displayName || "Guest",
  avatar: authUser.value?.avatar || "https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png",
}));

// ==========================================
// USER DATA - Vaal Orbs & Collection (Local Session Copy)
// ==========================================

// Mock user Vaal Orbs (in real app, this would come from user state/API)
const vaalOrbs = ref(14);

// Local session copy of the collection - persists during the session
// Deep clone to avoid mutating the original mockUserCollection
const localCollection = ref<Card[]>([]);

// Initialize local collection on mount
onMounted(() => {
  // Deep clone the mock collection for this session
  localCollection.value = JSON.parse(JSON.stringify(mockUserCollection));
});

// User's collection - points to local session copy
const collection = computed(() => localCollection.value);

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
const isAltarActive = ref(false); // Visual state - fades out smoothly
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

// ==========================================
// ALTAR THEME BASED ON CARD
// ==========================================

// Check if current card is foil
const isCurrentCardFoil = computed(() => {
  if (!displayCard.value) return false;
  return isCardFoil(displayCard.value);
});

// Get tier config for current card
const currentTierConfig = computed(() => {
  if (!displayCard.value) return null;
  return TIER_CONFIG[displayCard.value.tier as CardTier];
});

// Altar theme styles based on card (CSS variables applied via classes now)
const altarThemeStyles = computed(() => {
  // CSS classes handle the theming, this is kept for potential custom overrides
  return {};
});

// Altar classes based on card
const altarClasses = computed(() => ({
  'altar-platform--t0': displayCard.value?.tier === 'T0',
  'altar-platform--t1': displayCard.value?.tier === 'T1',
  'altar-platform--t2': displayCard.value?.tier === 'T2',
  'altar-platform--t3': displayCard.value?.tier === 'T3',
  'altar-platform--foil': isCurrentCardFoil.value,
  'altar-platform--active': isAltarActive.value,
  'altar-platform--vaal': isOrbOverCard.value,
}));

// Watch for card selection changes
watch(selectedCardId, async (newId, oldId) => {
  if (newId) {
    const group = groupedCards.value.find((g) => g.cardId === newId);
    if (group && group.variations.length > 0) {
      selectedVariation.value = group.variations[0].variation;
    }
    
    // Clear snapshots and dimensions when changing cards
    cardSnapshot.value = null;
    imageSnapshot.value = null;
    capturedImageDimensions.value = null;
    capturedCardDimensions.value = null;
    
    // If there was a previous card, eject it first
    if (oldId && isCardOnAltar.value && altarCardRef.value && !isAnimating.value) {
      isAnimating.value = true;
      await ejectCard();
    }
    
    // Animate new card onto altar
    placeCardOnAltar();
  } else {
    isAltarActive.value = false;
    isCardOnAltar.value = false;
    isCardFlipped.value = false;
  }
});

// ==========================================
// ALTAR ANIMATIONS
// ==========================================

const altarCardRef = ref<HTMLElement | null>(null);
const cardFrontRef = ref<HTMLElement | null>(null);
const cardBackLogoUrl = "/images/card-back-logo.png";
const isCardAnimatingIn = ref(false);
const isCardAnimatingOut = ref(false);

// Get random entry direction (from outside viewport)
const getRandomEntryPoint = () => {
  const side = Math.floor(Math.random() * 4);
  const spin = (Math.random() - 0.5) * 540; // 1.5 spins max
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  // Large offset to ensure card is fully outside viewport + margins
  const horizontalOffset = vw + 100;
  const verticalOffset = vh + 100;
  
  switch (side) {
    case 0: // From top
      return { x: (Math.random() - 0.5) * 300, y: -verticalOffset, rotation: spin };
    case 1: // From right
      return { x: horizontalOffset, y: (Math.random() - 0.5) * 200, rotation: spin };
    case 2: // From bottom
      return { x: (Math.random() - 0.5) * 300, y: verticalOffset, rotation: spin };
    case 3: // From left
    default:
      return { x: -horizontalOffset, y: (Math.random() - 0.5) * 200, rotation: spin };
  }
};

// Get random exit direction (towards outside viewport, random angle)
const getRandomExitPoint = () => {
  const angle = Math.random() * Math.PI * 2; // Random angle
  // Large distance to ensure card exits fully off screen
  const distance = Math.max(window.innerWidth, window.innerHeight) + 200;
  const spin = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540); // 1-2.5 full spins
  
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    rotation: spin,
  };
};

// Card flies in from outside the screen
const placeCardOnAltar = async () => {
  isAnimating.value = true;
  isCardFlipped.value = false;
  isCardAnimatingIn.value = true;

  await nextTick();
  isCardOnAltar.value = true;
  isAltarActive.value = true;
  await nextTick();

  if (altarCardRef.value) {
    gsap.killTweensOf(altarCardRef.value);
    
    const entry = getRandomEntryPoint();
    
    // Set initial position (offscreen with rotation)
    gsap.set(altarCardRef.value, {
      x: entry.x,
      y: entry.y,
      rotation: entry.rotation,
      scale: 1,
      opacity: 1,
    });
    
    // Fly in and land on altar with strong deceleration at the end
    gsap.to(altarCardRef.value, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.85,
      ease: "expo.out", // Strong slowdown at the end for realistic landing
      onComplete: () => {
        isCardAnimatingIn.value = false;
        isAnimating.value = false;
        // Capture snapshot after card has landed and rendered
        captureCardSnapshot();
      },
    });
  } else {
    isCardAnimatingIn.value = false;
    isAnimating.value = false;
  }
};

// ==========================================
// VAAL ORB OUTCOMES
// ==========================================
type VaalOutcome = 'nothing' | 'foil' | 'destroyed';
type ForcedOutcome = 'random' | VaalOutcome;

// State for destruction animation
const isCardBeingDestroyed = ref(false);

// Admin/Debug settings
const showAdminModal = ref(false);
const forcedOutcome = ref<ForcedOutcome>('random');

// Replay Recording
const {
  isRecording,
  isRecordingArmed,
  generatedUrl,
  setUser,
  armRecording,
  startRecording,
  recordPosition,
  stopRecording,
  cancelRecording,
  copyUrlToClipboard
} = useReplayRecorder();

const showShareModal = ref(false);
const urlCopied = ref(false);

// Set user info for recorder when user changes
watch(user, (newUser) => {
  setUser(newUser.name, newUser.avatar);
}, { immediate: true });

const armRecordingForCurrentCard = () => {
  const card = displayCard.value;
  if (!card || !isCardOnAltar.value) return;
  
  armRecording({
    cardId: card.id,
    variation: selectedVariation.value,
    uid: card.uid,
    tier: card.tier,
    foil: isCardFoil(card)
  });
};

const handleCopyUrl = async () => {
  const success = await copyUrlToClipboard();
  if (success) {
    urlCopied.value = true;
    setTimeout(() => {
      urlCopied.value = false;
    }, 2000);
  }
};

const forcedOutcomeOptions = [
  { value: 'random', label: '🎲 Aléatoire (défaut)' },
  { value: 'nothing', label: '😐 Rien ne se passe' },
  { value: 'foil', label: '✨ Transformation Foil' },
  { value: 'destroyed', label: '💀 Destruction' },
];

// Simulate Vaal outcome (will be server-side later)
const simulateVaalOutcome = (): VaalOutcome => {
  // If a forced outcome is set, use it
  if (forcedOutcome.value !== 'random') {
    return forcedOutcome.value;
  }
  
  const rand = Math.random();
  // 50% nothing, 30% foil, 20% destroyed
  if (rand < 0.5) return 'nothing';
  if (rand < 0.8) return 'foil';
  return 'destroyed';
};

// Transform card to foil instantly with dramatic effect
const transformToFoil = async () => {
  if (!altarCardRef.value || !displayCard.value) return;

  isAnimating.value = true;
  
  // Find the card in the local collection and update it
  const cardIndex = localCollection.value.findIndex(c => c.uid === displayCard.value!.uid);
  if (cardIndex !== -1) {
    localCollection.value[cardIndex].foil = true;
  }
  
  // Phase 1: Build up glow
  gsap.to(altarCardRef.value, {
    filter: "brightness(1.8) saturate(1.5)",
    scale: 1.05,
    duration: 0.2,
    ease: "power2.in",
  });
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Phase 2: Bright flash - this is when the transformation happens visually
  gsap.to(altarCardRef.value, {
    filter: "brightness(3) saturate(2)",
    scale: 1.1,
    duration: 0.1,
    ease: "power2.out",
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Phase 3: Settle back with the new foil appearance
  gsap.to(altarCardRef.value, {
    filter: "brightness(1) saturate(1)",
    scale: 1,
    duration: 0.4,
    ease: "power2.out",
  });
  
  await new Promise(resolve => setTimeout(resolve, 400));
  isAnimating.value = false;
  
  // Re-capture snapshot with the new foil appearance
  captureCardSnapshot();
};

const DISINTEGRATION_FRAMES = 64;
const REPETITION_COUNT = 2;

const cardSnapshot = ref<HTMLCanvasElement | null>(null);
const imageSnapshot = ref<HTMLCanvasElement | null>(null);
const isCapturingSnapshot = ref(false);
const capturedImageDimensions = ref<{ width: number; height: number } | null>(null);
const capturedCardDimensions = ref<{ width: number; height: number } | null>(null);

const findCardImageElement = (): HTMLElement | null => {
  if (!cardFrontRef.value) return null;
  return cardFrontRef.value.querySelector('.game-card__image-wrapper') as HTMLElement | null;
};

const loadImageToCanvas = (imgUrl: string, targetWidth?: number, targetHeight?: number): Promise<HTMLCanvasElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const width = targetWidth || img.naturalWidth;
      const height = targetHeight || img.naturalHeight;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      } else {
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = `/api/image-proxy?url=${encodeURIComponent(imgUrl)}`;
  });
};

// Capture both the image and the full card as canvas snapshots
const captureCardSnapshot = async () => {
  if (!cardFrontRef.value || isCapturingSnapshot.value) return;
  
  isCapturingSnapshot.value = true;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (!cardFrontRef.value) {
      isCapturingSnapshot.value = false;
      return;
    }
    
    const imgElement = cardFrontRef.value.querySelector('.game-card__image') as HTMLImageElement;
    const imageWrapperElement = findCardImageElement();
    
    if (imgElement && imgElement.src && imageWrapperElement) {
      const wrapperRect = imageWrapperElement.getBoundingClientRect();
      const naturalRatio = imgElement.naturalWidth / imgElement.naturalHeight;
      const wrapperRatio = wrapperRect.width / wrapperRect.height;
      
      const displaySize = naturalRatio > wrapperRatio 
        ? wrapperRect.width 
        : wrapperRect.height * naturalRatio;
      
      const targetSize = Math.round(displaySize);
      const directCanvas = await loadImageToCanvas(imgElement.src, targetSize, targetSize);
      
      if (directCanvas && canvasHasContent(directCanvas)) {
        imageSnapshot.value = directCanvas;
        capturedImageDimensions.value = { width: targetSize, height: targetSize };
      }
    }
    
    const cardRect = cardFrontRef.value.getBoundingClientRect();
    const canvas = await html2canvas(cardFrontRef.value, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 10000,
    });
    
    cardSnapshot.value = canvas;
    capturedCardDimensions.value = { width: cardRect.width, height: cardRect.height };
  } catch (error) {
    cardSnapshot.value = null;
  }
  
  isCapturingSnapshot.value = false;
};

const canvasHasContent = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
};

const generateDisintegrationFrames = (canvas: HTMLCanvasElement, count: number): HTMLCanvasElement[] => {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  
  const originalData = ctx.getImageData(0, 0, width, height);
  const imageDatas = [...Array(count)].map(() => ctx.createImageData(width, height));
  
  for (let x = 0; x < width; ++x) {
    for (let y = 0; y < height; ++y) {
      for (let i = 0; i < REPETITION_COUNT; ++i) {
        const dataIndex = Math.floor(count * (Math.random() + 2 * x / width) / 3);
        const pixelIndex = (y * width + x) * 4;
        for (let offset = 0; offset < 4; ++offset) {
          imageDatas[dataIndex].data[pixelIndex + offset] = originalData.data[pixelIndex + offset];
        }
      }
    }
  }
  
  return imageDatas.map(data => {
    const newCanvas = document.createElement("canvas");
    newCanvas.width = width;
    newCanvas.height = height;
    newCanvas.getContext("2d")?.putImageData(data, 0, 0);
    return newCanvas;
  });
};

const cleanupAfterDestruction = (destroyedCardUid: number) => {
  const cardIndex = localCollection.value.findIndex(c => c.uid === destroyedCardUid);
  if (cardIndex !== -1) {
    localCollection.value.splice(cardIndex, 1);
  }
  
  cardSnapshot.value = null;
  imageSnapshot.value = null;
  capturedImageDimensions.value = null;
  capturedCardDimensions.value = null;
  isCardBeingDestroyed.value = false;
  isCardOnAltar.value = false;
  isAltarActive.value = false;
  isCardFlipped.value = false;
  selectedCardId.value = "";
  isAnimating.value = false;
  
  if (altarCardRef.value) {
    gsap.set(altarCardRef.value, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      rotation: 0,
      rotateY: 0,
      filter: "none",
    });
  }
};

const createDisintegrationEffect = (
  canvas: HTMLCanvasElement, 
  container: HTMLElement,
  options: {
    frameCount?: number;
    direction?: 'up' | 'out';
    duration?: number;
    delayMultiplier?: number;
    targetWidth?: number;
    targetHeight?: number;
  } = {}
): Promise<HTMLCanvasElement[]> => {
  const {
    frameCount = DISINTEGRATION_FRAMES,
    direction = 'out',
    duration = 1.2,
    delayMultiplier = 1.5,
    targetWidth,
    targetHeight
  } = options;
  
  const displayWidth = targetWidth || canvas.width;
  const displayHeight = targetHeight || canvas.height;
  const frames = generateDisintegrationFrames(canvas, frameCount);
  
  frames.forEach((frame) => {
    frame.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: ${displayWidth}px;
      height: ${displayHeight}px;
      opacity: 1;
      transform: rotate(0deg) translate(0px, 0px);
    `;
    container.appendChild(frame);
  });
  
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        frames.forEach((frame, i) => {
          frame.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
          frame.style.transitionDelay = `${(delayMultiplier * i / frames.length)}s`;
        });
        
        requestAnimationFrame(() => {
          frames.forEach(frame => {
            const randomAngle = 2 * Math.PI * (Math.random() - 0.5);
            let translateX: number, translateY: number;
            
            if (direction === 'up') {
              translateX = (Math.random() - 0.5) * 120;
              translateY = -100 - Math.random() * 150;
            } else {
              const distance = 80 + Math.random() * 60;
              translateX = distance * Math.cos(randomAngle);
              translateY = distance * Math.sin(randomAngle) - 30;
            }
            
            frame.style.transform = `
              rotate(${25 * (Math.random() - 0.5)}deg) 
              translate(${translateX}px, ${translateY}px)
              rotate(${20 * (Math.random() - 0.5)}deg)
            `;
            frame.style.opacity = "0";
          });
          
          resolve(frames);
        });
      });
    });
  });
};

const destroyCard = async () => {
  if (!altarCardRef.value || !displayCard.value) return;

  isAnimating.value = true;
  isCardBeingDestroyed.value = true;
  
  const destroyedCardUid = displayCard.value.uid;
  
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
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Start fading out the altar as disintegration begins
  isAltarActive.value = false;
  
  const cardSlot = altarCardRef.value.parentElement;
  if (!cardSlot) {
    cleanupAfterDestruction(destroyedCardUid);
    return;
  }
  
  try {
    const containers: HTMLElement[] = [];
    const imageElement = findCardImageElement();
    const hasImageSnapshot = imageSnapshot.value && canvasHasContent(imageSnapshot.value);
    
    if (hasImageSnapshot && imageElement && altarCardRef.value) {
      const imgTag = imageElement.querySelector('.game-card__image') as HTMLImageElement | null;
      const imgRect = imgTag?.getBoundingClientRect();
      const actualWidth = imgRect?.width || imageElement.clientWidth;
      const actualHeight = imgRect?.height || imageElement.clientHeight;
      const altarRect = altarCardRef.value.getBoundingClientRect();
      const relativeTop = imgRect ? (imgRect.top - altarRect.top) : (imageElement.getBoundingClientRect().top - altarRect.top);
      const relativeLeft = imgRect ? (imgRect.left - altarRect.left) : (imageElement.getBoundingClientRect().left - altarRect.left);
      
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
        direction: 'up',
        duration: 0.8,
        delayMultiplier: 0.4,
        targetWidth: actualWidth,
        targetHeight: actualHeight
      });
      
      if (imgTag) imgTag.style.opacity = '0';
      
      // Wait for image disintegration to finish (duration + max delay)
      await new Promise(resolve => setTimeout(resolve, 800));
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
      const { width: cardWidth, height: cardHeight } = capturedCardDimensions.value;
      
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
        direction: 'out',
        duration: 0.9,
        delayMultiplier: 0.7,
        targetWidth: cardWidth,
        targetHeight: cardHeight
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    containers.forEach(c => c.remove());
    
  } catch (error) {
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  cleanupAfterDestruction(destroyedCardUid);
};

// Flip card to back (first part of Vaal ritual)
// Handle Vaal outcome - instant result
const handleVaalOutcome = async (outcome: VaalOutcome) => {
  // Stop recording and capture outcome
  if (isRecording.value) {
    stopRecording(outcome);
    // Show share modal after 2 seconds (when recording finishes)
    setTimeout(() => {
      showShareModal.value = true;
      urlCopied.value = false;
    }, 2100);
  }
  
  switch (outcome) {
    case 'nothing':
      // Nothing happens - just a brief flash to indicate the orb was consumed
      await showNothingEffect();
      break;
      
    case 'foil':
      // Transform to foil instantly
      await transformToFoil();
      break;
      
    case 'destroyed':
      // Destroy the card
      await destroyCard();
      break;
  }
};

// Effect when nothing happens
const showNothingEffect = async () => {
  if (!altarCardRef.value) return;
  
  isAnimating.value = true;
  
  // Brief disappointed flash
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
  
  await new Promise(resolve => setTimeout(resolve, 400));
  isAnimating.value = false;
};

// Card is thrown/ejected towards a random direction with spin
const ejectCard = async () => {
  if (!altarCardRef.value) return;
  
  isCardAnimatingOut.value = true;
  isAltarActive.value = false;
  
  const exit = getRandomExitPoint();
  
  await new Promise<void>((resolve) => {
    gsap.to(altarCardRef.value, {
      x: exit.x,
      y: exit.y,
      rotation: exit.rotation,
      duration: 0.5,
      ease: "power2.in",
      onComplete: () => {
        isCardAnimatingOut.value = false;
        resolve();
      },
    });
  });
  
  isCardOnAltar.value = false;
  isCardFlipped.value = false;
};

// Remove card from altar
const removeCardFromAltar = async () => {
  if (!altarCardRef.value || isAnimating.value || !isCardOnAltar.value) return;

  isAnimating.value = true;
  await ejectCard();
  
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

// ==========================================
// HEARTBEAT EFFECT - Card "panics" when orb approaches
// ==========================================
const heartbeatIntensity = ref(0); // 0 = calm, 1 = max panic

// Calculate heartbeat intensity based on distance from orb to card center
const updateHeartbeatIntensity = (orbX: number, orbY: number) => {
  if (!altarCardRef.value) {
    heartbeatIntensity.value = 0.3; // Base intensity when dragging but no card ref
    return;
  }
  
  const cardRect = altarCardRef.value.getBoundingClientRect();
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;
  
  // Calculate distance from orb to card center
  const dx = orbX - cardCenterX;
  const dy = orbY - cardCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Max distance for intensity calculation (beyond this, base intensity)
  const maxDistance = 400;
  // Min distance (at or below this, max intensity)
  const minDistance = 50;
  
  if (distance <= minDistance) {
    heartbeatIntensity.value = 1; // MAX PANIC!
  } else if (distance >= maxDistance) {
    heartbeatIntensity.value = 0.2; // Just aware something is coming
  } else {
    // Linear interpolation - closer = more intense
    const normalizedDistance = (distance - minDistance) / (maxDistance - minDistance);
    heartbeatIntensity.value = 1 - normalizedDistance * 0.8; // 0.2 to 1 range
  }
};

// Computed CSS variable for heartbeat animation
const heartbeatStyles = computed(() => {
  // Don't apply heartbeat styles during any animation
  if (!isCardOnAltar.value || isAnimating.value || isCardBeingDestroyed.value) return {};
  
  // Base heartbeat when card is on altar
  const baseSpeed = 2; // seconds
  const panicSpeed = 0.25; // seconds at max panic
  
  // Calculate speed based on intensity (higher intensity = faster)
  const speed = isDraggingOrb.value 
    ? baseSpeed - (heartbeatIntensity.value * (baseSpeed - panicSpeed))
    : baseSpeed;
  
  // Calculate scale intensity (subtle when calm, dramatic when panicking)
  const baseScale = 1.005;
  const panicScale = isDraggingOrb.value 
    ? 1.01 + (heartbeatIntensity.value * 0.04) // Up to 1.05 scale at max panic
    : baseScale;
  
  return {
    '--heartbeat-speed': `${speed}s`,
    '--heartbeat-scale': panicScale,
    '--heartbeat-glow-intensity': isDraggingOrb.value ? heartbeatIntensity.value : 0.15,
  };
});

// Set orb ref
const setOrbRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    orbRefs.value[index] = el;
  }
};

const startDragOrb = (event: MouseEvent | TouchEvent, index: number) => {
  if (vaalOrbs.value <= 0 || !isCardOnAltar.value || isAnimating.value || isReturningOrb.value) return;

  event.preventDefault();
  
  // Start recording if armed
  if (isRecordingArmed.value) {
    startRecording();
  }
  
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
  
  // Record initial position
  if (isRecording.value) {
    recordPosition(clientX, clientY);
  }

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
  
  // Update heartbeat intensity based on proximity
  updateHeartbeatIntensity(clientX, clientY);
  
  // Record position for replay (sampling handled in composable)
  if (isRecording.value) {
    recordPosition(clientX, clientY);
  }
};

const endDragOrb = async () => {
  if (!isDraggingOrb.value) return;

  document.removeEventListener("mousemove", onDragOrb);
  document.removeEventListener("mouseup", endDragOrb);
  document.removeEventListener("touchmove", onDragOrb);
  document.removeEventListener("touchend", endDragOrb);

  // If orb was dropped on card, consume it and apply Vaal outcome
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
    heartbeatIntensity.value = 0; // Reset heartbeat
    
    // Apply Vaal outcome instantly
    const outcome = simulateVaalOutcome();
    await handleVaalOutcome(outcome);
  } else {
    // Cancel recording if orb not dropped on card
    if (isRecording.value) {
      cancelRecording();
    }
    
    // Return to origin with smooth GSAP animation directly on DOM element
    isReturningOrb.value = true;
    heartbeatIntensity.value = 0; // Reset heartbeat when returning
    
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
            title="Autel (Demo)"
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
          <div 
            class="altar-platform"
            :class="altarClasses"
            :style="altarThemeStyles"
          >
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
                :class="{ 
                  'altar-card--flipped': isCardFlipped,
                  'altar-card--animating': isCardAnimatingIn || isCardAnimatingOut,
                  'altar-card--heartbeat': !isCardAnimatingIn && !isCardAnimatingOut && !isCardBeingDestroyed && !isAnimating,
                  'altar-card--panicking': isDraggingOrb && !isCardAnimatingIn && !isCardAnimatingOut,
                  'altar-card--destroying': isCardBeingDestroyed,
                }"
                :style="heartbeatStyles"
              >
                <!-- Front face - GameCard with full interactivity -->
                <div ref="cardFrontRef" class="altar-card__face altar-card__face--front">
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

            </div>
        </div>

        <!-- Vaal Orbs inventory -->
        <div class="vaal-orbs-section">
          <RunicBox padding="md" class="vaal-orbs-box">
            <!-- Top right buttons -->
            <div class="vaal-toolbar">
              <!-- Record button -->
              <RunicButton
                variant="ghost"
                size="sm"
                icon="record"
                class="vaal-record-btn"
                :class="{ 
                  'vaal-record-btn--armed': isRecordingArmed,
                  'vaal-record-btn--recording': isRecording 
                }"
                :title="isRecording ? 'Enregistrement...' : isRecordingArmed ? 'En attente...' : 'Enregistrer'"
                :disabled="!isCardOnAltar || isAnimating || (isRecordingArmed || isRecording)"
                @click="armRecordingForCurrentCard"
              >
                <span class="sr-only">Record</span>
              </RunicButton>

              <!-- Admin settings button -->
              <RunicButton
                variant="ghost"
                size="sm"
                icon="settings"
                class="vaal-admin-btn"
                title="Admin / Debug"
                @click="showAdminModal = true"
              >
                <span class="sr-only">Admin</span>
              </RunicButton>
            </div>

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
                <img
                  :src="cardBackLogoUrl"
                  alt="Vaal Orb"
                  class="vaal-orb__image"
                />
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
            <img
              :src="cardBackLogoUrl"
              alt="Vaal Orb"
              class="vaal-orb__image"
            />
          </div>
        </Teleport>

        <!-- Admin Modal -->
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="showAdminModal" class="admin-modal-overlay" @click.self="showAdminModal = false">
              <div class="admin-modal">
                <div class="admin-modal__header">
                  <h3 class="admin-modal__title">
                    <span class="admin-modal__icon">⚙</span>
                    Admin / Debug
                  </h3>
                  <RunicButton
                    variant="ghost"
                    size="sm"
                    icon="close"
                    @click="showAdminModal = false"
                  />
                </div>
                
                <div class="admin-modal__content">
                  <div class="admin-field">
                    <RunicSelect
                      v-model="forcedOutcome"
                      :options="forcedOutcomeOptions"
                      label="Forcer le résultat Vaal"
                      size="md"
                    />
                    <p class="admin-field__hint">
                      Sélectionne un résultat pour tester les animations
                    </p>
                  </div>

                  <div class="admin-field">
                    <label class="admin-field__label">Vaal Orbs</label>
                    <p class="admin-field__hint">
                      Ajuste le nombre de Vaal Orbs disponibles
                    </p>
                    <div class="admin-field__number">
                      <button 
                        class="admin-field__btn"
                        :disabled="vaalOrbs <= 0"
                        @click="vaalOrbs = Math.max(0, vaalOrbs - 1)"
                      >−</button>
                      <span class="admin-field__value">{{ vaalOrbs }}</span>
                      <button 
                        class="admin-field__btn"
                        :disabled="vaalOrbs >= 99"
                        @click="vaalOrbs = Math.min(99, vaalOrbs + 1)"
                      >+</button>
                    </div>
                  </div>

                  <div class="admin-info">
                    <div class="admin-info__item">
                      <span class="admin-info__label">Collection:</span>
                      <span class="admin-info__value">{{ localCollection.length }} cartes</span>
                    </div>
                    <div class="admin-info__item">
                      <span class="admin-info__label">Mode forcé:</span>
                      <span class="admin-info__value" :class="{ 'admin-info__value--active': forcedOutcome !== 'random' }">
                        {{ forcedOutcome === 'random' ? 'Non' : 'Oui' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Share Replay Modal -->
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="showShareModal && generatedUrl" class="admin-modal-overlay" @click.self="showShareModal = false">
              <div class="admin-modal share-modal">
                <div class="admin-modal__header">
                  <h3 class="admin-modal__title">
                    <span class="admin-modal__icon">🎬</span>
                    Session enregistrée !
                  </h3>
                  <RunicButton
                    variant="ghost"
                    size="sm"
                    icon="close"
                    @click="showShareModal = false"
                  />
                </div>
                
                <div class="admin-modal__content">
                  <p class="share-modal__text">
                    Ta session a été enregistrée. Partage ce lien pour que d'autres puissent voir ta Vaal Orb !
                  </p>
                  
                  <div class="share-modal__url">
                    <input 
                      type="text" 
                      :value="generatedUrl" 
                      readonly 
                      class="share-modal__input"
                      @click="($event.target as HTMLInputElement).select()"
                    />
                    <RunicButton
                      variant="primary"
                      size="sm"
                      @click="handleCopyUrl"
                    >
                      {{ urlCopied ? '✓ Copié !' : 'Copier' }}
                    </RunicButton>
                  </div>
                  
                  <div class="share-modal__preview">
                    <NuxtLink :to="generatedUrl" target="_blank" class="share-modal__link">
                      Voir le replay →
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* ==========================================
   ALTAR PAGE LAYOUT
   ========================================== */
/* Force overflow visible on parent containers for card animations */
:global(html),
:global(body) {
  overflow-x: clip !important;
}

:global(.main-content),
:global(.main-content__inner) {
  overflow: visible !important;
}

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
  overflow: visible;
  /* Higher z-index so animated cards appear above other page elements */
  position: relative;
  z-index: 10;
}

/* ==========================================
   ALTAR PLATFORM - The ritual circle
   ========================================== */
.altar-platform {
  --altar-accent: #3a3530;
  --altar-rune-color: rgba(60, 55, 50, 0.3);
  
  position: relative;
  width: 320px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;

  /* Stone platform base - dormant/dark */
  background: radial-gradient(
      ellipse at center,
      rgba(25, 23, 20, 0.6) 0%,
      rgba(18, 16, 14, 0.8) 50%,
      rgba(10, 9, 8, 0.95) 100%
    ),
    linear-gradient(180deg, rgba(20, 18, 15, 0.9) 0%, rgba(12, 10, 8, 0.95) 100%);

  border-radius: 50%;
  
  /* Dormant - no glow, just shadow */
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.8),
    inset 0 -4px 20px rgba(40, 35, 30, 0.08),
    0 15px 40px rgba(0, 0, 0, 0.5);
    
  transition: box-shadow 0.6s ease, background 0.6s ease;
}

/* ==========================================
   ALTAR ACTIVATED STATE (with card)
   ========================================== */

/* T0 - Gold/Amber - Active */
.altar-platform--active.altar-platform--t0 {
  --altar-accent: #c9a227;
  --altar-rune-color: rgba(201, 162, 39, 0.6);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(109, 90, 42, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(201, 162, 39, 0.08);
}

/* T1 - Purple/Obsidian - Active */
.altar-platform--active.altar-platform--t1 {
  --altar-accent: #7a6a8a;
  --altar-rune-color: rgba(122, 106, 138, 0.6);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(58, 52, 69, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 35px rgba(122, 106, 138, 0.06);
}

/* T2 - Blue/Slate - Active */
.altar-platform--active.altar-platform--t2 {
  --altar-accent: #5a7080;
  --altar-rune-color: rgba(90, 112, 128, 0.6);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(58, 69, 80, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(90, 112, 128, 0.05);
}

/* T3 - Gray/Basalt - Active */
.altar-platform--active.altar-platform--t3 {
  --altar-accent: #5a5a5d;
  --altar-rune-color: rgba(90, 90, 93, 0.5);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(42, 42, 45, 0.08),
    0 15px 40px rgba(0, 0, 0, 0.5);
}

/* Foil - Rainbow/Prismatic - Active */
.altar-platform--active.altar-platform--foil {
  --altar-accent: #c0a0ff;
  --altar-rune-color: rgba(192, 160, 255, 0.7);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(180, 160, 220, 0.08),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 50px rgba(180, 160, 255, 0.1);
  animation: foilGlowSubtle 4s ease-in-out infinite;
}

/* ==========================================
   VAAL THEME - Smooth overlay transition
   ========================================== */

/* Vaal overlay - fades in smoothly over the tier theme */
.altar-platform::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
      ellipse at center,
      rgba(50, 15, 15, 0.85) 0%,
      rgba(30, 10, 10, 0.9) 50%,
      rgba(15, 5, 5, 0.95) 100%
    );
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 0;
}

/* Vaal glow effect - separate layer for pulsing */
.altar-platform::after {
  content: "";
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(200, 50, 50, 0.3) 0%,
    rgba(180, 40, 40, 0.15) 40%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: -1;
  animation: vaalGlowPulse 0.6s ease-in-out infinite;
  animation-play-state: paused;
}

/* When Vaal is active, fade in the overlay and glow */
.altar-platform--active.altar-platform--vaal::before {
  opacity: 1;
}

.altar-platform--active.altar-platform--vaal::after {
  opacity: 1;
  animation-play-state: running;
}

/* Override CSS variables smoothly for elements that use them */
.altar-platform--active.altar-platform--vaal {
  --altar-accent: #c83232;
  --altar-rune-color: rgba(200, 50, 50, 0.8);
}

/* Vaal theme overrides foil too */
.altar-platform--active.altar-platform--foil.altar-platform--vaal {
  --altar-accent: #c83232;
  --altar-rune-color: rgba(200, 50, 50, 0.8);
}

@keyframes vaalGlowPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes foilGlowSubtle {
  0%, 100% {
    box-shadow: 
      inset 0 8px 30px rgba(0, 0, 0, 0.7),
      inset 0 -4px 20px rgba(180, 160, 220, 0.08),
      0 15px 40px rgba(0, 0, 0, 0.5),
      0 0 50px rgba(180, 160, 255, 0.1);
  }
  33% {
    box-shadow: 
      inset 0 8px 30px rgba(0, 0, 0, 0.7),
      inset 0 -4px 20px rgba(220, 180, 180, 0.08),
      0 15px 40px rgba(0, 0, 0, 0.5),
      0 0 50px rgba(255, 180, 200, 0.1);
  }
  66% {
    box-shadow: 
      inset 0 8px 30px rgba(0, 0, 0, 0.7),
      inset 0 -4px 20px rgba(160, 220, 180, 0.08),
      0 15px 40px rgba(0, 0, 0, 0.5),
      0 0 50px rgba(160, 255, 200, 0.1);
  }
}

/* ==========================================
   ALTAR CIRCLES - Runic decorations
   ========================================== */
.altar-circle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  /* Smooth transition for color changes */
  transition: border-color 0.4s ease, opacity 0.4s ease, filter 0.4s ease;
  z-index: 1;
}

/* Dormant state - barely visible, no animation */
.altar-circle--outer {
  width: 95%;
  height: 95%;
  border: 1px dashed rgba(50, 45, 40, 0.15);
}

.altar-circle--middle {
  width: 85%;
  height: 85%;
  border: 2px solid rgba(50, 45, 40, 0.12);
}

.altar-circle--inner {
  width: 75%;
  height: 75%;
  border: 1px dotted rgba(50, 45, 40, 0.1);
}

/* Active state - colored and rotating (base animations never change) */
.altar-platform--active .altar-circle--outer {
  border-color: color-mix(in srgb, var(--altar-accent) 25%, transparent);
  animation: rotateCircle 60s linear infinite;
}

.altar-platform--active .altar-circle--middle {
  border-color: color-mix(in srgb, var(--altar-accent) 35%, transparent);
  animation: rotateCircle 45s linear infinite reverse;
}

.altar-platform--active .altar-circle--inner {
  border-color: color-mix(in srgb, var(--altar-accent) 45%, transparent);
  animation: rotateCircle 30s linear infinite;
}

/* Foil circles - animated colors (only when active) */
.altar-platform--active.altar-platform--foil .altar-circle--outer {
  animation: rotateCircle 60s linear infinite, foilCircle 4s ease-in-out infinite;
}

.altar-platform--active.altar-platform--foil .altar-circle--middle {
  animation: rotateCircle 45s linear infinite reverse, foilCircle 4s ease-in-out infinite 0.5s;
}

.altar-platform--active.altar-platform--foil .altar-circle--inner {
  animation: rotateCircle 30s linear infinite, foilCircle 4s ease-in-out infinite 1s;
}

/* Vaal circles - color transitions smoothly, brightness pulses via filter */
.altar-platform--active.altar-platform--vaal .altar-circle--outer {
  border-color: rgba(200, 50, 50, 0.5);
  filter: drop-shadow(0 0 4px rgba(200, 50, 50, 0.4));
}

.altar-platform--active.altar-platform--vaal .altar-circle--middle {
  border-color: rgba(220, 60, 60, 0.6);
  filter: drop-shadow(0 0 6px rgba(220, 60, 60, 0.5));
}

.altar-platform--active.altar-platform--vaal .altar-circle--inner {
  border-color: rgba(240, 70, 70, 0.7);
  filter: drop-shadow(0 0 8px rgba(240, 70, 70, 0.6));
}

@keyframes foilCircle {
  0%, 100% { border-color: rgba(180, 160, 220, 0.35); }
  33% { border-color: rgba(220, 160, 180, 0.35); }
  66% { border-color: rgba(160, 220, 200, 0.35); }
}

@keyframes rotateCircle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==========================================
   ALTAR RUNES - Corner decorations
   ========================================== */
.altar-rune {
  position: absolute;
  font-size: 1.25rem;
  color: rgba(50, 45, 40, 0.2);
  text-shadow: none;
  /* Smooth transitions for all visual properties */
  transition: color 0.4s ease, text-shadow 0.4s ease, opacity 0.4s ease, transform 0.4s ease, filter 0.4s ease;
  opacity: 0.4;
  z-index: 2;
}

.altar-rune--n { top: 8%; left: 50%; transform: translateX(-50%); }
.altar-rune--e { top: 50%; right: 8%; transform: translateY(-50%); }
.altar-rune--s { bottom: 8%; left: 50%; transform: translateX(-50%); }
.altar-rune--w { top: 50%; left: 8%; transform: translateY(-50%); }

/* Active state - colored and glowing (base animation stays constant) */
.altar-platform--active .altar-rune {
  color: var(--altar-rune-color);
  text-shadow: 0 0 8px color-mix(in srgb, var(--altar-accent) 30%, transparent);
  opacity: 1;
  animation: pulseRune 3s ease-in-out infinite;
}

.altar-platform--active .altar-rune--n { animation-delay: 0s; }
.altar-platform--active .altar-rune--e { animation-delay: 0.75s; }
.altar-platform--active .altar-rune--s { animation-delay: 1.5s; }
.altar-platform--active .altar-rune--w { animation-delay: 2.25s; }

/* Vaal runes - enhanced glow via filter (transitions smoothly) */
.altar-platform--active.altar-platform--vaal .altar-rune {
  filter: drop-shadow(0 0 10px rgba(200, 50, 50, 0.6)) drop-shadow(0 0 20px rgba(180, 40, 40, 0.3));
}

.altar-platform--active.altar-platform--vaal .altar-rune--n { 
  transform: translateX(-50%) scale(1.15); 
}
.altar-platform--active.altar-platform--vaal .altar-rune--e { 
  transform: translateY(-50%) scale(1.15); 
}
.altar-platform--active.altar-platform--vaal .altar-rune--s { 
  transform: translateX(-50%) scale(1.15); 
}
.altar-platform--active.altar-platform--vaal .altar-rune--w { 
  transform: translateY(-50%) scale(1.15); 
}

@keyframes pulseRune {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Foil runes - rainbow animation (only when active) */
.altar-platform--active.altar-platform--foil .altar-rune {
  animation: pulseRune 3s ease-in-out infinite, foilRune 4s ease-in-out infinite;
}

@keyframes foilRune {
  0%, 100% { color: rgba(180, 160, 220, 0.7); text-shadow: 0 0 10px rgba(180, 160, 220, 0.3); }
  33% { color: rgba(220, 160, 180, 0.7); text-shadow: 0 0 10px rgba(220, 160, 180, 0.3); }
  66% { color: rgba(160, 220, 200, 0.7); text-shadow: 0 0 10px rgba(160, 220, 200, 0.3); }
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
  
  /* Perspective for card flip only */
  perspective: 600px;
  
  /* Allow card to overflow during animations */
  overflow: visible;
  z-index: 2;
  
  /* Inset groove - dormant */
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.9) 0%,
    rgba(12, 12, 14, 0.8) 50%,
    rgba(8, 8, 10, 0.9) 100%
  );
  
  box-shadow: 
    inset 0 4px 15px rgba(0, 0, 0, 0.7),
    inset 0 -2px 10px rgba(40, 35, 30, 0.03),
    0 2px 8px rgba(0, 0, 0, 0.3);
  
  border: 1px solid rgba(40, 38, 35, 0.25);
  
  /* Smooth transitions for Vaal theme change */
  transition: border-color 0.4s ease, box-shadow 0.4s ease, background 0.4s ease;
}

.altar-card-slot--active {
  border-color: color-mix(in srgb, var(--altar-accent) 35%, transparent);
  box-shadow: 
    inset 0 4px 15px rgba(0, 0, 0, 0.6),
    inset 0 -2px 10px rgba(40, 35, 30, 0.03),
    0 2px 8px rgba(0, 0, 0, 0.3);
}

.altar-card-slot--highlight {
  border-color: rgba(200, 50, 50, 0.7);
  box-shadow: 
    inset 0 4px 15px rgba(0, 0, 0, 0.5),
    inset 0 -2px 10px rgba(200, 50, 50, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(200, 50, 50, 0.35),
    0 0 60px rgba(180, 40, 40, 0.2);
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
  will-change: transform;
  
  /* Allow disintegration particles to escape */
  overflow: visible;
  
  /* CSS variables for heartbeat effect */
  --heartbeat-speed: 2s;
  --heartbeat-scale: 1.005;
  --heartbeat-glow-intensity: 0.15;
}

/* ==========================================
   HEARTBEAT ANIMATION - Card "breathes" on altar
   ========================================== */
.altar-card--heartbeat {
  animation: cardHeartbeat var(--heartbeat-speed) ease-in-out infinite;
}

/* When panicking (orb being dragged), add glow effect */
.altar-card--panicking {
  animation: cardHeartbeatPanic var(--heartbeat-speed) ease-in-out infinite;
}

.altar-card--panicking::before {
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 12px;
  background: radial-gradient(
    ellipse at center,
    rgba(180, 50, 50, calc(var(--heartbeat-glow-intensity) * 0.5)) 0%,
    rgba(160, 40, 40, calc(var(--heartbeat-glow-intensity) * 0.25)) 40%,
    transparent 70%
  );
  pointer-events: none;
  z-index: -1;
  animation: heartbeatGlow var(--heartbeat-speed) ease-in-out infinite;
}

@keyframes cardHeartbeat {
  0%, 100% {
    transform: scale(1);
  }
  15% {
    transform: scale(var(--heartbeat-scale));
  }
  30% {
    transform: scale(1);
  }
  45% {
    transform: scale(calc(var(--heartbeat-scale) * 0.997));
  }
  60% {
    transform: scale(1);
  }
}

@keyframes cardHeartbeatPanic {
  0%, 100% {
    transform: scale(1);
    filter: brightness(1);
  }
  15% {
    transform: scale(var(--heartbeat-scale));
    filter: brightness(calc(1 + var(--heartbeat-glow-intensity) * 0.15));
  }
  30% {
    transform: scale(1);
    filter: brightness(1);
  }
  45% {
    transform: scale(calc(var(--heartbeat-scale) * 0.997));
    filter: brightness(calc(1 + var(--heartbeat-glow-intensity) * 0.1));
  }
  60% {
    transform: scale(1);
    filter: brightness(1);
  }
}

@keyframes heartbeatGlow {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  15% {
    opacity: 1;
    transform: scale(1.05);
  }
  30% {
    opacity: 0.7;
    transform: scale(1);
  }
  45% {
    opacity: 0.9;
    transform: scale(1.02);
  }
  60% {
    opacity: 0.6;
    transform: scale(1);
  }
}

/* ==========================================
   DESTRUCTION ANIMATION
   ========================================== */
.altar-card--destroying {
  /* Disable heartbeat during destruction */
  animation: none !important;
}

.altar-card--destroying::before {
  /* Red corruption glow during destruction */
  content: "";
  position: absolute;
  inset: -20px;
  border-radius: 16px;
  background: radial-gradient(
    ellipse at center,
    rgba(200, 50, 50, 0.6) 0%,
    rgba(180, 30, 30, 0.3) 40%,
    transparent 70%
  );
  animation: destructionGlow 0.15s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes destructionGlow {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

/* ==========================================
   DISINTEGRATION EFFECT (Thanos snap)
   ========================================== */
.disintegration-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  overflow: visible;
}

.disintegration-container canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* During entry/exit animations, card needs high z-index to fly over everything */
.altar-card--animating {
  z-index: 9999;
  pointer-events: none;
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
   VAAL ORBS SECTION
   ========================================== */
.vaal-orbs-section {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.vaal-orbs-box {
  position: relative;
}

.vaal-toolbar {
  position: absolute !important;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  gap: 0.25rem;
}

.vaal-admin-btn,
.vaal-record-btn {
  padding: 0.5rem !important;
}

.vaal-admin-btn :deep(.runic-button__text),
.vaal-record-btn :deep(.runic-button__text) {
  display: none;
}

.vaal-record-btn--armed {
  background: rgba(255, 193, 7, 0.2) !important;
  border-color: rgba(255, 193, 7, 0.5) !important;
}

.vaal-record-btn--armed :deep(.runic-button__icon--record) {
  color: #ffc107 !important;
  animation: pulse-record 1.5s ease-in-out infinite;
}

.vaal-record-btn--recording {
  background: rgba(229, 57, 53, 0.2) !important;
  border-color: rgba(229, 57, 53, 0.5) !important;
}

.vaal-record-btn--recording :deep(.runic-button__icon--record) {
  animation: pulse-record 0.8s ease-in-out infinite;
}

@keyframes pulse-record {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  width: 48px;
  height: 48px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: grab;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.vaal-orb:active {
  cursor: grabbing;
}

.vaal-orb--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.vaal-orb--dragging {
  opacity: 0.3;
}

.vaal-orb:not(.vaal-orb--disabled):hover {
  transform: scale(1.2);
  filter: drop-shadow(0 0 12px rgba(180, 50, 50, 0.7)) 
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
}

.vaal-orb__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  transition: filter 0.2s ease;
}

/* ==========================================
   FLOATING/DRAGGED ORB - Position controlled by GSAP
   ========================================== */
.vaal-orb--floating {
  position: fixed;
  width: 64px;
  height: 64px;
  z-index: 10000;
  pointer-events: none;
  will-change: transform, left, top;
  filter: drop-shadow(0 0 15px rgba(180, 50, 50, 0.6)) 
          drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
}

.vaal-orb--floating .vaal-orb__image {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

.vaal-orb--returning {
  filter: drop-shadow(0 0 8px rgba(160, 50, 50, 0.4)) 
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.vaal-orb--returning .vaal-orb__image {
  transform: scale(0.9);
}

.vaal-orb--over-card {
  filter: drop-shadow(0 0 25px rgba(200, 50, 50, 0.8)) 
          drop-shadow(0 0 50px rgba(180, 40, 40, 0.5))
          drop-shadow(0 12px 24px rgba(0, 0, 0, 0.7));
}

.vaal-orb--over-card .vaal-orb__image {
  transform: scale(1.3);
  animation: pulseOrb 0.4s ease-in-out infinite;
}

@keyframes pulseOrb {
  0%, 100% {
    transform: scale(1.3);
  }
  50% {
    transform: scale(1.4);
  }
}

/* ==========================================
   ADMIN MODAL
   ========================================== */
.admin-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.admin-modal {
  background: linear-gradient(
    180deg,
    rgba(22, 20, 18, 0.98) 0%,
    rgba(16, 14, 12, 0.99) 100%
  );
  border: 1px solid rgba(175, 96, 37, 0.3);
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(175, 96, 37, 0.1),
    inset 0 1px 0 rgba(80, 70, 60, 0.15);
}

.admin-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.admin-modal__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Cinzel", serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
}

.admin-modal__icon {
  font-size: 1.25rem;
}

.admin-modal__content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-field__label {
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 190, 180, 0.8);
}

.admin-field__hint {
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  font-style: italic;
  color: rgba(140, 130, 120, 0.6);
  margin: 0;
}

.admin-field__number {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.admin-field__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(200, 190, 180, 0.8);
  background: linear-gradient(
    180deg,
    rgba(30, 28, 25, 0.9) 0%,
    rgba(22, 20, 18, 0.95) 100%
  );
  border: 1px solid rgba(80, 70, 60, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-field__btn:hover:not(:disabled) {
  background: linear-gradient(
    180deg,
    rgba(40, 38, 35, 0.9) 0%,
    rgba(30, 28, 25, 0.95) 100%
  );
  border-color: rgba(175, 96, 37, 0.5);
  color: var(--color-accent);
}

.admin-field__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.admin-field__value {
  min-width: 48px;
  padding: 0.5rem 0.75rem;
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-accent);
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(14, 14, 16, 0.95) 100%
  );
  border: 1px solid rgba(60, 55, 50, 0.5);
  border-radius: 4px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
}

.admin-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 1px solid rgba(60, 55, 50, 0.2);
}

.admin-info__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
}

.admin-info__label {
  color: rgba(140, 130, 120, 0.7);
}

.admin-info__value {
  color: rgba(200, 190, 180, 0.9);
}

.admin-info__value--active {
  color: var(--color-accent);
  font-weight: 600;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .admin-modal,
.modal-leave-active .admin-modal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .admin-modal,
.modal-leave-to .admin-modal {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

/* ==========================================
   RECORD STATUS
   ========================================== */
.admin-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(60, 55, 50, 0.5), transparent);
  margin: 0.5rem 0;
}

.admin-field__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.record-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  background: rgba(30, 28, 26, 0.8);
}

.record-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.record-status--armed {
  color: var(--color-warning);
}

.record-status--armed .record-status__dot {
  background: var(--color-warning);
}

.record-status--recording {
  color: var(--color-error);
}

.record-status--recording .record-status__dot {
  background: var(--color-error);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ==========================================
   SHARE MODAL
   ========================================== */
.share-modal {
  max-width: 500px;
}

.share-modal__text {
  color: rgba(200, 180, 160, 0.9);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.share-modal__url {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.share-modal__input {
  flex: 1;
  background: rgba(20, 18, 16, 0.8);
  border: 1px solid rgba(60, 55, 50, 0.5);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  color: var(--color-text);
  font-family: monospace;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.share-modal__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.share-modal__preview {
  margin-top: 1rem;
  text-align: center;
}

.share-modal__link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.share-modal__link:hover {
  color: var(--color-primary-light);
  text-decoration: underline;
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
    width: 40px;
    height: 40px;
  }

  .vaal-orb--floating {
    width: 56px;
    height: 56px;
  }
}
</style>

