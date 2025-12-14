/**
 * Composable wrapper for App Settings Store
 * 
 * Provides a composable interface that uses the Pinia store
 */

import { useAppSettingsStore as useAppSettingsStorePinia } from '~/stores/appSettings.store'
import { useDataSourceStore } from '~/stores/dataSource.store'

export function useAppSettings() {
  const appSettingsStore = useAppSettingsStorePinia()
  const dataSourceStore = useDataSourceStore()

  // Initialize if needed
  if (import.meta.client && !appSettingsStore.isLoading) {
    appSettingsStore.initialize()
  }

  return {
    // State - wrap in computed to ensure reactivity
    altarOpen: computed(() => appSettingsStore.altarOpen),
    dataSource: computed(() => dataSourceStore.source),
    activityLogsEnabled: computed(() => appSettingsStore.activityLogsEnabled),
    isLoading: computed(() => appSettingsStore.isLoading),
    isConnected: computed(() => appSettingsStore.isConnected),

    // Actions
    toggleAltar: async (userId?: string) => {
      if (!userId) {
        const { user } = useUserSession()
        userId = user.value?.id
      }
      if (userId) {
        await appSettingsStore.toggleAltar(userId)
      }
    },
    setDataSourceSetting: async (source: 'api' | 'test', userId?: string) => {
      // This is kept for backward compatibility but should always be 'api' in production
      if (!userId) {
        const { user } = useUserSession()
        userId = user.value?.id
      }
      if (userId) {
        await appSettingsStore.updateSetting('data_source', { source: 'api' }, userId)
      }
    },
    toggleActivityLogs: async (userId?: string) => {
      if (!userId) {
        const { user } = useUserSession()
        userId = user.value?.id
      }
      if (userId) {
        await appSettingsStore.toggleActivityLogs(userId)
      }
    },
    setActivityLogsEnabled: async (enabled: boolean, userId?: string) => {
      if (!userId) {
        const { user } = useUserSession()
        userId = user.value?.id
      }
      if (userId) {
        await appSettingsStore.setActivityLogsEnabled(enabled, userId)
      }
    },
    fetchSettings: appSettingsStore.fetchSettings,
    initialize: appSettingsStore.initialize,
    cleanup: appSettingsStore.cleanup,
  }
}

