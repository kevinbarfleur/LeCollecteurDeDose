import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database, LiveRoomInsert } from '~/types/database';
import type { 
  LiveEvent, 
  LiveCardInfo, 
  SpectatorPresence 
} from '~/types/liveRoom';

/**
 * Composable for hosts to create and manage a live streaming room
 * Broadcasts card opening events to spectators in real-time
 * 
 * Handles automatic room closure on:
 * - Page navigation (internal)
 * - Page refresh
 * - Tab/browser close
 * - Visibility change (optional)
 */
export function useLiveRoom() {
  // Supabase client
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
    console.warn('Supabase client not available, live rooms disabled');
  }

  // Room state
  const roomId = ref<string | null>(null);
  const roomCode = ref<string | null>(null);
  const isLive = ref(false);
  const isCreating = ref(false);
  const isClosing = ref(false);
  const error = ref<string | null>(null);
  
  // Spectator tracking
  const spectators = ref<SpectatorPresence[]>([]);
  const spectatorCount = computed(() => spectators.value.length);

  // Realtime channel
  let channel: RealtimeChannel | null = null;

  // Track if we've set up event listeners
  let listenersAttached = false;

  /**
   * Handler for beforeunload event (tab close, refresh, navigate away)
   * Uses sendBeacon for reliable delivery even during page unload
   */
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isLive.value || !roomId.value) return;

    // Use sendBeacon for reliable delivery during page unload
    // This is the most reliable way to send data when the page is closing
    const url = '/api/live/close';
    const data = JSON.stringify({ roomId: roomId.value });
    
    try {
      navigator.sendBeacon(url, data);
    } catch (e) {
      // Fallback: try synchronous XHR (less reliable but better than nothing)
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false); // Synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(data);
      } catch (xhrError) {
        console.error('Failed to close room on unload:', xhrError);
      }
    }

    // Also try to broadcast room_closed event (may not always succeed)
    if (channel) {
      try {
        channel.send({
          type: 'broadcast',
          event: 'live-event',
          payload: { type: 'room_closed', timestamp: Date.now() },
        });
      } catch (e) {
        // Ignore - best effort
      }
    }
  };

  /**
   * Handler for visibilitychange event
   * Optional: close room when tab becomes hidden for extended period
   */
  let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;
  const VISIBILITY_TIMEOUT_MS = 30000; // 30 seconds of hidden = close room

  const handleVisibilityChange = () => {
    if (!isLive.value) return;

    if (document.hidden) {
      // Tab became hidden - start timer
      visibilityTimeout = setTimeout(() => {
        // If still hidden after timeout, close the room
        if (document.hidden && isLive.value) {
          console.log('Closing live room due to extended inactivity');
          closeRoom();
        }
      }, VISIBILITY_TIMEOUT_MS);
    } else {
      // Tab became visible - cancel timer
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = null;
      }
    }
  };

  /**
   * Attach event listeners for automatic room closure
   */
  const attachListeners = () => {
    if (listenersAttached || typeof window === 'undefined') return;

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    listenersAttached = true;
  };

  /**
   * Detach event listeners
   */
  const detachListeners = () => {
    if (!listenersAttached || typeof window === 'undefined') return;

    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = null;
    }
    
    listenersAttached = false;
  };

  /**
   * Create a new live room and start broadcasting
   */
  const createRoom = async (hostId: string, hostName: string, hostAvatar: string | null) => {
    if (!supabase) {
      error.value = 'Service non disponible';
      return null;
    }

    // Check if host already has an active room
    const { data: existingRoom } = await supabase
      .from('live_rooms')
      .select('id, room_code')
      .eq('host_id', hostId)
      .eq('is_active', true)
      .single();

    if (existingRoom) {
      // Reconnect to existing room
      roomId.value = existingRoom.id;
      roomCode.value = existingRoom.room_code;
      await setupChannel();
      isLive.value = true;
      attachListeners();
      return existingRoom.room_code;
    }

    isCreating.value = true;
    error.value = null;

    try {
      const roomInsert: LiveRoomInsert = {
        host_id: hostId,
        host_name: hostName,
        host_avatar: hostAvatar,
        is_active: true,
        spectator_count: 0,
      };

      const { data, error: insertError } = await supabase
        .from('live_rooms')
        .insert(roomInsert)
        .select('id, room_code')
        .single();

      if (insertError || !data) {
        error.value = 'Impossible de créer la room';
        return null;
      }

      roomId.value = data.id;
      roomCode.value = data.room_code;

      // Setup realtime channel
      await setupChannel();

      isLive.value = true;
      
      // Attach event listeners for automatic closure
      attachListeners();
      
      return data.room_code;
    } catch (e) {
      console.error('Error creating room:', e);
      error.value = 'Erreur lors de la création';
      return null;
    } finally {
      isCreating.value = false;
    }
  };

  /**
   * Setup the Realtime channel for broadcasting
   */
  const setupChannel = async () => {
    if (!supabase || !roomId.value) return;

    const channelName = `live-room:${roomId.value}`;
    
    channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        presence: { key: 'host' }, // Host presence key
      },
    });

    // Track spectator presence
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel?.presenceState() || {};
      const allSpectators: SpectatorPresence[] = [];
      
      Object.entries(presenceState).forEach(([key, presences]) => {
        if (key !== 'host') { // Exclude host from spectator list
          (presences as SpectatorPresence[]).forEach(p => {
            allSpectators.push(p);
          });
        }
      });
      
      spectators.value = allSpectators;
      
      // Update spectator count in database
      updateSpectatorCount(allSpectators.length);
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track host presence
        await channel?.track({
          userId: 'host',
          username: 'Host',
          userAvatar: null,
          online_at: new Date().toISOString(),
        });
      }
    });
  };

  /**
   * Update spectator count in database (debounced in production)
   */
  const updateSpectatorCount = async (count: number) => {
    if (!supabase || !roomId.value) return;
    
    await supabase
      .from('live_rooms')
      .update({ spectator_count: count })
      .eq('id', roomId.value);
  };

  /**
   * Broadcast a live event to all spectators
   */
  const broadcast = (event: LiveEvent) => {
    if (!channel || !isLive.value) return;

    channel.send({
      type: 'broadcast',
      event: 'live-event',
      payload: event,
    });
  };

  /**
   * Broadcast card placed on altar
   */
  const broadcastCardPlaced = (card: LiveCardInfo) => {
    broadcast({
      type: 'card_placed',
      card,
      timestamp: Date.now(),
    });
  };

  /**
   * Broadcast card ejected from altar
   */
  const broadcastCardEjected = () => {
    broadcast({
      type: 'card_ejected',
      timestamp: Date.now(),
    });
  };

  /**
   * Broadcast vaal orb drag started
   */
  const broadcastVaalStarted = () => {
    broadcast({
      type: 'vaal_started',
      timestamp: Date.now(),
    });
  };

  /**
   * Broadcast vaal orb position (throttled by caller)
   */
  const broadcastVaalPosition = (x: number, y: number) => {
    broadcast({
      type: 'vaal_position',
      x,
      y,
      timestamp: Date.now(),
    });
  };

  /**
   * Broadcast vaal orb cancelled
   */
  const broadcastVaalCancelled = () => {
    broadcast({
      type: 'vaal_cancelled',
      timestamp: Date.now(),
    });
  };

  /**
   * Broadcast vaal orb dropped on card
   */
  const broadcastVaalDropped = () => {
    broadcast({
      type: 'vaal_dropped',
      timestamp: Date.now(),
    });
  };

  /**
   * Broadcast outcome revealed
   */
  const broadcastOutcomeRevealed = (outcome: string, resultCardId: string | null) => {
    broadcast({
      type: 'outcome_revealed',
      outcome,
      resultCardId,
      timestamp: Date.now(),
    });
  };

  /**
   * Close the live room
   */
  const closeRoom = async () => {
    if (!roomId.value || isClosing.value) return;
    
    isClosing.value = true;
    
    try {
      // Broadcast room closed event first (so spectators get notified)
      broadcast({
        type: 'room_closed',
        timestamp: Date.now(),
      });

      // Small delay to ensure broadcast is sent
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update database
      if (supabase) {
        await supabase
          .from('live_rooms')
          .update({ 
            is_active: false, 
            closed_at: new Date().toISOString() 
          })
          .eq('id', roomId.value);
      }

      // Cleanup channel
      if (channel) {
        await channel.unsubscribe();
        channel = null;
      }

      // Detach event listeners
      detachListeners();

      // Reset state
      roomId.value = null;
      roomCode.value = null;
      isLive.value = false;
      spectators.value = [];
    } finally {
      isClosing.value = false;
    }
  };

  /**
   * Get shareable URL for the room
   */
  const getShareUrl = computed(() => {
    if (!roomCode.value) return null;
    if (typeof window === 'undefined') return null;
    return `${window.location.origin}/live/${roomCode.value}`;
  });

  /**
   * Copy share URL to clipboard
   */
  const copyShareUrl = async () => {
    if (!getShareUrl.value) return false;
    
    try {
      await navigator.clipboard.writeText(getShareUrl.value);
      return true;
    } catch (e) {
      console.error('Failed to copy URL:', e);
      return false;
    }
  };

  // Cleanup on unmount (handles internal navigation)
  onBeforeUnmount(async () => {
    // Close room if still live when component unmounts
    if (isLive.value) {
      await closeRoom();
    } else {
      // Just cleanup listeners
      detachListeners();
      
      if (channel) {
        await channel.unsubscribe();
        channel = null;
      }
    }
  });

  return {
    // State
    roomId: computed(() => roomId.value),
    roomCode: computed(() => roomCode.value),
    isLive: computed(() => isLive.value),
    isCreating: computed(() => isCreating.value),
    isClosing: computed(() => isClosing.value),
    error: computed(() => error.value),
    spectators: computed(() => spectators.value),
    spectatorCount,
    getShareUrl,

    // Actions
    createRoom,
    closeRoom,
    copyShareUrl,

    // Broadcast helpers
    broadcastCardPlaced,
    broadcastCardEjected,
    broadcastVaalStarted,
    broadcastVaalPosition,
    broadcastVaalCancelled,
    broadcastVaalDropped,
    broadcastOutcomeRevealed,
  };
}
