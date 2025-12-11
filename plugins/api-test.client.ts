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

  const { testConnection, fetchUserCollections, apiUrl } = useApi()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎴 Le Collecteur de Dose - Data API Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📡 Data API URL: ${apiUrl}`)
  console.log('')

  // Small delay to let the app initialize
  await new Promise(resolve => setTimeout(resolve, 500))

  // Fetch user collections directly
  console.log('[API Test] Fetching /api/userCollection...')
  const collections = await fetchUserCollections()
  
  if (collections) {
    console.log('[API Test] ✓ User Collections Response:')
    console.log(collections)
    
    // Log some stats
    const users = Object.keys(collections)
    console.log(`[API Test] Found ${users.length} user(s):`, users)
    
    // Show structure of first user if available
    if (users.length > 0) {
      const firstUser = users[0]
      console.log(`[API Test] Sample user data for "${firstUser}":`, collections[firstUser])
    }
  } else {
    console.log('[API Test] ✗ Could not fetch user collections')
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Data API Test Complete')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
