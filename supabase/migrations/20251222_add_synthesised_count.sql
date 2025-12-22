-- Migration: Add synthesised_count to user_collections
-- Synthesised cards are obtained by using Vaal Orb on foil cards (10% chance)
-- Run this migration to enable the synthesised card variant feature

-- Add synthesised_count column to user_collections
ALTER TABLE user_collections
ADD COLUMN IF NOT EXISTS synthesised_count INTEGER NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN user_collections.synthesised_count IS 'Number of synthesised variant cards. Obtained by using Vaal Orb on foil cards (10% chance).';

-- Update the apply_altar_outcome function to handle synthesised_count
CREATE OR REPLACE FUNCTION apply_altar_outcome(
  p_twitch_username TEXT,
  p_card_updates JSONB,
  p_vaal_orbs_delta INTEGER DEFAULT -1,
  p_consume_atlas_influence BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_orbs INTEGER;
  v_new_orbs INTEGER;
  v_atlas_consumed BOOLEAN := FALSE;
  v_update JSONB;
  v_card_uid INTEGER;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
  v_synthesised_count INTEGER;
  v_existing_synthesised INTEGER;
BEGIN
  -- Get user ID and current orbs
  SELECT id, vaal_orbs INTO v_user_id, v_current_orbs
  FROM users
  WHERE twitch_username = LOWER(p_twitch_username);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'User not found');
  END IF;

  -- Update vaal orbs
  v_new_orbs := GREATEST(0, COALESCE(v_current_orbs, 0) + p_vaal_orbs_delta);

  -- Consume atlas influence if requested
  IF p_consume_atlas_influence THEN
    UPDATE users
    SET
      vaal_orbs = v_new_orbs,
      temporary_buffs = temporary_buffs - 'atlas_influence'
    WHERE id = v_user_id;
    v_atlas_consumed := TRUE;
  ELSE
    UPDATE users
    SET vaal_orbs = v_new_orbs
    WHERE id = v_user_id;
  END IF;

  -- Apply card updates
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_card_updates)
  LOOP
    v_card_uid := (v_update->>'card_uid')::INTEGER;
    v_normal_count := (v_update->>'normal_count')::INTEGER;
    v_foil_count := (v_update->>'foil_count')::INTEGER;
    v_synthesised_count := (v_update->>'synthesised_count')::INTEGER;  -- May be NULL

    -- Get existing synthesised count if not provided
    IF v_synthesised_count IS NULL THEN
      SELECT COALESCE(synthesised_count, 0) INTO v_existing_synthesised
      FROM user_collections
      WHERE user_id = v_user_id AND card_uid = v_card_uid;
      v_synthesised_count := COALESCE(v_existing_synthesised, 0);
    END IF;

    -- Check if we need to delete the collection entry (all counts are 0)
    IF v_normal_count <= 0 AND v_foil_count <= 0 AND v_synthesised_count <= 0 THEN
      DELETE FROM user_collections
      WHERE user_id = v_user_id AND card_uid = v_card_uid;
    ELSE
      -- Upsert the collection entry
      INSERT INTO user_collections (user_id, card_uid, normal_count, foil_count, synthesised_count, quantity, updated_at)
      VALUES (v_user_id, v_card_uid, v_normal_count, v_foil_count, v_synthesised_count, v_normal_count + v_foil_count + v_synthesised_count, NOW())
      ON CONFLICT (user_id, card_uid) DO UPDATE SET
        normal_count = EXCLUDED.normal_count,
        foil_count = EXCLUDED.foil_count,
        synthesised_count = EXCLUDED.synthesised_count,
        quantity = EXCLUDED.quantity,
        updated_at = NOW();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'vaal_orbs', v_new_orbs,
    'atlas_influence_consumed', v_atlas_consumed
  );
END;
$$;
