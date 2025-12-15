/**
 * Admin API: Update Bot Configuration
 * 
 * Updates bot configuration settings in bot_config table
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { key, value, description } = body

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

  if (!key || typeof key !== 'string') {
    throw createError({ statusCode: 400, message: 'Key is required' })
  }

  if (value === undefined || value === null) {
    throw createError({ statusCode: 400, message: 'Value is required' })
  }

  try {
    // Update config using the function
    const { data, error } = await supabase.rpc('set_bot_config', {
      p_key: key,
      p_value: String(value),
      p_description: description || null
    })

    if (error) {
      throw createError({ 
        statusCode: 500, 
        message: `Failed to update config: ${error.message}` 
      })
    }

    return {
      ok: true,
      key,
      value: String(value),
      message: `Configuration ${key} mise à jour avec succès`
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
