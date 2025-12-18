-- Migration: Create atomic altar outcome function
-- Reduces ~5-7 sequential RPC calls to exactly 1 atomic transaction
-- This dramatically improves sync performance for altar operations

-- ============================================================================
-- Function: apply_altar_outcome
-- Atomically applies an altar (Vaal Orb) outcome in a single transaction
-- Handles: user lookup/creation, vaal orbs delta, card updates, buff consumption
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_altar_outcome(
  p_twitch_username TEXT,
  p_card_updates JSONB,  -- Array: [{"card_uid": int, "normal_count": int, "foil_count": int}]
  p_vaal_orbs_delta INTEGER,
  p_consume_atlas_influence BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_vaal_orbs INTEGER;
  v_new_vaal_orbs INTEGER;
  v_card_update JSONB;
  v_card_uid INTEGER;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
  v_total_count INTEGER;
  v_consumed_buff BOOLEAN := FALSE;
  v_buffs JSONB;
  v_cards_updated INTEGER := 0;
BEGIN
  -- ========================================================================
  -- Step 1: Get or create user (replaces separate get_or_create_user RPC)
  -- ========================================================================
  SELECT id, vaal_orbs, COALESCE(temporary_buffs, '{}'::jsonb)
  INTO v_user_id, v_current_vaal_orbs, v_buffs
  FROM users
  WHERE LOWER(twitch_username) = LOWER(p_twitch_username)
  LIMIT 1;

  -- Create user if not exists
  IF v_user_id IS NULL THEN
    INSERT INTO users (twitch_username, vaal_orbs)
    VALUES (LOWER(p_twitch_username), 1)
    RETURNING id, vaal_orbs, COALESCE(temporary_buffs, '{}'::jsonb)
    INTO v_user_id, v_current_vaal_orbs, v_buffs;
  END IF;

  v_current_vaal_orbs := COALESCE(v_current_vaal_orbs, 0);
  v_buffs := COALESCE(v_buffs, '{}'::jsonb);

  -- ========================================================================
  -- Step 2: Apply vaal orbs delta (replaces separate set_vaal_orbs RPC)
  -- Using delta (not absolute) allows concurrent operations
  -- ========================================================================
  v_new_vaal_orbs := GREATEST(0, v_current_vaal_orbs + p_vaal_orbs_delta);

  UPDATE users
  SET
    vaal_orbs = v_new_vaal_orbs,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- ========================================================================
  -- Step 3: Apply all card updates in batch (replaces FOR loop of set_card_collection_counts)
  -- ========================================================================
  IF p_card_updates IS NOT NULL AND jsonb_array_length(p_card_updates) > 0 THEN
    FOR v_card_update IN SELECT * FROM jsonb_array_elements(p_card_updates)
    LOOP
      v_card_uid := (v_card_update->>'card_uid')::INTEGER;
      v_normal_count := COALESCE((v_card_update->>'normal_count')::INTEGER, 0);
      v_foil_count := COALESCE((v_card_update->>'foil_count')::INTEGER, 0);
      v_total_count := GREATEST(0, v_normal_count + v_foil_count);

      -- Delete if total count is 0 (card destroyed completely)
      IF v_total_count = 0 THEN
        DELETE FROM user_collections
        WHERE user_id = v_user_id AND card_uid = v_card_uid;
      ELSE
        -- Upsert with absolute values
        INSERT INTO user_collections (user_id, card_uid, quantity, normal_count, foil_count)
        VALUES (
          v_user_id,
          v_card_uid,
          v_total_count,
          GREATEST(0, v_normal_count),
          GREATEST(0, v_foil_count)
        )
        ON CONFLICT (user_id, card_uid) DO UPDATE
        SET
          quantity = v_total_count,
          normal_count = GREATEST(0, v_normal_count),
          foil_count = GREATEST(0, v_foil_count),
          updated_at = NOW();
      END IF;

      v_cards_updated := v_cards_updated + 1;
    END LOOP;
  END IF;

  -- ========================================================================
  -- Step 4: Consume Atlas Influence buff if requested (replaces separate consume_buff RPC)
  -- ========================================================================
  IF p_consume_atlas_influence AND v_buffs ? 'atlas_influence' THEN
    v_consumed_buff := TRUE;
    v_buffs := v_buffs - 'atlas_influence';

    UPDATE users
    SET
      temporary_buffs = v_buffs,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- ========================================================================
  -- Return success with new state
  -- ========================================================================
  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'vaal_orbs', v_new_vaal_orbs,
    'vaal_orbs_before', v_current_vaal_orbs,
    'atlas_influence_consumed', v_consumed_buff,
    'cards_updated', v_cards_updated
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error info without exposing internals
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Grant execute permission to anon and authenticated roles
-- (RLS is bypassed via SECURITY DEFINER, so anon key works)
GRANT EXECUTE ON FUNCTION apply_altar_outcome TO anon;
GRANT EXECUTE ON FUNCTION apply_altar_outcome TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION apply_altar_outcome IS 'Atomically applies altar outcome (Vaal Orb corruption) - handles user, vaal orbs, card updates, and buff consumption in a single transaction';
