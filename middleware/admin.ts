/**
 * Middleware to protect admin routes
 * 
 * Checks if user is logged in AND is an active admin in Supabase
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to admin routes
  if (!to.path.startsWith('/admin')) return

  const { loggedIn, user } = useUserSession()
  const { checkIsAdmin } = useDataSource()

  // Not logged in -> redirect to home
  if (!loggedIn.value || !user.value) {
    return navigateTo('/')
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin(user.value.id)
  
  if (!isAdmin) {
    // Not admin -> redirect to home
    return navigateTo('/')
  }
})

