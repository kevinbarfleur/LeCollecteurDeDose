import { ref, computed, onUnmounted, type Ref } from 'vue';
import type { DecodedMousePosition, ReplayEvent, ReplayDataV2 } from '~/types/replay';
import { isReplayDataV2, migrateToV2 } from '~/types/replay';
import type { Database, Replay } from '~/types/database';
import { interpolateCatmullRom } from '~/utils/replayInterpolation';

export function useReplayPlayer() {
  // Get Supabase client - may be null if not configured
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
  }
  
  const replayData = ref<Replay | null>(null);
  const isLoading = ref(false);
  const isPlaying = ref(false);
  const isFinished = ref(false);
  const currentPositionIndex = ref(0);
  const cursorX = ref(0);
  const cursorY = ref(0);
  const playbackStartTime = ref(0);
  const positions = ref<DecodedMousePosition[]>([]);
  const events = ref<ReplayEvent[]>([]);
  const error = ref<string | null>(null);
  
  // Reference to the card element for calculating cursor position
  let cardRef: Ref<HTMLElement | null> | null = null;
  
  let animationFrameId: number | null = null;
  
  // Set the card reference for position calculations
  const setCardRef = (ref: Ref<HTMLElement | null>) => {
    cardRef = ref;
  };
  
  // Get the current card center position
  const getCardCenter = (): { x: number; y: number } | null => {
    if (!cardRef?.value) return null;
    const rect = cardRef.value.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const username = computed(() => replayData.value?.username || '');
  const userAvatar = computed(() => replayData.value?.user_avatar || '');
  const cardInfo = computed(() => {
    if (!replayData.value) return null;
    return {
      id: replayData.value.card_id,
      var: replayData.value.card_variation,
      uid: replayData.value.card_unique_id,
      tier: replayData.value.card_tier,
      foil: replayData.value.card_foil || false
    };
  });
  const outcome = computed(() => replayData.value?.outcome as 'nothing' | 'foil' | 'destroyed' | 'transform' | 'duplicate' | null);
  const resultCardId = computed(() => replayData.value?.result_card_id || null);
  const totalDuration = computed(() => {
    if (positions.value.length === 0) return 0;
    return positions.value[positions.value.length - 1].t;
  });
  const views = computed(() => replayData.value?.views || 0);
  const createdAt = computed(() => replayData.value?.created_at || null);

  const loadFromId = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;
    
    if (!supabase) {
      error.value = 'Service non disponible';
      isLoading.value = false;
      return false;
    }
    
    try {
      const { data, error: fetchError } = await supabase
        .from('replays')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !data) {
        error.value = 'Replay introuvable';
        return false;
      }

      replayData.value = data;
      
      // Handle both v1 (array) and v2 (object with version) formats
      const rawData = data.mouse_positions;
      let replayDataV2: ReplayDataV2;
      
      if (isReplayDataV2(rawData)) {
        // Already v2 format
        replayDataV2 = rawData;
      } else if (Array.isArray(rawData)) {
        // Legacy v1 format - migrate to v2
        replayDataV2 = migrateToV2(rawData as DecodedMousePosition[]);
      } else {
        error.value = 'Format de replay invalide';
        return false;
      }
      
      positions.value = replayDataV2.positions;
      events.value = replayDataV2.events;
      currentPositionIndex.value = 0;
      isFinished.value = false;
      
      // Initial position will be set when play() is called and card ref is available
      
      // Increment view count
      await supabase
        .from('replays')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', id);
      
      return true;
    } catch (e) {
      error.value = 'Erreur lors du chargement';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Interpolate cursor position using Catmull-Rom splines
   * Produces much smoother curves than linear interpolation
   */
  const interpolatePosition = (elapsed: number): { x: number; y: number } | null => {
    if (positions.value.length === 0) return null;
    
    // Get current card center position
    const cardCenter = getCardCenter();
    if (!cardCenter) return null;
    
    // Use Catmull-Rom interpolation for smooth curves
    const offset = interpolateCatmullRom(positions.value, elapsed);
    if (!offset) return null;
    
    return {
      x: cardCenter.x + offset.x,
      y: cardCenter.y + offset.y
    };
  };

  /**
   * Find the drop time from events (more reliable than position-based)
   */
  const getDropTime = (): number => {
    const dropEvent = events.value.find(e => e.type === 'orb_drop');
    if (dropEvent) {
      return dropEvent.t;
    }
    
    // Fallback: legacy behavior (last position - 2000ms buffer)
    if (positions.value.length > 0) {
      return Math.max(0, positions.value[positions.value.length - 1].t - 2000);
    }
    
    return 0;
  };

  const play = (onDropTime?: (elapsed: number) => void) => {
    if (isPlaying.value || positions.value.length === 0) return;
    
    isPlaying.value = true;
    isFinished.value = false;
    // Use performance.now() for consistent high-precision timing
    playbackStartTime.value = performance.now();
    
    // Get drop time from events (more reliable than position-based)
    const dropTime = getDropTime();
    let dropTriggered = false;

    const animate = () => {
      if (!isPlaying.value) return;
      
      const elapsed = performance.now() - playbackStartTime.value;
      
      if (elapsed >= totalDuration.value) {
        isPlaying.value = false;
        isFinished.value = true;
        return;
      }
      
      // Use Catmull-Rom interpolation for smooth cursor movement
      const pos = interpolatePosition(elapsed);
      if (pos) {
        cursorX.value = pos.x;
        cursorY.value = pos.y;
      }
      
      // Trigger drop callback based on event timestamp
      if (!dropTriggered && elapsed >= dropTime && onDropTime) {
        dropTriggered = true;
        onDropTime(elapsed);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
  };

  const pause = () => {
    isPlaying.value = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const reset = () => {
    pause();
    currentPositionIndex.value = 0;
    isFinished.value = false;
    
    // Reset cursor position relative to card center
    const cardCenter = getCardCenter();
    if (cardCenter && positions.value.length > 0) {
      cursorX.value = cardCenter.x + positions.value[0].x;
      cursorY.value = cardCenter.y + positions.value[0].y;
    }
  };

  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  /**
   * Get a specific event by type
   */
  const getEvent = (type: ReplayEvent['type']): ReplayEvent | undefined => {
    return events.value.find(e => e.type === type);
  };

  return {
    replayData: computed(() => replayData.value),
    isLoading: computed(() => isLoading.value),
    isPlaying: computed(() => isPlaying.value),
    isFinished: computed(() => isFinished.value),
    cursorX: computed(() => cursorX.value),
    cursorY: computed(() => cursorY.value),
    error: computed(() => error.value),
    events: computed(() => events.value),
    username,
    userAvatar,
    cardInfo,
    outcome,
    resultCardId,
    totalDuration,
    views,
    createdAt,
    setCardRef,
    loadFromId,
    play,
    pause,
    reset,
    getEvent,
    getDropTime,
  };
}
