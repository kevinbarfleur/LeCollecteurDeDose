/**
 * Admin API: Get Batch Event Presets
 *
 * Retrieves all batch event presets from batch_event_presets table
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
    // Get all presets ordered by category and sort_order
    const { data: presets, error: presetsError } = await supabase
      .from('batch_event_presets')
      .select('*')
      .order('category')
      .order('sort_order')

    if (presetsError) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch presets: ${presetsError.message}`,
      })
    }

    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('batch_event_categories')
      .select('*')
      .order('sort_order')

    if (categoriesError) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch categories: ${categoriesError.message}`,
      })
    }

    // Group presets by category
    const grouped: Record<string, any[]> = {}
    for (const preset of presets || []) {
      if (!grouped[preset.category]) {
        grouped[preset.category] = []
      }
      grouped[preset.category].push(preset)
    }

    return {
      ok: true,
      presets: presets || [],
      categories: categories || [],
      grouped,
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
