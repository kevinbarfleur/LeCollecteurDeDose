-- Migration: Update outcome check constraints to include foil outcomes
-- Adds 'synthesised' and 'lose_foil' as valid outcomes for foil card vaal results

-- =====================
-- REPLAYS TABLE
-- =====================

-- Drop the existing constraint
ALTER TABLE replays DROP CONSTRAINT IF EXISTS replays_outcome_check;

-- Add the updated constraint with all valid outcomes
ALTER TABLE replays ADD CONSTRAINT replays_outcome_check
CHECK (outcome IN ('nothing', 'foil', 'destroyed', 'transform', 'duplicate', 'synthesised', 'lose_foil'));

-- =====================
-- ACTIVITY_LOGS TABLE
-- =====================

-- Drop the existing constraint (if it exists)
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_outcome_check;

-- Add the updated constraint with all valid outcomes
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_outcome_check
CHECK (outcome IN ('nothing', 'foil', 'destroyed', 'transform', 'duplicate', 'synthesised', 'lose_foil'));
