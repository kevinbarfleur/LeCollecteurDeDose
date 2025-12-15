/**
 * Admin API: Reload Bot Config
 *
 * Notifies the Twitch bot to reload its configuration from Supabase.
 * Called after saving bot config in admin panel.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Verify user session
  const { user } = await requireUserSession(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify admin status
  const supabase = createClient<Database>(
    config.public.supabase.url,
    config.supabaseServiceKey || config.supabaseKey || ''
  )

  const { data: adminData, error: adminError } = await supabase
    .from('admin_users')
    .select('is_active')
    .eq('twitch_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (adminError || !adminData) {
    throw createError({ statusCode: 403, message: 'Forbidden: Admin access required' })
  }

  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
  const envBotUrl = process.env.BOT_WEBHOOK_URL
  const forceRailway = process.env.BOT_WEBHOOK_URL_FORCE_RAILWAY === 'true'

  const botWebhookUrl = (isDev && !forceRailway)
    ? 'http://127.0.0.1:3001'
    : (envBotUrl || config.public.botWebhookUrl || 'https://lecollecteurdedose-production.up.railway.app')

  const finalBotUrl = (typeof botWebhookUrl === 'string' && botWebhookUrl.startsWith('http'))
    ? botWebhookUrl
    : `https://${botWebhookUrl || 'lecollecteurdedose-production.up.railway.app'}`

  try {
    const webhookEndpoint = `${finalBotUrl}/webhook/reload-config`

    console.log(`[Admin] Reloading bot config via webhook: ${webhookEndpoint}`)

    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000) // 5 seconds timeout
    })

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`
      }

      console.error(`[Admin] Bot reload-config error: ${response.status} - ${errorText}`)

      // Don't fail the request - config was saved, just notify that bot wasn't reloaded
      return {
        ok: true,
        botReloaded: false,
        message: `Config saved but bot reload failed: ${errorText}`
      }
    }

    const result = await response.json()

    return {
      ok: true,
      botReloaded: true,
      config: result.config,
      message: 'Config saved and bot reloaded successfully'
    }
  } catch (error: any) {
    console.error('[Admin] Error reloading bot config:', error.message || error)

    // Don't fail the request - config was saved, just notify that bot wasn't reloaded
    return {
      ok: true,
      botReloaded: false,
      message: `Config saved but bot notification failed: ${error.message}`
    }
  }
})
