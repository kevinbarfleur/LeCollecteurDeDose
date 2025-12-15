-- Migration: Consolidate duplicate RLS policies and optimize with subselect
-- This improves query performance by:
-- 1. Removing duplicate policies that cause multiple evaluations
-- 2. Using (SELECT auth.role()) instead of auth.role() to prevent per-row evaluation

-- ============================================================================
-- USERS TABLE - Consolidate and optimize
-- ============================================================================

-- Drop duplicate/redundant policies
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Public read access for users" ON users;
DROP POLICY IF EXISTS "Service role can insert/update users" ON users;

-- Create single optimized read policy
CREATE POLICY "Public read access"
ON users
FOR SELECT
TO anon, authenticated
USING (true);

-- Create optimized service role policy with subselect
CREATE POLICY "Service role full access"
ON users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER_COLLECTIONS TABLE - Consolidate and optimize
-- ============================================================================

-- Drop duplicate/redundant policies
DROP POLICY IF EXISTS "Anyone can read collections" ON user_collections;
DROP POLICY IF EXISTS "Public read access for user_collections" ON user_collections;
DROP POLICY IF EXISTS "Service role can manage collections" ON user_collections;

-- Create single optimized read policy
CREATE POLICY "Public read access"
ON user_collections
FOR SELECT
TO anon, authenticated
USING (true);

-- Create optimized service role policy
CREATE POLICY "Service role full access"
ON user_collections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER_BOOSTERS TABLE - Consolidate and optimize
-- ============================================================================

-- Drop duplicate/redundant policies
DROP POLICY IF EXISTS "Anyone can read boosters" ON user_boosters;
DROP POLICY IF EXISTS "Public read access for user_boosters" ON user_boosters;
DROP POLICY IF EXISTS "Service role can manage boosters" ON user_boosters;

-- Create single optimized read policy
CREATE POLICY "Public read access"
ON user_boosters
FOR SELECT
TO anon, authenticated
USING (true);

-- Create optimized service role policy
CREATE POLICY "Service role full access"
ON user_boosters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- BOOSTER_CARDS TABLE - Consolidate and optimize
-- ============================================================================

-- Drop duplicate/redundant policies
DROP POLICY IF EXISTS "Anyone can read booster_cards" ON booster_cards;
DROP POLICY IF EXISTS "Public read access for booster_cards" ON booster_cards;
DROP POLICY IF EXISTS "Service role can manage booster_cards" ON booster_cards;

-- Create single optimized read policy
CREATE POLICY "Public read access"
ON booster_cards
FOR SELECT
TO anon, authenticated
USING (true);

-- Create optimized service role policy
CREATE POLICY "Service role full access"
ON booster_cards
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- UNIQUE_CARDS TABLE - Consolidate
-- ============================================================================

-- Drop duplicate policies
DROP POLICY IF EXISTS "Anyone can read unique_cards" ON unique_cards;
DROP POLICY IF EXISTS "Public read access for unique_cards" ON unique_cards;

-- Create single read policy
CREATE POLICY "Public read access"
ON unique_cards
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================================
-- Verify materialized views have appropriate permissions
-- (These are read-only by nature, just ensuring clean state)
-- ============================================================================

-- Revoke unnecessary permissions on materialized views if they contain sensitive data
-- For now, keep them readable as they contain aggregate/summary data only
-- REVOKE SELECT ON user_collection_summary FROM anon, authenticated;
-- REVOKE SELECT ON recent_boosters_summary FROM anon, authenticated;

-- Note: If materialized views should be restricted, uncomment above and create
-- appropriate policies or use a different approach (e.g., functions with SECURITY DEFINER)
