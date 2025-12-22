-- Migration: Add card_synthesised to replays table
-- Allows replays to record whether the card was a synthesised variant

-- Add card_synthesised column to replays
ALTER TABLE replays
ADD COLUMN IF NOT EXISTS card_synthesised BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN replays.card_synthesised IS 'Whether the card in the replay is a synthesised variant (obtained from Vaal Orb on foil cards).';
