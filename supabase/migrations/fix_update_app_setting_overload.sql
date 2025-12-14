-- Fix: Remove old update_app_setting function to resolve overload ambiguity
-- This migration drops the old 3-parameter version and keeps only the 4-parameter version
-- Also fixes ALL ambiguous column references using local variables

-- Drop old function versions first
DROP FUNCTION IF EXISTS update_app_setting(TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS update_app_setting(TEXT, JSONB, TEXT, TEXT);

-- Create the corrected function with all parameters properly qualified using local variables
CREATE OR REPLACE FUNCTION update_app_setting(
  setting_key TEXT,
  setting_value JSONB,
  twitch_user_id TEXT,
  setting_data_mode TEXT DEFAULT 'api'
)
RETURNS TABLE (
  key TEXT,
  value JSONB,
  updated_at TIMESTAMPTZ,
  updated_by TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
  param_key TEXT := setting_key;
  param_value JSONB := setting_value;
  param_user_id TEXT := twitch_user_id;
  param_data_mode TEXT := setting_data_mode;
BEGIN
  -- Check if user is admin
  -- Use local variables to avoid ambiguity
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.twitch_user_id = param_user_id 
      AND admin_users.is_active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can update app settings';
  END IF;

  -- Insert or update the setting
  -- Use local variables to avoid ambiguity with column names
  -- Use constraint name in ON CONFLICT to avoid ambiguity
  INSERT INTO app_settings (key, value, data_mode, updated_at, updated_by)
  VALUES (param_key, param_value, param_data_mode, NOW(), param_user_id)
  ON CONFLICT ON CONSTRAINT app_settings_pkey
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;

  -- Return the updated setting
  RETURN QUERY
  SELECT 
    app_settings.key,
    app_settings.value,
    app_settings.updated_at,
    app_settings.updated_by
  FROM app_settings
  WHERE app_settings.key = param_key 
    AND app_settings.data_mode = param_data_mode;
END;
$$;

