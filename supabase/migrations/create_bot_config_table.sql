-- Migration: Create bot_config table for managing trigger settings
-- This replaces environment variables with database-stored configuration

CREATE TABLE IF NOT EXISTS bot_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment
COMMENT ON TABLE bot_config IS 'Configuration settings for the Twitch bot triggers system. Replaces environment variables.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_config_key ON bot_config(key);

-- Function to get a config value
CREATE OR REPLACE FUNCTION get_bot_config(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value INTO v_value
  FROM bot_config
  WHERE key = p_key;
  
  RETURN v_value;
END;
$$;

-- Function to set a config value
CREATE OR REPLACE FUNCTION set_bot_config(p_key TEXT, p_value TEXT, p_description TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO bot_config (key, value, description, updated_at)
  VALUES (p_key, p_value, p_description, NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, bot_config.description),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$;

-- Function to get all config as JSONB
CREATE OR REPLACE FUNCTION get_all_bot_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_row RECORD;
BEGIN
  FOR v_row IN SELECT key, value FROM bot_config
  LOOP
    v_result := v_result || jsonb_build_object(v_row.key, v_row.value);
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Insert default configuration values
INSERT INTO bot_config (key, value, description) VALUES
  ('auto_triggers_enabled', 'false', 'Enable/disable automatic triggers system'),
  ('auto_triggers_min_interval', '300', 'Minimum interval between triggers (seconds)'),
  ('auto_triggers_max_interval', '900', 'Maximum interval between triggers (seconds)'),
  ('trigger_blessing_rngesus', '0.20', 'Probability of Blessing of RNGesus trigger (0.0-1.0)'),
  ('trigger_cartographers_gift', '0.20', 'Probability of Cartographer''s Gift trigger (0.0-1.0)'),
  ('trigger_mirror_tier', '0.05', 'Probability of Mirror-tier Moment trigger (0.0-1.0)'),
  ('trigger_einhar_approved', '0.15', 'Probability of Einhar Approved trigger (0.0-1.0)'),
  ('trigger_heist_tax', '0.10', 'Probability of Heist Tax trigger (0.0-1.0)'),
  ('trigger_sirus_voice', '0.03', 'Probability of Sirus Voice Line trigger (0.0-1.0)'),
  ('trigger_alch_misclick', '0.10', 'Probability of Alch & Go Misclick trigger (0.0-1.0)'),
  ('trigger_trade_scam', '0.05', 'Probability of Trade Scam trigger (0.0-1.0)'),
  ('trigger_chris_vision', '0.05', 'Probability of Chris Wilson''s Vision trigger (0.0-1.0)'),
  ('trigger_atlas_influence', '0.07', 'Probability of Atlas Influence trigger (0.0-1.0)'),
  ('atlas_influence_duration', '30', 'Duration of Atlas Influence buff (minutes)'),
  ('atlas_influence_foil_boost', '0.10', 'Foil chance boost from Atlas Influence (0.0-1.0)'),
  ('auto_triggers_target_cooldown', '600000', 'Cooldown before re-targeting same user (milliseconds)'),
  ('auto_triggers_min_users_for_cooldown', '3', 'Minimum active users to apply strict cooldown'),
  ('auto_triggers_user_activity_window', '3600000', 'Time window to consider user active (milliseconds)')
ON CONFLICT (key) DO NOTHING;
