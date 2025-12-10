<script setup lang="ts">
import { useReplayPlayer } from "~/composables/useReplayPlayer";
import { getCardById } from "~/data/mockCards";
import { TIER_CONFIG, isCardFoil } from "~/types/card";
import gsap from "gsap";
import html2canvas from "html2canvas";

useHead({ title: "Replay - Le Collecteur de Dose" });

const route = useRoute();
const router = useRouter();

const {
  isPlaying,
  cursorX,
  cursorY,
  username,
  userAvatar,
  cardInfo,
  outcome,
  loadFromUrl,
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
const isOrbOverCard = ref(false);

// Disintegration state
const DISINTEGRATION_FRAMES = 64;
const REPETITION_COUNT = 2;
const cardSnapshot = ref<HTMLCanvasElement | null>(null);
const imageSnapshot = ref<HTMLCanvasElement | null>(null);
const capturedImageDimensions = ref<{ width: number; height: number } | null>(null);
const capturedCardDimensions = ref<{ width: number; height: number } | null>(null);
const heartbeatIntensity = ref(0);
const isCardBeingDestroyed = ref(false);

const tierConfig = computed(() => {
  if (!cardData.value) return TIER_CONFIG.T3;
  return TIER_CONFIG[cardData.value.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.T3;
});

const isCurrentCardFoil = computed(() => {
  if (!cardData.value) return false;
  return isCardFoil(cardData.value);
});

const altarClasses = computed(() => ({
  'altar-platform--t0': cardData.value?.tier === 'T0',
  'altar-platform--t1': cardData.value?.tier === 'T1',
  'altar-platform--t2': cardData.value?.tier === 'T2',
  'altar-platform--t3': cardData.value?.tier === 'T3',
  'altar-platform--foil': isCurrentCardFoil.value,
  'altar-platform--active': isLoaded.value,
  'altar-platform--vaal': isOrbOverCard.value,
}));

const heartbeatStyles = computed(() => ({
  '--heartbeat-speed': `${Math.max(0.3, 1 - heartbeatIntensity.value * 0.7)}s`,
  '--heartbeat-scale': `${1 + heartbeatIntensity.value * 0.03}`,
  '--heartbeat-glow-intensity': `${heartbeatIntensity.value * 0.5}`,
}));

// ==========================================
// DISINTEGRATION FUNCTIONS (same as altar.vue)
// ==========================================

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

const captureCardSnapshot = async () => {
  if (!cardFrontRef.value) return;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!cardFrontRef.value) return;
    
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
};

onMounted(() => {
  const encodedData = route.query.d as string;
  
  if (!encodedData) {
    hasError.value = true;
    return;
  }
  
  const success = loadFromUrl(encodedData);
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
  
  setTimeout(() => {
    startReplay();
  }, 1500);
});

const updateHeartbeatFromCursor = () => {
  if (!altarCardRef.value || !isPlaying.value) {
    heartbeatIntensity.value = 0;
    return;
  }
  
  const cardRect = altarCardRef.value.getBoundingClientRect();
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;
  
  const dx = cursorX.value - cardCenterX;
  const dy = cursorY.value - cardCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const maxDistance = 400;
  const minDistance = 50;
  
  if (distance < minDistance) {
    heartbeatIntensity.value = 1;
    isOrbOverCard.value = true;
  } else if (distance < maxDistance) {
    heartbeatIntensity.value = 1 - (distance - minDistance) / (maxDistance - minDistance);
    isOrbOverCard.value = cursorX.value >= cardRect.left && 
                          cursorX.value <= cardRect.right &&
                          cursorY.value >= cardRect.top && 
                          cursorY.value <= cardRect.bottom;
  } else {
    heartbeatIntensity.value = 0;
    isOrbOverCard.value = false;
  }
};

watch([cursorX, cursorY], () => {
  updateHeartbeatFromCursor();
});

const startReplay = async () => {
  showOutcome.value = false;
  isCardBeingDestroyed.value = false;
  heartbeatIntensity.value = 0;
  isOrbOverCard.value = false;
  
  // Reset snapshots
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
  
  // Capture snapshot for potential disintegration
  await captureCardSnapshot();
  
  play(() => {
    triggerOutcome();
  });
};

const triggerOutcome = async () => {
  if (!outcome.value || !altarCardRef.value) return;
  
  heartbeatIntensity.value = 0;
  
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
  
  isOrbOverCard.value = false;
  
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

// Effect when nothing happens - exactly like altar.vue
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

// Transform to foil - exactly like altar.vue
const transformToFoilEffect = async () => {
  if (!altarCardRef.value) return;
  
  // Phase 1: Build up glow
  gsap.to(altarCardRef.value, {
    filter: "brightness(1.8) saturate(1.5)",
    scale: 1.05,
    duration: 0.2,
    ease: "power2.in",
  });
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Phase 2: Bright flash - transformation happens
  gsap.to(altarCardRef.value, {
    filter: "brightness(3) saturate(2)",
    scale: 1.1,
    duration: 0.1,
    ease: "power2.out",
  });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Update card to foil
  if (cardData.value) {
    cardData.value = { ...cardData.value, foil: true };
  }
  
  // Phase 3: Settle back
  gsap.to(altarCardRef.value, {
    filter: "brightness(1) saturate(1)",
    scale: 1,
    duration: 0.4,
    ease: "power2.out",
  });
  
  await new Promise(resolve => setTimeout(resolve, 400));
};

// Destroy card effect - full disintegration exactly like altar.vue
const destroyCardEffect = async () => {
  if (!altarCardRef.value) return;
  
  isCardBeingDestroyed.value = true;
  
  // Shake effect - exactly like altar.vue
  const shakeTl = gsap.timeline();
  for (let i = 0; i < 6; i++) {
    shakeTl.to(altarCardRef.value, {
      x: (i % 2 === 0 ? -1 : 1) * (4 + i),
      duration: 0.04,
      ease: "none",
    });
  }
  shakeTl.to(altarCardRef.value, { x: 0, duration: 0.03 });
  
  // Flash effect - exactly like altar.vue
  gsap.to(altarCardRef.value, {
    filter: "brightness(1.5) sepia(0.4) saturate(1.2)",
    duration: 0.25,
  });
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const cardSlot = cardSlotRef.value;
  if (!cardSlot) {
    // Fallback to simple fade
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }
  
  try {
    const containers: HTMLElement[] = [];
    const imageElement = findCardImageElement();
    const hasImageSnapshot = imageSnapshot.value && canvasHasContent(imageSnapshot.value);
    
    // Phase 1: Disintegrate the image first
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
      
      // Wait for image disintegration to finish
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    // Phase 2: Disintegrate the card frame
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
  reset();
  
  if (cardInfo.value) {
    const card = getCardById(cardInfo.value.id);
    if (card) {
      cardData.value = {
        ...card,
        foil: cardInfo.value.foil
      };
    }
  }
  
  if (altarCardRef.value) {
    gsap.set(altarCardRef.value, { opacity: 1, scale: 1, filter: "brightness(1) saturate(1)" });
  }
  
  isCardBeingDestroyed.value = false;
  showOutcome.value = false;
  
  setTimeout(() => {
    startReplay();
  }, 500);
};

const goToAltar = () => {
  router.push('/altar');
};

const outcomeText = computed(() => {
  switch (outcome.value) {
    case 'nothing': return '😐 Rien ne s\'est passé';
    case 'foil': return '✨ Transformation en Foil !';
    case 'destroyed': return '💀 Carte détruite...';
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

const getCardImageUrl = () => {
  if (!cardInfo.value) return '';
  const card = getCardById(cardInfo.value.id);
  if (!card) return '';
  
  // For foil outcome, show foil image if available
  if (outcome.value === 'foil' && card.gameData?.foilImg) {
    return card.gameData.foilImg;
  }
  return card.gameData?.img || '';
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
  <NuxtLayout>
    <div class="replay-page">
      <div v-if="hasError" class="replay-error">
        <h2>Replay invalide</h2>
        <p>Le lien de replay est invalide ou corrompu.</p>
        <RunicButton variant="primary" @click="goToAltar">
          Retour à l'autel
        </RunicButton>
      </div>
      
      <div v-else-if="isLoaded" class="replay-container">
        <div class="replay-header">
          <RunicBox padding="md" class="replay-user-box">
            <div class="replay-user">
              <img 
                v-if="userAvatar" 
                :src="userAvatar" 
                :alt="username" 
                class="replay-user__avatar"
              />
              <div class="replay-user__info">
                <h2 class="replay-user__name">{{ username }}</h2>
                <p class="replay-user__label">Replay Vaal Orb</p>
              </div>
            </div>
          </RunicBox>
        </div>
        
        <div class="replay-stage">
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
                :class="{ 
                  'altar-card--heartbeat': isPlaying && !isCardBeingDestroyed,
                  'altar-card--panicking': heartbeatIntensity > 0,
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
        </div>
        
        <Transition name="fade">
          <RunicBox v-if="showOutcome" padding="lg" class="replay-outcome-box" :class="outcomeClass">
            <div class="replay-outcome">
              <div class="replay-outcome__header">
                <p class="replay-outcome__text">{{ outcomeText }}</p>
              </div>
              
              <div class="replay-outcome__card">
                <div class="replay-outcome__card-image-wrapper">
                  <img 
                    v-if="cardInfo" 
                    :src="getCardImageUrl()" 
                    :alt="getCardName()"
                    class="replay-outcome__card-image"
                  />
                </div>
                <div class="replay-outcome__card-details">
                  <span class="replay-outcome__card-name">{{ getCardName() }}</span>
                  <RunicNumber 
                    :value="cardInfo?.tier || ''" 
                    :color="getTierColor()"
                    size="sm"
                    label="Tier"
                  />
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
        
        <div 
          v-if="isPlaying"
          ref="vaalOrbRef"
          class="replay-cursor"
          :style="{
            left: `${cursorX}px`,
            top: `${cursorY}px`
          }"
        >
          <div class="replay-cursor__user">
            <img 
              v-if="userAvatar" 
              :src="userAvatar" 
              :alt="username" 
              class="replay-cursor__avatar"
            />
            <span class="replay-cursor__username">{{ username }}</span>
          </div>
          <div class="replay-cursor__orb">
            <img src="/images/card-back-logo.png" alt="Vaal Orb" class="replay-cursor__image" />
          </div>
        </div>
      </div>
      
      <div v-else class="replay-loading">
        <div class="replay-loading__spinner"></div>
        <p>Chargement du replay...</p>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.replay-page {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.replay-error {
  text-align: center;
  color: var(--color-text);
}

.replay-error h2 {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-error);
}

.replay-error p {
  margin-bottom: 2rem;
  color: rgba(200, 180, 160, 0.8);
}

.replay-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.replay-header {
  text-align: center;
}

.replay-user-box {
  display: inline-block;
}

.replay-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.replay-user__avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 12px rgba(157, 123, 59, 0.3);
}

.replay-user__info {
  text-align: left;
}

.replay-user__name {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  color: var(--color-text);
  margin: 0;
}

.replay-user__label {
  font-size: 0.75rem;
  color: rgba(200, 180, 160, 0.6);
  margin: 0.25rem 0 0 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.replay-stage {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* ==========================================
   ALTAR PLATFORM - Same as altar.vue
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

/* Circles - exactly like altar.vue */
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

/* Runes - exactly like altar.vue */
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

.altar-platform--active .altar-rune {
  opacity: 1;
  animation: runeGlow 3s ease-in-out infinite;
}

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

/* Outcome */
.replay-outcome-box {
  min-width: 320px;
}

.replay-outcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.replay-outcome__header {
  text-align: center;
}

.replay-outcome__text {
  font-family: "Cinzel", serif;
  font-size: 1.35rem;
  margin: 0;
  letter-spacing: 0.02em;
}

.replay-outcome__card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(
    180deg,
    rgba(25, 23, 20, 0.9) 0%,
    rgba(18, 16, 14, 0.95) 100%
  );
  border-radius: 6px;
  border: 1px solid rgba(60, 55, 50, 0.4);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
}

.replay-outcome__card-image-wrapper {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 13, 12, 0.8);
  border-radius: 4px;
  border: 1px solid rgba(50, 45, 40, 0.3);
  padding: 4px;
}

.replay-outcome__card-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.replay-outcome__card-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.replay-outcome__card-name {
  font-family: "Cinzel", serif;
  font-size: 1rem;
  color: var(--color-text);
  font-weight: 600;
}

.replay-outcome__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-top: 0.5rem;
}

/* Outcome variants */
.outcome--nothing .replay-outcome__text {
  color: rgba(200, 180, 160, 0.8);
}

.outcome--foil .replay-outcome__text {
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
}

.outcome--foil .replay-outcome__card {
  border-color: rgba(255, 215, 0, 0.25);
  background: linear-gradient(
    180deg,
    rgba(35, 30, 18, 0.95) 0%,
    rgba(25, 22, 14, 0.98) 100%
  );
}

.outcome--foil .replay-outcome__card-image-wrapper {
  border-color: rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.2);
}

.outcome--destroyed .replay-outcome__text {
  color: #e05050;
}

.outcome--destroyed .replay-outcome__card {
  border-color: rgba(200, 50, 50, 0.25);
  background: linear-gradient(
    180deg,
    rgba(35, 20, 20, 0.95) 0%,
    rgba(25, 14, 14, 0.98) 100%
  );
}

.outcome--destroyed .replay-outcome__card-name {
  text-decoration: line-through;
  opacity: 0.6;
}

.outcome--destroyed .replay-outcome__card-image {
  filter: grayscale(0.6) opacity(0.7);
}

/* Cursor */
.replay-cursor {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.replay-cursor__user {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(20, 18, 16, 0.95);
  border: 1px solid rgba(157, 123, 59, 0.6);
  border-radius: 6px;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.replay-cursor__avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(157, 123, 59, 0.4);
}

.replay-cursor__username {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 600;
  white-space: nowrap;
}

.replay-cursor__orb {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.replay-cursor__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(180, 50, 50, 0.6));
}

/* Loading */
.replay-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(200, 180, 160, 0.8);
}

.replay-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(60, 55, 50, 0.3);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
