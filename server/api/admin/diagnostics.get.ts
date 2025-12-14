/**
 * Admin Diagnostics API Endpoint
 * 
 * Fetches diagnostic logs using service role key (bypasses RLS)
 * This ensures diagnostics are accessible even if RLS policies have issues
 * Protected by admin middleware at route level
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  // This endpoint is protected by admin middleware at /admin/* route level
  // We'll use service role key to bypass RLS and fetch all diagnostics

  // Get query parameters
  const query = getQuery(event)
  const category = query.category as string | undefined
  const actionType = query.action_type as string | undefined
  const validationStatus = query.validation_status as string | undefined
  const userId = query.user_id as string | undefined
  const username = query.username as string | undefined
  const startDate = query.startDate as string | undefined
  const limit = parseInt(query.limit as string) || 100
  
  // Default to 3 days ago if no startDate provided
  let actualStartDate = startDate
  if (!actualStartDate) {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(0, 0, 0, 0)
    actualStartDate = threeDaysAgo.toISOString()
  }

  // Use service role key to bypass RLS
  const config = useRuntimeConfig()
  const supabase = createClient<Database>(
    config.supabaseUrl,
    config.supabaseServiceRoleKey || config.supabaseKey // Service role key bypasses RLS
  )

  try {
    let supabaseQuery = supabase
      .from('diagnostic_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category)
    }
    if (actionType) {
      supabaseQuery = supabaseQuery.eq('action_type', actionType)
    }
    if (validationStatus) {
      supabaseQuery = supabaseQuery.eq('validation_status', validationStatus)
    }
    if (userId) {
      supabaseQuery = supabaseQuery.eq('user_id', userId)
    }
    if (username) {
      supabaseQuery = supabaseQuery.ilike('username', `%${username}%`)
    }
    if (actualStartDate) {
      supabaseQuery = supabaseQuery.gte('created_at', actualStartDate)
    }

    const { data, error: fetchError } = await supabaseQuery

    if (fetchError) {
      console.error('[Diagnostics API] Fetch error:', fetchError)
      
      // Check if table doesn't exist
      if (fetchError.message?.includes('Could not find the table') || fetchError.message?.includes('diagnostic_logs')) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to fetch diagnostics: Could not find the table 'public.diagnostic_logs' in the schema cache`,
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch diagnostics: ${fetchError.message}`,
      })
    }

    return {
      diagnostics: data || [],
      count: data?.length || 0,
    }
  } catch (err: any) {
    console.error('[Diagnostics API] Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || 'Failed to fetch diagnostics',
    })
  }
})
