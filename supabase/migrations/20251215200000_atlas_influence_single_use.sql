-- Migration: Atlas Influence - Single-use buff for altar
-- Changes Atlas Influence from time-based booster buff to single-use altar buff

-- ============================================================================
-- Function: Add single-use buff (no expiration, consumed after one use)
-- ============================================================================

CREATE OR REPLACE FUNCTION add_single_use_buff(
  p_user_id UUID,
  p_buff_type TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffs JSONB;
  v_new_buff JSONB;
BEGIN
  v_new_buff := jsonb_build_object(
    'type', 'single_use',
    'data', p_data
  );

  -- Get current buffs
  SELECT COALESCE(temporary_buffs, '{}'::jsonb) INTO v_buffs
  FROM users
  WHERE id = p_user_id;

  -- Add or update buff
  v_buffs := v_buffs || jsonb_build_object(p_buff_type, v_new_buff);

  -- Update user
  UPDATE users
  SET temporary_buffs = v_buffs,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Buff %s (single-use) added', p_buff_type)
  );
END;
$$;

-- ============================================================================
-- Function: Consume (remove) a buff
-- ============================================================================

CREATE OR REPLACE FUNCTION consume_buff(
  p_user_id UUID,
  p_buff_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffs JSONB;
  v_had_buff BOOLEAN := false;
BEGIN
  -- Get current buffs
  SELECT COALESCE(temporary_buffs, '{}'::jsonb) INTO v_buffs
  FROM users
  WHERE id = p_user_id;

  -- Check if buff exists
  IF v_buffs ? p_buff_type THEN
    v_had_buff := true;
    -- Remove the buff
    v_buffs := v_buffs - p_buff_type;

    -- Update user
    UPDATE users
    SET temporary_buffs = v_buffs,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'consumed', v_had_buff,
    'message', CASE WHEN v_had_buff
      THEN format('Buff %s consumed', p_buff_type)
      ELSE format('Buff %s was not active', p_buff_type)
    END
  );
END;
$$;

-- ============================================================================
-- Update get_user_buffs to include single-use buffs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_buffs(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffs JSONB;
  v_active_buffs JSONB := '{}'::jsonb;
  v_buff_key TEXT;
  v_buff_data JSONB;
  v_expires_at TIMESTAMPTZ;
  v_buff_type TEXT;
BEGIN
  -- Get buffs
  SELECT COALESCE(temporary_buffs, '{}'::jsonb) INTO v_buffs
  FROM users
  WHERE id = p_user_id;

  -- Filter active buffs (time-based or single-use)
  FOR v_buff_key, v_buff_data IN SELECT * FROM jsonb_each(v_buffs)
  LOOP
    v_buff_type := v_buff_data->>'type';

    -- Single-use buffs are always active until consumed
    IF v_buff_type = 'single_use' THEN
      v_active_buffs := v_active_buffs || jsonb_build_object(v_buff_key, v_buff_data);
    ELSE
      -- Time-based buffs: check expiration
      v_expires_at := (v_buff_data->>'expires_at')::TIMESTAMPTZ;
      IF v_expires_at IS NOT NULL AND v_expires_at > NOW() THEN
        v_active_buffs := v_active_buffs || jsonb_build_object(v_buff_key, v_buff_data);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'buffs', v_active_buffs
  );
END;
$$;

-- ============================================================================
-- Remove atlas_influence_duration from bot_config (optional cleanup)
-- ============================================================================

DELETE FROM bot_config WHERE key = 'atlas_influence_duration';
