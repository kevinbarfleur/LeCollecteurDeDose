/**
 * Plugin to test the API connection on app startup (client-side only)
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

  const { testConnection, fetchRaw, apiUrl } = useApi()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎴 Le Collecteur de Dose - API Service Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📡 API URL: ${apiUrl}`)
  console.log('')

  // Small delay to let the app initialize
  await new Promise(resolve => setTimeout(resolve, 500))

  // First, try to hit the root endpoint to see what's available
  console.log('[API Test] Fetching root endpoint...')
  const rootResponse = await fetchRaw('/')
  
  if (rootResponse) {
    console.log('[API Test] Root response:', rootResponse)
  }

  // Then run the full connection test
  await testConnection()

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ API Service Test Complete')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
