/**
 * Admin API: Trigger Batch Event
 *
 * Allows admins to trigger batch events (Patch Notes style)
 * that affect all active users with themed events.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

// Valid preset IDs - must match bot's VALID_PRESET_IDS
const VALID_PRESET_IDS = [
  // Buffs
  'bow_meta',
  'caster_supremacy',
  'divine_blessing',
  // Nerfs
  'melee_funeral',
  'harvest_nerf',
  'aura_stacker_rip',
  // Events spéciaux
  'vaal_roulette',
  'mirror_event',
  'heist_gone_wrong',
  'steelmage_rip',
  // League events
  'league_start',
  'league_end_fire_sale',
  'flashback_event',
  // Memes
  'path_of_math_drama',
  'patch_notes',
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { presetId, delayMs, maxUsers } = body

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

  // Validate preset ID
  if (!presetId || typeof presetId !== 'string') {
    throw createError({ statusCode: 400, message: 'presetId is required' })
  }

  if (!VALID_PRESET_IDS.includes(presetId)) {
    throw createError({
      statusCode: 400,
      message: `Invalid presetId. Must be one of: ${VALID_PRESET_IDS.join(', ')}`,
    })
  }

  // Validate delayMs if provided
  const delay = delayMs ? Number(delayMs) : 2500
  if (isNaN(delay) || delay < 1000 || delay > 10000) {
    throw createError({
      statusCode: 400,
      message: 'delayMs must be a number between 1000 and 10000',
    })
  }

  // Validate maxUsers if provided (default 4, max 10)
  const targetUsers = maxUsers ? Math.min(Math.max(1, Number(maxUsers)), 10) : 4

  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
  const envBotUrl = process.env.BOT_WEBHOOK_URL
  const forceRailway = process.env.BOT_WEBHOOK_URL_FORCE_RAILWAY === 'true'

  const botWebhookUrl =
    isDev && !forceRailway
      ? 'http://127.0.0.1:3001'
      : envBotUrl || config.public.botWebhookUrl || 'https://lecollecteurdedose-production.up.railway.app'

  const finalBotUrl =
    typeof botWebhookUrl === 'string' && botWebhookUrl.startsWith('http')
      ? botWebhookUrl
      : `https://${botWebhookUrl || 'lecollecteurdedose-production.up.railway.app'}`

  try {
    const webhookEndpoint = `${finalBotUrl}/webhook/batch-event`

    console.log(`[Admin] Triggering batch event: ${presetId} with delay ${delay}ms`)

    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        presetId,
        delayMs: delay,
        maxUsers: targetUsers,
      }),
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    })

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`
      }

      console.error(`[Admin] Bot webhook error: ${response.status} - ${errorText}`)

      if (response.status === 404) {
        const helpMessage = isDev
          ? `Bot service endpoint not found (404). URL appelée: ${webhookEndpoint}. Vérifiez que le bot écoute bien sur le port 3001 et que l'endpoint /webhook/batch-event existe.`
          : `Bot service endpoint not found. Vérifiez que le bot Railway est déployé et accessible à l'adresse: ${finalBotUrl}`
        throw createError({
          statusCode: 503,
          message: helpMessage,
        })
      }

      throw createError({
        statusCode: response.status || 500,
        message: `Bot service error (${response.status}): ${errorText}`,
      })
    }

    const result = await response.json()

    return {
      ok: true,
      presetId,
      delayMs: delay,
      result,
      message: result.message || `Batch event "${presetId}" started successfully`,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 504,
        message: `Timeout lors de l'appel au bot. Vérifiez que le bot est accessible à: ${botWebhookUrl}`,
      })
    }

    // Handle network errors
    if (
      error.message?.includes('fetch') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ENOTFOUND')
    ) {
      const helpMessage = isDev
        ? `Bot service unavailable. Impossible de joindre le bot à l'adresse: ${botWebhookUrl}. Pour le développement local, démarrez le bot avec: cd twitch-bot && deno task start`
        : `Bot service unavailable. Impossible de joindre le bot à l'adresse: ${botWebhookUrl}. Vérifiez que le bot Railway est déployé et accessible.`
      throw createError({
        statusCode: 503,
        message: helpMessage,
      })
    }

    console.error('[Admin] Error triggering batch event:', error.message || error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
    })
  }
})
