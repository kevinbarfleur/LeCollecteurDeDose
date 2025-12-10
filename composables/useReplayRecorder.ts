import { ref, computed } from 'vue';
import type { ReplayData, DecodedMousePosition } from '~/types/replay';
import { encodeReplayData, flattenMousePositions, outcomeToCode } from '~/types/replay';

const SAMPLE_INTERVAL = 50;

export function useReplayRecorder() {
  const isRecording = ref(false);
  const isRecordingArmed = ref(false);
  const username = ref('');
  const userAvatar = ref('');
  const recordedPositions = ref<DecodedMousePosition[]>([]);
  const recordStartTime = ref(0);
  const cardData = ref<ReplayData['c'] | null>(null);
  const recordedOutcome = ref<'nothing' | 'foil' | 'destroyed' | null>(null);
  const generatedUrl = ref<string | null>(null);
  
  let lastSampleTime = 0;
  let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  const canStartRecording = computed(() => {
    return username.value.trim().length > 0 && !isRecording.value;
  });

  const setUser = (name: string, avatar: string) => {
    username.value = name;
    userAvatar.value = avatar;
  };

  const armRecording = (card: { cardId: string; variation: string; uid: number; tier: string; foil: boolean }) => {
    if (!username.value.trim()) return false;
    
    isRecordingArmed.value = true;
    cardData.value = {
      id: card.cardId,
      var: card.variation,
      uid: card.uid,
      tier: card.tier,
      foil: card.foil
    };
    recordedPositions.value = [];
    recordedOutcome.value = null;
    generatedUrl.value = null;
    
    return true;
  };

  const startRecording = () => {
    if (!isRecordingArmed.value) return;
    
    isRecording.value = true;
    isRecordingArmed.value = false;
    recordStartTime.value = Date.now();
    lastSampleTime = 0;
    recordedPositions.value = [];

    mouseMoveHandler = (e: MouseEvent) => {
      if (!isRecording.value) return;
      
      const now = Date.now() - recordStartTime.value;
      if (now - lastSampleTime < SAMPLE_INTERVAL) return;
      
      lastSampleTime = now;
      
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      recordedPositions.value.push({ x, y, t: now });
    };

    window.addEventListener('mousemove', mouseMoveHandler);
  };

  const recordPosition = (clientX: number, clientY: number) => {
    if (!isRecording.value) return;
    
    const now = Date.now() - recordStartTime.value;
    const x = clientX / window.innerWidth;
    const y = clientY / window.innerHeight;
    
    recordedPositions.value.push({ x, y, t: now });
  };

  const stopRecording = (outcome: 'nothing' | 'foil' | 'destroyed') => {
    if (!isRecording.value) return null;
    
    recordedOutcome.value = outcome;
    
    if (mouseMoveHandler) {
      window.removeEventListener('mousemove', mouseMoveHandler);
      mouseMoveHandler = null;
    }

    // Add 2 seconds for the animation to complete
    const finalTime = Date.now() - recordStartTime.value + 2000;
    const lastPos = recordedPositions.value[recordedPositions.value.length - 1];
    if (lastPos) {
      recordedPositions.value.push({ x: lastPos.x, y: lastPos.y, t: finalTime });
    }

    setTimeout(() => {
      isRecording.value = false;
      generateReplayUrl();
    }, 2000);

    return outcome;
  };

  const generateReplayUrl = () => {
    if (!cardData.value || !recordedOutcome.value) return null;

    const replayData: ReplayData = {
      v: 1,
      u: username.value.trim(),
      a: userAvatar.value,
      c: cardData.value,
      m: flattenMousePositions(recordedPositions.value),
      r: outcomeToCode(recordedOutcome.value),
      ts: Date.now()
    };

    const encoded = encodeReplayData(replayData);
    const url = `${window.location.origin}/replay?d=${encoded}`;
    generatedUrl.value = url;
    
    return url;
  };

  const cancelRecording = () => {
    if (mouseMoveHandler) {
      window.removeEventListener('mousemove', mouseMoveHandler);
      mouseMoveHandler = null;
    }
    
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedOutcome.value = null;
    generatedUrl.value = null;
  };

  const copyUrlToClipboard = async () => {
    if (!generatedUrl.value) return false;
    
    try {
      await navigator.clipboard.writeText(generatedUrl.value);
      return true;
    } catch (e) {
      console.error('Failed to copy URL:', e);
      return false;
    }
  };

  return {
    isRecording: computed(() => isRecording.value),
    isRecordingArmed: computed(() => isRecordingArmed.value),
    username: computed(() => username.value),
    userAvatar: computed(() => userAvatar.value),
    generatedUrl: computed(() => generatedUrl.value),
    canStartRecording,
    setUser,
    armRecording,
    startRecording,
    recordPosition,
    stopRecording,
    cancelRecording,
    copyUrlToClipboard
  };
}

