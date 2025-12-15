-- Migration: Add bot_config and app_settings columns to backup table
-- These columns store important configuration data in backups

ALTER TABLE backup
ADD COLUMN IF NOT EXISTS bot_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS app_settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN backup.bot_config IS 'Bot configuration settings (key-value pairs)';
COMMENT ON COLUMN backup.app_settings IS 'Application settings (key-value pairs with data_mode)';
