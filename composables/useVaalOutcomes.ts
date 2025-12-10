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
    
    const currentTier = displayCard.value.tier as CardTier;
    const tierColors = getTierColors(currentTier);
    const cardElement = cardRef.value;
    const glowShadow = `0 0 30px ${tierColors.glow}, 0 0 60px ${tierColors.glow}`;

    // Find the card in the local collection and update it
    const cardIndex = localCollection.value.findIndex(
      (c) => c.uid === displayCard.value!.uid
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

    if (onCardUpdate && displayCard.value) {
      onCardUpdate({ ...displayCard.value, foil: true });
    }

    return { success: true };
  };

  // ==========================================
  // TRANSFORM - Change to another card of same tier
  // Heartbeat vibration + zoom/dezoom + pof + fade
  // ==========================================
  
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
    
    // Phase 1: Heartbeat vibration effect (multiple quick pulses)
    const timeline = gsap.timeline();
    
    // First heartbeat pulse - systole (contract)
    timeline.to(cardElement, {
      scale: 0.92,
      x: -3,
      boxShadow: glowShadow,
      duration: 0.08,
      ease: 'power2.in',
    });
    // Diastole (expand)
    timeline.to(cardElement, {
      scale: 1.06,
      x: 3,
      duration: 0.1,
      ease: 'power2.out',
    });
    // Small vibration
    timeline.to(cardElement, {
      scale: 0.95,
      x: -2,
      duration: 0.06,
      ease: 'power1.inOut',
    });
    timeline.to(cardElement, {
      scale: 1.03,
      x: 2,
      duration: 0.08,
      ease: 'power1.inOut',
    });
    
    // Second heartbeat - stronger
    timeline.to(cardElement, {
      scale: 0.88,
      x: -4,
      filter: 'brightness(1.2)',
      duration: 0.08,
      ease: 'power2.in',
    });
    timeline.to(cardElement, {
      scale: 1.1,
      x: 4,
      filter: 'brightness(1.4)',
      duration: 0.12,
      ease: 'power2.out',
    });
    timeline.to(cardElement, {
      scale: 0.93,
      x: -3,
      duration: 0.06,
      ease: 'power1.inOut',
    });
    timeline.to(cardElement, {
      scale: 1.05,
      x: 2,
      duration: 0.08,
      ease: 'power1.inOut',
    });
    
    // Third heartbeat - building to climax
    timeline.to(cardElement, {
      scale: 0.85,
      x: -5,
      filter: 'brightness(1.6)',
      boxShadow: `0 0 35px ${tierColors.glow}, 0 0 60px ${tierColors.glow}`,
      duration: 0.1,
      ease: 'power2.in',
    });
    timeline.to(cardElement, {
      scale: 1.15,
      x: 5,
      filter: 'brightness(1.8)',
      duration: 0.12,
      ease: 'power2.out',
    });
    
    await timeline.then();
    
    // Phase 2: "POF" - Quick zoom out with fade
    gsap.to(cardElement, {
      scale: 0.6,
      opacity: 0,
      filter: 'brightness(2.5) blur(8px)',
      boxShadow: `0 0 50px ${tierColors.glow}, 0 0 80px ${tierColors.glow}`,
      duration: 0.15,
      ease: 'power2.in',
    });
    
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    // Create the new card (keeping foil status if original was foil)
    const newCard: Card = {
      ...newCardTemplate,
      uid: `${newCardTemplate.id}-${Date.now()}`,
      foil: isCardFoil(currentCard),
    };
    
    // Update local collection - remove old, add new
    const cardIndex = localCollection.value.findIndex(
      (c) => c.uid === currentCard.uid
    );
    if (cardIndex !== -1) {
      localCollection.value[cardIndex] = newCard;
    }
    
    // Notify callback to update displayed card BEFORE revealing
    if (onCardTransformed) {
      onCardTransformed(currentCard, newCard);
    }
    
    // Brief pause while card is invisible
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Phase 3: Reveal new card - fade in with zoom
    gsap.to(cardElement, {
      scale: 1.08,
      opacity: 1,
      filter: 'brightness(1.3) blur(0px)',
      boxShadow: `0 0 30px ${tierColors.glow}`,
      duration: 0.25,
      ease: 'power2.out',
    });
    
    await new Promise((resolve) => setTimeout(resolve, 250));
    
    // Phase 4: Settle to normal
    gsap.to(cardElement, {
      scale: 1,
      x: 0,
      filter: 'brightness(1)',
      boxShadow: 'none',
      duration: 0.3,
      ease: 'elastic.out(1, 0.6)',
    });
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
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
    
    // Create duplicate card data
    const duplicateCard: Card = {
      ...originalCard,
      uid: `${originalCard.id}-dup-${Date.now()}`,
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
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.width = `${cardRect.width}px`;
    clone.style.height = `${cardRect.height}px`;
    clone.style.top = `${cardRect.top}px`;
    clone.style.left = `${cardRect.left}px`;
    clone.style.opacity = '0';
    clone.style.transform = 'scale(1.12)';
    clone.style.boxShadow = glowShadow;
    clone.style.margin = '0';
    document.body.appendChild(clone);
    
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

