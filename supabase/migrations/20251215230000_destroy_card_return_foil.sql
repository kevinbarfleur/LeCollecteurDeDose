-- Migration: Update destroy_random_card to return foil info
-- Allows the bot to display if the destroyed card was foil

CREATE OR REPLACE FUNCTION destroy_random_card(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
  v_destroyed_foil BOOLEAN := false;
BEGIN
  -- Check if user has cards
  IF NOT check_user_has_cards(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur n''a pas de cartes'
    );
  END IF;

  -- Select random card
  SELECT uc.id, uc.card_uid, uc.normal_count, uc.foil_count, c.name
  INTO v_collection_id, v_card_uid, v_normal_count, v_foil_count, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
  ORDER BY RANDOM()
  LIMIT 1;

  -- Remove card (prefer normal, then foil)
  IF v_normal_count > 0 THEN
    v_destroyed_foil := false;
    IF v_normal_count = 1 AND v_foil_count = 0 THEN
      DELETE FROM user_collections WHERE id = v_collection_id;
    ELSE
      UPDATE user_collections
      SET normal_count = normal_count - 1,
          quantity = quantity - 1,
          updated_at = NOW()
      WHERE id = v_collection_id;
    END IF;
  ELSIF v_foil_count > 0 THEN
    v_destroyed_foil := true;
    IF v_foil_count = 1 AND v_normal_count = 0 THEN
      DELETE FROM user_collections WHERE id = v_collection_id;
    ELSE
      UPDATE user_collections
      SET foil_count = foil_count - 1,
          quantity = quantity - 1,
          updated_at = NOW()
      WHERE id = v_collection_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s détruite', v_card_name),
    'card_name', v_card_name,
    'is_foil', v_destroyed_foil
  );
END;
$$;
