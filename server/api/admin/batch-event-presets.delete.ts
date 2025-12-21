/**
 * Admin API: Delete Batch Event Preset
 *
 * Deletes a batch event preset by ID
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { id } = body

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

  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 400, message: 'Preset ID is required' })
  }

  try {
    const { error } = await supabase.from('batch_event_presets').delete().eq('id', id)

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Failed to delete preset: ${error.message}`,
      })
    }

    return {
      ok: true,
      message: `Preset "${id}" supprimé avec succès`,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
    })
  }
})
