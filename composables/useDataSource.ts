/**
 * Composable wrapper for Data Source Store
 * 
 * Provides a composable interface that uses the Pinia store
 */

import { useDataSourceStore as useDataSourceStorePinia } from '~/stores/dataSource.store'

export function useDataSource() {
  const store = useDataSourceStorePinia()

  return {
    dataSource: computed(() => store.source),
    isInitializing: computed(() => !store.isInitialized),
    isLoadingMockData: computed(() => store.isLoadingMockData),
    isMockData: computed(() => store.isMockData),
    isSupabaseData: computed(() => store.isSupabaseData),
    apiUrl: computed(() => store.apiUrl),
    setDataSource: store.setDataSource,
    toggleDataSource: store.toggleDataSource,
    initialize: store.initialize,
  }
}
