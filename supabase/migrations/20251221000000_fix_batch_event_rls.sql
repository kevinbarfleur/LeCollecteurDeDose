-- Fix RLS policies for batch_event_presets and batch_event_categories
-- Add anon read access in case service key is not properly configured

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anon users can read batch_event_presets" ON batch_event_presets;
DROP POLICY IF EXISTS "Anon users can read batch_event_categories" ON batch_event_categories;

-- Add anon read policy for batch_event_presets
CREATE POLICY "Anon users can read batch_event_presets"
  ON batch_event_presets
  FOR SELECT
  TO anon
  USING (true);

-- Add anon read policy for batch_event_categories
CREATE POLICY "Anon users can read batch_event_categories"
  ON batch_event_categories
  FOR SELECT
  TO anon
  USING (true);
