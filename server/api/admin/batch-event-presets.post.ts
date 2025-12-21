/**
 * Admin API: Create/Update Batch Event Preset
 *
 * Creates or updates a batch event preset
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

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

  // Validate required fields
  const {
    id,
    category,
    display_name,
    emoji,
    description,
    announcement,
    completion_message,
    delay_between_events_ms,
    actions,
    is_enabled,
    sort_order,
  } = body

  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 400, message: 'Preset ID is required' })
  }

  if (!category || typeof category !== 'string') {
    throw createError({ statusCode: 400, message: 'Category is required' })
  }

  if (!display_name || typeof display_name !== 'string') {
    throw createError({ statusCode: 400, message: 'Display name is required' })
  }

  if (!announcement || typeof announcement !== 'string') {
    throw createError({ statusCode: 400, message: 'Announcement message is required' })
  }

  if (!completion_message || typeof completion_message !== 'string') {
    throw createError({ statusCode: 400, message: 'Completion message is required' })
  }

  try {
    const presetData = {
      id,
      category,
      display_name,
      emoji: emoji || '',
      description: description || null,
      announcement,
      completion_message,
      delay_between_events_ms: delay_between_events_ms || 2500,
      actions: actions || [],
      is_enabled: is_enabled !== false, // Default to true
      sort_order: sort_order || 0,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('batch_event_presets')
      .upsert(presetData, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Failed to save preset: ${error.message}`,
      })
    }

    return {
      ok: true,
      preset: data,
      message: `Preset "${display_name}" sauvegardé avec succès`,
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
