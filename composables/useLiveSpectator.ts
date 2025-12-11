import { ref, computed, onBeforeUnmount } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '~/types/database';
import type { 
  LiveEvent,
  LiveCardInfo,
  SpectatorPresence,
  SpectatorRoomState
} from '~/types/liveRoom';

// How often to check if room is still active (in ms)
const ROOM_CHECK_INTERVAL = 10000; // 10 seconds

/**
 * Composable for spectators to join and watch a live room
 * Receives real-time events from the host
 * 
 * Includes robust host presence detection:
 * - Monitors host presence in realtime channel
 * - Periodic database checks for room status
 * - Auto-disconnect if host leaves or room closes
 */
export function useLiveSpectator() {
  // Supabase client
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
    console.warn('Supabase client not available');
  }

  // Connection state
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const error = ref<string | null>(null);
  const roomClosed = ref(false);
  const hostDisconnected = ref(false);

  // Room info
  const roomId = ref<string | null>(null);
  const hostName = ref<string>('');
  const hostAvatar = ref<string | null>(null);
  
  // Host presence tracking
  const isHostPresent = ref(false);
  
  // Spectator tracking
  const spectators = ref<SpectatorPresence[]>([]);
  const spectatorCount = computed(() => spectators.value.length);

  // Card state (synced from host)
  const currentCard = ref<LiveCardInfo | null>(null);
  const isVaalActive = ref(false);
  const vaalPosition = ref<{ x: number; y: number } | null>(null);
  const lastOutcome = ref<{ outcome: string; resultCardId: string | null } | null>(null);

  // Realtime channel
  let channel: RealtimeChannel | null = null;

  // Room status check interval
  let roomCheckInterval: ReturnType<typeof setInterval> | null = null;

  // User info for presence
  let oderId = '';
  let username = '';
  let userAvatar: string | null = null;

  /**
   * Join a live room by room code
   */
  const joinRoom = async (
    roomCode: string,
    user: { id: string; name: string; avatar: string | null }
  ) => {
    if (!supabase) {
      error.value = 'Service non disponible';
      return false;
    }

    isConnecting.value = true;
    error.value = null;
    roomClosed.value = false;
    hostDisconnected.value = false;

    // Store user info
    oderId = user.id;
    username = user.name;
    userAvatar = user.avatar;

    try {
      // Find room by code
      const { data: room, error: fetchError } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (fetchError || !room) {
        error.value = 'Room introuvable ou fermée';
        return false;
      }

      roomId.value = room.id;
      hostName.value = room.host_name;
      hostAvatar.value = room.host_avatar;

      // Setup realtime channel
      await setupChannel(room.id);

      // Start periodic room status checks
      startRoomStatusCheck();

      isConnected.value = true;
      return true;
    } catch (e) {
      console.error('Error joining room:', e);
      error.value = 'Erreur de connexion';
      return false;
    } finally {
      isConnecting.value = false;
    }
  };

  /**
   * Setup Realtime channel for receiving events
   */
  const setupChannel = async (roomIdValue: string) => {
    if (!supabase) return;

    const channelName = `live-room:${roomIdValue}`;
    
    channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: oderId }, // Unique presence key
      },
    });

    // Handle live events from host
    channel.on('broadcast', { event: 'live-event' }, (payload) => {
      handleLiveEvent(payload.payload as LiveEvent);
    });

    // Track presence changes (including host)
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel?.presenceState() || {};
      const allSpectators: SpectatorPresence[] = [];
      let hostFound = false;
      
      Object.entries(presenceState).forEach(([key, presences]) => {
        if (key === 'host') {
          hostFound = true;
        } else {
          (presences as SpectatorPresence[]).forEach(p => {
            allSpectators.push(p);
          });
        }
      });
      
      spectators.value = allSpectators;
      
      // Track host presence
      const wasHostPresent = isHostPresent.value;
      isHostPresent.value = hostFound;
      
      // If host was present and is now gone, handle disconnect
      if (wasHostPresent && !hostFound) {
        console.log('Host left the channel');
        handleHostDisconnect();
      }
    });

    // Also listen for explicit leave events
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === 'host') {
        console.log('Host presence leave event');
        handleHostDisconnect();
      }
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track own presence
        await channel?.track({
          oderId,
          username,
          userAvatar,
          online_at: new Date().toISOString(),
        });
      }
    });
  };

  /**
   * Handle host disconnect
   */
  const handleHostDisconnect = async () => {
    // Double-check with database to be sure
    const roomStillActive = await checkRoomStatus();
    
    if (!roomStillActive) {
      hostDisconnected.value = true;
      roomClosed.value = true;
      disconnect();
    }
  };

  /**
   * Check if room is still active in database
   */
  const checkRoomStatus = async (): Promise<boolean> => {
    if (!supabase || !roomId.value) return false;

    try {
      const { data, error: fetchError } = await supabase
        .from('live_rooms')
        .select('is_active')
        .eq('id', roomId.value)
        .single();

      if (fetchError || !data) {
        return false;
      }

      return data.is_active;
    } catch (e) {
      console.error('Error checking room status:', e);
      return false;
    }
  };

  /**
   * Start periodic room status check
   */
  const startRoomStatusCheck = () => {
    // Clear any existing interval
    if (roomCheckInterval) {
      clearInterval(roomCheckInterval);
    }

    // Check room status periodically
    roomCheckInterval = setInterval(async () => {
      if (!isConnected.value) return;

      const isActive = await checkRoomStatus();
      
      if (!isActive) {
        console.log('Room is no longer active (periodic check)');
        roomClosed.value = true;
        disconnect();
      }
    }, ROOM_CHECK_INTERVAL);
  };

  /**
   * Stop periodic room status check
   */
  const stopRoomStatusCheck = () => {
    if (roomCheckInterval) {
      clearInterval(roomCheckInterval);
      roomCheckInterval = null;
    }
  };

  /**
   * Handle incoming live events from host
   */
  const handleLiveEvent = (event: LiveEvent) => {
    // Any event from host confirms they're still active
    isHostPresent.value = true;
    
    switch (event.type) {
      case 'card_placed':
        currentCard.value = event.card;
        isVaalActive.value = false;
        vaalPosition.value = null;
        lastOutcome.value = null;
        break;

      case 'card_ejected':
        currentCard.value = null;
        isVaalActive.value = false;
        vaalPosition.value = null;
        break;

      case 'vaal_started':
        isVaalActive.value = true;
        break;

      case 'vaal_position':
        vaalPosition.value = { x: event.x, y: event.y };
        break;

      case 'vaal_cancelled':
        isVaalActive.value = false;
        vaalPosition.value = null;
        break;

      case 'vaal_dropped':
        // Keep vaal active for animation
        break;

      case 'outcome_revealed':
        lastOutcome.value = {
          outcome: event.outcome,
          resultCardId: event.resultCardId,
        };
        isVaalActive.value = false;
        vaalPosition.value = null;
        break;

      case 'room_closed':
        roomClosed.value = true;
        disconnect();
        break;
    }
  };

  /**
   * Disconnect from the room
   */
  const disconnect = async () => {
    // Stop periodic checks
    stopRoomStatusCheck();

    if (channel) {
      await channel.unsubscribe();
      channel = null;
    }

    isConnected.value = false;
    isHostPresent.value = false;
    currentCard.value = null;
    isVaalActive.value = false;
    vaalPosition.value = null;
    spectators.value = [];
  };

  /**
   * Get current room state
   */
  const roomState = computed<SpectatorRoomState>(() => ({
    isConnected: isConnected.value,
    hostName: hostName.value,
    hostAvatar: hostAvatar.value,
    spectatorCount: spectatorCount.value,
    currentCard: currentCard.value,
    isVaalActive: isVaalActive.value,
    vaalPosition: vaalPosition.value,
  }));

  // Cleanup on unmount
  onBeforeUnmount(async () => {
    await disconnect();
  });

  return {
    // Connection state
    isConnected: computed(() => isConnected.value),
    isConnecting: computed(() => isConnecting.value),
    error: computed(() => error.value),
    roomClosed: computed(() => roomClosed.value),
    hostDisconnected: computed(() => hostDisconnected.value),
    isHostPresent: computed(() => isHostPresent.value),

    // Room info
    roomId: computed(() => roomId.value),
    hostName: computed(() => hostName.value),
    hostAvatar: computed(() => hostAvatar.value),

    // Spectators
    spectators: computed(() => spectators.value),
    spectatorCount,

    // Live state
    currentCard: computed(() => currentCard.value),
    isVaalActive: computed(() => isVaalActive.value),
    vaalPosition: computed(() => vaalPosition.value),
    lastOutcome: computed(() => lastOutcome.value),
    roomState,

    // Actions
    joinRoom,
    disconnect,
  };
}
