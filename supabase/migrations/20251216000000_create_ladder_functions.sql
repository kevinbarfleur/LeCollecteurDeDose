-- Migration: Create ladder/leaderboard functions
-- These functions return player statistics for the ladder page

-- Function to get global ladder statistics
CREATE OR REPLACE FUNCTION get_ladder_global_stats()
RETURNS TABLE (
  total_players BIGINT,
  total_cards_distributed BIGINT,
  total_unique_cards BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users)::BIGINT as total_players,
    (SELECT COALESCE(SUM(quantity), 0) FROM user_collections)::BIGINT as total_cards_distributed,
    (SELECT COUNT(*) FROM unique_cards)::BIGINT as total_unique_cards;
END;
$$;

-- Function to get player statistics for the ladder
CREATE OR REPLACE FUNCTION get_ladder_stats()
RETURNS TABLE (
  user_id UUID,
  twitch_username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  unique_cards BIGINT,
  total_cards BIGINT,
  foil_count BIGINT,
  t0_count BIGINT,
  t1_count BIGINT,
  t2_count BIGINT,
  t3_count BIGINT
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
    COALESCE(u.display_name, u.twitch_username) as display_name,
    u.avatar_url,
    COUNT(DISTINCT uc.card_uid)::BIGINT as unique_cards,
    COALESCE(SUM(uc.quantity), 0)::BIGINT as total_cards,
    COALESCE(SUM(uc.foil_count), 0)::BIGINT as foil_count,
    COALESCE(SUM(CASE WHEN c.tier = 'T0' THEN uc.quantity ELSE 0 END), 0)::BIGINT as t0_count,
    COALESCE(SUM(CASE WHEN c.tier = 'T1' THEN uc.quantity ELSE 0 END), 0)::BIGINT as t1_count,
    COALESCE(SUM(CASE WHEN c.tier = 'T2' THEN uc.quantity ELSE 0 END), 0)::BIGINT as t2_count,
    COALESCE(SUM(CASE WHEN c.tier = 'T3' THEN uc.quantity ELSE 0 END), 0)::BIGINT as t3_count
  FROM users u
  LEFT JOIN user_collections uc ON uc.user_id = u.id
  LEFT JOIN unique_cards c ON c.uid = uc.card_uid
  GROUP BY u.id, u.twitch_username, u.display_name, u.avatar_url
  HAVING COUNT(DISTINCT uc.card_uid) > 0
  ORDER BY COUNT(DISTINCT uc.card_uid) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_ladder_global_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_ladder_stats() TO authenticated, anon;
