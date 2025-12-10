import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Database, ActivityLog } from '~/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MAX_LOGS = 50;

// Shared state across all components using this composable
const logs = ref<ActivityLog[]>([]);
const unreadCount = ref(0);
const isOpen = ref(false);
const isConnected = ref(false);
const connectionError = ref<string | null>(null);

// Track if subscription is already set up (singleton pattern)
let channel: RealtimeChannel | null = null;
let subscriberCount = 0;

export function useActivityLogs() {
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
    console.warn('Supabase client not available for activity logs');
  }

  // Subscribe to realtime changes
  const setupSubscription = async () => {
    if (!supabase || channel) return;

    try {
      // First, load recent logs
      const { data: recentLogs, error: fetchError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_LOGS);

      if (fetchError) {
        console.error('Failed to fetch initial logs:', fetchError);
        connectionError.value = 'Échec du chargement des logs';
      } else if (recentLogs) {
        logs.value = recentLogs;
      }

      // Set up realtime subscription
      channel = supabase
        .channel('activity-logs-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
          },
          (payload) => {
            const newLog = payload.new as ActivityLog;
            
            // Add to the beginning of the list
            logs.value = [newLog, ...logs.value].slice(0, MAX_LOGS);
            
            // Increment unread count if panel is closed
            if (!isOpen.value) {
              unreadCount.value++;
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            isConnected.value = true;
            connectionError.value = null;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            isConnected.value = false;
            connectionError.value = 'Connexion temps réel perdue';
            console.error('Realtime subscription error:', err);
          }
        });
    } catch (e) {
      console.error('Error setting up activity logs subscription:', e);
      connectionError.value = 'Erreur de connexion';
    }
  };

  // Cleanup subscription
  const cleanupSubscription = async () => {
    if (channel && supabase) {
      await supabase.removeChannel(channel);
      channel = null;
      isConnected.value = false;
    }
  };

  // Toggle panel open/closed
  const togglePanel = () => {
    isOpen.value = !isOpen.value;
    
    // Reset unread count when opening
    if (isOpen.value) {
      unreadCount.value = 0;
    }
  };

  // Open panel
  const openPanel = () => {
    isOpen.value = true;
    unreadCount.value = 0;
  };

  // Close panel
  const closePanel = () => {
    isOpen.value = false;
  };

  // Mark all as read
  const markAllAsRead = () => {
    unreadCount.value = 0;
  };

  // Lifecycle hooks for subscription management
  onMounted(() => {
    subscriberCount++;
    if (subscriberCount === 1) {
      setupSubscription();
    }
  });

  onUnmounted(() => {
    subscriberCount--;
    if (subscriberCount === 0) {
      cleanupSubscription();
    }
  });

  return {
    // State
    logs: computed(() => logs.value),
    unreadCount: computed(() => unreadCount.value),
    isOpen: computed(() => isOpen.value),
    isConnected: computed(() => isConnected.value),
    connectionError: computed(() => connectionError.value),
    hasUnread: computed(() => unreadCount.value > 0),
    
    // Actions
    togglePanel,
    openPanel,
    closePanel,
    markAllAsRead,
  };
}

