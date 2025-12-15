import { createClient } from '@supabase/supabase-js'

export default defineOAuthTwitchEventHandler({
  config: {
    scope: ['user:read:email'],
  },
  async onSuccess(event, { user, tokens }) {
    // Link OAuth user with existing bot-created user (if any)
    try {
      const config = useRuntimeConfig()
      const supabase = createClient(
        config.public.supabaseUrl,
        config.supabaseServiceKey
      )

      await supabase.rpc('link_oauth_user', {
        p_twitch_user_id: user.id,
        p_twitch_username: user.login,
        p_display_name: user.display_name
      })
    } catch (error) {
      console.error('Failed to link OAuth user:', error)
      // Don't fail the login if linking fails
    }

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

