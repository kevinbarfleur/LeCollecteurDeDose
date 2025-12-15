-- Migration: Setup Row Level Security (RLS) for collections tables
-- This migration enables RLS and creates policies for public read access
-- Write access is restricted to service role (via service key)

-- Enable RLS on all collection tables
ALTER TABLE unique_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_boosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE booster_cards ENABLE ROW LEVEL SECURITY;

-- Policies for unique_cards: Public read access
CREATE POLICY "Public read access for unique_cards"
ON unique_cards
FOR SELECT
USING (true);

-- Policies for users: Public read access
CREATE POLICY "Public read access for users"
ON users
FOR SELECT
USING (true);

-- Policies for user_collections: Public read access
CREATE POLICY "Public read access for user_collections"
ON user_collections
FOR SELECT
USING (true);

-- Policies for user_boosters: Public read access
CREATE POLICY "Public read access for user_boosters"
ON user_boosters
FOR SELECT
USING (true);

-- Policies for booster_cards: Public read access
CREATE POLICY "Public read access for booster_cards"
ON booster_cards
FOR SELECT
USING (true);

-- Note: Write operations (INSERT, UPDATE, DELETE) are handled via:
-- 1. Service role key (bypasses RLS) for server-side operations
-- 2. Database functions (SECURITY DEFINER) for controlled writes
-- 3. Edge Functions with service role key for Twitch webhooks
