/**
 * Composable wrapper for API Store
 * 
 * Provides a composable interface that uses the Pinia store
 * This maintains compatibility with existing code while using the new store architecture
 */

import { useApiStore as useApiStorePinia } from '~/stores/api.store'
import { useDataSourceStore } from '~/stores/dataSource.store'
import * as ApiService from '~/services/api.service'

export function useApi() {
  const apiStore = useApiStorePinia()
  const dataSourceStore = useDataSourceStore()

  // Get API config from store
  const getConfig = () => apiStore.getApiConfig()

  // Wrapper functions that use the service and update store state
  async function fetchUserCollections() {
    apiStore.setLoading(true)
    apiStore.clearError()
    try {
      const config = getConfig()
      const result = await ApiService.fetchUserCollections(config)
      return result
    } catch (error: any) {
      apiStore.setError({
        status: error.status || 500,
        message: error.message || 'Une erreur est survenue',
        code: error.code,
      })
      return null
    } finally {
      apiStore.setLoading(false)
    }
  }

  async function fetchUserCollection(user: string) {
    apiStore.setLoading(true)
    apiStore.clearError()
    try {
      const config = getConfig()
      const result = await ApiService.fetchUserCollection(user, config)
      return result
    } catch (error: any) {
      apiStore.setError({
        status: error.status || 500,
        message: error.message || 'Une erreur est survenue',
        code: error.code,
      })
      return null
    } finally {
      apiStore.setLoading(false)
    }
  }

  async function fetchUserCards(user: string) {
    apiStore.setLoading(true)
    apiStore.clearError()
    try {
      const config = getConfig()
      const result = await ApiService.fetchUserCards(user, config)
      return result
    } catch (error: any) {
      apiStore.setError({
        status: error.status || 500,
        message: error.message || 'Une erreur est survenue',
        code: error.code,
      })
      return null
    } finally {
      apiStore.setLoading(false)
    }
  }

  async function fetchUniques() {
    apiStore.setLoading(true)
    apiStore.clearError()
    try {
      const config = getConfig()
      const result = await ApiService.fetchUniques(config)
      return result
    } catch (error: any) {
      apiStore.setError({
        status: error.status || 500,
        message: error.message || 'Une erreur est survenue',
        code: error.code,
      })
      return null
    } finally {
      apiStore.setLoading(false)
    }
  }

  async function fetchCatalogue() {
    const uniques = await fetchUniques()
    if (!uniques) return null
    return {
      cards: uniques,
      totalCards: uniques.length,
    }
  }

  async function updateUserCollection(username: string, collectionData: Record<string, any>) {
    apiStore.setLoading(true)
    apiStore.clearError()
    try {
      const config = getConfig()
      const result = await ApiService.updateUserCollection(username, collectionData, config)
      return result
    } catch (error: any) {
      apiStore.setError({
        status: error.status || 500,
        message: error.message || 'Une erreur est survenue',
        code: error.code,
      })
      return false
    } finally {
      apiStore.setLoading(false)
    }
  }

  async function updatePlayerCollection(pseudo: string, data: { cards: any[]; vaalOrb?: number }) {
    const collectionData: Record<string, any> = {}
    if (data.vaalOrb !== undefined) {
      collectionData.vaalOrbs = data.vaalOrb
    }
    return await updateUserCollection(pseudo, collectionData)
  }

  async function healthCheck() {
    const result = await fetchUserCollections()
    return result !== null
  }

  async function testConnection() {
    await fetchUserCollections()
  }

  async function fetchRaw<T = any>(endpoint: string) {
    apiStore.setLoading(true)
    apiStore.clearError()
    try {
      const config = getConfig()
      // This would need to be implemented in the service if needed
      return null as T | null
    } catch (error: any) {
      apiStore.setError({
        status: error.status || 500,
        message: error.message || 'Une erreur est survenue',
        code: error.code,
      })
      return null
    } finally {
      apiStore.setLoading(false)
    }
  }

  return {
    // State - wrap in computed to ensure reactivity
    isLoading: computed(() => apiStore.isLoading),
    error: computed(() => apiStore.error),
    apiUrl: computed(() => apiStore.apiUrl),

    // Methods - Read operations
    fetchUserCollections,
    fetchUserCollection,
    fetchUserCards,
    fetchUniques,
    fetchCatalogue,
    healthCheck,
    testConnection,
    fetchRaw,

    // Methods - Write operations
    updateUserCollection,
    updatePlayerCollection,
  }
}

