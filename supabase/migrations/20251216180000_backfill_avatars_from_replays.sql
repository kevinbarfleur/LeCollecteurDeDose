-- Backfill avatars from replays and activity_logs for users who don't have one
-- This recovers avatars that were captured during replays/activity but never saved to the user profile

-- First, update from replays (most recent avatar wins)
UPDATE users u
SET avatar_url = subq.user_avatar,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (LOWER(username))
    LOWER(username) as lower_username,
    user_avatar
  FROM replays
  WHERE user_avatar IS NOT NULL
  ORDER BY LOWER(username), created_at DESC
) subq
WHERE LOWER(u.twitch_username) = subq.lower_username
  AND u.avatar_url IS NULL
  AND subq.user_avatar IS NOT NULL;

-- Then, update remaining users from activity_logs
UPDATE users u
SET avatar_url = subq.user_avatar,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (LOWER(username))
    LOWER(username) as lower_username,
    user_avatar
  FROM activity_logs
  WHERE user_avatar IS NOT NULL
  ORDER BY LOWER(username), created_at DESC
) subq
WHERE LOWER(u.twitch_username) = subq.lower_username
  AND u.avatar_url IS NULL
  AND subq.user_avatar IS NOT NULL;
