/**
 * Composable to manage app settings with real-time updates
 * 
 * Settings are stored in Supabase (app_settings table) and
 * synchronized in real-time across all clients.
 * 
 * Settings are now separated by data mode (api/test) so that
 * production and test modes can have independent states.
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AltarOpenSetting, DataSourceSetting, ActivityLogsEnabledSetting } from '~/types/database'

// Shared state across all components - separated by data mode
const altarOpenApi = ref(false)
const altarOpenTest = ref(false)
const activityLogsEnabledApi = ref(true)
const activityLogsEnabledTest = ref(true)
const isLoading = ref(true)
const isConnected = ref(false)

// Track if we've already initialized
let initialized = false
let realtimeChannel: RealtimeChannel | null = null

export function useAppSettings() {
  const supabase = useSupabaseClient()
  const { isTestData, dataSource: currentDataSource } = useDataSource()

  /**
   * Fetch initial settings from Supabase for both modes
   */
  const fetchSettings = async () => {
    isLoading.value = true
    
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value, data_mode')

      if (error) {
        console.error('[AppSettings] Error fetching settings:', error)
        return
      }

      if (data) {
        for (const setting of data) {
          const dataMode = (setting.data_mode as string) || 'api'
          applySettingValue(setting.key, setting.value, dataMode)
        }
      }
    } catch (err) {
      console.error('[AppSettings] Failed to fetch settings:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Apply a setting value to the appropriate ref based on data mode
   */
  const applySettingValue = (key: string, value: unknown, dataMode: string = 'api') => {
    switch (key) {
      case 'altar_open':
        const altarValue = value as AltarOpenSetting
        if (dataMode === 'test') {
          altarOpenTest.value = altarValue?.enabled ?? false
        } else {
          altarOpenApi.value = altarValue?.enabled ?? false
        }
        break
      case 'data_source':
        // Data source is now managed by useDataSource composable
        // This setting is kept for backward compatibility but is not used
        break
      case 'activity_logs_enabled':
        const logsValue = value as ActivityLogsEnabledSetting
        if (dataMode === 'test') {
          activityLogsEnabledTest.value = logsValue?.enabled ?? true
        } else {
          activityLogsEnabledApi.value = logsValue?.enabled ?? true
        }
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
            const dataMode = (payload.new.data_mode as string) || 'api'
            applySettingValue(
              payload.new.key as string,
              payload.new.value,
              dataMode
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
  const updateSetting = async (key: string, value: unknown, userId?: string, dataMode: 'api' | 'test' = 'api') => {
    if (!userId) {
      return { success: false, error: { message: 'User ID required' } }
    }

    try {
      // Call PostgreSQL function that checks admin status and updates setting
      const { data, error } = await supabase.rpc('update_app_setting', {
        setting_key: key,
        setting_value: value,
        twitch_user_id: userId,
        setting_data_mode: dataMode
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
   * Toggle the altar open/closed state for the current data mode
   */
  const toggleAltar = async (userId?: string) => {
    const currentDataMode = isTestData.value ? 'test' : 'api'
    const currentValue = currentDataMode === 'test' ? altarOpenTest.value : altarOpenApi.value
    const newValue = !currentValue
    return await updateSetting('altar_open', { enabled: newValue }, userId, currentDataMode)
  }

  /**
   * Set the data source
   * NOTE: This should NOT be used anymore - data source is now per-admin-session only
   * Kept for backward compatibility but should always be 'api' in production
   */
  const setDataSourceSetting = async (source: 'api' | 'test', userId?: string) => {
    // In production, always keep global setting as 'api'
    // Admin's local toggle is handled in useDataSource via localStorage
    return await updateSetting('data_source', { source: 'api' }, userId)
  }

  /**
   * Toggle activity logs enabled/disabled for the current data mode
   */
  const toggleActivityLogs = async (userId?: string) => {
    const currentDataMode = isTestData.value ? 'test' : 'api'
    const currentValue = currentDataMode === 'test' ? activityLogsEnabledTest.value : activityLogsEnabledApi.value
    const newValue = !currentValue
    return await updateSetting('activity_logs_enabled', { enabled: newValue }, userId, currentDataMode)
  }

  /**
   * Set activity logs enabled state for the current data mode
   */
  const setActivityLogsEnabled = async (enabled: boolean, userId?: string) => {
    const currentDataMode = isTestData.value ? 'test' : 'api'
    return await updateSetting('activity_logs_enabled', { enabled }, userId, currentDataMode)
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

  // Computed values that return the setting for the current data mode
  const altarOpen = computed(() => {
    return isTestData.value ? altarOpenTest.value : altarOpenApi.value
  })

  const activityLogsEnabled = computed(() => {
    return isTestData.value ? activityLogsEnabledTest.value : activityLogsEnabledApi.value
  })

  return {
    // State - these automatically return the value for the current data mode
    altarOpen,
    dataSource: currentDataSource, // Use the real dataSource from useDataSource
    activityLogsEnabled,
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

