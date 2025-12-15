/**
 * Composable for managing maintenance mode
 * 
 * Provides reactive state and actions for maintenance mode toggle
 * Uses app_settings table with key 'maintenance_mode'
 */

import { useAppSettingsStore } from '~/stores/appSettings.store'
import { useDataSourceStore } from '~/stores/dataSource.store'
import { logAdminAction } from '~/services/diagnosticLogger.service'

const maintenanceModeEnabled = ref(false)
const isLoading = ref(false)

export function useMaintenanceMode() {
  const appSettingsStore = useAppSettingsStore()
  const dataSourceStore = useDataSourceStore()

  /**
   * Fetch maintenance mode setting from app_settings
   */
  const fetchMaintenanceMode = async (): Promise<void> => {
    isLoading.value = true
    try {
      const supabase = useSupabaseClient()
      const currentDataMode = dataSourceStore.isMockData ? 'test' : 'api'
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .eq('data_mode', currentDataMode)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching maintenance mode:', error)
        return
      }

      if (data) {
        const value = data.value as { enabled?: boolean }
        maintenanceModeEnabled.value = value?.enabled ?? false
      } else {
        maintenanceModeEnabled.value = false
      }
    } catch (error) {
      console.error('Error fetching maintenance mode:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Toggle maintenance mode on/off
   */
  const toggleMaintenanceMode = async (userId: string): Promise<void> => {
    if (isLoading.value) return

    isLoading.value = true
    try {
      const currentDataMode = dataSourceStore.isMockData ? 'test' : 'api'
      const currentValue = maintenanceModeEnabled.value
      const newValue = !currentValue

      // Log diagnostic before updating
      if (import.meta.client) {
        await logAdminAction(
          'toggle_maintenance_mode',
          { maintenance_mode: currentValue, data_source: currentDataMode },
          { maintenance_mode: newValue, data_source: currentDataMode },
          { data_mode: currentDataMode }
        )
      }

      // Update setting via store
      await appSettingsStore.updateSetting(
        'maintenance_mode',
        { enabled: newValue },
        userId,
        currentDataMode
      )

      // Update local state immediately
      maintenanceModeEnabled.value = newValue
    } catch (error) {
      console.error('Error toggling maintenance mode:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Subscribe to maintenance mode changes via Realtime
   */
  const subscribeToMaintenanceMode = (): void => {
    const supabase = useSupabaseClient()
    const currentDataMode = dataSourceStore.isMockData ? 'test' : 'api'

    const channel = supabase
      .channel('maintenance-mode-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: `key=eq.maintenance_mode`,
        },
        (payload) => {
          // Only update if the data_mode matches
          if (payload.new && (payload.new as any).data_mode === currentDataMode) {
            const value = (payload.new as any).value as { enabled?: boolean }
            maintenanceModeEnabled.value = value?.enabled ?? false
          }
        }
      )
      .subscribe()

    // Cleanup on unmount
    if (import.meta.client) {
      onBeforeUnmount(() => {
        supabase.removeChannel(channel)
      })
    }
  }

  // Initialize on client
  if (import.meta.client) {
    fetchMaintenanceMode()
    subscribeToMaintenanceMode()
  }

  return {
    isMaintenanceMode: computed(() => maintenanceModeEnabled.value),
    isLoading: computed(() => isLoading.value),
    toggleMaintenanceMode,
    fetchMaintenanceMode,
  }
}
