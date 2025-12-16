/**
 * Admin API: Reset Daily Limits
 *
 * Allows admins to reset all daily limits for all users.
 * Also sends a message in Twitch chat to announce the reset.
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

  // Reset all daily limits in the database
  const { data: resetResult, error: resetError } = await supabase.rpc('reset_all_daily_limits')

  if (resetError) {
    console.error('[Admin] Error resetting daily limits:', resetError)
    throw createError({
      statusCode: 500,
      message: `Failed to reset daily limits: ${resetError.message}`
    })
  }

  // Now notify the bot to send the announcement message
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
  const envBotUrl = process.env.BOT_WEBHOOK_URL
  const forceRailway = process.env.BOT_WEBHOOK_URL_FORCE_RAILWAY === 'true'

  const botWebhookUrl = (isDev && !forceRailway)
    ? 'http://127.0.0.1:3001'
    : (envBotUrl || config.public.botWebhookUrl || 'https://lecollecteurdedose-production.up.railway.app')

  const finalBotUrl = (typeof botWebhookUrl === 'string' && botWebhookUrl.startsWith('http'))
    ? botWebhookUrl
    : `https://${botWebhookUrl || 'lecollecteurdedose-production.up.railway.app'}`

  let messageResult = null
  let messageError = null

  try {
    const webhookUrl = finalBotUrl
    const webhookEndpoint = `${webhookUrl}/webhook/daily-reset-announcement`

    console.log(`[Admin] Calling bot webhook for reset announcement: ${webhookEndpoint}`)

    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resetCount: resetResult?.reset_count || 0
      }),
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      messageResult = await response.json()
    } else {
      const errorText = await response.text().catch(() => 'Unknown error')
      messageError = `Bot responded with ${response.status}: ${errorText}`
      console.warn('[Admin] Bot message failed but reset succeeded:', messageError)
    }
  } catch (error: any) {
    messageError = error.message || 'Failed to contact bot'
    console.warn('[Admin] Could not send announcement (bot may be offline):', messageError)
  }

  return {
    ok: true,
    resetCount: resetResult?.reset_count || 0,
    message: `Daily limits reset for ${resetResult?.reset_count || 0} records`,
    announcement: messageResult ? 'sent' : 'failed',
    announcementError: messageError
  }
})
