-- Migration: Add upsert_unique_card function for admin card registry
-- Allows creating new cards or updating existing cards in unique_cards table

CREATE OR REPLACE FUNCTION upsert_unique_card(
  p_uid INTEGER,
  p_id TEXT,
  p_name TEXT,
  p_item_class TEXT,
  p_rarity TEXT,
  p_tier TEXT,
  p_flavour_text TEXT DEFAULT NULL,
  p_wiki_url TEXT DEFAULT NULL,
  p_game_data JSONB DEFAULT '{}',
  p_relevance_score INTEGER DEFAULT 0
) RETURNS unique_cards AS $$
DECLARE
  v_result unique_cards;
  v_new_uid INTEGER;
BEGIN
  IF p_uid IS NULL THEN
    -- Insert new card (get next UID)
    SELECT COALESCE(MAX(uid), 0) + 1 INTO v_new_uid FROM unique_cards;

    INSERT INTO unique_cards (
      uid, id, name, item_class, rarity, tier,
      flavour_text, wiki_url, game_data, relevance_score
    ) VALUES (
      v_new_uid,
      p_id, p_name, p_item_class, p_rarity, p_tier,
      p_flavour_text, p_wiki_url, p_game_data, p_relevance_score
    )
    RETURNING * INTO v_result;
  ELSE
    -- Update existing card
    UPDATE unique_cards SET
      id = p_id,
      name = p_name,
      item_class = p_item_class,
      rarity = p_rarity,
      tier = p_tier,
      flavour_text = p_flavour_text,
      wiki_url = p_wiki_url,
      game_data = p_game_data,
      relevance_score = p_relevance_score,
      updated_at = NOW()
    WHERE uid = p_uid
    RETURNING * INTO v_result;

    -- If no row was updated, raise an error
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Card with uid % not found', p_uid;
    END IF;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission to authenticated users (admin check should be done at application level)
GRANT EXECUTE ON FUNCTION upsert_unique_card TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_unique_card TO service_role;
