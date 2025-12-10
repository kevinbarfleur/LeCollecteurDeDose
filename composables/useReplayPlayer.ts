import { ref, computed, onUnmounted } from 'vue';
import type { ReplayData, DecodedMousePosition } from '~/types/replay';
import { decodeReplayData, unflattenMousePositions, codeToOutcome } from '~/types/replay';

export function useReplayPlayer() {
  const replayData = ref<ReplayData | null>(null);
  const isPlaying = ref(false);
  const isFinished = ref(false);
  const currentPositionIndex = ref(0);
  const cursorX = ref(0);
  const cursorY = ref(0);
  const playbackStartTime = ref(0);
  const positions = ref<DecodedMousePosition[]>([]);
  
  let animationFrameId: number | null = null;

  const username = computed(() => replayData.value?.u || '');
  const userAvatar = computed(() => replayData.value?.a || '');
  const cardInfo = computed(() => replayData.value?.c || null);
  const outcome = computed(() => replayData.value ? codeToOutcome(replayData.value.r) : null);
  const totalDuration = computed(() => {
    if (positions.value.length === 0) return 0;
    return positions.value[positions.value.length - 1].t;
  });

  const loadFromUrl = (encodedData: string): boolean => {
    const data = decodeReplayData(encodedData);
    if (!data) return false;
    
    replayData.value = data;
    positions.value = unflattenMousePositions(data.m);
    currentPositionIndex.value = 0;
    isFinished.value = false;
    
    if (positions.value.length > 0) {
      cursorX.value = positions.value[0].x * window.innerWidth;
      cursorY.value = positions.value[0].y * window.innerHeight;
    }
    
    return true;
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
    isPlaying: computed(() => isPlaying.value),
    isFinished: computed(() => isFinished.value),
    cursorX: computed(() => cursorX.value),
    cursorY: computed(() => cursorY.value),
    username,
    userAvatar,
    cardInfo,
    outcome,
    totalDuration,
    loadFromUrl,
    play,
    pause,
    reset
  };
}

