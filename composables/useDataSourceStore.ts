/**
 * Composable wrapper for Data Source Store
 * 
 * Provides a composable interface that uses the Pinia store
 */

import { useDataSourceStore as useDataSourceStorePinia } from '~/stores/dataSource.store'
import { useAuthStore } from '~/stores/auth.store'

export function useDataSource() {
  const dataSourceStore = useDataSourceStorePinia()
  const authStore = useAuthStore()

  // Don't initialize here - let the plugin handle it
  // This prevents multiple initializations

  return {
    dataSource: computed(() => dataSourceStore.source),
    isMockData: computed(() => dataSourceStore.isMockData),
    isSupabaseData: computed(() => dataSourceStore.isSupabaseData),
    isInitializing: computed(() => !dataSourceStore.isInitialized),
    isLoadingMockData: computed(() => dataSourceStore.isLoadingMockData),
    setDataSource: dataSourceStore.setDataSource,
    toggleDataSource: dataSourceStore.toggleDataSource,
    checkIsAdmin: authStore.checkAdmin,
    clearAdminCache: authStore.clearCache,
    isAdmin: computed(() => authStore.isAdmin),
  }
}

