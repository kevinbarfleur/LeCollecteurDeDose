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

  // Get bot webhook URL from environment or config
  const botWebhookUrl = config.public.botWebhookUrl || process.env.BOT_WEBHOOK_URL
  
  if (!botWebhookUrl) {
    throw createError({ 
      statusCode: 500, 
      message: 'Bot webhook URL not configured. Please set BOT_WEBHOOK_URL environment variable.' 
    })
  }

  try {
    // Ensure URL has protocol
    const webhookUrl = botWebhookUrl.startsWith('http') 
      ? botWebhookUrl 
      : `https://${botWebhookUrl}`
    
    // Call bot webhook to trigger the manual trigger
    const response = await fetch(`${webhookUrl}/webhook/trigger-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        triggerType,
        isManual: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw createError({ 
        statusCode: response.status || 500, 
        message: `Bot service error: ${errorText || 'Unknown error'}` 
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
    
    // Handle network errors
    if (error.message?.includes('fetch')) {
      throw createError({ 
        statusCode: 503, 
        message: 'Bot service unavailable. Please check if the bot is running.' 
      })
    }
    
    throw createError({ 
      statusCode: 500, 
      message: error.message || 'Internal server error' 
    })
  }
})
