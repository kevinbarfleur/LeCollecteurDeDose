-- Migration: Batch Events Functions
-- Functions for handling batch events like "Patch Notes" that affect multiple users
-- based on specific item classes (bows, melee weapons, etc.)

-- ============================================================================
-- FUNCTION: Get all users with their item class statistics
-- Returns users who have cards with info about bow/melee ownership
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_users_with_item_classes(
  p_bow_classes TEXT[] DEFAULT ARRAY['Bow', 'Quiver'],
  p_melee_classes TEXT[] DEFAULT ARRAY[
    'One-Handed Sword', 'Two-Handed Sword', 'Thrusting One-Handed Sword',
    'One-Handed Axe', 'Two-Handed Axe', 'One-Handed Mace',
    'Staff', 'Warstaff', 'Claw', 'Dagger', 'Rune Dagger'
  ]
)
RETURNS TABLE (
  user_id UUID,
  twitch_username TEXT,
  has_bow_cards BOOLEAN,
  has_melee_cards BOOLEAN,
  has_normal_bow_cards BOOLEAN,
  has_normal_melee_cards BOOLEAN,
  bow_card_count INTEGER,
  melee_card_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.twitch_username,
    -- Has any bow cards (normal or foil)
    EXISTS (
      SELECT 1 FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = u.id AND c.item_class = ANY(p_bow_classes)
    ) as has_bow_cards,
    -- Has any melee cards (normal or foil)
    EXISTS (
      SELECT 1 FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = u.id AND c.item_class = ANY(p_melee_classes)
    ) as has_melee_cards,
    -- Has normal bow cards (can be converted to foil)
    EXISTS (
      SELECT 1 FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = u.id
        AND c.item_class = ANY(p_bow_classes)
        AND uc.normal_count > 0
    ) as has_normal_bow_cards,
    -- Has normal melee cards (can be destroyed)
    EXISTS (
      SELECT 1 FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = u.id
        AND c.item_class = ANY(p_melee_classes)
    ) as has_normal_melee_cards,
    -- Count of bow cards
    (
      SELECT COALESCE(SUM(uc.quantity), 0)::INTEGER
      FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = u.id AND c.item_class = ANY(p_bow_classes)
    ) as bow_card_count,
    -- Count of melee cards
    (
      SELECT COALESCE(SUM(uc.quantity), 0)::INTEGER
      FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = u.id AND c.item_class = ANY(p_melee_classes)
    ) as melee_card_count
  FROM users u
  WHERE EXISTS (SELECT 1 FROM user_collections WHERE user_id = u.id);
END;
$$;

-- ============================================================================
-- FUNCTION: Convert a specific item class card to foil
-- Converts a random normal card of the specified item classes to foil
-- ============================================================================
CREATE OR REPLACE FUNCTION convert_item_class_to_foil(
  p_user_id UUID,
  p_item_classes TEXT[]
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
  v_item_class TEXT;
BEGIN
  -- Find a random normal card matching the item classes
  SELECT uc.id, uc.card_uid, c.name, c.item_class
  INTO v_collection_id, v_card_uid, v_card_name, v_item_class
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.normal_count > 0
    AND c.item_class = ANY(p_item_classes)
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucune carte normale trouvée pour ces types d''items'
    );
  END IF;

  -- Convert to foil
  UPDATE user_collections
  SET normal_count = normal_count - 1,
      foil_count = foil_count + 1,
      updated_at = NOW()
  WHERE id = v_collection_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s convertie en foil', v_card_name),
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'item_class', v_item_class
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Destroy a specific item class card
-- Destroys a random card of the specified item classes and tiers
-- Prioritizes lower tier cards (T3 > T2 > T1 > T0)
-- ============================================================================
CREATE OR REPLACE FUNCTION destroy_item_class_card(
  p_user_id UUID,
  p_item_classes TEXT[],
  p_target_tiers TEXT[] DEFAULT ARRAY['T2', 'T3']
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
  v_item_class TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
  v_was_foil BOOLEAN;
BEGIN
  -- Find a card matching item classes and tiers (prioritize lower tiers: T3 > T2 > T1 > T0)
  SELECT uc.id, uc.card_uid, c.name, c.item_class, uc.normal_count, uc.foil_count
  INTO v_collection_id, v_card_uid, v_card_name, v_item_class, v_normal_count, v_foil_count
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND c.item_class = ANY(p_item_classes)
    AND c.tier = ANY(p_target_tiers)
  ORDER BY
    CASE c.tier
      WHEN 'T3' THEN 1
      WHEN 'T2' THEN 2
      WHEN 'T1' THEN 3
      WHEN 'T0' THEN 4
      ELSE 5
    END,
    RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucune carte trouvée pour ces types d''items et tiers'
    );
  END IF;

  -- Remove card (prefer normal, then foil)
  v_was_foil := v_normal_count = 0;

  IF v_normal_count = 1 AND v_foil_count = 0 THEN
    -- Last normal card, no foil - delete entire record
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSIF v_foil_count = 1 AND v_normal_count = 0 THEN
    -- Last foil card, no normal - delete entire record
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSE
    -- Multiple cards - decrement appropriate counter
    IF v_normal_count > 0 THEN
      UPDATE user_collections
      SET normal_count = normal_count - 1,
          quantity = quantity - 1,
          updated_at = NOW()
      WHERE id = v_collection_id;
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
    'card_uid', v_card_uid,
    'item_class', v_item_class,
    'was_foil', v_was_foil
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Check if user has cards of specific item classes
-- Helper function for quick checks
-- ============================================================================
CREATE OR REPLACE FUNCTION check_user_has_item_class_cards(
  p_user_id UUID,
  p_item_classes TEXT[],
  p_normal_only BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF p_normal_only THEN
    SELECT EXISTS (
      SELECT 1 FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = p_user_id
        AND c.item_class = ANY(p_item_classes)
        AND uc.normal_count > 0
    ) INTO v_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM user_collections uc
      JOIN unique_cards c ON c.uid = uc.card_uid
      WHERE uc.user_id = p_user_id
        AND c.item_class = ANY(p_item_classes)
    ) INTO v_exists;
  END IF;

  RETURN v_exists;
END;
$$;
