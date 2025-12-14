/**
 * Admin Error Logs API Endpoint
 * 
 * Fetches error logs using service role key (bypasses RLS)
 * This ensures logs are accessible even if RLS policies have issues
 * Protected by admin middleware at route level
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  // This endpoint is protected by admin middleware at /admin/* route level
  // We'll use service role key to bypass RLS and fetch all logs

  // Get query parameters
  const query = getQuery(event)
  const level = query.level as string | undefined
  const source = query.source as string | undefined
  const showResolved = query.showResolved === 'true'
  const limit = parseInt(query.limit as string) || 100

  // Use service role key to bypass RLS
  const config = useRuntimeConfig()
  const supabase = createClient<Database>(
    config.supabaseUrl,
    config.supabaseKey // Service role key bypasses RLS
  )

  try {
    let supabaseQuery = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (level) {
      supabaseQuery = supabaseQuery.eq('level', level)
    }
    if (source) {
      supabaseQuery = supabaseQuery.eq('source', source)
    }
    if (!showResolved) {
      supabaseQuery = supabaseQuery.eq('resolved', false)
    }

    const { data, error: fetchError } = await supabaseQuery

    if (fetchError) {
      console.error('[ErrorLogs API] Fetch error:', fetchError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch error logs: ${fetchError.message}`,
      })
    }

    return {
      logs: data || [],
      count: data?.length || 0,
    }
  } catch (err: any) {
    console.error('[ErrorLogs API] Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || 'Failed to fetch error logs',
    })
  }
})
