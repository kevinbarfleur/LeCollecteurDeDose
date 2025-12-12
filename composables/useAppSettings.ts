/**
 * Composable to manage app settings with real-time updates
 * 
 * Settings are stored in Supabase (app_settings table) and
 * synchronized in real-time across all clients.
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AltarOpenSetting, DataSourceSetting, ActivityLogsEnabledSetting } from '~/types/database'

// Shared state across all components
const altarOpen = ref(false)
const dataSource = ref<'mock' | 'api'>('mock')
const activityLogsEnabled = ref(true)
const isLoading = ref(true)
const isConnected = ref(false)

// Track if we've already initialized
let initialized = false
let realtimeChannel: RealtimeChannel | null = null

export function useAppSettings() {
  const supabase = useSupabaseClient()

  /**
   * Fetch initial settings from Supabase
   */
  const fetchSettings = async () => {
    isLoading.value = true
    
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')

      if (error) {
        console.error('[AppSettings] Error fetching settings:', error)
        return
      }

      if (data) {
        for (const setting of data) {
          applySettingValue(setting.key, setting.value)
        }
      }
    } catch (err) {
      console.error('[AppSettings] Failed to fetch settings:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Apply a setting value to the appropriate ref
   */
  const applySettingValue = (key: string, value: unknown) => {
    switch (key) {
      case 'altar_open':
        const altarValue = value as AltarOpenSetting
        altarOpen.value = altarValue?.enabled ?? false
        break
      case 'data_source':
        const dsValue = value as DataSourceSetting
        dataSource.value = dsValue?.source ?? 'mock'
        break
      case 'activity_logs_enabled':
        const logsValue = value as ActivityLogsEnabledSetting
        activityLogsEnabled.value = logsValue?.enabled ?? true
        break
    }
  }

  /**
   * Subscribe to real-time updates
   */
  const subscribeToRealtime = () => {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'app_settings',
        },
        (payload) => {
          if (payload.new) {
            applySettingValue(
              payload.new.key as string,
              payload.new.value
            )
          }
        }
      )
      .subscribe((status) => {
        isConnected.value = status === 'SUBSCRIBED'
      })
  }

  /**
   * Update a setting in Supabase (admin only - uses PostgreSQL function)
   * Uses a PostgreSQL function that checks admin status server-side
   */
  const updateSetting = async (key: string, value: unknown, userId?: string) => {
    if (!userId) {
      return { success: false, error: { message: 'User ID required' } }
    }

    try {
      // Call PostgreSQL function that checks admin status and updates setting
      const { data, error } = await supabase.rpc('update_app_setting', {
        setting_key: key,
        setting_value: value,
        twitch_user_id: userId
      })

      if (error) {
        console.error('[AppSettings] Failed to update setting:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (err) {
      console.error('[AppSettings] Failed to update setting:', err)
      return { success: false, error: err }
    }
  }

  /**
   * Toggle the altar open/closed state
   */
  const toggleAltar = async (userId?: string) => {
    const newValue = !altarOpen.value
    return await updateSetting('altar_open', { enabled: newValue }, userId)
  }

  /**
   * Set the data source
   */
  const setDataSourceSetting = async (source: 'mock' | 'api', userId?: string) => {
    return await updateSetting('data_source', { source }, userId)
  }

  /**
   * Toggle activity logs enabled/disabled
   */
  const toggleActivityLogs = async (userId?: string) => {
    const newValue = !activityLogsEnabled.value
    return await updateSetting('activity_logs_enabled', { enabled: newValue }, userId)
  }

  /**
   * Set activity logs enabled state
   */
  const setActivityLogsEnabled = async (enabled: boolean, userId?: string) => {
    return await updateSetting('activity_logs_enabled', { enabled }, userId)
  }

  /**
   * Initialize the settings (fetch + subscribe)
   * Should be called once on app mount
   */
  const initialize = async () => {
    if (initialized) return
    initialized = true

    await fetchSettings()
    subscribeToRealtime()
  }

  /**
   * Cleanup subscriptions
   */
  const cleanup = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
    initialized = false
  }

  // Auto-initialize on client
  if (import.meta.client) {
    initialize()
  }

  return {
    // State
    altarOpen: computed(() => altarOpen.value),
    dataSource: computed(() => dataSource.value),
    activityLogsEnabled: computed(() => activityLogsEnabled.value),
    isLoading: computed(() => isLoading.value),
    isConnected: computed(() => isConnected.value),
    
    // Actions
    toggleAltar,
    setDataSourceSetting,
    toggleActivityLogs,
    setActivityLogsEnabled,
    fetchSettings,
    initialize,
    cleanup,
  }
}

