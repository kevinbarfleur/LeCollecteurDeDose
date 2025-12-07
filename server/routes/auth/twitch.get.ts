export default defineOAuthTwitchEventHandler({
  config: {
    scope: ['user:read:email'],
  },
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        email: user.email,
        avatar: user.profile_image_url,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/collection')
  },
  onError(event, error) {
    console.error('Twitch OAuth error:', error)
    return sendRedirect(event, '/?error=auth_failed')
  },
})

