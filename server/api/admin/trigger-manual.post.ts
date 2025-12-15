/**
 * Admin API: Trigger Manual Trigger
 * 
 * Allows admins to manually trigger any automatic trigger event
 * for testing or special events. Bypasses cooldowns and selects
 * randomly from all tracked users.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

// Valid trigger types
const VALID_TRIGGER_TYPES = [
  'blessingRNGesus',
  'cartographersGift',
  'mirrorTier',
  'einharApproved',
  'heistTax',
  'sirusVoice',
  'alchMisclick',
  'tradeScam',
  'chrisVision',
  'atlasInfluence'
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { triggerType } = body

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

  // Validate trigger type
  if (!triggerType || typeof triggerType !== 'string') {
    throw createError({ statusCode: 400, message: 'triggerType is required' })
  }

  if (!VALID_TRIGGER_TYPES.includes(triggerType)) {
    throw createError({ 
      statusCode: 400, 
      message: `Invalid triggerType. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}` 
    })
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
    const webhookUrl = finalBotUrl
    const healthCheckUrl = `${webhookUrl}/health`
    
    try {
      const healthResponse = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      
      if (!healthResponse.ok) {
        const healthText = await healthResponse.text().catch(() => '')
        throw new Error(`Bot health check failed: ${healthResponse.status} - ${healthText}`)
      }
    } catch (healthError: any) {
      
      // Check if it's a connection refused error (bot not running)
      const isConnectionRefused = healthError.message?.includes('ECONNREFUSED') || 
                                   healthError.message?.includes('fetch failed') ||
                                   healthError.cause?.code === 'ECONNREFUSED'
      
      const errorMsg = isDev && isConnectionRefused
        ? `Bot non démarré. Démarrez le bot dans un terminal séparé avec: cd twitch-bot && deno task start`
        : isDev
        ? `Bot non disponible. Démarrez le bot avec: cd twitch-bot && deno task start. Erreur: ${healthError.message}`
        : `Bot service unavailable. Vérifiez que le bot Railway est déployé. Erreur: ${healthError.message}`
      throw createError({ 
        statusCode: 503, 
        message: errorMsg
      })
    }
    
    const webhookEndpoint = `${webhookUrl}/webhook/trigger-manual`
    
    console.log(`[Admin] Calling bot webhook: ${webhookEndpoint}`)
    
    // Call bot webhook to trigger the manual trigger
    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        triggerType,
        isManual: true
      }),
      // Add timeout to avoid hanging
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    })

    if (!response.ok) {
      let errorText = 'Unknown error'
      try {
        errorText = await response.text()
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`
      }
      
      console.error(`[Admin] Bot webhook error: ${response.status} - ${errorText}`)
      
      // Provide more helpful error messages
      if (response.status === 404) {
        const helpMessage = isDev 
          ? `Bot service endpoint not found (404). URL appelée: ${webhookEndpoint}. Vérifiez que le bot écoute bien sur le port 3001 et que l'endpoint /webhook/trigger-manual existe.`
          : `Bot service endpoint not found. Vérifiez que le bot Railway est déployé et accessible à l'adresse: ${webhookUrl}`
        throw createError({ 
          statusCode: 503, 
          message: helpMessage
        })
      }
      
      throw createError({ 
        statusCode: response.status || 500, 
        message: `Bot service error (${response.status}): ${errorText}` 
      })
    }

    const result = await response.json()

    // Handle both success and failure cases (both return 200 with success flag)
    if (result.success === false) {
      return {
        ok: false,
        triggerType,
        result,
        message: result.message || `Trigger ${triggerType} failed`
      }
    }

    return {
      ok: true,
      triggerType,
      result,
      message: result.message || `Trigger ${triggerType} executed successfully`
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    
    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      throw createError({ 
        statusCode: 504, 
        message: `Timeout lors de l'appel au bot. Vérifiez que le bot est accessible à: ${botWebhookUrl}` 
      })
    }
    
    // Handle network errors
    if (error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      const helpMessage = isDev 
        ? `Bot service unavailable. Impossible de joindre le bot à l'adresse: ${botWebhookUrl}. Pour le développement local, démarrez le bot avec: cd twitch-bot && deno task start`
        : `Bot service unavailable. Impossible de joindre le bot à l'adresse: ${botWebhookUrl}. Vérifiez que le bot Railway est déployé et accessible.`
      throw createError({ 
        statusCode: 503, 
        message: helpMessage
      })
    }
    
    console.error('[Admin] Error triggering manual trigger:', error.message || error)
    throw createError({ 
      statusCode: 500, 
      message: error.message || 'Internal server error' 
    })
  }
})
