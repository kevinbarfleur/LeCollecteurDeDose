/**
 * Admin Tools - Hidden console utility for admin management
 * 
 * Hidden function to collect user information for admin database insertion.
 * Usage: getUserInfo() in console
 */

export default defineNuxtPlugin(() => {
  // Only expose in browser console
  if (import.meta.client && typeof window !== 'undefined') {
    /**
     * Get user information for admin database insertion
     * Returns simple object with twitch_user_id, twitch_display_name, and is_active
     */
    const getUserInfo = () => {
      const { user, loggedIn } = useUserSession()

      if (!loggedIn.value || !user.value) {
        return null
      }

      const userInfo = {
        twitch_user_id: user.value.id,
        twitch_display_name: user.value.displayName,
        is_active: true
      }

      // Simple output, no fancy formatting
      console.log(userInfo)

      return userInfo
    }

    // Expose function globally (hidden, no help message)
    ;(window as any).getUserInfo = getUserInfo
  }
})

