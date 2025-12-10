import { ref, computed } from 'vue';
import type { DecodedMousePosition } from '~/types/replay';
import type { VaalOutcome } from '~/types/vaalOutcome';
import type { Database, ReplayInsert } from '~/types/database';
import { RECORDING } from '~/constants/timing';

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
  const recordedOutcome = ref<VaalOutcome | null>(null);
  const resultCardId = ref<string | null>(null); // For transform outcomes - the card it became
  const generatedUrl = ref<string | null>(null);
  const replayId = ref<string | null>(null);
  
  // Track last sample time for throttling
  let lastSampleTime = 0;

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
    resultCardId.value = null;
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
  };

  // Record position relative to the card center
  // cardCenter should be the center coordinates of the card on screen
  // Throttled to SAMPLE_INTERVAL (20fps) to reduce data size while maintaining smooth replay
  const recordPosition = (
    clientX: number, 
    clientY: number, 
    cardCenter: { x: number; y: number }
  ) => {
    if (!isRecording.value) return;
    
    const now = Date.now() - recordStartTime.value;
    
    // Throttle: skip if not enough time has passed since last sample
    if (now - lastSampleTime < RECORDING.SAMPLE_INTERVAL) return;
    lastSampleTime = now;
    
    // Store the offset from the card center (in pixels)
    // This way, on replay, we can position relative to wherever the card is
    const x = clientX - cardCenter.x;
    const y = clientY - cardCenter.y;
    
    recordedPositions.value.push({ x, y, t: now });
  };

  const stopRecording = async (outcome: VaalOutcome, newCardId?: string) => {
    if (!isRecording.value) return null;
    
    recordedOutcome.value = outcome;
    resultCardId.value = newCardId || null;

    // Add final position to ensure the animation plays to completion
    const finalTime = Date.now() - recordStartTime.value + 2000;
    const lastPos = recordedPositions.value[recordedPositions.value.length - 1];
    if (lastPos) {
      // Keep the same offset for the final position
      recordedPositions.value.push({ x: lastPos.x, y: lastPos.y, t: finalTime });
    }

    // Immediately mark as not recording so a new recording can start
    // The save will happen in the background
    isRecording.value = false;
    isRecordingArmed.value = false;
    
    // Save to Supabase in the background after a delay
    // This allows the animation to complete before saving
    setTimeout(async () => {
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
        result_card_id: resultCardId.value,
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
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedOutcome.value = null;
    generatedUrl.value = null;
    replayId.value = null;
  };

  // Reset state to allow a new recording without clearing user info
  const resetForNewRecording = () => {
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedOutcome.value = null;
    resultCardId.value = null;
    // Keep generatedUrl and replayId for the share modal
    // They will be cleared on the next armRecording call
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
    resetForNewRecording,
    copyUrlToClipboard
  };
}
