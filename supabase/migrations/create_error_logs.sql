-- Migration: Create error_logs table for error tracking and debugging
-- This table stores errors from both client and server for admin debugging

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info')),
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  user_id TEXT,
  username TEXT,
  source TEXT NOT NULL CHECK (source IN ('client', 'server')),
  endpoint TEXT,
  status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_username ON error_logs(username);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read error logs
CREATE POLICY "Only admins can read error logs"
ON error_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.twitch_user_id = auth.uid()::text
      AND admin_users.is_active = true
  )
);

-- Policy: Anyone can insert error logs (for client-side logging)
-- This allows error logging even when user is not authenticated
CREATE POLICY "Anyone can insert error logs"
ON error_logs
FOR INSERT
WITH CHECK (true);

-- Policy: Only admins can update error logs (for marking as resolved)
CREATE POLICY "Only admins can update error logs"
ON error_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.twitch_user_id = auth.uid()::text
      AND admin_users.is_active = true
  )
);

-- Policy: Only admins can delete error logs
CREATE POLICY "Only admins can delete error logs"
ON error_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.twitch_user_id = auth.uid()::text
      AND admin_users.is_active = true
  )
);

-- Function to mark error as resolved
CREATE OR REPLACE FUNCTION mark_error_resolved(
  error_id UUID,
  resolved_by_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.twitch_user_id = resolved_by_user_id 
      AND admin_users.is_active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can mark errors as resolved';
  END IF;

  -- Update the error log
  UPDATE error_logs
  SET 
    resolved = true,
    resolved_at = NOW(),
    resolved_by = resolved_by_user_id
  WHERE id = error_id;

  RETURN FOUND;
END;
$$;
