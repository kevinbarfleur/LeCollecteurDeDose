/**
 * Supabase Service
 * 
 * Handles all Supabase-specific operations:
 * - Admin status checks
 * - App settings CRUD
 * - Realtime subscriptions
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface AdminCacheEntry {
  isAdmin: boolean
  expiresAt: number
}

// Module-level cache for admin status
const adminCache = new Map<string, AdminCacheEntry>()

/**
 * Check if a user is an active admin by their Twitch user ID
 */
export async function checkAdminStatus(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false

  // Check cache first
  const cached = adminCache.get(userId)
  const now = Date.now()
  
  if (cached && cached.expiresAt > now) {
    return cached.isAdmin
  }

  // Query Supabase for active admin
  const supabase = useSupabaseClient<Database>()
  const { data, error } = await supabase
    .from('admin_users')
    .select('is_active')
    .eq('twitch_user_id', userId)
    .eq('is_active', true)
    .single()

  const isAdmin = !error && data?.is_active === true

  // Update cache
  adminCache.set(userId, {
    isAdmin,
    expiresAt: now + CACHE_DURATION
  })

  return isAdmin
}

/**
 * Clear the admin cache
 */
export function clearAdminCache(): void {
  adminCache.clear()
}

/**
 * Clear cache for a specific user
 */
export function clearAdminCacheForUser(userId: string): void {
  adminCache.delete(userId)
}

/**
 * Fetch all app settings from Supabase
 */
export async function fetchAppSettings(): Promise<Array<{
  key: string
  value: unknown
  data_mode: string
}>> {
  const supabase = useSupabaseClient<Database>()
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, data_mode')

  if (error) {
    console.error('[SupabaseService] Error fetching app settings:', error)
    throw error
  }

  return data || []
}

/**
 * Update an app setting in Supabase (admin only - uses PostgreSQL function)
 */
export async function updateAppSetting(
  key: string,
  value: unknown,
  userId: string,
  dataMode: 'api' | 'test' = 'api'
): Promise<{
  key: string
  value: unknown
  updated_at: string
  updated_by: string | null
}> {
  const supabase = useSupabaseClient<Database>()

  const { data, error } = await supabase.rpc('update_app_setting', {
    setting_key: key,
    setting_value: value as any, // Cast to any to avoid type issues with Json type
    twitch_user_id: userId,
    setting_data_mode: dataMode
  })

  if (error) {
    console.error('[SupabaseService] Failed to update app setting:', error)
    throw error
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('No data returned from update_app_setting')
  }

  const result = Array.isArray(data) ? data[0] : data
  return {
    key: result.key,
    value: result.value,
    updated_at: result.updated_at,
    updated_by: result.updated_by,
  }
}

/**
 * Subscribe to app settings changes via Supabase Realtime
 */
export function subscribeToAppSettings(
  callback: (payload: {
    key: string
    value: unknown
    data_mode: string
  }) => void
): RealtimeChannel {
  const supabase = useSupabaseClient<Database>()

  const channel = supabase
    .channel('app_settings_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'app_settings',
      },
      (payload: any) => {
        if (payload.new) {
          const newData = payload.new as Record<string, any>
          callback({
            key: newData.key as string,
            value: newData.value,
            data_mode: (newData.data_mode as string) || 'api'
          })
        }
      }
    )
    .subscribe()

  return channel
}

