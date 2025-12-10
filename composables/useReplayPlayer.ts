import { ref, computed, onUnmounted } from 'vue';
import type { DecodedMousePosition } from '~/types/replay';
import type { Database, Replay } from '~/types/database';

export function useReplayPlayer() {
  // Get Supabase client - may be null if not configured
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
    console.warn('Supabase client not available');
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
  const error = ref<string | null>(null);
  
  let animationFrameId: number | null = null;

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
  const outcome = computed(() => replayData.value?.outcome as 'nothing' | 'foil' | 'destroyed' | null);
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
      positions.value = data.mouse_positions as DecodedMousePosition[];
      currentPositionIndex.value = 0;
      isFinished.value = false;
      
      if (positions.value.length > 0) {
        cursorX.value = positions.value[0].x * window.innerWidth;
        cursorY.value = positions.value[0].y * window.innerHeight;
      }
      
      // Increment view count
      await supabase
        .from('replays')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', id);
      
      return true;
    } catch (e) {
      console.error('Error loading replay:', e);
      error.value = 'Erreur lors du chargement';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const interpolatePosition = (elapsed: number): { x: number; y: number } | null => {
    if (positions.value.length === 0) return null;
    
    let prevIndex = 0;
    for (let i = 0; i < positions.value.length; i++) {
      if (positions.value[i].t <= elapsed) {
        prevIndex = i;
      } else {
        break;
      }
    }
    
    const prev = positions.value[prevIndex];
    const next = positions.value[prevIndex + 1];
    
    if (!next) {
      return {
        x: prev.x * window.innerWidth,
        y: prev.y * window.innerHeight
      };
    }
    
    const progress = (elapsed - prev.t) / (next.t - prev.t);
    const easedProgress = easeInOutCubic(progress);
    
    // Simple window-relative interpolation
    return {
      x: (prev.x + (next.x - prev.x) * easedProgress) * window.innerWidth,
      y: (prev.y + (next.y - prev.y) * easedProgress) * window.innerHeight
    };
  };

  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const play = (onDropTime?: (elapsed: number) => void) => {
    if (isPlaying.value || positions.value.length === 0) return;
    
    isPlaying.value = true;
    isFinished.value = false;
    playbackStartTime.value = Date.now();
    
    const dropTime = positions.value.length > 0 
      ? positions.value[positions.value.length - 1].t - 1000 
      : 0;
    let dropTriggered = false;

    const animate = () => {
      if (!isPlaying.value) return;
      
      const elapsed = Date.now() - playbackStartTime.value;
      
      if (elapsed >= totalDuration.value) {
        isPlaying.value = false;
        isFinished.value = true;
        return;
      }
      
      const pos = interpolatePosition(elapsed);
      if (pos) {
        cursorX.value = pos.x;
        cursorY.value = pos.y;
      }
      
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
    
    if (positions.value.length > 0) {
      cursorX.value = positions.value[0].x * window.innerWidth;
      cursorY.value = positions.value[0].y * window.innerHeight;
    }
  };

  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return {
    replayData: computed(() => replayData.value),
    isLoading: computed(() => isLoading.value),
    isPlaying: computed(() => isPlaying.value),
    isFinished: computed(() => isFinished.value),
    cursorX: computed(() => cursorX.value),
    cursorY: computed(() => cursorY.value),
    error: computed(() => error.value),
    username,
    userAvatar,
    cardInfo,
    outcome,
    totalDuration,
    views,
    createdAt,
    loadFromId,
    play,
    pause,
    reset
  };
}
