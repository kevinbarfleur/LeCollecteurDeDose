import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

/**
 * API endpoint to close a live room
 * Used by sendBeacon for reliable room closure on page unload
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { roomId } = body;

  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: 'roomId is required',
    });
  }

  const config = useRuntimeConfig();
  
  // Use service role key to bypass RLS (since user may be unauthenticated at this point)
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Close the room
  const { error } = await supabase
    .from('live_rooms')
    .update({
      is_active: false,
      closed_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('is_active', true); // Only close if still active

  if (error) {
    console.error('Error closing live room:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to close room',
    });
  }

  return { success: true };
});

