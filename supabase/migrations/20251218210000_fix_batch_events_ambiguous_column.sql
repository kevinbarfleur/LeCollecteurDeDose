-- Migration: Fix ambiguous user_id reference in get_all_users_with_item_classes
-- The user_id column was ambiguous between the return column and the table column

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
  WHERE EXISTS (SELECT 1 FROM user_collections uc2 WHERE uc2.user_id = u.id);
END;
$$;
