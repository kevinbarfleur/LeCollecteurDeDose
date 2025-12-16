-- Migration: Change daily limits reset to 21h Paris time
-- Also adds function to reset all daily limits (for admin)

-- ============================================================================
-- Helper Function: Get the current "day period" start timestamp
-- The day resets at 21:00 Paris time
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_reset_timestamp()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_paris_now TIMESTAMPTZ;
  v_paris_today_21h TIMESTAMPTZ;
  v_reset_timestamp TIMESTAMPTZ;
BEGIN
  -- Get current time in Paris timezone
  v_paris_now := NOW() AT TIME ZONE 'Europe/Paris';

  -- Get today at 21:00 Paris time
  v_paris_today_21h := DATE_TRUNC('day', v_paris_now) + INTERVAL '21 hours';

  -- If we're before 21h Paris, the period started yesterday at 21h
  -- If we're after 21h Paris, the period started today at 21h
  IF v_paris_now < v_paris_today_21h THEN
    v_reset_timestamp := v_paris_today_21h - INTERVAL '1 day';
  ELSE
    v_reset_timestamp := v_paris_today_21h;
  END IF;

  -- Convert back to UTC for storage
  RETURN v_reset_timestamp AT TIME ZONE 'Europe/Paris';
END;
$$;

-- ============================================================================
-- Update: Check and increment daily limit (21h Paris reset)
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

  -- Get or create the limit record
  SELECT * INTO v_record
  FROM user_daily_limits
  WHERE user_id = p_user_id AND command_type = p_command_type;

  IF NOT FOUND THEN
    -- Create new record with current reset timestamp
    INSERT INTO user_daily_limits (user_id, command_type, usage_count, last_reset)
    VALUES (p_user_id, p_command_type, 0, v_reset_timestamp::DATE)
    RETURNING * INTO v_record;
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
-- Update: Get daily limits (21h Paris reset)
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
  v_reset_timestamp TIMESTAMPTZ;
BEGIN
  v_reset_timestamp := get_daily_reset_timestamp();

  FOR v_record IN
    SELECT command_type, usage_count, last_reset, updated_at
    FROM user_daily_limits
    WHERE user_id = p_user_id
  LOOP
    -- Reset count if it's a new period
    IF v_record.updated_at < v_reset_timestamp OR v_record.last_reset < v_reset_timestamp::DATE THEN
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
-- New Function: Reset all daily limits (admin action)
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_all_daily_limits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  -- Reset all usage counts to 0
  UPDATE user_daily_limits
  SET usage_count = 0, updated_at = NOW();

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'reset_count', v_affected_rows,
    'message', 'All daily limits have been reset'
  );
END;
$$;
