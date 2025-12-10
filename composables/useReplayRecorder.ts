import { ref, computed } from 'vue';
import type { DecodedMousePosition } from '~/types/replay';
import type { Database, ReplayInsert } from '~/types/database';

const SAMPLE_INTERVAL = 50;

export function useReplayRecorder() {
  // Get Supabase client - may be null if not configured
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
    console.warn('Supabase client not available, replay saving disabled');
  }
  
  const isRecording = ref(false);
  const isRecordingArmed = ref(false);
  const isSaving = ref(false);
  const username = ref('');
  const userAvatar = ref('');
  const recordedPositions = ref<DecodedMousePosition[]>([]);
  const recordStartTime = ref(0);
  const cardData = ref<{ cardId: string; variation: string; uid: number; tier: string; foil: boolean } | null>(null);
  const recordedOutcome = ref<'nothing' | 'foil' | 'destroyed' | null>(null);
  const generatedUrl = ref<string | null>(null);
  const replayId = ref<string | null>(null);
  
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
    cardData.value = card;
    recordedPositions.value = [];
    recordedOutcome.value = null;
    generatedUrl.value = null;
    replayId.value = null;
    
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

  const stopRecording = async (outcome: 'nothing' | 'foil' | 'destroyed') => {
    if (!isRecording.value) return null;
    
    recordedOutcome.value = outcome;
    
    if (mouseMoveHandler) {
      window.removeEventListener('mousemove', mouseMoveHandler);
      mouseMoveHandler = null;
    }

    const finalTime = Date.now() - recordStartTime.value + 2000;
    const lastPos = recordedPositions.value[recordedPositions.value.length - 1];
    if (lastPos) {
      recordedPositions.value.push({ x: lastPos.x, y: lastPos.y, t: finalTime });
    }

    setTimeout(async () => {
      isRecording.value = false;
      await saveReplayToSupabase();
    }, 2000);

    return outcome;
  };

  const saveReplayToSupabase = async () => {
    if (!cardData.value || !recordedOutcome.value) return null;
    
    // If Supabase is not configured, skip saving
    if (!supabase) {
      console.warn('Supabase not configured, replay not saved');
      return null;
    }

    isSaving.value = true;

    try {
      const replayInsert: ReplayInsert = {
        username: username.value.trim(),
        user_avatar: userAvatar.value || null,
        card_id: cardData.value.cardId,
        card_variation: cardData.value.variation,
        card_unique_id: cardData.value.uid,
        card_tier: cardData.value.tier,
        card_foil: cardData.value.foil,
        mouse_positions: recordedPositions.value,
        outcome: recordedOutcome.value,
      };

      const { data, error } = await supabase
        .from('replays')
        .insert(replayInsert)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to save replay:', error);
        return null;
      }

      replayId.value = data.id;
      const url = `${window.location.origin}/replay/${data.id}`;
      generatedUrl.value = url;
      
      return url;
    } catch (e) {
      console.error('Error saving replay:', e);
      return null;
    } finally {
      isSaving.value = false;
    }
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
    replayId.value = null;
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
    isSaving: computed(() => isSaving.value),
    username: computed(() => username.value),
    userAvatar: computed(() => userAvatar.value),
    generatedUrl: computed(() => generatedUrl.value),
    replayId: computed(() => replayId.value),
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
