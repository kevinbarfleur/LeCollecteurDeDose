import { ref, computed } from 'vue';
import type { DecodedMousePosition } from '~/types/replay';
import type { VaalOutcome } from '~/types/vaalOutcome';
import type { Database, ReplayInsert, ActivityLogInsert } from '~/types/database';
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
  const saveError = ref<string | null>(null); // Error message for UI feedback
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
    saveError.value = null;
    
    if (!cardData.value || !recordedOutcome.value) {
      saveError.value = 'Données de replay manquantes';
      return null;
    }
    
    // If Supabase is not configured, skip saving
    if (!supabase) {
      console.warn('Supabase not configured, replay not saved');
      saveError.value = 'Service de sauvegarde non disponible';
      return null;
    }

    // Validate card_unique_id is a valid integer
    const uid = cardData.value.uid;
    if (typeof uid !== 'number' || !Number.isFinite(uid) || !Number.isInteger(uid)) {
      console.error('Invalid card UID type:', typeof uid, uid);
      saveError.value = 'Erreur de données (UID invalide)';
      return null;
    }

    // Validate required string fields
    if (!cardData.value.cardId || typeof cardData.value.cardId !== 'string') {
      console.error('Invalid card ID:', cardData.value.cardId);
      saveError.value = 'Erreur de données (ID invalide)';
      return null;
    }

    isSaving.value = true;

    try {
      const replayInsert: ReplayInsert = {
        username: username.value.trim(),
        user_avatar: userAvatar.value || null,
        card_id: cardData.value.cardId,
        card_variation: cardData.value.variation,
        card_unique_id: uid,
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
        // User-friendly error messages based on error code
        if (error.code === '22P02') {
          saveError.value = 'Erreur de format des données';
        } else if (error.code === '23514') {
          saveError.value = 'Résultat non supporté';
        } else if (error.code === '23505') {
          saveError.value = 'Ce replay existe déjà';
        } else {
          saveError.value = 'Échec de la sauvegarde';
        }
        return null;
      }

      replayId.value = data.id;
      const url = `${window.location.origin}/replay/${data.id}`;
      generatedUrl.value = url;
      
      // Also insert into activity_logs for real-time feed (fire and forget)
      await saveActivityLog();
      
      return url;
    } catch (e) {
      console.error('Error saving replay:', e);
      saveError.value = 'Erreur inattendue lors de la sauvegarde';
      return null;
    } finally {
      isSaving.value = false;
    }
  };

  // Save a lightweight activity log entry for real-time feed
  const saveActivityLog = async () => {
    if (!supabase || !cardData.value || !recordedOutcome.value) return;

    try {
      const activityLogInsert: ActivityLogInsert = {
        username: username.value.trim(),
        user_avatar: userAvatar.value || null,
        card_id: cardData.value.cardId,
        card_tier: cardData.value.tier,
        outcome: recordedOutcome.value,
        result_card_id: resultCardId.value,
        replay_id: replayId.value, // Link to the replay if available
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(activityLogInsert);

      if (error) {
        // Log but don't fail - activity logs are non-critical
        console.warn('Failed to save activity log:', error);
      }
    } catch (e) {
      console.warn('Error saving activity log:', e);
    }
  };

  const cancelRecording = () => {
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedOutcome.value = null;
    generatedUrl.value = null;
    replayId.value = null;
    saveError.value = null;
  };

  // Log an activity without a replay (for when user preferences skip recording)
  // This is a standalone function that doesn't depend on recording state
  const logActivityOnly = async (
    card: { cardId: string; tier: string },
    outcome: VaalOutcome,
    newCardId?: string
  ) => {
    if (!supabase) return;
    if (!username.value.trim()) return;

    try {
      const activityLogInsert: ActivityLogInsert = {
        username: username.value.trim(),
        user_avatar: userAvatar.value || null,
        card_id: card.cardId,
        card_tier: card.tier,
        outcome: outcome,
        result_card_id: newCardId || null,
        replay_id: null, // No replay for this log
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(activityLogInsert);

      if (error) {
        console.warn('Failed to save activity log:', error);
      }
    } catch (e) {
      console.warn('Error saving activity log:', e);
    }
  };

  // Reset state to allow a new recording without clearing user info
  const resetForNewRecording = () => {
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedOutcome.value = null;
    resultCardId.value = null;
    saveError.value = null;
    // Keep generatedUrl and replayId for the share modal
    // They will be cleared on the next armRecording call
  };
  
  // Clear error state
  const clearError = () => {
    saveError.value = null;
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
    saveError: computed(() => saveError.value),
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
    clearError,
    copyUrlToClipboard,
    logActivityOnly,
  };
}
