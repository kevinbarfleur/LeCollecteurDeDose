/**
 * Admin API: Update Bot Message
 *
 * Updates a bot message in bot_messages table
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { id, messages, description } = body

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
    throw createError({ statusCode: 400, message: 'Message ID is required' })
  }

  if (!messages || !Array.isArray(messages)) {
    throw createError({ statusCode: 400, message: 'Messages array is required' })
  }

  // Validate messages are non-empty strings
  if (messages.length === 0) {
    throw createError({ statusCode: 400, message: 'At least one message is required' })
  }

  for (const msg of messages) {
    if (typeof msg !== 'string' || msg.trim() === '') {
      throw createError({ statusCode: 400, message: 'All messages must be non-empty strings' })
    }
  }

  try {
    // Update the message
    const updateData: any = {
      messages,
      updated_at: new Date().toISOString(),
    }

    if (description !== undefined) {
      updateData.description = description
    }

    const { data, error } = await supabase
      .from('bot_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Failed to update message: ${error.message}`,
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        message: `Message not found: ${id}`,
      })
    }

    return {
      ok: true,
      message: data,
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
