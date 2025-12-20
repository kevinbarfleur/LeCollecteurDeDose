-- Migration: Extended Batch Events Functions
-- Nouvelles mécaniques: Vaal Roulette, Steal, Mirror, Random Chaos
-- Pour les 15 presets diversifiés

-- ============================================================================
-- FUNCTION: Vaal Corruption Roulette (50/50)
-- 50% chance de brick (destroy), 50% chance d'upgrade (foil)
-- ============================================================================
CREATE OR REPLACE FUNCTION vaal_corruption_roulette(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll FLOAT := RANDOM();
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
BEGIN
  -- Trouver une carte normale aléatoire
  SELECT uc.id, uc.card_uid, c.name, uc.normal_count, uc.foil_count
  INTO v_collection_id, v_card_uid, v_card_name, v_normal_count, v_foil_count
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.normal_count > 0
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_cards',
      'message', 'Aucune carte normale à corrompre'
    );
  END IF;

  IF v_roll < 0.5 THEN
    -- BRICK - Détruire la carte
    IF v_normal_count = 1 AND v_foil_count = 0 THEN
      DELETE FROM user_collections WHERE id = v_collection_id;
    ELSE
      UPDATE user_collections
      SET normal_count = normal_count - 1,
          quantity = quantity - 1,
          updated_at = NOW()
      WHERE id = v_collection_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'brick',
      'card_name', v_card_name,
      'card_uid', v_card_uid,
      'message', format('BRICK ! %s a été détruite par la corruption', v_card_name)
    );
  ELSE
    -- UPGRADE - Convertir en foil
    UPDATE user_collections
    SET normal_count = normal_count - 1,
        foil_count = foil_count + 1,
        updated_at = NOW()
    WHERE id = v_collection_id;

    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'upgrade',
      'card_name', v_card_name,
      'card_uid', v_card_uid,
      'message', format('UPGRADE ! %s est maintenant FOIL', v_card_name)
    );
  END IF;
END;
$$;

-- ============================================================================
-- FUNCTION: Random Chaos Effect (33/33/33)
-- 33% buff (convert to foil), 33% nerf (destroy), 33% rien
-- ============================================================================
CREATE OR REPLACE FUNCTION random_chaos_effect(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll FLOAT := RANDOM();
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
BEGIN
  IF v_roll < 0.33 THEN
    -- BUFF - Convert to foil
    SELECT uc.id, uc.card_uid, c.name
    INTO v_collection_id, v_card_uid, v_card_name
    FROM user_collections uc
    JOIN unique_cards c ON c.uid = uc.card_uid
    WHERE uc.user_id = p_user_id AND uc.normal_count > 0
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_collection_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'outcome', 'nothing',
        'message', 'Le chaos épargne ce joueur... pas de carte normale à buff'
      );
    END IF;

    UPDATE user_collections
    SET normal_count = normal_count - 1,
        foil_count = foil_count + 1,
        updated_at = NOW()
    WHERE id = v_collection_id;

    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'buff',
      'card_name', v_card_name,
      'card_uid', v_card_uid,
      'message', format('BUFF ! %s devient FOIL', v_card_name)
    );

  ELSIF v_roll < 0.66 THEN
    -- NERF - Destroy card
    SELECT uc.id, uc.card_uid, c.name, uc.normal_count, uc.foil_count
    INTO v_collection_id, v_card_uid, v_card_name, v_normal_count, v_foil_count
    FROM user_collections uc
    JOIN unique_cards c ON c.uid = uc.card_uid
    WHERE uc.user_id = p_user_id
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_collection_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'outcome', 'nothing',
        'message', 'Le chaos ne trouve rien à détruire...'
      );
    END IF;

    IF v_normal_count + v_foil_count = 1 THEN
      DELETE FROM user_collections WHERE id = v_collection_id;
    ELSIF v_normal_count > 0 THEN
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

    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'nerf',
      'card_name', v_card_name,
      'card_uid', v_card_uid,
      'message', format('NERF ! %s a été détruite', v_card_name)
    );

  ELSE
    -- NOTHING happens
    RETURN jsonb_build_object(
      'success', true,
      'outcome', 'nothing',
      'message', 'Le chaos passe son tour...'
    );
  END IF;
END;
$$;

-- ============================================================================
-- FUNCTION: Steal Random Card (Heist)
-- Transfère une carte d'un joueur à un autre
-- ============================================================================
CREATE OR REPLACE FUNCTION steal_random_card(
  p_from_user_id UUID,
  p_to_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_collection_id UUID;
  v_to_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_is_foil BOOLEAN;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
BEGIN
  -- Trouver une carte aléatoire chez la victime
  SELECT uc.id, uc.card_uid, c.name, uc.normal_count, uc.foil_count
  INTO v_from_collection_id, v_card_uid, v_card_name, v_normal_count, v_foil_count
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_from_user_id
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_from_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_cards',
      'message', 'La victime n''a aucune carte à voler'
    );
  END IF;

  -- Préférer voler une normale, sinon une foil
  v_is_foil := v_normal_count = 0;

  -- Retirer la carte de la victime
  IF v_normal_count + v_foil_count = 1 THEN
    DELETE FROM user_collections WHERE id = v_from_collection_id;
  ELSIF v_is_foil THEN
    UPDATE user_collections
    SET foil_count = foil_count - 1,
        quantity = quantity - 1,
        updated_at = NOW()
    WHERE id = v_from_collection_id;
  ELSE
    UPDATE user_collections
    SET normal_count = normal_count - 1,
        quantity = quantity - 1,
        updated_at = NOW()
    WHERE id = v_from_collection_id;
  END IF;

  -- Ajouter la carte au voleur
  SELECT id INTO v_to_collection_id
  FROM user_collections
  WHERE user_id = p_to_user_id AND card_uid = v_card_uid;

  IF v_to_collection_id IS NULL THEN
    -- Créer une nouvelle entrée
    INSERT INTO user_collections (user_id, card_uid, quantity, normal_count, foil_count)
    VALUES (
      p_to_user_id,
      v_card_uid,
      1,
      CASE WHEN v_is_foil THEN 0 ELSE 1 END,
      CASE WHEN v_is_foil THEN 1 ELSE 0 END
    );
  ELSE
    -- Mettre à jour l'existante
    UPDATE user_collections
    SET quantity = quantity + 1,
        normal_count = normal_count + CASE WHEN v_is_foil THEN 0 ELSE 1 END,
        foil_count = foil_count + CASE WHEN v_is_foil THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = v_to_collection_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'outcome', 'stolen',
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'was_foil', v_is_foil,
    'message', format('%s a été volée !', v_card_name)
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Duplicate Random Card (Mirror)
-- Duplique une carte aléatoire du joueur
-- ============================================================================
CREATE OR REPLACE FUNCTION duplicate_random_card(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
BEGIN
  -- Trouver une carte aléatoire
  SELECT uc.id, uc.card_uid, c.name
  INTO v_collection_id, v_card_uid, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_cards',
      'message', 'Aucune carte à dupliquer'
    );
  END IF;

  -- Dupliquer (ajouter une copie normale)
  UPDATE user_collections
  SET quantity = quantity + 1,
      normal_count = normal_count + 1,
      updated_at = NOW()
  WHERE id = v_collection_id;

  RETURN jsonb_build_object(
    'success', true,
    'outcome', 'duplicated',
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'message', format('MIRROR ! %s a été dupliquée', v_card_name)
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Remove Foil from Item Class
-- Retire le statut foil d'une carte d'une classe d'items spécifique
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_item_class_foil(
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
  -- Trouver une carte foil de la classe spécifiée
  SELECT uc.id, uc.card_uid, c.name, c.item_class
  INTO v_collection_id, v_card_uid, v_card_name, v_item_class
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.foil_count > 0
    AND c.item_class = ANY(p_item_classes)
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_foil',
      'message', 'Aucune carte foil trouvée pour ces types d''items'
    );
  END IF;

  -- Convertir foil en normal
  UPDATE user_collections
  SET foil_count = foil_count - 1,
      normal_count = normal_count + 1,
      updated_at = NOW()
  WHERE id = v_collection_id;

  RETURN jsonb_build_object(
    'success', true,
    'outcome', 'removed',
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'item_class', v_item_class,
    'message', format('Le foil de %s a été retiré', v_card_name)
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Convert Any Card to Foil (Divine Blessing)
-- Convertit une carte normale aléatoire en foil
-- ============================================================================
CREATE OR REPLACE FUNCTION convert_any_card_to_foil(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
BEGIN
  -- Trouver une carte normale aléatoire
  SELECT uc.id, uc.card_uid, c.name
  INTO v_collection_id, v_card_uid, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.normal_count > 0
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_cards',
      'message', 'Aucune carte normale à bénir'
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
    'outcome', 'blessed',
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'message', format('%s a été bénie ! FOIL', v_card_name)
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Destroy Random Card (Steelmage RIP)
-- Détruit une carte aléatoire, avec priorité sur les hauts tiers
-- ============================================================================
CREATE OR REPLACE FUNCTION destroy_random_card_by_tier(
  p_user_id UUID,
  p_target_tiers TEXT[] DEFAULT ARRAY['T0', 'T1', 'T2']
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
  v_tier TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
  v_was_foil BOOLEAN;
BEGIN
  -- Trouver une carte avec priorité sur les hauts tiers (T0 > T1 > T2)
  SELECT uc.id, uc.card_uid, c.name, c.tier, uc.normal_count, uc.foil_count
  INTO v_collection_id, v_card_uid, v_card_name, v_tier, v_normal_count, v_foil_count
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND c.tier = ANY(p_target_tiers)
  ORDER BY
    CASE c.tier
      WHEN 'T0' THEN 1
      WHEN 'T1' THEN 2
      WHEN 'T2' THEN 3
      WHEN 'T3' THEN 4
      ELSE 5
    END,
    RANDOM()
  LIMIT 1;

  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_cards',
      'message', 'Aucune carte à détruire dans ces tiers'
    );
  END IF;

  v_was_foil := v_normal_count = 0;

  -- Supprimer la carte
  IF v_normal_count + v_foil_count = 1 THEN
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSIF v_normal_count > 0 THEN
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

  RETURN jsonb_build_object(
    'success', true,
    'outcome', 'destroyed',
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'tier', v_tier,
    'was_foil', v_was_foil,
    'message', format('RIP ! %s (%s) a été détruite', v_card_name, v_tier)
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Give Random Card (League Start)
-- Donne une carte aléatoire au joueur
-- ============================================================================
CREATE OR REPLACE FUNCTION give_random_card_to_user(
  p_user_id UUID,
  p_tier_weights JSONB DEFAULT '{"T3": 0.5, "T2": 0.35, "T1": 0.12, "T0": 0.03}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll FLOAT := RANDOM();
  v_tier TEXT;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_collection_id UUID;
  v_t3_weight FLOAT;
  v_t2_weight FLOAT;
  v_t1_weight FLOAT;
BEGIN
  -- Extraire les poids
  v_t3_weight := COALESCE((p_tier_weights->>'T3')::FLOAT, 0.5);
  v_t2_weight := COALESCE((p_tier_weights->>'T2')::FLOAT, 0.35);
  v_t1_weight := COALESCE((p_tier_weights->>'T1')::FLOAT, 0.12);

  -- Déterminer le tier
  IF v_roll < v_t3_weight THEN
    v_tier := 'T3';
  ELSIF v_roll < v_t3_weight + v_t2_weight THEN
    v_tier := 'T2';
  ELSIF v_roll < v_t3_weight + v_t2_weight + v_t1_weight THEN
    v_tier := 'T1';
  ELSE
    v_tier := 'T0';
  END IF;

  -- Sélectionner une carte aléatoire du tier
  SELECT uid, name
  INTO v_card_uid, v_card_name
  FROM unique_cards
  WHERE tier = v_tier
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_card_uid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'outcome', 'no_cards_available',
      'message', 'Aucune carte disponible dans ce tier'
    );
  END IF;

  -- Ajouter la carte au joueur
  SELECT id INTO v_collection_id
  FROM user_collections
  WHERE user_id = p_user_id AND card_uid = v_card_uid;

  IF v_collection_id IS NULL THEN
    INSERT INTO user_collections (user_id, card_uid, quantity, normal_count, foil_count)
    VALUES (p_user_id, v_card_uid, 1, 1, 0);
  ELSE
    UPDATE user_collections
    SET quantity = quantity + 1,
        normal_count = normal_count + 1,
        updated_at = NOW()
    WHERE id = v_collection_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'outcome', 'given',
    'card_name', v_card_name,
    'card_uid', v_card_uid,
    'tier', v_tier,
    'message', format('Nouvelle carte reçue: %s (%s)', v_card_name, v_tier)
  );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION vaal_corruption_roulette(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION random_chaos_effect(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION steal_random_card(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION duplicate_random_card(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION remove_item_class_foil(UUID, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION convert_any_card_to_foil(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION destroy_random_card_by_tier(UUID, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION give_random_card_to_user(UUID, JSONB) TO service_role;
