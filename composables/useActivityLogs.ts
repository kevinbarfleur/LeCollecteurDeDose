import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Database, ActivityLog } from '~/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MAX_LOGS = 50;
const MAX_NOTIFICATIONS = 3;
const NOTIFICATION_DURATION = 5000; // 5 seconds

// Notification type with unique ID for tracking
export interface ActivityNotification {
  id: string;
  log: ActivityLog;
  createdAt: number;
}

// Shared state across all components using this composable
const logs = ref<ActivityLog[]>([]);
const unreadCount = ref(0);
const isOpen = ref(false);
const isConnected = ref(false);
const connectionError = ref<string | null>(null);
const notifications = ref<ActivityNotification[]>([]);

// Track notification timeouts for cleanup
const notificationTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Track if subscription is already set up (singleton pattern)
let channel: RealtimeChannel | null = null;
let subscriberCount = 0;

export function useActivityLogs() {
  let supabase: ReturnType<typeof useSupabaseClient<Database>> | null = null;
  
  // Get current user session to filter own notifications
  const { user } = useUserSession();
  
  try {
    supabase = useSupabaseClient<Database>();
  } catch (e) {
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
              
              // Add notification (only if panel is closed AND not from current user)
              const currentUsername = user.value?.displayName;
              if (!currentUsername || newLog.username !== currentUsername) {
                addNotification(newLog);
              }
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
          }
        });
    } catch (e) {
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

  // Add a notification for a new log
  const addNotification = (log: ActivityLog) => {
    const notificationId = `notif-${log.id}-${Date.now()}`;
    
    const notification: ActivityNotification = {
      id: notificationId,
      log,
      createdAt: Date.now(),
    };
    
    // Add to the beginning, limit to MAX_NOTIFICATIONS
    notifications.value = [notification, ...notifications.value].slice(0, MAX_NOTIFICATIONS);
    
    // Set timeout to auto-dismiss after NOTIFICATION_DURATION
    const timeout = setTimeout(() => {
      dismissNotification(notificationId);
    }, NOTIFICATION_DURATION);
    
    notificationTimeouts.set(notificationId, timeout);
  };

  // Dismiss a specific notification
  const dismissNotification = (notificationId: string) => {
    // Clear the timeout if it exists
    const timeout = notificationTimeouts.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      notificationTimeouts.delete(notificationId);
    }
    
    // Remove from notifications array
    notifications.value = notifications.value.filter(n => n.id !== notificationId);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    // Clear all timeouts
    notificationTimeouts.forEach((timeout) => clearTimeout(timeout));
    notificationTimeouts.clear();
    
    // Clear notifications array
    notifications.value = [];
  };

  // Toggle panel open/closed
  const togglePanel = () => {
    isOpen.value = !isOpen.value;
    
    // Reset unread count and clear notifications when opening
    if (isOpen.value) {
      unreadCount.value = 0;
      clearAllNotifications();
    }
  };

  // Open panel
  const openPanel = () => {
    isOpen.value = true;
    unreadCount.value = 0;
    clearAllNotifications();
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
    notifications: computed(() => notifications.value),
    
    // Actions
    togglePanel,
    openPanel,
    closePanel,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
  };
}

