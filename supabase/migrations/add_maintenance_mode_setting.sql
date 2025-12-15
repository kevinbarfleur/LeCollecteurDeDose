-- Migration: Add maintenance_mode setting to app_settings
-- Initializes the maintenance mode setting with default value (disabled)

INSERT INTO app_settings (key, value, data_mode, updated_at)
VALUES (
  'maintenance_mode',
  '{"enabled": false}'::jsonb,
  'api',
  NOW()
)
ON CONFLICT (key, data_mode) DO NOTHING;
