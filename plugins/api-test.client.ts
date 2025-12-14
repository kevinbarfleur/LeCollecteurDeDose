/**
 * Plugin to test the Data API connection on app startup (client-side only)
 * 
 * This plugin runs once when the app loads and logs the API response
 * to help debug and understand the API structure.
 * 
 * TODO: Remove or disable this plugin in production
 */
export default defineNuxtPlugin(async () => {
  // Only run in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production') {
    return
  }

  // Only test connection in API mode, not test mode or supabase mode
  const { isApiData, isSupabaseData } = useDataSource()
  if (!isApiData.value || isSupabaseData.value) {
    return // Skip test connection in test mode or supabase mode
  }

  const { testConnection } = useApi()

  // Small delay to let the app initialize
  await new Promise(resolve => setTimeout(resolve, 500))

  // Test connection (responses are logged by useApi)
  await testConnection()
})
