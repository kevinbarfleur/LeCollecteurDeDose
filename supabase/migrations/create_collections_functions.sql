-- Migration: Create database functions for collections management
-- These functions handle user creation, card collection updates, and triggers

-- Function to update updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_collections_updated_at 
  BEFORE UPDATE ON user_collections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create a user (case-insensitive username matching)
CREATE OR REPLACE FUNCTION get_or_create_user(
  p_twitch_username TEXT,
  p_twitch_user_id TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing user (case-insensitive)
  SELECT id INTO v_user_id
  FROM users
  WHERE LOWER(twitch_username) = LOWER(p_twitch_username)
  LIMIT 1;
  
  -- Create if not exists
  IF v_user_id IS NULL THEN
    INSERT INTO users (twitch_username, twitch_user_id, display_name, avatar_url)
    VALUES (p_twitch_username, p_twitch_user_id, p_display_name, p_avatar_url)
    RETURNING id INTO v_user_id;
  ELSE
    -- Update existing user info if provided
    UPDATE users
    SET 
      twitch_user_id = COALESCE(p_twitch_user_id, twitch_user_id),
      display_name = COALESCE(p_display_name, display_name),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- Function to add a card to a user's collection
CREATE OR REPLACE FUNCTION add_card_to_collection(
  p_user_id UUID,
  p_card_uid INTEGER,
  p_is_foil BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_collections (user_id, card_uid, quantity, normal_count, foil_count)
  VALUES (
    p_user_id,
    p_card_uid,
    1,
    CASE WHEN p_is_foil THEN 0 ELSE 1 END,
    CASE WHEN p_is_foil THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, card_uid) DO UPDATE
  SET
    quantity = user_collections.quantity + 1,
    normal_count = user_collections.normal_count + CASE WHEN p_is_foil THEN 0 ELSE 1 END,
    foil_count = user_collections.foil_count + CASE WHEN p_is_foil THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$;

-- Function to update vaal orbs for a user
CREATE OR REPLACE FUNCTION update_vaal_orbs(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET 
    vaal_orbs = GREATEST(0, vaal_orbs + p_amount),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Function to use a Vaal Orb on a random card from user's collection
-- Inspired by Path of Exile's Vaal Orb mechanics
-- Effects:
--   50% chance: Transform to foil (success)
--   25% chance: Nothing happens (minor failure)
--   15% chance: Destroy card (major failure)
--   10% chance: Duplicate card (rare success)
CREATE OR REPLACE FUNCTION use_vaal_orb(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vaal_orbs INTEGER;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_card_tier TEXT;
  v_normal_count INTEGER;
  v_foil_count INTEGER;
  v_collection_id UUID;
  v_roll REAL;
  v_result TEXT;
  v_message TEXT;
  v_success BOOLEAN;
BEGIN
  -- Check if user has Vaal Orbs
  SELECT vaal_orbs INTO v_vaal_orbs
  FROM users
  WHERE id = p_user_id;
  
  IF v_vaal_orbs IS NULL OR v_vaal_orbs < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Vous n''avez pas de Vaal Orb !'
    );
  END IF;
  
  -- Get a random card from user's collection that has normal copies (not already all foil)
  SELECT uc.id, uc.card_uid, uc.normal_count, uc.foil_count, c.name, c.tier
  INTO v_collection_id, v_card_uid, v_normal_count, v_foil_count, v_card_name, v_card_tier
  FROM user_collections uc
  JOIN unique_cards c ON c.uid = uc.card_uid
  WHERE uc.user_id = p_user_id
    AND uc.normal_count > 0
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF v_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Vous n''avez aucune carte normale à vaal !'
    );
  END IF;
  
  -- Consume 1 Vaal Orb
  UPDATE users
  SET vaal_orbs = vaal_orbs - 1,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Roll for outcome (Path of Exile style)
  -- 50% chance: Transform to foil (success)
  -- 25% chance: Nothing happens (minor failure)
  -- 15% chance: Destroy card (major failure)
  -- 10% chance: Duplicate card (rare success)
  v_roll := RANDOM();
  
  IF v_roll < 0.50 THEN
    -- Transform to foil (50% chance)
    UPDATE user_collections
    SET normal_count = normal_count - 1,
        foil_count = foil_count + 1,
        updated_at = NOW()
    WHERE id = v_collection_id;
    
    v_result := 'foil';
    v_message := format('✨ @%s utilise un Vaal Orb sur %s... Transformation réussie ! La carte devient foil !', 
      (SELECT twitch_username FROM users WHERE id = p_user_id),
      v_card_name
    );
    v_success := true;
    
  ELSIF v_roll < 0.75 THEN
    -- Nothing happens (25% chance)
    v_result := 'nothing';
    v_message := format('💫 @%s utilise un Vaal Orb sur %s... Rien ne se passe. Le pouvoir du Vaal est imprévisible.', 
      (SELECT twitch_username FROM users WHERE id = p_user_id),
      v_card_name
    );
    v_success := true;
    
  ELSIF v_roll < 0.90 THEN
    -- Destroy card (15% chance)
    IF v_normal_count = 1 AND v_foil_count = 0 THEN
      -- Delete the collection entry if it was the last card
      DELETE FROM user_collections WHERE id = v_collection_id;
    ELSE
      -- Just remove one normal copy
      UPDATE user_collections
      SET normal_count = normal_count - 1,
          quantity = quantity - 1,
          updated_at = NOW()
      WHERE id = v_collection_id;
    END IF;
    
    v_result := 'destroyed';
    v_message := format('💥 @%s utilise un Vaal Orb sur %s... La carte est détruite ! Le pouvoir du Vaal est dangereux.', 
      (SELECT twitch_username FROM users WHERE id = p_user_id),
      v_card_name
    );
    v_success := true;
    
  ELSE
    -- Duplicate card (10% chance - rare success)
    UPDATE user_collections
    SET normal_count = normal_count + 1,
        quantity = quantity + 1,
        updated_at = NOW()
    WHERE id = v_collection_id;
    
    v_result := 'duplicate';
    v_message := format('🌟 @%s utilise un Vaal Orb sur %s... Miracle ! La carte est dupliquée ! Le pouvoir du Vaal vous sourit.', 
      (SELECT twitch_username FROM users WHERE id = p_user_id),
      v_card_name
    );
    v_success := true;
  END IF;
  
  RETURN jsonb_build_object(
    'success', v_success,
    'result', v_result,
    'message', v_message,
    'card_name', v_card_name,
    'card_tier', v_card_tier,
    'remaining_vaal_orbs', (SELECT vaal_orbs FROM users WHERE id = p_user_id)
  );
END;
$$;

-- Function to create a booster for a user (dev/testing purposes)
-- Uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_booster_for_user(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booster_id UUID;
  v_card_uid INTEGER;
  v_card_name TEXT;
  v_card_tier TEXT;
  v_is_foil BOOLEAN;
  v_loot_names TEXT[] := ARRAY[]::TEXT[];
  v_card_count INTEGER := 0;
  v_total_weight NUMERIC;
  v_random_weight NUMERIC;
  v_current_weight NUMERIC;
  v_tier_chances JSONB := '{"T3": 0.10, "T2": 0.08, "T1": 0.05, "T0": 0.01}'::jsonb;
BEGIN
  -- Create booster record
  INSERT INTO user_boosters (user_id, opened_at, booster_type)
  VALUES (p_user_id, NOW(), 'normal')
  RETURNING id INTO v_booster_id;
  
  -- Add guaranteed card (T0, T1, or T2) - weighted random with T2 boost
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
  
  IF v_card_uid IS NOT NULL THEN
    v_is_foil := RANDOM() < COALESCE((v_tier_chances->>v_card_tier)::NUMERIC, 0.01);
    
    INSERT INTO booster_cards (booster_id, card_uid, is_foil, position)
    VALUES (v_booster_id, v_card_uid, v_is_foil, 1);
    
    PERFORM add_card_to_collection(p_user_id, v_card_uid, v_is_foil);
    
    v_loot_names := array_append(v_loot_names, v_card_name || CASE WHEN v_is_foil THEN ' ✨' ELSE '' END);
    v_card_count := 1;
  END IF;
  
  -- Add remaining cards (up to 5 total) using weighted random
  WHILE v_card_count < 5 LOOP
    -- Calculate total weight
    SELECT SUM(COALESCE((game_data->>'weight')::NUMERIC, 1)) INTO v_total_weight
    FROM unique_cards;
    
    IF v_total_weight IS NULL OR v_total_weight = 0 THEN
      v_total_weight := 1;
    END IF;
    
    -- Pick random card based on weight (simplified approach)
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
    
    -- Determine if foil
    v_is_foil := RANDOM() < COALESCE((v_tier_chances->>v_card_tier)::NUMERIC, 0.01);
    
    -- Add to booster
    INSERT INTO booster_cards (booster_id, card_uid, is_foil, position)
    VALUES (v_booster_id, v_card_uid, v_is_foil, v_card_count + 1);
    
    -- Add to collection
    PERFORM add_card_to_collection(p_user_id, v_card_uid, v_is_foil);
    
    v_loot_names := array_append(v_loot_names, v_card_name || CASE WHEN v_is_foil THEN ' ✨' ELSE '' END);
    v_card_count := v_card_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'booster_id', v_booster_id,
    'cards', v_loot_names,
    'message', array_to_string(v_loot_names, ', ')
  );
END;
$$;
