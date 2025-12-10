/**
 * Vaal Outcomes Composable
 * 
 * Handles animations and logic for all Vaal orb outcomes.
 * Designed to be modular and reusable across altar and replay views.
 * All animations use tier-based colors for consistency.
 */

import { ref, type Ref } from 'vue';
import gsap from 'gsap';
import type { VaalOutcome } from '~/types/vaalOutcome';
import type { Card, CardTier } from '~/types/card';
import { isCardFoil } from '~/types/card';
import { allCards } from '~/data/mockCards';

// ==========================================
// TIER-BASED COLORS
// ==========================================

const TIER_COLORS = {
  T0: { primary: '#c9a227', secondary: '#f5d76e', glow: 'rgba(201, 162, 39, 0.8)' },
  T1: { primary: '#7a6a8a', secondary: '#a294b0', glow: 'rgba(122, 106, 138, 0.7)' },
  T2: { primary: '#5a7080', secondary: '#8aa0b0', glow: 'rgba(90, 112, 128, 0.6)' },
  T3: { primary: '#5a5a5d', secondary: '#7a7a7d', glow: 'rgba(90, 90, 93, 0.5)' },
} as const;

const getTierColors = (tier: CardTier) => {
  return TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.T3;
};

// ==========================================
// TYPES
// ==========================================

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
}

export interface OutcomeResult {
  success: boolean;
  newCard?: Card;
  message?: string;
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
  } = context;

  // ==========================================
  // NOTHING - Brief flash effect
  // ==========================================
  
  const executeNothing = async (): Promise<OutcomeResult> => {
    if (!cardRef.value) return { success: false };

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
    
    return { success: true };
  };

  // ==========================================
  // FOIL - Transform to prismatic
  // Uses tier-based colors for the glow effect
  // ==========================================
  
  const executeFoil = async (): Promise<OutcomeResult> => {
    if (!cardRef.value || !displayCard.value) return { success: false };

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
  
  const executeTransform = async (): Promise<OutcomeResult> => {
    if (!cardRef.value || !displayCard.value) return { success: false };

    isAnimating.value = true;
    
    const currentCard = displayCard.value;
    const currentTier = currentCard.tier as CardTier;
    const tierColors = getTierColors(currentTier);
    
    // Get all cards of the same tier (excluding current card)
    const sameTierCards = allCards.filter(
      (c) => c.tier === currentTier && c.id !== currentCard.id
    );
    
    if (sameTierCards.length === 0) {
      isAnimating.value = false;
      return { success: false, message: 'No other cards in this tier' };
    }
    
    // Pick a random card from the same tier
    const randomIndex = Math.floor(Math.random() * sameTierCards.length);
    const newCardTemplate = sameTierCards[randomIndex];
    
    const cardElement = cardRef.value;
    
    // Apply tier-colored glow as box-shadow
    const glowShadow = `0 0 20px ${tierColors.glow}, 0 0 40px ${tierColors.glow}`;
    
    // Create the new card early (keeping foil status if original was foil)
    const newCard: Card = {
      ...newCardTemplate,
      uid: newCardTemplate.uid * 1000000 + (Date.now() % 1000000),
      foil: isCardFoil(currentCard),
    };
    
    // PRELOAD the new card's image BEFORE starting animation
    const newImageUrl = newCard.gameData?.img;
    if (newImageUrl) {
      try {
        await preloadImage(newImageUrl);
      } catch (e) {
        console.warn('Failed to preload transform card image, continuing anyway');
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
          localCollection.value[cardIndex] = newCard;
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

    return { success: true, newCard };
  };

  // ==========================================
  // DUPLICATE - Create a copy of the card
  // Clone appears on top, then both translate apart side by side
  // ==========================================
  
  const executeDuplicate = async (): Promise<OutcomeResult> => {
    if (!cardRef.value || !displayCard.value) return { success: false };

    isAnimating.value = true;
    
    const originalCard = displayCard.value;
    const currentTier = originalCard.tier as CardTier;
    const tierColors = getTierColors(currentTier);
    const cardElement = cardRef.value;
    
    // Create duplicate card data with unique numeric UID
    const duplicateCard: Card = {
      ...originalCard,
      uid: originalCard.uid * 1000000 + (Date.now() % 1000000) + 1,
    };
    
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
    
    // Add duplicate to collection
    localCollection.value.push(duplicateCard);
    
    isAnimating.value = false;

    if (onCardDuplicated) {
      onCardDuplicated(originalCard, duplicateCard);
    }

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

