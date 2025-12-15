-- Migration: Daily Command Limits
-- Adds !booster and !vaals commands with daily limits per user

-- ============================================================================
-- Table: Track daily usage per user per command
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_daily_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL, -- 'booster' or 'vaals'
  usage_count INTEGER DEFAULT 0,
  last_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, command_type)
);

-- Enable RLS
ALTER TABLE user_daily_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own limits
CREATE POLICY "Users can view own daily limits"
  ON user_daily_limits FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can do everything
CREATE POLICY "Service role full access to daily limits"
  ON user_daily_limits FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Function: Check and increment daily limit
-- Returns: { success: bool, used: int, limit: int, remaining: int }
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_increment_daily_limit(
  p_user_id UUID,
  p_command_type TEXT,
  p_max_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record user_daily_limits%ROWTYPE;
  v_current_date DATE := CURRENT_DATE;
  v_new_count INTEGER;
BEGIN
  -- Get or create the limit record
  SELECT * INTO v_record
  FROM user_daily_limits
  WHERE user_id = p_user_id AND command_type = p_command_type;

  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO user_daily_limits (user_id, command_type, usage_count, last_reset)
    VALUES (p_user_id, p_command_type, 0, v_current_date)
    RETURNING * INTO v_record;
  END IF;

  -- Check if we need to reset (new day)
  IF v_record.last_reset < v_current_date THEN
    UPDATE user_daily_limits
    SET usage_count = 0, last_reset = v_current_date, updated_at = NOW()
    WHERE id = v_record.id;
    v_record.usage_count := 0;
  END IF;

  -- Check if limit reached
  IF v_record.usage_count >= p_max_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'used', v_record.usage_count,
      'limit', p_max_limit,
      'remaining', 0
    );
  END IF;

  -- Increment usage
  v_new_count := v_record.usage_count + 1;

  UPDATE user_daily_limits
  SET usage_count = v_new_count, updated_at = NOW()
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'used', v_new_count,
    'limit', p_max_limit,
    'remaining', p_max_limit - v_new_count
  );
END;
$$;

-- ============================================================================
-- Function: Get daily limits for a user (all command types)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_limits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_record RECORD;
  v_current_date DATE := CURRENT_DATE;
BEGIN
  FOR v_record IN
    SELECT command_type, usage_count, last_reset
    FROM user_daily_limits
    WHERE user_id = p_user_id
  LOOP
    -- Reset count if it's a new day
    IF v_record.last_reset < v_current_date THEN
      v_result := v_result || jsonb_build_object(
        v_record.command_type, jsonb_build_object('used', 0)
      );
    ELSE
      v_result := v_result || jsonb_build_object(
        v_record.command_type, jsonb_build_object('used', v_record.usage_count)
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- Add default config values for daily limits
-- ============================================================================

INSERT INTO bot_config (key, value) VALUES
  ('daily_limit_booster', '10'),
  ('daily_limit_vaals', '5')
ON CONFLICT (key) DO NOTHING;
