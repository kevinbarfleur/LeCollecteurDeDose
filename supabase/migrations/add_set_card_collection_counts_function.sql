-- Migration: Add functions to set absolute values for collection synchronization
-- These functions allow setting absolute counts (not incremental) for collection synchronization
-- Uses SECURITY DEFINER to bypass RLS, allowing client-side updates with anon key

-- Function to set absolute card collection counts
CREATE OR REPLACE FUNCTION set_card_collection_counts(
  p_user_id UUID,
  p_card_uid INTEGER,
  p_normal_count INTEGER DEFAULT 0,
  p_foil_count INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count INTEGER;
BEGIN
  v_total_count := GREATEST(0, p_normal_count + p_foil_count);
  
  -- If total count is 0, delete the entry (card no longer in collection)
  -- Must check BEFORE attempting INSERT to avoid CHECK constraint violation
  IF v_total_count = 0 THEN
    DELETE FROM user_collections
    WHERE user_id = p_user_id AND card_uid = p_card_uid;
  ELSE
    -- Upsert with absolute values (only if count > 0)
    INSERT INTO user_collections (user_id, card_uid, quantity, normal_count, foil_count)
    VALUES (
      p_user_id,
      p_card_uid,
      v_total_count,
      GREATEST(0, p_normal_count),
      GREATEST(0, p_foil_count)
    )
    ON CONFLICT (user_id, card_uid) DO UPDATE
    SET
      quantity = v_total_count,
      normal_count = GREATEST(0, p_normal_count),
      foil_count = GREATEST(0, p_foil_count),
      updated_at = NOW();
  END IF;
END;
$$;

-- Function to set absolute vaal orbs count (for synchronization)
CREATE OR REPLACE FUNCTION set_vaal_orbs(
  p_user_id UUID,
  p_count INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET 
    vaal_orbs = GREATEST(0, p_count),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
