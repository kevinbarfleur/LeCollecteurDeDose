<script setup lang="ts">
import { useReplayPlayer } from "~/composables/useReplayPlayer";
import { useAltarEffects } from "~/composables/useAltarEffects";
import { useDisintegrationEffect } from "~/composables/useDisintegrationEffect";
import { getCardById } from "~/data/mockCards";
import { TIER_CONFIG, isCardFoil } from "~/types/card";
import gsap from "gsap";
import html2canvas from "html2canvas";

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
  views,
  createdAt,
  error: playerError,
  setCardRef,
  loadFromId,
  play,
  reset
} = useReplayPlayer();

const altarCardRef = ref<HTMLElement | null>(null);
const cardFrontRef = ref<HTMLElement | null>(null);
const cardSlotRef = ref<HTMLElement | null>(null);
const vaalOrbRef = ref<HTMLElement | null>(null);

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
  isDestroying: isCardBeingDestroyed
});

// Computed classes for earthquake effect on different UI sections
const headerEarthquakeClasses = computed(() => getEarthquakeClasses("header"));
const outcomeEarthquakeClasses = computed(() => getEarthquakeClasses("vaalSection"));
const bodyEarthquakeClasses = computed(() => getEarthquakeClasses("body"));

// Global earthquake effect on html element (affects header, footer, entire page)
watch(isOrbOverCard, (isOver) => {
  if (typeof document !== "undefined") {
    if (isOver) {
      document.documentElement.classList.add("earthquake-global");
    } else {
      document.documentElement.classList.remove("earthquake-global");
    }
  }
});

// Cleanup on unmount
onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("earthquake-global");
  }
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
  return TIER_CONFIG[cardData.value.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.T3;
});

const isCurrentCardFoil = computed(() => {
  if (!cardData.value) return false;
  return isCardFoil(cardData.value);
});

// Use the shared getAltarClasses function
const altarClasses = computed(() => getAltarClasses(
  { tier: cardData.value?.tier, foil: isCurrentCardFoil.value },
  isLoaded.value
));

// Card classes using the shared function
const cardClasses = computed(() => getCardClasses(isLoaded.value, false));

const formattedDate = computed(() => {
  if (!createdAt.value) return '';
  return new Date(createdAt.value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
        foil: cardInfo.value.foil
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
  resetEffects();
  
  cardSnapshot.value = null;
  imageSnapshot.value = null;
  capturedImageDimensions.value = null;
  capturedCardDimensions.value = null;
  
  if (vaalOrbRef.value) {
    gsap.set(vaalOrbRef.value, { opacity: 1, scale: 1 });
  }
  
  if (altarCardRef.value) {
    gsap.set(altarCardRef.value, { opacity: 1, scale: 1, filter: "brightness(1) saturate(1)", x: 0, y: 0 });
  }
  
  await captureCardSnapshot();
  
  play(() => {
    triggerOutcome();
  });
};

const triggerOutcome = async () => {
  if (!outcome.value || !altarCardRef.value) return;
  
  resetEffects();
  
  if (vaalOrbRef.value) {
    await new Promise<void>((resolve) => {
      gsap.to(vaalOrbRef.value, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
        onComplete: resolve
      });
    });
  }
  
  switch (outcome.value) {
    case 'nothing':
      await showNothingEffect();
      break;
      
    case 'foil':
      await transformToFoilEffect();
      break;
      
    case 'destroyed':
      await destroyCardEffect();
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
  
  await new Promise(resolve => setTimeout(resolve, 400));
};

const transformToFoilEffect = async () => {
  if (!altarCardRef.value) return;
  
  gsap.to(altarCardRef.value, {
    filter: "brightness(1.8) saturate(1.5)",
    scale: 1.05,
    duration: 0.2,
    ease: "power2.in",
  });
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  gsap.to(altarCardRef.value, {
    filter: "brightness(3) saturate(2)",
    scale: 1.1,
    duration: 0.1,
    ease: "power2.out",
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (cardData.value) {
    cardData.value = { ...cardData.value, foil: true };
  }
  
  gsap.to(altarCardRef.value, {
    filter: "brightness(1) saturate(1)",
    scale: 1,
    duration: 0.4,
    ease: "power2.out",
  });
  
  await new Promise(resolve => setTimeout(resolve, 400));
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
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const cardSlot = cardSlotRef.value;
  if (!cardSlot) {
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise(resolve => setTimeout(resolve, 500));
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
};

const restartReplay = () => {
  window.location.reload();
};

const goToAltar = () => {
  router.push('/altar');
};

const outcomeText = computed(() => {
  switch (outcome.value) {
    case 'nothing': return 'Rien ne s\'est passé';
    case 'foil': return 'Transformation en Foil !';
    case 'destroyed': return 'Carte détruite...';
    default: return '';
  }
});

const outcomeClass = computed(() => {
  switch (outcome.value) {
    case 'nothing': return 'outcome--nothing';
    case 'foil': return 'outcome--foil';
    case 'destroyed': return 'outcome--destroyed';
    default: return '';
  }
});

const getCardName = () => {
  if (!cardInfo.value) return '';
  const card = getCardById(cardInfo.value.id);
  return card?.name || cardInfo.value.id;
};


const getTierColor = (): 'default' | 't0' | 't1' | 't2' | 't3' => {
  if (!cardInfo.value?.tier) return 'default';
  const tier = cardInfo.value.tier.toLowerCase();
  if (tier === 't0' || tier === 't1' || tier === 't2' || tier === 't3') {
    return tier as 't0' | 't1' | 't2' | 't3';
  }
  return 'default';
};

</script>

<template>
  <NuxtLayout name="replay">
    <div class="replay-page">
      <!-- Loading State -->
      <div v-if="isLoading" class="replay-state">
        <div class="replay-loading">
          <div class="replay-loading__spinner"></div>
          <p class="replay-loading__text">Chargement du replay...</p>
        </div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="hasError || playerError" class="replay-state">
        <div class="replay-error">
          <img src="/images/card-back-logo.png" alt="Vaal Orb" class="replay-error__icon" />
          <h2 class="replay-error__title">Replay introuvable</h2>
          <p class="replay-error__message">{{ playerError || 'Ce replay n\'existe pas ou a été supprimé.' }}</p>
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
          class="replay-header-box"
          :class="headerEarthquakeClasses"
          :style="earthquakeHeaderStyles"
        >
          <div class="replay-header">
            <div class="replay-header__user">
              <img 
                v-if="userAvatar" 
                :src="userAvatar" 
                :alt="username" 
                class="replay-header__avatar"
              />
              <div class="replay-header__info">
                <span class="replay-header__name">{{ username }}</span>
                <span class="replay-header__label">a utilisé une Vaal Orb</span>
              </div>
            </div>
            <RunicNumber 
              v-if="views" 
              :value="views" 
              label="vues"
              size="sm"
            />
          </div>
        </RunicBox>

        <!-- Main Stage -->
        <main class="replay-stage">
          <div 
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

            <div ref="cardSlotRef" class="altar-card-slot altar-card-slot--active">
              <div
                v-if="cardData"
                ref="altarCardRef"
                class="altar-card"
                :class="cardClasses"
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
            v-if="showOutcome" 
            padding="md" 
            class="replay-outcome-box" 
            :class="[outcomeClass, outcomeEarthquakeClasses]"
            :style="earthquakeVaalStyles"
          >
            <div class="replay-outcome">
              <div class="replay-outcome__badge">
                <img src="/images/card-back-logo.png" alt="Vaal Orb" class="replay-outcome__badge-img" />
              </div>
              
              <div class="replay-outcome__content">
                <h3 class="replay-outcome__title">{{ outcomeText }}</h3>
                
                <div class="replay-outcome__card">
                  <div class="replay-outcome__card-info">
                    <span class="replay-outcome__card-name">{{ getCardName() }}</span>
                    <RunicNumber 
                      :value="cardInfo?.tier || ''" 
                      :color="getTierColor()"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              
              <div class="replay-outcome__actions">
                <RunicButton variant="ghost" size="sm" @click="restartReplay">
                  Revoir
                </RunicButton>
                <RunicButton variant="primary" size="sm" @click="goToAltar">
                  Essayer l'autel
                </RunicButton>
              </div>
            </div>
          </RunicBox>
        </Transition>
        
      </div>
      
      <!-- Animated Cursor with Vaal Orb - OUTSIDE replay-content to avoid earthquake transform interference -->
      <div 
        v-if="isPlaying && isLoaded"
        ref="vaalOrbRef"
        class="replay-cursor"
        :style="{
          left: `${cursorX}px`,
          top: `${cursorY}px`
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
          <img src="/images/card-back-logo.png" alt="Vaal Orb" class="replay-cursor__orb-img" />
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* ===== PAGE LAYOUT ===== */
.replay-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* ===== LOADING STATE ===== */
.replay-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.replay-loading__spinner {
  width: 48px;
  height: 48px;
  border: 2px solid rgba(60, 55, 50, 0.2);
  border-top-color: rgba(175, 96, 37, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.replay-loading__text {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: rgba(200, 180, 160, 0.6);
  margin: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== ERROR STATE ===== */
.replay-error {
  text-align: center;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.replay-error__icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  filter: grayscale(0.4) opacity(0.6);
}

.replay-error__title {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  color: rgba(200, 180, 160, 0.9);
  margin: 0 0 0.75rem;
}

.replay-error__message {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: rgba(200, 180, 160, 0.5);
  margin: 0 0 2rem;
  line-height: 1.5;
}

/* ===== HEADER ===== */
.replay-header-box {
  width: 100%;
}

.replay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.replay-header__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.replay-header__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(175, 96, 37, 0.5);
  object-fit: cover;
  box-shadow: 0 0 8px rgba(175, 96, 37, 0.2);
}

.replay-header__info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.replay-header__name {
  font-family: "Cinzel", serif;
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 450px;
}

/* ALTAR PLATFORM */
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

  background: radial-gradient(
      ellipse at center,
      rgba(25, 23, 20, 0.6) 0%,
      rgba(18, 16, 14, 0.8) 50%,
      rgba(10, 9, 8, 0.95) 100%
    ),
    linear-gradient(180deg, rgba(20, 18, 15, 0.9) 0%, rgba(12, 10, 8, 0.95) 100%);

  border-radius: 50%;
  
  box-shadow: 
    inset 0 8px 30px rgba(0, 0, 0, 0.8),
    inset 0 -4px 20px rgba(40, 35, 30, 0.08),
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

.altar-platform--active.altar-platform--vaal::before {
  opacity: 1;
}

.altar-platform--active.altar-platform--vaal::after {
  opacity: 1;
  animation-play-state: running;
}

.altar-platform--active.altar-platform--vaal {
  --altar-accent: #c83232;
  --altar-rune-color: rgba(200, 50, 50, 0.8);
}

@keyframes vaalGlowPulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.08); opacity: 1; }
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

/* Heartbeat Animation */
.altar-card--heartbeat {
  animation: cardHeartbeat var(--heartbeat-speed, 1s) ease-in-out infinite;
}

.altar-card--panicking {
  animation: cardHeartbeat var(--heartbeat-speed, 0.5s) ease-in-out infinite;
}

@keyframes cardHeartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(var(--heartbeat-scale, 1.02)); }
}

.altar-card--destroying {
  animation: none !important;
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

/* ===== OUTCOME PANEL ===== */
.replay-outcome-box {
  width: 100%;
}

.replay-outcome {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.replay-outcome__badge {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.replay-outcome__badge-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(180, 50, 50, 0.4));
}

.replay-outcome__content {
  flex: 1;
  min-width: 0;
}

.replay-outcome__title {
  font-family: "Cinzel", serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(200, 180, 160, 0.9);
  margin: 0 0 0.75rem;
}

.replay-outcome__card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.replay-outcome__card-visual {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 9, 8, 0.8);
  border: 1px solid rgba(50, 45, 40, 0.4);
  border-radius: 4px;
  flex-shrink: 0;
}

.replay-outcome__card-img {
  max-width: 40px;
  max-height: 40px;
  object-fit: contain;
}

.replay-outcome__card-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.replay-outcome__card-name {
  font-family: "Cinzel", serif;
  font-size: 0.95rem;
  color: rgba(200, 180, 160, 0.85);
}

.replay-outcome__actions {
  display: flex;
  gap: 0.625rem;
  flex-shrink: 0;
}

/* Outcome Variants */
.outcome--nothing .replay-outcome__badge-img {
  filter: grayscale(0.5) opacity(0.6);
}

.outcome--foil .replay-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6)) brightness(1.2);
}

.outcome--foil .replay-outcome__title {
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}

.outcome--foil .replay-outcome__card-visual {
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.2);
}

.outcome--destroyed .replay-outcome__badge-img {
  filter: drop-shadow(0 0 8px rgba(200, 50, 50, 0.7)) saturate(1.5);
}

.outcome--destroyed .replay-outcome__title {
  color: #e05050;
}

.outcome--destroyed .replay-outcome__card-name {
  text-decoration: line-through;
  opacity: 0.5;
}

.outcome--destroyed .replay-outcome__card-img {
  filter: grayscale(0.7) opacity(0.6);
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
  filter: drop-shadow(0 0 10px rgba(180, 50, 50, 0.7)) drop-shadow(0 0 20px rgba(180, 50, 50, 0.3));
  animation: orbPulse 0.8s ease-in-out infinite;
}

@keyframes orbPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
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
  .replay-content {
    padding: 1rem;
    gap: 1rem;
  }

  .replay-header {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }

  .replay-header__user {
    justify-content: center;
  }

  .replay-header__info {
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
  }

  .replay-outcome {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .replay-outcome__badge {
    width: 44px;
    height: 44px;
  }

  .replay-outcome__card {
    justify-content: center;
  }

  .replay-outcome__card-info {
    flex-direction: column;
    gap: 0.5rem;
  }

  .replay-outcome__actions {
    width: 100%;
    justify-content: center;
  }
}
</style>

