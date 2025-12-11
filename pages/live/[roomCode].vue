<script setup lang="ts">
import { useLiveSpectator } from '~/composables/useLiveSpectator';
import { useAltarEffects } from '~/composables/useAltarEffects';
import { useAltarAura } from '~/composables/useAltarAura';
import { useVaalOutcomes } from '~/composables/useVaalOutcomes';
import { useDisintegrationEffect } from '~/composables/useDisintegrationEffect';
import { getCardById } from '~/data/mockCards';
import { TIER_CONFIG, isCardFoil } from '~/types/card';
import type { Card, CardTier } from '~/types/card';
import { getTierColors } from '~/constants/colors';
import gsap from 'gsap';
import html2canvas from 'html2canvas';

useHead({ title: 'Live - Le Collecteur de Dose' });

const route = useRoute();
const router = useRouter();

const {
  isConnected,
  isConnecting,
  error,
  roomClosed,
  hostDisconnected,
  isHostPresent,
  hostName,
  hostAvatar,
  spectatorCount,
  currentCard,
  isVaalActive,
  vaalPosition,
  lastOutcome,
  joinRoom,
  disconnect,
} = useLiveSpectator();

// Refs
const altarCardRef = ref<HTMLElement | null>(null);
const cardFrontRef = ref<HTMLElement | null>(null);
const cardSlotRef = ref<HTMLElement | null>(null);
const altarPlatformRef = ref<HTMLElement | null>(null);

const hasAttemptedJoin = ref(false);
const showOutcome = ref(false);
const isCardBeingDestroyed = ref(false);
const isAnimating = ref(false);
const isCardAnimatingIn = ref(false);
const isCardAnimatingOut = ref(false);
const isCardOnAltar = ref(false);

// Computed card data from currentCard info
const cardData = ref<Card | null>(null);

// ==========================================
// CARD ENTRY/EXIT ANIMATIONS (same as altar)
// ==========================================

// Get random entry direction (from outside viewport)
const getRandomEntryPoint = () => {
  const side = Math.floor(Math.random() * 4);
  const spin = (Math.random() - 0.5) * 540; // 1.5 spins max
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

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

// Get random exit direction
const getRandomExitPoint = () => {
  const angle = Math.random() * Math.PI * 2;
  const distance = typeof window !== 'undefined' 
    ? Math.max(window.innerWidth, window.innerHeight) + 200 
    : 2000;
  const spin = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540);

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    rotation: spin,
  };
};

// Animate card flying in from outside the screen
const animateCardIn = async () => {
  isAnimating.value = true;
  isCardAnimatingIn.value = true;
  showOutcome.value = false;
  
  await nextTick();
  isCardOnAltar.value = true;
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

    // Fly in and land on altar
    await new Promise<void>((resolve) => {
      gsap.to(altarCardRef.value, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.85,
        ease: 'expo.out',
        onComplete: () => {
          isCardAnimatingIn.value = false;
          isAnimating.value = false;
          
          // Capture snapshot after landing
          setTimeout(() => {
            captureCardSnapshot();
          }, 100);
          
          resolve();
        },
      });
    });
  } else {
    isCardAnimatingIn.value = false;
    isAnimating.value = false;
  }
};

// Animate card flying out of the screen
const animateCardOut = async () => {
  if (!altarCardRef.value) return;

  isCardAnimatingOut.value = true;

  const exit = getRandomExitPoint();

  await new Promise<void>((resolve) => {
    gsap.to(altarCardRef.value, {
      x: exit.x,
      y: exit.y,
      rotation: exit.rotation,
      duration: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        isCardAnimatingOut.value = false;
        isCardOnAltar.value = false;
        resolve();
      },
    });
  });
  
  clearSnapshots();
};

// Track previous card to handle transitions
let previousCardId: string | null = null;

// Update cardData when currentCard changes with animations
watch(currentCard, async (newCard, oldCard) => {
  // Card removed - animate out
  if (!newCard && oldCard && isCardOnAltar.value && !isAnimating.value) {
    await animateCardOut();
    cardData.value = null;
    showOutcome.value = false;
    previousCardId = null;
    return;
  }
  
  if (!newCard) {
    cardData.value = null;
    isCardOnAltar.value = false;
    showOutcome.value = false;
    previousCardId = null;
    return;
  }
  
  const card = getCardById(newCard.cardId);
  if (!card) return;
  
  const newCardWithFoil = {
    ...card,
    foil: newCard.cardFoil,
  };
  
  // If there's a card on altar and it's a different card, animate out first
  if (isCardOnAltar.value && previousCardId && previousCardId !== newCard.cardId && !isAnimating.value) {
    await animateCardOut();
  }
  
  // Set the new card data
  cardData.value = newCardWithFoil;
  previousCardId = newCard.cardId;
  
  // Animate card in if not already on altar
  if (!isCardOnAltar.value && !isAnimating.value) {
    await animateCardIn();
  }
}, { immediate: true });

// Cursor position as refs for the altar effects composable
const cursorX = ref(0);
const cursorY = ref(0);

// Update cursor position when vaal position changes
watch(vaalPosition, (pos) => {
  if (pos && altarCardRef.value) {
    const cardRect = altarCardRef.value.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    cursorX.value = cardCenterX + pos.x;
    cursorY.value = cardCenterY + pos.y;
  }
}, { immediate: true });

// Use shared altar effects composable
const {
  heartbeatIntensity,
  isOrbOverCard,
  heartbeatStyles,
  getAltarClasses,
  getCardClasses,
  resetEffects,
  earthquakeHeaderStyles,
  earthquakeBodyStyles,
  getEarthquakeClasses,
} = useAltarEffects({
  cardRef: altarCardRef,
  cursorX,
  cursorY,
  isActive: isVaalActive,
  isDestroying: isCardBeingDestroyed,
});

// Computed classes for earthquake effect
const headerEarthquakeClasses = computed(() => getEarthquakeClasses('header'));
const bodyEarthquakeClasses = computed(() => getEarthquakeClasses('body'));

// Global earthquake effect on html element
watch(isOrbOverCard, (isOver) => {
  if (typeof document !== 'undefined') {
    if (isOver) {
      document.documentElement.classList.add('earthquake-global');
    } else {
      document.documentElement.classList.remove('earthquake-global');
    }
  }
});

const tierConfig = computed(() => {
  if (!cardData.value) return TIER_CONFIG.T3;
  return TIER_CONFIG[cardData.value.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.T3;
});

const isCurrentCardFoil = computed(() => {
  if (!cardData.value) return false;
  return isCardFoil(cardData.value);
});

// Altar classes using shared function
const altarClasses = computed(() => getAltarClasses(
  { tier: cardData.value?.tier, foil: isCurrentCardFoil.value },
  !!cardData.value
));

// Card classes using shared function
const cardClasses = computed(() => getCardClasses(!!cardData.value, isAnimating.value));

// Altar Aura Effect
useAltarAura({
  containerRef: altarPlatformRef,
  isActive: computed(() => !!cardData.value),
  isVaalMode: isOrbOverCard,
  tier: computed(() => cardData.value?.tier),
  isFoil: isCurrentCardFoil,
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

const findCardImageElement = () => findCardImageElementBase(cardFrontRef);
const captureCardSnapshot = () => captureCardSnapshotBase(cardFrontRef);

// Computed result card for transform outcomes
const resultCard = computed<Card | null>(() => {
  if (!lastOutcome.value?.resultCardId) return null;
  return getCardById(lastOutcome.value.resultCardId) || null;
});

// Vaal Outcomes - animations for foil, transform, duplicate (in visual-only mode)
const {
  executeNothing: executeNothingEffect,
  executeFoil: executeFoilEffect,
  executeTransform: executeTransformEffect,
  executeDuplicate: executeDuplicateEffect,
} = useVaalOutcomes({
  cardRef: altarCardRef,
  displayCard: cardData,
  isAnimating,
  visualOnly: true,
  resultCard,
});

// Note: Snapshot capture is now handled in animateCardIn after card lands

// Handle outcome animation when received
watch(lastOutcome, async (outcome) => {
  if (!outcome || !altarCardRef.value) return;
  
  resetEffects();
  
  switch (outcome.outcome) {
    case 'nothing':
      await executeNothingEffect();
      break;
      
    case 'foil':
      await executeFoilEffect();
      if (cardData.value) {
        cardData.value = { ...cardData.value, foil: true };
      }
      break;
      
    case 'destroyed':
      await destroyCardEffect();
      break;
      
    case 'transform':
      await executeTransformEffect();
      break;
      
    case 'duplicate':
      await executeDuplicateEffect();
      break;
  }
  
  setTimeout(() => {
    showOutcome.value = true;
  }, 800);
});

// Destroy card effect (same as replay)
const destroyCardEffect = async () => {
  if (!altarCardRef.value) return;
  
  isCardBeingDestroyed.value = true;
  
  const shakeTl = gsap.timeline();
  for (let i = 0; i < 6; i++) {
    shakeTl.to(altarCardRef.value, {
      x: (i % 2 === 0 ? -1 : 1) * (4 + i),
      duration: 0.04,
      ease: 'none',
    });
  }
  shakeTl.to(altarCardRef.value, { x: 0, duration: 0.03 });
  
  gsap.to(altarCardRef.value, {
    filter: 'brightness(1.5) sepia(0.4) saturate(1.2)',
    duration: 0.25,
  });
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const cardSlot = cardSlotRef.value;
  if (!cardSlot) {
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise(resolve => setTimeout(resolve, 500));
    isCardBeingDestroyed.value = false;
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
      
      const imgContainer = document.createElement('div');
      imgContainer.className = 'disintegration-container';
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
      
      const cardContainer = document.createElement('div');
      cardContainer.className = 'disintegration-container';
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
    if (altarCardRef.value) {
      gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isCardBeingDestroyed.value = false;
};

// Join room on mount
onMounted(async () => {
  const roomCode = route.params.roomCode as string;
  
  if (!roomCode) {
    hasAttemptedJoin.value = true;
    return;
  }

  const user = {
    id: `spectator-${Date.now()}`,
    name: 'Spectateur',
    avatar: null,
  };

  hasAttemptedJoin.value = true;
  await joinRoom(roomCode, user);
});

const goToAltar = () => {
  router.push('/altar');
};

// Get outcome text
const getOutcomeText = (outcome: string) => {
  switch (outcome) {
    case 'nothing': return 'Rien ne s\'est passé...';
    case 'foil': return 'Transformation en Foil !';
    case 'destroyed': return 'Carte détruite...';
    case 'transform': return 'Carte transformée !';
    case 'duplicate': return 'Duplication !';
    default: return '';
  }
};

const getOutcomeClass = (outcome: string) => {
  return `outcome--${outcome}`;
};

// Cleanup
onBeforeUnmount(() => {
  disconnect();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('earthquake-global');
  }
});
</script>

<template>
  <NuxtLayout name="live">
    <div class="live-page">
      <!-- Connecting State -->
      <div v-if="isConnecting" class="live-state">
        <RunicBox padding="lg" class="live-state-box">
          <div class="live-loading">
            <div class="live-loading__spinner"></div>
            <p class="live-loading__text">Connexion au live...</p>
          </div>
        </RunicBox>
      </div>
      
      <!-- Room Closed State -->
      <div v-else-if="roomClosed" class="live-state">
        <RunicBox padding="lg" class="live-state-box">
          <div class="live-closed">
            <img src="/images/card-back-logo.png" alt="Vaal Orb" class="live-closed__icon" />
            <h2 class="live-closed__title">
              {{ hostDisconnected ? "L'hôte s'est déconnecté" : "Le live est terminé" }}
            </h2>
            <p class="live-closed__message">
              {{ hostDisconnected 
                ? "La connexion avec l'hôte a été perdue." 
                : "L'hôte a fermé la room. Merci d'avoir regardé !" 
              }}
            </p>
            <RunicButton variant="primary" @click="goToAltar">
              Aller à l'autel
            </RunicButton>
          </div>
        </RunicBox>
      </div>

      <!-- Error State -->
      <div v-else-if="error && hasAttemptedJoin" class="live-state">
        <RunicBox padding="lg" class="live-state-box">
          <div class="live-error">
            <img src="/images/card-back-logo.png" alt="Vaal Orb" class="live-error__icon" />
            <h2 class="live-error__title">Room introuvable</h2>
            <p class="live-error__message">{{ error }}</p>
            <RunicButton variant="primary" @click="goToAltar">
              Découvrir l'autel
            </RunicButton>
          </div>
        </RunicBox>
      </div>
      
      <!-- Live Content -->
      <div 
        v-else-if="isConnected" 
        class="live-content"
        :class="bodyEarthquakeClasses"
        :style="earthquakeBodyStyles"
      >
        <!-- Header -->
        <RunicBox 
          padding="sm" 
          class="live-header-box"
          :class="headerEarthquakeClasses"
          :style="earthquakeHeaderStyles"
        >
          <div class="live-header">
            <div class="live-header__host">
              <div class="live-badge">
                <span class="live-badge__dot"></span>
                <span class="live-badge__text">LIVE</span>
              </div>
              <img 
                v-if="hostAvatar" 
                :src="hostAvatar" 
                :alt="hostName" 
                class="live-header__avatar"
              />
              <span class="live-header__name">{{ hostName }}</span>
            </div>
            <RunicNumber 
              :value="spectatorCount" 
              label="spectateurs"
              size="sm"
            />
          </div>
        </RunicBox>

        <!-- Stage Area -->
        <main class="live-stage">
          <!-- Empty State -->
          <div v-if="!cardData" class="live-waiting">
            <RunicBox padding="lg" class="live-waiting-box">
              <div class="live-waiting__content">
                <img src="/images/card-back-logo.png" alt="Vaal Orb" class="live-waiting__orb" />
                <p class="live-waiting__text">En attente de l'hôte...</p>
                <p class="live-waiting__subtext">Le streamer va bientôt placer une carte sur l'autel</p>
              </div>
            </RunicBox>
          </div>

          <!-- Altar -->
          <div 
            v-else
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

            <div ref="cardSlotRef" class="altar-card-slot" :class="{ 'altar-card-slot--active': isCardOnAltar }">
              <div
                v-if="isCardOnAltar && cardData"
                ref="altarCardRef"
                class="altar-card"
                :class="{
                  'altar-card--animating': isCardAnimatingIn || isCardAnimatingOut,
                  'altar-card--heartbeat': !isCardAnimatingIn && !isCardAnimatingOut && !isCardBeingDestroyed && !isAnimating,
                  'altar-card--panicking': isVaalActive && !isCardAnimatingIn && !isCardAnimatingOut,
                  'altar-card--destroying': isCardBeingDestroyed,
                }"
                :style="heartbeatStyles"
              >
                <div ref="cardFrontRef" class="altar-card__face altar-card__face--front">
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
        
        <!-- Outcome Panel -->
        <Transition name="outcome">
          <RunicBox 
            v-if="showOutcome && lastOutcome" 
            padding="md" 
            class="live-outcome-box" 
            :class="getOutcomeClass(lastOutcome.outcome)"
          >
            <div class="live-outcome">
              <div class="live-outcome__badge">
                <img 
                  src="/images/card-back-logo.png" 
                  alt="Vaal" 
                  class="live-outcome__badge-img"
                />
              </div>
              <div class="live-outcome__content">
                <h3 class="live-outcome__title">{{ getOutcomeText(lastOutcome.outcome) }}</h3>
              </div>
            </div>
          </RunicBox>
        </Transition>
      </div>

      <!-- Vaal Orb Cursor (when active) -->
      <div 
        v-if="isConnected && isVaalActive && vaalPosition && cardData"
        class="live-cursor"
        :style="{
          left: `${cursorX}px`,
          top: `${cursorY}px`,
        }"
      >
        <div class="live-cursor__tag">
          <img 
            :src="hostAvatar || 'https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png'" 
            :alt="hostName"
            class="live-cursor__tag-avatar"
          />
          <span class="live-cursor__tag-name">{{ hostName }}</span>
        </div>
        <div class="live-cursor__orb">
          <img 
            src="/images/card-back-logo.png" 
            alt="Vaal Orb" 
            class="live-cursor__orb-img"
          />
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* ===== LAYOUT ===== */
.live-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.live-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  overflow: hidden;
}

/* ===== STATES ===== */
.live-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.live-state-box {
  max-width: 400px;
  width: 100%;
}

.live-loading,
.live-error,
.live-closed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
}

.live-loading__spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(175, 96, 37, 0.2);
  border-top-color: #af6025;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.live-loading__text {
  font-family: "Cinzel", serif;
  color: rgba(200, 180, 160, 0.8);
  font-size: 1rem;
}

.live-error__icon,
.live-closed__icon {
  width: 64px;
  height: 64px;
  opacity: 0.6;
  filter: grayscale(0.5);
}

.live-error__title,
.live-closed__title {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  color: rgba(200, 180, 160, 0.95);
  margin: 0;
}

.live-error__message,
.live-closed__message {
  color: rgba(180, 160, 140, 0.7);
  font-size: 0.95rem;
  margin: 0;
}

/* ===== HEADER ===== */
.live-header-box {
  flex-shrink: 0;
}

.live-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.live-header__host {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: rgba(220, 50, 50, 0.15);
  border: 1px solid rgba(220, 50, 50, 0.4);
  border-radius: 4px;
}

.live-badge__dot {
  width: 8px;
  height: 8px;
  background: #e05050;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-badge__text {
  font-family: "Cinzel", serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: #e05050;
  letter-spacing: 0.05em;
}

.live-header__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(175, 96, 37, 0.5);
}

.live-header__name {
  font-family: "Cinzel", serif;
  font-weight: 600;
  color: rgba(200, 180, 160, 0.95);
  font-size: 1rem;
}

/* ===== STAGE ===== */
.live-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  overflow: visible;
}

.live-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-waiting-box {
  max-width: 400px;
}

.live-waiting__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.live-waiting__orb {
  width: 80px;
  height: 80px;
  opacity: 0.4;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.live-waiting__text {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  color: rgba(200, 180, 160, 0.8);
  margin: 0;
}

.live-waiting__subtext {
  font-size: 0.9rem;
  color: rgba(150, 140, 130, 0.6);
  margin: 0;
}

/* ===== OUTCOME ===== */
.live-outcome-box {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.live-outcome {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.live-outcome__badge {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.live-outcome__badge-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(180, 50, 50, 0.4));
}

.live-outcome__content {
  flex: 1;
  min-width: 0;
}

.live-outcome__title {
  font-family: "Cinzel", serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(200, 180, 160, 0.9);
  margin: 0;
}

/* Outcome Variants */
.outcome--nothing .live-outcome__badge-img {
  filter: grayscale(0.5) opacity(0.6);
}

.outcome--foil .live-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6)) brightness(1.2);
}

.outcome--foil .live-outcome__title {
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}

.outcome--destroyed .live-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(200, 50, 50, 0.7)) saturate(1.5);
}

.outcome--destroyed .live-outcome__title {
  color: #e05050;
}

.outcome--transform .live-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(80, 176, 224, 0.7)) brightness(1.1);
}

.outcome--transform .live-outcome__title {
  color: #50b0e0;
}

.outcome--duplicate .live-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(80, 224, 160, 0.7)) brightness(1.2);
}

.outcome--duplicate .live-outcome__title {
  color: #50e0a0;
}

/* ===== CURSOR ===== */
.live-cursor {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.live-cursor__tag {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(15, 13, 11, 0.95);
  border: 1px solid rgba(175, 96, 37, 0.5);
  border-radius: 20px;
  padding: 0.2rem 0.625rem 0.2rem 0.2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.live-cursor__tag-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(175, 96, 37, 0.4);
}

.live-cursor__tag-name {
  font-family: "Cinzel", serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(175, 96, 37, 0.95);
  white-space: nowrap;
}

.live-cursor__orb {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-cursor__orb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(180, 50, 50, 0.7)) drop-shadow(0 0 20px rgba(180, 50, 50, 0.3));
  animation: orbPulse 0.8s ease-in-out infinite;
}

@keyframes orbPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* ===== ALTAR PLATFORM ===== */
.altar-platform {
  position: relative;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    radial-gradient(ellipse at center, rgba(20, 18, 16, 0.95) 0%, rgba(12, 11, 10, 0.98) 70%),
    linear-gradient(135deg, rgba(30, 25, 20, 0.9) 0%, rgba(15, 13, 11, 0.95) 100%);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(60, 55, 50, 0.05),
    0 15px 40px rgba(0, 0, 0, 0.5);
    
  transition: box-shadow 0.6s ease, background 0.6s ease;
}

.altar-platform--active.altar-platform--t0 {
  --altar-accent: #c9a227;
  --altar-rune-color: rgba(201, 162, 39, 0.6);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(109, 90, 42, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(201, 162, 39, 0.08);
}

.altar-platform--active.altar-platform--t1 {
  --altar-accent: #7a6a8a;
  --altar-rune-color: rgba(122, 106, 138, 0.6);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(58, 52, 69, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 35px rgba(122, 106, 138, 0.06);
}

.altar-platform--active.altar-platform--t2 {
  --altar-accent: #5a7080;
  --altar-rune-color: rgba(90, 112, 128, 0.6);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(58, 69, 80, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(90, 112, 128, 0.05);
}

.altar-platform--active.altar-platform--t3 {
  --altar-accent: #5a5a5d;
  --altar-rune-color: rgba(90, 90, 93, 0.5);
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.7),
    inset 0 -4px 20px rgba(42, 42, 45, 0.08),
    0 15px 40px rgba(0, 0, 0, 0.5);
}

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

/* Vaal Theme */
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

.altar-platform::after {
  content: "";
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: transparent;
  opacity: 0;
  transition: opacity 0.4s ease, box-shadow 0.4s ease;
  pointer-events: none;
  z-index: -1;
}

.altar-platform--active.altar-platform--vaal::before {
  opacity: 1;
}

.altar-platform--active.altar-platform--vaal::after {
  opacity: 1;
  box-shadow: 
    inset 0 0 30px rgba(200, 50, 50, 0.3),
    inset 0 0 60px rgba(150, 30, 30, 0.2);
  animation: vaalInnerGlow 0.6s ease-in-out infinite;
}

.altar-platform--active.altar-platform--vaal {
  --altar-accent: #c83232;
  --altar-rune-color: rgba(200, 50, 50, 0.8);
}

@keyframes vaalInnerGlow {
  0%, 100% {
    box-shadow: 
      inset 0 0 30px rgba(200, 50, 50, 0.3),
      inset 0 0 60px rgba(150, 30, 30, 0.2);
  }
  50% {
    box-shadow: 
      inset 0 0 40px rgba(220, 60, 60, 0.4),
      inset 0 0 80px rgba(180, 40, 40, 0.25);
  }
}

@keyframes foilGlowSubtle {
  0%, 100% {
    box-shadow: 
      inset 0 8px 30px rgba(0, 0, 0, 0.7),
      0 0 50px rgba(180, 160, 255, 0.1);
  }
  50% {
    box-shadow: 
      inset 0 8px 30px rgba(0, 0, 0, 0.7),
      0 0 60px rgba(255, 180, 200, 0.15);
  }
}

/* Circles */
.altar-circle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  transition: border-color 0.4s ease, opacity 0.4s ease, filter 0.4s ease;
  z-index: 1;
}

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

/* Foil circles */
.altar-platform--active.altar-platform--foil .altar-circle--outer {
  animation: rotateCircle 60s linear infinite, foilCircle 4s ease-in-out infinite;
}

.altar-platform--active.altar-platform--foil .altar-circle--middle {
  animation: rotateCircle 45s linear infinite reverse, foilCircle 4s ease-in-out infinite 0.5s;
}

.altar-platform--active.altar-platform--foil .altar-circle--inner {
  animation: rotateCircle 30s linear infinite, foilCircle 4s ease-in-out infinite 1s;
}

/* Vaal circles */
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

/* Runes */
.altar-rune {
  position: absolute;
  font-size: 1rem;
  color: var(--altar-rune-color);
  opacity: 0;
  transition: opacity 0.6s ease, color 0.4s ease, text-shadow 0.4s ease;
  text-shadow: 0 0 8px var(--altar-accent);
}

.altar-platform--active .altar-rune {
  opacity: 1;
  animation: runeGlow 3s ease-in-out infinite;
}

.altar-rune--n { top: 15px; left: 50%; transform: translateX(-50%); }
.altar-rune--e { right: 15px; top: 50%; transform: translateY(-50%); }
.altar-rune--s { bottom: 15px; left: 50%; transform: translateX(-50%); }
.altar-rune--w { left: 15px; top: 50%; transform: translateY(-50%); }

@keyframes runeGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Card Slot */
.altar-card-slot {
  position: relative;
  z-index: 2;
  width: 180px;
  height: 252px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Card */
.altar-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  perspective: 1000px;
}

.altar-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 8px;
}

.altar-card__face--front {
  transform: rotateY(0deg);
  transform-style: preserve-3d;
}

.altar-card__game-card-wrapper {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.altar-card__game-card-wrapper :deep(.game-card-container) {
  width: 100%;
  height: 100%;
}

/* Card Animation States */
.altar-card--animating {
  /* No heartbeat during entry/exit animations */
  animation: none !important;
}

/* Heartbeat Animation */
.altar-card--heartbeat {
  animation: cardHeartbeat var(--heartbeat-speed, 1s) ease-in-out infinite;
}

.altar-card--panicking {
  animation: cardHeartbeatPanic var(--heartbeat-speed, 0.5s) ease-in-out infinite;
}

/* Panic glow effect */
.altar-card--panicking::before {
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 12px;
  background: radial-gradient(
    ellipse at center,
    rgba(180, 50, 50, calc(var(--heartbeat-glow-intensity, 0.5) * 0.5)) 0%,
    rgba(160, 40, 40, calc(var(--heartbeat-glow-intensity, 0.5) * 0.25)) 40%,
    transparent 70%
  );
  pointer-events: none;
  z-index: -1;
  animation: heartbeatGlow var(--heartbeat-speed, 0.5s) ease-in-out infinite;
}

@keyframes cardHeartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(var(--heartbeat-scale, 1.02)); }
}

@keyframes cardHeartbeatPanic {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(var(--heartbeat-scale, 1.04)); }
}

@keyframes heartbeatGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.altar-card--destroying {
  animation: none !important;
}

.altar-card--destroying::before {
  display: none;
}

/* Disintegration Effect */
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
@media (max-width: 640px) {
  .live-content {
    padding: 1rem;
    gap: 1rem;
  }

  .live-header {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }

  .live-header__host {
    justify-content: center;
  }

  .altar-platform {
    width: 250px;
    height: 250px;
  }

  .altar-card-slot {
    width: 150px;
    height: 210px;
  }
}
</style>
