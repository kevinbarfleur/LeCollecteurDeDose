/**
 * Initialize Pinia stores on client side
 */

export default defineNuxtPlugin(() => {
  // Initialize stores
  const authStore = useAuthStore()
  const dataSourceStore = useDataSourceStore()
  const appSettingsStore = useAppSettingsStore()

  // Initialize stores
  authStore.initialize()
  dataSourceStore.initialize()
  appSettingsStore.initialize()
})

