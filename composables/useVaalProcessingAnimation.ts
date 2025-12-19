import { ref, computed, type Ref } from 'vue';
import gsap from 'gsap';

/**
 * Composable for managing the "processing" animation while waiting for the Edge Function response.
 * This animation masks the network latency by showing that the Vaal Orb is being absorbed.
 */

export interface VaalProcessingOptions {
  cardRef: Ref<HTMLElement | null>;
  orbRef?: Ref<HTMLElement | null>;
}

// Tier-based colors for the charging effect
const TIER_COLORS: Record<string, string> = {
  T0: '#a8a8a8',  // Grey/silver
  T1: '#4a90d9',  // Blue
  T2: '#ffd700',  // Gold
  T3: '#ff6b6b',  // Red/coral
};

export function useVaalProcessingAnimation(options: VaalProcessingOptions) {
  const { cardRef, orbRef } = options;

  // State
  const isProcessing = ref(false);
  const processingTimeline = ref<gsap.core.Timeline | null>(null);

  /**
   * Starts the processing animation.
   * Called when the orb is dropped on the card, before calling the Edge Function.
   *
   * @param tier - The tier of the card (for color theming)
   * @returns Promise that resolves when the initial absorption animation completes
   */
  const startProcessing = async (tier: string = 'T0'): Promise<void> => {
    if (!cardRef.value) return;

    isProcessing.value = true;
    const color = TIER_COLORS[tier] || TIER_COLORS.T0;

    // Kill any existing timeline
    if (processingTimeline.value) {
      processingTimeline.value.kill();
    }

    // Create the processing timeline
    const tl = gsap.timeline();
    processingTimeline.value = tl;

    // Phase 1: Card starts "charging" - subtle scale up and glow
    tl.to(cardRef.value, {
      scale: 1.02,
      boxShadow: `0 0 30px ${color}, 0 0 60px ${color}40`,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Phase 2: Pulsing glow loop (will be interrupted when response arrives)
    tl.to(cardRef.value, {
      boxShadow: `0 0 40px ${color}, 0 0 80px ${color}60`,
      scale: 1.03,
      duration: 0.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });

    // Return a promise that resolves after the initial charge-up
    return new Promise(resolve => {
      setTimeout(resolve, 300);
    });
  };

  /**
   * Ends the processing animation with a flash effect.
   * Called when the Edge Function response is received, before playing the outcome animation.
   *
   * @param tier - The tier of the card (for color theming)
   * @returns Promise that resolves when the transition animation completes
   */
  const endProcessing = async (tier: string = 'T0'): Promise<void> => {
    if (!cardRef.value) {
      isProcessing.value = false;
      return;
    }

    const color = TIER_COLORS[tier] || TIER_COLORS.T0;

    // Kill the pulsing timeline
    if (processingTimeline.value) {
      processingTimeline.value.kill();
      processingTimeline.value = null;
    }

    // Flash effect to transition into outcome
    return new Promise(resolve => {
      gsap.timeline()
        // Quick flash at peak intensity
        .to(cardRef.value, {
          boxShadow: `0 0 60px ${color}, 0 0 100px ${color}80`,
          scale: 1.05,
          duration: 0.15,
          ease: 'power2.in',
        })
        // Settle back to normal
        .to(cardRef.value, {
          boxShadow: 'none',
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            isProcessing.value = false;
            resolve();
          },
        });
    });
  };

  /**
   * Cancels the processing animation (e.g., on error).
   * Immediately resets the card to its normal state.
   */
  const cancelProcessing = async (): Promise<void> => {
    // Kill the pulsing timeline
    if (processingTimeline.value) {
      processingTimeline.value.kill();
      processingTimeline.value = null;
    }

    if (cardRef.value) {
      await new Promise<void>(resolve => {
        gsap.to(cardRef.value, {
          boxShadow: 'none',
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
          onComplete: resolve,
        });
      });
    }

    isProcessing.value = false;
  };

  /**
   * Computed styles for the processing state.
   * Can be used to add CSS classes or inline styles.
   */
  const processingStyles = computed(() => {
    if (!isProcessing.value) return {};

    return {
      'pointer-events': 'none',  // Disable interactions during processing
    };
  });

  return {
    // State
    isProcessing,

    // Methods
    startProcessing,
    endProcessing,
    cancelProcessing,

    // Computed
    processingStyles,
  };
}
