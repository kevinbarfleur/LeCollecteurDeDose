import { ref, computed, watch, type Ref } from 'vue';
import { HEARTBEAT } from '~/constants/timing';

export interface AltarEffectsOptions {
  cardRef: Ref<HTMLElement | null>;
  cursorX?: Ref<number>;  // Optional - if provided, watch is set up automatically
  cursorY?: Ref<number>;  // Optional - if provided, watch is set up automatically
  isActive: Ref<boolean>; // isDraggingOrb in altar, isPlaying in replay
  isDestroying?: Ref<boolean>;
  autoWatch?: boolean;    // Whether to auto-watch cursor changes (default: true if cursorX/Y provided)
}

export interface CardInfo {
  tier?: string;
  foil?: boolean;
}

export function useAltarEffects(options: AltarEffectsOptions) {
  const { cardRef, cursorX, cursorY, isActive, isDestroying, autoWatch = true } = options;
  
  // ==========================================
  // HEARTBEAT EFFECT
  // ==========================================
  const heartbeatIntensity = ref(0);
  const isOrbOverCard = ref(false);
  
  // Calculate heartbeat intensity based on distance from cursor to card center
  // Can be called manually with coordinates or uses refs if available
  const updateHeartbeat = (orbX?: number, orbY?: number) => {
    const x = orbX ?? cursorX?.value ?? 0;
    const y = orbY ?? cursorY?.value ?? 0;
    
    if (!cardRef.value) {
      heartbeatIntensity.value = isActive.value ? 0.3 : 0;
      return;
    }
    
    if (!isActive.value) {
      heartbeatIntensity.value = 0;
      isOrbOverCard.value = false;
      return;
    }
    
    const cardRect = cardRef.value.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;
    
    // Calculate distance from cursor to card center
    const dx = x - cardCenterX;
    const dy = y - cardCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= HEARTBEAT.MIN_DISTANCE) {
      heartbeatIntensity.value = 1; // MAX PANIC!
    } else if (distance >= HEARTBEAT.MAX_DISTANCE) {
      heartbeatIntensity.value = 0.2; // Just aware something is coming
    } else {
      // Linear interpolation - closer = more intense
      const normalizedDistance = (distance - HEARTBEAT.MIN_DISTANCE) / (HEARTBEAT.MAX_DISTANCE - HEARTBEAT.MIN_DISTANCE);
      heartbeatIntensity.value = 1 - normalizedDistance * 0.8; // 0.2 to 1 range
    }
    
    // Check if cursor is over the card
    isOrbOverCard.value = 
      x >= cardRect.left &&
      x <= cardRect.right &&
      y >= cardRect.top &&
      y <= cardRect.bottom;
  };
  
  // Watch cursor position and update heartbeat automatically if refs provided
  if (autoWatch && cursorX && cursorY) {
    watch([cursorX, cursorY, isActive], () => {
      updateHeartbeat();
    });
  }
  
  // ==========================================
  // HEARTBEAT STYLES
  // ==========================================
  // Creates the computed heartbeat styles
  // Optional additionalCheck can disable styles (e.g., during animations)
  const createHeartbeatStyles = (additionalCheck?: Ref<boolean>) => {
    return computed(() => {
      const destroying = isDestroying?.value ?? false;
      const additionalDisabled = additionalCheck?.value ?? false;
      
      if (destroying || additionalDisabled) return {};
      
      // Calculate speed based on intensity (higher intensity = faster)
      const speed = isActive.value 
        ? HEARTBEAT.BASE_SPEED - (heartbeatIntensity.value * (HEARTBEAT.BASE_SPEED - HEARTBEAT.PANIC_SPEED))
        : HEARTBEAT.BASE_SPEED;
      
      // Calculate scale intensity (subtle when calm, dramatic when panicking)
      const panicScale = isActive.value 
        ? HEARTBEAT.BASE_SCALE + (heartbeatIntensity.value * (HEARTBEAT.MAX_PANIC_SCALE - HEARTBEAT.BASE_SCALE))
        : HEARTBEAT.BASE_SCALE;
      
      return {
        '--heartbeat-speed': `${speed}s`,
        '--heartbeat-scale': panicScale,
        '--heartbeat-glow-intensity': isActive.value ? heartbeatIntensity.value : 0.15,
      };
    });
  };
  
  // Default heartbeat styles (no additional check)
  const heartbeatStyles = createHeartbeatStyles();
  
  // ==========================================
  // CARD CLASSES
  // ==========================================
  const getCardClasses = (isCardOnAltar: boolean, isAnimating: boolean = false) => {
    const destroying = isDestroying?.value ?? false;
    
    return {
      'altar-card--heartbeat': isCardOnAltar && !isAnimating && !destroying,
      'altar-card--panicking': isActive.value && !isAnimating && !destroying,
      'altar-card--destroying': destroying,
    };
  };
  
  // ==========================================
  // ALTAR PLATFORM CLASSES
  // ==========================================
  const getAltarClasses = (cardInfo: CardInfo, isAltarActive: boolean) => {
    return {
      'altar-platform--t0': cardInfo.tier === 'T0',
      'altar-platform--t1': cardInfo.tier === 'T1',
      'altar-platform--t2': cardInfo.tier === 'T2',
      'altar-platform--t3': cardInfo.tier === 'T3',
      'altar-platform--foil': cardInfo.foil ?? false,
      'altar-platform--active': isAltarActive,
      'altar-platform--vaal': isOrbOverCard.value,
    };
  };
  
  // Reset all effects
  const resetEffects = () => {
    heartbeatIntensity.value = 0;
    isOrbOverCard.value = false;
  };
  
  return {
    // State
    heartbeatIntensity,
    isOrbOverCard,
    
    // Computed
    heartbeatStyles,
    createHeartbeatStyles,
    
    // Methods
    updateHeartbeat,
    getCardClasses,
    getAltarClasses,
    resetEffects,
  };
}

