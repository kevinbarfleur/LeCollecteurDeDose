import { ref, computed } from 'vue';
import type { DecodedMousePosition, ReplayEvent, ReplayDataV2 } from '~/types/replay';
import type { AnyVaalOutcome } from '~/types/vaalOutcome';
import type { Database, ReplayInsert, ActivityLogInsert } from '~/types/database';
import { 
  shouldSample, 
  douglasPeucker, 
  DEFAULT_ADAPTIVE_CONFIG,
  type AdaptiveSamplingConfig 
} from '~/utils/replayInterpolation';

// Type for captured recording data (immutable snapshot at stop time)
interface CapturedRecordingData {
  username: string;
  userAvatar: string | null;
  cardId: string;
  cardVariation: string;
  cardUid: number;
  cardTier: string;
  cardFoil: boolean;
  cardSynthesised: boolean;
  replayData: ReplayDataV2;
  outcome: AnyVaalOutcome;
  resultCardId: string | null;
}

// Compression settings
const DOUGLAS_PEUCKER_EPSILON = 3; // pixels - higher = more compression, less accuracy

export function useReplayRecorder() {
  // Get Supabase client - may be null if not configured
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
  }
  
  const isRecording = ref(false);
  const isRecordingArmed = ref(false);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null); // Error message for UI feedback
  const username = ref('');
  const userAvatar = ref('');
  const recordedPositions = ref<DecodedMousePosition[]>([]);
  const recordedEvents = ref<ReplayEvent[]>([]);
  const recordStartTime = ref(0);
  const cardData = ref<{ cardId: string; variation: string; uid: number; tier: string; foil: boolean; synthesised: boolean } | null>(null);
  const generatedUrl = ref<string | null>(null);
  const replayId = ref<string | null>(null);
  
  // Track timing with high precision
  let lastSampleTime = 0;
  let lastPosition: DecodedMousePosition | null = null;
  
  // Adaptive sampling config (can be customized per-recording if needed)
  const samplingConfig: AdaptiveSamplingConfig = { ...DEFAULT_ADAPTIVE_CONFIG };

  const canStartRecording = computed(() => {
    return username.value.trim().length > 0 && !isRecording.value;
  });

  const setUser = (name: string, avatar: string) => {
    username.value = name;
    userAvatar.value = avatar;
  };

  const armRecording = (card: { cardId: string; variation: string; uid: number; tier: string; foil: boolean; synthesised?: boolean }) => {
    if (!username.value.trim()) return false;

    isRecordingArmed.value = true;
    cardData.value = { ...card, synthesised: card.synthesised ?? false };
    recordedPositions.value = [];
    recordedEvents.value = [];
    generatedUrl.value = null;
    replayId.value = null;
    
    return true;
  };

  const startRecording = () => {
    if (!isRecordingArmed.value) return;
    
    isRecording.value = true;
    isRecordingArmed.value = false;
    // Use performance.now() for high precision monotonic timing
    recordStartTime.value = performance.now();
    lastSampleTime = 0;
    lastPosition = null;
    recordedPositions.value = [];
    recordedEvents.value = [{ type: 'recording_start', t: 0 }];
  };

  /**
   * Record a discrete event with timestamp
   */
  const recordEvent = (type: ReplayEvent['type'], data?: ReplayEvent['data']) => {
    if (!isRecording.value) return;
    
    const t = performance.now() - recordStartTime.value;
    recordedEvents.value.push({ type, t, data });
  };

  /**
   * Record position relative to the card center
   * Uses adaptive sampling: more samples during fast movement, fewer during slow/idle
   */
  const recordPosition = (
    clientX: number, 
    clientY: number, 
    cardCenter: { x: number; y: number }
  ) => {
    if (!isRecording.value) return;
    
    // Use performance.now() for precise timing
    const now = performance.now() - recordStartTime.value;
    const timeSinceLastSample = now - lastSampleTime;
    
    // Calculate offset from card center
    const x = clientX - cardCenter.x;
    const y = clientY - cardCenter.y;
    
    // Check if we should sample using adaptive algorithm
    if (!shouldSample(x, y, lastPosition, timeSinceLastSample, samplingConfig)) {
      return;
    }
    
    // Record this position
    const position: DecodedMousePosition = { x, y, t: now };
    recordedPositions.value.push(position);
    
    lastSampleTime = now;
    lastPosition = position;
  };

  const stopRecording = async (outcome: AnyVaalOutcome, newCardId?: string) => {
    if (!isRecording.value || !cardData.value) return null;
    
    const endTime = performance.now() - recordStartTime.value;
    
    // Record the drop event with outcome
    recordEvent('orb_drop', { outcome });
    recordEvent('outcome_resolved', { outcome });
    
    // Clone positions before compression
    const rawPositions = [...recordedPositions.value];
    const originalCount = rawPositions.length;
    
    // Add final position to ensure animation plays to completion (2s buffer)
    const finalTime = endTime + 2000;
    const lastPos = rawPositions[rawPositions.length - 1];
    if (lastPos) {
      rawPositions.push({ x: lastPos.x, y: lastPos.y, t: finalTime });
    }
    
    // Apply Douglas-Peucker compression to reduce data size
    const compressedPositions = douglasPeucker(rawPositions, DOUGLAS_PEUCKER_EPSILON);
    
    // Record end event
    const events: ReplayEvent[] = [
      ...recordedEvents.value,
      { type: 'recording_end', t: finalTime }
    ];
    
    // Create v2 replay data structure
    const replayData: ReplayDataV2 = {
      version: 2,
      positions: compressedPositions,
      events,
      metadata: {
        originalPointCount: originalCount,
        compressionRatio: originalCount > 0 ? compressedPositions.length / originalCount : 1,
        recordingDuration: finalTime,
      },
    };
    
    // CRITICAL: Capture ALL data NOW as an immutable snapshot
    // This prevents data corruption if user starts a new recording before save completes
    const capturedData: CapturedRecordingData = {
      username: username.value.trim(),
      userAvatar: userAvatar.value || null,
      cardId: cardData.value.cardId,
      cardVariation: cardData.value.variation,
      cardUid: cardData.value.uid,
      cardTier: cardData.value.tier,
      cardFoil: cardData.value.foil,
      cardSynthesised: cardData.value.synthesised,
      replayData,
      outcome,
      resultCardId: newCardId || null,
    };

    // Immediately mark as not recording so a new recording can start
    isRecording.value = false;
    isRecordingArmed.value = false;
    
    // Log compression stats in dev
    if (import.meta.dev) {
    }
    
    // Save to Supabase in the background after a short delay
    // Pass captured data directly - it won't be affected by new recordings
    setTimeout(async () => {
      await saveReplayWithData(capturedData);
    }, 500); // Reduced delay since animation is already complete

    return outcome;
  };

  // Internal function that uses captured data directly (immutable)
  const saveReplayWithData = async (data: CapturedRecordingData) => {
    saveError.value = null;
    
    // If Supabase is not configured, skip saving
    if (!supabase) {
      saveError.value = 'Service de sauvegarde non disponible';
      return null;
    }

    // Validate card_unique_id is a valid number
    if (typeof data.cardUid !== 'number' || !Number.isFinite(data.cardUid)) {
      saveError.value = 'Erreur de données (UID invalide)';
      return null;
    }

    // Validate required string fields
    if (!data.cardId || typeof data.cardId !== 'string') {
      saveError.value = 'Erreur de données (ID invalide)';
      return null;
    }

    isSaving.value = true;

    try {
      // Store the full ReplayDataV2 structure in mouse_positions
      // This is backward compatible - the field is JSON type
      // Note: cardUid can be decimal (e.g., 199.0001) for duplicate cards, but DB column is bigint
      // We need to use the base UID (integer part) for storage
      const baseCardUid = Math.floor(data.cardUid);

      const replayInsert: ReplayInsert = {
        username: data.username,
        user_avatar: data.userAvatar,
        card_id: data.cardId,
        card_variation: data.cardVariation,
        card_unique_id: baseCardUid,
        card_tier: data.cardTier,
        card_foil: data.cardFoil,
        card_synthesised: data.cardSynthesised,
        mouse_positions: data.replayData as unknown as ReplayInsert['mouse_positions'],
        outcome: data.outcome,
        result_card_id: data.resultCardId,
      };

      const { data: insertedData, error } = await supabase
        .from('replays')
        .insert(replayInsert)
        .select('id')
        .single();

      if (error) {
        // User-friendly error messages based on error code
        if (error.code === '22P02') {
          saveError.value = 'Erreur de format des données';
        } else if (error.code === '23514') {
          saveError.value = 'Résultat non supporté';
        } else if (error.code === '23505') {
          saveError.value = 'Ce replay existe déjà';
        } else if (error.code === '22003') {
          saveError.value = 'Erreur de données (valeur trop grande)';
        } else {
          saveError.value = 'Échec de la sauvegarde';
        }
        return null;
      }

      replayId.value = insertedData.id;
      const url = `${window.location.origin}/replay/${insertedData.id}`;
      generatedUrl.value = url;
      
      // Also insert into activity_logs for real-time feed (fire and forget)
      // Pass captured data and the new replay ID
      await saveActivityLogWithData(data, insertedData.id);
      
      return url;
    } catch (e) {
      saveError.value = 'Erreur inattendue lors de la sauvegarde';
      return null;
    } finally {
      isSaving.value = false;
    }
  };

  // Save activity log using captured data (internal)
  const saveActivityLogWithData = async (data: CapturedRecordingData, savedReplayId: string) => {
    if (!supabase) return;

    try {
      const activityLogInsert: ActivityLogInsert = {
        username: data.username,
        user_avatar: data.userAvatar,
        card_id: data.cardId,
        card_tier: data.cardTier,
        outcome: data.outcome,
        result_card_id: data.resultCardId,
        replay_id: savedReplayId,
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(activityLogInsert);

      if (error) {
      }
    } catch (e) {
    }
  };

  const cancelRecording = () => {
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedEvents.value = [];
    generatedUrl.value = null;
    replayId.value = null;
    saveError.value = null;
    lastPosition = null;
  };

  // Log an activity without a replay (for when user preferences skip recording)
  // This is a standalone function that doesn't depend on recording state
  const logActivityOnly = async (
    card: { cardId: string; tier: string },
    outcome: AnyVaalOutcome,
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
      }
    } catch (e) {
    }
  };

  // Reset state to allow a new recording without clearing user info
  const resetForNewRecording = () => {
    isRecording.value = false;
    isRecordingArmed.value = false;
    recordedPositions.value = [];
    recordedEvents.value = [];
    saveError.value = null;
    lastPosition = null;
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
    recordEvent,  // New: record discrete events
    stopRecording,
    cancelRecording,
    resetForNewRecording,
    clearError,
    copyUrlToClipboard,
    logActivityOnly,
  };
}
