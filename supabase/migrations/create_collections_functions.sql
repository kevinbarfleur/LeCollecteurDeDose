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
