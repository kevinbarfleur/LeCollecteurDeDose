-- Migration: Add batch command functions for !booster X and !vaals X
-- This allows users to open multiple boosters or receive multiple Vaal rewards at once

-- ============================================================================
-- Function: batch_check_and_increment_daily_limit
-- Check and increment daily limit for batch commands (atomic operation)
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_check_and_increment_daily_limit(
  p_user_id UUID,
  p_command_type TEXT,
  p_max_limit INTEGER,
  p_requested_count INTEGER  -- -1 means "all remaining"
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record user_daily_limits%ROWTYPE;
  v_reset_timestamp TIMESTAMPTZ;
  v_current_usage INTEGER;
  v_available INTEGER;
  v_granted INTEGER;
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
  IF v_record.updated_at < v_reset_timestamp OR v_record.last_reset < v_reset_timestamp::DATE THEN
    UPDATE user_daily_limits
    SET usage_count = 0, last_reset = v_reset_timestamp::DATE, updated_at = NOW()
    WHERE id = v_record.id;
    v_current_usage := 0;
  ELSE
    v_current_usage := v_record.usage_count;
  END IF;

  -- Calculate available slots
  v_available := GREATEST(0, p_max_limit - v_current_usage);

  -- Calculate granted amount
  IF p_requested_count = -1 THEN
    -- "all" mode: grant all remaining
    v_granted := v_available;
  ELSE
    -- Specific count: grant min(requested, available)
    v_granted := LEAST(p_requested_count, v_available);
  END IF;

  -- If nothing to grant, return failure
  IF v_granted = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'granted', 0,
      'used', v_current_usage,
      'limit', p_max_limit,
      'remaining', 0
    );
  END IF;

  -- Increment usage by granted amount
  v_new_count := v_current_usage + v_granted;

  UPDATE user_daily_limits
  SET usage_count = v_new_count, updated_at = NOW()
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'granted', v_granted,
    'used', v_new_count,
    'limit', p_max_limit,
    'remaining', p_max_limit - v_new_count
  );
END;
$$;

-- ============================================================================
-- Function: create_batch_boosters_for_user
-- Create multiple boosters at once and return T0 cards separately for announcements
-- ============================================================================

CREATE OR REPLACE FUNCTION create_batch_boosters_for_user(
  p_user_id UUID,
  p_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_card_tier TEXT;
  v_is_foil BOOLEAN;
  v_total_weight NUMERIC;
  v_random_weight NUMERIC;
  v_tier_chances JSONB := '{"T3": 0.10, "T2": 0.08, "T1": 0.05, "T0": 0.01}'::jsonb;

  -- Results
  v_boosters JSONB := '[]'::jsonb;
  v_current_booster JSONB;
  v_current_cards JSONB;
  v_t0_cards JSONB := '[]'::jsonb;

  -- Summary counters
  v_total_cards INTEGER := 0;
  v_total_foils INTEGER := 0;
  v_t0_count INTEGER := 0;
  v_t1_count INTEGER := 0;
  v_t2_count INTEGER := 0;
  v_t3_count INTEGER := 0;

  -- Loop variables
  v_booster_idx INTEGER;
  v_card_idx INTEGER;
BEGIN
  -- Safety check
  IF p_count <= 0 OR p_count > 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid count (must be 1-50)'
    );
  END IF;

  -- Create each booster
  FOR v_booster_idx IN 1..p_count LOOP
    v_current_cards := '[]'::jsonb;

    -- Create booster record
    INSERT INTO user_boosters (user_id, opened_at, booster_type)
    VALUES (p_user_id, NOW(), 'normal')
    RETURNING id INTO v_booster_id;

    -- Generate 5 cards for this booster
    FOR v_card_idx IN 1..5 LOOP
      IF v_card_idx = 1 THEN
        -- Guaranteed card (T0, T1, or T2) - weighted random with T2 boost
        SELECT uid, name, tier INTO v_card_uid, v_card_name, v_card_tier
        FROM unique_cards
        WHERE tier IN ('T0', 'T1', 'T2')
        ORDER BY
          CASE
            WHEN tier = 'T2' THEN (COALESCE((game_data->>'weight')::NUMERIC, 1) * 4)
            ELSE COALESCE((game_data->>'weight')::NUMERIC, 1)
          END DESC,
          RANDOM()
        LIMIT 1;
      ELSE
        -- Regular weighted random card
        SELECT SUM(COALESCE((game_data->>'weight')::NUMERIC, 1)) INTO v_total_weight
        FROM unique_cards;

        IF v_total_weight IS NULL OR v_total_weight = 0 THEN
          v_total_weight := 1;
        END IF;

        v_random_weight := RANDOM() * v_total_weight;

        SELECT uid, name, tier INTO v_card_uid, v_card_name, v_card_tier
        FROM (
          SELECT uid, name, tier,
                 SUM(COALESCE((game_data->>'weight')::NUMERIC, 1)) OVER (ORDER BY uid) as cumulative_weight
          FROM unique_cards
        ) weighted
        WHERE cumulative_weight >= v_random_weight
        ORDER BY uid
        LIMIT 1;

        -- Fallback if no card found
        IF v_card_uid IS NULL THEN
          SELECT uid, name, tier INTO v_card_uid, v_card_name, v_card_tier
          FROM unique_cards
          ORDER BY RANDOM()
          LIMIT 1;
        END IF;
      END IF;

      -- Determine if foil
      v_is_foil := RANDOM() < COALESCE((v_tier_chances->>v_card_tier)::NUMERIC, 0.01);

      -- Add to booster record
      INSERT INTO booster_cards (booster_id, card_uid, is_foil, position)
      VALUES (v_booster_id, v_card_uid, v_is_foil, v_card_idx);

      -- Add to user collection
      PERFORM add_card_to_collection(p_user_id, v_card_uid, v_is_foil);

      -- Add to current booster's cards array
      v_current_cards := v_current_cards || jsonb_build_object(
        'name', v_card_name,
        'tier', v_card_tier,
        'is_foil', v_is_foil,
        'uid', v_card_uid
      );

      -- Update counters
      v_total_cards := v_total_cards + 1;
      IF v_is_foil THEN
        v_total_foils := v_total_foils + 1;
      END IF;

      -- Update tier counts
      CASE v_card_tier
        WHEN 'T0' THEN v_t0_count := v_t0_count + 1;
        WHEN 'T1' THEN v_t1_count := v_t1_count + 1;
        WHEN 'T2' THEN v_t2_count := v_t2_count + 1;
        WHEN 'T3' THEN v_t3_count := v_t3_count + 1;
        ELSE NULL;
      END CASE;

      -- If T0, add to t0_cards for public announcement
      IF v_card_tier = 'T0' THEN
        v_t0_cards := v_t0_cards || jsonb_build_object(
          'name', v_card_name,
          'is_foil', v_is_foil
        );
      END IF;
    END LOOP;

    -- Add current booster to results
    v_current_booster := jsonb_build_object(
      'booster_id', v_booster_id,
      'cards', v_current_cards
    );
    v_boosters := v_boosters || v_current_booster;
  END LOOP;

  -- Return complete result
  RETURN jsonb_build_object(
    'success', true,
    'boosters', v_boosters,
    't0_cards', v_t0_cards,
    'summary', jsonb_build_object(
      'total_cards', v_total_cards,
      'total_foils', v_total_foils,
      'tier_counts', jsonb_build_object(
        'T0', v_t0_count,
        'T1', v_t1_count,
        'T2', v_t2_count,
        'T3', v_t3_count
      )
    )
  );
END;
$$;

-- ============================================================================
-- Function: batch_add_vaal_orbs
-- Add multiple Vaal Orb rewards at once (each reward = 5 orbs)
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_add_vaal_orbs(
  p_user_id UUID,
  p_count INTEGER  -- Number of "uses" (each gives 5 orbs)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orbs_per_use INTEGER := 5;
  v_total_to_add INTEGER;
  v_new_total INTEGER;
BEGIN
  -- Safety check
  IF p_count <= 0 OR p_count > 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid count (must be 1-50)'
    );
  END IF;

  v_total_to_add := p_count * v_orbs_per_use;

  -- Update user's Vaal orbs
  UPDATE users
  SET vaal_orbs = COALESCE(vaal_orbs, 0) + v_total_to_add,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING vaal_orbs INTO v_new_total;

  IF v_new_total IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'added', v_total_to_add,
    'new_total', v_new_total
  );
END;
$$;
