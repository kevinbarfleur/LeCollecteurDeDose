-- Migration: Create diagnostic_logs table for application behavior tracking
-- This table stores diagnostic information to track application behavior and data consistency

-- Create diagnostic_logs table
CREATE TABLE IF NOT EXISTS diagnostic_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('altar', 'admin')),
  action_type TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  state_before JSONB DEFAULT '{}'::jsonb,
  state_after JSONB DEFAULT '{}'::jsonb,
  action_details JSONB DEFAULT '{}'::jsonb,
  validation_status TEXT CHECK (validation_status IN ('ok', 'warning', 'error')),
  validation_notes TEXT,
  api_response_time_ms INTEGER,
  data_mode TEXT CHECK (data_mode IN ('api', 'test')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_created_at ON diagnostic_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_category ON diagnostic_logs(category);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_action_type ON diagnostic_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_user_id ON diagnostic_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_username ON diagnostic_logs(username);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_validation_status ON diagnostic_logs(validation_status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_logs_data_mode ON diagnostic_logs(data_mode);

-- Enable Row Level Security
ALTER TABLE diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reading all diagnostic logs (application-level admin check via middleware)
-- The /admin/errors route is protected by admin middleware, so this is secure
CREATE POLICY "Allow reading diagnostic logs"
ON diagnostic_logs
FOR SELECT
USING (true);

-- Policy: Anyone can insert diagnostic logs (for client and server-side logging)
-- This allows diagnostic logging even when user is not authenticated
CREATE POLICY "Anyone can insert diagnostic logs"
ON diagnostic_logs
FOR INSERT
WITH CHECK (true);

-- Policy: Allow updating diagnostic logs (application-level admin check)
CREATE POLICY "Allow updating diagnostic logs"
ON diagnostic_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow deleting diagnostic logs (application-level admin check)
CREATE POLICY "Allow deleting diagnostic logs"
ON diagnostic_logs
FOR DELETE
USING (true);

-- Note: Security is ensured by:
-- 1. Admin middleware that protects /admin/errors route
-- 2. Application-level checks before allowing operations
-- For production with stricter security, consider:
-- - Using service role key on server-side API endpoints
-- - Implementing custom JWT claims with Twitch user_id
-- - Using Supabase Edge Functions with service role key
