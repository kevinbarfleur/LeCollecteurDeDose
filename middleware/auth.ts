export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  // Protected pages that require authentication
  const protectedPaths = ['/collection', '/ladder']

  if (protectedPaths.includes(to.path) && !loggedIn.value) {
    return navigateTo('/')
  }
})

