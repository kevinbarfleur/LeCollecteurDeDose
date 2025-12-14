/**
 * Catalogue Store
 * 
 * Manages the global card catalogue cache
 * Catalogue data is cached in memory and only reloaded on page refresh or explicit refresh
 */

import { defineStore } from 'pinia'
import type { Card } from '~/types/card'
import { transformUniquesToCards } from '~/utils/dataTransform'
import * as ApiService from '~/services/api.service'
import { useApiStore } from './api.store'

export const useCatalogueStore = defineStore('catalogue', () => {
  // State
  const catalogue = ref<Card[] | null>(null)
  const lastFetchTime = ref<number | null>(null)
  const isLoading = ref(false)
  const cacheExpiry = ref(60 * 60 * 1000) // 1 hour default

  // Get API store
  const apiStore = useApiStore()

  // Getters
  const isCacheValid = computed(() => {
    if (!lastFetchTime.value || !catalogue.value) return false
    const timeSinceFetch = Date.now() - lastFetchTime.value
    return timeSinceFetch < cacheExpiry.value
  })

  const catalogueCount = computed(() => catalogue.value?.length || 0)

  // Actions
  async function fetchCatalogue(force: boolean = false): Promise<void> {
    // Return cached data if valid and not forcing refresh
    if (!force && isCacheValid.value && catalogue.value) {
      return
    }

    // Prevent concurrent fetches
    if (isLoading.value) {
      return
    }

    isLoading.value = true
    apiStore.setLoading(true)

    try {
      const config = apiStore.getApiConfig()
      const uniques = await ApiService.fetchUniques(config)

      if (uniques) {
        const cards = transformUniquesToCards(uniques)
        catalogue.value = cards
        lastFetchTime.value = Date.now()
      }
    } catch (error) {
      console.error('[CatalogueStore] Error loading catalogue:', error)
      apiStore.setError({
        status: 500,
        message: 'Failed to load catalogue',
      })
    } finally {
      isLoading.value = false
      apiStore.setLoading(false)
    }
  }

  function clearCache(): void {
    catalogue.value = null
    lastFetchTime.value = null
  }

  function setCacheExpiry(expiryMs: number): void {
    cacheExpiry.value = expiryMs
  }

  return {
    // State - expose as computed for reactivity
    catalogue: computed(() => catalogue.value),
    isLoading: computed(() => isLoading.value),
    lastFetchTime: computed(() => lastFetchTime.value),

    // Getters
    isCacheValid,
    catalogueCount,

    // Actions
    fetchCatalogue,
    clearCache,
    setCacheExpiry,
  }
})

