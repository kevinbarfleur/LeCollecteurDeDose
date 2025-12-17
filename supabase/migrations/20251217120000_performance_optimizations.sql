-- Migration: Performance Optimizations
-- 1. update_vaal_orbs: Returns new count instead of void
-- 2. check_and_increment_daily_limit: Adds FOR UPDATE to prevent race conditions
-- 3. Indexes on user_daily_limits for faster lookups

-- ============================================================================
-- 1. Update: update_vaal_orbs returns new vaal_orbs count
-- Must DROP first because we're changing return type from void to INTEGER
-- ============================================================================

DROP FUNCTION IF EXISTS update_vaal_orbs(UUID, INTEGER);

CREATE FUNCTION update_vaal_orbs(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE users
  SET
    vaal_orbs = GREATEST(0, vaal_orbs + p_amount),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING vaal_orbs INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- ============================================================================
-- 2. Update: check_and_increment_daily_limit with FOR UPDATE
-- Prevents race condition where two concurrent requests read same count
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
  v_reset_timestamp TIMESTAMPTZ;
  v_new_count INTEGER;
BEGIN
  -- Get the timestamp of the current reset period (21h Paris)
  v_reset_timestamp := get_daily_reset_timestamp();

  -- Get or create the limit record WITH LOCK to prevent race conditions
  SELECT * INTO v_record
  FROM user_daily_limits
  WHERE user_id = p_user_id AND command_type = p_command_type
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create new record with current reset timestamp
    -- Use ON CONFLICT to handle concurrent INSERT race condition
    INSERT INTO user_daily_limits (user_id, command_type, usage_count, last_reset)
    VALUES (p_user_id, p_command_type, 0, v_reset_timestamp::DATE)
    ON CONFLICT (user_id, command_type) DO NOTHING
    RETURNING * INTO v_record;

    -- If INSERT was blocked by conflict, re-fetch with lock
    IF v_record IS NULL THEN
      SELECT * INTO v_record
      FROM user_daily_limits
      WHERE user_id = p_user_id AND command_type = p_command_type
      FOR UPDATE;
    END IF;
  END IF;

  -- Check if we need to reset (last_reset is before current period)
  -- Compare timestamps: if last update was before the current reset period
  IF v_record.updated_at < v_reset_timestamp OR v_record.last_reset < v_reset_timestamp::DATE THEN
    UPDATE user_daily_limits
    SET usage_count = 0, last_reset = v_reset_timestamp::DATE, updated_at = NOW()
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
-- 3. Indexes for performance
-- ============================================================================

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_daily_limits_user_id
  ON user_daily_limits(user_id);

-- Index for faster lookups by command_type
CREATE INDEX IF NOT EXISTS idx_user_daily_limits_command_type
  ON user_daily_limits(command_type);

-- Index for faster reset checks
CREATE INDEX IF NOT EXISTS idx_user_daily_limits_last_reset
  ON user_daily_limits(last_reset DESC);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_user_daily_limits_user_command
  ON user_daily_limits(user_id, command_type);
