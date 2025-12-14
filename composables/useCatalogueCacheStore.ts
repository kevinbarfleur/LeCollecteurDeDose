/**
 * Composable wrapper for Catalogue Store
 * 
 * Provides a composable interface that uses the Pinia store
 */

import { useCatalogueStore } from '~/stores/catalogue.store'
import type { Card } from '~/types/card'

export function useCatalogueCache() {
  const catalogueStore = useCatalogueStore()

  const getCachedCatalogue = (): Card[] | null => {
    return catalogueStore.catalogue
  }

  const loadCatalogue = async (forceRefresh: boolean = false): Promise<Card[] | null> => {
    await catalogueStore.fetchCatalogue(forceRefresh)
    return catalogueStore.catalogue
  }

  const clearCache = () => {
    catalogueStore.clearCache()
  }

  return {
    getCachedCatalogue,
    loadCatalogue,
    clearCache,
    hasCache: computed(() => {
      const cat = catalogueStore.catalogue.value
      return cat !== null && cat.length > 0
    }),
    isLoading: computed(() => catalogueStore.isLoading),
    cacheTimestamp: computed(() => catalogueStore.lastFetchTime),
  }
}

