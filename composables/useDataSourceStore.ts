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

  // Initialize stores if needed
  if (import.meta.client) {
    authStore.initialize()
    dataSourceStore.initialize()
  }

  return {
    dataSource: computed(() => dataSourceStore.source),
    isTestData: computed(() => dataSourceStore.isTestData),
    isApiData: computed(() => dataSourceStore.isApiData),
    isInitializing: computed(() => !dataSourceStore.isInitialized),
    setDataSource: dataSourceStore.setDataSource,
    toggleDataSource: dataSourceStore.toggleDataSource,
    checkIsAdmin: authStore.checkAdmin,
    clearAdminCache: authStore.clearCache,
    isAdmin: computed(() => authStore.isAdmin),
  }
}

