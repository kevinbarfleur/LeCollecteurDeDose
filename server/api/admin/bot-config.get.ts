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
    // Get all config using the function
    const { data: configData, error: configError } = await supabase.rpc('get_all_bot_config')

    if (configError) {
      throw createError({ 
        statusCode: 500, 
        message: `Failed to fetch config: ${configError.message}` 
      })
    }

    // Also get full records with descriptions
    const { data: fullConfig, error: fullError } = await supabase
      .from('bot_config')
      .select('key, value, description, updated_at')
      .order('key')

    if (fullError) {
      // Fallback to just the values if we can't get full records
      return {
        ok: true,
        config: configData || {}
      }
    }

    return {
      ok: true,
      config: configData || {},
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
