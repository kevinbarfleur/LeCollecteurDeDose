-- Migration: Add command enable/disable configuration keys
-- Allows toggling individual commands on/off from admin panel

-- ============================================================================
-- COMMAND ENABLE/DISABLE KEYS
-- ============================================================================

INSERT INTO bot_config (key, value, description) VALUES
  -- Command toggles
  ('command_ping_enabled', 'true', 'Enable/disable !ping command'),
  ('command_ladder_enabled', 'true', 'Enable/disable !ladder and !classement commands'),
  ('command_vaalorb_enabled', 'true', 'Enable/disable !vaalorb command'),
  ('command_booster_enabled', 'true', 'Enable/disable !booster command'),
  ('command_vaals_enabled', 'true', 'Enable/disable !vaals command'),

  -- Trigger individual toggles (in addition to master toggle)
  ('trigger_blessing_rngesus_enabled', 'true', 'Enable/disable Blessing of RNGesus trigger'),
  ('trigger_cartographers_gift_enabled', 'true', 'Enable/disable Cartographer''s Gift trigger'),
  ('trigger_mirror_tier_enabled', 'true', 'Enable/disable Mirror-tier Moment trigger'),
  ('trigger_einhar_approved_enabled', 'true', 'Enable/disable Einhar Approved trigger'),
  ('trigger_heist_tax_enabled', 'true', 'Enable/disable Heist Tax trigger'),
  ('trigger_sirus_voice_enabled', 'true', 'Enable/disable Sirus Voice Line trigger'),
  ('trigger_alch_misclick_enabled', 'true', 'Enable/disable Alch & Go Misclick trigger'),
  ('trigger_trade_scam_enabled', 'true', 'Enable/disable Trade Scam trigger'),
  ('trigger_chris_vision_enabled', 'true', 'Enable/disable Chris Wilson''s Vision trigger'),
  ('trigger_atlas_influence_enabled', 'true', 'Enable/disable Atlas Influence trigger')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Check if a command is enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION is_command_enabled(p_command TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value TEXT;
  v_key TEXT;
BEGIN
  v_key := 'command_' || p_command || '_enabled';

  SELECT value INTO v_value
  FROM bot_config
  WHERE key = v_key;

  -- Default to true if not found
  RETURN COALESCE(v_value = 'true', true);
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if a trigger is enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION is_trigger_enabled(p_trigger TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_enabled TEXT;
  v_trigger_enabled TEXT;
  v_key TEXT;
BEGIN
  -- Check master toggle first
  SELECT value INTO v_master_enabled
  FROM bot_config
  WHERE key = 'auto_triggers_enabled';

  IF v_master_enabled != 'true' THEN
    RETURN FALSE;
  END IF;

  -- Check individual trigger toggle
  v_key := 'trigger_' || p_trigger || '_enabled';

  SELECT value INTO v_trigger_enabled
  FROM bot_config
  WHERE key = v_key;

  -- Default to true if not found
  RETURN COALESCE(v_trigger_enabled = 'true', true);
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Get all enabled triggers with their probabilities
-- ============================================================================

CREATE OR REPLACE FUNCTION get_enabled_triggers()
RETURNS TABLE(trigger_key TEXT, probability NUMERIC, is_enabled BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH triggers AS (
    SELECT
      'blessingRNGesus' as t_key, 'trigger_blessing_rngesus' as config_key
    UNION ALL SELECT 'cartographersGift', 'trigger_cartographers_gift'
    UNION ALL SELECT 'mirrorTier', 'trigger_mirror_tier'
    UNION ALL SELECT 'einharApproved', 'trigger_einhar_approved'
    UNION ALL SELECT 'heistTax', 'trigger_heist_tax'
    UNION ALL SELECT 'sirusVoice', 'trigger_sirus_voice'
    UNION ALL SELECT 'alchMisclick', 'trigger_alch_misclick'
    UNION ALL SELECT 'tradeScam', 'trigger_trade_scam'
    UNION ALL SELECT 'chrisVision', 'trigger_chris_vision'
    UNION ALL SELECT 'atlasInfluence', 'trigger_atlas_influence'
  )
  SELECT
    t.t_key,
    COALESCE((SELECT bc.value::NUMERIC FROM bot_config bc WHERE bc.key = t.config_key), 0) as probability,
    COALESCE((SELECT bc.value = 'true' FROM bot_config bc WHERE bc.key = t.config_key || '_enabled'), true) as is_enabled
  FROM triggers t;
END;
$$;
