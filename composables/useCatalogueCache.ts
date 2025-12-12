/**
 * Composable to cache catalogue data (uniques) across page navigations
 * 
 * The catalogue data is cached in memory and only reloaded on page refresh.
 * This prevents the catalogue from changing when navigating between pages.
 */

import type { Card } from '~/types/card'
import { transformUniquesToCards } from '~/utils/dataTransform'

// Shared cache state (persists across component instances)
const cachedUniques = ref<Card[] | null>(null)
const cacheTimestamp = ref<number | null>(null)
const isCaching = ref(false)

export function useCatalogueCache() {
  const { fetchUniques } = useApi()

  /**
   * Get cached catalogue data
   * Returns null if cache is empty or invalid
   */
  const getCachedCatalogue = (): Card[] | null => {
    return cachedUniques.value
  }

  /**
   * Check if cache exists
   */
  const hasCache = computed(() => cachedUniques.value !== null && cachedUniques.value.length > 0)

  /**
   * Load catalogue data (from cache if available, otherwise fetch)
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  const loadCatalogue = async (forceRefresh: boolean = false): Promise<Card[] | null> => {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && cachedUniques.value !== null) {
      return cachedUniques.value
    }

    // Prevent concurrent fetches
    if (isCaching.value) {
      // Wait for ongoing fetch to complete
      return new Promise((resolve) => {
        const unwatch = watch(isCaching, (loading) => {
          if (!loading) {
            unwatch()
            resolve(cachedUniques.value)
          }
        })
      })
    }

    isCaching.value = true

    try {
      const uniques = await fetchUniques()
      
      if (uniques) {
        const cards = transformUniquesToCards(uniques)
        cachedUniques.value = cards
        cacheTimestamp.value = Date.now()
        return cards
      }
      
      return null
    } catch (error) {
      console.error('[CatalogueCache] Error loading catalogue:', error)
      return cachedUniques.value // Return existing cache on error
    } finally {
      isCaching.value = false
    }
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  const clearCache = () => {
    cachedUniques.value = null
    cacheTimestamp.value = null
  }

  /**
   * Check if cache is currently being loaded
   */
  const isLoading = computed(() => isCaching.value)

  return {
    getCachedCatalogue,
    loadCatalogue,
    clearCache,
    hasCache,
    isLoading,
    cacheTimestamp: computed(() => cacheTimestamp.value),
  }
}

