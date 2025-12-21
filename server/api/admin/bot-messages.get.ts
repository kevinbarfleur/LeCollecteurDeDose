/**
 * Admin API: Get Bot Messages
 *
 * Retrieves all customizable bot messages from bot_messages table
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
    // Get query parameters for filtering
    const query = getQuery(event)
    const category = query.category as string | undefined
    const itemKey = query.item_key as string | undefined

    let queryBuilder = supabase
      .from('bot_messages')
      .select('*')
      .order('category')
      .order('item_key')
      .order('message_type')

    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }

    if (itemKey) {
      queryBuilder = queryBuilder.eq('item_key', itemKey)
    }

    const { data: messages, error: messagesError } = await queryBuilder

    if (messagesError) {
      throw createError({
        statusCode: 500,
        message: `Failed to fetch messages: ${messagesError.message}`,
      })
    }

    // Group messages by category and item_key for easier consumption
    const grouped: Record<string, Record<string, Record<string, any>>> = {}

    for (const msg of messages || []) {
      if (!grouped[msg.category]) {
        grouped[msg.category] = {}
      }
      if (!grouped[msg.category][msg.item_key]) {
        grouped[msg.category][msg.item_key] = {}
      }
      grouped[msg.category][msg.item_key][msg.message_type] = {
        id: msg.id,
        messages: msg.messages,
        description: msg.description,
        variables: msg.variables,
        updated_at: msg.updated_at,
      }
    }

    return {
      ok: true,
      messages: messages || [],
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
