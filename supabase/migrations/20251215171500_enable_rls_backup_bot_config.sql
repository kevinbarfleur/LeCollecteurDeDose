-- Migration: Enable RLS on backup and bot_config tables
-- These tables were exposed without row-level security

-- ============================================================================
-- BACKUP TABLE - Enable RLS and restrict to service role only
-- ============================================================================

ALTER TABLE backup ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for daily-backup and restore-backup functions)
CREATE POLICY "Service role full access on backup"
ON backup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read backups (for admin dashboard)
CREATE POLICY "Admins can read backups"
ON backup
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.twitch_user_id = (SELECT auth.jwt() ->> 'sub')
    AND admin_users.is_active = true
  )
);

-- ============================================================================
-- BOT_CONFIG TABLE - Enable RLS and restrict access
-- ============================================================================

ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for the Twitch bot)
CREATE POLICY "Service role full access on bot_config"
ON bot_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated admins can read/write bot config
CREATE POLICY "Admins can manage bot_config"
ON bot_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.twitch_user_id = (SELECT auth.jwt() ->> 'sub')
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.twitch_user_id = (SELECT auth.jwt() ->> 'sub')
    AND admin_users.is_active = true
  )
);

-- Anonymous users can read bot config (needed for public status display)
CREATE POLICY "Public can read bot_config"
ON bot_config
FOR SELECT
TO anon
USING (true);
