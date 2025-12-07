export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  // Protect collection page
  if (to.path === '/collection' && !loggedIn.value) {
    return navigateTo('/')
  }
})

