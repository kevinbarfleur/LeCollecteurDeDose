import { ref, type Ref } from 'vue';
import gsap from 'gsap';
import type { VaalOutcome, VaalOutcomeNewCard } from '~/types/vaalOutcome';
import type { Card, CardTier } from '~/types/card';
import { isCardFoil } from '~/types/card';
import { allCards } from '~/data/mockCards';
import { TIER_COLORS, getTierColors } from '~/constants/colors';
import { logCollectionState, logCollectionStateComparison } from '~/utils/collectionLogger';

export interface VaalOutcomeContext {
  cardRef: Ref<HTMLElement | null>;
  cardFrontRef?: Ref<HTMLElement | null>;
  displayCard: Ref<Card | null>;
  localCollection: Ref<Card[]>;
  isAnimating: Ref<boolean>;
  altarRef?: Ref<HTMLElement | null>; // Reference to altar for positioning duplicates
  onCardUpdate?: (card: Card) => void;
  onCardDestroyed?: (cardUid: string) => void;
  onCardDuplicated?: (originalCard: Card, newCard: Card) => void;
  onCardTransformed?: (oldCard: Card, newCard: Card) => void;
  onSyncRequired?: (updates: Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>, vaalOrbsDelta: number, outcomeType?: string) => Promise<void>;
}

export interface OutcomeResult {
  success: boolean;
  newCard?: Card;
  message?: string;
}

/**
 * Options for outcome execution
 * Used to skip sync when the server has already applied the changes
 */
export interface OutcomeOptions {
  /** Skip calling onSyncRequired (when server already applied changes) */
  skipSync?: boolean;
  /** For transform: server-provided new card (skips random selection) */
  serverNewCard?: VaalOutcomeNewCard;
}

// ==========================================
// COMPOSABLE
// ==========================================

export function useVaalOutcomes(context: VaalOutcomeContext) {
  const {
    cardRef,
    displayCard,
    localCollection,
    isAnimating,
    altarRef,
    onCardUpdate,
    onCardDestroyed,
    onCardDuplicated,
    onCardTransformed,
    onSyncRequired,
  } = context;

  // ==========================================
  // NOTHING - Brief flash effect
  // ==========================================

  const executeNothing = async (options?: OutcomeOptions): Promise<OutcomeResult> => {
    if (!cardRef.value) {
      console.error('[VaalOutcomes] executeNothing: cardRef is null');
      return { success: false };
    }

    console.log('[VaalOutcomes] executeNothing: Starting nothing outcome');
    isAnimating.value = true;

    // Brief disappointed flash
    await new Promise<void>((resolve) => {
      gsap.to(cardRef.value, {
        filter: 'brightness(1.3) saturate(0.8)',
        duration: 0.15,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(cardRef.value, {
            filter: 'brightness(1) saturate(1)',
            duration: 0.3,
            ease: 'power2.out',
            onComplete: resolve,
          });
        },
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    isAnimating.value = false;
    
    console.log('[VaalOutcomes] executeNothing: Completed successfully');
    return { success: true };
  };

  // ==========================================
  // FOIL - Transform to prismatic
  // Uses tier-based colors for the glow effect
  // ==========================================

  const executeFoil = async (options?: OutcomeOptions): Promise<OutcomeResult> => {
    if (!cardRef.value || !displayCard.value) {
      console.error('[VaalOutcomes] executeFoil: cardRef or displayCard is null');
      return { success: false };
    }

    console.log(`[VaalOutcomes] executeFoil: Starting foil transformation for card ${displayCard.value.name} (UID: ${displayCard.value.uid})`);
    console.log(`[VaalOutcomes] executeFoil: Card is currently ${displayCard.value.foil ? 'foil' : 'normal'}`);

    // Log collection state BEFORE modification
    logCollectionState('FOIL: Before modification', localCollection.value, 0, {
      cardToTransform: {
        uid: displayCard.value.uid,
        name: displayCard.value.name,
        foil: displayCard.value.foil,
      }
    });

    isAnimating.value = true;
    
    // CRITICAL: Capture the card BEFORE modifying the collection
    // After modification, displayCard computed will return a different card
    const currentCard = displayCard.value;
    const currentTier = currentCard.tier as CardTier;
    const tierColors = getTierColors(currentTier);
    const cardElement = cardRef.value;
    const glowShadow = `0 0 30px ${tierColors.glow}, 0 0 60px ${tierColors.glow}`;

    // Notify callback BEFORE modifying collection so UI can update selectedVariation
    // This ensures displayCard stays valid during and after the animation
    if (onCardUpdate) {
      onCardUpdate({ ...currentCard, foil: true });
    }

    // Now update the collection - the callback above should have updated selectedVariation
    const cardIndex = localCollection.value.findIndex(
      (c) => c.uid === currentCard.uid
    );
    if (cardIndex !== -1) {
      localCollection.value[cardIndex].foil = true;
      
      // Log collection state AFTER modification
      logCollectionState('FOIL: After modification', localCollection.value, 0, {
        modifiedCard: {
          uid: currentCard.uid,
          name: currentCard.name,
          newFoil: true,
        }
      });
    }

    // Phase 1: Build up glow with tier color
    gsap.to(cardElement, {
      filter: 'brightness(1.8) saturate(1.5)',
      scale: 1.05,
      boxShadow: glowShadow,
      duration: 0.2,
      ease: 'power2.in',
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Phase 2: Bright flash - this is when the transformation happens visually
    gsap.to(cardElement, {
      filter: 'brightness(3) saturate(2)',
      scale: 1.1,
      boxShadow: `0 0 50px ${tierColors.glow}, 0 0 90px ${tierColors.glow}`,
      duration: 0.1,
      ease: 'power2.out',
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Phase 3: Settle back with the new foil appearance
    gsap.to(cardElement, {
      filter: 'brightness(1) saturate(1)',
      scale: 1,
      boxShadow: 'none',
      duration: 0.4,
      ease: 'power2.out',
    });

    await new Promise((resolve) => setTimeout(resolve, 400));
    isAnimating.value = false;

    // Sync with API: normal: -1, foil: +1
    // Skip sync if server already applied the changes (server-side outcome mode)
    if (onSyncRequired && !options?.skipSync) {
      console.log('[VaalOutcomes] executeFoil: Calling onSyncRequired to sync foil transformation');
      const baseUid = Math.floor(currentCard.uid)
      const updates = new Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>()
      updates.set(baseUid, { normalDelta: -1, foilDelta: 1, cardData: { ...currentCard, foil: true } })
      await onSyncRequired(updates, -1, 'foil') // Consume 1 vaalOrb
      console.log('[VaalOutcomes] executeFoil: Sync completed');
    } else if (options?.skipSync) {
      console.log('[VaalOutcomes] executeFoil: Skipping sync (server already applied changes)');
    } else {
      console.warn('[VaalOutcomes] executeFoil: onSyncRequired callback not available');
    }

    console.log('[VaalOutcomes] executeFoil: Completed successfully');
    return { success: true };
  };

  // ==========================================
  // TRANSFORM - Change to another card of same tier
  // Heartbeat vibration + zoom/dezoom + instant swap at flash peak
  // ==========================================
  
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
    return Array.from(element.querySelectorAll('img.game-card__image, img.detail__image'));
  };
  
  const executeTransform = async (options?: OutcomeOptions): Promise<OutcomeResult> => {
    if (!cardRef.value || !displayCard.value) {
      console.error('[VaalOutcomes] executeTransform: cardRef or displayCard is null');
      return { success: false };
    }

    const currentCard = displayCard.value;
    console.log(`[VaalOutcomes] executeTransform: Starting transformation for card ${currentCard.name} (UID: ${currentCard.uid}, Tier: ${currentCard.tier})`);

    // Log collection state BEFORE modification
    logCollectionState('TRANSFORM: Before modification', localCollection.value, 0, {
      cardToTransform: {
        uid: displayCard.value.uid,
        name: displayCard.value.name,
        foil: displayCard.value.foil,
      }
    });

    isAnimating.value = true;

    const currentTier = currentCard.tier as CardTier;
    const tierColors = getTierColors(currentTier);

    // Determine the new card - either from server or random selection
    let newCardTemplate: Card;

    if (options?.serverNewCard) {
      // Server-side outcome mode: use the card provided by the server
      console.log(`[VaalOutcomes] executeTransform: Using server-provided card: ${options.serverNewCard.name} (UID: ${options.serverNewCard.uid})`);
      newCardTemplate = {
        uid: options.serverNewCard.uid,
        id: options.serverNewCard.id,
        name: options.serverNewCard.name,
        tier: options.serverNewCard.tier as CardTier,
        gameData: options.serverNewCard.game_data,
        foil: false, // Will be set based on original card
      } as Card;
    } else {
      // Client-side mode: Get all cards of the same tier (excluding current card)
      const sameTierCards = allCards.filter(
        (c) => c.tier === currentTier && c.id !== currentCard.id
      );

      console.log(`[VaalOutcomes] executeTransform: Found ${sameTierCards.length} cards in tier ${currentTier}`);

      if (sameTierCards.length === 0) {
        console.error('[VaalOutcomes] executeTransform: No other cards in this tier');
        isAnimating.value = false;
        return { success: false, message: 'No other cards in this tier' };
      }

      // Pick a random card from the same tier
      const randomIndex = Math.floor(Math.random() * sameTierCards.length);
      newCardTemplate = sameTierCards[randomIndex];
      console.log(`[VaalOutcomes] executeTransform: Selected new card: ${newCardTemplate.name} (UID: ${newCardTemplate.uid})`);
    }
    
    const cardElement = cardRef.value;
    
    // Apply tier-colored glow as box-shadow
    const glowShadow = `0 0 20px ${tierColors.glow}, 0 0 40px ${tierColors.glow}`;
    
    // Create the new card early (keeping foil status if original was foil)
    // Use the base UID from the template (don't modify it for API sync)
    const newCard: Card = {
      ...newCardTemplate,
      uid: newCardTemplate.uid, // Use base UID for API compatibility
      foil: isCardFoil(currentCard),
    };
    
    console.log(`[VaalOutcomes] executeTransform: New card will be ${newCard.foil ? 'foil' : 'normal'} (preserving original foil status)`);
    
    // PRELOAD the new card's image BEFORE starting animation
    const newImageUrl = newCard.gameData?.img;
    if (newImageUrl) {
      try {
        console.log(`[VaalOutcomes] executeTransform: Preloading image: ${newImageUrl}`);
        await preloadImage(newImageUrl);
        console.log('[VaalOutcomes] executeTransform: Image preloaded successfully');
      } catch (e) {
        console.error('[VaalOutcomes] executeTransform: Failed to preload image:', e);
      }
    }
    
    // Find all image elements in the card to swap them directly
    const cardImages = findCardImages(cardElement);
    const originalImageUrls = cardImages.map(img => img.src);
    
    // Phase 1: Heartbeat vibration effect with synchronized transformation
    const timeline = gsap.timeline();
    
    // First heartbeat pulse - systole (contract)
    timeline.to(cardElement, {
      scale: 0.92,
      x: -3,
      boxShadow: glowShadow,
      duration: 0.1,
      ease: 'power2.in',
    });
    // Diastole (expand)
    timeline.to(cardElement, {
      scale: 1.06,
      x: 3,
      duration: 0.12,
      ease: 'power2.out',
    });
    
    // Second heartbeat - stronger
    timeline.to(cardElement, {
      scale: 0.88,
      x: -4,
      filter: 'brightness(1.2)',
      duration: 0.1,
      ease: 'power2.in',
    });
    timeline.to(cardElement, {
      scale: 1.1,
      x: 4,
      filter: 'brightness(1.4)',
      duration: 0.12,
      ease: 'power2.out',
    });
    
    // Third heartbeat - building to climax (contract)
    timeline.to(cardElement, {
      scale: 0.82,
      x: -5,
      filter: 'brightness(1.8)',
      boxShadow: `0 0 40px ${tierColors.glow}, 0 0 70px ${tierColors.glow}`,
      duration: 0.1,
      ease: 'power2.in',
    });
    
    // TRANSFORMATION happens at the PEAK of the final heartbeat
    // Maximum expansion with flash - card transforms HERE
    timeline.to(cardElement, {
      scale: 1.25,
      x: 0,
      filter: 'brightness(3) blur(4px)',
      boxShadow: `0 0 60px ${tierColors.glow}, 0 0 100px ${tierColors.glow}`,
      duration: 0.08,
      ease: 'power2.out',
      onComplete: () => {
        // INSTANT image swap in DOM at peak brightness (hidden by blur/brightness)
        if (newImageUrl) {
          cardImages.forEach(img => {
            img.src = newImageUrl;
          });
        }
        
        // CRITICAL: Notify callback BEFORE modifying collection
        // This allows the UI to update selectedCardId/selectedVariation first
        // so displayCard stays valid when the computed recalculates
        if (onCardTransformed) {
          onCardTransformed(currentCard, newCard);
        }
        
        // Now update collection - the callback above should have updated selection
        const cardIndex = localCollection.value.findIndex(
          (c) => c.uid === currentCard.uid
        );
        if (cardIndex !== -1) {
          console.log(`[VaalOutcomes] executeTransform: Updating collection at index ${cardIndex}`);
          console.log(`[VaalOutcomes] executeTransform: Old card: ${currentCard.name} (UID: ${currentCard.uid})`);
          console.log(`[VaalOutcomes] executeTransform: New card: ${newCard.name} (UID: ${newCard.uid})`);
          localCollection.value[cardIndex] = newCard;
          
          // Log collection state AFTER modification
          logCollectionState('TRANSFORM: After modification', localCollection.value, 0, {
            oldCard: {
              uid: currentCard.uid,
              name: currentCard.name,
            },
            newCard: {
              uid: newCard.uid,
              name: newCard.name,
              foil: newCard.foil,
            }
          });
        } else {
          console.error(`[VaalOutcomes] executeTransform: Card not found in collection (UID: ${currentCard.uid})`);
        }
      },
    });
    
    // Quick contraction after the flash (new card visible)
    timeline.to(cardElement, {
      scale: 0.95,
      filter: 'brightness(1.5) blur(0px)',
      boxShadow: `0 0 30px ${tierColors.glow}`,
      duration: 0.1,
      ease: 'power2.in',
    });
    
    // Settle to normal with a gentle bounce
    timeline.to(cardElement, {
      scale: 1,
      filter: 'brightness(1)',
      boxShadow: 'none',
      duration: 0.35,
      ease: 'elastic.out(1, 0.5)',
    });
    
    await timeline.then();
    
    isAnimating.value = false;

    // Sync with API: old card normal: -1, new card normal: +1
    // Skip sync if server already applied the changes (server-side outcome mode)
    if (onSyncRequired && !options?.skipSync) {
      console.log('[VaalOutcomes] executeTransform: Calling onSyncRequired to sync transformation');
      const transformSyncInfo = {
        oldCard: currentCard.name,
        newCard: newCard.name,
        oldUid: currentCard.uid,
        newUid: newCard.uid
      };
      console.log(`[VaalOutcomes] executeTransform: Sync info:`, transformSyncInfo);
      const oldBaseUid = Math.floor(currentCard.uid)
      const newBaseUid = Math.floor(newCard.uid)
      const updates = new Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>()

      // Remove old card - include cardData for logging
      updates.set(oldBaseUid, { normalDelta: -1, foilDelta: 0, cardData: currentCard })
      console.log(`[VaalOutcomes] executeTransform: Removing old card (UID: ${oldBaseUid})`);

      // Add new card (preserve foil status) - include cardData
      const foilDelta = isCardFoil(newCard) ? 1 : 0
      const normalDelta = isCardFoil(newCard) ? 0 : 1
      updates.set(newBaseUid, { normalDelta, foilDelta, cardData: newCard })
      console.log(`[VaalOutcomes] executeTransform: Adding new card (UID: ${newBaseUid}, normalDelta: ${normalDelta}, foilDelta: ${foilDelta})`);

      await onSyncRequired(updates, -1, 'transform') // Consume 1 vaalOrb
      console.log('[VaalOutcomes] executeTransform: Sync completed');
    } else if (options?.skipSync) {
      console.log('[VaalOutcomes] executeTransform: Skipping sync (server already applied changes)');
    } else {
      console.warn('[VaalOutcomes] executeTransform: onSyncRequired callback not available');
    }
    
    console.log('[VaalOutcomes] executeTransform: Completed successfully');

    return { success: true, newCard };
  };

  // ==========================================
  // DUPLICATE - Create a copy of the card
  // Clone appears on top, then both translate apart side by side
  // ==========================================
  
  const executeDuplicate = async (options?: OutcomeOptions): Promise<OutcomeResult> => {
    if (!cardRef.value || !displayCard.value) {
      console.error('[VaalOutcomes] executeDuplicate: cardRef or displayCard is null');
      return { success: false };
    }

    const originalCard = displayCard.value;
    console.log(`[VaalOutcomes] executeDuplicate: Starting duplication for card ${originalCard.name} (UID: ${originalCard.uid})`);

    isAnimating.value = true;
    
    const currentTier = originalCard.tier as CardTier;
    const tierColors = getTierColors(currentTier);
    const cardElement = cardRef.value;
    
    // Create duplicate card data
    // For API sync, we use the same base UID and increment the count
    // The UID modification is only for local display uniqueness
    // Log collection state BEFORE modification
    logCollectionState('DUPLICATE: Before modification', localCollection.value, 0, {
      cardToDuplicate: {
        uid: originalCard.uid,
        name: originalCard.name,
        foil: originalCard.foil,
      }
    });

    const baseUid = Math.floor(originalCard.uid);
    // Generate a unique decimal suffix (0.0001 to 0.9999) to ensure local uniqueness
    // Use a counter-based approach to avoid collisions
    const existingMatchingCards = localCollection.value.filter(c => Math.floor(c.uid) === baseUid);
    console.log(`[VaalOutcomes] executeDuplicate: Found ${existingMatchingCards.length} existing cards with base UID ${baseUid}`);
    const decimalSuffix = (existingMatchingCards.length + 1) * 0.0001; // 0.0001, 0.0002, 0.0003, etc.
    const duplicateCard: Card = {
      ...originalCard,
      uid: baseUid + decimalSuffix, // Add small decimal for local uniqueness
    };
    console.log(`[VaalOutcomes] executeDuplicate: Created duplicate with UID ${duplicateCard.uid} (base: ${baseUid}, suffix: ${decimalSuffix})`);
    
    // Get card position and dimensions
    const cardRect = cardElement.getBoundingClientRect();
    const cardWidth = cardRect.width;
    
    // Apply tier-colored glow
    const glowShadow = `0 0 25px ${tierColors.glow}, 0 0 50px ${tierColors.glow}`;

    // Phase 1: Energy gathering - heartbeat-like pulses
    const timeline = gsap.timeline();
    
    timeline.to(cardElement, {
      scale: 0.95,
      filter: 'brightness(1.2)',
      boxShadow: glowShadow,
      duration: 0.1,
      ease: 'power2.in',
    });
    timeline.to(cardElement, {
      scale: 1.08,
      filter: 'brightness(1.5)',
      duration: 0.12,
      ease: 'power2.out',
    });
    timeline.to(cardElement, {
      scale: 0.92,
      filter: 'brightness(1.3)',
      duration: 0.08,
      ease: 'power2.in',
    });
    timeline.to(cardElement, {
      scale: 1.12,
      filter: 'brightness(1.8)',
      boxShadow: `0 0 40px ${tierColors.glow}, 0 0 70px ${tierColors.glow}`,
      duration: 0.15,
      ease: 'power2.out',
    });
    
    await timeline.then();
    
    // Phase 2: Create clone exactly on top of original
    const clone = cardElement.cloneNode(true) as HTMLElement;
    clone.id = 'duplicate-clone';
    clone.style.cssText = `
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      width: ${cardRect.width}px;
      height: ${cardRect.height}px;
      top: ${cardRect.top}px;
      left: ${cardRect.left}px;
      margin: 0;
      box-shadow: ${glowShadow};
    `;
    document.body.appendChild(clone);
    
    // Initialize clone with GSAP (hidden and scaled)
    gsap.set(clone, {
      opacity: 0,
      scale: 1.12,
    });
    
    // Flash effect for "split" - both cards flash together
    gsap.to(cardElement, {
      scale: 1.2,
      filter: 'brightness(2.5)',
      duration: 0.1,
      ease: 'power2.out',
    });
    
    // Make clone visible at same moment
    gsap.to(clone, {
      opacity: 1,
      scale: 1.2,
      duration: 0.1,
      ease: 'power2.out',
    });
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Calculate translation distance (half card width + small gap)
    const translateDistance = (cardWidth / 2) + 12;
    
    // Phase 3: Both cards translate apart - original left, clone right
    const splitTimeline = gsap.timeline();
    
    // Original card translates left
    splitTimeline.to(cardElement, {
      x: -translateDistance,
      scale: 1,
      filter: 'brightness(1)',
      boxShadow: glowShadow,
      duration: 0.4,
      ease: 'power2.out',
    }, 0);
    
    // Clone translates right
    splitTimeline.to(clone, {
      x: translateDistance,
      scale: 1,
      filter: 'brightness(1)',
      duration: 0.4,
      ease: 'power2.out',
    }, 0);
    
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
      ease: 'power2.in',
    });
    
    // Original card returns to center position
    exitTimeline.to(cardElement, {
      x: 0,
      boxShadow: 'none',
      duration: 0.5,
      ease: 'power2.out',
    }, 0.15);
    
    await exitTimeline.then();
    
    // Cleanup clone
    clone.remove();
    
    // Ensure card is fully reset
    gsap.set(cardElement, {
      clearProps: 'filter,boxShadow',
    });
    
    // Log BEFORE adding duplicate to see current state
    const matchingCardsBeforeAdd = localCollection.value.filter(c => Math.floor(c.uid) === baseUid);
    const beforeInfo = {
      baseUid,
      totalMatchingCards: matchingCardsBeforeAdd.length,
      originalCardUid: originalCard.uid,
      originalCardFoil: isCardFoil(originalCard),
      allMatchingCardsBefore: matchingCardsBeforeAdd.map(c => ({ uid: c.uid, foil: c.foil, name: c.name }))
    };
    
    // Add duplicate to collection FIRST, before syncing
    // Ensure duplicateCard preserves foil status from original
    const duplicateCardWithFoil: Card = {
      ...duplicateCard,
      foil: isCardFoil(originalCard), // Explicitly preserve foil status
    };
    
    const pushInfo = {
      duplicateCardUid: duplicateCardWithFoil.uid,
      duplicateCardFoil: duplicateCardWithFoil.foil,
      duplicateCardName: duplicateCardWithFoil.name,
      localCollectionLengthBefore: localCollection.value.length,
      baseUid
    };
    
    console.log(`[VaalOutcomes] executeDuplicate: Adding duplicate to collection (foil: ${duplicateCardWithFoil.foil})`);
    localCollection.value.push(duplicateCardWithFoil);
    console.log(`[VaalOutcomes] executeDuplicate: Collection now has ${localCollection.value.length} cards`);
    
    // Log collection state AFTER modification
    logCollectionState('DUPLICATE: After modification', localCollection.value, 0, {
      duplicateCard: {
        uid: duplicateCardWithFoil.uid,
        name: duplicateCardWithFoil.name,
        foil: duplicateCardWithFoil.foil,
      }
    });
    
    // Log to verify duplicate was added (baseUid already declared at line 407)
    const matchingCardsAfterAdd = localCollection.value.filter(c => Math.floor(c.uid) === baseUid);
    const foilCountAfterAdd = matchingCardsAfterAdd.filter(c => c.foil).length;
    const normalCountAfterAdd = matchingCardsAfterAdd.filter(c => !c.foil).length;
    const afterAddInfo = {
      baseUid,
      totalMatchingCards: matchingCardsAfterAdd.length,
      foilCount: foilCountAfterAdd,
      normalCount: normalCountAfterAdd,
      originalCardFoil: isCardFoil(originalCard),
      duplicateCardFoil: duplicateCardWithFoil.foil,
      duplicateCardUid: duplicateCardWithFoil.uid,
      originalCardUid: originalCard.uid,
      allMatchingCards: matchingCardsAfterAdd.map(c => ({ uid: c.uid, foil: c.foil, name: c.name }))
    };
    console.log(`[VaalOutcomes] executeDuplicate: After add - Total matching cards: ${afterAddInfo.totalMatchingCards}, Normal: ${afterAddInfo.normalCount}, Foil: ${afterAddInfo.foilCount}`);
    
    isAnimating.value = false;

    if (onCardDuplicated) {
      onCardDuplicated(originalCard, duplicateCard);
    }

    // Sync with API: same card, increase count (normal or foil depending on original)
    // Skip sync if server already applied the changes (server-side outcome mode)
    if (onSyncRequired && !options?.skipSync) {
      console.log('[VaalOutcomes] executeDuplicate: Calling onSyncRequired to sync duplication');
      const duplicateSyncInfo = {
        card: originalCard.name,
        uid: originalCard.uid,
        isFoil: isCardFoil(originalCard)
      };
      console.log(`[VaalOutcomes] executeDuplicate: Sync info:`, duplicateSyncInfo);
      // baseUid already declared at line 407
      const updates = new Map<number, { normalDelta: number; foilDelta: number; cardData?: Partial<Card> }>()

      // Duplicate preserves foil status, so increment the appropriate counter
      // Include cardData so the server knows which card to update
      if (isCardFoil(originalCard)) {
        updates.set(baseUid, { normalDelta: 0, foilDelta: 1, cardData: originalCard })
        console.log(`[VaalOutcomes] executeDuplicate: Incrementing foil count for UID ${baseUid}`);
      } else {
        updates.set(baseUid, { normalDelta: 1, foilDelta: 0, cardData: originalCard })
        console.log(`[VaalOutcomes] executeDuplicate: Incrementing normal count for UID ${baseUid}`);
      }

      await onSyncRequired(updates, -1, 'duplicate') // Consume 1 vaalOrb
      console.log('[VaalOutcomes] executeDuplicate: Sync completed');
    } else if (options?.skipSync) {
      console.log('[VaalOutcomes] executeDuplicate: Skipping sync (server already applied changes)');
    } else {
      console.warn('[VaalOutcomes] executeDuplicate: onSyncRequired callback not available');
    }

    console.log('[VaalOutcomes] executeDuplicate: Completed successfully');
    return { success: true, newCard: duplicateCard };
  };

  // ==========================================
  // MAIN EXECUTOR
  // ==========================================
  
  /**
   * Execute any Vaal outcome animation
   * Note: 'destroyed' is handled separately in altar.vue due to complex disintegration
   */
  const executeOutcome = async (outcome: VaalOutcome): Promise<OutcomeResult> => {
    switch (outcome) {
      case 'nothing':
        return executeNothing();
      case 'foil':
        return executeFoil();
      case 'transform':
        return executeTransform();
      case 'duplicate':
        return executeDuplicate();
      case 'destroyed':
        // Destroyed is handled externally due to complex disintegration effect
        // This allows the altar to use its specific snapshot/canvas logic
        return { success: true };
      default:
        return { success: false, message: `Unknown outcome: ${outcome}` };
    }
  };

  return {
    executeOutcome,
    executeNothing,
    executeFoil,
    executeTransform,
    executeDuplicate,
  };
}

