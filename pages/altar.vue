<script setup lang="ts">
import type { Card, CardTier, CardVariation } from "~/types/card";
import { TIER_CONFIG, isCardFoil } from "~/types/card";
import type { VaalOutcome } from "~/types/vaalOutcome";
import {
  rollVaalOutcome,
  getShareModalContent,
  getForcedOutcomeOptions,
} from "~/types/vaalOutcome";
import gsap from "gsap";
import html2canvas from "html2canvas";
import { useReplayRecorder } from "~/composables/useReplayRecorder";
import { useAltarEffects } from "~/composables/useAltarEffects";
import { useAltarAura } from "~/composables/useAltarAura";
import { useVaalOutcomes } from "~/composables/useVaalOutcomes";
import {
  useCardGrouping,
  type CardGroupWithVariations,
  type VariationGroup,
} from "~/composables/useCardGrouping";
import { useDisintegrationEffect } from "~/composables/useDisintegrationEffect";
import { useCollectionSync } from "~/composables/useCollectionSync";
import { useSyncQueue } from "~/composables/useSyncQueue";
import { useAltarDebug } from "~/composables/useAltarDebug";
import { transformUserCollectionToCards } from "~/utils/dataTransform";
import { initTestRunner } from "~/test-scenarios/console";
import { logCollectionState, logCollectionStateComparison } from "~/utils/collectionLogger";

const { t } = useI18n();

// ==========================================
// ALTAR OPEN/CLOSED STATE (Real-time from Supabase)
// ==========================================
const { altarOpen, isLoading: isLoadingSettings } = useAppSettings();

useHead({ title: t("meta.altar.title") });

const { loggedIn, user: authUser } = useUserSession();
const { isApiData, isInitializing } = useDataSource();
const { fetchUserCollection } = useApi();
const { syncCollectionToApi, updateCardCounts, isSyncing: isCollectionSyncing } = useCollectionSync();
const { isTestMode } = useDevTestMode();

const user = computed(() => ({
  name: authUser.value?.displayName || "Guest",
  avatar:
    authUser.value?.avatar ||
    "https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png",
}));

// ==========================================
// USER DATA - Vaal Orbs & Collection (Local Session Copy)
// ==========================================

// Vaal Orbs - loaded from API or mock
const vaalOrbs = ref(14);

// Local session copy of the collection - persists during the session
const localCollection = ref<Card[]>([]);
const isLoadingCollection = ref(false);
const isReloadingCollection = ref(false);

// Load collection from API or test data
const loadCollection = async () => {
  if (!loggedIn.value || !authUser.value?.displayName) {
    // Not logged in, can't load collection
    localCollection.value = [];
    vaalOrbs.value = 0;
    return;
  }

  console.log('[Altar] Loading collection from API...', {
    username: authUser.value.displayName,
    isApiData: isApiData.value
  });

  isLoadingCollection.value = true;
  try {
    const userCollectionData = await fetchUserCollection(authUser.value.displayName);
    
    // Debug: Check which key was used (to detect duplicate entries)
    const { fetchUserCollections } = useApi();
    const allCollections = await fetchUserCollections();
    const userLower = authUser.value.displayName.toLowerCase();
    const matchingKeys = allCollections ? Object.keys(allCollections).filter(
      key => key.toLowerCase() === userLower
    ) : [];
    
    const receivedInfo = {
      hasData: !!userCollectionData,
      vaalOrbs: userCollectionData?.vaalOrbs,
      cardCount: userCollectionData ? Object.keys(userCollectionData).filter(k => k !== 'vaalOrbs').length : 0,
      matchingKeys: matchingKeys.length > 1 ? `⚠️ Found ${matchingKeys.length} entries: ${matchingKeys.join(', ')}` : matchingKeys[0] || 'none'
    };
    console.log('[Altar] Collection data received:')
    console.log(JSON.stringify(receivedInfo, null, 2))
    
    if (userCollectionData) {
      // Transform API data to Card[]
      const userLower = authUser.value.displayName.toLowerCase()
      const collectionWrapper = { [userLower]: userCollectionData }
      const transformInfo = {
        username: authUser.value.displayName,
        userLower,
        wrapperKeys: Object.keys(collectionWrapper),
        userDataKeys: Object.keys(userCollectionData),
        vaalOrbs: userCollectionData.vaalOrbs,
        cardKeys: Object.keys(userCollectionData).filter(k => k !== 'vaalOrbs').slice(0, 5)
      };
      console.log('[Altar] Transforming collection:')
      console.log(JSON.stringify(transformInfo, null, 2))
      
      // Log collection state BEFORE loading (if we have a previous state)
      const collectionBeforeLoad = localCollection.value.length > 0 
        ? JSON.parse(JSON.stringify(localCollection.value)) as Card[]
        : [];
      const vaalOrbsBeforeLoad = vaalOrbs.value;
      
      localCollection.value = transformUserCollectionToCards(
        collectionWrapper,
        authUser.value.displayName
      );
      
      // Extract vaalOrbs - use the value from API, not the local optimistic value
      const apiVaalOrbs = typeof userCollectionData.vaalOrbs === 'number' ? userCollectionData.vaalOrbs : 0;
      const vaalOrbsInfo = {
        apiValue: apiVaalOrbs,
        previousLocalValue: vaalOrbs.value
      };
      console.log('[Altar] Setting vaalOrbs from API:')
      console.log(JSON.stringify(vaalOrbsInfo, null, 2))
      vaalOrbs.value = apiVaalOrbs;
      
      // Log collection state AFTER loading
      if (collectionBeforeLoad.length > 0) {
        logCollectionStateComparison(
          'LoadCollection: Comparison',
          collectionBeforeLoad,
          vaalOrbsBeforeLoad,
          localCollection.value,
          vaalOrbs.value,
          { source: 'API' }
        );
      } else {
        logCollectionState('LoadCollection: After (initial load)', localCollection.value, vaalOrbs.value, {
          source: 'API',
        });
      }
      
      const loadedInfo = {
        cardsCount: localCollection.value.length,
        vaalOrbs: vaalOrbs.value
      };
      console.log('[Altar] Collection loaded:')
      console.log(JSON.stringify(loadedInfo, null, 2))
      
      if (localCollection.value.length === 0) {
        console.warn('[Altar] ⚠️ Collection is empty after transformation!', {
          userCollectionData,
          collectionWrapper,
          username: authUser.value.displayName
        });
      }
    } else {
      console.warn('[Altar] No collection data received');
      localCollection.value = [];
      vaalOrbs.value = 0;
    }
  } catch (error) {
    console.error('[Altar] Error loading collection:', error);
    localCollection.value = [];
    vaalOrbs.value = 0;
  } finally {
    isLoadingCollection.value = false;
  }
};

// Watch for data source changes and reload collection
watch([isApiData, isInitializing, () => authUser.value?.displayName, loggedIn], async ([isApi, initializing, displayName, isLoggedIn]) => {
  // Don't reload while initializing
  if (initializing) {
    return;
  }
  
  // Reload collection when data source changes or user changes
  if (isLoggedIn && displayName) {
    await loadCollection();
  }
}, { immediate: false });

// Initialize collection on mount
onMounted(async () => {
  // Wait for initialization to complete
  if (isInitializing.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(isInitializing, (init) => {
        if (!init) {
          unwatch();
          loadCollection();
          resolve();
        }
      });
    });
  } else {
    await loadCollection();
  }
  
  // Listen for vaalOrbs updates from admin page (test mode only)
  if (!isApiData.value && import.meta.client) {
    window.addEventListener('altar:updateVaalOrbs', ((e: CustomEvent<{ value: number }>) => {
      vaalOrbs.value = e.detail.value;
    }) as EventListener);
  }
});

onBeforeUnmount(() => {
  if (isRecording.value) {
    cancelRecording();
  }
  const appWrapper = document.getElementById("app-wrapper");
  if (appWrapper) {
    appWrapper.classList.remove("earthquake-global");
  }
  // Clean up scroll lock classes
  document.documentElement.classList.remove("no-scroll-during-drag");
  document.body.classList.remove("no-scroll-during-drag");
  
  // Remove event listener
  if (import.meta.client) {
    window.removeEventListener('altar:updateVaalOrbs', (() => {}) as EventListener);
  }
});

// User's collection - points to local session copy
const collection = computed(() => localCollection.value);

// ==========================================
// CARD GROUPING WITH VARIATIONS
// ==========================================

const { groupedCards, cardOptions } = useCardGrouping(collection, {
  sortByNameWithinTier: true,
});

// ==========================================
// ALTAR STATE
// ==========================================

const selectedCardId = ref<string>("");
const selectedVariation = ref<CardVariation>("standard");
const isCardFlipped = ref(false);
const isCardOnAltar = ref(false);
const isAltarActive = ref(false); // Visual state - fades out smoothly
const isAnimating = ref(false);
const isTransformingCard = ref(false); // Flag to prevent fly-in animation during transform

// Get the selected card group
const selectedCardGroup = computed(() =>
  groupedCards.value.find((g) => g.cardId === selectedCardId.value)
);

// Get variation options for the selected card
const variationOptions = computed(() => {
  if (!selectedCardGroup.value) return [];
  return selectedCardGroup.value.variations.map((v) => ({
    value: v.variation,
    label:
      v.variation === "foil"
        ? t("altar.variations.foil")
        : t("altar.variations.standard"),
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

// Foil preload state - set before actual foil to "warm up" CSS
const isFoilPreloaded = ref(false);
const isFoilReady = ref(false);

// Watch for foil state changes to implement preload strategy
watch(
  isCurrentCardFoil,
  async (isFoil, wasFoil) => {
    if (isFoil && !wasFoil) {
      // Card just became foil - preload first
      isFoilPreloaded.value = true;
      isFoilReady.value = false;
      // Wait for CSS to compute and render at opacity 0
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 50));
      // Now reveal
      isFoilReady.value = true;
    } else if (!isFoil) {
      // Reset states
      isFoilPreloaded.value = false;
      isFoilReady.value = false;
    }
  },
  { immediate: true }
);

// Get tier config for current card
const currentTierConfig = computed(() => {
  if (!displayCard.value) return null;
  return TIER_CONFIG[displayCard.value.tier as CardTier];
});

// Altar classes based on card
const altarClasses = computed(() => ({
  "altar-platform--t0": displayCard.value?.tier === "T0",
  "altar-platform--t1": displayCard.value?.tier === "T1",
  "altar-platform--t2": displayCard.value?.tier === "T2",
  "altar-platform--t3": displayCard.value?.tier === "T3",
  "altar-platform--foil-preload": isFoilPreloaded.value && !isFoilReady.value,
  "altar-platform--foil": isFoilReady.value,
  "altar-platform--active": isAltarActive.value,
  "altar-platform--vaal": isOrbOverCard.value,
}));

// Watch for card selection changes
watch(selectedCardId, async (newId, oldId) => {
  if (isBlockingInteractions.value) {
    // Prevent card changes during critical operations
    return;
  }

  if (newId) {
    const group = groupedCards.value.find((g) => g.cardId === newId);
    if (group && group.variations.length > 0) {
      selectedVariation.value = group.variations[0].variation;
    }

    // If this is a transformation, the card is already on altar - just update visually
    if (isTransformingCard.value) {
      isTransformingCard.value = false;
      // Card is already in place, just clear snapshots for new appearance
      cardSnapshot.value = null;
      imageSnapshot.value = null;
      capturedImageDimensions.value = null;
      capturedCardDimensions.value = null;
      return;
    }

    // Clear snapshots and dimensions when changing cards
    cardSnapshot.value = null;
    imageSnapshot.value = null;
    capturedImageDimensions.value = null;
    capturedCardDimensions.value = null;

    // If there was a previous card, eject it first
    if (
      oldId &&
      isCardOnAltar.value &&
      altarCardRef.value &&
      !isAnimating.value
    ) {
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
const cardBackLogoUrl = "/images/vaal-risitas.png";
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
      return {
        x: (Math.random() - 0.5) * 300,
        y: -verticalOffset,
        rotation: spin,
      };
    case 1: // From right
      return {
        x: horizontalOffset,
        y: (Math.random() - 0.5) * 200,
        rotation: spin,
      };
    case 2: // From bottom
      return {
        x: (Math.random() - 0.5) * 300,
        y: verticalOffset,
        rotation: spin,
      };
    case 3: // From left
    default:
      return {
        x: -horizontalOffset,
        y: (Math.random() - 0.5) * 200,
        rotation: spin,
      };
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
// State for destruction animation
const isCardBeingDestroyed = ref(false);

// Admin/Debug settings (shared via composable)
const { forcedOutcome } = useAltarDebug();

// Replay Recording
const {
  isRecording,
  isRecordingArmed,
  isSaving,
  saveError,
  generatedUrl,
  replayId,
  setUser,
  armRecording,
  startRecording,
  recordPosition,
  recordEvent,
  stopRecording,
  cancelRecording,
  resetForNewRecording,
  clearError,
  copyUrlToClipboard,
  logActivityOnly,
} = useReplayRecorder();

const showShareModal = ref(false);
const urlCopied = ref(false);
const showPreferencesModal = ref(false);
const lastRecordedOutcome = ref<VaalOutcome | null>(null);

// Close share modal and reset recording state to allow new recordings
const closeShareModal = () => {
  showShareModal.value = false;
  // Reset recording state so user can immediately start a new recording
  resetForNewRecording();
};

// Record preferences - saved in localStorage
const recordOnNothing = ref(false);
const recordOnFoil = ref(true);
const recordOnDestroyed = ref(true);
const recordOnTransform = ref(false);
const recordOnDuplicate = ref(true);

// Load preferences from localStorage on mount
onMounted(() => {
  const savedNothing = localStorage.getItem("record_nothing");
  const savedFoil = localStorage.getItem("record_foil");
  const savedDestroyed = localStorage.getItem("record_destroyed");
  const savedTransform = localStorage.getItem("record_transform");
  const savedDuplicate = localStorage.getItem("record_duplicate");

  if (savedNothing !== null) recordOnNothing.value = savedNothing === "true";
  if (savedFoil !== null) recordOnFoil.value = savedFoil === "true";
  if (savedDestroyed !== null)
    recordOnDestroyed.value = savedDestroyed === "true";
  if (savedTransform !== null)
    recordOnTransform.value = savedTransform === "true";
  if (savedDuplicate !== null)
    recordOnDuplicate.value = savedDuplicate === "true";
});

// Watch and save preferences to localStorage
watch(recordOnNothing, (val) =>
  localStorage.setItem("record_nothing", String(val))
);
watch(recordOnFoil, (val) => localStorage.setItem("record_foil", String(val)));
watch(recordOnDestroyed, (val) =>
  localStorage.setItem("record_destroyed", String(val))
);
watch(recordOnTransform, (val) =>
  localStorage.setItem("record_transform", String(val))
);
watch(recordOnDuplicate, (val) =>
  localStorage.setItem("record_duplicate", String(val))
);

// Check if recording should happen for a given outcome
const shouldRecordOutcome = (outcome: VaalOutcome): boolean => {
  switch (outcome) {
    case "nothing":
      return recordOnNothing.value;
    case "foil":
      return recordOnFoil.value;
    case "destroyed":
      return recordOnDestroyed.value;
    case "transform":
      return recordOnTransform.value;
    case "duplicate":
      return recordOnDuplicate.value;
    default:
      return false;
  }
};

// Set user info for recorder when user changes
watch(
  user,
  (newUser) => {
    setUser(newUser.name, newUser.avatar);
  },
  { immediate: true }
);

const startAutoRecording = () => {
  // Check if any recording is enabled
  const anyRecordingEnabled =
    recordOnNothing.value ||
    recordOnFoil.value ||
    recordOnDestroyed.value ||
    recordOnTransform.value ||
    recordOnDuplicate.value;

  if (!anyRecordingEnabled) return;

  const card = displayCard.value;
  if (!card || !isCardOnAltar.value) return;

  armRecording({
    cardId: card.id,
    variation: selectedVariation.value,
    uid: card.uid,
    tier: card.tier,
    foil: isCardFoil(card),
  });

  startRecording();
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

// Share modal content based on outcome (centralized configuration)
const shareModalContent = computed(() =>
  getShareModalContent(lastRecordedOutcome.value, t)
);

// Use centralized outcome options
const forcedOutcomeOptions = computed(() => getForcedOutcomeOptions(t));

// Simulate Vaal outcome (will be server-side later)
const simulateVaalOutcome = (): VaalOutcome => {
  // If a forced outcome is set, use it
  if (forcedOutcome.value !== "random") {
    return forcedOutcome.value as VaalOutcome;
  }

  // Use centralized probability-based roll
  return rollVaalOutcome();
};

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

// Sync callback for API updates
type CardUpdate = { normalDelta: number; foilDelta: number; currentNormal?: number; currentFoil?: number; cardData?: Partial<Card> };

// Sync queue for managing concurrent syncs
const { enqueue: enqueueSync, queueStatus: syncQueueStatus, isProcessing: isSyncProcessing } = useSyncQueue()

// Auto-credit vaalOrbs in localhost test mode when reaching 0
const isAutoCrediting = ref(false);
watch(vaalOrbs, async (newValue, oldValue) => {
  // Only trigger when vaalOrbs reaches 0 (not when loading from API or initializing)
  if (newValue === 0 && oldValue !== undefined && oldValue > 0 && !isAutoCrediting.value && !isLoadingCollection.value) {
    // Check if we're in test mode (auto-credit vaalOrbs when reaching 0)
    if (isTestMode.value && loggedIn.value && authUser.value?.displayName) {
      isAutoCrediting.value = true;
      console.log('[Altar] 🎁 Auto-crediting 5 vaalOrbs (test mode)');
      
      // Credit locally first (optimistic update)
      const vaalOrbsBefore = vaalOrbs.value;
      vaalOrbs.value = 5;
      
      // Sync with API using the sync queue
      try {
        const updates = new Map<number, CardUpdate>();
        const operationId = `auto-credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await enqueueSync({
          id: operationId,
          username: authUser.value.displayName,
          cardUpdates: updates,
          vaalOrbsNewValue: 5,
          outcomeType: 'auto-credit',
          rollbackData: {
            vaalOrbsBefore,
            localCollectionBefore: JSON.parse(JSON.stringify(localCollection.value)) as Card[],
          },
          onSuccess: async () => {
            console.log('[Altar] ✅ Auto-credit sync completed');
          },
          onError: (error) => {
            console.error('[Altar] ❌ Auto-credit sync failed:', error);
            // Rollback on error
            vaalOrbs.value = vaalOrbsBefore;
          },
        });
      } catch (error) {
        console.error('[Altar] ❌ Auto-credit sync error:', error);
        // Rollback on error
        vaalOrbs.value = vaalOrbsBefore;
      }
      
      isAutoCrediting.value = false;
    }
  }
});

// Expose sync queue status for tests (update it reactively)
if (import.meta.client) {
  watch([syncQueueStatus, isSyncProcessing], () => {
    if (typeof window !== 'undefined') {
      ;(window as any).__syncQueueStatus = {
        size: syncQueueStatus.value.size,
        isProcessing: isSyncProcessing.value,
        currentOperation: syncQueueStatus.value.currentOperation,
      }
    }
  }, { immediate: true, deep: true })
}

const handleSyncRequired = async (
  updates: Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>,
  vaalOrbsDelta: number,
  outcomeType?: string
) => {
  if (!loggedIn.value || !authUser.value?.displayName) {
    console.log('[Altar] Skipping sync (not logged in)')
    return;
  }
  
  const syncStartInfo = {
    vaalOrbsBefore: vaalOrbs.value,
    vaalOrbsDelta,
    updatesCount: updates.size
  };
  console.log(`[Altar] 🔄 Starting sync for outcome: ${outcomeType || 'unknown'}`)
  console.log(JSON.stringify(syncStartInfo, null, 2))
  
  // Save state for rollback (BEFORE optimistic update)
  const vaalOrbsBefore = vaalOrbs.value;
  const localCollectionBefore = JSON.parse(JSON.stringify(localCollection.value)) as Card[];
  
  // Log collection state BEFORE sync
  logCollectionState(`Sync: Before (${outcomeType || 'unknown'})`, localCollectionBefore, vaalOrbsBefore, {
    vaalOrbsDelta,
    updatesCount: updates.size,
  });
  
  // Update vaalOrbs locally first (optimistic update)
  const newVaalOrbsValue = Math.max(0, vaalOrbs.value + vaalOrbsDelta);
  vaalOrbs.value = newVaalOrbsValue;
  
  // Calculate current counts for each card to compute absolute values
  // Note: localCollection has already been modified by useVaalOutcomes, so we need to
  // calculate the counts AFTER the modification (which are the new absolute values)
  const updatesWithCurrentCounts = new Map<number, CardUpdate>();
  
  for (const [uid, changes] of updates.entries()) {
    const baseUid = Math.floor(uid);
    // Find current counts for this card AFTER local modification
    // The localCollection has already been modified by useVaalOutcomes
    // So currentNormal/currentFoil are the NEW counts (after applying the delta)
    const matchingCards = localCollection.value.filter(c => Math.floor(c.uid) === baseUid);
    const currentNormal = matchingCards.filter(c => !c.foil).length;
    const currentFoil = matchingCards.filter(c => c.foil).length;
    
    // The currentNormal/currentFoil are already the NEW values (after delta applied)
    // So we use them directly as the absolute values to send to the server
    // The deltas are still needed for createCardUpdate to understand the change direction
    
    const cardInfo = {
      normalDelta: changes.normalDelta,
      foilDelta: changes.foilDelta,
      currentNormalAfterModification: currentNormal,
      currentFoilAfterModification: currentFoil,
      cardName: changes.cardData?.name || changes.cardData?.id || `UID ${baseUid}`,
      cardId: changes.cardData?.id,
      matchingCardsCount: matchingCards.length,
      allMatchingCards: matchingCards.map(c => ({ uid: c.uid, foil: c.foil, name: c.name }))
    };
    console.log(`[Altar] Card ${baseUid}:`)
    console.log(JSON.stringify(cardInfo, null, 2))
    
    // Use currentNormal/currentFoil as the absolute values (they're already the new values)
    updatesWithCurrentCounts.set(baseUid, {
      normalDelta: changes.normalDelta,
      foilDelta: changes.foilDelta,
      currentNormal, // Already the new value after modification
      currentFoil, // Already the new value after modification
      cardData: changes.cardData,
    });
  }
  
  // Rollback function to restore previous state
  const rollback = () => {
    console.warn(`[Altar] 🔄 Rolling back changes for ${outcomeType || 'unknown'}`)
    vaalOrbs.value = vaalOrbsBefore
    localCollection.value = localCollectionBefore
    console.log(`[Altar] ✅ Rollback completed. vaalOrbs: ${vaalOrbs.value}, cards: ${localCollection.value.length}`)
  }
  
  // Enqueue sync operation with rollback support
  try {
    const operationId = `${outcomeType || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await enqueueSync({
      id: operationId,
      username: authUser.value.displayName,
      cardUpdates: updatesWithCurrentCounts,
      vaalOrbsNewValue: newVaalOrbsValue,
      outcomeType,
      rollbackData: {
        vaalOrbsBefore,
        localCollectionBefore,
      },
      onSuccess: async () => {
        console.log(`[Altar] ✅ Sync successful for ${outcomeType || 'unknown'}. Reloading collection...`);
        
        // Log collection state AFTER sync (before reload)
        logCollectionState(`Sync: After (${outcomeType || 'unknown'})`, localCollection.value, vaalOrbs.value, {
          syncCompleted: true,
        });
        
        // Mark that reload is starting (for test runner to wait)
        isReloadingCollection.value = true;
        if (typeof window !== 'undefined') {
          (window as any).__isReloadingCollection = true
        }
        
        try {
          // Wait longer to ensure Supabase has processed the update
          // Supabase may need time to propagate the update, especially in test mode
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Reload collection to ensure UI is up to date with server state
          await loadCollection();
          console.log(`[Altar] ✅ Collection reloaded. New vaalOrbs: ${vaalOrbs.value}, Cards count: ${localCollection.value.length}`);
          
          // Verify vaalOrbs match expected value
          const expectedVaalOrbs = newVaalOrbsValue;
          if (vaalOrbs.value !== expectedVaalOrbs) {
            console.warn(`[Altar] ⚠️ VaalOrbs mismatch! Expected: ${expectedVaalOrbs}, Got: ${vaalOrbs.value}. Server may not have updated yet or there's a merge issue.`);
            console.warn(`[Altar] This could indicate the server merge didn't work correctly for vaalOrbs.`);
          } else {
            console.log(`[Altar] ✅ VaalOrbs match expected value: ${expectedVaalOrbs}`);
          }
          
          // Verify collection is not empty
          if (localCollection.value.length === 0) {
            console.error(`[Altar] ❌ Collection is empty after reload! This indicates a problem with data fetching or transformation.`);
          }
        } finally {
          // Mark that reload is complete
          isReloadingCollection.value = false;
          if (typeof window !== 'undefined') {
            (window as any).__isReloadingCollection = false
          }
        }
      },
      onError: (error) => {
        console.error(`[Altar] ❌ Sync failed for ${outcomeType || 'unknown'}:`, error.message);
        // Rollback optimistic updates
        rollback();
        // Show user-friendly error message
        // TODO: Could show a toast notification here
      },
    });
  } catch (error: any) {
    console.error(`[Altar] ❌ Sync error for ${outcomeType || 'unknown'}:`, error);
    // Rollback optimistic updates
    rollback();
  }
};

// Vaal Outcomes composable for modular animations
const { executeNothing, executeFoil, executeTransform, executeDuplicate } =
  useVaalOutcomes({
    cardRef: altarCardRef,
    cardFrontRef,
    displayCard,
    localCollection,
    isAnimating,
    onCardUpdate: (updatedCard) => {
      // Called when card is updated (e.g., foil transformation)
      // Update selectedVariation to match the new foil state so displayCard stays valid
      if (updatedCard.foil) {
        selectedVariation.value = "foil";
      }
      // Re-capture snapshot with new appearance
      nextTick(() => captureCardSnapshot());
    },
    onCardTransformed: (oldCard, newCard) => {
      // Set flag to prevent fly-in animation - card morphs in place
      isTransformingCard.value = true;
      // Update the display card to show the new card
      // Keep foil variation if the new card is foil (transformation preserves foil status)
      if (newCard.foil) {
        selectedVariation.value = "foil";
      } else {
        selectedVariation.value = "standard";
      }
      selectedCardId.value = newCard.id;
      // Re-capture snapshot for new card appearance
      nextTick(() => captureCardSnapshot());
    },
    onCardDuplicated: (originalCard, newCard) => {
      // Card is already added to collection by the composable
      // Re-capture snapshot
      nextTick(() => captureCardSnapshot());
    },
    onSyncRequired: handleSyncRequired,
  });

// Initialize test runner (for console testing)
onMounted(() => {
  // Calculate card counts helper
  const calculateCardCounts = (): Map<number, { normal: number; foil: number }> => {
    const counts = new Map<number, { normal: number; foil: number }>()
    for (const card of localCollection.value) {
      const baseUid = Math.floor(card.uid)
      if (!counts.has(baseUid)) {
        counts.set(baseUid, { normal: 0, foil: 0 })
      }
      const count = counts.get(baseUid)!
      if (card.foil) {
        count.foil++
      } else {
        count.normal++
      }
    }
    return counts
  }

  // Get collection state helper
  const getCollectionState = () => {
    const state = {
      cards: localCollection.value,
      vaalOrbs: vaalOrbs.value,
      cardCounts: calculateCardCounts(),
    }
    console.log('[TestRunner] getCollectionState called:', {
      cardCount: state.cards.length,
      vaalOrbs: state.vaalOrbs,
      cardCountsSize: state.cardCounts.size
    })
    return state
  }

  // Simulate outcome helper
  const simulateOutcome = async (outcome: string, cardUid?: number): Promise<void> => {
    console.log(`[TestRunner] simulateOutcome called with outcome: ${outcome}`, { cardUid })
    
    // If a specific card UID is provided, select that card
    if (cardUid !== undefined) {
      const targetCard = localCollection.value.find(c => Math.floor(c.uid) === Math.floor(cardUid))
      if (!targetCard) {
        throw new Error(`Card with UID ${cardUid} not found in collection`)
      }
      selectedCardId.value = targetCard.id
      selectedVariation.value = targetCard.foil ? 'foil' : 'standard'
      isCardOnAltar.value = true
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      const selectedCardInfo = {
        cardName: targetCard.name,
        hasCardRef: !!altarCardRef.value,
        hasDisplayCard: !!displayCard.value,
        isFoil: targetCard.foil
      };
      console.log(`[TestRunner] Selected card for test: ${targetCard.name}`)
      console.log(JSON.stringify(selectedCardInfo, null, 2))
    } else if (!isCardOnAltar.value) {
      // Put a card on the altar if none
      if (localCollection.value.length > 0) {
        const firstCard = localCollection.value[0]
        selectedCardId.value = firstCard.id
        selectedVariation.value = firstCard.foil ? 'foil' : 'standard'
        isCardOnAltar.value = true
        // Wait for DOM to update so cardRef is available
        await nextTick()
        // Additional wait to ensure card element is rendered
        await new Promise(resolve => setTimeout(resolve, 100))
        const placedCardInfo = {
          cardName: firstCard.name,
          hasCardRef: !!altarCardRef.value,
          hasDisplayCard: !!displayCard.value
        };
        console.log(`[TestRunner] Card placed on altar: ${firstCard.name}`)
        console.log(JSON.stringify(placedCardInfo, null, 2))
      } else {
        throw new Error('No cards available for testing')
      }
    } else {
      // Card already on altar, but ensure cardRef is available
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      console.log(`[TestRunner] Card already on altar`, {
        hasCardRef: !!altarCardRef.value,
        hasDisplayCard: !!displayCard.value
      })
    }

    // Verify cardRef is available for outcomes that need it
    if (outcome !== 'nothing' && !altarCardRef.value) {
      console.warn(`[TestRunner] ⚠️ cardRef not available for outcome: ${outcome}. Retrying...`)
      // Retry after a bit more time
      await new Promise(resolve => setTimeout(resolve, 200))
      if (!altarCardRef.value) {
        throw new Error(`cardRef not available for outcome: ${outcome}. Cannot execute animation.`)
      }
    }

    // Check vaalOrbs
    if (vaalOrbs.value <= 0 && outcome !== 'nothing') {
      throw new Error('Not enough vaalOrbs for this outcome')
    }

    console.log(`[TestRunner] Executing outcome: ${outcome}, vaalOrbs: ${vaalOrbs.value}`)

    // Execute outcome using the functions from useVaalOutcomes
    // These functions will call onSyncRequired which is handleSyncRequired
    switch (outcome.toLowerCase()) {
      case 'nothing':
        console.log(`[TestRunner] Calling executeNothing()`)
        await executeNothing()
        // For nothing, sync is handled manually in handleVaalOutcome
        // But simulateOutcome calls executeNothing directly, so we need to sync manually
        if (loggedIn.value && authUser.value?.displayName && handleSyncRequired) {
          console.log('[TestRunner] NOTHING: Syncing to API...')
          const updates = new Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>();
          await handleSyncRequired(updates, -1, 'nothing');
          console.log('[TestRunner] NOTHING: Sync completed')
        }
        break
      case 'foil':
        if (isCurrentCardFoil.value) {
          throw new Error('Card is already foil')
        }
        console.log(`[TestRunner] Calling executeFoil()`, { hasCardRef: !!altarCardRef.value })
        await executeFoil()
        // Sync is handled by executeFoil via onSyncRequired callback
        break
      case 'duplicate':
        console.log(`[TestRunner] Calling executeDuplicate()`, { hasCardRef: !!altarCardRef.value })
        await executeDuplicate()
        // Sync is handled by executeDuplicate via onSyncRequired callback
        break
      case 'destroyed':
        console.log(`[TestRunner] Calling destroyCard()`, { hasCardRef: !!altarCardRef.value })
        await destroyCard()
        // Sync is handled by cleanupAfterDestruction
        break
      case 'transform':
        console.log(`[TestRunner] Calling executeTransform()`, { hasCardRef: !!altarCardRef.value })
        await executeTransform()
        // Sync is handled by executeTransform via onSyncRequired callback
        break
      default:
        throw new Error(`Unknown outcome: ${outcome}`)
    }
    
    console.log(`[TestRunner] Outcome ${outcome} execution completed`)
  }

  // Get card by UID helper
  const getCardByUid = (uid: number): Card | null => {
    return localCollection.value.find(c => Math.floor(c.uid) === Math.floor(uid)) || null
  }

  // Add vaalOrbs helper (for testing)
  const addVaalOrbs = (amount: number) => {
    vaalOrbs.value = Math.max(0, vaalOrbs.value + amount)
    console.log(`[TestRunner] Added ${amount} vaalOrbs. New total: ${vaalOrbs.value}`)
  }

  // Initialize test runner
  initTestRunner({
    getCollectionState,
    simulateOutcome,
    getCardByUid,
    addVaalOrbs,
  })
})

const cleanupAfterDestruction = async (destroyedCardUid: number) => {
  const cardIndex = localCollection.value.findIndex(
    (c) => c.uid === destroyedCardUid
  );
  
  if (cardIndex !== -1) {
    const destroyedCard = localCollection.value[cardIndex];
    
    // Save state for rollback (BEFORE removal)
    const vaalOrbsBefore = vaalOrbs.value;
    const localCollectionBefore = JSON.parse(JSON.stringify(localCollection.value)) as Card[];
    
    // Log collection state BEFORE destruction
    logCollectionState('DESTROYED: Before modification', localCollectionBefore, vaalOrbsBefore, {
      cardToDestroy: {
        uid: destroyedCard.uid,
        name: destroyedCard.name,
        foil: destroyedCard.foil,
      }
    });
    
    // Remove card from collection (optimistic update)
    localCollection.value.splice(cardIndex, 1);
    
    // Update vaalOrbs locally (optimistic update)
    const newVaalOrbsValue = Math.max(0, vaalOrbs.value - 1);
    vaalOrbs.value = newVaalOrbsValue;
    
    // Log collection state AFTER destruction
    logCollectionState('DESTROYED: After modification', localCollection.value, vaalOrbs.value, {
      destroyedCard: {
        uid: destroyedCard.uid,
        name: destroyedCard.name,
        foil: destroyedCard.foil,
      }
    });
    
    // Sync with API: remove card (normal: -1 or foil: -1)
    if (loggedIn.value && authUser.value?.displayName) {
      const destroyedInfo = {
        card: destroyedCard.name,
        uid: destroyedCard.uid,
        isFoil: isCardFoil(destroyedCard)
      };
      console.log('[Altar] DESTROYED: Syncing to API...')
      console.log(JSON.stringify(destroyedInfo, null, 2))
      const baseUid = Math.floor(destroyedCard.uid);
      const updates = new Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>();
      
      // Calculate current counts after removal (card already removed from localCollection)
      const matchingCards = localCollection.value.filter(c => Math.floor(c.uid) === baseUid);
      const currentNormal = matchingCards.filter(c => !c.foil).length;
      const currentFoil = matchingCards.filter(c => c.foil).length;
      
      const updatesWithCurrentCounts = new Map<number, CardUpdate>();
      if (isCardFoil(destroyedCard)) {
        updatesWithCurrentCounts.set(baseUid, { 
          normalDelta: 0, 
          foilDelta: -1, 
          currentNormal,
          currentFoil,
          cardData: destroyedCard 
        });
      } else {
        updatesWithCurrentCounts.set(baseUid, { 
          normalDelta: -1, 
          foilDelta: 0,
          currentNormal,
          currentFoil,
          cardData: destroyedCard 
        });
      }
      
      // Rollback function to restore previous state
      const rollback = () => {
        console.warn('[Altar] 🔄 Rolling back DESTROYED changes')
        vaalOrbs.value = vaalOrbsBefore
        localCollection.value = localCollectionBefore
        console.log(`[Altar] ✅ Rollback completed. vaalOrbs: ${vaalOrbs.value}, cards: ${localCollection.value.length}`)
      }
      
      // Enqueue sync operation with rollback support
      try {
        const operationId = `destroyed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        await enqueueSync({
          id: operationId,
          username: authUser.value.displayName,
          cardUpdates: updatesWithCurrentCounts,
          vaalOrbsNewValue: newVaalOrbsValue,
          outcomeType: 'destroyed',
          rollbackData: {
            vaalOrbsBefore,
            localCollectionBefore,
          },
          onSuccess: async () => {
            console.log('[Altar] ✅ DESTROYED sync successful. Reloading collection...');
            isReloadingCollection.value = true;
            if (typeof window !== 'undefined') {
              (window as any).__isReloadingCollection = true;
            }
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              await loadCollection();
              console.log(`[Altar] ✅ Collection reloaded. New vaalOrbs: ${vaalOrbs.value}, Cards count: ${localCollection.value.length}`);
            } finally {
              isReloadingCollection.value = false;
              if (typeof window !== 'undefined') {
                (window as any).__isReloadingCollection = false;
              }
            }
          },
          onError: (error) => {
            console.error('[Altar] ❌ DESTROYED sync failed:', error.message);
            rollback();
          },
        });
      } catch (error: any) {
        console.error('[Altar] ❌ DESTROYED sync error:', error);
        rollback();
      }
    }
  }

  clearSnapshots();
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

  await new Promise((resolve) => setTimeout(resolve, 300));

  // Start fading out the altar as disintegration begins
  isAltarActive.value = false;

  const cardSlot = altarCardRef.value.parentElement;
  if (!cardSlot) {
    cleanupAfterDestruction(destroyedCardUid);
    return;
  }

  try {
    let cardWidth: number;
    let cardHeight: number;
    
    if (capturedCardDimensions.value) {
      cardWidth = capturedCardDimensions.value.width;
      cardHeight = capturedCardDimensions.value.height;
    } else if (altarCardRef.value) {
      const cardRect = altarCardRef.value.getBoundingClientRect();
      cardWidth = cardRect.width;
      cardHeight = cardRect.height;
    } else {
      cardWidth = 0;
      cardHeight = 0;
    }
    
    let cardCanvas = cardSnapshot.value;
    if (!cardCanvas && cardFrontRef.value && cardWidth > 0 && cardHeight > 0) {
      try {
        cardCanvas = await html2canvas(cardFrontRef.value, {
          backgroundColor: null,
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: false,
          imageTimeout: 15000,
          onclone: (clonedDoc, element) => {
            try {
              const clonedElement = element || clonedDoc.body;
              const images = clonedElement.querySelectorAll('img');
              images.forEach((img) => {
                const htmlImg = img as HTMLImageElement;
                htmlImg.crossOrigin = 'anonymous';
                if (htmlImg.naturalWidth === 0 || htmlImg.naturalHeight === 0) {
                  htmlImg.style.display = 'none';
                  htmlImg.src = '';
                }
              });
            } catch (e) {
              console.error('[Altar] Error in onclone:', e);
            }
          },
          ignoreElements: (element) => {
            if (element instanceof HTMLImageElement) {
              if (element.naturalWidth === 0 || element.naturalHeight === 0) {
                return true;
              }
            }
            return false;
          },
        });
      } catch (e) {
        console.error('[Altar] Fallback capture failed:', e);
      }
    }
    
    if (cardCanvas && cardWidth > 0 && cardHeight > 0) {
      const cardContainer = document.createElement("div");
      cardContainer.className = "disintegration-container";
      
      const cardRect = altarCardRef.value.getBoundingClientRect();
      const slotRect = cardSlot.getBoundingClientRect();
      const relativeTop = cardRect.top - slotRect.top;
      const relativeLeft = cardRect.left - slotRect.left;
      
      cardContainer.style.cssText = `
        position: absolute;
        top: ${relativeTop}px;
        left: ${relativeLeft}px;
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        pointer-events: none;
        z-index: 100;
        overflow: visible;
      `;

      cardSlot.appendChild(cardContainer);
      gsap.set(altarCardRef.value, { opacity: 0 });

      await createDisintegrationEffect(cardCanvas, cardContainer, {
        frameCount: 64,
        direction: "out",
        duration: 1.2,
        delayMultiplier: 0.7,
        targetWidth: cardWidth,
        targetHeight: cardHeight,
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      cardContainer.remove();
    } else {
      if (altarCardRef.value) {
        gsap.set(altarCardRef.value, { opacity: 0 });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  } catch (error) {
    gsap.to(altarCardRef.value, { opacity: 0, scale: 0.8, duration: 0.5 });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  cleanupAfterDestruction(destroyedCardUid);
};

// Flip card to back (first part of Vaal ritual)
// Handle Vaal outcome - instant result
const handleVaalOutcome = async (outcome: VaalOutcome) => {
  // IMPORTANT: Capture card data BEFORE animation starts
  // After animation, displayCard may have changed (foil, transform, etc.)
  const cardBeforeAnimation = displayCard.value;
  if (!cardBeforeAnimation) {
    console.warn("handleVaalOutcome called without a card on altar");
    return;
  }

  const capturedCardData = {
    cardId: cardBeforeAnimation.id,
    tier: cardBeforeAnimation.tier,
  };

  const shouldRecord = isRecording.value && shouldRecordOutcome(outcome);
  let resultCardId: string | undefined;

  // Execute the outcome animation first (for outcomes that produce a result)
  switch (outcome) {
    case "nothing":
      console.log('[Altar] NOTHING: Starting outcome...')
      await executeNothing();
      // Sync: consume vaalOrb only
      if (loggedIn.value && authUser.value?.displayName && handleSyncRequired) {
        console.log('[Altar] NOTHING: Syncing to API...')
        const updates = new Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>();
        await handleSyncRequired(updates, -1, 'nothing'); // Consume 1 vaalOrb
        console.log('[Altar] NOTHING: Sync completed')
      }
      break;

    case "foil":
      await executeFoil();
      // Sync handled by executeFoil via onSyncRequired callback
      break;

    case "destroyed":
      await destroyCard();
      // Sync handled by cleanupAfterDestruction
      break;

    case "transform":
      // Transform returns the new card - capture it for the replay
      const transformResult = await executeTransform();
      if (transformResult.newCard) {
        resultCardId = transformResult.newCard.id;
      }
      // Sync handled by executeTransform via onSyncRequired callback
      break;

    case "duplicate":
      await executeDuplicate();
      // Sync handled by executeDuplicate via onSyncRequired callback
      break;
  }

  // Handle recording AFTER the outcome so we have the result info
  if (shouldRecord) {
    // Full recording - will save replay AND activity log (with replay link)
    stopRecording(outcome, resultCardId);
    lastRecordedOutcome.value = outcome;
    urlCopied.value = false;

    // Wait a moment after the animation completes so user can see the result
    // before showing the share modal
    setTimeout(() => {
      showShareModal.value = true;
    }, 1200);
  } else {
    // No replay recorded - but still log the activity for the real-time feed
    // Use captured card data from BEFORE the animation
    logActivityOnly(capturedCardData, outcome, resultCardId);

    // Cancel any in-progress recording if outcome wasn't selected for recording
    if (isRecording.value) {
      cancelRecording();
    }
  }

  // Force reset aura to dormant state after any Vaal outcome
  resetAura();
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
  if (!altarCardRef.value || isBlockingInteractions.value || !isCardOnAltar.value) return;

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
const altarAreaRef = ref<HTMLElement | null>(null);
const altarPlatformRef = ref<HTMLElement | null>(null);
const floatingOrbRef = ref<HTMLElement | null>(null);
const orbRefs = ref<HTMLElement[]>([]);

// Store origin position for return animation
let originX = 0;
let originY = 0;
let currentX = 0;
let currentY = 0;
// Store click offset from orb center to prevent jump on drag start
let clickOffsetX = 0;
let clickOffsetY = 0;

// ==========================================
// HEARTBEAT EFFECT - Using shared composable
// ==========================================
const isAnimatingRef = computed(
  () => isAnimating.value || !isCardOnAltar.value
);

// Global state to block interactions during critical operations
const isBlockingInteractions = computed(() => {
  return (
    isLoadingCollection.value ||
    isReloadingCollection.value ||
    isSyncProcessing.value ||
    isCollectionSyncing.value ||
    isAnimating.value ||
    isCardBeingDestroyed.value ||
    isCardAnimatingIn.value ||
    isCardAnimatingOut.value ||
    isDraggingOrb.value ||
    isReturningOrb.value
  );
});

const {
  heartbeatIntensity,
  isOrbOverCard,
  createHeartbeatStyles,
  updateHeartbeat,
  resetEffects: resetHeartbeatEffects,
  // Earthquake effect styles
  earthquakeHeaderStyles,
  earthquakeVaalStyles,
  earthquakeBodyStyles,
  getEarthquakeClasses,
} = useAltarEffects({
  cardRef: altarCardRef,
  isActive: isDraggingOrb,
  isDestroying: isCardBeingDestroyed,
  autoWatch: false, // We call updateHeartbeat manually in onDragOrb
});

// Create heartbeat styles with additional animation check
const heartbeatStyles = createHeartbeatStyles(isAnimatingRef);

// Computed classes for earthquake effect on different UI sections
const headerEarthquakeClasses = computed(() => getEarthquakeClasses("header"));
const vaalSectionEarthquakeClasses = computed(() =>
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

// Prevent scrollbar flicker during orb drag (earthquake effect can cause overflow)
watch(isDraggingOrb, (isDragging) => {
  if (typeof document !== "undefined") {
    if (isDragging) {
      document.documentElement.classList.add("no-scroll-during-drag");
      document.body.classList.add("no-scroll-during-drag");
    } else {
      document.documentElement.classList.remove("no-scroll-during-drag");
      document.body.classList.remove("no-scroll-during-drag");
    }
  }
});

// Altar Aura Effect - outer glow, rays, and particles
const { auraContainer, resetAura } = useAltarAura({
  containerRef: altarPlatformRef,
  isActive: isAltarActive,
  isVaalMode: isOrbOverCard,
  tier: computed(() => displayCard.value?.tier),
  isFoil: computed(() => isFoilReady.value),
});

// Set orb ref
const setOrbRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    orbRefs.value[index] = el;
  }
};

const startDragOrb = (event: MouseEvent | TouchEvent, index: number) => {
  // Cannot use Vaal Orb during critical operations or on already foil cards
  if (
    vaalOrbs.value <= 0 ||
    !isCardOnAltar.value ||
    isBlockingInteractions.value ||
    isReturningOrb.value ||
    isCurrentCardFoil.value
  )
    return;

  event.preventDefault();

  // Close share modal if present (to allow new recording)
  if (showShareModal.value) {
    closeShareModal();
  }

  // Auto-start recording if enabled
  startAutoRecording();

  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;

  // Get the origin position of the orb element
  const orbElement = orbRefs.value[index];
  if (orbElement) {
    const rect = orbElement.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;

    // Calculate click offset from orb center to prevent jump
    clickOffsetX = clientX - originX;
    clickOffsetY = clientY - originY;
  }

  isDraggingOrb.value = true;
  draggedOrbIndex.value = index;

  currentX = clientX;
  currentY = clientY;

  // Record initial position and orb_pickup event relative to card center
  if (isRecording.value && altarCardRef.value) {
    const cardRect = altarCardRef.value.getBoundingClientRect();
    const cardCenter = {
      x: cardRect.left + cardRect.width / 2,
      y: cardRect.top + cardRect.height / 2,
    };
    recordEvent("orb_pickup", {
      x: clientX - cardCenter.x,
      y: clientY - cardCenter.y,
    });
    recordPosition(clientX, clientY, cardCenter);
  }

  // Wait for floating orb to be rendered, then set initial position
  // Position the floating orb so that the click point stays at the same visual position
  nextTick(() => {
    if (floatingOrbRef.value) {
      // Position orb center at (clientX - clickOffsetX, clientY - clickOffsetY)
      // This keeps the orb visually in the same place as the original
      const orbCenterX = clientX - clickOffsetX;
      const orbCenterY = clientY - clickOffsetY;

      gsap.set(floatingOrbRef.value, {
        left: orbCenterX,
        top: orbCenterY,
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

  // Calculate orb center position by applying click offset
  const orbCenterX = clientX - clickOffsetX;
  const orbCenterY = clientY - clickOffsetY;

  // Instant position update using GSAP set (no animation)
  // Apply click offset to keep orb visually attached to click point
  gsap.set(floatingOrbRef.value, {
    left: orbCenterX,
    top: orbCenterY,
  });

  // Check if orb is over the card (use orb center, not mouse position)
  if (altarCardRef.value) {
    const cardRect = altarCardRef.value.getBoundingClientRect();
    const isOver =
      orbCenterX >= cardRect.left &&
      orbCenterX <= cardRect.right &&
      orbCenterY >= cardRect.top &&
      orbCenterY <= cardRect.bottom;

    // Record card hover/leave events for replay
    if (isRecording.value && isOver !== isOrbOverCard.value) {
      const cardCenter = {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height / 2,
      };
      recordEvent(isOver ? "card_hover" : "card_leave", {
        x: orbCenterX - cardCenter.x,
        y: orbCenterY - cardCenter.y,
      });
    }

    isOrbOverCard.value = isOver;
  }

  // Update heartbeat intensity based on proximity (use orb center)
  updateHeartbeat(orbCenterX, orbCenterY);

  // Record position for replay relative to card center
  if (isRecording.value && altarCardRef.value) {
    const cardRect = altarCardRef.value.getBoundingClientRect();
    const cardCenter = {
      x: cardRect.left + cardRect.width / 2,
      y: cardRect.top + cardRect.height / 2,
    };
    recordPosition(orbCenterX, orbCenterY, cardCenter);
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

    // NOTE: Don't decrement vaalOrbs here - it's handled by handleSyncRequired
    // via vaalOrbsDelta in each outcome (duplicate, destroyed, transform, etc.)
    isDraggingOrb.value = false;
    draggedOrbIndex.value = null;
    resetHeartbeatEffects(); // Reset heartbeat and isOrbOverCard

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
    resetHeartbeatEffects(); // Reset heartbeat when returning

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
    resetHeartbeatEffects();
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
            {{ t("altar.auth.title") }}
          </h1>
          <p class="font-body text-poe-text-dim mb-8 leading-relaxed">
            {{ t("altar.auth.description") }}
          </p>
          <RunicButton
            href="/auth/twitch"
            :external="false"
            variant="twitch"
            icon="twitch"
            rune-left="✦"
            rune-right="✦"
          >
            {{ t("altar.auth.button") }}
          </RunicButton>
        </RunicBox>
      </div>

      <!-- Altar Closed Message -->
      <div
        v-if="loggedIn && !altarOpen && !isLoadingSettings"
        class="altar-closed"
      >
        <RunicBox padding="lg" max-width="500px" centered>
          <div class="altar-closed__icon">
            <img
              src="/images/vaal-risitas.png"
              alt="Vaal Orb"
              class="altar-closed__icon-image"
            />
          </div>
          <h1 class="altar-closed__title">
            {{ t("altar.closed.title") }}
          </h1>
          <p class="altar-closed__description">
            {{ t("altar.closed.description") }}
          </p>
          <div class="altar-closed__hint">
            <span class="altar-closed__rune">◆</span>
            <span>{{ t("altar.closed.hint") }}</span>
            <span class="altar-closed__rune">◆</span>
          </div>
          <div class="altar-closed__actions">
            <RunicButton
              href="https://twitch.tv/les_doseurs"
              :external="true"
              variant="twitch"
              icon="twitch"
            >
              Rejoindre le Stream
            </RunicButton>
          </div>
        </RunicBox>
      </div>

      <!-- Main altar content -->
      <div
        v-if="loggedIn && altarOpen"
        class="altar-page"
        :class="bodyEarthquakeClasses"
        :style="earthquakeBodyStyles"
      >
        <!-- Header + Card selector -->
        <div
          class="altar-selector-section"
          :class="headerEarthquakeClasses"
          :style="earthquakeHeaderStyles"
        >
          <RunicHeader
            :title="t('altar.title')"
            :subtitle="t('altar.subtitle')"
            attached
          />
          <RunicBox padding="md" attached>
            <div class="selector-grid">
              <!-- Card selection -->
              <div class="selector-field">
                <label class="selector-label">{{
                  t("altar.selector.chooseCard")
                }}</label>
                <RunicSelect
                  v-model="selectedCardId"
                  :options="cardOptions"
                  :placeholder="t('altar.selector.selectCard')"
                  size="md"
                  :searchable="true"
                  :disabled="isBlockingInteractions"
                />
              </div>

              <!-- Variation selection (if multiple) -->
              <div
                v-if="selectedCardGroup?.hasMultipleVariations"
                class="selector-field"
              >
                <label class="selector-label">{{
                  t("altar.selector.variant")
                }}</label>
                <RunicSelect
                  v-model="selectedVariation"
                  :options="variationOptions"
                  :placeholder="t('altar.selector.chooseVariant')"
                  size="md"
                  :disabled="isBlockingInteractions"
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
                  :disabled="isBlockingInteractions"
                  @click="removeCardFromAltar"
                >
                  {{ t("altar.selector.remove") }}
                </RunicButton>
              </div>
            </div>
          </RunicBox>
        </div>

        <!-- Altar area -->
        <div ref="altarAreaRef" class="altar-area">
          <!-- The altar platform -->
          <div
            ref="altarPlatformRef"
            class="altar-platform"
            :class="altarClasses"
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
                <p class="altar-empty__text">{{ t("altar.empty") }}</p>
              </div>

              <!-- Card display with 3D flip -->
              <div
                v-if="displayCard && isCardOnAltar"
                ref="altarCardRef"
                class="altar-card"
                :class="{
                  'altar-card--flipped': isCardFlipped,
                  'altar-card--animating':
                    isCardAnimatingIn || isCardAnimatingOut,
                  'altar-card--heartbeat':
                    !isCardAnimatingIn &&
                    !isCardAnimatingOut &&
                    !isCardBeingDestroyed &&
                    !isAnimating,
                  'altar-card--panicking':
                    isDraggingOrb && !isCardAnimatingIn && !isCardAnimatingOut,
                  'altar-card--destroying': isCardBeingDestroyed,
                }"
                :style="heartbeatStyles"
              >
                <!-- Front face - GameCard with full interactivity -->
                <div
                  ref="cardFrontRef"
                  class="altar-card__face altar-card__face--front"
                >
                  <div class="altar-card__game-card-wrapper">
                    <GameCard :card="displayCard" :owned="true" />
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
                      <div
                        class="card-back__line card-back__line--bottom"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Vaal Orbs inventory -->
        <div
          class="vaal-orbs-section"
          :class="vaalSectionEarthquakeClasses"
          :style="earthquakeVaalStyles"
        >
          <!-- Header with actions -->
          <div class="vaal-header-wrapper">
            <div class="vaal-header">
              <div class="vaal-header__accent vaal-header__accent--left"></div>
              <div class="vaal-header__accent vaal-header__accent--right"></div>

              <div class="vaal-header__content">
                <div class="vaal-header__left">
                  <h3 class="vaal-header__title">
                    <span class="vaal-header__rune">◆</span>
                    {{ t("altar.vaalOrbs.title") }}
                    <span class="vaal-header__rune">◆</span>
                  </h3>
                  <p class="vaal-header__subtitle">
                    <template v-if="isCurrentCardFoil">
                      <span class="vaal-header__subtitle--foil">{{
                        t("altar.vaalOrbs.foilMessage")
                      }}</span>
                    </template>
                    <template v-else>
                      {{ t("altar.vaalOrbs.subtitle") }}
                    </template>
                  </p>
                </div>

                <div class="vaal-header__actions">
                  <span
                    v-if="isRecording"
                    class="vaal-header__recording"
                    :title="t('altar.vaalOrbs.recording')"
                  >
                    <span class="vaal-header__recording-dot"></span>
                    <span class="vaal-header__recording-text">{{
                      t("altar.vaalOrbs.rec")
                    }}</span>
                  </span>
                  <span class="vaal-header__count">{{ vaalOrbs }}</span>
                  <RunicButton
                    variant="ghost"
                    size="sm"
                    icon="settings"
                    class="vaal-header__settings"
                    :title="t('altar.preferences.title')"
                    @click="showPreferencesModal = true"
                  >
                    <span class="sr-only">{{
                      t("altar.preferences.title")
                    }}</span>
                  </RunicButton>
                </div>
              </div>

              <div class="vaal-header__edge"></div>
            </div>
          </div>

          <RunicBox padding="md" class="vaal-orbs-box" attached>
            <div class="vaal-orbs-inventory">
              <button
                v-for="(_, index) in vaalOrbs"
                :key="index"
                :ref="(el) => setOrbRef(el as HTMLElement, index)"
                class="vaal-orb"
                :class="{
                  'vaal-orb--disabled':
                    !isCardOnAltar ||
                    isBlockingInteractions ||
                    isReturningOrb ||
                    isCurrentCardFoil,
                  'vaal-orb--dragging': draggedOrbIndex === index,
                }"
                :disabled="isBlockingInteractions"
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
                <span class="vaal-orbs-empty__text">{{
                  t("altar.vaalOrbs.empty")
                }}</span>
              </div>
              
              <!-- Loading state indicator -->
              <div
                v-if="isBlockingInteractions && vaalOrbs > 0"
                class="vaal-orbs-loading"
                :title="t('altar.vaalOrbs.syncing')"
              >
                <span class="vaal-orbs-loading__spinner">⟳</span>
                <span class="vaal-orbs-loading__text">{{
                  isLoadingCollection || isReloadingCollection
                    ? t("altar.vaalOrbs.loading")
                    : t("altar.vaalOrbs.syncing")
                }}</span>
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
              'vaal-orb--returning': isReturningOrb,
            }"
          >
            <img
              :src="cardBackLogoUrl"
              alt="Vaal Orb"
              class="vaal-orb__image"
            />
          </div>
        </Teleport>

        <!-- Preferences Modal -->
        <Teleport to="body">
          <Transition name="modal">
            <div
              v-if="showPreferencesModal"
              class="prefs-modal-overlay"
              @click.self="showPreferencesModal = false"
            >
              <div class="prefs-modal">
                <div class="prefs-modal__header">
                  <h3 class="prefs-modal__title">
                    <span class="prefs-modal__icon">⚙</span>
                    {{ t("altar.preferences.title") }}
                  </h3>
                  <button
                    type="button"
                    class="prefs-modal__close"
                    :aria-label="t('common.close')"
                    @click="showPreferencesModal = false"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div class="prefs-modal__content">
                  <!-- Recording Preferences Section -->
                  <div class="prefs-section">
                    <h4 class="prefs-section__title">
                      {{ t("altar.preferences.autoRecording") }}
                    </h4>
                    <p class="prefs-section__hint">
                      {{ t("altar.preferences.autoRecordingHint") }}
                    </p>

                    <div class="prefs-toggles">
                      <div class="prefs-toggle">
                        <span class="prefs-toggle__label">{{
                          t("vaalOutcomes.nothing.label")
                        }}</span>
                        <RunicRadio
                          v-model="recordOnNothing"
                          :toggle="true"
                          size="sm"
                        />
                      </div>

                      <div class="prefs-toggle">
                        <span
                          class="prefs-toggle__label prefs-toggle__label--foil"
                          >{{ t("vaalOutcomes.foil.label") }}</span
                        >
                        <RunicRadio
                          v-model="recordOnFoil"
                          :toggle="true"
                          size="sm"
                        />
                      </div>

                      <div class="prefs-toggle">
                        <span
                          class="prefs-toggle__label prefs-toggle__label--destroyed"
                          >{{ t("vaalOutcomes.destroyed.label") }}</span
                        >
                        <RunicRadio
                          v-model="recordOnDestroyed"
                          :toggle="true"
                          size="sm"
                        />
                      </div>

                      <div class="prefs-toggle">
                        <span
                          class="prefs-toggle__label prefs-toggle__label--transform"
                          >{{ t("vaalOutcomes.transform.label") }}</span
                        >
                        <RunicRadio
                          v-model="recordOnTransform"
                          :toggle="true"
                          size="sm"
                        />
                      </div>

                      <div class="prefs-toggle">
                        <span
                          class="prefs-toggle__label prefs-toggle__label--duplicate"
                          >{{ t("vaalOutcomes.duplicate.label") }}</span
                        >
                        <RunicRadio
                          v-model="recordOnDuplicate"
                          :toggle="true"
                          size="sm"
                        />
                      </div>

                      <p class="prefs-experimental-notice">
                        {{ t("altar.preferences.experimental") }}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Share Replay Panel - Slides up from bottom -->
        <Teleport to="body">
          <Transition name="share-slide">
            <div
              v-if="showShareModal"
              class="share-panel-container"
              :class="`share-panel--${shareModalContent.theme}`"
            >
              <div class="share-panel">
                <div class="share-panel__header">
                  <div class="share-panel__title-row">
                    <span class="share-panel__icon">{{
                      shareModalContent.icon
                    }}</span>
                    <h3 class="share-panel__title">
                      {{ shareModalContent.title }}
                    </h3>
                  </div>
                  <button
                    type="button"
                    class="share-panel__close"
                    :aria-label="t('common.close')"
                    @click="closeShareModal"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <p class="share-panel__text">{{ shareModalContent.text }}</p>

                <!-- Error state -->
                <div v-if="saveError" class="share-panel__error">
                  <span class="share-panel__error-icon">⚠</span>
                  <span class="share-panel__error-text">{{ saveError }}</span>
                </div>

                <!-- URL state -->
                <div v-else class="share-panel__url">
                  <template v-if="generatedUrl">
                    <input
                      type="text"
                      :value="generatedUrl"
                      readonly
                      class="share-panel__input"
                      @click="($event.target as HTMLInputElement).select()"
                    />
                    <RunicButton
                      variant="primary"
                      size="sm"
                      @click="handleCopyUrl"
                    >
                      {{
                        urlCopied
                          ? t("altar.share.copied")
                          : t("altar.share.copy")
                      }}
                    </RunicButton>
                  </template>
                  <template v-else>
                    <div class="share-panel__input share-panel__input--loading">
                      <span>{{ t("altar.share.generating") }}</span>
                      <span class="share-panel__spinner"></span>
                    </div>
                  </template>
                </div>

                <div
                  v-if="generatedUrl && !saveError"
                  class="share-panel__actions"
                >
                  <a
                    :href="generatedUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="share-btn"
                    :class="shareModalContent.buttonClass"
                  >
                    <span class="share-btn__text">{{
                      shareModalContent.linkText
                    }}</span>
                    <svg
                      class="share-btn__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
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

/* ==========================================
   CARD SELECTOR SECTION
   ========================================== */
.altar-selector-section {
  margin-bottom: 0.5rem;
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
    gap: 1.5rem;
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
    flex: 0 0 auto;
    width: 280px;
  }

  .selector-field--action {
    flex: 0 0 auto;
    width: auto;
    margin-left: auto;
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
   ALTAR STYLES
   Most altar styling is in assets/css/altar.css (globally loaded)
   Below are only page-specific overrides
   ========================================== */

/* ==========================================
   ALTAR EMPTY STATE (page-specific)
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
  0%,
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.6;
  }
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
  0%,
  100% {
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
  0%,
  100% {
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
  0%,
  100% {
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
  0%,
  100% {
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

.card-back__line--top {
  top: 45px;
}
.card-back__line--bottom {
  bottom: 45px;
}

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

/* ==========================================
   VAAL HEADER - Custom header with actions
   ========================================== */
.vaal-header-wrapper {
  position: relative;
  padding: 0 12px;
  margin-bottom: -1px;
}

@media (min-width: 640px) {
  .vaal-header-wrapper {
    padding: 0 16px;
  }
}

@media (min-width: 768px) {
  .vaal-header-wrapper {
    padding: 0 20px;
  }
}

.vaal-header {
  position: relative;
  padding: 1rem 1.25rem;
  background: linear-gradient(
    180deg,
    rgba(16, 16, 18, 0.98) 0%,
    rgba(12, 12, 14, 0.95) 60%,
    rgba(10, 10, 12, 0.98) 100%
  );
  border-radius: 6px 6px 0 0;
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.6),
    inset 0 1px 3px rgba(0, 0, 0, 0.7), inset 0 -1px 2px rgba(50, 45, 40, 0.05),
    0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(40, 38, 35, 0.6);
  border-bottom: none;
}

.vaal-header__accent {
  position: absolute;
  top: 10px;
  width: 25px;
  height: 1px;
  pointer-events: none;
}

.vaal-header__accent--left {
  left: 10px;
  background: linear-gradient(
    to right,
    rgba(175, 96, 37, 0.5),
    rgba(80, 70, 55, 0.2),
    transparent
  );
}

.vaal-header__accent--right {
  right: 10px;
  background: linear-gradient(
    to left,
    rgba(175, 96, 37, 0.5),
    rgba(80, 70, 55, 0.2),
    transparent
  );
}

.vaal-header__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.vaal-header__left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vaal-header__title {
  font-family: "Cinzel", serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #d4c4a8;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 15px rgba(175, 96, 37, 0.15);
}

@media (min-width: 640px) {
  .vaal-header__title {
    font-size: 1.125rem;
  }
}

.vaal-header__rune {
  display: inline-block;
  font-size: 0.4rem;
  color: rgba(175, 96, 37, 0.6);
  margin: 0 0.5rem;
  vertical-align: middle;
  text-shadow: 0 0 8px rgba(175, 96, 37, 0.4);
}

.vaal-header__subtitle {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  font-style: italic;
  color: rgba(140, 130, 120, 0.7);
  margin: 0;
}

.vaal-header__subtitle--foil {
  color: rgba(255, 215, 100, 0.8);
  font-style: normal;
}

.vaal-header__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.vaal-header__recording {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.vaal-header__recording-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e53935;
  box-shadow: 0 0 6px rgba(229, 57, 53, 0.8);
  animation: recording-pulse 1s ease-in-out infinite;
}

.vaal-header__recording-text {
  font-family: "Cinzel", serif;
  font-size: 0.625rem;
  font-weight: 600;
  color: #e53935;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vaal-header__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  background: linear-gradient(
    180deg,
    rgba(175, 96, 37, 0.2) 0%,
    rgba(175, 96, 37, 0.1) 100%
  );
  border: 1px solid rgba(175, 96, 37, 0.4);
  border-radius: 14px;
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
}

.vaal-header__settings {
  padding: 0.375rem !important;
}

.vaal-header__settings :deep(.runic-button__text) {
  display: none;
}

.vaal-header__edge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(60, 55, 48, 0.4) 15%,
    rgba(80, 70, 55, 0.5) 50%,
    rgba(60, 55, 48, 0.4) 85%,
    transparent
  );
}

@keyframes recording-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
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
  font-size: 1.0625rem;
  font-style: italic;
}

.vaal-orbs-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: rgba(100, 90, 80, 0.7);
  width: 100%;
}

.vaal-orbs-loading__spinner {
  font-size: 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.vaal-orbs-loading__text {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  font-style: italic;
  opacity: 0.8;
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
  opacity: 1;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s ease,
    opacity 0.4s ease;
}

.vaal-orb:active {
  cursor: grabbing;
}

.vaal-orb--disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(0.6) brightness(0.7);
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
  transition: filter 0.4s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  0%,
  100% {
    transform: scale(1.3);
  }
  50% {
    transform: scale(1.4);
  }
}

/* ==========================================
   PREFERENCES MODAL
   ========================================== */
.prefs-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.prefs-modal {
  background: linear-gradient(
    180deg,
    rgba(18, 18, 22, 0.98) 0%,
    rgba(12, 12, 15, 0.99) 50%,
    rgba(14, 14, 18, 0.98) 100%
  );
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 8px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(80, 75, 70, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

.prefs-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.prefs-modal__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #c9a227;
  text-shadow: 0 0 20px rgba(201, 162, 39, 0.3);
  margin: 0;
}

.prefs-modal__icon {
  font-size: 1.25rem;
}

.prefs-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  color: rgba(140, 130, 120, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.prefs-modal__close:hover {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.prefs-modal__close svg {
  width: 18px;
  height: 18px;
}

.prefs-modal__content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Preferences Sections */
.prefs-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.prefs-section__title {
  font-family: "Cinzel", serif;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(180, 170, 160, 0.9);
  margin: 0;
}

.prefs-section__hint {
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  color: rgba(140, 130, 120, 0.7);
  margin: 0 0 0.5rem;
}

.prefs-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(60, 55, 50, 0.4),
    transparent
  );
  margin: 0.5rem 0;
}

/* Preferences Toggles */
.prefs-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.prefs-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(60, 55, 50, 0.25);
  border-radius: 4px;
}

.prefs-toggle__label {
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  color: rgba(200, 190, 180, 0.85);
}

.prefs-toggle__label--foil {
  color: #ffd700;
}

.prefs-toggle__label--destroyed {
  color: #e05050;
}

.prefs-toggle__label--transform {
  color: #50b0e0;
}

.prefs-toggle__label--duplicate {
  color: #50e0a0;
}

/* Experimental Notice */
.prefs-experimental-notice {
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(200, 170, 90, 0.9);
  background: rgba(200, 160, 80, 0.12);
  border: 1px solid rgba(200, 160, 80, 0.25);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  margin: 1rem 0 0 0;
  line-height: 1.5;
  text-align: center;
}

.prefs-experimental-notice strong {
  color: rgba(230, 200, 100, 1);
  font-weight: 700;
}

/* Preferences Fields (Admin section) */
.prefs-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prefs-field__label {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 190, 180, 0.8);
}

.prefs-field__hint {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  font-style: italic;
  color: rgba(140, 130, 120, 0.6);
  margin: 0;
}

.prefs-field__number {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.prefs-field__btn {
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

.prefs-field__btn:hover:not(:disabled) {
  background: linear-gradient(
    180deg,
    rgba(40, 38, 35, 0.9) 0%,
    rgba(30, 28, 25, 0.95) 100%
  );
  border-color: rgba(175, 96, 37, 0.5);
  color: var(--color-accent);
}

.prefs-field__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.prefs-field__value {
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

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .prefs-modal,
.modal-leave-active .prefs-modal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .prefs-modal,
.modal-leave-to .prefs-modal {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

.record-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
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
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

/* ==========================================
   SHARE PANEL - Notification banner style
   ========================================== */
.share-panel-container {
  position: fixed;
  bottom: 1.5rem;
  left: 0;
  right: 0;
  z-index: 10000;
  padding: 0 1rem;
  pointer-events: none;
}

.share-panel {
  pointer-events: auto;
  max-width: 400px;
  margin: 0 auto;
  position: relative;

  /* Dark runic background */
  background: linear-gradient(
    180deg,
    rgba(18, 18, 22, 0.98) 0%,
    rgba(12, 12, 15, 0.99) 50%,
    rgba(14, 14, 18, 0.98) 100%
  );

  /* Sharp runic border */
  border: 1px solid rgba(60, 55, 50, 0.5);
  border-radius: 4px;

  /* Strong shadow for floating effect */
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7), 0 4px 20px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(80, 75, 70, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

/* Runic corner decorations */
.share-panel::before,
.share-panel::after {
  content: "✧";
  position: absolute;
  font-size: 0.6rem;
  color: rgba(120, 110, 100, 0.4);
  pointer-events: none;
}

.share-panel::before {
  top: 6px;
  left: 8px;
}

.share-panel::after {
  top: 6px;
  right: 8px;
}

.share-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.25);
}

.share-panel__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.share-panel__icon {
  font-size: 1rem;
}

.share-panel__title {
  font-family: "Cinzel", serif;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  margin: 0;
}

.share-panel__close {
  background: transparent;
  border: none;
  color: rgba(150, 140, 130, 0.5);
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  padding: 0;
}

.share-panel__close svg {
  width: 14px;
  height: 14px;
}

.share-panel__close:hover {
  color: var(--color-text);
}

.share-panel__text {
  color: rgba(180, 170, 160, 0.85);
  font-size: 1rem;
  line-height: 1.4;
  margin: 0;
  padding: 0.75rem 1rem 0;
}

.share-panel__url {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
  padding: 0.75rem 1rem;
}

.share-panel__input {
  flex: 1;
  background: rgba(10, 10, 12, 0.6);
  border: 1px solid rgba(50, 48, 45, 0.5);
  border-radius: 2px;
  padding: 0.5rem 0.625rem;
  color: var(--color-text);
  font-family: monospace;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.share-panel__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.share-panel__input--loading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: rgba(150, 145, 140, 0.5);
  font-style: italic;
  font-family: inherit;
}

.share-panel__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(150, 145, 140, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.share-panel__actions {
  padding: 0.75rem 1rem 1rem;
  display: flex;
  justify-content: center;
}

/* ==========================================
   THEMED SHARE BUTTONS
   ========================================== */
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.share-btn::before {
  content: "";
  position: absolute;
  inset: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1px;
  pointer-events: none;
}

.share-btn__text {
  position: relative;
  z-index: 1;
}

.share-btn__icon {
  width: 14px;
  height: 14px;
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease;
}

.share-btn:hover .share-btn__icon {
  transform: translate(2px, -2px);
}

/* Default - Gold */
.share-btn--default {
  color: #c9a227;
  background: linear-gradient(
    180deg,
    rgba(30, 25, 20, 0.95) 0%,
    rgba(15, 12, 10, 0.98) 100%
  );
  border: 1px solid rgba(100, 80, 60, 0.4);
  box-shadow: inset 0 1px 0 rgba(100, 80, 60, 0.2), 0 2px 8px rgba(0, 0, 0, 0.4);
}

.share-btn--default:hover {
  color: #e0c060;
  border-color: rgba(150, 120, 80, 0.5);
  box-shadow: inset 0 1px 0 rgba(150, 120, 80, 0.3),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(201, 162, 39, 0.15);
}

/* Nothing - Muted/Grey */
.share-btn--nothing {
  color: rgba(140, 135, 130, 0.8);
  background: linear-gradient(
    180deg,
    rgba(25, 24, 23, 0.95) 0%,
    rgba(15, 14, 13, 0.98) 100%
  );
  border: 1px solid rgba(70, 65, 60, 0.35);
  box-shadow: inset 0 1px 0 rgba(70, 65, 60, 0.15), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.share-btn--nothing:hover {
  color: rgba(170, 165, 160, 0.9);
  border-color: rgba(90, 85, 80, 0.45);
}

/* Destroyed - Red/Blood */
.share-btn--destroyed {
  color: #c83232;
  background: linear-gradient(
    180deg,
    rgba(35, 15, 15, 0.95) 0%,
    rgba(20, 8, 8, 0.98) 100%
  );
  border: 1px solid rgba(180, 50, 50, 0.35);
  box-shadow: inset 0 1px 0 rgba(180, 50, 50, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.share-btn--destroyed:hover {
  color: #e55050;
  border-color: rgba(200, 60, 60, 0.5);
  box-shadow: inset 0 1px 0 rgba(200, 60, 60, 0.25),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(200, 50, 50, 0.2);
}

/* Foil - Prismatic/Holographic */
.share-btn--foil {
  color: #e0d0f0;
  background: linear-gradient(
    180deg,
    rgba(30, 25, 35, 0.95) 0%,
    rgba(15, 12, 18, 0.98) 100%
  );
  border: 1px solid rgba(160, 140, 200, 0.4);
  box-shadow: inset 0 1px 0 rgba(200, 180, 255, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.4);
  position: relative;
}

.share-btn--foil::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(192, 160, 255, 0.15) 0%,
    rgba(255, 160, 192, 0.15) 25%,
    rgba(160, 255, 192, 0.15) 50%,
    rgba(160, 192, 255, 0.15) 75%,
    rgba(192, 160, 255, 0.15) 100%
  );
  background-size: 400% 400%;
  animation: foilShimmer 4s linear infinite;
  pointer-events: none;
  border-radius: 2px;
}

.share-btn--foil:hover {
  color: #fff;
  border-color: rgba(192, 160, 255, 0.6);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 25px rgba(192, 160, 255, 0.25),
    0 0 40px rgba(255, 160, 192, 0.15);
}

@keyframes foilShimmer {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 400% 400%;
  }
}

/* Transform - Blue/Cyan mystical */
.share-btn--transform {
  color: #50b0e0;
  background: linear-gradient(
    180deg,
    rgba(15, 25, 35, 0.95) 0%,
    rgba(8, 15, 22, 0.98) 100%
  );
  border: 1px solid rgba(80, 160, 200, 0.35);
  box-shadow: inset 0 1px 0 rgba(80, 176, 224, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.share-btn--transform:hover {
  color: #80d0ff;
  border-color: rgba(100, 180, 220, 0.5);
  box-shadow: inset 0 1px 0 rgba(100, 180, 220, 0.25),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(80, 176, 224, 0.2);
}

/* Duplicate - Green/Teal miracle */
.share-btn--duplicate {
  color: #50e0a0;
  background: linear-gradient(
    180deg,
    rgba(15, 30, 25, 0.95) 0%,
    rgba(8, 18, 14, 0.98) 100%
  );
  border: 1px solid rgba(80, 200, 150, 0.35);
  box-shadow: inset 0 1px 0 rgba(80, 224, 160, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.share-btn--duplicate:hover {
  color: #80ffc0;
  border-color: rgba(100, 220, 170, 0.5);
  box-shadow: inset 0 1px 0 rgba(100, 220, 170, 0.25),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(80, 224, 160, 0.2);
}

/* Error state */
.share-panel__error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(180, 50, 50, 0.15);
  border: 1px solid rgba(180, 50, 50, 0.3);
  border-radius: 2px;
  margin: 0.75rem 1rem;
}

.share-panel__error-icon {
  color: #c83232;
  font-size: 1rem;
}

.share-panel__error-text {
  color: rgba(220, 150, 150, 0.9);
  font-size: 1rem;
}

/* Share Panel Slide Animation */
.share-slide-enter-active,
.share-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

.share-slide-enter-from,
.share-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.share-slide-enter-to,
.share-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

/* Share Panel Themes */
.share-panel--destroyed .share-panel {
  border-color: rgba(180, 50, 50, 0.35);
}

.share-panel--destroyed .share-panel__title {
  color: #c83232;
}

.share-panel--destroyed .share-panel__text {
  color: rgba(200, 120, 120, 0.8);
}

.share-panel--destroyed .share-panel__link {
  color: #c83232;
}

.share-panel--destroyed .share-panel::before,
.share-panel--destroyed .share-panel::after {
  color: rgba(200, 50, 50, 0.4);
}

.share-panel--foil .share-panel {
  border-color: rgba(160, 140, 200, 0.35);
}

.share-panel--foil .share-panel__title {
  background: linear-gradient(90deg, #c0a0ff, #ffa0c0, #a0ffc0, #a0c0ff);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: foilTextShimmer 3s linear infinite;
}

.share-panel--foil .share-panel__text {
  color: rgba(190, 170, 210, 0.85);
}

.share-panel--foil .share-panel__link {
  color: #c0a0ff;
}

.share-panel--foil .share-panel::before,
.share-panel--foil .share-panel::after {
  color: rgba(192, 160, 255, 0.5);
}

@keyframes foilTextShimmer {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 300% 50%;
  }
}

.share-panel--nothing .share-panel__title {
  color: rgba(140, 135, 130, 0.75);
}

.share-panel--nothing .share-panel__text {
  color: rgba(140, 135, 130, 0.6);
  font-style: italic;
}

.share-panel--nothing .share-panel__link {
  color: rgba(140, 135, 130, 0.5);
}

/* Transform Theme */
.share-panel--transform .share-panel {
  border-color: rgba(80, 160, 200, 0.35);
}

.share-panel--transform .share-panel__title {
  color: #50b0e0;
}

.share-panel--transform .share-panel__text {
  color: rgba(100, 170, 200, 0.8);
}

.share-panel--transform .share-panel__link {
  color: #50b0e0;
}

.share-panel--transform .share-panel::before,
.share-panel--transform .share-panel::after {
  color: rgba(80, 176, 224, 0.5);
}

/* Duplicate Theme */
.share-panel--duplicate .share-panel {
  border-color: rgba(80, 200, 150, 0.35);
}

.share-panel--duplicate .share-panel__title {
  color: #50e0a0;
}

.share-panel--duplicate .share-panel__text {
  color: rgba(100, 200, 160, 0.85);
}

.share-panel--duplicate .share-panel__link {
  color: #50e0a0;
}

.share-panel--duplicate .share-panel::before,
.share-panel--duplicate .share-panel::after {
  color: rgba(80, 224, 160, 0.5);
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

/* ==========================================
   ALTAR CLOSED STATE
   ========================================== */
.altar-closed {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.altar-closed__icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  animation: altarClosedPulse 3s ease-in-out infinite;
}

.altar-closed__icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(175, 96, 37, 0.4));
}

@keyframes altarClosedPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.altar-closed__title {
  font-family: "Cinzel", serif;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #c9a227;
  text-shadow: 0 0 20px rgba(201, 162, 39, 0.3);
  margin: 0 0 1rem;
}

.altar-closed__description {
  font-family: "Crimson Text", serif;
  font-size: 1.125rem;
  color: rgba(140, 130, 120, 0.85);
  line-height: 1.6;
  margin: 0 0 1.5rem;
  max-width: 380px;
}

.altar-closed__hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-family: "Crimson Text", serif;
  font-size: 0.9375rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.7);
  margin-bottom: 2rem;
}

.altar-closed__rune {
  font-size: 0.5rem;
  color: rgba(175, 96, 37, 0.5);
}

.altar-closed__actions {
  display: flex;
  justify-content: center;
}
</style>
