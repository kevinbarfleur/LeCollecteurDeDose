/**
 * App Settings Store
 * 
 * Manages application settings (altar, activity logs) separated by data mode
 * Settings are synchronized in real-time via Supabase Realtime
 */

import { defineStore } from 'pinia'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { fetchAppSettings, updateAppSetting, subscribeToAppSettings } from '~/services/supabase.service'
import { useDataSourceStore } from './dataSource.store'

interface Settings {
  altarOpen: boolean
  activityLogsEnabled: boolean
}

export const useAppSettingsStore = defineStore('appSettings', () => {
  // State
  const settings = ref<{ api: Settings; test: Settings }>({
    api: {
      altarOpen: false,
      activityLogsEnabled: true,
    },
    test: {
      altarOpen: false,
      activityLogsEnabled: true,
    },
  })

  const isLoading = ref(true)
  const isConnected = ref(false)
  const realtimeChannel = ref<RealtimeChannel | null>(null)

  // Getters
  const currentSettings = computed<Settings>(() => {
    const dataSourceStore = useDataSourceStore()
    return dataSourceStore.isTestData ? settings.value.test : settings.value.api
  })

  const altarOpen = computed(() => currentSettings.value.altarOpen)

  const activityLogsEnabled = computed(() => currentSettings.value.activityLogsEnabled)

  // Actions
  function applySettingValue(key: string, value: unknown, dataMode: 'api' | 'test' = 'api') {
    switch (key) {
      case 'altar_open': {
        const altarValue = value as { enabled?: boolean }
        if (dataMode === 'test') {
          settings.value.test.altarOpen = altarValue?.enabled ?? false
        } else {
          settings.value.api.altarOpen = altarValue?.enabled ?? false
        }
        break
      }
      case 'activity_logs_enabled': {
        const logsValue = value as { enabled?: boolean }
        if (dataMode === 'test') {
          settings.value.test.activityLogsEnabled = logsValue?.enabled ?? true
        } else {
          settings.value.api.activityLogsEnabled = logsValue?.enabled ?? true
        }
        break
      }
    }
  }

  async function fetchSettings(): Promise<void> {
    isLoading.value = true

    try {
      const data = await fetchAppSettings()

      for (const setting of data) {
        const dataMode = (setting.data_mode as string) || 'api'
        applySettingValue(setting.key, setting.value, dataMode as 'api' | 'test')
      }
    } catch (err) {
      console.error('[AppSettingsStore] Failed to fetch settings:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function updateSetting(
    key: string,
    value: unknown,
    userId: string,
    dataMode: 'api' | 'test' = 'api'
  ): Promise<void> {
    await updateAppSetting(key, value, userId, dataMode)
    // The realtime subscription will update the state automatically
  }

  async function toggleAltar(userId: string): Promise<void> {
    const dataSourceStore = useDataSourceStore()
    const currentDataMode = dataSourceStore.isTestData ? 'test' : 'api'
    const currentValue = currentDataMode === 'test' 
      ? settings.value.test.altarOpen 
      : settings.value.api.altarOpen
    const newValue = !currentValue

    await updateSetting('altar_open', { enabled: newValue }, userId, currentDataMode)
  }

  async function toggleActivityLogs(userId: string): Promise<void> {
    const dataSourceStore = useDataSourceStore()
    const currentDataMode = dataSourceStore.isTestData ? 'test' : 'api'
    const currentValue = currentDataMode === 'test'
      ? settings.value.test.activityLogsEnabled
      : settings.value.api.activityLogsEnabled
    const newValue = !currentValue

    await updateSetting('activity_logs_enabled', { enabled: newValue }, userId, currentDataMode)
  }

  async function setActivityLogsEnabled(enabled: boolean, userId: string): Promise<void> {
    const dataSourceStore = useDataSourceStore()
    const currentDataMode = dataSourceStore.isTestData ? 'test' : 'api'
    await updateSetting('activity_logs_enabled', { enabled }, userId, currentDataMode)
  }

  function subscribeToRealtime(): void {
    if (realtimeChannel.value) return

    const channel = subscribeToAppSettings((payload) => {
      applySettingValue(
        payload.key,
        payload.value,
        payload.data_mode as 'api' | 'test'
      )
    })

    realtimeChannel.value = channel as any

    // Track connection status - simplified approach
    isConnected.value = true
  }

  function cleanup(): void {
    if (realtimeChannel.value) {
      const supabase = useSupabaseClient()
      supabase.removeChannel(realtimeChannel.value as any)
      realtimeChannel.value = null
    }
    isConnected.value = false
  }

  async function initialize(): Promise<void> {
    await fetchSettings()
    subscribeToRealtime()
  }

  // Auto-initialize on client
  if (import.meta.client) {
    initialize()
  }

  return {
    // State - expose as computed for reactivity
    isLoading: computed(() => isLoading.value),
    isConnected: computed(() => isConnected.value),

    // Getters
    currentSettings,
    altarOpen,
    activityLogsEnabled,

    // Actions
    toggleAltar,
    toggleActivityLogs,
    setActivityLogsEnabled,
    updateSetting,
    fetchSettings,
    initialize,
    cleanup,
  }
})

