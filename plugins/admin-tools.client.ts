/**
 * Admin Tools - Console utilities for admin management
 * 
 * Exposes global functions in the browser console to help collect admin information.
 * 
 * Usage in console:
 *   getAdminInfo() - Display current user's admin information for database insertion
 */

export default defineNuxtPlugin(() => {
  // Only expose in browser console
  if (import.meta.client && typeof window !== 'undefined') {
    /**
     * Get admin information for the current logged-in user
     * Displays formatted information ready to be inserted into Supabase admin_users table
     */
    const getAdminInfo = () => {
      const { user, loggedIn } = useUserSession()

      if (!loggedIn.value || !user.value) {
        console.error('❌ Vous devez être connecté pour obtenir vos informations d\'admin.')
        console.log('💡 Connectez-vous d\'abord avec Twitch.')
        return null
      }

      const adminData = {
        twitch_user_id: user.value.id,
        twitch_display_name: user.value.displayName,
        is_active: true, // Default to true
      }

      // Display formatted information
      console.log('%c📋 INFORMATIONS D\'ADMIN', 'color: #9146ff; font-size: 16px; font-weight: bold;')
      console.log('%c─────────────────────────────────────────', 'color: #9146ff;')
      console.log('')
      console.log('%cCopiez ces informations pour les ajouter dans Supabase:', 'color: #c8c8c8; font-weight: bold;')
      console.log('')
      console.log(adminData)
      console.log('')
      console.log('%c📝 Requête SQL à exécuter dans Supabase:', 'color: #00ff00; font-weight: bold;')
      console.log('')
      console.log(
        `INSERT INTO admin_users (twitch_user_id, twitch_display_name, is_active)\n` +
        `VALUES ('${adminData.twitch_user_id}', '${adminData.twitch_display_name}', true)\n` +
        `ON CONFLICT (twitch_user_id) DO UPDATE SET\n` +
        `  twitch_display_name = EXCLUDED.twitch_display_name,\n` +
        `  is_active = EXCLUDED.is_active,\n` +
        `  updated_at = NOW();`
      )
      console.log('')
      console.log('%c📋 JSON pour insertion via l\'interface Supabase:', 'color: #00ff00; font-weight: bold;')
      console.log('')
      console.log(JSON.stringify(adminData, null, 2))
      console.log('')
      console.log('%c─────────────────────────────────────────', 'color: #9146ff;')
      console.log('')

      return adminData
    }

    /**
     * Get admin information formatted as a copy-paste ready SQL INSERT statement
     */
    const getAdminSQL = () => {
      const { user, loggedIn } = useUserSession()

      if (!loggedIn.value || !user.value) {
        console.error('❌ Vous devez être connecté.')
        return null
      }

      const sql = `INSERT INTO admin_users (twitch_user_id, twitch_display_name, is_active)
VALUES ('${user.value.id}', '${user.value.displayName}', true)
ON CONFLICT (twitch_user_id) DO UPDATE SET
  twitch_display_name = EXCLUDED.twitch_display_name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();`

      console.log('%c📝 SQL prêt à copier:', 'color: #00ff00; font-size: 14px; font-weight: bold;')
      console.log('')
      console.log(sql)
      console.log('')
      
      // Try to copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(sql).then(() => {
          console.log('%c✅ SQL copié dans le presse-papier!', 'color: #00ff00;')
        }).catch(() => {
          console.log('%c⚠️ Impossible de copier automatiquement. Copiez manuellement.', 'color: #ffaa00;')
        })
      }

      return sql
    }

    /**
     * Get admin information as JSON (for Supabase dashboard)
     */
    const getAdminJSON = () => {
      const { user, loggedIn } = useUserSession()

      if (!loggedIn.value || !user.value) {
        console.error('❌ Vous devez être connecté.')
        return null
      }

      const json = {
        twitch_user_id: user.value.id,
        twitch_display_name: user.value.displayName,
        is_active: true
      }

      console.log('%c📋 JSON prêt à copier:', 'color: #00ff00; font-size: 14px; font-weight: bold;')
      console.log('')
      console.log(JSON.stringify(json, null, 2))
      console.log('')
      
      // Try to copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(json, null, 2)).then(() => {
          console.log('%c✅ JSON copié dans le presse-papier!', 'color: #00ff00;')
        }).catch(() => {
          console.log('%c⚠️ Impossible de copier automatiquement. Copiez manuellement.', 'color: #ffaa00;')
        })
      }

      return json
    }

    // Expose functions globally
    ;(window as any).getAdminInfo = getAdminInfo
    ;(window as any).getAdminSQL = getAdminSQL
    ;(window as any).getAdminJSON = getAdminJSON

    // Display help message
    console.log('%c🛠️ Outils Admin disponibles:', 'color: #9146ff; font-size: 14px; font-weight: bold;')
    console.log('  • getAdminInfo() - Affiche toutes les informations d\'admin')
    console.log('  • getAdminSQL()  - Génère et copie la requête SQL')
    console.log('  • getAdminJSON() - Génère et copie le JSON pour Supabase')
  }
})

