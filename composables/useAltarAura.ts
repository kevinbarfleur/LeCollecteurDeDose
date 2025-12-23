import { ref, computed, watch, onUnmounted, type Ref } from 'vue';
import gsap from 'gsap';

export interface AltarAuraOptions {
  containerRef: Ref<HTMLElement | null>;
  isActive: Ref<boolean>;
  isVaalMode: Ref<boolean>;
  tier: Ref<string | undefined>;
  isFoil: Ref<boolean>;
  isSynthesised: Ref<boolean>;
}

interface Particle {
  element: HTMLDivElement;
  timeline: gsap.core.Timeline;
}

interface EnergyRay {
  element: HTMLDivElement;
  angle: number;
}

import { TIER_COLORS, VAAL_COLORS, FOIL_COLORS, SYNTHESISED_COLORS } from '~/constants/colors';

export function useAltarAura(options: AltarAuraOptions) {
  const { containerRef, isActive, isVaalMode, tier, isFoil, isSynthesised } = options;
  
  // State
  const particles: Particle[] = [];
  const energyRays: EnergyRay[] = [];
  const auraContainer = ref<HTMLDivElement | null>(null);
  const particleContainer = ref<HTMLDivElement | null>(null);
  const masterTimeline = ref<gsap.core.Timeline | null>(null);
  const foilColorIndex = ref(0);
  
  // Current color based on state
  const currentColors = computed(() => {
    if (isVaalMode.value) {
      return {
        primary: VAAL_COLORS.primary,
        secondary: VAAL_COLORS.secondary,
        glow: VAAL_COLORS.glow,
        intensity: 1,
      };
    }

    if (isSynthesised.value) {
      return {
        primary: SYNTHESISED_COLORS.primary,
        secondary: SYNTHESISED_COLORS.secondary,
        glow: SYNTHESISED_COLORS.glow,
        intensity: 0.85,
      };
    }

    if (isFoil.value) {
      const colors = FOIL_COLORS[foilColorIndex.value % FOIL_COLORS.length];
      return {
        primary: colors.primary,
        secondary: colors.primary,
        glow: colors.glow,
        intensity: 0.8,
      };
    }

    const tierKey = tier.value as keyof typeof TIER_COLORS;
    const tierColors = TIER_COLORS[tierKey] || TIER_COLORS.T3;

    return {
      primary: tierColors.primary,
      secondary: tierColors.secondary,
      glow: tierColors.glow,
      intensity: 0.6,
    };
  });
  
  // ==========================================
  // AURA CONTAINER CREATION
  // ==========================================
  
  const createAuraContainer = () => {
    if (!containerRef.value || auraContainer.value) return;
    
    // Create the main aura container that sits BEHIND the altar
    const container = document.createElement('div');
    container.className = 'altar-aura';
    container.innerHTML = `
      <div class="altar-aura__rays"></div>
      <div class="altar-aura__rim"></div>
      <div class="altar-aura__glow"></div>
    `;
    
    // Insert BEFORE the altar platform (so it's behind)
    containerRef.value.insertBefore(container, containerRef.value.firstChild);
    auraContainer.value = container;
    
    // Create energy rays
    createEnergyRays();
    
    // Create particle container for Vaal mode
    const pContainer = document.createElement('div');
    pContainer.className = 'altar-aura__particles';
    container.appendChild(pContainer);
    particleContainer.value = pContainer;
  };
  
  // ==========================================
  // ENERGY RAYS
  // ==========================================
  
  const createEnergyRays = () => {
    if (!auraContainer.value) return;
    
    const raysContainer = auraContainer.value.querySelector('.altar-aura__rays');
    if (!raysContainer) return;
    
    // Clear existing rays
    raysContainer.innerHTML = '';
    energyRays.length = 0;
    
    // Create a fluid distribution of rays around the altar
    // Total: ~36 rays with varied sizes for smooth coverage
    const rayCount = 36;
    const baseAngleStep = 360 / rayCount;
    
    for (let i = 0; i < rayCount; i++) {
      // Base angle with slight organic variation
      const angleVariation = (Math.random() - 0.5) * 4;
      const angle = (i * baseAngleStep) + angleVariation;
      
      // Determine ray size based on position for variety
      // Every 4th ray is large, every 2nd is medium, rest are small
      let sizeClass: string;
      let delayMultiplier: number;
      
      if (i % 9 === 0) {
        // Large rays at cardinal-ish points
        sizeClass = 'altar-aura__ray--large';
        delayMultiplier = 0.4;
      } else if (i % 4 === 0) {
        // Medium rays 
        sizeClass = 'altar-aura__ray--medium';
        delayMultiplier = 0.3;
      } else if (i % 2 === 0) {
        // Small rays
        sizeClass = 'altar-aura__ray--small';
        delayMultiplier = 0.2;
      } else {
        // Tiny rays for fill
        sizeClass = 'altar-aura__ray--tiny';
        delayMultiplier = 0.15;
      }
      
      const ray = document.createElement('div');
      ray.className = `altar-aura__ray ${sizeClass}`;
      ray.style.setProperty('--ray-angle', `${angle}deg`);
      ray.style.setProperty('--ray-delay', `${i * delayMultiplier * 0.1}s`);
      raysContainer.appendChild(ray);
      
      energyRays.push({ element: ray, angle });
    }
  };
  
  // ==========================================
  // PARTICLE SYSTEM (VAAL MODE)
  // ==========================================
  
  const createParticle = () => {
    if (!particleContainer.value) return null;
    
    const particle = document.createElement('div');
    particle.className = 'altar-aura__particle';
    particleContainer.value.appendChild(particle);
    
    // Random starting position around the altar
    const angle = Math.random() * 360;
    const radius = 100 + Math.random() * 80;
    const startX = Math.cos(angle * Math.PI / 180) * radius;
    const startY = Math.sin(angle * Math.PI / 180) * radius;
    
    // Particle size variation
    const size = 2 + Math.random() * 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Create GSAP timeline for this particle
    const tl = gsap.timeline({
      onComplete: () => {
        // Remove particle and clean up
        particle.remove();
        const idx = particles.findIndex(p => p.element === particle);
        if (idx !== -1) particles.splice(idx, 1);
      }
    });
    
    // Animate particle rising and fading
    tl.set(particle, {
      x: startX,
      y: startY,
      opacity: 0,
      scale: 0,
    })
    .to(particle, {
      opacity: 0.8 + Math.random() * 0.2,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    })
    .to(particle, {
      y: startY - 80 - Math.random() * 60,
      x: startX + (Math.random() - 0.5) * 40,
      opacity: 0,
      scale: 0.5,
      duration: 1.5 + Math.random(),
      ease: 'power1.out',
    }, '-=0.1');
    
    return { element: particle, timeline: tl };
  };
  
  const startParticleSystem = () => {
    if (!isVaalMode.value || !particleContainer.value) return;
    
    // Create new particles periodically
    const interval = setInterval(() => {
      if (!isVaalMode.value) {
        clearInterval(interval);
        return;
      }
      
      // Create 2-4 particles at once
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const particle = createParticle();
        if (particle) particles.push(particle);
      }
    }, 150);
    
    return interval;
  };
  
  let particleInterval: ReturnType<typeof setInterval> | null = null;
  
  // ==========================================
  // ANIMATION CONTROL
  // ==========================================
  
  const updateAura = () => {
    if (!auraContainer.value) return;

    const colors = currentColors.value;

    // Update CSS variables on the aura container
    auraContainer.value.style.setProperty('--aura-primary', colors.primary);
    auraContainer.value.style.setProperty('--aura-glow', colors.glow);
    auraContainer.value.style.setProperty('--aura-intensity', String(colors.intensity));

    // Toggle state classes
    auraContainer.value.classList.toggle('altar-aura--vaal', isVaalMode.value);
    auraContainer.value.classList.toggle('altar-aura--active', isActive.value);
    auraContainer.value.classList.toggle('altar-aura--foil', isFoil.value && !isVaalMode.value && !isSynthesised.value);
    auraContainer.value.classList.toggle('altar-aura--synthesised', isSynthesised.value && !isVaalMode.value);
  };
  
  /**
   * Force reset the aura to dormant state
   * Called after Vaal outcomes to ensure clean visual state
   */
  const resetAura = () => {
    if (!auraContainer.value) return;

    // Force remove all active classes
    auraContainer.value.classList.remove('altar-aura--vaal', 'altar-aura--active', 'altar-aura--foil', 'altar-aura--synthesised');

    // Reset CSS variables to dormant
    auraContainer.value.style.setProperty('--aura-primary', '#5a5a5d');
    auraContainer.value.style.setProperty('--aura-glow', 'rgba(90, 90, 93, 0.4)');
    auraContainer.value.style.setProperty('--aura-intensity', '0');

    // Clear all particles immediately
    particles.forEach(p => {
      p.timeline.kill();
      p.element.remove();
    });
    particles.length = 0;

    // Stop particle interval
    if (particleInterval) {
      clearInterval(particleInterval);
      particleInterval = null;
    }
  };
  
  const startFoilAnimation = () => {
    if (masterTimeline.value) masterTimeline.value.kill();
    
    masterTimeline.value = gsap.timeline({ repeat: -1 });
    masterTimeline.value.to(foilColorIndex, {
      value: FOIL_COLORS.length,
      duration: FOIL_COLORS.length * 1.5,
      ease: 'none',
      modifiers: {
        value: (x: number) => Math.floor(x) % FOIL_COLORS.length,
      },
      onUpdate: updateAura,
    });
  };
  
  const stopFoilAnimation = () => {
    if (masterTimeline.value) {
      masterTimeline.value.kill();
      masterTimeline.value = null;
    }
    foilColorIndex.value = 0;
  };
  
  // ==========================================
  // WATCHERS
  // ==========================================
  
  // Watch for container ready
  watch(containerRef, (container) => {
    if (container) {
      createAuraContainer();
      updateAura();
    }
  }, { immediate: true });
  
  // Watch for state changes
  watch([isActive, isVaalMode, tier, isFoil, isSynthesised], () => {
    updateAura();

    // Handle Vaal particle system
    if (isVaalMode.value && isActive.value) {
      if (!particleInterval) {
        particleInterval = startParticleSystem() || null;
      }
    } else {
      if (particleInterval) {
        clearInterval(particleInterval);
        particleInterval = null;
      }
      // Clear remaining particles
      particles.forEach(p => {
        p.timeline.kill();
        p.element.remove();
      });
      particles.length = 0;
    }

    // Handle foil animation (not when synthesised - synthesised takes priority)
    if (isFoil.value && isActive.value && !isVaalMode.value && !isSynthesised.value) {
      startFoilAnimation();
    } else {
      stopFoilAnimation();
    }
  }, { immediate: true });
  
  // ==========================================
  // CLEANUP
  // ==========================================
  
  const cleanup = () => {
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
    
    // Stop foil animation
    stopFoilAnimation();
    
    // Remove aura container
    if (auraContainer.value) {
      auraContainer.value.remove();
      auraContainer.value = null;
    }
  };
  
  onUnmounted(cleanup);
  
  return {
    auraContainer,
    currentColors,
    resetAura,
    cleanup,
  };
}

