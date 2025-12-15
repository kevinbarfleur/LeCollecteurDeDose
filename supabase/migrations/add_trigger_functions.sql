-- Migration: Add trigger functions for automatic bot events
-- These functions handle various random events that can happen to users
-- All functions return JSONB with success and message fields

-- Helper function: Check if user has cards
CREATE OR REPLACE FUNCTION check_user_has_cards(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_collections
  WHERE user_id = p_user_id;
  
  RETURN v_count > 0;
END;
$$;

-- Helper function: Check if user has normal cards
CREATE OR REPLACE FUNCTION check_user_has_normal_cards(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT SUM(normal_count) INTO v_count
  FROM user_collections
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_count, 0) > 0;
END;
$$;

-- Helper function: Check if user has foil cards
CREATE OR REPLACE FUNCTION check_user_has_foil_cards(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT SUM(foil_count) INTO v_count
  FROM user_collections
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_count, 0) > 0;
END;
$$;

-- Helper function: Check if user has enough Vaal Orbs
CREATE OR REPLACE FUNCTION check_user_has_vaal_orbs(
  p_user_id UUID,
  p_min INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vaal_orbs INTEGER;
BEGIN
  SELECT vaal_orbs INTO v_vaal_orbs
  FROM users
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_vaal_orbs, 0) >= p_min;
END;
$$;

-- Function: Give a random card to user
CREATE OR REPLACE FUNCTION give_random_card_to_user(
  p_user_id UUID,
  p_is_foil BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_total_weight NUMERIC;
  v_random_weight NUMERIC;
BEGIN
  -- Select random card using weighted random
  SELECT SUM(COALESCE((game_data->>'weight')::NUMERIC, 1)) INTO v_total_weight
  FROM unique_cards;
  
  IF v_total_weight IS NULL OR v_total_weight = 0 THEN
    v_total_weight := 1;
  END IF;
  
  v_random_weight := RANDOM() * v_total_weight;
  
  SELECT uid, name INTO v_card_uid, v_card_name
  FROM (
    SELECT uid, name, 
           SUM(COALESCE((game_data->>'weight')::NUMERIC, 1)) OVER (ORDER BY uid) as cumulative_weight
    FROM unique_cards
  ) weighted
  WHERE cumulative_weight >= v_random_weight
  ORDER BY uid
  LIMIT 1;
  
  -- Fallback if no card found
  IF v_card_uid IS NULL THEN
    SELECT uid, name INTO v_card_uid, v_card_name
    FROM unique_cards
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;
  
  -- Add to collection
  PERFORM add_card_to_collection(p_user_id, v_card_uid, p_is_foil);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s ajoutée', v_card_name),
    'card_name', v_card_name,
    'card_uid', v_card_uid
  );
END;
$$;

-- Function: Duplicate a random card (prefers best tier)
CREATE OR REPLACE FUNCTION duplicate_random_card(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
BEGIN
  -- Check if user has cards
  IF NOT check_user_has_cards(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur n''a pas de cartes'
    );
  END IF;
  
  -- Select random card from collection (prefer higher tier cards)
  SELECT uc.id, uc.card_uid, uc.normal_count, uc.foil_count, c.name
  INTO v_collection_id, v_card_uid, v_normal_count, v_foil_count, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
  ORDER BY 
    CASE c.tier
      WHEN 'T0' THEN 4
      WHEN 'T1' THEN 3
      WHEN 'T2' THEN 2
      WHEN 'T3' THEN 1
      ELSE 0
    END DESC,
    RANDOM()
  LIMIT 1;
  
  -- Add duplicate (same type as original - prefer normal)
  IF v_normal_count > 0 THEN
    PERFORM add_card_to_collection(p_user_id, v_card_uid, false);
  ELSE
    PERFORM add_card_to_collection(p_user_id, v_card_uid, true);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s dupliquée', v_card_name),
    'card_name', v_card_name
  );
END;
$$;

-- Function: Convert a normal card to foil
CREATE OR REPLACE FUNCTION convert_card_to_foil(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
BEGIN
  -- Check if user has normal cards
  IF NOT check_user_has_normal_cards(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur n''a pas de cartes normales'
    );
  END IF;
  
  -- Select random normal card
  SELECT uc.id, uc.card_uid, c.name
  INTO v_collection_id, v_card_uid, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.normal_count > 0
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Convert to foil
  UPDATE user_collections
  SET normal_count = normal_count - 1,
      foil_count = foil_count + 1,
      updated_at = NOW()
  WHERE id = v_collection_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s convertie en foil', v_card_name),
    'card_name', v_card_name
  );
END;
$$;

-- Function: Steal 1 Vaal Orb
CREATE OR REPLACE FUNCTION steal_vaal_orb(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vaal_orbs INTEGER;
BEGIN
  -- Check if user has Vaal Orbs
  IF NOT check_user_has_vaal_orbs(p_user_id, 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur n''a pas de Vaal Orbs'
    );
  END IF;
  
  -- Remove 1 Vaal Orb
  UPDATE users
  SET vaal_orbs = GREATEST(0, vaal_orbs - 1),
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING vaal_orbs INTO v_vaal_orbs;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('1 Vaal Orb volé (%s restants)', v_vaal_orbs),
    'remaining_vaal_orbs', v_vaal_orbs
  );
END;
$$;

-- Function: Destroy a random card
CREATE OR REPLACE FUNCTION destroy_random_card(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
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
    IF v_foil_count = 1 THEN
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
    'card_name', v_card_name
  );
END;
$$;

-- Function: Reroll a card (replace with random)
CREATE OR REPLACE FUNCTION reroll_card(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collection_id UUID;
  v_old_card_uid INTEGER;
  v_old_card_name TEXT;
  v_new_card_uid INTEGER;
  v_new_card_name TEXT;
  v_is_foil BOOLEAN;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
BEGIN
  -- Check if user has cards
  IF NOT check_user_has_cards(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur n''a pas de cartes'
    );
  END IF;
  
  -- Select random card to reroll
  SELECT uc.id, uc.card_uid, uc.normal_count, uc.foil_count, c.name
  INTO v_collection_id, v_old_card_uid, v_normal_count, v_foil_count, v_old_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Determine if original was foil
  v_is_foil := v_foil_count > 0 AND v_normal_count = 0;
  
  -- Remove old card
  IF v_normal_count = 1 AND v_foil_count = 0 THEN
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSIF v_foil_count = 1 AND v_normal_count = 0 THEN
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSE
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
  
  -- Get new random card
  SELECT uid, name INTO v_new_card_uid, v_new_card_name
  FROM unique_cards
  WHERE uid != v_old_card_uid
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Add new card (same foil status)
  PERFORM add_card_to_collection(p_user_id, v_new_card_uid, v_is_foil);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s rerollée en %s', v_old_card_name, v_new_card_name),
    'old_card_name', v_old_card_name,
    'new_card_name', v_new_card_name
  );
END;
$$;

-- Function: Transfer a card between users
CREATE OR REPLACE FUNCTION transfer_card(
  p_from_user_id UUID,
  p_to_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_is_foil BOOLEAN;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
BEGIN
  -- Check if source user has cards
  IF NOT check_user_has_cards(p_from_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur source n''a pas de cartes'
    );
  END IF;
  
  -- Select random card from source
  SELECT uc.id, uc.card_uid, uc.normal_count, uc.foil_count, c.name
  INTO v_collection_id, v_card_uid, v_normal_count, v_foil_count, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_from_user_id
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Determine if foil
  v_is_foil := v_foil_count > 0 AND v_normal_count = 0;
  
  -- Remove from source
  IF v_normal_count = 1 AND v_foil_count = 0 THEN
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSIF v_foil_count = 1 AND v_normal_count = 0 THEN
    DELETE FROM user_collections WHERE id = v_collection_id;
  ELSE
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
  
  -- Add to destination
  PERFORM add_card_to_collection(p_to_user_id, v_card_uid, v_is_foil);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Carte %s transférée', v_card_name),
    'card_name', v_card_name
  );
END;
$$;

-- Function: Remove foil from a foil card
CREATE OR REPLACE FUNCTION remove_foil_from_card(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collection_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
BEGIN
  -- Check if user has foil cards
  IF NOT check_user_has_foil_cards(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'L''utilisateur n''a pas de cartes foil'
    );
  END IF;
  
  -- Select random foil card
  SELECT uc.id, uc.card_uid, c.name
  INTO v_collection_id, v_card_uid, v_card_name
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.foil_count > 0
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Convert foil to normal
  UPDATE user_collections
  SET foil_count = foil_count - 1,
      normal_count = normal_count + 1,
      updated_at = NOW()
  WHERE id = v_collection_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Foil retiré de %s', v_card_name),
    'card_name', v_card_name
  );
END;
$$;

-- Function: Add temporary buff
CREATE OR REPLACE FUNCTION add_temporary_buff(
  p_user_id UUID,
  p_buff_type TEXT,
  p_duration_minutes INTEGER,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_buffs JSONB;
  v_new_buff JSONB;
BEGIN
  v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  
  v_new_buff := jsonb_build_object(
    'expires_at', v_expires_at,
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
    'message', format('Buff %s ajouté pour %s minutes', p_buff_type, p_duration_minutes),
    'expires_at', v_expires_at
  );
END;
$$;

-- Function: Get active buffs (filtered by expiration)
CREATE OR REPLACE FUNCTION get_user_buffs(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buffs JSONB;
  v_active_buffs JSONB := '{}'::jsonb;
  v_buff_key TEXT;
  v_buff_data JSONB;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get buffs
  SELECT COALESCE(temporary_buffs, '{}'::jsonb) INTO v_buffs
  FROM users
  WHERE id = p_user_id;
  
  -- Filter active buffs
  FOR v_buff_key, v_buff_data IN SELECT * FROM jsonb_each(v_buffs)
  LOOP
    v_expires_at := (v_buff_data->>'expires_at')::TIMESTAMPTZ;
    
    IF v_expires_at > NOW() THEN
      v_active_buffs := v_active_buffs || jsonb_build_object(v_buff_key, v_buff_data);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'buffs', v_active_buffs
  );
END;
$$;
