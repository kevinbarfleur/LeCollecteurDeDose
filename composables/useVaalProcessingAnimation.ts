import { ref, computed, type Ref } from 'vue';
import gsap from 'gsap';

/**
 * Composable for managing the "processing" animation while waiting for the Edge Function response.
 * This animation masks the network latency by showing that the Vaal Orb is being absorbed.
 * Uses altar-like effects: particles, glow, and energy rays.
 */

export interface VaalProcessingOptions {
  cardRef: Ref<HTMLElement | null>;
  orbRef?: Ref<HTMLElement | null>;
}

// Tier-based colors for the charging effect (Vaal red theme)
const VAAL_COLORS = {
  primary: '#c83232',
  secondary: '#ff6b6b',
  glow: 'rgba(200, 50, 50, 0.6)',
};

interface ProcessingParticle {
  element: HTMLDivElement;
  timeline: gsap.core.Timeline;
}

interface ProcessingRay {
  element: HTMLDivElement;
  angle: number;
}

export function useVaalProcessingAnimation(options: VaalProcessingOptions) {
  const { cardRef } = options;

  // State
  const isProcessing = ref(false);
  const processingTimeline = ref<gsap.core.Timeline | null>(null);
  const processingContainer = ref<HTMLDivElement | null>(null);
  const particles: ProcessingParticle[] = [];
  const rays: ProcessingRay[] = [];
  let particleInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates the processing effects container around the card
   */
  const createProcessingContainer = () => {
    if (!cardRef.value || processingContainer.value) return;

    const container = document.createElement('div');
    container.className = 'vaal-processing';
    container.innerHTML = `
      <div class="vaal-processing__glow"></div>
      <div class="vaal-processing__rim"></div>
      <div class="vaal-processing__rays"></div>
      <div class="vaal-processing__particles"></div>
    `;

    // Insert before the card so effects are behind
    cardRef.value.parentElement?.insertBefore(container, cardRef.value);
    processingContainer.value = container;

    // Create rays
    createRays();
  };

  /**
   * Creates energy rays around the card with varied sizes (like altar aura)
   */
  const createRays = () => {
    if (!processingContainer.value) return;

    const raysContainer = processingContainer.value.querySelector('.vaal-processing__rays');
    if (!raysContainer) return;

    raysContainer.innerHTML = '';
    rays.length = 0;

    // Create rays with varied sizes like the altar
    const rayCount = 36;
    const baseAngleStep = 360 / rayCount;

    for (let i = 0; i < rayCount; i++) {
      // Slight organic variation in angle
      const angleVariation = (Math.random() - 0.5) * 4;
      const angle = (i * baseAngleStep) + angleVariation;

      // Determine ray size based on position for variety
      let sizeClass: string;
      let delayMultiplier: number;

      if (i % 9 === 0) {
        sizeClass = 'vaal-processing__ray--large';
        delayMultiplier = 0.4;
      } else if (i % 4 === 0) {
        sizeClass = 'vaal-processing__ray--medium';
        delayMultiplier = 0.3;
      } else if (i % 2 === 0) {
        sizeClass = 'vaal-processing__ray--small';
        delayMultiplier = 0.2;
      } else {
        sizeClass = 'vaal-processing__ray--tiny';
        delayMultiplier = 0.15;
      }

      const ray = document.createElement('div');
      ray.className = `vaal-processing__ray ${sizeClass}`;
      ray.style.setProperty('--ray-angle', `${angle}deg`);
      ray.style.setProperty('--ray-delay', `${i * delayMultiplier * 0.1}s`);
      raysContainer.appendChild(ray);

      rays.push({ element: ray, angle });
    }
  };

  /**
   * Creates a floating particle
   */
  const createParticle = () => {
    if (!processingContainer.value) return null;

    const particleContainer = processingContainer.value.querySelector('.vaal-processing__particles');
    if (!particleContainer) return null;

    const particle = document.createElement('div');
    particle.className = 'vaal-processing__particle';
    particleContainer.appendChild(particle);

    // Random starting position around the card
    const angle = Math.random() * 360;
    const radius = 80 + Math.random() * 60;
    const startX = Math.cos(angle * Math.PI / 180) * radius;
    const startY = Math.sin(angle * Math.PI / 180) * radius;

    // Particle size variation
    const size = 3 + Math.random() * 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Create GSAP timeline for this particle
    const tl = gsap.timeline({
      onComplete: () => {
        particle.remove();
        const idx = particles.findIndex(p => p.element === particle);
        if (idx !== -1) particles.splice(idx, 1);
      }
    });

    // Animate particle rising and converging toward center
    tl.set(particle, {
      x: startX,
      y: startY,
      opacity: 0,
      scale: 0,
    })
    .to(particle, {
      opacity: 0.9,
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
    })
    .to(particle, {
      x: startX * 0.3,
      y: startY * 0.3 - 30,
      opacity: 0,
      scale: 0.3,
      duration: 1 + Math.random() * 0.5,
      ease: 'power2.in',
    }, '-=0.1');

    return { element: particle, timeline: tl };
  };

  /**
   * Starts the particle system
   */
  const startParticleSystem = () => {
    if (particleInterval) return;

    particleInterval = setInterval(() => {
      if (!isProcessing.value) {
        if (particleInterval) {
          clearInterval(particleInterval);
          particleInterval = null;
        }
        return;
      }

      // Create 2-4 particles at once
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const particle = createParticle();
        if (particle) particles.push(particle);
      }
    }, 100);
  };

  /**
   * Removes the processing container
   */
  const removeProcessingContainer = () => {
    // Stop particle system
    if (particleInterval) {
      clearInterval(particleInterval);
      particleInterval = null;
    }

    // Kill all particle timelines
    particles.forEach(p => {
      p.timeline.kill();
      p.element.remove();
    });
    particles.length = 0;

    // Remove container
    if (processingContainer.value) {
      processingContainer.value.remove();
      processingContainer.value = null;
    }

    rays.length = 0;
  };

  /**
   * Starts the processing animation.
   * Called when the orb is dropped on the card, before calling the Edge Function.
   */
  const startProcessing = async (tier: string = 'T0'): Promise<void> => {
    if (!cardRef.value) return;

    isProcessing.value = true;

    // Kill any existing timeline
    if (processingTimeline.value) {
      processingTimeline.value.kill();
    }

    // Create the effects container
    createProcessingContainer();

    // Activate the container
    if (processingContainer.value) {
      processingContainer.value.classList.add('vaal-processing--active');
    }

    // Start particle system
    startParticleSystem();

    // Create the processing timeline for card effects
    const tl = gsap.timeline();
    processingTimeline.value = tl;

    // Card pulse effect
    tl.to(cardRef.value, {
      scale: 1.02,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Return a promise that resolves after the initial charge-up
    return new Promise(resolve => {
      setTimeout(resolve, 300);
    });
  };

  /**
   * Ends the processing animation with a flash effect.
   * Called when the Edge Function response is received.
   */
  const endProcessing = async (tier: string = 'T0'): Promise<void> => {
    if (!cardRef.value) {
      isProcessing.value = false;
      removeProcessingContainer();
      return;
    }

    // Kill the processing timeline
    if (processingTimeline.value) {
      processingTimeline.value.kill();
      processingTimeline.value = null;
    }

    // Flash effect on container
    if (processingContainer.value) {
      processingContainer.value.classList.add('vaal-processing--flash');
    }

    // Flash effect on card
    return new Promise(resolve => {
      gsap.timeline()
        // Quick flash at peak intensity
        .to(cardRef.value, {
          scale: 1.05,
          filter: 'brightness(1.3)',
          duration: 0.15,
          ease: 'power2.in',
        })
        // Settle back to normal
        .to(cardRef.value, {
          scale: 1,
          filter: 'brightness(1)',
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            isProcessing.value = false;
            removeProcessingContainer();
            resolve();
          },
        });
    });
  };

  /**
   * Cancels the processing animation (e.g., on error).
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
          scale: 1,
          filter: 'brightness(1)',
          duration: 0.2,
          ease: 'power2.out',
          onComplete: resolve,
        });
      });
    }

    isProcessing.value = false;
    removeProcessingContainer();
  };

  /**
   * Computed styles for the processing state.
   */
  const processingStyles = computed(() => {
    if (!isProcessing.value) return {};

    return {
      'pointer-events': 'none',
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
