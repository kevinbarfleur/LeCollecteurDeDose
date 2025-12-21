/**
 * Admin API: Get Bot Configuration
 * 
 * Retrieves all bot configuration settings from bot_config table
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

  try {
    // Get all config from bot_config table
    const { data: fullConfig, error: configError } = await supabase
      .from('bot_config')
      .select('key, value, description, updated_at')
      .order('key')

    if (configError) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch config: ${configError.message}`
      })
    }

    // Convert to key-value object for easy consumption
    const config: Record<string, string> = {}
    for (const item of fullConfig || []) {
      config[item.key] = item.value
    }

    return {
      ok: true,
      config,
      fullConfig: fullConfig || []
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({ 
      statusCode: 500, 
      message: error.message || 'Internal server error' 
    })
  }
})
